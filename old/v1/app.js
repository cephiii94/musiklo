document.addEventListener('DOMContentLoaded', () => {

    // === 1. SELEKSI ELEMEN DOM (LENGKAP) ===
    // Main & Koleksi
    const songListContainer = document.getElementById('song-list-container');
    const koleksiLaguContainer = document.getElementById('koleksi-lagu-container');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const topChartsTitle = document.querySelector('.playlist-section h2');
    const logoLink = document.getElementById('logo-link');
    const showAllButton = document.getElementById('show-all-button');
    const hideButton = document.getElementById('hide-button');
    
    // Mini Player (Footer)
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

    // Expanded Player (Desktop)
    const expandedPlayer = document.getElementById('expanded-player');
    const closeExpandedPlayer = document.getElementById('close-expanded-player');
    const expandedPlayerArt = document.getElementById('expanded-player-art');
    const expandedPlayerTitle = document.getElementById('expanded-player-title');
    const expandedPlayerArtist = document.getElementById('expanded-player-artist');
    const expandedProgressBar = document.getElementById('expanded-progress-bar');
    const expandedCurrentTime = document.getElementById('expanded-current-time');
    const expandedDuration = document.getElementById('expanded-duration');
    const expandedPrevBtn = document.getElementById('expanded-prev-btn');
    const expandedPlayPauseBtn = document.getElementById('expanded-play-pause-btn');
    const expandedPlayPauseIcon = document.getElementById('expanded-play-pause-icon');
    const expandedNextBtn = document.getElementById('expanded-next-btn');
    const expandedVolumeBtn = document.getElementById('expanded-volume-btn');
    const expandedVolumeIcon = document.getElementById('expanded-volume-icon');
    const expandedVolumeBar = document.getElementById('expanded-volume-bar');

    // Modal Playlist & Lirik
    const playlistModalBtn = document.getElementById('playlist-modal-btn');
    const lyricsModalBtn = document.getElementById('lyrics-modal-btn');
    const playlistModal = document.getElementById('playlist-modal');
    const lyricsModal = document.getElementById('lyrics-modal');
    const closePlaylistModal = document.getElementById('close-playlist-modal');
    const closeLyricsModal = document.getElementById('close-lyrics-modal');
    const playlistModalList = document.getElementById('playlist-modal-list');


    // === 2. STATE APLIKASI ===
    let player;
    let currentPlaylist = [];
    let koleksiPlaylist = [];
    let topChartsPlaylist = []; // Tambahkan ini
    let currentIndex = -1;
    let isPlaying = false;
    let progressInterval;
    let isTopChartsView = true;
    let lastVolume = 80;


    // === 3. INISIALISASI YOUTUBE PLAYER ===
    window.onYouTubeIframeAPIReady = function() { player = new YT.Player('youtube-player', { height: '0', width: '0', events: { 'onReady': onPlayerReady, 'onStateChange': onPlayerStateChange } }); };
    
    function onPlayerReady(event) {
        const initialVolume = volumeBar.value;
        player.setVolume(initialVolume);
        lastVolume = initialVolume;
        updateVolumeIcon(initialVolume);
        console.log("YouTube Player siap.");
    }

    function onPlayerStateChange(event) {
        isPlaying = (event.data === YT.PlayerState.PLAYING);
        if (isPlaying) {
            startProgressUpdater();
            renderPlaylistQueue();
        } else {
            clearInterval(progressInterval);
        }
        syncPlayerState();
        if (event.data === YT.PlayerState.ENDED) { playNext(); }
    }


    // === 4. FUNGSI-FUNGSI PEMBANTU & SINKRONISASI ===
    function decodeHtml(html) { const txt = document.createElement("textarea"); txt.innerHTML = html; return txt.value; }
    function formatTime(seconds) { const min = Math.floor(seconds / 60); const sec = Math.floor(seconds % 60).toString().padStart(2, '0'); return `${min}:${sec}`; }

    function updateVolumeIcon(volume) {
        const icons = [volumeIcon, expandedVolumeIcon];
        icons.forEach(icon => {
            if (!icon) return;
            icon.classList.remove('fa-volume-high', 'fa-volume-low', 'fa-volume-xmark');
            if (volume == 0) { icon.classList.add('fa-volume-xmark'); } 
            else if (volume <= 50) { icon.classList.add('fa-volume-low'); } 
            else { icon.classList.add('fa-volume-high'); }
        });
    }

    function syncPlayerState() {
        if (!player || typeof player.getDuration !== 'function') return;
        const duration = player.getDuration();
        const currentTime = player.getCurrentTime();
        const progress = (currentTime / duration) * 100;
        
        // Sinkronisasi ikon play/pause
        [playPauseIcon, expandedPlayPauseIcon].forEach(icon => {
            if (!icon) return;
            icon.classList.remove('fa-play', 'fa-pause');
            icon.classList.add(isPlaying ? 'fa-pause' : 'fa-play');
        });

        // Sinkronisasi progress bar & waktu
        if(duration > 0) {
            progressBar.value = progress;
            expandedProgressBar.value = progress;
            expandedCurrentTime.textContent = formatTime(currentTime);
            expandedDuration.textContent = formatTime(duration);
        }
    }


    // === 5. MEMUAT, MERENDER, DAN LOGIKA PEMUTARAN ===
    async function loadInitialPlaylist() {
        try {
            const response = await fetch('/.netlify/functions/topcharts');
            if (!response.ok) throw new Error('Gagal memuat Top Charts!');
            const songs = await response.json();
            topChartsPlaylist = songs; // Simpan playlist Top Charts
            currentPlaylist = songs;
            isTopChartsView = true;
            renderPlaylist(currentPlaylist);
        } catch (error) {
            console.error(error);
            songListContainer.innerHTML = '<p>Gagal memuat lagu. Coba refresh halaman.</p>';
        }
    }

    function renderPlaylist(playlist) {
        songListContainer.innerHTML = '';
        if (!playlist || playlist.length === 0) {
            songListContainer.innerHTML = '<p>Tidak ada hasil yang ditemukan.</p>';
            return;
        }
        playlist.forEach((song, index) => {
            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            songItem.dataset.index = index;
            songItem.dataset.videoId = song.videoId;
            if (isTopChartsView && index >= 5) {
                songItem.classList.add('hidden');
            }
            songItem.innerHTML = `<img src="${song.thumbnailUrl}" alt="${decodeHtml(song.title)}"><p class="title" title="${decodeHtml(song.title)}">${decodeHtml(song.title)}</p><p class="artist">${decodeHtml(song.artist)}</p>`;
            songListContainer.appendChild(songItem);
        });
        if (isTopChartsView && playlist.length > 5) {
            showAllButton.classList.remove('hidden');
            hideButton.classList.add('hidden');
        } else {
            showAllButton.classList.add('hidden');
            hideButton.classList.add('hidden');
        }
        if(currentIndex !== -1) {
            updatePlayerUI(currentPlaylist[currentIndex]);
        }
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
            return;
        }
        playlist.forEach((song, index) => {
            const songItem = document.createElement('div');
            songItem.className = 'song-item';
            songItem.dataset.index = index;
            songItem.dataset.videoId = song.videoId;
            songItem.innerHTML = `<img src="${song.thumbnailUrl}" alt="${decodeHtml(song.title)}"><p class="title" title="${decodeHtml(song.title)}">${decodeHtml(song.title)}</p><p class="artist">${decodeHtml(song.artist)}</p>`;
            koleksiLaguContainer.appendChild(songItem);
        });
    }

    function playSong(index, playlist) {
        // Selalu set currentPlaylist ke playlist yang dipilih
        currentPlaylist = playlist;
        // Set currentIndex ke index yang dipilih
        currentIndex = index;
        if (index >= 0 && index < currentPlaylist.length) {
            const song = currentPlaylist[currentIndex];
            if (player && typeof player.loadVideoById === 'function') {
                player.loadVideoById(song.videoId);
                updatePlayerUI(song);
            } else {
                setTimeout(() => playSong(index, playlist), 500);
            }
        }
    }

    function playNext() {
        if (currentPlaylist.length === 0) return;
        const nextIndex = (currentIndex + 1) % currentPlaylist.length;
        playSong(nextIndex, currentPlaylist);
    }

    function playPrev() {
        if (currentPlaylist.length === 0) return;
        const prevIndex = (currentIndex - 1 + currentPlaylist.length) % currentPlaylist.length;
        playSong(prevIndex, currentPlaylist);
    }

    function togglePlayPause() {
        if (!player || typeof player.playVideo !== 'function' || currentIndex === -1) return;
        if (isPlaying) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    }

    function updatePlayerUI(song) {
        const title = decodeHtml(song.title);
        const artist = decodeHtml(song.artist);
        currentTrackArt.src = song.thumbnailUrl;
        currentTrackTitle.textContent = title;
        currentTrackArtist.textContent = artist;
        expandedPlayerArt.src = song.thumbnailUrl;
        expandedPlayerTitle.textContent = title;
        expandedPlayerArtist.textContent = artist;
        document.querySelectorAll('.song-item').forEach(item => item.classList.remove('active-song'));
        const activeSongElement = document.querySelector(`.song-item[data-video-id='${song.videoId}']`);
        if (activeSongElement) {
            activeSongElement.classList.add('active-song');
        }
        renderPlaylistQueue();
    }

    function startProgressUpdater() {
        clearInterval(progressInterval);
        progressInterval = setInterval(syncPlayerState, 1000);
    }

    function renderPlaylistQueue() {
        if (!playlistModalList) return;
        playlistModalList.innerHTML = '';
        if (currentIndex === -1) return;
        
        const upcomingSongs = currentPlaylist.slice(currentIndex);
        upcomingSongs.forEach((song, i) => {
            const li = document.createElement('li');
            const absoluteIndex = currentIndex + i;
            li.dataset.index = absoluteIndex;
            if (i === 0) li.classList.add('active-in-queue');
            li.innerHTML = `<img src="${song.thumbnailUrl}" alt=""><div><p class="title">${decodeHtml(song.title)}</p><p class="artist">${decodeHtml(song.artist)}</p></div>`;
            li.addEventListener('click', () => {
                playSong(absoluteIndex, currentPlaylist);
                playlistModal.classList.add('hidden');
            });
            playlistModalList.appendChild(li);
        });
    }


    // === 6. FUNGSI PENCARIAN & NAVIGASI ===
    async function handleSearch() {
        const query = searchInput.value.trim();
        if (!query) return;
        topChartsTitle.textContent = `Hasil Pencarian untuk "${query}"`;
        songListContainer.innerHTML = '<div class="loader"></div>';
        isTopChartsView = false;
        showAllButton.classList.add('hidden');
        hideButton.classList.add('hidden');
        try {
            const response = await fetch(`/.netlify/functions/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) throw new Error('Gagal melakukan pencarian.');
            const results = await response.json();
            currentPlaylist = results;
            renderPlaylist(results);
        } catch (error) {
            console.error(error);
            songListContainer.innerHTML = '<p>Terjadi kesalahan saat mencari. Coba lagi.</p>';
        }
    }

    function returnToHome() {
        topChartsTitle.textContent = 'Top Charts Hari Ini';
        searchInput.value = '';
        loadInitialPlaylist();
    }


    // === 7. EVENT LISTENERS ===
    songListContainer.addEventListener('click', (event) => {
        const songItem = event.target.closest('.song-item');
        if (songItem) {
            // Selalu gunakan topChartsPlaylist jika sedang di Top Charts
            const playlistToUse = isTopChartsView ? topChartsPlaylist : currentPlaylist;
            playSong(parseInt(songItem.dataset.index, 10), playlistToUse);
        }
    });
    koleksiLaguContainer.addEventListener('click', (event) => {
        const songItem = event.target.closest('.song-item');
        if (songItem) {
            playSong(parseInt(songItem.dataset.index, 10), koleksiPlaylist);
        }
    });

    // Kontrol Mini Player
    playPauseButton.addEventListener('click', togglePlayPause);
    nextButton.addEventListener('click', playNext);
    prevButton.addEventListener('click', playPrev);

    // Sinkronisasi Volume Bars
    function handleVolumeChange(value) {
        player.setVolume(value);
        updateVolumeIcon(value);
        if (value > 0) {
            lastVolume = value;
        }
        volumeBar.value = value;
        expandedVolumeBar.value = value;
    }
    volumeBar.addEventListener('input', (e) => handleVolumeChange(e.target.value));
    
    volumeIcon.addEventListener('click', () => {
        if (player.isMuted() || volumeBar.value == 0) {
            const volumeToSet = lastVolume > 0 ? lastVolume : 50;
            handleVolumeChange(volumeToSet);
            player.unMute();
        } else {
            lastVolume = volumeBar.value;
            handleVolumeChange(0);
            player.mute();
        }
    });

    // Sinkronisasi Progress Bars
    function handleProgressChange(value) {
        if (currentIndex === -1) return;
        const newTime = player.getDuration() * (value / 100);
        player.seekTo(newTime);
    }
    progressBar.addEventListener('input', (e) => handleProgressChange(e.target.value));
    
    // Listeners Lainnya
    searchButton.addEventListener('click', handleSearch);
    searchInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') handleSearch();
    });
    logoLink.addEventListener('click', (event) => {
        event.preventDefault();
        returnToHome();
    });
    showAllButton.addEventListener('click', () => {
        songListContainer.querySelectorAll('.song-item.hidden').forEach(item => {
            item.classList.remove('hidden');
        });
        showAllButton.classList.add('hidden');
        hideButton.classList.remove('hidden');
    });
    hideButton.addEventListener('click', () => {
        songListContainer.querySelectorAll('.song-item').forEach((item, index) => {
            if (index >= 5) {
                item.classList.add('hidden');
            }
        });
        hideButton.classList.add('hidden');
        showAllButton.classList.remove('hidden');
        topChartsTitle.scrollIntoView({
            behavior: 'smooth'
        });
    });

    // Expanded Player & Modal Listeners
    currentTrackArt.addEventListener('click', () => {
        // if (currentIndex !== -1) {
            expandedPlayer.classList.remove('hidden');
        // }
    });
    closeExpandedPlayer.addEventListener('click', () => {
        expandedPlayer.classList.add('hidden');
    });
    expandedPlayPauseBtn.addEventListener('click', togglePlayPause);
    expandedNextBtn.addEventListener('click', playNext);
    expandedPrevBtn.addEventListener('click', playPrev);
    expandedProgressBar.addEventListener('input', (e) => handleProgressChange(e.target.value));
    expandedVolumeBar.addEventListener('input', (e) => handleVolumeChange(e.target.value));

    playlistModalBtn.addEventListener('click', () => playlistModal.classList.remove('hidden'));
    closePlaylistModal.addEventListener('click', () => playlistModal.classList.add('hidden'));
    lyricsModalBtn.addEventListener('click', () => lyricsModal.classList.remove('hidden'));
    closeLyricsModal.addEventListener('click', () => lyricsModal.classList.add('hidden'));


    // === 8. INISIALISASI APLIKASI ===
    loadInitialPlaylist();
    loadKoleksiPlaylist();
});