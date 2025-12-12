// js/theme.js
export class ThemeManager {
    constructor() {
        this.themeToggleMobile = document.getElementById('theme-toggle-mobile');
        this.themeToggleDesktop = document.getElementById('theme-toggle-desktop');
        this.init();
    }

    applyTheme(theme) {
        document.body.classList.remove('light-mode', 'dark-mode');
        document.body.classList.add(theme);
        localStorage.setItem('musiklo-theme', theme);
        
        const sunIcons = document.querySelectorAll('.theme-toggle-button .fa-sun');
        const moonIcons = document.querySelectorAll('.theme-toggle-button .fa-moon');
        
        if (theme === 'dark-mode') {
            sunIcons.forEach(i => i.classList.add('hidden'));
            moonIcons.forEach(i => i.classList.remove('hidden'));
        } else {
            sunIcons.forEach(i => i.classList.remove('hidden'));
            moonIcons.forEach(i => i.classList.add('hidden'));
        }
    }

    toggleTheme() {
        const currentTheme = localStorage.getItem('musiklo-theme') || 'light-mode';
        const newTheme = currentTheme === 'light-mode' ? 'dark-mode' : 'light-mode';
        this.applyTheme(newTheme);
    }

    init() {
        // Listener
        if (this.themeToggleMobile) this.themeToggleMobile.addEventListener('click', () => this.toggleTheme());
        if (this.themeToggleDesktop) this.themeToggleDesktop.addEventListener('click', () => this.toggleTheme());

        // Initial Load
        const savedTheme = localStorage.getItem('musiklo-theme');
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme) this.applyTheme(savedTheme);
        else if (prefersDark) this.applyTheme('dark-mode');
        else this.applyTheme('light-mode');
    }
}