require('dotenv').config();
const axios = require('axios');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';

exports.handler = async function (event, context) {
    console.log('Cek API Key:', YOUTUBE_API_KEY ? 'ADA (Aman)' : 'KOSONG (Masalah di sini!)');
    console.log('Mengambil Top Charts dari YouTube API (via Netlify Function).');
    try {
        const response = await axios.get(YOUTUBE_VIDEOS_URL, {
            params: {
                part: 'snippet',
                chart: 'mostPopular',
                regionCode: 'ID',
                videoCategoryId: '10',
                maxResults: 30,
                key: YOUTUBE_API_KEY
            }
        });

        const topCharts = response.data.items.map(item => ({
            videoId: item.id,
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            thumbnailUrl: item.snippet.thumbnails.high.url
        }));

        return {
            statusCode: 200,
            body: JSON.stringify(topCharts)
        };

    } catch (error) {
        console.error('Error di function topcharts:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Gagal mengambil Top Charts.' })
        };
    }
};