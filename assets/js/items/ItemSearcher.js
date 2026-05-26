// ItemSearcher - Handles item search functionality
import { searchOptimizer } from "../core/searchOptimizer.js";
import { navigationManager } from "../core/navigationManager.js";
import { createItemListElement } from "./itemElementFactory.js";
import { createManagedImage } from "../core/imageManager.js";

export class ItemSearcher {
    constructor(context) {
        this.context = context;
        this.elements = context.elements;
        this.performSearch = async (query) => {
            await performSearch(this, query);
        };
        this.clearResults = () => {
            clearResults(this);
        };
        this.storeRecentSearch = (itemElement) => {
            storeRecentSearch(this, itemElement);
        };
        this.showRecentSearches = () => {
            showRecentSearches(this);
        };
        this.hideRecentSearches = () => {
            hideRecentSearches(this);
        };

        this.setupRecentSearches();
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

    updateRecentSearches() {
        if (!this.elements.recentSearchesElement) return;

        const recentSearches = JSON.parse(localStorage.getItem("recentSearches")) || [];
        const fragment = document.createDocumentFragment();

        recentSearches.forEach((item) => {
            const listItem = document.createElement("a");
            listItem.className = "last-search-item card-bfx";
            listItem.href = "javascript:void(0);";

            const cardBody = document.createElement("div");
            cardBody.className = "card-body";

            const image = createManagedImage({
                src: item.iconLink,
                alt: item.name.trim(),
                width: 50,
                height: 50,
                fallbackSrc: "assets/img/icon_quest.png",
            });

            image.style.marginRight = "10px";

            const titleWrap = document.createElement("div");
            titleWrap.className = "title";

            const title = document.createElement("h4");
            title.textContent = item.name.trim();

            titleWrap.appendChild(title);
            cardBody.appendChild(image);
            cardBody.appendChild(titleWrap);
            listItem.appendChild(cardBody);
            
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

}

async function performSearch(instance, query) {
    if (instance.elements.spinner) {
        instance.elements.spinner.style.display = "inline-block";
    }

    try {
        // Ensure data is loaded before searching
        await instance.context.ensureDataLoaded();

        if (instance.elements.spinner) {
            instance.elements.spinner.style.display = "none";
        }

        // Perform fast search
        const filteredItems = fastItemSearch(instance, query);

        if (filteredItems.length > 0) {
            updateSearchResults(instance, filteredItems);
        } else {
            displayNoResults(instance, "No results found");
        }
    } catch (error) {
        console.error("Error loading local items:", error);
        if (instance.elements.spinner) {
            instance.elements.spinner.style.display = "none";
        }
        displayNoResults(instance, "Error loading local items");
    }
}

function fastItemSearch(instance, query) {
    const itemsArrayCache = instance.context.itemsArrayCache();
    const searchIndex = instance.context.searchIndex();

    if (!itemsArrayCache || !searchIndex) return [];
    return searchOptimizer.fastSearch(query, searchIndex, itemsArrayCache);
}

function updateSearchResults(instance, items) {
    if (!instance.elements.searchResults) return;

    instance.elements.searchResults.innerHTML = "";

    if (instance.elements.searchResultsCont) {
        instance.elements.searchResultsCont.style.display = "inline-block";
    }

    if (items.length > 0) {
        items.forEach((item, index) => createSearchResultItem(instance, item, index));
    } else {
        displayNoResults(instance, "No matching results found");
    }
}

function createSearchResultItem(instance, item, index) {
    const listItem = createItemListElement(item);

    instance.elements.searchResults.appendChild(listItem);

    // Animate item appearance
    setTimeout(() => {
        listItem.classList.add("show");
    }, 100 * index);
}

function displayNoResults(instance, message) {
    if (!instance.elements.searchResults) return;
    instance.elements.searchResults.innerHTML = `<li class="list-group-item">${message}</li>`;
}

function clearResults(instance) {
    if (instance.elements.searchResults) {
        instance.elements.searchResults.innerHTML = "";
    }
    if (instance.elements.searchResultsCont) {
        instance.elements.searchResultsCont.style.display = "none";
    }
}

function storeRecentSearch(instance, itemElement) {
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
    instance.updateRecentSearches();
}

function showRecentSearches(instance) {
    instance.toggleRecentSearchesVisibility(true);
}

function hideRecentSearches(instance) {
    instance.toggleRecentSearchesVisibility(false);
}
