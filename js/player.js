// js/player.js
import { decodeHtml } from './utils.js';

export class MusicPlayer {
    constructor(callbacks) {
        this.playlist = [];
        this.originalPlaylist = [];
        this.currentIndex = -1;
        this.isPlaying = false;
        this.isShuffle = false;
        this.repeatMode = 'none'; // 'none', 'all', 'one'
        
        // Callback untuk komunikasi ke UI
        this.onStateChange = callbacks.onStateChange || (() => {});
        this.onSongChange = callbacks.onSongChange || (() => {});
        
        // Safari/iOS Specific State
        this.userHasInteracted = false;
        this.playAfterLoad = false;
        this.playerReady = false;
        
        this.ytPlayer = null;
        this.volume = 80;
        
        this.initInteractionListeners();
    }

    // Mendeteksi interaksi pengguna (Penting untuk iOS!)
    initInteractionListeners() {
        ['click', 'touchstart', 'keydown'].forEach(event => {
            document.addEventListener(event, () => {
                if (!this.userHasInteracted) {
                    this.userHasInteracted = true;
                    // Unmute jika di iOS agar bisa play audio nanti
                    if (this.ytPlayer && this.playerReady) {
                        try { this.ytPlayer.unMute(); } catch(e){}
                    }
                }
            }, { once: true, passive: true });
        });
    }

    // Setup YouTube IFrame
initYTPlayer(elementId) {
        // 1. Definisikan fungsi global yang dicari YouTube
        window.onYouTubeIframeAPIReady = () => {
            this.createPlayer(elementId);
        };

        // 2. Cek apakah script YouTube sudah ada? Kalau belum, suntikkan sekarang.
        if (!window.YT) {
            const tag = document.createElement('script');
            tag.src = "https://www.youtube.com/iframe_api";
            const firstScriptTag = document.getElementsByTagName('script')[0];
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
            // Kalau script ternyata sudah ada (cache), langsung buat player
            this.createPlayer(elementId);
        }
    }

    // TAMBAHKAN method baru ini (pemisah logika pembuatan player):
    createPlayer(elementId) {
        this.ytPlayer = new YT.Player(elementId, {
            height: '100%', // Ubah jadi 100% biar ngikut wrapper
            width: '100%',
            playerVars: {
                'autoplay': 0,
                'controls': 0, 
                'disablekb': 1,
                'enablejsapi': 1, 
                'fs': 0, 
                'iv_load_policy': 3,
                'playsinline': 1, 
                'rel': 0, 
                'showinfo': 0,
                'origin': window.location.origin, // Penting agar tidak error CORS
                'host': 'https://www.youtube.com'
            },
            events: {
                'onReady': (e) => this.onPlayerReady(e),
                'onStateChange': (e) => this.onPlayerStateChange(e),
                'onError': (e) => console.error('YT Error:', e.data)
            }
        });
    }

    onPlayerReady(event) {
        this.playerReady = true;
        this.ytPlayer.setVolume(this.volume);
        console.log('Player Siap!');
    }

    onPlayerStateChange(event) {
        this.isPlaying = (event.data === YT.PlayerState.PLAYING);
        this.onStateChange(this.isPlaying); // Update Icon UI

        // Logika Autoplay setelah load
        if (event.data === YT.PlayerState.CUED && this.playAfterLoad) {
            if (this.userHasInteracted) {
                this.ytPlayer.playVideo();
            }
            this.playAfterLoad = false;
        }

        // Logika Lagu Selesai
        if (event.data === YT.PlayerState.ENDED) {
            if (this.repeatMode === 'one') {
                this.seekTo(0);
                this.play();
            } else {
                this.next();
            }
        }
    }

    loadPlaylist(newPlaylist, sourceName) {
        // Jika ganti sumber playlist, reset shuffle
        if (this.currentSource !== sourceName) {
            this.currentSource = sourceName;
            this.originalPlaylist = [...newPlaylist];
            this.playlist = this.isShuffle ? [...this.originalPlaylist].sort(() => Math.random() - 0.5) : [...this.originalPlaylist];
        } else {
            // Update playlist tanpa reset (jika perlu)
             this.originalPlaylist = [...newPlaylist];
             if(!this.isShuffle) this.playlist = [...newPlaylist];
        }
    }

    playAt(index) {
        if (index < 0 || index >= this.playlist.length) return;
        
        this.currentIndex = index;
        const song = this.playlist[this.currentIndex];
        
        if (this.ytPlayer && this.playerReady) {
            this.playAfterLoad = true;
            this.ytPlayer.loadVideoById(song.videoId);
            this.onSongChange(song); // Update UI Judul/Gambar
        }
    }

    play() {
        if (this.ytPlayer && this.userHasInteracted) this.ytPlayer.playVideo();
    }

    pause() {
        if (this.ytPlayer) this.ytPlayer.pauseVideo();
    }

    togglePlay() {
        if (this.isPlaying) this.pause();
        else this.play();
    }

    next() {
        if (this.playlist.length === 0) return;
        let nextIndex;
        if (this.isShuffle) {
            nextIndex = Math.floor(Math.random() * this.playlist.length);
        } else {
            nextIndex = (this.currentIndex + 1) % this.playlist.length;
        }
        this.playAt(nextIndex);
    }

    prev() {
        if (this.playlist.length === 0) return;
        const prevIndex = (this.currentIndex - 1 + this.playlist.length) % this.playlist.length;
        this.playAt(prevIndex);
    }

    toggleShuffle() {
        this.isShuffle = !this.isShuffle;
        if (this.currentIndex === -1) return this.isShuffle;

        const currentSong = this.playlist[this.currentIndex];
        
        if (this.isShuffle) {
            this.playlist = [...this.originalPlaylist].sort(() => Math.random() - 0.5);
        } else {
            this.playlist = [...this.originalPlaylist];
        }
        
        // Re-sync index lagu yang sedang diputar
        this.currentIndex = this.playlist.findIndex(s => s.videoId === currentSong.videoId);
        
        return this.isShuffle; // Kembalikan status untuk update UI button
    }

    toggleRepeat() {
        if (this.repeatMode === 'none') this.repeatMode = 'all';
        else if (this.repeatMode === 'all') this.repeatMode = 'one';
        else this.repeatMode = 'none';
        return this.repeatMode;
    }

    seekTo(percent) {
        if (this.ytPlayer && this.ytPlayer.getDuration) {
            const duration = this.ytPlayer.getDuration();
            this.ytPlayer.seekTo(duration * (percent / 100));
        }
    }

    setVolume(val) {
        this.volume = val;
        if (this.ytPlayer) this.ytPlayer.setVolume(val);
    }

    // Helper untuk UI progress bar
    getProgress() {
        if (!this.ytPlayer || !this.isPlaying) return null;
        return {
            current: this.ytPlayer.getCurrentTime(),
            total: this.ytPlayer.getDuration()
        };
    }
}