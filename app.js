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
    
    // Sidebar Kanan
    const nowPlayingCardArt = document.getElementById('now-playing-card-art');
    const nowPlayingCardTitle = document.getElementById('now-playing-card-title');
    const nowPlayingCardArtist = document.getElementById('now-playing-card-artist');

    // === 2. STATE APLIKASI ===
    let player;
    let topChartsPlaylist = [];
    let koleksiPlaylist = [];
    let currentPlaylist = [];
    let activePlaylistSource = null;
    let currentIndex = -1;
    let isPlaying = false;
    let progressInterval;
    let lastVolume = 80;

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
        const initialVolume = 80;
        player.setVolume(initialVolume);
        lastVolume = initialVolume;
        updateVolumeIcon(initialVolume);
    }
    function onPlayerStateChange(event) {
        isPlaying = (event.data === YT.PlayerState.PLAYING);
        if (isPlaying) startProgressUpdater();
        else clearInterval(progressInterval);
        updatePlayPauseIcons();
        if (event.data === YT.PlayerState.ENDED) playNext();
    }

    // === 5. FUNGSI-FUNGSI UI & SINKRONISASI ===
    const decodeHtml = (html) => { const txt = document.createElement("textarea"); txt.innerHTML = html; return txt.value; };
    const formatTime = (seconds) => { const min = Math.floor(seconds / 60); const sec = Math.floor(seconds % 60).toString().padStart(2, '0'); return `${min}:${sec}`; };
    
    function updateVolumeIcon(volume) {
        const volIconDesktop = document.getElementById('volume-icon');
        if(volIconDesktop) {
            volIconDesktop.classList.remove('fa-volume-high', 'fa-volume-low', 'fa-volume-xmark');
            if (volume == 0) volIconDesktop.classList.add('fa-volume-xmark');
            else if (volume <= 50) volIconDesktop.classList.add('fa-volume-low');
            else volIconDesktop.classList.add('fa-volume-high');
        }
    }
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
        const progress = (duration > 0) ? (currentTime / duration) * 100 : 0;
        
        const progressBarDesktop = document.getElementById('progress-bar');
        const currentTimeDesktop = document.getElementById('current-time-display');
        const totalTimeDesktop = document.getElementById('total-time-display');

        if(progressBarDesktop) progressBarDesktop.value = progress;
        if(currentTimeDesktop) currentTimeDesktop.textContent = formatTime(currentTime);
        if(totalTimeDesktop) totalTimeDesktop.textContent = formatTime(duration);
    }
    function updatePlayerUI(song) {
        if (!song) return;
        const title = decodeHtml(song.title);
        const artist = decodeHtml(song.artist);

        // Update player mobile
        currentTrackArtMobile.src = song.thumbnailUrl;
        currentTrackTitleMobile.textContent = title;
        currentTrackArtistMobile.textContent = artist;
        
        // Update player desktop (jika ada)
        const artDesktop = document.getElementById('current-track-art');
        const titleDesktop = document.getElementById('current-track-title');
        const artistDesktop = document.getElementById('current-track-artist');
        if(artDesktop) artDesktop.src = song.thumbnailUrl;
        if(titleDesktop) titleDesktop.textContent = title;
        if(artistDesktop) artistDesktop.textContent = artist;

        // Update sidebar
        nowPlayingCardArt.src = song.thumbnailUrl;
        nowPlayingCardTitle.textContent = title;
        nowPlayingCardArtist.textContent = artist;

        // Update highlight lagu
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
                    <div class="playlist-header"><h2>Top Charts</h2></div>
                    <div id="top-charts-container-desktop" class="song-grid"></div>
                    <div id="top-charts-controls-desktop" class="show-all-container"></div>
                </section>
                <section id="koleksi-section" class="playlist-section-desktop">
                    <div class="playlist-header"><h2>Koleksi Lokal</h2></div>
                    <div id="koleksi-container-desktop" class="song-grid"></div>
                </section>
            </div>`;
        mainContentMobile.innerHTML = `
            <section class="playlist-section-mobile">
                <h2>Top Charts</h2>
                <div id="top-charts-container-mobile" class="song-grid"></div>
                <div id="top-charts-controls-mobile" class="show-all-container"></div>
            </section>
            <section class="playlist-section-mobile">
                <h2>Koleksi Lokal</h2>
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
                <div class="player-controls">
                    <button id="shuffle-button" title="Acak"><i class="fas fa-random"></i></button>
                    <button id="prev-button" title="Sebelumnya"><i class="fas fa-step-backward"></i></button>
                    <button id="play-pause-button" title="Mainkan/Jeda"><i id="play-pause-icon" class="fas fa-play-circle"></i></button>
                    <button id="next-button" title="Berikutnya"><i class="fas fa-step-forward"></i></button>
                    <button id="repeat-button" title="Ulangi"><i class="fas fa-redo"></i></button>
                </div>
                <div class="progress-volume-controls">
                    <span id="current-time-display">0:00</span>
                    <input type="range" id="progress-bar" value="0" step="1">
                    <span id="total-time-display">0:00</span>
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
        activePlaylistSource = playlistSource;
        if (playlistSource === 'topcharts') currentPlaylist = topChartsPlaylist;
        else if (playlistSource === 'koleksi') currentPlaylist = koleksiPlaylist;
        else if (playlistSource === 'search') { /* currentPlaylist sudah di set saat search */ }
        
        if (index >= 0 && index < currentPlaylist.length) {
            currentIndex = index;
            const song = currentPlaylist[currentIndex];
            if (player && typeof player.loadVideoById === 'function') {
                player.loadVideoById(song.videoId);
                updatePlayerUI(song);
            }
        }
    }

    const playNext = () => { if (currentPlaylist.length === 0) return; const nextIndex = (currentIndex + 1) % currentPlaylist.length; playSong(nextIndex, activePlaylistSource); };
    const playPrev = () => { if (currentPlaylist.length === 0) return; const prevIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length; playSong(prevIndex, activePlaylistSource); };
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
        document.getElementById('play-pause-button')?.addEventListener('click', togglePlayPause);
        document.getElementById('next-button')?.addEventListener('click', playNext);
        document.getElementById('prev-button')?.addEventListener('click', playPrev);
        document.getElementById('volume-bar')?.addEventListener('input', (e) => {
            if(player && typeof player.setVolume === 'function') {
                player.setVolume(e.target.value);
                updateVolumeIcon(e.target.value);
            }
        });
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
            return; // Hentikan eksekusi lebih lanjut
        }

        // --- LOGIKA BARU UNTUK SHOW/HIDE ---
        const showButton = event.target.closest('.show-all-button');
        const hideButton = event.target.closest('.hide-button');

        if (showButton) {
            const controlsContainer = showButton.parentElement;
            const songContainer = controlsContainer.previousElementSibling;
            
            songContainer.querySelectorAll('.song-item-grid.hidden').forEach(el => el.classList.remove('hidden'));
            controlsContainer.querySelector('.show-all-button').classList.add('hidden');
            controlsContainer.querySelector('.hide-button').classList.remove('hidden');
        }

        if (hideButton) {
            const controlsContainer = hideButton.parentElement;
            const songContainer = controlsContainer.previousElementSibling;
            const sectionContainer = controlsContainer.parentElement;

            songContainer.querySelectorAll('.song-item-grid').forEach((el, index) => {
                if (index >= 5) {
                    el.classList.add('hidden');
                }
            });

            controlsContainer.querySelector('.hide-button').classList.add('hidden');
            controlsContainer.querySelector('.show-all-button').classList.remove('hidden');
            
            if(sectionContainer) {
                sectionContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }
    });


    playPauseButtonMobile.addEventListener('click', togglePlayPause);
    nextButtonMobile.addEventListener('click', playNext);
    prevButtonMobile.addEventListener('click', playPrev);
    
    const performSearch = (e) => { if (e.key === 'Enter') handleSearch(e.target.value.trim()); };
    searchInputDesktop.addEventListener('keyup', performSearch);
    searchInputMobile.addEventListener('keyup', performSearch);
    searchButtonMobile.addEventListener('click', () => handleSearch(searchInputMobile.value.trim()));
    logoLinkDesktop.addEventListener('click', (e) => { e.preventDefault(); returnToHome(); });
    logoLinkMobile.addEventListener('click', (e) => { e.preventDefault(); returnToHome(); });

    // === 10. INISIALISASI APLIKASI ===
    initializeTheme();
    loadInitialData();
});
