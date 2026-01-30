// app.js
import { ThemeManager } from './js/theme.js';
import { MusicPlayer } from './js/player.js';
import * as UI from './js/ui.js'; // Kita import semua dari UI
import * as API from './js/api.js';
import { extractYouTubeId } from './js/utils.js';

// === 1. INISIALISASI ===
document.addEventListener('DOMContentLoaded', () => {
    // Jalankan Theme Manager
    new ThemeManager();

    // State Global Sederhana
    let topChartsData = [];
    let koleksiData = [];
    let currentSearchResults = [];
    let userPlaylistsData = []; // Data Playlist User
    let activePlaylistSource = ''; // 'topcharts', 'koleksi', 'search', 'user-playlist'

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
            
            // Load User Playlists dari LocalStorage
            loadUserPlaylists();

            // Render Halaman
            UI.renderHomePage(topChartsData, koleksiData);

            // Render Sidebar Playlists
            renderUserPlaylistsUI();
            
            // Setup listener untuk elemen yang baru dirender
            // Setup listener untuk elemen yang baru dirender (hanya jika belum ada)
            // setupGlobalListeners(); // DIPINDAHKAN KE BAWAH
            // setupPlaylistListeners(); // DIPINDAHKAN KE BAWAH
            
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
        else if (source.startsWith('user-playlist-')) {
            const playlistName = source.replace('user-playlist-', '');
            const target = userPlaylistsData.find(p => p.name === playlistName);
            if (target) playlistToLoad = target.songs;
        }

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
    


    // === 5B. PLAYLIST FEATURE LOGIC ===
    
    const loadUserPlaylists = () => {
        const stored = localStorage.getItem('musiklo_playlists');
        if (stored) {
            try {
                userPlaylistsData = JSON.parse(stored);
            } catch (e) {
                console.error("Gagal parse local storage", e);
                userPlaylistsData = [];
            }
        }
    };

    const saveUserPlaylists = () => {
        localStorage.setItem('musiklo_playlists', JSON.stringify(userPlaylistsData));
        renderUserPlaylistsUI();
    };

    const renderUserPlaylistsUI = () => {
        const container = document.getElementById('user-playlists-container');
        if (!container) return;

        container.innerHTML = ''; // Reset
        userPlaylistsData.forEach(playlist => {
            const li = document.createElement('li');
            li.innerHTML = `<a href="#" class="user-playlist-link" data-name="${playlist.name}"><i class="fas fa-list-music"></i> ${playlist.name}</a>`;
            container.appendChild(li);
        });

        // Re-attach listeners for new items
        container.querySelectorAll('.user-playlist-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const playlistName = link.dataset.name;
                const playlist = userPlaylistsData.find(p => p.name === playlistName);
                if (playlist) {
                    // Update UI dahulu
                    UI.renderPlaylistPage(playlistName, playlist.songs);
                    
                    // Setup listener elemen baru
                    setupGlobalListeners(); 

                    // HAPUS AUTOPLAY: Biarkan user pilih lagu sendiri
                    // if (playlist.songs.length > 0) {
                    //    player.loadPlaylist(playlist.songs, `user-playlist-${playlistName}`);
                    //    activePlaylistSource = `user-playlist-${playlistName}`;
                    //    player.playAt(0); 
                    // }
                } else {
                    alert('Playlist ini kosong!');
                }
            });
        });
    };

    const setupPlaylistListeners = () => {
        // 1. Tombol Buat Playlist (Buka Modal) - Pakai Delegation untuk handle tombol Desktop & Mobile
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('#create-playlist-btn') || e.target.closest('#create-playlist-btn-mobile');
            if (btn) {
                e.preventDefault();
                const modal = document.getElementById('playlist-modal');
                if(modal) modal.classList.remove('hidden');
            }
        });

        const modal = document.getElementById('playlist-modal');
        const btnClose = document.getElementById('close-modal');
        const form = document.getElementById('playlist-form');

        if (btnClose && modal) {
            btnClose.addEventListener('click', () => {
                modal.classList.add('hidden');
            });
        }

        // Close on outside click
        window.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });

        // 2. Form Submit
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const nameInput = document.getElementById('playlist-name');
                const linkInput = document.getElementById('playlist-link');
                const submitBtn = form.querySelector('.submit-btn');

                const name = nameInput.value.trim();
                const link = linkInput.value.trim();

                if (!name || !link) return;

                // Extract ID
                const videoId = extractYouTubeId(link);
                if (!videoId) {
                    alert('Link YouTube tidak valid!');
                    return;
                }

                // UI Loading state
                const originalBtnText = submitBtn.textContent;
                submitBtn.textContent = 'Memproses...';
                submitBtn.disabled = true;

                try {
                    // Fetch params (Title, Thumbnail)
                    const oembed = await API.fetchOEmbedData(videoId);
                    const title = oembed ? oembed.title : 'Lagu Baru';
                    const artist = oembed ? oembed.author_name : 'Unknown Artist';
                    const thumbnailUrl = oembed ? oembed.thumbnail_url : `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

                    const newSong = { videoId, title, artist, thumbnailUrl };

                    // Cek apakah playlist sudah ada
                    let playlistIndex = userPlaylistsData.findIndex(p => p.name === name);
                    if (playlistIndex === -1) {
                        // Buat baru
                        userPlaylistsData.push({ name, songs: [newSong] });
                        alert(`Playlist "${name}" berhasil dibuat!`);
                    } else {
                        // Tambah ke existing
                        userPlaylistsData[playlistIndex].songs.push(newSong);
                        alert(`Lagu ditambahkan ke playlist "${name}"!`);
                    }

                    saveUserPlaylists();
                    form.reset();
                    modal.classList.add('hidden');
                } catch (err) {
                    console.error(err);
                    alert('Terjadi kesalahan saat menyimpan playlist.');
                } finally {
                    submitBtn.textContent = originalBtnText;
                    submitBtn.disabled = false;
                }
            });
        }
    };


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
                else if(page === 'library') {
                    UI.renderLibraryPage(userPlaylistsData);
                    // Attach listener untuk playlist items di mobile (Delegation via global click sudah handle klik lagu, 
                    // tapi kita butuh handle klik playlist untuk buka detail)
                    // Kita bisa tambahkan listener khusus di sini atau pakai global delegation.
                    // Biar rapi, kita pakai global delegation di bawah.
                }
                else if(page === 'search') {
                    const input = document.getElementById('search-input-mobile');
                    if(input) input.focus();
                    window.scrollTo({top:0, behavior:'smooth'});
                }
                // Halaman lain bisa ditambahkan nanti
            });
        }

        // ===============================================
        // [TAMBAHAN BRI] FITUR AUTO-HIDE NAVIGASI SAAT SCROLL
        // ===============================================
        let lastScrollY = window.scrollY;
        
        // Kita gunakan throttle sederhana lewat requestAnimationFrame kalau mau super smooth,
        // tapi untuk sekarang logic dasar ini sudah cukup efektif.
        window.addEventListener('scroll', () => {
            // Cek biar aman kalau elemennya gak ada (mode desktop)
            const nav = document.querySelector('.mobile-nav');
            if (!nav) return;

            const currentScrollY = window.scrollY;
            
            // Jika scroll ke bawah DAN sudah scroll lebih dari 50px dari atas
            if (currentScrollY > lastScrollY && currentScrollY > 50) {
                nav.classList.add('nav-hidden'); // Tambah class CSS untuk sembunyi
            } else {
                nav.classList.remove('nav-hidden'); // Hapus class untuk muncul lagi
            }

            lastScrollY = currentScrollY;
        });
        // ===============================================
    };

    // === 7. CUSTOM MODAL HELPER ===
    const showConfirmModal = (title, message, onConfirm) => {
        const modal = document.getElementById('confirm-modal');
        const titleEl = document.getElementById('confirm-title');
        const msgEl = document.getElementById('confirm-message');
        const yesBtn = document.getElementById('confirm-yes-btn');
        const cancelBtn = document.getElementById('confirm-cancel-btn');

        if (!modal) return;

        titleEl.textContent = title;
        msgEl.textContent = message;
        modal.classList.remove('hidden');

        // Reset previous listeners (cloneNode trick)
        const newYesToken = yesBtn.cloneNode(true);
        const newCancelToken = cancelBtn.cloneNode(true);
        yesBtn.parentNode.replaceChild(newYesToken, yesBtn);
        cancelBtn.parentNode.replaceChild(newCancelToken, cancelBtn);

        // Add new listeners
        newYesToken.addEventListener('click', () => {
            modal.classList.add('hidden');
            onConfirm();
        });

        newCancelToken.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        
        // Close on outside click is handled by generic modal listener if added, 
        // but let's add specific one for safety here if needed or reuse existing
        modal.onclick = (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        };
    };

    // GLOBAL DELEGATION (Menangani klik di elemen dinamis)
    document.body.addEventListener('click', (e) => {
        // console.log('Click detected on:', e.target); // Debug toggle
        
        // --- PRIORITAS TINGGI: Tombol Aksi Spesifik ---

        // 9. Delete Playlist (Desktop & Mobile)
        const btnDeletePlaylist = e.target.closest('#delete-playlist-btn') || e.target.closest('#delete-playlist-btn-mobile');
        if (btnDeletePlaylist) {
            e.preventDefault();
            const playlistNameMatch = document.querySelector('.playlist-header h2') || document.querySelector('.playlist-header-mobile h2');
            if (playlistNameMatch) {
                let currentName = playlistNameMatch.textContent.replace('Playlist: ', '').trim();
                
                showConfirmModal(
                    'Hapus Playlist', 
                    `Yakin ingin menghapus playlist "${currentName}"?`, 
                    () => {
                        userPlaylistsData = userPlaylistsData.filter(p => p.name !== currentName);
                        saveUserPlaylists();
                        initApp(); 
                    }
                );
            }
            return; // Stop here
        }

        // 6. Tombol Back di Mobile Playlist
        if (e.target.closest('#back-to-library-btn')) {
            e.preventDefault();
            UI.renderLibraryPage(userPlaylistsData);
            return;
        }

        // 7. Tombol Back di Desktop Playlist (Kembali ke Home)
        if (e.target.closest('#back-to-home-desktop-btn')) {
            e.preventDefault();
            initApp();
            return;
        }

        // 10. Remove Song from Playlist
        const btnRemoveSong = e.target.closest('.remove-song-btn');
        if (btnRemoveSong) {
            e.preventDefault();
            e.stopPropagation(); 
            
            const index = parseInt(btnRemoveSong.dataset.index);
            const playlistName = btnRemoveSong.dataset.playlist.replace('user-playlist-', '');
            
            showConfirmModal(
                'Hapus Lagu',
                'Hapus lagu ini dari playlist?',
                () => {
                    const playlistIndex = userPlaylistsData.findIndex(p => p.name === playlistName);
                    if (playlistIndex !== -1) {
                        userPlaylistsData[playlistIndex].songs.splice(index, 1);
                        saveUserPlaylists();
                        UI.renderPlaylistPage(playlistName, userPlaylistsData[playlistIndex].songs);
                    }
                }
            );
            return; // Stop here
        }
        
        // --- PRIORITAS MENENGAH: Tombol Navigasi/Player ---

        // 2. Tombol Player (Play, Next, Prev, Shuffle, Repeat)
        const btnTarget = e.target.closest('button');
        if (btnTarget) {
            // Cek apakah ini tombol hapus yang sudah dihandle di atas?
            // Jika classnya remove-song-btn atau id delete-playlist, sudah dihandle.
            // Jika classnya remove-song-btn atau id delete-playlist, sudah dihandle.
            if (btnTarget.classList.contains('remove-song-btn') || 
                btnTarget.id.includes('delete-playlist') || 
                btnTarget.id.includes('confirm-') ||
                btnTarget.id.includes('back-to-')) return; 

            const id = btnTarget.id;
            if (id.includes('play-pause')) player.togglePlay();
            else if (id.includes('next')) player.next();
            else if (id.includes('prev')) player.prev();
            else if (id.includes('shuffle')) {
                const isShuffle = player.toggleShuffle();
                btnTarget.classList.toggle('active', isShuffle);
            }
            else if (id.includes('repeat')) {
                const mode = player.toggleRepeat();
                const icon = btnTarget.querySelector('i');
                btnTarget.classList.remove('active');
                if(icon) icon.className = 'fas fa-redo'; 
                if (mode === 'all') btnTarget.classList.add('active');
                else if (mode === 'one') {
                    btnTarget.classList.add('active');
                    if(icon) icon.className = 'fas fa-1'; 
                }
            }
            
            // 3. Tombol Show All / Hide
            if (btnTarget.classList.contains('show-all-button')) {
                const section = btnTarget.closest('section');
                section.querySelectorAll('.song-item-grid.hidden').forEach(el => el.classList.remove('hidden'));
                btnTarget.classList.add('hidden');
                section.querySelector('.hide-button').classList.remove('hidden');
            } else if (btnTarget.classList.contains('hide-button')) {
                 const section = btnTarget.closest('section');
                 section.querySelectorAll('.song-item-grid').forEach((el, idx) => {
                     if(idx >= 5) el.classList.add('hidden');
                 });
                 btnTarget.classList.add('hidden');
                 section.querySelector('.show-all-button').classList.remove('hidden');
            }
            return; // Stop if button handled
        }
        
        // 4. Lirik Toggle
        if (e.target.closest('.lyrics-header')) {
            UI.DOM.lyricsSection.classList.toggle('active');
        }

        // 5. Klik Playlist di Mobile Library
        const mobilePlaylistLink = e.target.closest('.user-playlist-link-mobile');
        if (mobilePlaylistLink) {
            e.preventDefault();
            const playlistName = mobilePlaylistLink.dataset.name;
            const playlist = userPlaylistsData.find(p => p.name === playlistName);
            if (playlist) {
                UI.renderPlaylistPage(playlistName, playlist.songs);
                window.scrollTo({top:0, behavior:'smooth'});
            }
        }

        // 5. Klik Playlist di Mobile Library
        
        // 8. Sidebar Navigation (Desktop)
        const sidebarLink = e.target.closest('.main-nav li a');
        if (sidebarLink) {
            e.preventDefault();
            const li = sidebarLink.parentElement;
            const text = sidebarLink.textContent.trim().toLowerCase();
            if (text.includes('home')) {
                document.querySelectorAll('.main-nav li').forEach(el => el.classList.remove('active'));
                li.classList.add('active');
                initApp();
            }
        }

        // --- PRIORITAS RENDAH: Container Besar ---

        // 1. Klik Lagu di Grid (Dipindahkan ke paling bawah agar tidak memblokir tombol di dalamnya)
        // KECUALI tombol hapus sudah dihandle di atas dengan return.
        const songItem = e.target.closest('.song-item-grid');
        if (songItem) {
            const index = parseInt(songItem.dataset.index);
            const source = songItem.dataset.playlist;
            handleSongClick(index, source);
            return;
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

    setupGlobalListeners();
    setupPlaylistListeners();
    initApp();

    // Register Service Worker for PWA
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./sw.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
});