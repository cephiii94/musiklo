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

    // === 4. INISIALISASI YOUTUBE PLAYER ===
    window.onYouTubeIframeAPIReady = function() {
        player = new YT.Player('youtube-player', {
            height: '0', width: '0',
            events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange }
        });
    };
    function onPlayerReady(event) {
        player.setVolume(80);
        loadInitialData();
    }
    function onPlayerStateChange(event) {
        isPlaying = (event.data === YT.PlayerState.PLAYING);
        if (isPlaying) startProgressUpdater();
        else clearInterval(progressInterval);
        updatePlayPauseIcons();
        if (event.data === YT.PlayerState.ENDED) {
            if (repeatMode === 'one') {
                player.seekTo(0);
                player.playVideo();
            } else {
                playNext();
            }
        }
    }

    // === 5. FUNGSI-FUNGSI UI & SINKRONISASI ===
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
        currentTrackArtMobile.src = song.thumbnailUrl;
        currentTrackTitleMobile.textContent = title;
        currentTrackArtistMobile.textContent = artist;
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

    // === 6. FUNGSI RENDER KONTEN & PLAYER ===
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

    // === 7. LOGIKA PEMUTARAN LAGU ===
    function playSong(index, playlistSource) {
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
            if (player && typeof player.loadVideoById === 'function') {
                player.loadVideoById(song.videoId);
                // PERBAIKAN UNTUK iOS/SAFARI:
                // Perintahkan video untuk langsung berputar setelah di-load.
                // Ini penting karena iOS memerlukan aksi pengguna langsung untuk memulai playback.
                player.playVideo(); 
                updatePlayerUI(song);
                if (playerContainerMobile.classList.contains('hidden')) {
                    playerContainerMobile.classList.remove('hidden');
                }
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
    const togglePlayPause = () => { if (!player || typeof player.playVideo !== 'function' || currentIndex === -1) return; isPlaying ? player.pauseVideo() : player.playVideo(); };

    // === 8. FUNGSI PENCARIAN & MEMUAT DATA ===
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
    const returnToHome = () => { searchInputDesktop.value = ''; searchInputMobile.value = ''; loadInitialData(); };

    // === 9. EVENT LISTENERS ===
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
                player.seekTo(player.getDuration() * (e.target.value / 100));
            }
        });
    }

    themeToggleButtonMobile.addEventListener('click', toggleTheme);
    themeToggleButtonDesktop.addEventListener('click', toggleTheme);
    
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

    if (lyricsHeader && lyricsSection) {
        lyricsHeader.addEventListener('click', () => {
            lyricsSection.classList.toggle('active');
        });
    }

    playPauseButtonMobile.addEventListener('click', togglePlayPause);
    nextButtonMobile.addEventListener('click', playNext);
    prevButtonMobile.addEventListener('click', playPrev);
    progressBarMobile?.addEventListener('input', (e) => {
        if(currentIndex !== -1 && player && typeof player.seekTo === 'function') {
            player.seekTo(player.getDuration() * (e.target.value / 100));
        }
    });

    // FUNGSI SHUFFLE & REPEAT UNTUK MOBILE
    shuffleButtonMobile?.addEventListener('click', toggleShuffle);
    repeatButtonMobile?.addEventListener('click', toggleRepeat);
    
    const performSearch = (e) => { if (e.key === 'Enter') handleSearch(e.target.value.trim()); };
    searchInputDesktop.addEventListener('keyup', performSearch);
    searchInputMobile.addEventListener('keyup', performSearch);
    searchButtonMobile.addEventListener('click', () => handleSearch(searchInputMobile.value.trim()));
    logoLinkDesktop.addEventListener('click', (e) => { e.preventDefault(); returnToHome(); });
    logoLinkMobile.addEventListener('click', (e) => { e.preventDefault(); returnToHome(); });

    function handleMobileNav(e) {
        e.preventDefault();
        const target = e.target.closest('li');
        if (!target) return;
        const page = target.dataset.page;
        if (!page) return;
        mobileNav.querySelectorAll('li').forEach(item => item.classList.remove('active'));
        target.classList.add('active');
        switch (page) {
            case 'home': returnToHome(); break;
            case 'search': searchInputMobile.focus(); window.scrollTo({ top: 0, behavior: 'smooth' }); break;
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

    // === 10. FUNGSI LOGIKA PLAYER TAMBAHAN ===
    function toggleShuffle() {
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
        });
    }

    // === 11. INISIALISASI APLIKASI ===
    initializeTheme();
});
