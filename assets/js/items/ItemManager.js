/**
 * ItemManager - Main orchestrator for the item system
 * Coordinates all item-related functionality and manages the overall state
 */

import { navigationManager } from "../core/navigationManager.js";
import { ItemSearcher } from "./ItemSearcher.js";
import { ItemDisplayer } from "./ItemDisplayer.js";
import { ItemBrowser } from "./ItemBrowser.js";
import { ItemTemplate } from "./ItemTemplate.js";
import { ItemDependencies } from "./ItemDependencies.js";
import { ItemBreadcrumb } from "./ItemBreadcrumb.js";
import { fetchData } from "../core/cache.js";
import { searchOptimizer } from "../core/searchOptimizer.js";
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

    /**
     * Initialize the ItemManager and all sub-modules
     */
    async init() {
        if (this.isInitialized) return;

        try {
            // Cache DOM elements
            this.cacheDOMElements();

            // Initialize data
            await this.initializeData();

            // Initialize sub-modules
            this.initializeModules();

            // Setup global event listeners
            this.setupGlobalEventListeners();

            // Setup navigation
            this.setupNavigation();

            this.isInitialized = true;

            // Handle initial navigation
            this.handleInitialNavigation();

        } catch (error) {
            console.error('❌ Failed to initialize ItemManager:', error);
            throw error;
        }
    }

    /**
     * Cache frequently used DOM elements
     */
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

    /**
     * Initialize data caches and preload game data
     */
    async initializeData() {
        // Hide spinner initially
        if (this.elements.spinner) {
            this.elements.spinner.style.display = "none";
        }

        // Initialize JSON editor
        checkJsonEditor();

        // Preload game data
        await this.preloadGameData();

        // Load local items data
        try {
            const response = await fetch(ITEMS_URL);
            if (response.ok) {
                this.localItems = await response.json();
            }
        } catch (error) {
            console.error("Error loading local items:", error);
        }
    }

    /**
     * Preload and cache game data
     */
    async preloadGameData() {
        if (!this.gameDataCache) {
            try {
                this.gameDataCache = await fetchData(DATA_URL, { method: "GET" });
                this.itemsArrayCache = Object.values(this.gameDataCache.items);
                this.searchIndex = searchOptimizer.createSearchIndex(this.itemsArrayCache);
                this.categoryFilterMap = searchOptimizer.createCategoryFilter(this.itemsArrayCache);
            } catch (error) {
                console.error("Error preloading game data:", error);
            }
        }
        return this.gameDataCache;
    }

    /**
     * Initialize all sub-modules
     */
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
            preloadGameData: () => this.preloadGameData(),
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

    /**
     * Setup global event listeners
     */
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

    /**
     * Handle dependency copy button clicks
     */
    handleDependencyCopy(e) {
        const copyButton = e.target.closest(".copy-deps");
        if (copyButton) {
            this.modules.dependencies.handleCopyDependencies(copyButton);
        }
    }

    /**
     * Handle search input changes
     */
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

    /**
     * Setup navigation handlers
     */
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

    /**
     * Handle navigation state changes
     */
    async handleNavigationStateChange(state, previousState) {
        const { view, item, category, search, page } = state;

        switch (view) {
            case "search":
                if (search) {
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
                    await this.modules.displayer.displayItemById(item);
                }
                break;

            case "template":
                if (item && item !== previousState?.item) {
                    await this.modules.displayer.displayItemById(item);
                } else if (item) {
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
                    await this.modules.browser.loadCategory(category, page);
                }
                break;
        }
    }

    /**
     * Show search view
     */
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

    /**
     * Toggle container visibility
     */
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

    /**
     * Set active navigation link
     */
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
                    if (name !== "browse") {
                        element.classList.add("disabled");
                    }
                }
            }
        });
    }

    /**
     * Handle initial navigation on page load
     */
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

    /**
     * Get shared context for modules
     */
    getSharedContext() {
        return {
            elements: this.elements,
            gameDataCache: () => this.gameDataCache,
            itemsArrayCache: () => this.itemsArrayCache,
            searchIndex: () => this.searchIndex,
            categoryFilterMap: () => this.categoryFilterMap,
            localItems: () => this.localItems,
            categoryNameMapping: this.categoryNameMapping,
            preloadGameData: () => this.preloadGameData(),
            manager: this
        };
    }

    /**
     * Get a specific module
     */
    getModule(name) {
        return this.modules[name];
    }

    /**
     * Clean up resources
     */
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
