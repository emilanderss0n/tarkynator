// Theme Management System
// Handles theme switching and persistence with localStorage

class ThemeManager {
    constructor() {
        this.currentTheme = 'eft'; // Default theme
        this.themeSelect = null;
        this.init();
    }

    // Initialize theme manager
    init() {
        // Load saved theme from localStorage
        this.loadSavedTheme();
        
        // Apply the theme immediately
        this.applyTheme(this.currentTheme);
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupEventListeners());
        } else {
            this.setupEventListeners();
        }
    }

    // Load theme from localStorage
    loadSavedTheme() {
        const savedTheme = localStorage.getItem('tarkynator-theme');
        if (savedTheme && this.isValidTheme(savedTheme)) {
            this.currentTheme = savedTheme;
        }
    }

    // Save theme to localStorage
    saveTheme(theme) {
        localStorage.setItem('tarkynator-theme', theme);
    }

    // Check if theme is valid
    isValidTheme(theme) {
        const validThemes = ['eft', 'modern'];
        return validThemes.includes(theme);
    }

    // Apply theme to document
    applyTheme(theme) {
        if (!this.isValidTheme(theme)) {
            console.warn(`Invalid theme: ${theme}. Using default dark theme.`);
            theme = 'dark';
        }

        // Remove existing theme attributes
        document.documentElement.removeAttribute('data-theme');
        
        // Apply new theme (dark is default, no attribute needed)
        if (theme !== 'dark') {
            document.documentElement.setAttribute('data-theme', theme);
        }

        this.currentTheme = theme;
        
        // Update select dropdown if it exists
        this.updateThemeSelect();
        
        // Save to localStorage
        this.saveTheme(theme);
        
        // Dispatch custom event for other components to listen to
        this.dispatchThemeChangeEvent(theme);
    }

    // Setup event listeners
    setupEventListeners() {
        this.themeSelect = document.getElementById('theme-select');
        
        if (this.themeSelect) {
            // Set initial value
            this.themeSelect.value = this.currentTheme;
            
            // Listen for changes
            this.themeSelect.addEventListener('change', (e) => {
                this.changeTheme(e.target.value);
            });
        }
    }

    // Update theme select dropdown
    updateThemeSelect() {
        if (this.themeSelect) {
            this.themeSelect.value = this.currentTheme;
        }
    }

    // Change theme
    changeTheme(newTheme) {
        if (newTheme === this.currentTheme) return;
        
        console.log(`Changing theme from ${this.currentTheme} to ${newTheme}`);
        this.applyTheme(newTheme);
    }

    // Get current theme
    getCurrentTheme() {
        return this.currentTheme;
    }

    // Dispatch theme change event
    dispatchThemeChangeEvent(theme) {
        const event = new CustomEvent('themeChanged', {
            detail: { theme: theme }
        });
        document.dispatchEvent(event);
    }

    // Get available themes
    getAvailableThemes() {
        return [
            { value: 'eft', label: '🌙 EFT' },
            { value: 'modern', label: '🔵 Modern' },
        ];
    }
}

// Initialize theme manager
window.themeManager = new ThemeManager();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThemeManager;
}