/**
 * Main JavaScript Entry Point for Tarkynator
 * This file provides a centralized way to manage and initialize all modules
 */

// Core modules
export { navigationManager } from './core/navigationManager.js';
export { fetchData } from './core/cache.js';
export { searchOptimizer } from './core/searchOptimizer.js';
export { DATA_URL, ITEMS_URL, HANDBOOK_URL, GLOBALS, DEPENDENCIES } from './core/localData.js';
export { themeManager } from './core/themeManager.js';

// Component modules
export { checkJsonEditor, checkJsonEditorSimple } from './components/checkJsonEditor.js';

// Application initialization
class TarkynatorApp {
    constructor() {
        this.modules = new Map();
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        console.log('🚀 Initializing Tarkynator App...');

        try {
            // Initialize core modules
            const { navigationManager } = await import('./core/navigationManager.js');
            const { themeManager } = await import('./core/themeManager.js');

            // Initialize navigation
            navigationManager.init();
            this.modules.set('navigation', navigationManager);

            // Initialize theme
            if (themeManager && themeManager.init) {
                themeManager.init();
                this.modules.set('theme', themeManager);
            }

            this.initialized = true;
            console.log('✅ Tarkynator App initialized successfully');

            // Dispatch custom event for other scripts to listen to
            window.dispatchEvent(new CustomEvent('tarkynator:ready', {
                detail: { app: this }
            }));

        } catch (error) {
            console.error('❌ Failed to initialize Tarkynator App:', error);
        }
    }

    getModule(name) {
        return this.modules.get(name);
    }

    async loadPage(pageName) {
        try {
            console.log(`📄 Loading page: ${pageName}`);

            switch (pageName) {
                case 'items':
                    return await import('./pages/itemTemplate.js');
                case 'quests':
                    return await import('./pages/quests.js');
                case 'achievements':
                    return await import('./pages/achievements.js');
                case 'crafts':
                    return await import('./pages/crafts.js');
                case 'custom-trader':
                    return await import('./features/customTrader.js');
                default:
                    console.warn(`Unknown page: ${pageName}`);
            }
        } catch (error) {
            console.error(`Failed to load page ${pageName}:`, error);
        }
    }
}

// Create global app instance
window.TarkynatorApp = new TarkynatorApp();

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.TarkynatorApp.init());
} else {
    window.TarkynatorApp.init();
}

export default window.TarkynatorApp;
