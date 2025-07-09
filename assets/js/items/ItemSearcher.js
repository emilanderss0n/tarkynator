// ItemSearcher - Handles item search functionality
import { searchOptimizer } from "../core/searchOptimizer.js";
import { navigationManager } from "../core/navigationManager.js";

export class ItemSearcher {
    constructor(context) {
        this.context = context;
        this.elements = context.elements;
    }

    init() {
        this.setupRecentSearches();
    }

    // Perform item search
    async performSearch(query) {
        const isId = /^[0-9a-fA-F]{24}$/.test(query);
        
        if (this.elements.spinner) {
            this.elements.spinner.style.display = "inline-block";
        }

        try {
            // Ensure data is loaded before searching
            await this.context.ensureDataLoaded();
            
            if (this.elements.spinner) {
                this.elements.spinner.style.display = "none";
            }

            // Perform fast search
            const filteredItems = this.fastItemSearch(query);

            if (filteredItems.length > 0) {
                this.updateSearchResults(filteredItems);
            } else {
                this.displayNoResults("No results found");
            }
        } catch (error) {
            console.error("Error loading local items:", error);
            if (this.elements.spinner) {
                this.elements.spinner.style.display = "none";
            }
            this.displayNoResults("Error loading local items");
        }
    }

    // Perform fast item search using search index
    fastItemSearch(query) {
        const itemsArrayCache = this.context.itemsArrayCache();
        const searchIndex = this.context.searchIndex();
        
        if (!itemsArrayCache || !searchIndex) return [];
        return searchOptimizer.fastSearch(query, searchIndex, itemsArrayCache);
    }

    // Update search results display
    updateSearchResults(items) {
        if (!this.elements.searchResults) return;

        this.elements.searchResults.innerHTML = "";
        
        if (this.elements.searchResultsCont) {
            this.elements.searchResultsCont.style.display = "inline-block";
        }

        if (items.length > 0) {
            items.forEach((item, index) => this.createSearchResultItem(item, index));
        } else {
            this.displayNoResults("No matching results found");
        }
    }

    createSearchResultItem(item, index) {
        const listItem = document.createElement("li");
        listItem.className = "list-group-item";
        
        const iconLink = item.iconLink.replace(
            /^.*\/data\/icons\//,
            "data/icons/"
        );

        listItem.innerHTML = `
            <img src="${iconLink}" alt="${item.name}" class="small-glow" style="width: 50px; height: 50px; margin-right: 10px;">
            ${item.name}
        `;

        const handbookCategoriesNames = item.handbookCategories
            .map((category) => category.name)
            .join(", ");

        const taskIds = item.usedInTasks
            ? item.usedInTasks.map((task) => task.id).join(",")
            : "";

        Object.assign(listItem.dataset, {
            itemId: item.id,
            itemTypes: handbookCategoriesNames,
            usedInTasks: taskIds,
        });

        this.elements.searchResults.appendChild(listItem);

        // Animate item appearance
        setTimeout(() => {
            listItem.classList.add("show");
        }, 100 * index);
    }

    displayNoResults(message) {
        if (!this.elements.searchResults) return;
        this.elements.searchResults.innerHTML = `<li class="list-group-item">${message}</li>`;
    }

    clearResults() {
        if (this.elements.searchResults) {
            this.elements.searchResults.innerHTML = "";
        }
        if (this.elements.searchResultsCont) {
            this.elements.searchResultsCont.style.display = "none";
        }
    }

    setupRecentSearches() {
        this.updateRecentSearches();

        // Setup observer for browse container visibility
        if (this.elements.browseContainer && this.elements.recentSearchesElement) {
            const observer = new MutationObserver(() => {
                const isBrowseContainerVisible = 
                    this.elements.browseContainer.style.display !== "none";
                this.toggleRecentSearchesVisibility(!isBrowseContainerVisible);
            });

            observer.observe(this.elements.browseContainer, {
                attributes: true,
                attributeFilter: ["style"],
            });
        }
    }

    storeRecentSearch(itemElement) {
        const recentSearches = JSON.parse(localStorage.getItem("recentSearches")) || [];
        
        const itemData = {
            id: itemElement.dataset.itemId,
            name: itemElement.textContent,
            iconLink: itemElement.querySelector("img").src,
            itemTypes: itemElement.dataset.itemTypes,
            usedInTasks: itemElement.dataset.usedInTasks,
        };

        // Remove existing entry if present
        const existingIndex = recentSearches.findIndex(
            (item) => item.id === itemData.id
        );
        if (existingIndex !== -1) {
            recentSearches.splice(existingIndex, 1);
        }

        // Add to beginning
        recentSearches.unshift(itemData);

        // Limit to 8 items
        if (recentSearches.length > 8) {
            recentSearches.pop();
        }

        localStorage.setItem("recentSearches", JSON.stringify(recentSearches));
        this.updateRecentSearches();
    }

    updateRecentSearches() {
        if (!this.elements.recentSearchesElement) return;

        const recentSearches = JSON.parse(localStorage.getItem("recentSearches")) || [];
        const fragment = document.createDocumentFragment();

        recentSearches.forEach((item) => {
            const listItem = document.createElement("a");
            listItem.className = "last-search-item card-bfx";
            listItem.href = "javascript:void(0);";
            listItem.innerHTML = `
                <div class="card-body">
                    <img src="${item.iconLink}" alt="${item.name.trim()}" style="width: 50px; height: 50px; margin-right: 10px;">
                    <div class="title">
                        <h4>${item.name.trim()}</h4>
                    </div>
                </div>
            `;
            
            listItem.dataset.itemId = item.id;
            listItem.dataset.itemTypes = item.itemTypes;
            listItem.dataset.usedInTasks = item.usedInTasks;
            
            listItem.addEventListener("click", () => {
                const itemId = listItem.dataset.itemId;
                navigationManager.navigateToItem(itemId, "handbook");
            });
            
            fragment.appendChild(listItem);
        });

        this.elements.recentSearchesElement.innerHTML = "";
        this.elements.recentSearchesElement.appendChild(fragment);
    }

    toggleRecentSearchesVisibility(isVisible) {
        if (!this.elements.recentSearchesElement) return;
        this.elements.recentSearchesElement.style.display = isVisible ? "grid" : "none";
    }

    showRecentSearches() {
        this.toggleRecentSearchesVisibility(true);
    }

    hideRecentSearches() {
        this.toggleRecentSearchesVisibility(false);
    }

    destroy() {
        // Clean up any resources if needed
    }
}
