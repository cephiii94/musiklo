// js/utils.js
export const decodeHtml = (html) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
};

export const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
};

export const cleanSongTitle = (title) => {
    let cleanedTitle = title.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '');
    cleanedTitle = cleanedTitle.replace(/official music video/i, '')
        .replace(/official video/i, '')
        .replace(/music video/i, '')
        .replace(/official/i, '')
        .replace(/lyric video/i, '')
        .replace(/lyrics/i, '');
    return cleanedTitle.trim();
};