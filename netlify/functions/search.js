require('dotenv').config();
const axios = require('axios');

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const Youtube_URL = 'https://www.googleapis.com/youtube/v3/search';

exports.handler = async function (event, context) {
    const query = event.queryStringParameters.q;

    if (!query) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Query pencarian tidak boleh kosong.' })
        };
    }

    console.log(`Mencari di YouTube API untuk query: ${query} (via Netlify Function).`);
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

        return {
            statusCode: 200,
            body: JSON.stringify(searchResults)
        };
    } catch (error) {
        console.error('Error di function search:', error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Terjadi kesalahan pada server.' })
        };
    }
};