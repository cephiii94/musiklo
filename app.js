document.addEventListener('DOMContentLoaded', () => {

    // === 1. SELEKSI ELEMEN DOM ===
    const themeToggleButtonMobile = document.getElementById('theme-toggle-mobile');
    const themeToggleButtonDesktop = document.getElementById('theme-toggle-desktop');
    const mainContent = document.querySelector('.main-content');
    const mainContentMobile = document.createElement('div');
    mainContentMobile.className = 'main-content-mobile';
    document.body.insertBefore(mainContentMobile, document.querySelector('.desktop-container'));
    
    const searchInputDesktop = document.getElementById('search-input-desktop');
    const searchInputMobile = document.getElementById('search-input-mobile');
    const searchButtonMobile = document.getElementById('search-button-mobile');
    const logoLinkDesktop = document.getElementById('logo-link-desktop');
    const logoLinkMobile = document.getElementById('logo-link-mobile');
    
    // Player Mobile
    const playerContainerMobile = document.querySelector('.player-container-mobile');
    const playPauseButtonMobile = document.getElementById('play-pause-button-mobile');
    const nextButtonMobile = document.getElementById('next-button-mobile');
    const prevButtonMobile = document.getElementById('prev-button-mobile');
    const currentTrackArtMobile = document.getElementById('current-track-art-mobile');
    const currentTrackTitleMobile = document.getElementById('current-track-title-mobile');
    const currentTrackArtistMobile = document.getElementById('current-track-artist-mobile');
    const progressBarMobile = document.getElementById('progress-bar-mobile');
    const currentTimeMobileDisplay = document.getElementById('current-time-mobile');
    const totalTimeMobileDisplay = document.getElementById('total-time-mobile');
    const shuffleButtonMobile = document.getElementById('shuffle-button-mobile');
    const repeatButtonMobile = document.getElementById('repeat-button-mobile');
    const mobileNav = document.querySelector('.mobile-nav');
    
    // Sidebar Kanan
    const nowPlayingCardArt = document.getElementById('now-playing-card-art');
    const nowPlayingCardTitle = document.getElementById('now-playing-card-title');
    const nowPlayingCardArtist = document.getElementById('now-playing-card-artist');

    // Elemen Lirik
    const lyricsSection = document.querySelector('.lyrics-section');
    const lyricsHeader = document.getElementById('lyrics-header');
    const lyricsText = document.getElementById('lyrics-text');

    // === 2. STATE APLIKASI ===
    let player;
    let topChartsPlaylist = [];
    let koleksiPlaylist = [];
    let currentPlaylist = [];
    let originalPlaylist = []; // Untuk menyimpan urutan asli saat shuffle
    let activePlaylistSource = null;
    let currentIndex = -1;
    let isPlaying = false;
    let progressInterval;
    let isShuffle = false;
    let repeatMode = 'none'; // 'none', 'all', 'one'
    let playAfterLoad = false; // PERBAIKAN: Bendera untuk menandai pemutaran otomatis
    let playerReady = false; // Track player readiness
    let userHasInteracted = false; // Track user interaction for Safari/iOS

    // === 3. LOGIKA TEMA (DARK/LIGHT MODE) ===
    const applyTheme = (theme) => {
        document.body.classList.remove('light-mode', 'dark-mode');
        document.body.classList.add(theme);
        localStorage.setItem('musiklo-theme', theme);
        const sunIcons = document.querySelectorAll('.theme-toggle-button .fa-sun');
        const moonIcons = document.querySelectorAll('.theme-toggle-button .fa-moon');
        if (theme === 'dark-mode') {
            sunIcons.forEach(i => i.classList.add('hidden'));
            moonIcons.forEach(i => i.classList.remove('hidden'));
        } else {
            sunIcons.forEach(i => i.classList.remove('hidden'));
            moonIcons.forEach(i => i.classList.add('hidden'));
        }
    };
    const toggleTheme = () => {
        const currentTheme = localStorage.getItem('musiklo-theme') || 'light-mode';
        const newTheme = currentTheme === 'light-mode' ? 'dark-mode' : 'light-mode';
        applyTheme(newTheme);
    };
    const initializeTheme = () => {
        const savedTheme = localStorage.getItem('musiklo-theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (savedTheme) applyTheme(savedTheme);
        else if (prefersDark) applyTheme('dark-mode');
        else applyTheme('light-mode');
    };

    // === 4. SAFARI/IOS COMPATIBILITY FIXES ===
    // Deteksi Safari/iOS
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    // Fungsi untuk menangani user interaction pertama
    function handleFirstUserInteraction() {
        if (!userHasInteracted) {
            userHasInteracted = true;
            console.log('First user interaction detected');
            
            // Untuk Safari/iOS, kita perlu memulai player dengan volume 0 terlebih dahulu
            if ((isSafari || isIOS) && player && playerReady) {
                try {
                    player.setVolume(0);
                    player.mute();
                } catch (e) {
                    console.log('Could not mute player:', e);
                }
            }
        }
    }

    // Event listeners untuk deteksi interaksi pertama
    ['click', 'touchstart', 'keydown'].forEach(event => {
        document.addEventListener(event, handleFirstUserInteraction, { once: true, passive: true });
    });

    // === 5. INISIALISASI YOUTUBE PLAYER ===
    window.onYouTubeIframeAPIReady = function() {
        player = new YT.Player('youtube-player', {
            height: '0', 
            width: '0',
            playerVars: {
                'autoplay': 0, // Selalu 0 untuk Safari/iOS
                'controls': 0,
                'disablekb': 1,
                'enablejsapi': 1,
                'fs': 0,
                'iv_load_policy': 3,
                'modestbranding': 1,
                'playsinline': 1, // Penting untuk iOS
                'rel': 0,
                'showinfo': 0
            },
            events: { 
                'onReady': onPlayerReady, 
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
            }
        });
    };

    function onPlayerReady(event) {
        playerReady = true;
        player.setVolume(80);
        
        // Untuk Safari/iOS, set volume ke 0 jika belum ada interaksi
        if ((isSafari || isIOS) && !userHasInteracted) {
            player.setVolume(0);
            player.mute();
        }
        
        loadInitialData();
        console.log('YouTube Player ready');
    }

    function onPlayerStateChange(event) {
        const oldIsPlaying = isPlaying;
        isPlaying = (event.data === YT.PlayerState.PLAYING);
        
        if (isPlaying) {
            startProgressUpdater();
            // Unmute dan set volume normal setelah mulai playing (untuk Safari/iOS)
            if ((isSafari || isIOS) && userHasInteracted) {
                setTimeout(() => {
                    try {
                        player.unMute();
                        player.setVolume(80);
                    } catch (e) {
                        console.log('Could not unmute player:', e);
                    }
                }, 100);
            }
        } else {
            clearInterval(progressInterval);
        }
        
        updatePlayPauseIcons();

        // PERBAIKAN: Logika baru untuk Safari/iOS
        if (event.data === YT.PlayerState.CUED && playAfterLoad) {
            if (userHasInteracted) {
                // Untuk Safari/iOS, tambahkan delay kecil
                if (isSafari || isIOS) {
                    setTimeout(() => {
                        try {
                            player.playVideo();
                        } catch (e) {
                            console.log('Could not play video:', e);
                            // Fallback: coba lagi setelah delay
                            setTimeout(() => {
                                try {
                                    player.playVideo();
                                } catch (e2) {
                                    console.log('Second attempt failed:', e2);
                                }
                            }, 500);
                        }
                    }, 200);
                } else {
                    player.playVideo();
                }
            } else {
                console.log('Cannot autoplay - no user interaction yet');
            }
            playAfterLoad = false;
        }
        
        if (event.data === YT.PlayerState.ENDED) {
            if (repeatMode === 'one') {
                player.seekTo(0);
                if (userHasInteracted) {
                    player.playVideo();
                }
            } else {
                playNext();
            }
        }

        // Handle buffering states untuk Safari/iOS
        if (event.data === YT.PlayerState.BUFFERING && (isSafari || isIOS)) {
            console.log('Buffering on Safari/iOS');
        }
    }

    function onPlayerError(event) {
        console.error('YouTube Player Error:', event.data);
        // Handle different error codes
        switch(event.data) {
            case 2:
                console.error('Invalid video ID');
                break;
            case 5:
                console.error('HTML5 player error');
                break;
            case 100:
                console.error('Video not found');
                break;
            case 101:
            case 150:
                console.error('Video not allowed in embedded players');
                break;
        }
        
        // Automatically skip to next song on error
        setTimeout(() => {
            playNext();
        }, 2000);
    }

    // === 6. FUNGSI-FUNGSI UI & SINKRONISASI ===
    const decodeHtml = (html) => { const txt = document.createElement("textarea"); txt.innerHTML = html; return txt.value; };
    const formatTime = (seconds) => { const min = Math.floor(seconds / 60); const sec = Math.floor(seconds % 60).toString().padStart(2, '0'); return `${min}:${sec}`; };
    
    function updatePlayPauseIcons() {
        const iconMobile = document.getElementById('play-pause-icon-mobile');
        const iconDesktop = document.getElementById('play-pause-icon');
        [iconMobile, iconDesktop].forEach(icon => {
            if(icon) {
                icon.classList.remove('fa-play-circle', 'fa-pause-circle');
                icon.classList.add(isPlaying ? 'fa-pause-circle' : 'fa-play-circle');
            }
        });
    }

    function updateProgress() {
        if (!player || typeof player.getDuration !== 'function' || !isPlaying) return;
        
        try {
            const duration = player.getDuration();
            const currentTime = player.getCurrentTime();
            const progressPercent = (duration > 0) ? (currentTime / duration) * 100 : 0;
            
            const progressBarDesktop = document.getElementById('progress-bar');
            const currentTimeDesktop = document.getElementById('current-time-display');
            const totalTimeDesktop = document.getElementById('total-time-display');
            if(progressBarDesktop) progressBarDesktop.value = progressPercent;
            if(currentTimeDesktop) currentTimeDesktop.textContent = formatTime(currentTime);
            if(totalTimeDesktop) totalTimeDesktop.textContent = formatTime(duration);

            if(progressBarMobile) progressBarMobile.value = progressPercent;
            if(currentTimeMobileDisplay) currentTimeMobileDisplay.textContent = formatTime(currentTime);
            if(totalTimeMobileDisplay) totalTimeMobileDisplay.textContent = formatTime(duration);
        } catch (e) {
            console.log('Error updating progress:', e);
        }
    }

    function cleanSongTitle(title) {
        let cleanedTitle = title.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '');
        cleanedTitle = cleanedTitle.replace(/official music video/i, '').replace(/official video/i, '').replace(/music video/i, '').replace(/official/i, '').replace(/lyric video/i, '').replace(/lyrics/i, '');
        return cleanedTitle.trim();
    }

    async function displayLyrics(artist, title) {
        if (!lyricsText) return;
        const cleanedTitle = cleanSongTitle(title);
        lyricsText.textContent = `Mencari lirik untuk "${cleanedTitle}"...`;
        try {
            const response = await fetch(`https://lyrist.vercel.app/api/${encodeURIComponent(artist)}/${encodeURIComponent(cleanedTitle)}`);
            if (!response.ok) throw new Error('Lirik tidak ditemukan.');
            const data = await response.json();
            const lyricsContent = data.lyrics ? data.lyrics.trim() : '';
            lyricsText.textContent = lyricsContent ? lyricsContent : 'Lirik untuk lagu ini tidak tersedia.';
        } catch (error) {
            console.error("Lyrics fetch error:", error);
            lyricsText.textContent = 'Maaf, lirik untuk lagu ini tidak dapat dimuat.';
        }
    }

    function updatePlayerUI(song) {
        if (!song) return;
        const title = decodeHtml(song.title);
        const artist = decodeHtml(song.artist);
        const youtubeUrl = `https://www.youtube.com/watch?v=${song.videoId}`;
        
        if (currentTrackArtMobile) currentTrackArtMobile.src = song.thumbnailUrl;
        if (currentTrackTitleMobile) currentTrackTitleMobile.textContent = title;
        if (currentTrackArtistMobile) currentTrackArtistMobile.textContent = artist;
        
        const artDesktop = document.getElementById('current-track-art');
        const titleDesktop = document.getElementById('current-track-title');
        const artistDesktop = document.getElementById('current-track-artist');
        if(artDesktop) artDesktop.src = song.thumbnailUrl;
        if(titleDesktop) titleDesktop.textContent = title;
        if(artistDesktop) artistDesktop.textContent = artist;
        
        const nowPlayingYoutubeLink = document.getElementById('now-playing-youtube-link');
        if(nowPlayingCardArt) nowPlayingCardArt.src = song.thumbnailUrl;
        if(nowPlayingCardTitle) nowPlayingCardTitle.textContent = title;
        if(nowPlayingCardArtist) nowPlayingCardArtist.textContent = artist;
        if(nowPlayingYoutubeLink) nowPlayingYoutubeLink.href = youtubeUrl;
        
        displayLyrics(artist, title);
        
        document.querySelectorAll('.song-item-grid.active-song').forEach(item => item.classList.remove('active-song'));
        document.querySelectorAll(`[data-video-id='${song.videoId}']`).forEach(el => el.classList.add('active-song'));
    }

    function startProgressUpdater() {
        clearInterval(progressInterval);
        progressInterval = setInterval(updateProgress, 1000);
    }

    // === 7. FUNGSI RENDER KONTEN & PLAYER ===
    function renderHomePage() {
        mainContent.innerHTML = `
            <div id="main-content-scroll-area">
                <section id="top-charts-section" class="playlist-section-desktop">
                    <div class="playlist-header">
                        <h2>Top Charts</h2>
                        <div id="top-charts-controls-desktop" class="show-all-container"></div>
                    </div>
                    <div id="top-charts-container-desktop" class="song-grid"></div>
                </section>
                <section id="koleksi-section" class="playlist-section-desktop">
                    <div class="playlist-header">
                        <h2>Koleksi Lokal</h2>
                        <div id="koleksi-controls-desktop" class="show-all-container"></div>
                    </div>
                    <div id="koleksi-container-desktop" class="song-grid"></div>
                </section>
            </div>`;
        mainContentMobile.innerHTML = `
            <section class="playlist-section-mobile">
                <div class="playlist-header-mobile">
                    <h2>Top Charts</h2>
                    <div id="top-charts-controls-mobile" class="show-all-container"></div>
                </div>
                <div id="top-charts-container-mobile" class="song-grid"></div>
            </section>
            <section class="playlist-section-mobile">
                <div class="playlist-header-mobile">
                    <h2>Koleksi Lokal</h2>
                    <div id="koleksi-controls-mobile" class="show-all-container"></div>
                </div>
                <div id="koleksi-container-mobile" class="song-grid"></div>
            </section>`;
        renderFloatingPlayer();
        renderTopCharts(topChartsPlaylist);
        renderKoleksi(koleksiPlaylist);
    }

    function renderFloatingPlayer() {
        const floatingPlayerHTML = `
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
        mainContent.insertAdjacentHTML('beforeend', floatingPlayerHTML);
        addDesktopPlayerListeners();
    }

    function renderGrid(playlist, playlistName, limit = -1) {
        let gridHTML = '';
        const itemsToRender = limit === -1 ? playlist : playlist.slice(0, limit);
        itemsToRender.forEach((song, index) => {
            const isInitiallyHidden = playlistName === 'topcharts' && index >= 5;
            const hiddenClass = isInitiallyHidden ? 'hidden' : '';
            gridHTML += `<div class="song-item-grid ${hiddenClass}" data-index="${index}" data-playlist="${playlistName}" data-video-id="${song.videoId}"><img src="${song.thumbnailUrl}" alt="${decodeHtml(song.title)}"><p class="title" title="${decodeHtml(song.title)}">${decodeHtml(song.title)}</p><p class="artist">${decodeHtml(song.artist)}</p></div>`;
        });
        return gridHTML;
    }

    function renderTopCharts(playlist) {
        const containerDesktop = document.getElementById('top-charts-container-desktop');
        const containerMobile = document.getElementById('top-charts-container-mobile');
        const controlsDesktop = document.getElementById('top-charts-controls-desktop');
        const controlsMobile = document.getElementById('top-charts-controls-mobile');
        if (!containerDesktop || !containerMobile) return;
        const gridHTML = renderGrid(playlist, 'topcharts');
        containerDesktop.innerHTML = gridHTML;
        containerMobile.innerHTML = gridHTML;
        if (playlist.length > 5) {
            const controlsHTML = `<button class="show-all-button">Lihat Semua</button><button class="hide-button hidden">Sembunyikan</button>`;
            if(controlsDesktop) controlsDesktop.innerHTML = controlsHTML;
            if(controlsMobile) controlsMobile.innerHTML = controlsHTML;
        }
    }

    function renderKoleksi(playlist) {
        const containerDesktop = document.getElementById('koleksi-container-desktop');
        const containerMobile = document.getElementById('koleksi-container-mobile');
        if (!containerDesktop || !containerMobile) return;
        const gridHTML = renderGrid(playlist, 'koleksi');
        containerDesktop.innerHTML = gridHTML;
        containerMobile.innerHTML = gridHTML;
    }

    function renderSearchResults(playlist, query) {
        const gridHTML = renderGrid(playlist, 'search');
        mainContent.innerHTML = `<div id="main-content-scroll-area"><section class="playlist-section-desktop"><div class="playlist-header"><h2>Hasil untuk "${query}"</h2></div><div class="song-grid">${gridHTML}</div></section></div>`;
        mainContentMobile.innerHTML = `<section class="playlist-section-mobile"><h2>Hasil untuk "${query}"</h2><div class="song-grid">${gridHTML}</div></section>`;
        renderFloatingPlayer();
    }

    // === 8. LOGIKA PEMUTARAN LAGU (DIPERBAIKI UNTUK SAFARI/IOS) ===
    function playSong(index, playlistSource) {
        // Pastikan user sudah berinteraksi terlebih dahulu
        handleFirstUserInteraction();
        
        if (activePlaylistSource !== playlistSource) {
            activePlaylistSource = playlistSource;
            if (playlistSource === 'topcharts') originalPlaylist = [...topChartsPlaylist];
            else if (playlistSource === 'koleksi') originalPlaylist = [...koleksiPlaylist];
            else if (playlistSource === 'search') originalPlaylist = [...currentPlaylist];
            
            if (isShuffle) {
                currentPlaylist = [...originalPlaylist].sort(() => Math.random() - 0.5);
            } else {
                currentPlaylist = [...originalPlaylist];
            }
        }
        
        if (index >= 0 && index < currentPlaylist.length) {
            currentIndex = index;
            const song = currentPlaylist[currentIndex];
            
            if (player && typeof player.loadVideoById === 'function' && playerReady) {
                try {
                    // Untuk Safari/iOS, pastikan user sudah berinteraksi
                    if (userHasInteracted) {
                        playAfterLoad = true;
                        player.loadVideoById(song.videoId);
                    } else {
                        // Jika belum ada interaksi, hanya load tanpa autoplay
                        player.cueVideoById(song.videoId);
                        console.log('Video cued, waiting for user interaction to play');
                    }
                    
                    updatePlayerUI(song);
                    
                    if (playerContainerMobile && playerContainerMobile.classList.contains('hidden')) {
                        playerContainerMobile.classList.remove('hidden');
                    }
                } catch (e) {
                    console.error('Error loading video:', e);
                }
            } else {
                console.log('Player not ready yet');
            }
        }
    }

    const playNext = () => {
        if (currentPlaylist.length === 0) return;
        let nextIndex;
        if (isShuffle) {
            nextIndex = Math.floor(Math.random() * currentPlaylist.length);
        } else {
            nextIndex = (currentIndex + 1) % currentPlaylist.length;
        }
        playSong(nextIndex, activePlaylistSource);
    };

    const playPrev = () => {
        if (currentPlaylist.length === 0) return;
        const prevIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        playSong(prevIndex, activePlaylistSource);
    };

    const togglePlayPause = () => { 
        handleFirstUserInteraction();
        
        if (!player || typeof player.playVideo !== 'function' || currentIndex === -1) return; 
        
        try {
            if (isPlaying) {
                player.pauseVideo();
            } else {
                // Untuk Safari/iOS, pastikan unmute sebelum play
                if ((isSafari || isIOS) && userHasInteracted) {
                    player.unMute();
                    player.setVolume(80);
                }
                player.playVideo();
            }
        } catch (e) {
            console.error('Error toggling play/pause:', e);
        }
    };

    // === 9. FUNGSI PENCARIAN & MEMUAT DATA ===
    async function handleSearch(query) {
        if (!query) return;
        mainContent.innerHTML = '<div class="loader"></div>';
        mainContentMobile.innerHTML = '<div class="loader"></div>';
        try {
            const response = await fetch(`/.netlify/functions/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Gagal melakukan pencarian.');
            const results = await response.json();
            currentPlaylist = results;
            activePlaylistSource = 'search';
            renderSearchResults(results, query);
        } catch (error) {
            mainContent.innerHTML = '<p>Terjadi kesalahan saat mencari.</p>';
            mainContentMobile.innerHTML = '<p>Terjadi kesalahan saat mencari.</p>';
        }
    }

    async function loadInitialData() {
        mainContent.innerHTML = '<div class="loader"></div>';
        mainContentMobile.innerHTML = '<div class="loader"></div>';
        try {
            const [topChartsRes, koleksiRes] = await Promise.all([fetch('/.netlify/functions/topcharts'), fetch('/.netlify/functions/koleksi')]);
            if (!topChartsRes.ok) throw new Error('Gagal memuat Top Charts');
            if (!koleksiRes.ok) throw new Error('Gagal memuat Koleksi');
            topChartsPlaylist = await topChartsRes.json();
            koleksiPlaylist = await koleksiRes.json();
            renderHomePage();
        } catch (error) {
            console.error(error);
            mainContent.innerHTML = '<p>Gagal memuat data. Coba refresh halaman.</p>';
        }
    }

    const returnToHome = () => { 
        if (searchInputDesktop) searchInputDesktop.value = ''; 
        if (searchInputMobile) searchInputMobile.value = ''; 
        loadInitialData(); 
    };

    // === 10. EVENT LISTENERS ===
    function addDesktopPlayerListeners() {
        const shuffleButton = document.getElementById('shuffle-button');
        const repeatButton = document.getElementById('repeat-button');

        document.getElementById('play-pause-button')?.addEventListener('click', togglePlayPause);
        document.getElementById('next-button')?.addEventListener('click', playNext);
        document.getElementById('prev-button')?.addEventListener('click', playPrev);
        shuffleButton?.addEventListener('click', toggleShuffle);
        repeatButton?.addEventListener('click', toggleRepeat);
        
        document.getElementById('progress-bar')?.addEventListener('input', (e) => {
            if(currentIndex !== -1 && player && typeof player.seekTo === 'function') {
                try {
                    player.seekTo(player.getDuration() * (e.target.value / 100));
                } catch (err) {
                    console.log('Error seeking:', err);
                }
            }
        });
    }

    // Theme toggle listeners
    if (themeToggleButtonMobile) themeToggleButtonMobile.addEventListener('click', toggleTheme);
    if (themeToggleButtonDesktop) themeToggleButtonDesktop.addEventListener('click', toggleTheme);
    
    document.body.addEventListener('click', (event) => {
        const songItem = event.target.closest('.song-item-grid');
        if (songItem) {
            const index = parseInt(songItem.dataset.index, 10);
            const playlistSource = songItem.dataset.playlist;
            playSong(index, playlistSource);
            return;
        }
        
        const showButton = event.target.closest('.show-all-button');
        const hideButton = event.target.closest('.hide-button');
        if (showButton || hideButton) {
            const section = (showButton || hideButton).closest('.playlist-section-desktop, .playlist-section-mobile');
            if (section) {
                const songContainer = section.querySelector('.song-grid');
                const controlsContainer = section.querySelector('.show-all-container');
                const currentShowButton = controlsContainer.querySelector('.show-all-button');
                const currentHideButton = controlsContainer.querySelector('.hide-button');
                if (showButton) {
                    songContainer.querySelectorAll('.song-item-grid.hidden').forEach(el => el.classList.remove('hidden'));
                    currentShowButton.classList.add('hidden');
                    currentHideButton.classList.remove('hidden');
                } else {
                    songContainer.querySelectorAll('.song-item-grid').forEach((el, index) => {
                        if (index >= 5) el.classList.add('hidden');
                    });
                    currentHideButton.classList.add('hidden');
                    currentShowButton.classList.remove('hidden');
                    section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }
    });

    // Lyrics section toggle
    if (lyricsHeader && lyricsSection) {
        lyricsHeader.addEventListener('click', () => {
            lyricsSection.classList.toggle('active');
        });
    }

    // Mobile player controls
    if (playPauseButtonMobile) playPauseButtonMobile.addEventListener('click', togglePlayPause);
    if (nextButtonMobile) nextButtonMobile.addEventListener('click', playNext);
    if (prevButtonMobile) prevButtonMobile.addEventListener('click', playPrev);
    
    if (progressBarMobile) {
        progressBarMobile.addEventListener('input', (e) => {
            if(currentIndex !== -1 && player && typeof player.seekTo === 'function') {
                try {
                    player.seekTo(player.getDuration() * (e.target.value / 100));
                } catch (err) {
                    console.log('Error seeking on mobile:', err);
                }
            }
        });
    }

    // Mobile shuffle & repeat buttons
    if (shuffleButtonMobile) shuffleButtonMobile.addEventListener('click', toggleShuffle);
    if (repeatButtonMobile) repeatButtonMobile.addEventListener('click', toggleRepeat);
    
    // Search functionality
    const performSearch = (e) => { 
        if (e.key === 'Enter') {
            handleFirstUserInteraction(); // Track user interaction
            handleSearch(e.target.value.trim()); 
        }
    };
    
    if (searchInputDesktop) searchInputDesktop.addEventListener('keyup', performSearch);
    if (searchInputMobile) searchInputMobile.addEventListener('keyup', performSearch);
    if (searchButtonMobile) {
        searchButtonMobile.addEventListener('click', () => {
            handleFirstUserInteraction();
            handleSearch(searchInputMobile.value.trim());
        });
    }
    
    // Logo navigation
    if (logoLinkDesktop) {
        logoLinkDesktop.addEventListener('click', (e) => { 
            e.preventDefault(); 
            returnToHome(); 
        });
    }
    if (logoLinkMobile) {
        logoLinkMobile.addEventListener('click', (e) => { 
            e.preventDefault(); 
            returnToHome(); 
        });
    }

    // Mobile navigation
    function handleMobileNav(e) {
        e.preventDefault();
        handleFirstUserInteraction(); // Track user interaction
        
        const target = e.target.closest('li');
        if (!target) return;
        const page = target.dataset.page;
        if (!page) return;
        
        if (mobileNav) {
            mobileNav.querySelectorAll('li').forEach(item => item.classList.remove('active'));
            target.classList.add('active');
        }
        
        switch (page) {
            case 'home': 
                returnToHome(); 
                break;
            case 'search': 
                if (searchInputMobile) {
                    searchInputMobile.focus(); 
                    window.scrollTo({ top: 0, behavior: 'smooth' }); 
                }
                break;
            case 'library':
                mainContent.innerHTML = '';
                mainContentMobile.innerHTML = `<section class="playlist-section-mobile"><div class="playlist-header-mobile"><h2>Koleksi Lokal</h2></div><div id="koleksi-container-mobile" class="song-grid"></div></section>`;
                renderKoleksi(koleksiPlaylist);
                break;
            case 'discover':
                mainContent.innerHTML = '';
                mainContentMobile.innerHTML = `<div style="text-align: center; padding: 4rem 1rem;"><h2>Halaman Discover</h2><p>Fitur ini akan segera hadir, Tuan Cecep!</p></div>`;
                break;
        }
    }

    if (mobileNav) {
        mobileNav.addEventListener('click', handleMobileNav);
    }

    // === 11. FUNGSI LOGIKA PLAYER TAMBAHAN ===
    function toggleShuffle() {
        handleFirstUserInteraction();
        isShuffle = !isShuffle;
        
        if (currentIndex === -1) return; // Jangan lakukan apa-apa jika tidak ada lagu yang diputar
        const currentSong = currentPlaylist[currentIndex];

        if (isShuffle) {
            currentPlaylist = [...originalPlaylist].sort(() => Math.random() - 0.5);
            // Cari posisi lagu yang sedang diputar di playlist yang sudah diacak
            currentIndex = currentPlaylist.findIndex(song => song.videoId === currentSong.videoId);
        } else {
            currentPlaylist = [...originalPlaylist];
            // Kembalikan ke posisi semula
            currentIndex = currentPlaylist.findIndex(song => song.videoId === currentSong.videoId);
        }
        updateShuffleIcons();
    }

    function toggleRepeat() {
        handleFirstUserInteraction();
        
        if (repeatMode === 'none') repeatMode = 'all';
        else if (repeatMode === 'all') repeatMode = 'one';
        else repeatMode = 'none';
        updateRepeatIcons();
    }

    function updateShuffleIcons() {
        const shuffleButtons = [document.getElementById('shuffle-button'), shuffleButtonMobile];
        shuffleButtons.forEach(btn => {
            if (btn) {
                btn.classList.toggle('active', isShuffle);
            }
        });
    }

    function updateRepeatIcons() {
        const repeatButtons = [document.getElementById('repeat-button'), repeatButtonMobile];
        repeatButtons.forEach(btn => {
            if (btn) {
                const icon = btn.querySelector('i');
                if (icon) {
                    btn.classList.remove('active', 'repeat-one');
                    icon.classList.remove('fa-redo', 'fa-1');

                    if (repeatMode === 'all') {
                        btn.classList.add('active');
                        icon.classList.add('fa-redo');
                    } else if (repeatMode === 'one') {
                        btn.classList.add('active', 'repeat-one');
                        icon.classList.add('fa-1'); // Menggunakan ikon angka 1 dari Font Awesome
                    } else {
                        icon.classList.add('fa-redo');
                    }
                }
            }
        });
    }

    // === 12. VOLUME CONTROL (TAMBAHAN UNTUK SAFARI/IOS) ===
    function addVolumeControl() {
        const volumeBar = document.getElementById('volume-bar');
        if (volumeBar) {
            volumeBar.addEventListener('input', (e) => {
                if (player && typeof player.setVolume === 'function') {
                    try {
                        const volume = parseInt(e.target.value);
                        player.setVolume(volume);
                        
                        // Update volume icon
                        const volumeIcon = document.getElementById('volume-icon');
                        if (volumeIcon) {
                            volumeIcon.classList.remove('fa-volume-off', 'fa-volume-low', 'fa-volume-high');
                            if (volume === 0) {
                                volumeIcon.classList.add('fa-volume-off');
                            } else if (volume < 50) {
                                volumeIcon.classList.add('fa-volume-low');
                            } else {
                                volumeIcon.classList.add('fa-volume-high');
                            }
                        }
                    } catch (e) {
                        console.log('Error setting volume:', e);
                    }
                }
            });
        }
        
        // Volume icon click to mute/unmute
        const volumeIcon = document.getElementById('volume-icon');
        if (volumeIcon) {
            volumeIcon.addEventListener('click', () => {
                if (player) {
                    try {
                        if (player.isMuted()) {
                            player.unMute();
                            if (volumeBar) volumeBar.value = 80;
                        } else {
                            player.mute();
                            if (volumeBar) volumeBar.value = 0;
                        }
                    } catch (e) {
                        console.log('Error muting/unmuting:', e);
                    }
                }
            });
        }
    }

    // === 13. SAFARI/IOS SPECIFIC FIXES ===
    
    // Handle page visibility changes (important for Safari/iOS)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            // Page is hidden, pause if playing
            if (isPlaying && player && typeof player.pauseVideo === 'function') {
                try {
                    player.pauseVideo();
                } catch (e) {
                    console.log('Error pausing on visibility change:', e);
                }
            }
        }
    });

    // Handle orientation changes on mobile
    window.addEventListener('orientationchange', () => {
        setTimeout(() => {
            // Force a UI update after orientation change
            updateProgress();
        }, 500);
    });

    // Prevent double-tap zoom on iOS
    if (isIOS) {
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length > 1) {
                e.preventDefault();
            }
        }, { passive: false });

        let lastTouchEnd = 0;
        document.addEventListener('touchend', (e) => {
            const now = (new Date()).getTime();
            if (now - lastTouchEnd <= 300) {
                e.preventDefault();
            }
            lastTouchEnd = now;
        }, false);
    }

    // === 14. INISIALISASI APLIKASI ===
    initializeTheme();
    
    // Add volume control listeners after DOM is ready
    setTimeout(() => {
        addVolumeControl();
    }, 1000);

    // Debug log for Safari/iOS
    console.log('App initialized');
    console.log('Is Safari:', isSafari);
    console.log('Is iOS:', isIOS);
    console.log('Is Mobile:', isMobileDevice);
    
    // Show helpful message for Safari/iOS users
    if (isSafari || isIOS) {
        console.log('Safari/iOS detected - autoplay requires user interaction first');
    }
});