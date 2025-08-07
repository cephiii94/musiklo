// === 1. IMPORT DEPENDENSI ===
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const path = require('path');
const fs = require('fs').promises; // Diperlukan untuk membaca file

// === 2. INISIALISASI ===
const app = express();
const port = 3000;
const myCache = new NodeCache({ stdTTL: 3600 }); // Cache untuk pencarian (1 jam)
const topChartsCache = new NodeCache({ stdTTL: 21600 }); // Cache untuk Top Charts (6 jam)
const koleksiCache = new NodeCache({ stdTTL: 86400 }); // Cache untuk koleksi (24 jam)

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const Youtube_URL = 'https://www.googleapis.com/youtube/v3/search';
const YOUTUBE_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';


// === 3. MIDDLEWARE ===
// Menyajikan file statis seperti index.html, app.js, dll.
app.use(express.static(path.join(__dirname, '')));

// === 4. ENDPOINT API ===

// Endpoint untuk mengambil Top Charts Indonesia
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
                chart: 'mostPopular',
                regionCode: 'ID',
                videoCategoryId: '10',
                maxResults: 15,
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


// Endpoint untuk mengambil dan membangun koleksi lagu (versi tangguh)
app.get('/api/koleksi', async (req, res) => {
    const cacheKey = 'koleksi_lokal_oembed';

    if (koleksiCache.has(cacheKey)) {
        console.log('Mengambil Koleksi dari cache.');
        return res.json(koleksiCache.get(cacheKey));
    }

    console.log('Membangun Koleksi dari file IDs dan oEmbed...');
    try {
        const data = await fs.readFile(path.join(__dirname, 'koleksi_ids.json'), 'utf-8');
        const videoIds = JSON.parse(data);

        const koleksiPromises = videoIds.map(id => {
            const oembedUrl = `https://www.youtube.com/oembed?url=http://www.youtube.com/watch?v=${id}&format=json`;
            return axios.get(oembedUrl);
        });

        // Menggunakan Promise.allSettled untuk menangani jika ada error individual
        const results = await Promise.allSettled(koleksiPromises);

        // Filter hasil untuk hanya mengambil yang sukses (status 'fulfilled')
        const koleksiLengkap = results
            .filter((result, index) => {
                if (result.status === 'rejected') {
                    // Beri tahu di log server ID mana yang gagal
                    console.error(`Gagal mengambil oEmbed untuk ID: ${videoIds[index]}. Alasan: ${result.reason.message}`);
                    return false; // Abaikan yang gagal
                }
                return true; // Ambil yang sukses
            })
            .map(result => {
                // Struktur data yang dikembalikan oEmbed
                const oembedData = result.value.data;
                
                // Ekstrak videoId dari URL thumbnail untuk kepastian
                const urlParams = new URL(oembedData.thumbnail_url).pathname.split('/');
                const videoIdFromThumb = urlParams[2];

                return {
                    videoId: videoIdFromThumb,
                    title: oembedData.title,
                    artist: oembedData.author_name,
                    thumbnailUrl: oembedData.thumbnail_url
                };
            });

        koleksiCache.set(cacheKey, koleksiLengkap);
        res.json(koleksiLengkap);

    } catch (error) {
        console.error('Error saat membaca file koleksi atau error tak terduga:', error.message);
        res.status(500).json({ message: 'Gagal membangun daftar koleksi.' });
    }
});


// Endpoint untuk Pencarian
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
    console.log(`Server musiklo berjalan di http://localhost:${port}`);
});