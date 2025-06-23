/**
 * Navigation Integration Helper
 * Integrates the existing itemTemplate.js functionality with the NavigationManager
 */

import { navigationManager } from "../core/navigationManager.js";

export class NavigationIntegration {
    constructor() {
        this.initializeEventHandlers();
    }

    /**
     * Initialize navigation event handlers
     */
    initializeEventHandlers() {
        // Wait for DOM to be ready
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => {
                this.setupNavigationHandlers();
            });
        } else {
            this.setupNavigationHandlers();
        }
    }

    /**
     * Setup navigation handlers
     */
    setupNavigationHandlers() {
        // Initialize navigation manager
        navigationManager.init();

        // Listen for navigation state changes
        navigationManager.onStateChange((state, previousState, updateURL) => {
            this.handleNavigationChange(state, previousState, updateURL);
        });

        // Override existing navigation link handlers
        this.setupViewSwitchHandlers();
        this.setupSearchHandlers();
        this.setupBrowseHandlers();
    }

    /**
     * Handle navigation state changes
     */
    handleNavigationChange(state, previousState, updateURL) {
        const { view, item, category, search, page } = state;

        // Handle view changes
        switch (view) {
            case "search":
                this.showSearchView(search);
                break;
            case "handbook":
                if (item) {
                    this.showItemHandbook(item);
                }
                break;
            case "template":
                if (item) {
                    this.showItemTemplate(item);
                }
                break;
            case "browse":
                this.showBrowseView(category, page);
                break;
        }

        // Update UI elements to reflect current state
        this.updateUIState(state);
    }

    /**
     * Setup view switching handlers
     */
    setupViewSwitchHandlers() {
        const templateNavLink = document.getElementById("templateNavLink");
        const handbookNavLink = document.getElementById("handbookNavLink");
        const browseNavLink = document.getElementById("browseNavLink");

        if (templateNavLink) {
            templateNavLink.addEventListener("click", (e) => {
                e.preventDefault();
                if (!templateNavLink.classList.contains("disabled")) {
                    const currentState = navigationManager.getState();
                    if (currentState.item) {
                        navigationManager.switchView("template");
                    }
                }
            });
        }

        if (handbookNavLink) {
            handbookNavLink.addEventListener("click", (e) => {
                e.preventDefault();
                const currentState = navigationManager.getState();
                if (currentState.item) {
                    navigationManager.switchView("handbook");
                } else {
                    navigationManager.navigateToSearch();
                }
            });
        }

        if (browseNavLink) {
            browseNavLink.addEventListener("click", (e) => {
                e.preventDefault();
                navigationManager.navigateToBrowse();
            });
        }
    }

    /**
     * Setup search handlers
     */
    setupSearchHandlers() {
        const itemSearchInput = document.getElementById("itemSearchInput");
        const browseSearchInput = document.getElementById("browseSearchInput");

        if (itemSearchInput) {
            // Update search when user types (with debouncing)
            let searchTimeout;
            itemSearchInput.addEventListener("input", (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    const query = e.target.value.trim();
                    if (query) {
                        navigationManager.updateSearch(query);
                    } else {
                        navigationManager.navigateToSearch();
                    }
                }, 300);
            });

            // Handle item selection from search results
            this.setupSearchResultHandlers();
        }

        if (browseSearchInput) {
            let browseSearchTimeout;
            browseSearchInput.addEventListener("input", (e) => {
                clearTimeout(browseSearchTimeout);
                browseSearchTimeout = setTimeout(() => {
                    // Handle browse search locally without changing URL
                    this.filterBrowseItems(e.target.value);
                }, 300);
            });
        }
    }

    /**
     * Setup search result click handlers
     */
    setupSearchResultHandlers() {
        const searchResults = document.querySelector(
            ".searchResults .list-group"
        );
        if (searchResults) {
            searchResults.addEventListener("click", (e) => {
                const listItem = e.target.closest("li.list-group-item");
                if (listItem && listItem.dataset.itemId) {
                    navigationManager.navigateToItem(
                        listItem.dataset.itemId,
                        "handbook"
                    );
                }
            });
        }
    }

    /**
     * Setup browse handlers
     */
    setupBrowseHandlers() {
        const browseSidebar = document.getElementById("browseSidebar");
        if (browseSidebar) {
            browseSidebar.addEventListener("click", (e) => {
                const categoryElement = e.target.closest(".browse-category");
                if (categoryElement) {
                    const category = categoryElement.dataset.itemType;
                    navigationManager.navigateToBrowse(category, 1);
                }
            });
        }

        // Handle pagination
        const browseItems = document.getElementById("browseItems");
        if (browseItems) {
            browseItems.addEventListener("click", (e) => {
                if (e.target.closest(".page-link")) {
                    e.preventDefault();
                    const pageLink = e.target.closest(".page-link");
                    const page = parseInt(pageLink.dataset.page);
                    if (page && !isNaN(page)) {
                        navigationManager.updatePage(page);
                    }
                }

                // Handle item clicks in browse view
                const itemCard = e.target.closest("[data-item-id]");
                if (itemCard) {
                    const itemId = itemCard.dataset.itemId;
                    navigationManager.navigateToItem(itemId, "handbook");
                }
            });
        }
    }

    /**
     * Show search view
     */
    showSearchView(search = null) {
        const searchInput = document.getElementById("itemSearchInput");
        const recentSearches = document.getElementById("recentSearches");
        const breadcrumb = document.getElementById("breadcrumb");
        const toggleNav = document.getElementById("toggleNav");

        // Hide all containers
        this.hideAllContainers();

        // Show search interface
        if (searchInput) {
            if (search) {
                searchInput.value = search;
                // Trigger search
                this.performSearch(search);
            } else {
                searchInput.value = "";
                searchInput.focus();
            }
        }

        // Show recent searches if no search query
        if (recentSearches && !search) {
            recentSearches.style.display = "grid";
        }

        // Hide breadcrumb and toggle nav
        if (breadcrumb) breadcrumb.style.display = "none";
        if (toggleNav) toggleNav.classList.add("inactive");
    }

    /**
     * Show item handbook view
     */
    showItemHandbook(itemId) {
        const handbookContainer = document.getElementById("handbookContainer");
        const templateContainer = document.getElementById("templateContainer");
        const browseContainer = document.getElementById("browseContainer");
        const handbookNavLink = document.getElementById("handbookNavLink");
        const toggleNav = document.getElementById("toggleNav");

        // Show handbook container
        this.toggleContainers(
            handbookContainer,
            templateContainer,
            handbookContainer,
            browseContainer
        );

        // Update navigation
        if (handbookNavLink) {
            handbookNavLink.classList.add("active");
            handbookNavLink.classList.remove("disabled");
        }
        if (toggleNav) {
            toggleNav.classList.remove("inactive");
        }

        // Load item details (call existing function from itemTemplate.js)
        this.loadItemDetails(itemId);
    }

    /**
     * Show item template view
     */
    showItemTemplate(itemId) {
        const templateContainer = document.getElementById("templateContainer");
        const handbookContainer = document.getElementById("handbookContainer");
        const browseContainer = document.getElementById("browseContainer");
        const templateNavLink = document.getElementById("templateNavLink");

        // Show template container
        this.toggleContainers(
            templateContainer,
            templateContainer,
            handbookContainer,
            browseContainer
        );

        // Update navigation
        if (templateNavLink) {
            templateNavLink.classList.add("active");
            templateNavLink.classList.remove("disabled");
        }

        // Load item template (call existing function from itemTemplate.js)
        this.loadItemTemplate(itemId);
    }

    /**
     * Show browse view
     */
    showBrowseView(category = null, page = 1) {
        const browseContainer = document.getElementById("browseContainer");
        const templateContainer = document.getElementById("templateContainer");
        const handbookContainer = document.getElementById("handbookContainer");
        const breadcrumb = document.getElementById("breadcrumb");
        const toggleNav = document.getElementById("toggleNav");

        // Show browse container
        this.toggleContainers(
            browseContainer,
            templateContainer,
            handbookContainer,
            browseContainer
        );

        // Hide breadcrumb and toggle nav
        if (breadcrumb) breadcrumb.style.display = "none";
        if (toggleNav) toggleNav.classList.add("inactive");

        // Load browse data
        this.loadBrowseData(category, page);
    }

    /**
     * Update UI state based on navigation state
     */
    updateUIState(state) {
        const { view, item, category } = state;

        // Update active navigation links
        const templateNavLink = document.getElementById("templateNavLink");
        const handbookNavLink = document.getElementById("handbookNavLink");
        const browseNavLink = document.getElementById("browseNavLink");

        // Remove active class from all navigation links
        [templateNavLink, handbookNavLink, browseNavLink].forEach((link) => {
            if (link) link.classList.remove("active");
        });

        // Add active class to current view
        switch (view) {
            case "template":
                if (templateNavLink) templateNavLink.classList.add("active");
                break;
            case "handbook":
                if (handbookNavLink) handbookNavLink.classList.add("active");
                break;
            case "browse":
                if (browseNavLink) browseNavLink.classList.add("active");
                break;
        }

        // Update breadcrumb for item views
        if (item && (view === "handbook" || view === "template")) {
            this.updateBreadcrumb(item);
        }

        // Update browse category selection
        if (view === "browse" && category) {
            this.updateBrowseCategory(category);
        }
    }

    /**
     * Helper methods that integrate with existing itemTemplate.js functions
     */

    hideAllContainers() {
        const containers = [
            "templateContainer",
            "handbookContainer",
            "browseContainer",
        ];

        containers.forEach((id) => {
            const container = document.getElementById(id);
            if (container) {
                container.style.display = "none";
            }
        });
    }

    toggleContainers(activeContainer, ...allContainers) {
        // Hide all containers
        allContainers.forEach((container) => {
            if (container) container.style.display = "none";
        });

        // Show active container
        if (activeContainer) {
            activeContainer.style.display = "block";
        }
    }

    // These methods should integrate with existing itemTemplate.js functions
    async performSearch(query) {
        // Call existing search function from itemTemplate.js
        if (window.performItemSearch) {
            await window.performItemSearch(query);
        }
    }

    async loadItemDetails(itemId) {
        // Call existing function from itemTemplate.js
        if (window.loadItemDetails) {
            await window.loadItemDetails(itemId);
        }
    }

    async loadItemTemplate(itemId) {
        // Call existing function from itemTemplate.js
        if (window.loadItemTemplate) {
            await window.loadItemTemplate(itemId);
        }
    }

    async loadBrowseData(category, page) {
        // Call existing function from itemTemplate.js
        if (window.loadBrowseData) {
            await window.loadBrowseData(category, page);
        }
    }

    updateBreadcrumb(itemId) {
        // Call existing function from itemTemplate.js
        if (window.updateItemBreadcrumb) {
            window.updateItemBreadcrumb(itemId);
        }
    }

    updateBrowseCategory(category) {
        // Update browse category selection
        const categoryElements = document.querySelectorAll(
            "#browseSidebar .browse-category"
        );
        categoryElements.forEach((el) => {
            el.classList.toggle("active", el.dataset.itemType === category);
        });
    }

    filterBrowseItems(query) {
        // Filter browse items locally
        const items = document.querySelectorAll("#browseItems .card-bfx");
        const searchQuery = query.toLowerCase();

        items.forEach((item) => {
            const itemName =
                item.querySelector(".card-title")?.textContent.toLowerCase() ||
                "";
            const shouldShow = !query || itemName.includes(searchQuery);
            item.style.display = shouldShow ? "block" : "none";
        });
    }
}

// Initialize navigation integration
export const navigationIntegration = new NavigationIntegration();
