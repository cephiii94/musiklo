// === 1. IMPORT DEPENDENSI ===
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const path = require('path');

// === 2. INISIALISASI ===
const app = express();
const port = 3000;
// BARU: Cache untuk top charts akan disimpan selama 6 jam (21600 detik)
const myCache = new NodeCache({ stdTTL: 3600 }); // Cache untuk pencarian (1 jam)
const topChartsCache = new NodeCache({ stdTTL: 21600 }); // Cache untuk Top Charts (6 jam)

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const Youtube_URL = 'https://www.googleapis.com/youtube/v3/search';
// BARU: URL baru untuk mengambil daftar video (termasuk top charts)
const YOUTUBE_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';


// === 3. MIDDLEWARE ===
app.use(express.static(path.join(__dirname, '')));

// === 4. ENDPOINT API ===

// BARU: Endpoint untuk mengambil Top Charts Indonesia
app.get('/api/topcharts', async (req, res) => {
    const cacheKey = 'topcharts_ID';

    if (topChartsCache.has(cacheKey)) {
        console.log('Mengambil Top Charts dari cache.');
        return res.json(topChartsCache.get(cacheKey));
    }

    console.log('Mengambil Top Charts dari YouTube API.');
    try {
        const response = await axios.get(YOUTUBE_VIDEOS_URL, {
            params: {
                part: 'snippet',
                chart: 'mostPopular', // Meminta chart terpopuler
                regionCode: 'ID',     // Untuk wilayah Indonesia
                videoCategoryId: '10',// Kategori "Musik"
                maxResults: 15,       // Ambil 15 lagu teratas
                key: YOUTUBE_API_KEY
            }
        });

        const topCharts = response.data.items.map(item => ({
            videoId: item.id,
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            thumbnailUrl: item.snippet.thumbnails.high.url
        }));

        topChartsCache.set(cacheKey, topCharts);
        res.json(topCharts);

    } catch (error) {
        console.error('Error saat mengambil Top Charts:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Gagal mengambil Top Charts.' });
    }
});


// Endpoint untuk Pencarian (menggunakan URL yang berbeda)
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    if (!query) {
        return res.status(400).json({ message: 'Query pencarian tidak boleh kosong.' });
    }
    const cacheKey = `search_${query}`;

    if (myCache.has(cacheKey)) {
        console.log(`Mengambil dari cache untuk query: ${query}`);
        return res.json(myCache.get(cacheKey));
    }

    console.log(`Mencari di YouTube API untuk query: ${query}`);
    try {
        const response = await axios.get(Youtube_URL, {
            params: {
                part: 'snippet',
                q: query,
                key: YOUTUBE_API_KEY,
                type: 'video',
                maxResults: 10,
                videoCategoryId: '10'
            }
        });

        const searchResults = response.data.items.map(item => ({
            videoId: item.id.videoId,
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            thumbnailUrl: item.snippet.thumbnails.high.url
        }));

        myCache.set(cacheKey, searchResults);
        console.log(`Menyimpan ke cache untuk query: ${query}`);
        res.json(searchResults);

    } catch (error) {
        console.error('Error saat memanggil YouTube API:', error.response ? error.response.data : error.message);
        res.status(500).json({ message: 'Terjadi kesalahan pada server.' });
    }
});

// === 5. MENJALANKAN SERVER ===
app.listen(port, () => {
    console.log(`Server meemusic berjalan di http://localhost:${port}`);
});