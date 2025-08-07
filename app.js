document.addEventListener('DOMContentLoaded', () => {

    // === 1. SELEKSI ELEMEN DOM ===
    const songListContainer = document.getElementById('song-list-container');
    const koleksiLaguContainer = document.getElementById('koleksi-lagu-container');
    const playPauseButton = document.getElementById('play-pause-button');
    const nextButton = document.getElementById('next-button');
    const prevButton = document.getElementById('prev-button');
    const currentTrackArt = document.getElementById('current-track-art');
    const currentTrackTitle = document.getElementById('current-track-title');
    const currentTrackArtist = document.getElementById('current-track-artist');
    const progressBar = document.getElementById('progress-bar');
    const volumeBar = document.getElementById('volume-bar');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const topChartsTitle = document.querySelector('.playlist-section h2');
    const logoLink = document.getElementById('logo-link');
    const showAllButton = document.getElementById('show-all-button');
    const showAllContainer = document.querySelector('.show-all-container');
    const hideButton = document.getElementById('hide-button');
    const expandedPlayer = document.getElementById('expanded-player');
    const closeExpandedPlayer = document.getElementById('close-expanded-player');
    const expandedPlayerArt = document.getElementById('expanded-player-art');
    const expandedPlayerTitle = document.getElementById('expanded-player-title');
    const expandedPlayerArtist = document.getElementById('expanded-player-artist');


    // === 2. STATE APLIKASI ===
    let player;
    let currentPlaylist = [];
    let koleksiPlaylist = [];
    let currentIndex = -1;
    let isPlaying = false;
    let progressInterval;
    let isTopChartsView = true;

    // === 3. INISIALISASI YOUTUBE PLAYER ===
    window.onYouTubeIframeAPIReady = function() { player = new YT.Player('youtube-player', { height: '0', width: '0', events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange } }); };
    function onPlayerReady(event) { player.setVolume(volumeBar.value); console.log("YouTube Player siap."); }
    function onPlayerStateChange(event) { if (event.data === YT.PlayerState.PLAYING) { isPlaying = true; playPauseButton.textContent = '⏸️'; startProgressUpdater(); } else { isPlaying = false; playPauseButton.textContent = '▶️'; clearInterval(progressInterval); } if (event.data === YT.PlayerState.ENDED) { playNext(); } }

    // === 4. MEMUAT DAN MENAMPILKAN LAGU ===
    async function loadInitialPlaylist() { try { const response = await fetch('/.netlify/functions/topcharts'); if (!response.ok) throw new Error('Gagal memuat Top Charts!'); const songs = await response.json(); currentPlaylist = songs; isTopChartsView = true; renderPlaylist(currentPlaylist); } catch (error) { console.error(error); songListContainer.innerHTML = '<p>Gagal memuat lagu. Coba refresh halaman.</p>'; } }
    function renderPlaylist(playlist) {
        songListContainer.innerHTML = '';
        if (playlist.length === 0) { songListContainer.innerHTML = '<p>Tidak ada hasil yang ditemukan.</p>'; showAllContainer.classList.add('hidden'); return; }
        playlist.forEach((song, index) => {
            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            songItem.dataset.index = index;
            songItem.dataset.videoId = song.videoId;
            if (isTopChartsView && index >= 5) { songItem.classList.add('hidden'); }
            const cleanTitle = document.createElement('textarea');
            cleanTitle.innerHTML = song.title;
            songItem.innerHTML = `
                <img src="${song.thumbnailUrl}" alt="${cleanTitle.value}">
                <p class="title">${cleanTitle.value}</p>
                <p class="artist">${song.artist}</p>
            `;
            songListContainer.appendChild(songItem);
        });
        if (isTopChartsView && playlist.length > 5) { showAllContainer.classList.remove('hidden'); showAllButton.classList.remove('hidden'); hideButton.classList.add('hidden'); }
        else { showAllContainer.classList.add('hidden'); }
    }
    
    async function loadKoleksiPlaylist() {
        try {
            const response = await fetch('/.netlify/functions/koleksi');
            if (!response.ok) throw new Error('Gagal memuat koleksi lagu!');
            const songs = await response.json();
            koleksiPlaylist = songs;
            renderKoleksi(koleksiPlaylist);
        } catch (error) {
            console.error(error);
            koleksiLaguContainer.innerHTML = '<p>Gagal memuat koleksi lagu.</p>';
        }
    }

    function renderKoleksi(playlist) {
        koleksiLaguContainer.innerHTML = '';
        if (playlist.length === 0) {
            koleksiLaguContainer.innerHTML = '<p>Koleksi kosong.</p>';
            return;
        }
        playlist.forEach((song, index) => {
            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            songItem.dataset.playlist = 'koleksi'; 
            songItem.dataset.index = index;
            songItem.dataset.videoId = song.videoId;
            
            const cleanTitle = document.createElement('textarea');
            cleanTitle.innerHTML = song.title;

            songItem.innerHTML = `
                <img src="${song.thumbnailUrl}" alt="${cleanTitle.value}">
                <p class="title">${cleanTitle.value}</p>
                <p class="artist">${song.artist}</p>
            `;
            koleksiLaguContainer.appendChild(songItem);
        });
    }

    // === 5. LOGIKA PEMUTARAN ===
    function playSong(index) { if (index >= 0 && index < currentPlaylist.length) { currentIndex = index; const song = currentPlaylist[currentIndex]; if (player && typeof player.loadVideoById === 'function') { player.loadVideoById(song.videoId); updatePlayerUI(song); } else { setTimeout(() => playSong(index), 500); } } }
    function playNext() { const nextIndex = (currentIndex + 1) % currentPlaylist.length; playSong(nextIndex); }
    function playPrev() { const prevIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length; playSong(prevIndex); }
    function togglePlayPause() { if (isPlaying) player.pauseVideo(); else player.playVideo(); }
    function updatePlayerUI(song) { currentTrackArt.src = song.thumbnailUrl; currentTrackTitle.textContent = song.title; currentTrackArtist.textContent = song.artist; }
    
    // === 6. UPDATE PROGRESS & VOLUME ===
    function startProgressUpdater() { clearInterval(progressInterval); progressInterval = setInterval(() => { const progress = (player.getCurrentTime() / player.getDuration()) * 100; progressBar.value = progress || 0; }, 1000); }

    // === 7. FUNGSI PENCARIAN & KEMBALI KE HOME ===
    async function handleSearch() { const query = searchInput.value.trim(); if (!query) return; topChartsTitle.textContent = `Hasil Pencarian untuk "${query}"`; songListContainer.innerHTML = '<p>Mencari...</p>'; isTopChartsView = false; showAllContainer.classList.add('hidden'); try { const response = await fetch(`/.netlify/functions/search?q=${encodeURIComponent(query)}`); if (!response.ok) throw new Error('Gagal melakukan pencarian.'); const results = await response.json(); currentPlaylist = results; renderPlaylist(currentPlaylist); } catch (error) { console.error(error); songListContainer.innerHTML = '<p>Terjadi kesalahan saat mencari. Coba lagi.</p>'; } }
    function returnToHome() { topChartsTitle.textContent = 'Top Charts Hari Ini'; searchInput.value = ''; loadInitialPlaylist(); }

    // === 8. EVENT LISTENERS ===
    songListContainer.addEventListener('click', (event) => {
        const songItem = event.target.closest('.song-item');
        if (songItem) {
            // Saat lagu dari Top Charts atau hasil pencarian diklik,
            // pastikan currentPlaylist adalah yang dari API.
            // (Ini sudah diatur oleh loadInitialPlaylist dan handleSearch)
            const index = parseInt(songItem.dataset.index, 10);
            playSong(index);
        }
    });

    koleksiLaguContainer.addEventListener('click', (event) => {
        const songItem = event.target.closest('.song-item');
        if (songItem) {
            // Saat lagu dari koleksi diklik, ganti currentPlaylist ke koleksi
            currentPlaylist = koleksiPlaylist; 
            const index = parseInt(songItem.dataset.index, 10);
            playSong(index);
        }
    });

    playPauseButton.addEventListener('click', togglePlayPause);
    nextButton.addEventListener('click', playNext);
    prevButton.addEventListener('click', playPrev);
    volumeBar.addEventListener('input', (event) => player.setVolume(event.target.value));
    progressBar.addEventListener('input', (event) => { const newTime = player.getDuration() * (event.target.value / 100); player.seekTo(newTime); });
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keyup', (event) => { if (event.key === 'Enter') handleSearch(); });
    logoLink.addEventListener('click', (event) => { event.preventDefault(); returnToHome(); });
    showAllButton.addEventListener('click', () => { songListContainer.querySelectorAll('.song-item.hidden').forEach(item => { item.classList.remove('hidden'); }); showAllButton.classList.add('hidden'); hideButton.classList.remove('hidden'); });
    hideButton.addEventListener('click', () => { songListContainer.querySelectorAll('.song-item').forEach((item, index) => { if (index >= 5) { item.classList.add('hidden'); } }); hideButton.classList.add('hidden'); showAllButton.classList.remove('hidden'); topChartsTitle.scrollIntoView({ behavior: 'smooth' }); });

    currentTrackArt.addEventListener('click', () => {
        if (currentIndex !== -1) {
            const song = currentPlaylist[currentIndex];
            expandedPlayerArt.src = song.thumbnailUrl;
            expandedPlayerTitle.textContent = song.title;
            expandedPlayerArtist.textContent = song.artist;
            expandedPlayer.classList.remove('hidden');
        }
    });

    closeExpandedPlayer.addEventListener('click', () => {
        expandedPlayer.classList.add('hidden');
    });

    // === INISIALISASI APLIKASI ===
    loadInitialPlaylist();
    loadKoleksiPlaylist();
});