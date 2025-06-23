/**
 * Navigation Manager for Tarkynator
 * Handles URL state management, browser history, and navigation restoration
 */

export class NavigationManager {
    constructor() {
        this.defaultState = {
            view: "search", // search, template, handbook, browse
            item: null,
            category: null,
            search: null,
            page: 1,
        };

        this.currentState = { ...this.defaultState };
        this.stateChangeHandlers = [];
        this.isInitialized = false;

        // Bind the popstate handler
        this.handlePopState = this.handlePopState.bind(this);
    }

    /**
     * Initialize the navigation manager
     */
    init() {
        if (this.isInitialized) return;

        // Listen for browser back/forward events
        window.addEventListener("popstate", this.handlePopState);

        // Restore state from current URL
        this.restoreStateFromURL();

        this.isInitialized = true;
    }

    /**
     * Clean up event listeners
     */
    destroy() {
        window.removeEventListener("popstate", this.handlePopState);
        this.isInitialized = false;
    }

    /**
     * Handle browser back/forward button events
     */
    handlePopState(event) {
        const state = event.state || this.getStateFromURL();
        this.currentState = { ...this.defaultState, ...state };
        this.notifyStateChange(this.currentState, false); // false = don't update URL
    }

    /**
     * Get state from current URL
     */
    getStateFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        return {
            view: urlParams.get("view") || this.defaultState.view,
            item: urlParams.get("item"),
            category: urlParams.get("category"),
            search: urlParams.get("search"),
            page: parseInt(urlParams.get("page")) || this.defaultState.page,
        };
    }

    /**
     * Restore application state from URL
     */
    restoreStateFromURL() {
        this.currentState = { ...this.defaultState, ...this.getStateFromURL() };
        this.notifyStateChange(this.currentState, false);
    }

    /**
     * Update navigation state and URL
     */
    updateState(newState, addToHistory = true) {
        const previousState = { ...this.currentState };
        this.currentState = { ...this.currentState, ...newState };

        if (addToHistory) {
            this.updateURL(this.currentState);
        }

        this.notifyStateChange(this.currentState, addToHistory, previousState);
    }

    /**
     * Update the browser URL
     */
    updateURL(state) {
        const url = new URL(window.location);
        const params = url.searchParams;

        // Clear existing parameters
        params.delete("view");
        params.delete("item");
        params.delete("category");
        params.delete("search");
        params.delete("page");

        // Set new parameters (only if they're not default values)
        if (state.view && state.view !== this.defaultState.view) {
            params.set("view", state.view);
        }
        if (state.item) {
            params.set("item", state.item);
        }
        if (state.category) {
            params.set("category", state.category);
        }
        if (state.search) {
            params.set("search", state.search);
        }
        if (state.page && state.page !== this.defaultState.page) {
            params.set("page", state.page.toString());
        }

        // Update browser history
        window.history.pushState(state, "", url);
    }

    /**
     * Register a handler for state changes
     */
    onStateChange(handler) {
        this.stateChangeHandlers.push(handler);
    }

    /**
     * Remove a state change handler
     */
    offStateChange(handler) {
        const index = this.stateChangeHandlers.indexOf(handler);
        if (index > -1) {
            this.stateChangeHandlers.splice(index, 1);
        }
    }

    /**
     * Notify all handlers of state changes
     */
    notifyStateChange(newState, updateURL = true, previousState = null) {
        this.stateChangeHandlers.forEach((handler) => {
            try {
                handler(newState, previousState, updateURL);
            } catch (error) {
                console.error(
                    "Error in navigation state change handler:",
                    error
                );
            }
        });
    }

    /**
     * Get current navigation state
     */
    getState() {
        return { ...this.currentState };
    }

    /**
     * Navigate to search view
     */
    navigateToSearch(search = null) {
        this.updateState({
            view: "search",
            item: null,
            category: null,
            search: search,
            page: 1,
        });
    }

    /**
     * Navigate to item view
     */
    navigateToItem(itemId, view = "handbook") {
        this.updateState({
            view: view,
            item: itemId,
            category: null,
            search: null,
            page: 1,
        });
    }

    /**
     * Navigate to browse view
     */
    navigateToBrowse(category = null, page = 1) {
        this.updateState({
            view: "browse",
            item: null,
            category: category,
            search: null,
            page: page,
        });
    }

    /**
     * Switch view for current item
     */
    switchView(view) {
        this.updateState({ view: view });
    }

    /**
     * Update search query
     */
    updateSearch(search) {
        this.updateState({
            search: search,
            page: 1,
        });
    }

    /**
     * Update page number
     */
    updatePage(page) {
        this.updateState({ page: page });
    }

    /**
     * Go back to previous state (if available)
     */
    goBack() {
        window.history.back();
    }

    /**
     * Replace current state without adding to history
     */
    replaceState(newState) {
        this.currentState = { ...this.currentState, ...newState };
        const url = new URL(window.location);
        const params = url.searchParams;

        // Update URL parameters
        Object.keys(newState).forEach((key) => {
            if (newState[key] && newState[key] !== this.defaultState[key]) {
                params.set(key, newState[key]);
            } else {
                params.delete(key);
            }
        });

        window.history.replaceState(this.currentState, "", url);
        this.notifyStateChange(this.currentState, false);
    }
}

// Create a singleton instance
export const navigationManager = new NavigationManager();
