import { checkJsonEditor, checkJsonEditorSimple } from './checkJsonEditor.js';
import { fetchData } from './cache.js';
import { searchOptimizer } from './searchOptimizer.js';
import { DATA_URL, ITEMS_URL, HANDBOOK_URL, GLOBALS, DEPENDENCIES } from './localData.js';

// Add lastActiveCategory variable at the top level
let lastActiveCategory = '';

// Cache for storing frequently accessed data
let gameDataCache = null;
let itemsArrayCache = null;
let searchIndex = null;
let categoryFilterMap = null;

// Add category name mapping at the top level
const categoryNameMapping = {
    'Light & laser devices': 'LightLaserDevices',
    'Light/laser devices': 'LightLaserDevices'
};

// Add this at the beginning of the file, after imports
// Global click handler for copy buttons
document.body.addEventListener('click', function (e) {
    const copyButton = e.target.closest('.copy-deps');
    if (copyButton) {
        const depItem = copyButton.closest('.dep-item');
        const assetPath = depItem.querySelector('p:nth-of-type(1) .global-id').textContent;
        const dependencyKeys = Array.from(
            depItem.querySelectorAll('.list-group .global-id')
        ).map(el => el.textContent);

        const jsonOutput = {
            key: assetPath,
            dependencyKeys: dependencyKeys
        };

        navigator.clipboard.writeText(JSON.stringify(jsonOutput, null, 3))
            .then(() => {
                copyButton.innerHTML = '<i class="bi bi-check"></i> Copied!';
                setTimeout(() => {
                    copyButton.innerHTML = '<i class="bi bi-clipboard"></i> Copy';
                }, 2000);
            })
            .catch(err => {
                console.error('Failed to copy:', err);
                copyButton.innerHTML = '<i class="bi bi-x"></i> Failed';
                setTimeout(() => {
                    copyButton.innerHTML = '<i class="bi bi-clipboard"></i> Copy';
                }, 2000);
            });
    }
});

document.addEventListener('DOMContentLoaded', () => {

    const itemSearchInput = document.getElementById('itemSearchInput');
    const handbookContent = document.getElementById('handbookContent');
    const searchResultsCont = document.querySelector('.searchResults');
    const searchResults = document.querySelector('.searchResults .list-group');
    const spinner = document.querySelector('#activity');
    const breadcrumb = document.getElementById('breadcrumb');
    const recentSearchesElement = document.getElementById('recentSearches');

    const templateNavLink = document.getElementById('templateNavLink');
    const handbookNavLink = document.getElementById('handbookNavLink');
    const browseNavLink = document.getElementById('browseNavLink');

    const toggleNav = document.getElementById('toggleNav');
    const templateContainer = document.getElementById('templateContainer');
    const handbookContainer = document.getElementById('handbookContainer');
    const templateLoader = document.querySelector('.template-load');

    const browseContainer = document.getElementById('browseContainer');
    const browseSidebar = document.getElementById('browseSidebar');
    const browseItems = document.getElementById('browseItems');

    // Add search filter input element
    const searchFilter = document.createElement('div');
    searchFilter.className = 'search-filter';
    searchFilter.innerHTML = `
        <input type="text" id="browseSearchInput" class="form-control" placeholder="Search items by name...">
    `;
    browseItems.insertAdjacentElement('afterbegin', searchFilter);

    checkJsonEditor(); let localItems = {};    // Preload and cache game data
    const preloadGameData = async () => {
        if (!gameDataCache) {
            try {
                gameDataCache = await fetchData(DATA_URL, { method: 'GET' });
                // Create items array cache for faster searching
                itemsArrayCache = Object.values(gameDataCache.items);
                // Create optimized search index
                searchIndex = searchOptimizer.createSearchIndex(itemsArrayCache);
                // Create category filter map
                categoryFilterMap = searchOptimizer.createCategoryFilter(itemsArrayCache);
            } catch (error) {
                console.error('Error preloading game data:', error);
            }
        }
        return gameDataCache;
    };

    // Fast search using search optimizer
    const fastItemSearch = (query) => {
        if (!itemsArrayCache || !searchIndex) return [];
        return searchOptimizer.fastSearch(query, searchIndex, itemsArrayCache);
    }; spinner.style.display = 'none';

    // Preload game data immediately
    preloadGameData();

    fetch(ITEMS_URL)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => { localItems = data; })
        .catch(error => console.error('Error loading local items:', error)); itemSearchInput.addEventListener('input', searchOptimizer.debounce(() => {
            const query = itemSearchInput.value.trim();
            if (query.length > 2) {
                fetchItemData(query);
            } else {
                handbookContent.innerHTML = '';
                searchResults.innerHTML = '';
            }
            checkJsonEditorSimple();
        }, 150)); // Reduced debounce time for better responsiveness

    // Remove the duplicate fetchData function since we import it from cache.js
    const fetchItemData = async (query) => {
        const isId = /^[0-9a-fA-F]{24}$/.test(query);
        spinner.style.display = 'inline-block';

        try {
            // Use cached data if available, otherwise fetch
            let data = gameDataCache;
            if (!data) {
                data = await preloadGameData();
            }

            spinner.style.display = 'none';

            // Use fast search with index
            const filteredItems = fastItemSearch(query);

            if (filteredItems.length > 0) {
                updateSearchResults(filteredItems);
            } else {
                displayNoResults('No results found');
            }
        } catch (error) {
            console.error('Error loading local items:', error);
            spinner.style.display = 'none';
            displayNoResults('Error loading local items');
        }
    }; const urlParams = new URLSearchParams(window.location.search);
    const itemId = urlParams.get('item');
    if (itemId) {
        // Use cached data if available
        const loadItemFromUrl = async () => {
            let data = gameDataCache;
            if (!data) {
                data = await preloadGameData();
            }

            const item = data.items[itemId];
            if (item) {
                const listItem = document.createElement('li');
                listItem.className = 'list-group-item';
                const iconLink = item.iconLink.replace(/^.*\/data\/icons\//, 'data/icons/');

                listItem.innerHTML = `
                    <img src="${iconLink}" alt="${item.name}" class="small-glow" style="width: 50px; height: 50px; margin-right: 10px;">
                    ${item.name}
                `;

                const handbookCategoriesNames = item.handbookCategories.map(category => category.name).join(', ');

                // Convert usedInTasks array to just the task IDs
                const taskIds = item.usedInTasks ? item.usedInTasks.map(task => task.id).join(',') : '';

                Object.assign(listItem.dataset, {
                    itemId: item.id,
                    itemTypes: handbookCategoriesNames,
                    usedInTasks: taskIds
                });
                displayItemDetails(listItem);
            }
        };

        loadItemFromUrl().catch(error => {
            console.error('Error fetching item data:', error);
        });
    }

    const updateSearchResults = (items) => {
        searchResults.innerHTML = '';
        searchResultsCont.style.display = "inline-block";
        if (items.length > 0) {
            items.forEach((item, index) => createSearchResultItem(item, index));
        } else {
            displayNoResults('No matching results found');
        }
    };

    const createSearchResultItem = (item, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        const iconLink = item.iconLink.replace(/^.*\/data\/icons\//, 'data/icons/');

        listItem.innerHTML = `
            <img src="${iconLink}" alt="${item.name}" class="small-glow" style="width: 50px; height: 50px; margin-right: 10px;">
            ${item.name}
        `;

        const handbookCategoriesNames = item.handbookCategories.map(category => category.name).join(', ');

        // Convert usedInTasks array to just the task IDs
        const taskIds = item.usedInTasks ? item.usedInTasks.map(task => task.id).join(',') : '';

        Object.assign(listItem.dataset, {
            itemId: item.id,
            itemTypes: handbookCategoriesNames,
            usedInTasks: taskIds
        });

        listItem.addEventListener('click', () => displayItemDetails(listItem));
        searchResults.appendChild(listItem);

        setTimeout(() => {
            listItem.classList.add('show');
        }, 100 * index);
    };

    const displayNoResults = (message) => {
        searchResults.innerHTML = `<li class="list-group-item">${message}</li>`;
    };

    const toggleRecentSearchesVisibility = (isVisible) => {
        recentSearchesElement.style.display = isVisible ? 'grid' : 'none';
    };

    const displayItemDetails = async (itemElement) => {
        const { itemId, itemTypes, usedInTasks } = itemElement.dataset; const url = new URL(window.location);
        url.searchParams.set('item', itemId);
        window.history.pushState({}, '', url);

        // Store the search in localStorage
        storeRecentSearch(itemElement);

        // Save the current active category before switching views
        const activeCategoryElement = document.querySelector('#browseSidebar .browse-category.active');
        if (activeCategoryElement) {
            lastActiveCategory = activeCategoryElement.dataset.itemType;
        }

        // Always enable handbook view
        handbookNavLink.classList.add('active');
        handbookNavLink.classList.remove('disabled');
        toggleContainers(handbookContainer, browseContainer, templateContainer, handbookContainer);

        toggleNav.classList.remove('inactive');
        // Don't enable template view yet - we'll check if the template exists first

        // Enhanced breadcrumb generation with clickable navigation
        const types = itemTypes.split(',').reverse();
        const validCategories = new Set(Object.values(typesEnum));
        const breadcrumbHTML = types
            .map((type, index) => {
                // Check if this category exists in our valid categories or has a mapping
                const normalizedType = type.trim();
                const isValidCategory = validCategories.has(normalizedType) ||
                    Object.keys(categoryNameMapping).includes(normalizedType);

                if (index === types.length - 1 && isValidCategory) {
                    // First (root) category - make it a link only if it's a valid category
                    return `<a href="javascript:void(0);" class="breadcrumb-link" data-view="browse" data-category="${Object.entries(typesEnum).find(([key, value]) => value === normalizedType)?.[0] || normalizedType}">${type}</a>`;
                } else if (index === 0 || !isValidCategory) {
                    // Last category or invalid category - just text
                    return `<span class="breadcrumb-text">${type}</span>`;
                } else if (isValidCategory) {
                    // Middle categories - links only if they're valid categories
                    const enumKey = Object.entries(typesEnum).find(([key, value]) => value === normalizedType)?.[0] || normalizedType;
                    return `<a href="javascript:void(0);" class="breadcrumb-link" data-category="${enumKey}">${type}</a>`;
                } else {
                    return `<span class="breadcrumb-text">${type}</span>`;
                }
            })
            .join(' <i class="bi bi-caret-right-fill"></i> ') +
            ' <i class="bi bi-caret-right-fill"></i> ' +
            `<span class="breadcrumb-current">${itemElement.textContent}</span>`;

        breadcrumb.innerHTML = "<div class='breadcrumb-container'>" + breadcrumbHTML + "</div>";
        breadcrumb.style.display = 'block';

        // Add click handlers for breadcrumb links
        breadcrumb.querySelectorAll('.breadcrumb-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                browseNavLink.click();

                // Get the category from the data attribute
                let categoryName = link.dataset.category;

                // If we have a direct mapping, use it
                const mappedName = Object.entries(categoryNameMapping)
                    .find(([key, value]) => value === categoryName)?.[0];

                if (mappedName) {
                    // Use the mapped display name
                    categoryName = mappedName.replace(/\s+/g, '-');
                } else if (typesEnum[categoryName]) {
                    // If it's an enum key, get the display name
                    categoryName = typesEnum[categoryName].replace(/\s+/g, '-');
                } else {
                    // Otherwise, normalize it
                    categoryName = categoryName.replace(/\s+/g, '-');
                }

                const categoryElement = document.querySelector(`#browseSidebar .browse-category[data-item-type="${categoryName}"]`);
                if (categoryElement) {
                    categoryElement.click();
                }
            });
        }); let usedInTasksHTML = '';
        if (usedInTasks) {
            try {
                // Use cached data if available
                let data = gameDataCache;
                if (!data) {
                    data = await fetchData(DATA_URL, { method: 'GET' });
                }

                const taskIds = usedInTasks.split(',');
                const tasks = taskIds.map(taskId => {
                    const taskInfo = data.items[itemId].usedInTasks.find(task => task.id === taskId);
                    return taskInfo ? `<li class="list-group-item"><strong>${taskInfo.name}</strong><span class="global-id">${taskId}</span></li>` : null;
                }).filter(task => task !== null).join('');

                if (tasks) {
                    usedInTasksHTML = `
                        <div class="used-in card">
                            <figure>
                                <figcaption class="blockquote-footer">Used in quests</figcaption>
                            </figure>
                            <ul class="list-group">${tasks}</ul>
                        </div>`;
                }
            } catch (error) {
                console.error('Error fetching tasks data:', error);
                usedInTasksHTML = '<p>Error fetching tasks data.</p>';
            }
        }

        updateHandbookContent(itemElement, usedInTasksHTML);
        searchResults.innerHTML = '';
        itemSearchInput.value = '';
        await fetchItemJsonTemplate(itemId);
        if (editor) {
            editor.refresh();
            checkJsonEditorSimple();
        }

        // Hide recent searches
        toggleRecentSearchesVisibility(false);
    };

    const storeRecentSearch = (itemElement) => {
        const recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];
        const itemData = {
            id: itemElement.dataset.itemId,
            name: itemElement.textContent,
            iconLink: itemElement.querySelector('img').src,
            itemTypes: itemElement.dataset.itemTypes,
            usedInTasks: itemElement.dataset.usedInTasks
        };

        // Remove duplicate entries
        const existingIndex = recentSearches.findIndex(item => item.id === itemData.id);
        if (existingIndex !== -1) {
            recentSearches.splice(existingIndex, 1);
        }

        // Add the new search to the beginning of the array
        recentSearches.unshift(itemData);

        // Keep only the last 8 searches
        if (recentSearches.length > 8) {
            recentSearches.pop();
        }

        localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
        updateRecentSearches();
    };

    const updateRecentSearches = () => {
        const recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];
        const fragment = document.createDocumentFragment();

        recentSearches.forEach(item => {
            const listItem = document.createElement('a');
            listItem.className = 'last-search-item card-bfx';
            listItem.href = 'javascript:void(0);';
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

            listItem.addEventListener('click', () => {
                displayItemDetails(listItem);
                breadcrumb.style.display = 'block'; // Ensure breadcrumb is displayed
            });
            fragment.appendChild(listItem);
        });

        recentSearchesElement.innerHTML = '';
        recentSearchesElement.appendChild(fragment);
    };

    // Call updateRecentSearches on page load to populate recent searches
    updateRecentSearches();

    // Hide recent searches when browseContainer is visible
    const observer = new MutationObserver(() => {
        const isBrowseContainerVisible = browseContainer.style.display !== 'none';
        toggleRecentSearchesVisibility(!isBrowseContainerVisible);
    });

    observer.observe(browseContainer, { attributes: true, attributeFilter: ['style'] }); const updateHandbookContent = async (itemElement, usedInTasksHTML) => {
        try {
            const itemId = itemElement.dataset.itemId;

            // Use cached data if available, otherwise fetch
            let data = gameDataCache;
            if (!data) {
                data = await fetchData(DATA_URL, { method: 'GET' });
            }

            const itemData = data.items[itemId];

            if (!itemData) {
                handbookContent.innerHTML = '<p>Item not found in tarkov_data.json</p>';
                return;
            }            // Then try to get the template data, but don't fail if it's not available
            let itemTemplate = null;
            let properties = null;
            let fleaBanHTML = '';
            let dependenciesHTML = '';
            let slotsHTML = '';
            let dependenciesData = null;
            let itemsData = null;

            try {
                itemsData = await fetchData(ITEMS_URL, { method: 'GET' });
                if (itemsData && itemsData[itemId]) {
                    itemTemplate = itemsData[itemId];
                }

                if (itemTemplate) {
                    // Check if item is banned on flea market based on template data
                    const isFleaBanned = itemTemplate._props && !itemTemplate._props.CanSellOnRagfair;
                    fleaBanHTML = isFleaBanned ? '<div class="flea-ban flex-box"><div class="icon warning-red"></div><div>Flea Ban</div></div>' : '';

                    properties = itemTemplate._props;

                    // Generate slots HTML if template exists
                    if (properties && properties.Slots) {
                        slotsHTML = properties.Slots.map(slot => {
                            if (slot._props.filters) {
                                const slotItems = slot._props.filters.flatMap(filter =>
                                    filter.Filter ? filter.Filter.map(filterId => {
                                        const slotItem = data.items[filterId];
                                        const itemId = itemsData && itemsData[filterId] ? itemsData[filterId]._id : null;
                                        return slotItem && itemId ? { ...slotItem, _id: itemId } : null;
                                    }).filter(Boolean) : []
                                );

                                if (slotItems.length > 0) {
                                    const slotItemsHTML = slotItems
                                        .map(slotItem => {
                                            let iconLink = slotItem.iconLink ? slotItem.iconLink.replace(/^.*\/data\/icons\//, 'data/icons/') : '';
                                            if (!iconLink) {
                                                iconLink = `assets/img/slots/${slot._name.toLowerCase()}.png`;
                                            }
                                            return `<div data-tooltip="${slotItem.name}"><img src="${iconLink}" alt="${slot._name}" class="slot-item-thumbnail" data-item-id="${slotItem._id}" /></div>`;
                                        })
                                        .join('');
                                    return `<div class="slot"><div class="break">${slot._name}</div><div class="items">${slotItemsHTML}</div></div>`;
                                }
                            }
                            return '';
                        }).join('');
                    }
                    // Only try to fetch dependencies if we have a template with a Prefab path
                    if (properties && properties.Prefab && properties.Prefab.path) {
                        dependenciesData = await fetchData(DEPENDENCIES, { method: 'GET' });
                        const prefabPath = properties.Prefab.path;

                        // Find dependencies related to this item using Prefab path
                        if (dependenciesData) {
                            const itemDependencies = Object.entries(dependenciesData).filter(([key]) => {
                                if (!prefabPath) return false;
                                const normalizedPrefabPath = prefabPath.toLowerCase();
                                return key.toLowerCase().includes(normalizedPrefabPath);
                            });

                            if (itemDependencies.length > 0) {
                                const path = itemDependencies[0][0];
                                const deps = itemDependencies[0][1].Dependencies;

                                dependenciesHTML = `
                                    <div class="dependencies card">
                                        <div class="dep-item">
                                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                                <h3>Dependency</h3>
                                                <button class="btn btn-sm btn-info copy-deps">
                                                    <i class="bi bi-clipboard"></i> Copy
                                                </button>
                                            </div>
                                            <figure>
                                                <figcaption class="blockquote-footer">
                                                    Location: EscapeFromTarkov_Data/StreamingAssets/Windows/Windows.json
                                                </figcaption>
                                            </figure>
                                            <p>Asset Path: <span class="global-id">${path}</span></p>
                                            <p>CRC: <span class="global-id">${itemDependencies[0][1].Crc}</span></p>
                                            <div class="list-group">
                                                ${deps.map(dep =>
                                    `<div class="list-group-item"><span class="global-id">${dep}</span></div>`
                                ).join(' ')}
                                            </div>
                                        </div>
                                    </div>`;
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn('Could not load items.json template data:', error.message);
                // Continue without template data - this is not critical for basic item display
            } const categories = itemData.categories;

            // Create JSON for copying dependencies only if we have the necessary data
            let prefabPath = '';
            if (properties && properties.Prefab && properties.Prefab.path) {
                prefabPath = properties.Prefab.path;
            }
            let dependencyData = {
                key: prefabPath,
                dependencyKeys: []
            };

            // Only process dependencies if we have both a prefab path and dependency data
            if (prefabPath && dependenciesData) {
                // Find dependencies related to this item using Prefab path
                const itemDependencies = Object.entries(dependenciesData).filter(([key]) => {
                    const normalizedPrefabPath = prefabPath.toLowerCase();
                    return key.toLowerCase().includes(normalizedPrefabPath);
                });

                if (itemDependencies.length > 0) {
                    const path = itemDependencies[0][0];
                    const deps = itemDependencies[0][1].Dependencies;

                    dependenciesHTML = `
                        <div class="dependencies card">
                            <div class="dep-item">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <h3>Dependency</h3>
                                    <button class="btn btn-sm btn-info copy-deps">
                                        <i class="bi bi-clipboard"></i> Copy
                                    </button>
                                </div>
                                <figure>
                                    <figcaption class="blockquote-footer">
                                        Location: EscapeFromTarkov_Data/StreamingAssets/Windows/Windows.json
                                    </figcaption>
                                </figure>
                                <p>Asset Path: <span class="global-id">${path}</span></p>
                                <p>CRC: <span class="global-id">${itemDependencies[0][1].Crc}</span></p>
                                <div class="list-group">
                                    ${deps.map(dep =>
                        `<div class="list-group-item"><span class="global-id">${dep}</span></div>`
                    ).join(' ')}
                                </div>
                            </div>
                        </div>`;
                }
            }// Generate allowed ammo HTML if it exists in item data
            let allowedAmmoHTML = '';
            if (itemData.properties && itemData.properties.allowedAmmo && itemData.properties.allowedAmmo.length > 0) {
                try {
                    const ammoItems = itemData.properties.allowedAmmo.map(ammo =>
                        `<a href="?item=${ammo.id}" class="ammo-item" data-tooltip="${ammo.name}">
                            <img src="data/icons/${ammo.id}-icon.webp" alt="${ammo.name}" class="ammo-icon" />
                        </a>`
                    ).join('');

                    if (ammoItems) {
                        allowedAmmoHTML = `<div class="allowed-ammo card">
                            <figure>
                                <figcaption class="blockquote-footer">Compatible Ammunition</figcaption>
                            </figure>
                            <div class="ammo-list">${ammoItems}</div>
                        </div>`;
                    }
                } catch (error) {
                    console.error('Error generating allowed ammo HTML:', error);
                }
            }// Slots HTML is now generated earlier if the template exists

            const categoriesHTML = categories.map(category => `<li class="list-group-item"><strong>${category.name}</strong><span class="global-id">${category.id}</span></li>`).join('');
            const barters = itemData.buyFor;
            const bartersHTML = barters.map(barter => barter.vendor.name === "Flea Market" ? '' : `<div class="barter"><strong>${barter.vendor.name}</strong> - ${barter.price} ${barter.currency}</div>`).join('');

            const image512pxLink = itemData.image512pxLink ? itemData.image512pxLink.replace(/^.*\/data\/images\//, 'data/images/') : '';

            try {
                const handbookData = await fetchData(HANDBOOK_URL, { method: 'GET' });
                const itemDataHandbook = handbookData.Items.find(item => item.Id === itemId);
                const parentId = itemDataHandbook ? itemDataHandbook.ParentId : 'N/A';

                let masteringName = '';
                let presetId = '';
                let presetName = ''; let presetItemsHTML = '';

                // Get mastering and preset data if the item is a weapon or armor
                if (categories.some(category =>
                    category.name === "Weapon" ||
                    category.name === "Chest rig" ||
                    category.name === "Headwear" ||
                    category.name === "Armor")
                ) {
                    try {
                        const globalsData = await fetchData(GLOBALS, { method: 'GET' });

                        // Look for mastering info
                        if (globalsData.Mastering) {
                            const mastering = globalsData.Mastering.find(master =>
                                master.Templates.includes(itemId)
                            );
                            if (mastering) {
                                masteringName = mastering.Name;
                            }
                        }

                        // Look for preset info
                        if (globalsData.ItemPresets) {
                            const itemPreset = Object.values(globalsData.ItemPresets).find(preset =>
                                preset._encyclopedia === itemId
                            );
                            if (itemPreset) {
                                presetId = itemPreset._id;
                                presetName = itemPreset._name;
                            }
                        }
                    } catch (error) {
                        console.error('Error fetching globals data:', error);
                        // Continue without globals data
                    }
                } let armorClassHTML = '';
                if (properties && properties.armorClass > 0) {
                    armorClassHTML = `armor-exist armor-class-${properties.armorClass}`;
                }

                handbookContent.innerHTML = `
                    <div class="d-flex handbook-item">
                        <div class="main card ${armorClassHTML}">
                            <div class="top">
                                <div class="left">
                                    <div class="handbook-image">
                                        ${fleaBanHTML}
                                        <div class="stripes"></div>
                                        <img src="${image512pxLink}" alt="Handbook image" />
                                    </div>
                                </div>
                                <div class="right">
                                    <h3 class="title">${itemElement.textContent}</h3>
                                    <figure>
                                        <figcaption class="blockquote-footer">
                                            ${masteringName ? `Mastering Name: ${masteringName} /` : ''} Short Name: ${itemData.shortName} / Weight: ${itemData.weight} / Base Price: <span class="global-id">${itemData.basePrice}</span>
                                        </figcaption>
                                    </figure>
                                    ${presetId ? `<div class="preset-available"><h5>Default Preset: ${presetName}</h5><figure><figcaption class="blockquote-footer">Preset ID: <span class="global-id">${presetId}</span></figcaption></figure><div class="preset-items">${presetItemsHTML}</div></div>` : ''}
                                    <p class="desc">${itemData.description}</p>
                                    <div class="hb-parent-id">
                                        <figure>
                                            <figcaption class="blockquote-footer">Handbook Parent ID: <span class="global-id">${parentId}</span></figcaption>
                                        </figure>
                                    </div>
                                    <div class="links">
                                        <a class="btn btn-info strong" href="${itemData.wikiLink}" target="_blank"><i class="bi bi-book"></i> Wiki</a>
                                        <div class="handbook-barters">${bartersHTML}</div>
                                    </div>
                                </div>
                            </div>
                            <div class="slots-filter">
                                ${slotsHTML}
                            </div>
                            ${dependenciesHTML}
                        </div>
                        <div class="handbook-side double-column">
                            ${allowedAmmoHTML}
                            ${usedInTasksHTML}
                            <div class="categories card">
                                <figure>
                                    <figcaption class="blockquote-footer"> Parent Categories</figcaption>
                                </figure>
                                <ol class="list-group">${categoriesHTML}</ol>
                            </div>
                        </div>
                    </div>
                `;

                handbookNavLink.classList.remove('disabled');

                // Add event listener for search-result-link
                document.addEventListener('click', function (event) {
                    const link = event.target.closest('.search-result-link');
                    if (link) {
                        event.preventDefault();
                        const dataLink = link.getAttribute('data-link');
                        itemSearchInput.value = dataLink;
                        fetchItemData(dataLink);
                    }
                });

                // Add event listener for slot-item-thumbnail
                document.querySelectorAll('.slot-item-thumbnail').forEach(slotItem => {
                    slotItem.addEventListener('click', () => {
                        const itemId = slotItem.dataset.itemId;
                        fetchItemData(itemId);
                        checkJsonEditorSimple();
                        window.scrollTo({ top: 0, behavior: "smooth" });
                    });
                });

            } catch (error) {
                console.error('Error fetching handbook data:', error);
                handbookContent.innerHTML = '<p>Error fetching handbook data.</p>';
            }
        } catch (error) {
            console.error('Error fetching item data:', error);
            handbookContent.innerHTML = '<p>Error fetching item data.</p>';
        }
    }; const fetchItemJsonTemplate = async (itemId) => {
        try {
            const data = await fetchData(ITEMS_URL, { method: 'GET' });
            templateLoader.style.display = 'none';

            if (data && typeof data === 'object') {
                const itemTemplate = data[itemId];
                if (itemTemplate) {
                    if (typeof editor !== 'undefined' && editor) {
                        editor.setValue(JSON.stringify(itemTemplate, null, 2));
                    }
                    templateNavLink.classList.remove('disabled');
                } else {
                    if (typeof editor !== 'undefined' && editor) {
                        editor.setValue('No JSON template found for this item.');
                    }
                    templateNavLink.classList.add('disabled');
                }
            } else {
                if (typeof editor !== 'undefined' && editor) {
                    editor.setValue('Invalid data format.');
                }
                templateNavLink.classList.add('disabled');
            }
        } catch (error) {
            console.warn('Could not load JSON template:', error.message);
            templateLoader.style.display = 'none';
            if (typeof editor !== 'undefined' && editor) {
                editor.setValue('JSON template unavailable (this is normal if items.json cannot be cached).');
            }
            templateNavLink.classList.add('disabled');
        }
    };

    searchResults.addEventListener('click', (event) => {
        if (event.target && event.target.matches('li.list-group-item')) {
            const itemElement = event.target.closest('li.list-group-item');
            displayItemDetails(itemElement);
            handbookNavLink.classList.add('active'); // Changed from templateNavLink
            searchResultsCont.style.display = "none";
            handbookContainer.style.display = 'block'; // Changed from templateContainer
            breadcrumb.style.display = 'block';
        }
    });

    const typesEnum = Object.freeze({
        AmmoPacks: "Ammo packs",
        AssaultCarbines: "Assault carbines",
        AssaultRifles: "Assault rifles",
        AuxiliaryParts: "Auxiliary parts",
        Backpacks: "Backpacks",
        Barrels: "Barrels",
        BarterItems: "Barter items",
        Bipods: "Bipods",
        BodyArmor: "Body armor",
        ChargingHandles: "Charging handles",
        Drinks: "Drinks",
        Eyewear: "Eyewear",
        Facecovers: "Facecovers",
        FlammableMaterials: "Flammable materials",
        FlashhidersBrakes: "Flashhiders & brakes",
        Flashlights: "Flashlights",
        Food: "Food",
        Foregrips: "Foregrips",
        GasBlocks: "Gas blocks",
        GearComponents: "Gear components",
        GrenadeLaunchers: "Grenade launchers",
        Handguards: "Handguards",
        Headgear: "Headgear",
        Headsets: "Headsets",
        InfoItems: "Info items",
        Keys: "Keys",
        LightLaserDevices: "Light & laser devices",  // Changed to match the API category name
        MachineGuns: "Machine guns",
        Magazines: "Magazines",
        Maps: "Maps",
        MarksmanRifles: "Marksman rifles",
        Medication: "Medication",
        MeleeWeapons: "Melee weapons",
        Money: "Money",
        Mounts: "Mounts",
        PistolGrips: "Pistol grips",
        Pistols: "Pistols",
        ReceiversSlides: "Receivers & slides",
        SMGs: "SMGs",
        SecureContainers: "Secure containers",
        Shotguns: "Shotguns",
        Sights: "Sights",
        SpecialEquipment: "Special equipment",
        SpecialWeapons: "Special weapons",
        StocksChassis: "Stocks & chassis",
        StorageContainers: "Storage containers",
        Suppressors: "Suppressors",
        TacticalRigs: "Tactical rigs",
        Throwables: "Throwables",
        Valuables: "Valuables"
    });

    const typesToGroup = new Set([
        typesEnum.AmmoPacks,
        typesEnum.Barrels,
        typesEnum.ChargingHandles,
        typesEnum.FlashhidersBrakes,
        typesEnum.GasBlocks,
        typesEnum.Handguards,
        typesEnum.Magazines,
        typesEnum.PistolGrips,
        typesEnum.ReceiversSlides,
        typesEnum.Sights,
        typesEnum.StocksChassis,
        typesEnum.Suppressors
    ]);

    let currentPage = 1;
    let browseItemsData = [];
    let filteredItemsData = []; // New variable for filtered data
    const itemsPerPageDefault = 63;
    let itemsPerPage = itemsPerPageDefault;

    const paginate = (items, currentPage, itemsPerPage) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return items.slice(startIndex, endIndex);
    };

    const renderPaginationControls = (totalItems, perPage) => {
        const totalPages = Math.ceil(totalItems / perPage);

        let paginationHTML = '<div id="browsePagination">';
        if (totalPages > 1) {
            paginationHTML += '<nav aria-label="Page navigation"><ul class="pagination pagination-sm">';
            for (let i = 1; i <= totalPages; i++) {
                paginationHTML += `
                    <li class="page-item ${i === currentPage ? 'active' : ''}">
                        <a href="javascript:void(0);" class="page-link" data-page="${i}">${i}</a>
                    </li>`;
            }
            paginationHTML += '</ul></nav>';
        }
        paginationHTML += '</div>';
        return paginationHTML;
    };

    const createItemElement = (item) => {
        const itemIconLink = item.iconLink.replace(/^.*\/data\/icons\//, 'data/icons/');
        const itemElement = document.createElement('a');
        itemElement.href = "javascript:void(0);";
        itemElement.className = "browse-item card-bfx";
        itemElement.dataset.itemId = item.id;
        itemElement.innerHTML = `
            <div class="card-body">
                <img class="small-glow" src="${itemIconLink}" alt="${item.name}" width="46" height="46" />
                <div class="item-title">
                    <h4>${item.name}</h4>
                </div>
            </div>
        `;
        return itemElement;
    };

    let isRendering = false; // Add a flag to prevent multiple calls
    let isAttachingListeners = false; // Add a flag to prevent multiple calls to attachEventListeners

    const renderBrowseItems = () => {
        if (isRendering) return; // If already rendering, exit the function
        isRendering = true; // Set the flag to true

        const itemsToDisplay = filteredItemsData.length > 0 ? filteredItemsData : browseItemsData;
        const currentItemType = document.querySelector('.browse-category.active').dataset.itemType.replace(/-/g, ' ');
        const shouldGroupItems = typesToGroup.has(currentItemType);

        // Adjust itemsPerPage based on grouping
        itemsPerPage = shouldGroupItems ? 30 : itemsPerPageDefault;

        const paginatedItems = paginate(itemsToDisplay, currentPage, itemsPerPage);
        const fragment = document.createDocumentFragment();

        if (shouldGroupItems) {
            // Group items by the first word in their name
            const groupedItems = paginatedItems.reduce((groups, item) => {
                const firstWord = item.name.split(' ')[0];
                if (!groups[firstWord]) {
                    groups[firstWord] = [];
                }
                groups[firstWord].push(item);
                return groups;
            }, {});

            // Render grouped items
            Object.keys(groupedItems).forEach(group => {
                const groupTitle = document.createElement('div');
                groupTitle.className = 'break group-title';
                groupTitle.innerHTML = `<h4>${group}</h4>`;
                fragment.appendChild(groupTitle);

                groupedItems[group].forEach(item => {
                    const itemElement = createItemElement(item);
                    fragment.appendChild(itemElement);
                });
            });
        } else {
            // Render items without grouping
            paginatedItems.forEach(item => {
                const itemElement = createItemElement(item);
                fragment.appendChild(itemElement);
            });
        }

        browseItems.innerHTML = ''; // Clear existing items
        browseItems.appendChild(searchFilter); // Ensure search filter is at the top
        browseItems.appendChild(fragment);
        browseItems.insertAdjacentHTML('beforeend', renderPaginationControls(itemsToDisplay.length, itemsPerPage));

        if (!isAttachingListeners) {
            isAttachingListeners = true;
            requestIdleCallback(() => {
                attachEventListeners();
                isAttachingListeners = false;
            }); // Defer attaching event listeners
        }

        isRendering = false; // Reset the flag after rendering is complete
    };

    const debounce = (func, delay) => {
        let debounceTimer;
        return function () {
            const context = this;
            const args = arguments;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(context, args), delay);
        };
    }; const debouncedRenderBrowseItems = searchOptimizer.debounce(renderBrowseItems, 200);

    const handleSearch = searchOptimizer.debounce((event) => {
        const searchTerm = event.target.value.toLowerCase();
        if (searchTerm.length > 2) {
            // Use optimized search for browse filtering
            filteredItemsData = searchOptimizer.fastSearch(searchTerm, searchIndex, browseItemsData);
            currentPage = 1; // Reset to the first page on search
            renderBrowseItems();
        } else if (searchTerm.length === 0) {
            filteredItemsData = [];
            renderBrowseItems();
        }
    }, 300); // Slightly longer debounce for browse search

    const attachEventListeners = () => {
        document.querySelectorAll('#browseItems .browse-item').forEach(itemElement => {
            itemElement.addEventListener('click', () => {
                const itemId = itemElement.dataset.itemId;
                fetchItemData(itemId);
                checkJsonEditorSimple();
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        });

        document.querySelectorAll('#browsePagination .page-link').forEach(pageLink => {
            pageLink.addEventListener('click', (event) => {
                event.preventDefault();
                currentPage = parseInt(event.target.dataset.page, 10);
                renderBrowseItems();
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        });

        const browseSearchInput = document.getElementById('browseSearchInput');
        if (browseSearchInput) {
            browseSearchInput.removeEventListener('input', handleSearch); // Prevent duplicate listeners
            browseSearchInput.addEventListener('input', handleSearch);
        }

        document.querySelectorAll('.browse-category').forEach(categoryElement => {
            categoryElement.addEventListener('click', () => {
                document.querySelectorAll('.browse-category').forEach(el => el.classList.remove('active'));
                categoryElement.classList.add('active');
                const itemType = categoryElement.dataset.itemType;
                lastActiveCategory = itemType; // Store the category name with hyphens
                fetchBrowseData(itemType.replace(/-/g, ' ')); // Convert to spaces for data fetching
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        });
    };

    const categoryCache = {};

    const fetchBrowseData = (itemType) => {
        browseItems.innerHTML = '<div id="activityContent"><span class="loader"></span></div>';
        currentPage = 1;

        if (categoryCache[itemType]) {
            browseItemsData = categoryCache[itemType];
            filteredItemsData = [];
            requestIdleCallback(debouncedRenderBrowseItems);
            return;
        }        // Use the mapping if it exists, otherwise use a normalized version of the input
        const apiCategoryName = categoryNameMapping[itemType] || itemType;

        // Use cached category data if available
        const loadBrowseData = async () => {
            // Ensure game data is loaded
            if (!gameDataCache) {
                await preloadGameData();
            }

            // Try to use optimized category filter first
            if (categoryFilterMap && categoryFilterMap.has(apiCategoryName)) {
                browseItemsData = categoryFilterMap.get(apiCategoryName);
            } else {
                // Fallback to manual filtering
                const items = itemsArrayCache || Object.values(gameDataCache.items);
                browseItemsData = items.filter(item =>
                    item.handbookCategories.some(category => {
                        // Try exact match first with the API category name
                        return category.name === apiCategoryName ||
                            // Fallback to normalized comparison for other categories
                            category.name.replace(/\s*\/\s*/g, '/') === itemType.replace(/\s*\/\s*/g, '/');
                    })
                );
            }

            browseItemsData.sort((a, b) => a.name.localeCompare(b.name));
            categoryCache[itemType] = browseItemsData;
            filteredItemsData = [];
            requestIdleCallback(debouncedRenderBrowseItems);
        };

        loadBrowseData().catch(error => {
            console.error('Error fetching data:', error);
            browseItems.innerHTML = 'Error fetching data.';
        });
    };

    Object.values(typesEnum).forEach(type => {
        const browseItem = document.createElement('div');
        browseItem.className = 'browse-category';
        browseItem.dataset.itemType = type.replace(/\s+/g, '-');
        browseItem.innerHTML = `${type}`;
        browseSidebar.appendChild(browseItem);
    });

    const firstCategory = document.querySelector('.browse-category');
    if (firstCategory) {
        firstCategory.classList.add('active');
        const itemType = firstCategory.dataset.itemType.replace(/-/g, ' ');
        fetchBrowseData(itemType);
    }

    function toggleContainers(activeContainer, ...containers) {
        const isActive = activeContainer.style.display === 'block';

        // Hide all containers
        containers.forEach(container => {
            const navLinkId = container.id.replace('Container', 'NavLink');
            document.getElementById(navLinkId).classList.remove('active');
            container.style.display = 'none';
        });

        // Toggle the active container based on its current visibility
        if (!isActive) {
            activeContainer.style.display = 'block';
            const activeNavLinkId = activeContainer.id.replace('Container', 'NavLink');
            document.getElementById(activeNavLinkId).classList.add('active');

            // When switching to browse container
            if (activeContainer.id === 'browseContainer') {
                const activeCategory = lastActiveCategory || 'Ammo-packs';
                const categoryElement = document.querySelector(`#browseSidebar .browse-category[data-item-type="${activeCategory}"]`);

                if (categoryElement) {
                    document.querySelectorAll('#browseSidebar .browse-category').forEach(category =>
                        category.classList.remove('active')
                    );
                    categoryElement.classList.add('active');

                    // Convert the category name format properly for fetching data
                    const formattedCategory = activeCategory.replace(/-/g, ' ');
                    fetchBrowseData(formattedCategory);
                }
            }
        }
    } templateNavLink.addEventListener('click', (event) => {
        event.preventDefault();
        // Only switch to template view if the template tab is not disabled
        if (!templateNavLink.classList.contains('disabled')) {
            toggleContainers(templateContainer, templateContainer, handbookContainer, browseContainer);
            if (editor) {
                editor.refresh();
                checkJsonEditorSimple();
            }
        }
    });

    handbookNavLink.addEventListener('click', (event) => {
        event.preventDefault();
        toggleContainers(handbookContainer, templateContainer, handbookContainer, browseContainer);
    });

    browseNavLink.addEventListener('click', (event) => {
        event.preventDefault();
        toggleContainers(browseContainer, templateContainer, handbookContainer, browseContainer);
        toggleNav.classList.add('inactive');
        breadcrumb.style.display = 'none';
    });

    attachEventListeners();

});