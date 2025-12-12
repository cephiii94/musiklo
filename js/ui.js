// js/ui.js

// 1. KITA IMPORT DULU DARI UTILS
import { decodeHtml, cleanSongTitle, formatTime } from './utils.js';
import { fetchLyrics } from './api.js';

// 2. [PENTING] KITA EXPORT LAGI SUPAYA BISA DIPAKAI DI APP.JS
export { decodeHtml, formatTime }; 

// Cache elemen DOM agar tidak dicari berulang-ulang
export const DOM = {
    mainContent: document.querySelector('.main-content'),
    mainContentMobile: document.querySelector('.main-content-mobile') || null, 
    progressBarDesktop: document.getElementById('progress-bar'),
    currentTimeDesktop: document.getElementById('current-time-display'),
    totalTimeDesktop: document.getElementById('total-time-display'),
    lyricsText: document.getElementById('lyrics-text'),
    lyricsSection: document.querySelector('.lyrics-section'),
    lyricsHeader: document.getElementById('lyrics-header')
};

// Pastikan elemen mobile ter-create jika belum ada (Helper)
export const ensureMobileContainer = () => {
    if (!DOM.mainContentMobile) {
        DOM.mainContentMobile = document.createElement('div');
        DOM.mainContentMobile.className = 'main-content-mobile';
        const desktopContainer = document.querySelector('.desktop-container');
        if (desktopContainer) {
            document.body.insertBefore(DOM.mainContentMobile, desktopContainer);
        }
    }
    return DOM.mainContentMobile;
};

// Fungsi Render Grid Lagu
const createSongGridHTML = (playlist, playlistName, limit = -1) => {
    let gridHTML = '';
    const itemsToRender = limit === -1 ? playlist : playlist.slice(0, limit);
    
    itemsToRender.forEach((song, index) => {
        const isInitiallyHidden = playlistName === 'topcharts' && index >= 5;
        const hiddenClass = isInitiallyHidden ? 'hidden' : '';
        const title = decodeHtml(song.title);
        const artist = decodeHtml(song.artist);
        
        gridHTML += `
            <div class="song-item-grid ${hiddenClass}" 
                 data-index="${index}" 
                 data-playlist="${playlistName}" 
                 data-video-id="${song.videoId}">
                <img src="${song.thumbnailUrl}" alt="${title}" loading="lazy">
                <p class="title" title="${title}">${title}</p>
                <p class="artist">${artist}</p>
            </div>`;
    });
    return gridHTML;
};

// Render Halaman Utama
export const renderHomePage = (topCharts, koleksi) => {
    const mobileContainer = ensureMobileContainer();
    
    // HTML Template untuk Desktop
    DOM.mainContent.innerHTML = `
        <div id="main-content-scroll-area">
            <section id="top-charts-section" class="playlist-section-desktop">
                <div class="playlist-header">
                    <h2>Top Charts</h2>
                    <div id="top-charts-controls-desktop" class="show-all-container">
                         ${topCharts.length > 5 ? '<button class="show-all-button">Lihat Semua</button><button class="hide-button hidden">Sembunyikan</button>' : ''}
                    </div>
                </div>
                <div id="top-charts-container-desktop" class="song-grid">
                    ${createSongGridHTML(topCharts, 'topcharts')}
                </div>
            </section>
            <section id="koleksi-section" class="playlist-section-desktop">
                <div class="playlist-header">
                    <h2>Koleksi Lokal</h2>
                </div>
                <div id="koleksi-container-desktop" class="song-grid">
                    ${createSongGridHTML(koleksi, 'koleksi')}
                </div>
            </section>
        </div>`;

    // HTML Template untuk Mobile
    mobileContainer.innerHTML = `
        <section class="playlist-section-mobile">
            <div class="playlist-header-mobile">
                <h2>Top Charts</h2>
                <div id="top-charts-controls-mobile" class="show-all-container">
                     ${topCharts.length > 5 ? '<button class="show-all-button">Lihat Semua</button><button class="hide-button hidden">Sembunyikan</button>' : ''}
                </div>
            </div>
            <div id="top-charts-container-mobile" class="song-grid">
                ${createSongGridHTML(topCharts, 'topcharts')}
            </div>
        </section>
        <section class="playlist-section-mobile">
            <div class="playlist-header-mobile">
                <h2>Koleksi Lokal</h2>
            </div>
            <div id="koleksi-container-mobile" class="song-grid">
                ${createSongGridHTML(koleksi, 'koleksi')}
            </div>
        </section>`;
        
    renderFloatingPlayer();
};

// Render Floating Player (Jika belum ada)
export const renderFloatingPlayer = () => {
    if (document.querySelector('.floating-player-container')) return;

    const playerHTML = `
        <div class="floating-player-container">
            <div class="current-track-info">
                <img id="current-track-art" src="https://placehold.co/60x60/333/fff?text=?" alt="Album Art">
                <div class="track-details">
                    <p id="current-track-title">Pilih sebuah lagu</p>
                    <p id="current-track-artist">musiklo</p>
                </div>
            </div>
            <div class="player-core">
                <div class="player-controls">
                    <button id="shuffle-button" title="Acak"><i class="fas fa-random"></i></button>
                    <button id="prev-button" title="Sebelumnya"><i class="fas fa-step-backward"></i></button>
                    <button id="play-pause-button" title="Mainkan/Jeda"><i id="play-pause-icon" class="fas fa-play-circle"></i></button>
                    <button id="next-button" title="Berikutnya"><i class="fas fa-step-forward"></i></button>
                    <button id="repeat-button" title="Ulangi"><i class="fas fa-redo"></i></button>
                </div>
                <div class="progress-container">
                    <span id="current-time-display">0:00</span>
                    <input type="range" id="progress-bar" value="0" step="1">
                    <span id="total-time-display">0:00</span>
                </div>
            </div>
            <div class="volume-container">
                <div class="volume-control">
                    <i class="fas fa-volume-high" id="volume-icon"></i>
                    <input type="range" id="volume-bar" min="0" max="100" value="80">
                </div>
            </div>
        </div>`;
    
    DOM.mainContent.insertAdjacentHTML('beforeend', playerHTML);
};

// Render Hasil Pencarian
export const renderSearchResults = (results, query) => {
    const mobileContainer = ensureMobileContainer();
    const gridHTML = createSongGridHTML(results, 'search');
    
    DOM.mainContent.innerHTML = `
        <div id="main-content-scroll-area">
            <section class="playlist-section-desktop">
                <div class="playlist-header"><h2>Hasil untuk "${decodeHtml(query)}"</h2></div>
                <div class="song-grid">${gridHTML}</div>
            </section>
        </div>`;
        
    mobileContainer.innerHTML = `
        <section class="playlist-section-mobile">
            <h2>Hasil untuk "${decodeHtml(query)}"</h2>
            <div class="song-grid">${gridHTML}</div>
        </section>`;
        
    renderFloatingPlayer();
};

// Update Tampilan Lirik
export const updateLyricsDisplay = async (artist, title) => {
    if (!DOM.lyricsText) return;
    
    const cleanedTitle = cleanSongTitle(title);
    DOM.lyricsText.textContent = `Mencari lirik untuk "${cleanedTitle}"...`;
    
    const lyrics = await fetchLyrics(artist, cleanedTitle);
    DOM.lyricsText.textContent = lyrics || 'Lirik untuk lagu ini tidak tersedia.';
};

// Tampilkan Loading
export const showLoader = () => {
    const loaderHTML = '<div class="loader"></div>';
    DOM.mainContent.innerHTML = loaderHTML;
    ensureMobileContainer().innerHTML = loaderHTML;
};