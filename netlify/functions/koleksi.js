// netlify/functions/koleksi.js
require('dotenv').config();
const axios = require('axios');

// Hapus/komentari baris berikut:
// const path = require('path');
// const fs = require('fs').promises;
// const KOLEKSI_LINKS_PATH = path.join(__dirname, 'koleksi_links.json');

// Ganti dengan require langsung:
const videoLinks = require('./koleksi_links.json');

exports.handler = async function (event, context) {
    console.log('Membangun Koleksi dari file link (versi aman).');
    try {
        const koleksiPromises = videoLinks.map(link => {
            const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(link)}&format=json`;
            return axios.get(oembedUrl);
        });

        const results = await Promise.allSettled(koleksiPromises);

        const koleksiLengkap = results
            .filter((result, index) => {
                if (result.status === 'rejected') {
                    console.error(`Gagal mengambil oEmbed untuk LINK: ${videoLinks[index]}. Alasan: ${result.reason.message}`);
                    return false;
                }
                return true;
            })
            .map(result => {
                const oembedData = result.value.data;

                // ================== PERBAIKAN BUG DI SINI ==================
                // Tambahkan pengecekan untuk memastikan data oEmbed valid
                if (!oembedData || !oembedData.thumbnail_url) {
                    console.error("Menerima data oEmbed tidak valid atau tanpa thumbnail:", oembedData);
                    return null; // Kembalikan null jika datanya tidak lengkap
                }
                // ==========================================================

                const urlParams = new URL(oembedData.thumbnail_url).pathname.split('/');
                const videoIdFromThumb = urlParams[2];

                return {
                    videoId: videoIdFromThumb,
                    title: oembedData.title,
                    artist: oembedData.author_name,
                    thumbnailUrl: oembedData.thumbnail_url
                };
            })
            // BARU: Tambahkan filter untuk menghapus entri yang null (yang datanya tidak valid)
            .filter(song => song !== null);

        return {
            statusCode: 200,
            body: JSON.stringify(koleksiLengkap)
        };
    } catch (error) {
        console.error('Error di function koleksi:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Gagal membangun daftar koleksi.' })
        };
    }
};