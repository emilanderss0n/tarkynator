// ItemManager - Main orchestrator for the item system
import { navigationManager } from "../core/navigationManager.js";
import { ItemSearcher } from "./ItemSearcher.js";
import { ItemDisplayer } from "./ItemDisplayer.js";
import { ItemBrowser } from "./ItemBrowser.js";
import { ItemTemplate } from "./ItemTemplate.js";
import { ItemDependencies } from "./ItemDependencies.js";
import { ItemBreadcrumb } from "./ItemBreadcrumb.js";
import { fetchData } from "../core/cache.js";
import { searchOptimizer } from "../core/searchOptimizer.js";
import { indexedDBCache } from "../core/indexedDbCache.js";
import {
    DATA_URL,
    ITEMS_URL,
    HANDBOOK_URL,
    GLOBALS,
    DEPENDENCIES,
} from "../core/localData.js";
import {
    checkJsonEditor,
    checkJsonEditorSimple,
} from "../components/checkJsonEditor.js";

export class ItemManager {
    constructor() {
        this.isInitialized = false;
        this.isNavigationHandlerActive = false;
        this.lastActiveCategory = "";
        
        // Data caches
        this.gameDataCache = null;
        this.itemsArrayCache = null;
        this.searchIndex = null;
        this.categoryFilterMap = null;
        this.localItems = {};

        // Lazy loading state
        this.isDataLoading = false;
        this.dataLoadPromise = null;
        this.loadingCallbacks = [];

        // Web Worker for heavy processing
        this.searchWorker = null;
        this.workerReady = false;

        // Streaming state
        this.streamingProgress = 0;
        this.streamingTotal = 0;

        // DOM elements
        this.elements = {};
        
        // Sub-modules
        this.modules = {};

        // Category name mapping
        this.categoryNameMapping = {
            "Light & laser devices": "LightLaserDevices",
            "Light/laser devices": "LightLaserDevices",
        };

        // Bind methods
        this.handleNavigationStateChange = this.handleNavigationStateChange.bind(this);
        this.handleDependencyCopy = this.handleDependencyCopy.bind(this);
    }

    // Initialize the ItemManager and all sub-modules
    async init() {
        if (this.isInitialized) return;

        try {
            // Cache DOM elements
            this.cacheDOMElements();

            // Initialize Web Worker
            this.initializeWebWorker();

            // Initialize sub-modules (without data)
            this.initializeModules();

            // Setup global event listeners
            this.setupGlobalEventListeners();

            // Setup navigation
            this.setupNavigation();

            this.isInitialized = true;

            // Handle initial navigation (data will be loaded on demand)
            this.handleInitialNavigation();

            // Start background data loading after initial UI is ready
            this.startBackgroundDataLoading();

        } catch (error) {
            console.error('❌ Failed to initialize ItemManager:', error);
            throw error;
        }
    }

    // Start loading data in background after UI is ready
    startBackgroundDataLoading() {
        // Use requestIdleCallback to load data when browser is idle
        if (window.requestIdleCallback) {
            requestIdleCallback(() => {
                this.loadDataInBackground();
            }, { timeout: 2000 }); // Fallback after 2 seconds
        } else {
            // Fallback for browsers without requestIdleCallback
            setTimeout(() => {
                this.loadDataInBackground();
            }, 1000);
        }
    }

    // Load data in background without blocking UI
    async loadDataInBackground() {
        try {
            // Only load if data isn't already loading or loaded
            if (!this.gameDataCache && !this.isDataLoading) {
                await this.ensureDataLoaded();
            }
        } catch (error) {
            // Don't throw error - data will load on-demand when needed
        }
    }

    // Initialize Web Worker for heavy processing
    initializeWebWorker() {
        try {
            this.searchWorker = new Worker('assets/js/workers/dataWorker.js');
            
            this.searchWorker.onmessage = (event) => {
                const { type, data, error } = event.data;
                
                switch (type) {
                    case 'SEARCH_INDEX_READY':
                        this.searchIndex = data;
                        this.workerReady = true;
                        break;
                    case 'CATEGORY_FILTER_READY':
                        this.categoryFilterMap = data;
                        break;
                    case 'SEARCH_RESULTS':
                        this.handleWorkerSearchResults(data);
                        break;
                    case 'ERROR':
                        console.error('Web Worker error:', error);
                        break;
                }
            };

            this.searchWorker.onerror = (error) => {
                this.workerReady = false;
            };
        } catch (error) {
            this.workerReady = false;
        }
    }

    // Lazy load data only when needed
    async ensureDataLoaded() {
        if (this.gameDataCache) {
            return this.gameDataCache;
        }

        if (this.isDataLoading) {
            return this.dataLoadPromise;
        }

        this.isDataLoading = true;
        this.showLoadingState();

        this.dataLoadPromise = this.loadDataWithStreaming();
        
        try {
            const result = await this.dataLoadPromise;
            this.hideLoadingState();
            
            // Cache in localStorage for future visits
            this.cacheDataLocally(result);
            
            return result;
        } catch (error) {
            this.hideLoadingState();
            throw error;
        } finally {
            this.isDataLoading = false;
        }
    }

    // Cache data in IndexedDB for faster subsequent loads
    async cacheDataLocally(gameData) {
        try {
            const cacheData = {
                gameData: gameData,
                localItems: this.localItems,
                timestamp: Date.now(),
                version: '2.0'
            };
            
            // Store in IndexedDB (no size limits like localStorage)
            await indexedDBCache.set('TarkynatorCache', cacheData);
            await indexedDBCache.set('itemsCache', this.localItems);
        } catch (error) {
            // Cache failure is non-critical
        }
    }

    // Load data from IndexedDB if available and fresh
    async loadCachedData() {
        try {
            // Initialize IndexedDB
            await indexedDBCache.init();
            
            const cacheData = await indexedDBCache.get('TarkynatorCache');
            if (!cacheData) return null;
            
            // Check if cache is fresh (less than 24 hours old)
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            if (Date.now() - cacheData.timestamp > maxAge) {
                await this.clearLocalCache();
                return null;
            }
            
            return cacheData;
        } catch (error) {
            await this.clearLocalCache();
            return null;
        }
    }

    // Clear IndexedDB cache
    async clearLocalCache() {
        try {
            await indexedDBCache.delete('TarkynatorCache');
            await indexedDBCache.delete('itemsCache');
        } catch (error) {
            // Cache clear failure is non-critical
        }
    }

    // Stream large JSON files in chunks
    async loadDataWithStreaming() {
        try {
            // Check for cached data first
            const cachedData = await this.loadCachedData();
            if (cachedData) {
                this.gameDataCache = cachedData.gameData;
                this.localItems = cachedData.localItems || {};
                
                // Process data in chunks to avoid blocking
                await this.processDataInChunks();
                
                return this.gameDataCache;
            }
            
            // Initialize JSON editor on first load
            checkJsonEditor();
            
            // Load main game data with streaming
            this.gameDataCache = await this.streamJsonFile(DATA_URL, 'Game Data');
            
            // Load local items data
            try {
                this.localItems = await this.streamJsonFile(ITEMS_URL, 'Items Data');
            } catch (error) {
                this.localItems = {};
            }

            // Process data in chunks to avoid blocking
            await this.processDataInChunks();

            return this.gameDataCache;
        } catch (error) {
            console.error('❌ Error during data loading:', error);
            throw error;
        }
    }

    // Stream a JSON file in chunks
    async streamJsonFile(url, label) {
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`Failed to fetch ${label}: ${response.statusText}`);
        }

        const contentLength = response.headers.get('content-length');
        this.streamingTotal = contentLength ? parseInt(contentLength) : 0;
        this.streamingProgress = 0;

        const reader = response.body?.getReader();
        if (!reader) {
            // Fallback for browsers without streaming support
            return await response.json();
        }

        let chunks = [];
        
        while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            chunks.push(value);
            this.streamingProgress += value.length;
            
            // Yield control to prevent blocking
            await this.yieldToMain();
        }

        // Combine chunks and parse JSON
        const fullData = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
            fullData.set(chunk, offset);
            offset += chunk.length;
        }

        const text = new TextDecoder().decode(fullData);
        return JSON.parse(text);
    }

    // Process data in chunks to avoid blocking the main thread
    async processDataInChunks() {
        if (!this.gameDataCache?.items) return;

        this.itemsArrayCache = Object.values(this.gameDataCache.items);
        const chunkSize = 500; // Process 500 items at a time
        
        // If Web Worker is available, use it for heavy processing
        if (this.workerReady && this.searchWorker) {
            this.searchWorker.postMessage({
                type: 'CREATE_SEARCH_INDEX',
                data: this.itemsArrayCache
            });
            
            this.searchWorker.postMessage({
                type: 'CREATE_CATEGORY_FILTER',
                data: this.itemsArrayCache
            });
        } else {
            // Fallback: process in chunks on main thread
            for (let i = 0; i < this.itemsArrayCache.length; i += chunkSize) {
                const chunk = this.itemsArrayCache.slice(i, i + chunkSize);
                
                if (i === 0) {
                    // Initialize on first chunk
                    this.searchIndex = searchOptimizer.createSearchIndex(chunk);
                    this.categoryFilterMap = searchOptimizer.createCategoryFilter(chunk);
                } else {
                    // Extend existing indexes
                    searchOptimizer.extendSearchIndex(this.searchIndex, chunk);
                    searchOptimizer.extendCategoryFilter(this.categoryFilterMap, chunk);
                }
                
                // Yield control between chunks
                await this.yieldToMain();
            }
        }
    }

    // Yield control to the main thread
    async yieldToMain() {
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    // Show loading state
    showLoadingState() {
        if (this.elements.spinner) {
            this.elements.spinner.style.display = "inline-block";
        }
        
        // Show loading overlay if available
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
    }

    // Hide loading state
    hideLoadingState() {
        if (this.elements.spinner) {
            this.elements.spinner.style.display = "none";
        }
        
        // Hide loading overlay
        const loadingOverlay = document.getElementById('loadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    // Handle search results from Web Worker
    handleWorkerSearchResults(results) {
        if (this.modules.searcher) {
            this.modules.searcher.updateSearchResults(results);
        }
    }

    // Cache frequently used DOM elements
    cacheDOMElements() {
        this.elements = {
            // Search elements
            itemSearchInput: document.getElementById("itemSearchInput"),
            searchResultsCont: document.querySelector(".searchResults"),
            searchResults: document.querySelector(".searchResults .list-group"),
            spinner: document.querySelector("#activity"),
            recentSearchesElement: document.getElementById("recentSearches"),

            // Navigation elements
            templateNavLink: document.getElementById("templateNavLink"),
            handbookNavLink: document.getElementById("handbookNavLink"),
            browseNavLink: document.getElementById("browseNavLink"),
            toggleNav: document.getElementById("toggleNav"),
            breadcrumb: document.getElementById("breadcrumb"),

            // Container elements
            templateContainer: document.getElementById("templateContainer"),
            handbookContainer: document.getElementById("handbookContainer"),
            browseContainer: document.getElementById("browseContainer"),
            handbookContent: document.getElementById("handbookContent"),
            templateLoader: document.querySelector(".template-load"),

            // Browse elements
            browseSidebar: document.getElementById("browseSidebar"),
            browseItems: document.getElementById("browseItems"),
        };

        // Validate required elements
        const requiredElements = [
            'itemSearchInput', 'searchResults', 'handbookContent',
            'templateNavLink', 'handbookNavLink', 'browseNavLink'
        ];

        for (const elementName of requiredElements) {
            if (!this.elements[elementName]) {
                console.warn(`Required element ${elementName} not found`);
            }
        }
    }

    initializeModules() {
        // Initialize sub-modules with shared context
        const sharedContext = {
            elements: this.elements,
            gameDataCache: () => this.gameDataCache,
            itemsArrayCache: () => this.itemsArrayCache,
            searchIndex: () => this.searchIndex,
            categoryFilterMap: () => this.categoryFilterMap,
            localItems: () => this.localItems,
            categoryNameMapping: this.categoryNameMapping,
            ensureDataLoaded: () => this.ensureDataLoaded(),
            manager: this
        };

        this.modules.searcher = new ItemSearcher(sharedContext);
        this.modules.displayer = new ItemDisplayer(sharedContext);
        this.modules.browser = new ItemBrowser(sharedContext);
        this.modules.template = new ItemTemplate(sharedContext);
        this.modules.dependencies = new ItemDependencies(sharedContext);
        this.modules.breadcrumb = new ItemBreadcrumb(sharedContext);

        // Initialize all modules
        Object.values(this.modules).forEach(module => {
            if (module.init) {
                module.init();
            }
        });
    }

    setupGlobalEventListeners() {
        // Dependency copy button handler
        document.body.addEventListener("click", this.handleDependencyCopy);

        // Search results click handler
        if (this.elements.searchResults) {
            this.elements.searchResults.addEventListener("click", (event) => {
                if (event.target && event.target.matches("li.list-group-item")) {
                    const itemElement = event.target.closest("li.list-group-item");
                    const itemId = itemElement.dataset.itemId;
                    navigationManager.navigateToItem(itemId, "handbook");
                    this.elements.searchResultsCont.style.display = "none";
                }
            });
        }

        // Search input handler
        if (this.elements.itemSearchInput) {
            this.elements.itemSearchInput.addEventListener(
                "input",
                searchOptimizer.debounce((e) => {
                    const query = this.elements.itemSearchInput.value.trim();
                    this.handleSearchInput(query);
                }, 150)
            );
        }
    }

    handleDependencyCopy(e) {
        const copyButton = e.target.closest(".copy-deps");
        if (copyButton) {
            this.modules.dependencies.handleCopyDependencies(copyButton);
        }
    }

    handleSearchInput(query) {
        if (query.length > 2) {
            this.modules.searcher.performSearch(query);
        } else {
            this.modules.searcher.clearResults();
            if (this.elements.handbookContent) {
                this.elements.handbookContent.innerHTML = "";
            }
            if (query.length === 0) {
                this.showSearchView();
            }
        }
        checkJsonEditorSimple();
    }

    setupNavigation() {
        navigationManager.init();

        // Navigation link handlers
        if (this.elements.templateNavLink) {
            this.elements.templateNavLink.addEventListener("click", (event) => {
                event.preventDefault();
                if (!this.elements.templateNavLink.classList.contains("disabled")) {
                    const currentState = navigationManager.getState();
                    if (currentState.item) {
                        navigationManager.switchView("template");
                    }
                }
            });
        }

        if (this.elements.handbookNavLink) {
            this.elements.handbookNavLink.addEventListener("click", (event) => {
                event.preventDefault();
                const currentState = navigationManager.getState();
                if (currentState.item) {
                    navigationManager.switchView("handbook");
                } else {
                    navigationManager.navigateToSearch();
                }
            });
        }

        if (this.elements.browseNavLink) {
            this.elements.browseNavLink.addEventListener("click", (event) => {
                event.preventDefault();
                navigationManager.navigateToBrowse();
            });
        }

        // Listen for navigation state changes
        navigationManager.onStateChange((state, previousState, updateURL) => {
            if (this.isNavigationHandlerActive) return;
            this.isNavigationHandlerActive = true;
            this.handleNavigationStateChange(state, previousState);
            this.isNavigationHandlerActive = false;
        });
    }

    // Handle navigation state changes
    async handleNavigationStateChange(state, previousState) {
        const { view, item, category, search, page } = state;

        switch (view) {
            case "search":
                if (search) {
                    // Ensure data is loaded before performing search
                    await this.ensureDataLoaded();
                    this.elements.itemSearchInput.value = search;
                    await this.modules.searcher.performSearch(search);
                } else {
                    this.showSearchView();
                }
                break;

            case "handbook":
                if (item) {
                    this.toggleContainers(this.elements.handbookContainer);
                    this.setActiveNavLink("handbook");
                    this.elements.toggleNav?.classList.remove("inactive");
                    if (this.elements.breadcrumb) {
                        this.elements.breadcrumb.style.display = "block";
                    }
                }
                if (item && item !== previousState?.item) {
                    // Ensure data is loaded before displaying item
                    await this.ensureDataLoaded();
                    await this.modules.displayer.displayItemById(item);
                }
                break;

            case "template":
                if (item && item !== previousState?.item) {
                    // Ensure data is loaded before displaying item
                    await this.ensureDataLoaded();
                    await this.modules.displayer.displayItemById(item);
                } else if (item) {
                    await this.ensureDataLoaded();
                    await this.modules.template.loadTemplate(item);
                }
                if (item) {
                    this.toggleContainers(this.elements.templateContainer);
                    this.setActiveNavLink("template");

                    setTimeout(() => {
                        if (typeof editor !== "undefined" && editor) {
                            editor.refresh();
                            checkJsonEditorSimple();
                        }
                    }, 50);
                }
                break;

            case "browse":
                this.toggleContainers(this.elements.browseContainer);
                this.setActiveNavLink("browse");
                this.elements.toggleNav?.classList.add("inactive");
                if (this.elements.breadcrumb) {
                    this.elements.breadcrumb.style.display = "none";
                }

                if (category) {
                    // Ensure data is loaded before browsing categories
                    await this.ensureDataLoaded();
                    await this.modules.browser.loadCategory(category, page);
                }
                break;
        }
    }

    showSearchView() {
        this.toggleContainers(null);
        this.modules.searcher.showRecentSearches();
        
        if (this.elements.breadcrumb) {
            this.elements.breadcrumb.style.display = "none";
        }
        this.elements.toggleNav?.classList.add("inactive");

        this.setActiveNavLink(null);
        this.modules.searcher.clearResults();
        
        if (this.elements.itemSearchInput) {
            this.elements.itemSearchInput.focus();
        }
    }

    toggleContainers(activeContainer) {
        const containers = [
            this.elements.templateContainer,
            this.elements.handbookContainer,
            this.elements.browseContainer
        ];

        containers.forEach(container => {
            if (container) {
                container.style.display = container === activeContainer ? "block" : "none";
            }
        });

        // Special handling for browse container
        if (activeContainer === this.elements.browseContainer) {
            this.modules.browser.handleBrowseContainerActivation();
        }
    }

    setActiveNavLink(activeLink) {
        const links = [
            { element: this.elements.templateNavLink, name: "template" },
            { element: this.elements.handbookNavLink, name: "handbook" },
            { element: this.elements.browseNavLink, name: "browse" }
        ];

        links.forEach(({ element, name }) => {
            if (element) {
                if (name === activeLink) {
                    element.classList.add("active");
                    element.classList.remove("disabled");
                } else {
                    element.classList.remove("active");
                    // Only disable template and handbook links when no item is selected
                    // When an item is selected, both template and handbook should be clickable
                    if (name !== "browse" && (activeLink === null || activeLink === "browse")) {
                        element.classList.add("disabled");
                    } else {
                        element.classList.remove("disabled");
                    }
                }
            }
        });
    }

    handleInitialNavigation() {
        const urlParams = new URLSearchParams(window.location.search);
        if (
            urlParams.has("item") ||
            urlParams.has("view") ||
            urlParams.has("search") ||
            urlParams.has("category")
        ) {
            setTimeout(() => {
                navigationManager.restoreStateFromURL();
            }, 100);
        } else {
            setTimeout(() => {
                this.showSearchView();
            }, 100);
        }
    }

    getSharedContext() {
        return {
            elements: this.elements,
            gameDataCache: () => this.gameDataCache,
            itemsArrayCache: () => this.itemsArrayCache,
            searchIndex: () => this.searchIndex,
            categoryFilterMap: () => this.categoryFilterMap,
            localItems: () => this.localItems,
            categoryNameMapping: this.categoryNameMapping,
            ensureDataLoaded: () => this.ensureDataLoaded(),
            manager: this
        };
    }

    getModule(name) {
        return this.modules[name];
    }

    destroy() {
        // Clean up modules
        Object.values(this.modules).forEach(module => {
            if (module.destroy) {
                module.destroy();
            }
        });

        // Remove event listeners
        document.body.removeEventListener("click", this.handleDependencyCopy);

        this.isInitialized = false;
    }
}

// Export singleton instance
export const itemManager = new ItemManager();

// Make globally accessible for legacy compatibility
if (typeof window !== 'undefined') {
    window.itemManager = itemManager;
}

// Auto-initialize when DOM is ready (since this is now the entry point)
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await itemManager.init();
    } catch (error) {
        console.error('❌ Failed to initialize Item Browser System:', error);
        
        // Fallback error display
        const errorContainer = document.getElementById('handbookContent') || document.body;
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <h4 class="alert-heading">Initialization Error</h4>
                    <p>Failed to load the item browser system. Please refresh the page or contact support if the problem persists.</p>
                    <hr>
                    <p class="mb-0">Error: ${error.message}</p>
                </div>
            `;
        }
    }
});
