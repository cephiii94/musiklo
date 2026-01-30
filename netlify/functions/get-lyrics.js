const axios = require('axios');

exports.handler = async function (event, context) {
    const { artist, title } = event.queryStringParameters;

    if (!artist || !title) {
        return {
            statusCode: 400,
            body: JSON.stringify({ message: 'Parameter artist dan title wajib diisi.' })
        };
    }

    try {
        console.log(`Fetching lyrics for: ${artist} - ${title}`);
        const response = await axios.get(`https://lyrist.vercel.app/api/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
        
        return {
            statusCode: 200,
            body: JSON.stringify(response.data)
        };
    } catch (error) {
        console.error("Lyrics proxy error:", error.message);
        return {
            statusCode: error.response?.status || 500,
            body: JSON.stringify({ message: 'Gagal mengambil lirik.', error: error.message })
        };
    }
};
