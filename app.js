// app.js
import { ThemeManager } from './js/theme.js';
import { MusicPlayer } from './js/player.js';
import * as UI from './js/ui.js'; // Kita import semua dari UI
import * as API from './js/api.js';

// === 1. INISIALISASI ===
document.addEventListener('DOMContentLoaded', () => {
    // Jalankan Theme Manager
    new ThemeManager();

    // State Global Sederhana
    let topChartsData = [];
    let koleksiData = [];
    let currentSearchResults = [];
    let activePlaylistSource = ''; // 'topcharts', 'koleksi', 'search'

    // === 2. SETUP PLAYER & CALLBACKS ===
    const player = new MusicPlayer({
        // Callback saat status play/pause berubah
        onStateChange: (isPlaying) => {
            updatePlayPauseIcons(isPlaying);
            if (isPlaying) startProgressLoop();
            else stopProgressLoop();
        },
        // Callback saat lagu berganti
        onSongChange: (song) => {
            updatePlayerInfoUI(song);
            UI.updateLyricsDisplay(song.artist, song.title);
            highlightActiveSong(song.videoId);
        }
    });

    // Inisialisasi YouTube Iframe
    player.initYTPlayer('youtube-player');

    // === 3. LOGIKA UTAMA (Main Logic) ===
    
    // Fungsi Load Data Awal
    const initApp = async () => {
        UI.showLoader();
        try {
            // Ambil data secara paralel biar ngebut
            const [topCharts, koleksi] = await Promise.all([
                API.fetchTopCharts(),
                API.fetchKoleksi()
            ]);
            
            topChartsData = topCharts;
            koleksiData = koleksi;
            
            // Render Halaman
            UI.renderHomePage(topChartsData, koleksiData);
            
            // Setup listener untuk elemen yang baru dirender
            setupGlobalListeners();
            
        } catch (error) {
            console.error(error);
            UI.DOM.mainContent.innerHTML = '<p style="text-align:center; padding:2rem;">Gagal memuat data. Coba refresh halaman.</p>';
        }
    };

    // Fungsi Handle Klik Lagu
    const handleSongClick = (index, source) => {
        let playlistToLoad = [];
        
        // Tentukan playlist mana yang dipakai
        if (source === 'topcharts') playlistToLoad = topChartsData;
        else if (source === 'koleksi') playlistToLoad = koleksiData;
        else if (source === 'search') playlistToLoad = currentSearchResults;

        // Jika sumber playlist berubah, load ulang ke player
        // Atau jika playlist kosong (awal main), load juga
        if (activePlaylistSource !== source || player.playlist.length === 0) {
            player.loadPlaylist(playlistToLoad, source);
            activePlaylistSource = source;
        }

        // Mainkan lagu pada index tersebut (akan otomatis handle shuffle internal player)
        // Kita perlu cari index yang *sebenarnya* jika mode shuffle aktif, 
        // tapi logika player.playAt() kita buat sederhana dulu menerima index visual
        // PENTING: Untuk simplifikasi, saat klik langsung dari UI, kita anggap itu urutan normal dulu.
        // Jika shuffle aktif, player.js akan menangani mappingnya nanti.
        
        // Koreksi: Agar akurat, kita cari lagu berdasarkan videoId di playlist player
        const selectedSong = playlistToLoad[index];
        const playerIndex = player.playlist.findIndex(s => s.videoId === selectedSong.videoId);
        
        if (playerIndex !== -1) {
            player.playAt(playerIndex);
        }
    };

    // Fungsi Pencarian
    const handleSearch = async (query) => {
        if (!query.trim()) return;
        UI.showLoader();
        try {
            const results = await API.searchMusic(query);
            currentSearchResults = results;
            activePlaylistSource = 'search'; // Set konteks ke search
            UI.renderSearchResults(results, query);
        } catch (error) {
            console.error(error);
        }
    };

    // === 4. HELPER UI UPDATES ===
    
    // Update Info Lagu di Player Bawah & Sidebar
    const updatePlayerInfoUI = (song) => {
        // Helper update text & src aman
        const setText = (sel, text) => document.querySelectorAll(sel).forEach(el => el.textContent = text);
        const setSrc = (sel, src) => document.querySelectorAll(sel).forEach(el => el.src = src);

        setText('#current-track-title, #current-track-title-mobile, #now-playing-card-title', UI.decodeHtml(song.title));
        setText('#current-track-artist, #current-track-artist-mobile, #now-playing-card-artist', UI.decodeHtml(song.artist));
        setSrc('#current-track-art, #current-track-art-mobile, #now-playing-card-art', song.thumbnailUrl);
        
        // Link YouTube di sidebar
        const ytLink = document.getElementById('now-playing-youtube-link');
        if (ytLink) ytLink.href = `https://www.youtube.com/watch?v=${song.videoId}`;
        
        // Tampilkan player mobile jika tersembunyi
        const mobilePlayer = document.querySelector('.player-container-mobile');
        if (mobilePlayer) mobilePlayer.classList.remove('hidden');
    };

    // Update Icon Play/Pause
    const updatePlayPauseIcons = (isPlaying) => {
        const icons = document.querySelectorAll('#play-pause-icon, #play-pause-icon-mobile');
        icons.forEach(icon => {
            icon.classList.remove('fa-play-circle', 'fa-pause-circle');
            icon.classList.add(isPlaying ? 'fa-pause-circle' : 'fa-play-circle');
        });
    };

    // Highlight Lagu Aktif di Grid
    const highlightActiveSong = (videoId) => {
        document.querySelectorAll('.active-song').forEach(el => el.classList.remove('active-song'));
        document.querySelectorAll(`[data-video-id="${videoId}"]`).forEach(el => el.classList.add('active-song'));
    };

    // Progress Bar Loop
    let progressInterval;
    const startProgressLoop = () => {
        clearInterval(progressInterval);
        progressInterval = setInterval(() => {
            const progress = player.getProgress();
            if (progress && progress.total > 0) {
                const percent = (progress.current / progress.total) * 100;
                // Update Desktop & Mobile bars
                ['#progress-bar', '#progress-bar-mobile'].forEach(id => {
                    const el = document.querySelector(id);
                    if (el) el.value = percent;
                });
                // Update Time Text
                ['#current-time-display', '#current-time-mobile'].forEach(id => {
                    const el = document.querySelector(id);
                    if (el) el.textContent = UI.formatTime(progress.current);
                });
                ['#total-time-display', '#total-time-mobile'].forEach(id => {
                    const el = document.querySelector(id);
                    if (el) el.textContent = UI.formatTime(progress.total);
                });
            }
        }, 1000);
    };
    const stopProgressLoop = () => clearInterval(progressInterval);


    // === 5. EVENT LISTENERS (DELEGATION) ===
    
    const setupGlobalListeners = () => {
        // Listener Pencarian
        const searchInputs = [document.getElementById('search-input-desktop'), document.getElementById('search-input-mobile')];
        searchInputs.forEach(input => {
            if(input) {
                input.addEventListener('keyup', (e) => {
                    if (e.key === 'Enter') handleSearch(e.target.value);
                });
            }
        });

        // Tombol Search Mobile
        const btnSearchMobile = document.getElementById('search-button-mobile');
        if(btnSearchMobile) {
            btnSearchMobile.addEventListener('click', () => {
                const input = document.getElementById('search-input-mobile');
                handleSearch(input.value);
            });
        }

        // Logo klik (Balik ke Home)
        document.querySelectorAll('.logo a').forEach(logo => {
            logo.addEventListener('click', (e) => {
                e.preventDefault();
                initApp(); // Reset ke awal
            });
        });

        // Navigasi Mobile
        const mobileNav = document.querySelector('.mobile-nav');
        if (mobileNav) {
            mobileNav.addEventListener('click', (e) => {
                e.preventDefault();
                const target = e.target.closest('li');
                if(!target) return;
                
                // Active Class
                mobileNav.querySelectorAll('li').forEach(li => li.classList.remove('active'));
                target.classList.add('active');

                const page = target.dataset.page;
                if(page === 'home') initApp();
                else if(page === 'search') {
                    const input = document.getElementById('search-input-mobile');
                    if(input) input.focus();
                    window.scrollTo({top:0, behavior:'smooth'});
                }
                // Halaman lain bisa ditambahkan nanti
            });
        }
    };

    // GLOBAL DELEGATION (Menangani klik di elemen dinamis)
    document.body.addEventListener('click', (e) => {
        // 1. Klik Lagu di Grid
        const songItem = e.target.closest('.song-item-grid');
        if (songItem) {
            const index = parseInt(songItem.dataset.index);
            const source = songItem.dataset.playlist;
            handleSongClick(index, source);
            return;
        }

        // 2. Tombol Player (Play, Next, Prev, Shuffle, Repeat)
        // Kita gunakan ID yang konsisten di UI Desktop & Mobile
        const target = e.target.closest('button');
        if (!target) return;
        const id = target.id;

        if (id.includes('play-pause')) player.togglePlay();
        else if (id.includes('next')) player.next();
        else if (id.includes('prev')) player.prev();
        else if (id.includes('shuffle')) {
            const isShuffle = player.toggleShuffle();
            target.classList.toggle('active', isShuffle);
        }
        else if (id.includes('repeat')) {
            const mode = player.toggleRepeat();
            // Update icon repeat logic visual
            const icon = target.querySelector('i');
            target.classList.remove('active');
            if(icon) icon.className = 'fas fa-redo'; // reset
            
            if (mode === 'all') target.classList.add('active');
            else if (mode === 'one') {
                target.classList.add('active');
                if(icon) icon.className = 'fas fa-1'; // Icon angka 1
            }
        }
        
        // 3. Tombol Show All / Hide
        if (target.classList.contains('show-all-button')) {
            const section = target.closest('section');
            section.querySelectorAll('.song-item-grid.hidden').forEach(el => el.classList.remove('hidden'));
            target.classList.add('hidden');
            section.querySelector('.hide-button').classList.remove('hidden');
        } else if (target.classList.contains('hide-button')) {
             const section = target.closest('section');
             section.querySelectorAll('.song-item-grid').forEach((el, idx) => {
                 if(idx >= 5) el.classList.add('hidden');
             });
             target.classList.add('hidden');
             section.querySelector('.show-all-button').classList.remove('hidden');
        }
        
        // 4. Lirik Toggle
        if (target.closest('.lyrics-header')) {
            UI.DOM.lyricsSection.classList.toggle('active');
        }
    });

    // Input Range (Progress & Volume) Listener
    document.body.addEventListener('input', (e) => {
        if (e.target.id.includes('progress-bar')) {
            player.seekTo(e.target.value);
        } else if (e.target.id.includes('volume-bar')) {
            player.setVolume(e.target.value);
            // Update icon volume visual jika perlu
        }
    });

    // === 6. JALANKAN APLIKASI ===
    initApp();
});