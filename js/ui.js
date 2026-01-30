// js/ui.js

// 1. KITA IMPORT DULU DARI UTILS
import { decodeHtml, cleanSongTitle, formatTime } from "./utils.js";
import { fetchLyrics } from "./api.js";

// 2. [PENTING] KITA EXPORT LAGI SUPAYA BISA DIPAKAI DI APP.JS
export { decodeHtml, formatTime };

// Cache elemen DOM agar tidak dicari berulang-ulang
export const DOM = {
  mainContent: document.querySelector(".main-content"),
  mainContentMobile: document.querySelector(".main-content-mobile"),
  progressBarDesktop: document.getElementById("progress-bar"),
  currentTimeDesktop: document.getElementById("current-time-display"),
  totalTimeDesktop: document.getElementById("total-time-display"),
  lyricsText: document.getElementById("lyrics-text"),
  lyricsSection: document.querySelector(".lyrics-section"),
  lyricsHeader: document.getElementById("lyrics-header"),
};

// Fungsi Render Grid Lagu
const createSongGridHTML = (playlist, playlistName, limit = -1, showDelete = false) => {
    let gridHTML = '';
    const itemsToRender = limit === -1 ? playlist : playlist.slice(0, limit);
    
    itemsToRender.forEach((song, index) => {
        const isInitiallyHidden = playlistName === 'topcharts' && index >= 5;
        const hiddenClass = isInitiallyHidden ? 'hidden' : '';
        const title = decodeHtml(song.title);
        const artist = decodeHtml(song.artist);
        
        const deleteBtnHTML = showDelete ? 
            `<button class="remove-song-btn" data-index="${index}" data-playlist="${playlistName}" title="Hapus dari playlist" style="position:absolute; top:5px; right:5px; background:rgba(0,0,0,0.6); color:white; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer;"><i class="fas fa-times"></i></button>` 
            : '';

        gridHTML += `
            <div class="song-item-grid ${hiddenClass}" 
                 data-index="${index}" 
                 data-playlist="${playlistName}" 
                 data-video-id="${song.videoId}"
                 style="position:relative;">
                ${deleteBtnHTML}
                <img src="${song.thumbnailUrl}" alt="${title}" loading="lazy">
                <p class="title" title="${title}">${title}</p>
                <p class="artist">${artist}</p>
            </div>`;
    });
    return gridHTML;
};

// Render Halaman Utama
export const renderHomePage = (topCharts, koleksi) => {
  const mobileContainer = DOM.mainContentMobile;

  // HTML Template untuk Desktop
  DOM.mainContent.innerHTML = `
        <div id="main-content-scroll-area">
            <section id="top-charts-section" class="playlist-section-desktop">
                <div class="playlist-header">
                    <h2>Top Charts</h2>
                    <div id="top-charts-controls-desktop" class="show-all-container">
                         ${topCharts.length > 5 ? '<button class="show-all-button">Lihat Semua</button><button class="hide-button hidden">Sembunyikan</button>' : ""}
                    </div>
                </div>
                <div id="top-charts-container-desktop" class="song-grid">
                    ${createSongGridHTML(topCharts, "topcharts")}
                </div>
            </section>
            <section id="koleksi-section" class="playlist-section-desktop">
                <div class="playlist-header">
                    <h2>Koleksi Lokal</h2>
                </div>
                <div id="koleksi-container-desktop" class="song-grid">
                    ${createSongGridHTML(koleksi, "koleksi")}
                </div>
            </section>
        </div>`;

  // HTML Template untuk Mobile
  mobileContainer.innerHTML = `
        <section class="playlist-section-mobile">
            <div class="playlist-header-mobile">
                <h2>Top Charts</h2>
                <div id="top-charts-controls-mobile" class="show-all-container">
                     ${topCharts.length > 5 ? '<button class="show-all-button">Lihat Semua</button><button class="hide-button hidden">Sembunyikan</button>' : ""}
                </div>
            </div>
            <div id="top-charts-container-mobile" class="song-grid">
                ${createSongGridHTML(topCharts, "topcharts")}
            </div>
        </section>
        <section class="playlist-section-mobile">
            <div class="playlist-header-mobile">
                <h2>Koleksi Lokal</h2>
            </div>
            <div id="koleksi-container-mobile" class="song-grid">
                ${createSongGridHTML(koleksi, "koleksi")}
            </div>
        </section>`;

  renderFloatingPlayer();
};

// Render Floating Player (Jika belum ada)
export const renderFloatingPlayer = () => {
  if (document.querySelector(".floating-player-container")) return;

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

  DOM.mainContent.insertAdjacentHTML("beforeend", playerHTML);
};

// Render Halaman Library (Mobile)
export const renderLibraryPage = (playlists) => {
  const mobileContainer = DOM.mainContentMobile;

  let playlistsHTML = "";
  if (playlists.length === 0) {
    playlistsHTML =
      '<p style="color:var(--text-secondary); text-align:center; padding:2rem;">Belum ada playlist. Buat satu sekarang!</p>';
  } else {
    playlistsHTML = '<ul class="mobile-playlist-list">';
    playlists.forEach((p) => {
      playlistsHTML += `
                <li>
                    <a href="#" class="user-playlist-link-mobile" data-name="${decodeHtml(p.name)}">
                        <div class="playlist-icon"><i class="fas fa-music"></i></div>
                        <div class="playlist-info">
                            <span class="playlist-name">${decodeHtml(p.name)}</span>
                            <span class="playlist-count">${p.songs.length} Lagu</span>
                        </div>
                        <i class="fas fa-chevron-right" style="color:var(--text-secondary)"></i>
                    </a>
                </li>`;
    });
    playlistsHTML += "</ul>";
  }

  mobileContainer.innerHTML = `
        <section class="library-section-mobile">
            <div class="library-header-mobile">
                <h2>Library</h2>
                <button id="create-playlist-btn-mobile" class="create-btn-mobile">
                    <i class="fas fa-plus"></i> Buat Playlist
                </button>
            </div>
            ${playlistsHTML}
        </section>
    `;

  renderFloatingPlayer();
};

// Render Hasil Pencarian
export const renderSearchResults = (results, query) => {
  const mobileContainer = DOM.mainContentMobile;
  const gridHTML = createSongGridHTML(results, "search");

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

// Render Halaman Playlist User
export const renderPlaylistPage = (playlistName, songs) => {
    const mobileContainer = DOM.mainContentMobile;
    // Pass showDelete = true
    const gridHTML = createSongGridHTML(songs, `user-playlist-${playlistName}`, -1, true);

    const deleteButtonHTML = `
        <button id="delete-playlist-btn" style="margin-left:auto; background:#ff4444; color:white; border:none; padding:0.5rem 1rem; border-radius:20px; cursor:pointer;" title="Hapus Playlist Ini">
            <i class="fas fa-trash"></i> <span class="hide-on-mobile">Hapus</span>
        </button>
    `;

    // Desktop
    DOM.mainContent.innerHTML = `
        <div id="main-content-scroll-area">
            <section class="playlist-section-desktop">
                <div class="playlist-header" style="display: flex; align-items: center; gap: 1rem;">
                    <button id="back-to-home-desktop-btn" class="back-button-desktop" style="background:none; border:none; color:var(--text-primary); font-size:1.5rem; cursor:pointer;" title="Kembali ke Home">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <h2 style="margin:0;">Playlist: ${decodeHtml(playlistName)}</h2>
                    ${deleteButtonHTML}
                </div>
                ${songs.length === 0 ? '<p style="color:var(--text-secondary)">Belum ada lagu di playlist ini.</p>' : `<div class="song-grid">${gridHTML}</div>`}
            </section>
        </div>`;

    // Mobile
    mobileContainer.innerHTML = `
        <section class="playlist-section-mobile">
            <div class="playlist-header-mobile" style="display: flex; align-items: center; gap: 1rem; justify-content: space-between;">
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <button id="back-to-library-btn" style="background:none; border:none; color:var(--text-primary); font-size:1.2rem; cursor:pointer;">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <h2 style="margin:0; font-size:1.2rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:200px;">${decodeHtml(playlistName)}</h2>
                </div>
                <button id="delete-playlist-btn-mobile" style="background:none; color:#ff4444; border:none; font-size:1.2rem; cursor:pointer;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
             ${songs.length === 0 ? '<p style="color:var(--text-secondary); padding: 1rem;">Belum ada lagu di playlist ini.</p>' : `<div class="song-grid">${gridHTML}</div>`}
        </section>`;

    renderFloatingPlayer();
};

// Update Tampilan Lirik
export const updateLyricsDisplay = async (artist, title) => {
  if (!DOM.lyricsText) return;

  const cleanedTitle = cleanSongTitle(title);
  DOM.lyricsText.textContent = `Mencari lirik untuk "${cleanedTitle}"...`;

  const lyrics = await fetchLyrics(artist, cleanedTitle);
  DOM.lyricsText.textContent = lyrics || "Lirik untuk lagu ini tidak tersedia.";
};

// Tampilkan Loading
export const showLoader = () => {
  const loaderHTML = '<div class="loader"></div>';
  DOM.mainContent.innerHTML = loaderHTML;
  DOM.mainContentMobile.innerHTML = loaderHTML;
};

// Toast Notification System
export const showToast = (message, type = 'success') => {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-info-circle';
    if (type === 'success') iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';

    toast.innerHTML = `
        <i class="fas ${iconClass}"></i>
        <span style="font-size:0.9rem; font-weight:500;">${message}</span>
    `;

    container.appendChild(toast);

    // Auto remove after 3 seconds
    setTimeout(() => {
        toast.style.animation = 'toastFadeOut 0.3s forwards';
        toast.addEventListener('animationend', () => {
            if (toast.parentElement) toast.remove();
        });
    }, 3000);
};
