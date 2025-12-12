// js/api.js
export const fetchTopCharts = async () => {
    const response = await fetch('/.netlify/functions/topcharts');
    if (!response.ok) throw new Error('Gagal memuat Top Charts');
    return await response.json();
};

export const fetchKoleksi = async () => {
    const response = await fetch('/.netlify/functions/koleksi');
    if (!response.ok) throw new Error('Gagal memuat Koleksi');
    return await response.json();
};

export const searchMusic = async (query) => {
    const response = await fetch(`/.netlify/functions/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) throw new Error('Gagal melakukan pencarian');
    return await response.json();
};

export const fetchLyrics = async (artist, title) => {
    try {
        const response = await fetch(`https://lyrist.vercel.app/api/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
        if (!response.ok) throw new Error('Lirik tidak ditemukan.');
        const data = await response.json();
        return data.lyrics ? data.lyrics.trim() : null;
    } catch (error) {
        console.error("Lyrics fetch error:", error);
        return null;
    }
};