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
    
    const playPauseButton = document.getElementById('play-pause-button');
    const playPauseIcon = document.getElementById('play-pause-icon');
    const nextButton = document.getElementById('next-button');
    const prevButton = document.getElementById('prev-button');
    const currentTrackArt = document.getElementById('current-track-art');
    const currentTrackTitle = document.getElementById('current-track-title');
    const currentTrackArtist = document.getElementById('current-track-artist');
    const progressBar = document.getElementById('progress-bar');
    const volumeBar = document.getElementById('volume-bar');
    const volumeIcon = document.getElementById('volume-icon');
    const currentTimeDisplay = document.getElementById('current-time-display');
    const totalTimeDisplay = document.getElementById('total-time-display');
    
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
        if (savedTheme) {
            applyTheme(savedTheme);
        } else if (prefersDark) {
            applyTheme('dark-mode');
        } else {
            applyTheme('light-mode');
        }
    };

    // === 4. INISIALISASI YOUTUBE PLAYER ===
    window.onYouTubeIframeAPIReady = function() {
        player = new YT.Player('youtube-player', {
            height: '0',
            width: '0',
            events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange }
        });
    };
    function onPlayerReady(event) {
        const initialVolume = volumeBar.value;
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
        volumeIcon.classList.remove('fa-volume-high', 'fa-volume-low', 'fa-volume-xmark');
        if (volume == 0) volumeIcon.classList.add('fa-volume-xmark');
        else if (volume <= 50) volumeIcon.classList.add('fa-volume-low');
        else volumeIcon.classList.add('fa-volume-high');
    }
    function updatePlayPauseIcons() {
        playPauseIcon.classList.remove('fa-play-circle', 'fa-pause-circle');
        playPauseIcon.classList.add(isPlaying ? 'fa-pause-circle' : 'fa-play-circle');
    }
    function updateProgress() {
        if (!player || typeof player.getDuration !== 'function' || !isPlaying) return;
        const duration = player.getDuration();
        const currentTime = player.getCurrentTime();
        const progress = (duration > 0) ? (currentTime / duration) * 100 : 0;
        progressBar.value = progress;
        currentTimeDisplay.textContent = formatTime(currentTime);
        totalTimeDisplay.textContent = formatTime(duration);
    }
    function updatePlayerUI(song) {
        if (!song) return;
        const title = decodeHtml(song.title);
        const artist = decodeHtml(song.artist);
        currentTrackArt.src = song.thumbnailUrl;
        currentTrackTitle.textContent = title;
        currentTrackArtist.textContent = artist;
        nowPlayingCardArt.src = song.thumbnailUrl;
        nowPlayingCardTitle.textContent = title;
        nowPlayingCardArtist.textContent = artist;
        document.querySelectorAll('.song-item-grid, .song-list-item').forEach(item => {
            item.classList.remove('active-song');
        });
        document.querySelectorAll(`[data-video-id='${song.videoId}']`).forEach(el => el.classList.add('active-song'));
    }
    function startProgressUpdater() {
        clearInterval(progressInterval);
        progressInterval = setInterval(updateProgress, 1000);
    }

    // === 6. FUNGSI RENDER KONTEN ===
    function renderHomePage() {
        mainContent.innerHTML = `<section id="top-charts-section" class="playlist-section-desktop"><div class="playlist-header"><h2>Top Charts</h2></div><div id="top-charts-container-desktop" class="song-grid"></div><div id="top-charts-controls" class="show-all-container"></div></section><section id="koleksi-section" class="playlist-section-desktop"><div class="playlist-header"><h2>Koleksi Lokal</h2></div><div id="koleksi-container-desktop" class="song-grid"></div></section>`;
        mainContentMobile.innerHTML = `<section class="playlist-section-mobile"><h2>Top Charts</h2><div id="top-charts-container-mobile" class="song-grid"></div><div id="top-charts-controls-mobile" class="show-all-container"></div></section><section class="playlist-section-mobile"><h2>Koleksi Lokal</h2><div id="koleksi-container-mobile" class="song-grid"></div></section>`;
        renderTopCharts(topChartsPlaylist);
        renderKoleksi(koleksiPlaylist);
    }
    
    function renderGrid(playlist, playlistName) {
        let gridHTML = '';
        playlist.forEach((song, index) => {
            const hiddenClass = (playlistName === 'topcharts' && index >= 5) ? 'hidden' : '';
            gridHTML += `
                <div class="song-item-grid ${hiddenClass}" data-index="${index}" data-playlist="${playlistName}" data-video-id="${song.videoId}">
                    <img src="${song.thumbnailUrl}" alt="${decodeHtml(song.title)}">
                    <p class="title" title="${decodeHtml(song.title)}">${decodeHtml(song.title)}</p>
                    <p class="artist">${decodeHtml(song.artist)}</p>
                </div>`;
        });
        return gridHTML;
    }

    function renderTopCharts(playlist) {
        const containerDesktop = document.getElementById('top-charts-container-desktop');
        const containerMobile = document.getElementById('top-charts-container-mobile');
        const controlsDesktop = document.getElementById('top-charts-controls');
        const controlsMobile = document.getElementById('top-charts-controls-mobile');
        if (!containerDesktop || !containerMobile) return;
        
        const gridHTML = renderGrid(playlist, 'topcharts');
        containerDesktop.innerHTML = gridHTML;
        containerMobile.innerHTML = gridHTML;

        const controlsHTML = `<button id="show-all-button" class="${playlist.length > 5 ? '' : 'hidden'}">Lihat Semua</button><button id="hide-button" class="hidden">Sembunyikan</button>`;
        controlsDesktop.innerHTML = controlsHTML;
        controlsMobile.innerHTML = controlsHTML;
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
        const resultsHTML = `<section class="playlist-section-desktop"><div class="playlist-header"><h2>Hasil untuk "${query}"</h2></div><div class="song-grid">${gridHTML}</div></section>`;
        const resultsHTMLMobile = `<section class="playlist-section-mobile"><h2>Hasil untuk "${query}"</h2><div class="song-grid">${gridHTML}</div></section>`;
        mainContent.innerHTML = resultsHTML;
        mainContentMobile.innerHTML = resultsHTMLMobile;
    }

    // === 7. LOGIKA PEMUTARAN LAGU ===
    function playSong(index, playlistSource) {
        activePlaylistSource = playlistSource;
        if (playlistSource === 'topcharts') currentPlaylist = topChartsPlaylist;
        else if (playlistSource === 'koleksi') currentPlaylist = koleksiPlaylist;
        if (index >= 0 && index < currentPlaylist.length) {
            currentIndex = index;
            const song = currentPlaylist[currentIndex];
            if (player && typeof player.loadVideoById === 'function') {
                player.loadVideoById(song.videoId);
                updatePlayerUI(song);
            } else {
                setTimeout(() => playSong(index, playlistSource), 500);
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
    themeToggleButtonMobile.addEventListener('click', toggleTheme);
    themeToggleButtonDesktop.addEventListener('click', toggleTheme);

    document.body.addEventListener('click', (event) => {
        const songItem = event.target.closest('.song-item-grid');
        if (songItem) {
            const index = parseInt(songItem.dataset.index, 10);
            const playlistSource = songItem.dataset.playlist;
            playSong(index, playlistSource);
        }

        if (event.target.matches('#show-all-button')) {
            document.querySelectorAll('[data-playlist="topcharts"].hidden').forEach(el => el.classList.remove('hidden'));
            document.querySelectorAll('#show-all-button').forEach(btn => btn.classList.add('hidden'));
            document.querySelectorAll('#hide-button').forEach(btn => btn.classList.remove('hidden'));
        }
        if (event.target.matches('#hide-button')) {
            document.querySelectorAll('[data-playlist="topcharts"]').forEach((el, index) => {
                // Perbaikan di sini: Gunakan index dari elemen yang diiterasi
                if(index >= 5) {
                    el.classList.add('hidden');
                }
            });
            document.querySelectorAll('#hide-button').forEach(btn => btn.classList.add('hidden'));
            document.querySelectorAll('#show-all-button').forEach(btn => btn.classList.remove('hidden'));
            
            // Scroll ke atas section Top Charts
            const topChartsSection = document.getElementById('top-charts-section') || document.querySelector('.main-content-mobile section:first-child');
            if(topChartsSection) {
                topChartsSection.scrollIntoView({ behavior: 'smooth' });
            }
        }
    });

    playPauseButton.addEventListener('click', togglePlayPause);
    nextButton.addEventListener('click', playNext);
    prevButton.addEventListener('click', playPrev);
    volumeBar.addEventListener('input', (e) => {
        if(player && typeof player.setVolume === 'function') {
            player.setVolume(e.target.value);
            updateVolumeIcon(e.target.value);
        }
    });
    progressBar.addEventListener('input', (e) => {
        if(currentIndex !== -1 && player && typeof player.seekTo === 'function') {
            player.seekTo(player.getDuration() * (e.target.value / 100));
        }
    });
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
