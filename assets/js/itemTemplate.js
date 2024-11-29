import { checkJsonEditor, checkJsonEditorSimple } from './checkJsonEditor.js';
import { fetchData } from './cache.js';
import { DATA_URL, QUESTS_URL, ITEMS_URL, HANDBOOK_URL, GLOBALS, SUITS, FLEAPRICES, DEPENDENCIES } from './localData.js';

document.addEventListener('DOMContentLoaded', () => {

    const itemSearchInput = document.getElementById('itemSearchInput');
    const handbookContent = document.getElementById('handbookContent');
    const searchResultsCont = document.querySelector('.searchResults');
    const searchResults = document.querySelector('.searchResults .list-group');
    const spinner = document.querySelector('#activity');
    const breadcrumb = document.getElementById('breadcrumb');

    const templateNavLink = document.getElementById('templateNavLink');
    const handbookNavLink = document.getElementById('handbookNavLink');
    const browseNavLink = document.getElementById('browseNavLink');

    const toggleNav = document.getElementById('toggleNav');
    const templateContainer = document.getElementById('templateContainer');
    const handbookContainer = document.getElementById('handbookContainer');

    const browseContainer = document.getElementById('browseContainer');
    const browseSidebar = document.getElementById('browseSidebar');
    const browseItems = document.getElementById('browseItems');


    checkJsonEditor();

    let localItems = {};

    spinner.style.display = 'none';

    fetch(ITEMS_URL)
        .then(response => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then(data => { localItems = data; })
        .catch(error => console.error('Error loading local items:', error));

    itemSearchInput.addEventListener('input', () => {
        const query = itemSearchInput.value.trim();
        if (query.length > 2) {
            fetchItemData(query);
        } else {
            handbookContent.innerHTML = '';
            searchResults.innerHTML = '';
        }
        checkJsonEditorSimple();
    });

    const inMemoryCache = {};

    const fetchData = async (url, options) => {
        const cacheKey = url.split('/').pop(); // Use the filename as the cache key

        if (url.includes('graphql')) {
            const queryHash = JSON.stringify(options.body); // Use the query as part of the cache key
            const graphqlCacheKey = `graphql-${queryHash}`;

            if (inMemoryCache[graphqlCacheKey]) {
                return inMemoryCache[graphqlCacheKey];
            }

            try {
                const response = await fetch(url, options);
                const data = await response.json();
                inMemoryCache[graphqlCacheKey] = data;
                return data;
            } catch (error) {
                console.error(`Error fetching GraphQL data:`, error);
                throw error;
            }
        }

        if (url === DATA_URL) {
            const cachedData = localStorage.getItem(cacheKey);
            if (cachedData) {
                return JSON.parse(cachedData);
            }
        } else {
            if (inMemoryCache[cacheKey]) {
                return inMemoryCache[cacheKey];
            }
        }

        try {
            const response = await fetch(url, options);
            const data = await response.json();

            if (url === DATA_URL) {
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(data));
                } catch (e) {
                    if (e.name === 'QuotaExceededError') {
                        console.warn('Local storage quota exceeded. Clearing local storage.');
                        localStorage.clear();
                        localStorage.setItem(cacheKey, JSON.stringify(data));
                    } else {
                        throw e;
                    }
                }
            } else {
                inMemoryCache[cacheKey] = data;
            }

            return data;
        } catch (error) {
            console.error(`Error fetching data from ${url}:`, error);
            throw error;
        }
    };

    const fetchItemData = async (query) => {
        const isId = /^[0-9a-fA-F]{24}$/.test(query);
        spinner.style.display = 'inline-block';

        try {
            const data = await fetchData(DATA_URL, { method: 'GET' });
            spinner.style.display = 'none';
            const itemsArray = Object.values(data.items);
            const filteredItems = isId
                ? itemsArray.filter(item => item.id === query)
                : itemsArray.filter(item => item.name.toLowerCase().includes(query.toLowerCase()));

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
    };

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

    const displayItemDetails = async (itemElement) => {
        const { itemId, itemTypes, usedInTasks } = itemElement.dataset;


        templateNavLink.classList.add('active');
        toggleContainers(templateContainer, templateContainer, handbookContainer, browseContainer);

        toggleNav.classList.remove('inactive');

        const breadcrumbHTML = itemTypes.split(',')
            .reverse()
            .map(type => `${type}`)
            .join(' <i class="bi bi-caret-right-fill"></i> ') + ' <i class="bi bi-caret-right-fill"></i> ' + itemElement.textContent;
        breadcrumb.innerHTML = "<div class='breadcrumb-container'>" + breadcrumbHTML + "</div>";

        let usedInTasksHTML = '';
        if (usedInTasks) {
            try {
                const data = await fetchData(DATA_URL, { method: 'GET' });
                const taskIds = usedInTasks.split(',');
                const tasks = taskIds.map(taskId => {
                    const taskInfo = data.items[itemId].usedInTasks.find(task => task.id === taskId);
                    return taskInfo ? `<li class="list-group-item"><strong>${taskInfo.name}</strong> - <span class="global-id">${taskId}</span></li>` : null;
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
    };

    const updateHandbookContent = async (itemElement, usedInTasksHTML) => {
        try {
            const itemId = itemElement.dataset.itemId;
            const data = await fetchData(DATA_URL, { method: 'GET' });
            const itemData = data.items[itemId];
            const categories = itemData.categories;
            let slotsHTML = '';

            const properties = itemData.properties;
            if (properties && properties.slots) {
                slotsHTML = properties.slots.map(slot => `<span class="global-id">${slot.nameId}</span>`).join('');
            }

            const categoriesHTML = categories.map(category => `<li class="list-group-item"><strong>${category.name}</strong> - <span class="global-id">${category.id}</span></li>`).join('');
            const barters = itemData.buyFor;
            const bartersHTML = barters.map(barter => barter.vendor.name === "Flea Market" ? '' : `<div class="barter"><strong>${barter.vendor.name}</strong> - ${barter.price} ${barter.currency}</div>`).join('');

            const image512pxLink = itemData.image512pxLink.replace(/^.*\/data\/images\//, 'data/images/');

            try {
                const handbookData = await fetchData(HANDBOOK_URL, { method: 'GET' });
                const itemDataHandbook = handbookData.Items.find(item => item.Id === itemId);
                const parentId = itemDataHandbook ? itemDataHandbook.ParentId : 'N/A';

                let masteringName = '';
                let presetId = '';
                let presetName = '';
                let presetItemsHTML = '';
                if (categories.some(category => category.name === "Weapon" || category.name === "Chest rig")) {
                    const globalsData = await fetchData(GLOBALS, { method: 'GET' });
                    const mastering = globalsData.config.Mastering.find(master => master.Templates.includes(itemId));
                    if (mastering) {
                        masteringName = mastering.Name;
                    }

                    const itemPreset = Object.values(globalsData.ItemPresets).find(preset => preset._encyclopedia === itemId);
                    if (itemPreset) {
                        presetId = itemPreset._id;

                        presetItemsHTML = itemPreset._items.slice(1).map(item => {
                            const iconLink = `data/icons/${item._tpl}-icon.webp`;
                            const presetLink = item._tpl;
                            return `
                                <div class="preset-item">
                                    <a href="javascript:void(0)" class="search-result-link" data-link="${presetLink}">
                                        <img src="${iconLink}" alt="Preset item image" />
                                        <span class="slot-id">${item.slotId}</span>
                                    </a>
                                </div>
                            `;
                        }).join('');
                        presetName = itemPreset._name;
                    }
                }

                handbookContent.innerHTML = `
                    <div class="d-flex handbook-item">
                        <div class="left">
                            <div class="handbook-image">
                                <div class="stripes"></div>
                                <img src="${image512pxLink}" alt="Handbook image" />
                            </div>
                            <div class="links">
                                <a class="btn btn-info strong" href="${itemData.wikiLink}" target="_blank"><i class="bi bi-book"></i> Wiki</a>
                                <div class="handbook-barters">${bartersHTML}</div>
                            </div>
                        </div>
                        <div class="right">
                            <div class="main card">
                                <h3 class="title">${itemElement.textContent}</h3>
                                <figure>
                                    <figcaption class="blockquote-footer">
                                      ${masteringName ? `Mastering Name: ${masteringName} /` : ''} Short Name: ${itemData.shortName} / Weight: ${itemData.weight} / Base Price: <span class="global-id">${itemData.basePrice}</span>
                                    </figcaption>
                                </figure>
                                <p class="desc">${itemData.description}</p>
                                <div class="hb-parent-id">
                                    <figure>
                                        <figcaption class="blockquote-footer">Handbook Parent ID: <span class="global-id">${parentId}</span></figcaption>
                                    </figure>
                                </div>
                                ${slotsHTML ? `<h5>Attachment Slots</h5><div class="slots">${slotsHTML}</div>` : ''}
                                ${presetId ? `<div class="preset-available"><h5>Default Preset: ${presetName}</h5><figure><figcaption class="blockquote-footer">Preset ID: <span class="global-id">${presetId}</span></figcaption></figure><div class="preset-items">${presetItemsHTML}</div></div>` : ''}
                            </div>
                            <div class="double-column">
                                ${usedInTasksHTML}
                                <div class="categories card">
                                    <figure>
                                        <figcaption class="blockquote-footer"> Parent Categories</figcaption>
                                    </figure>
                                    <ol class="list-group">${categoriesHTML}</ol>
                                </div>
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

            } catch (error) {
                console.error('Error fetching handbook data:', error);
                handbookContent.innerHTML = '<p>Error fetching handbook data.</p>';
            }
        } catch (error) {
            console.error('Error fetching item data:', error);
            handbookContent.innerHTML = '<p>Error fetching item data.</p>';
        }
    };

    const fetchItemJsonTemplate = async (itemId) => {
        try {
            const data = await fetchData(ITEMS_URL, { method: 'GET' });
            if (data && typeof data === 'object') {
                const itemTemplate = data[itemId];
                editor.setValue(itemTemplate ? JSON.stringify(itemTemplate, null, 2) : 'No JSON template found for this item.');
            } else {
                editor.setValue('Invalid data format.');
            }
        } catch (error) {
            console.error('Error fetching item JSON template:', error);
            editor.setValue('Error fetching item JSON template.');
        }
    };

    searchResults.addEventListener('click', (event) => {
        if (event.target && event.target.matches('li.list-group-item')) {
            const itemElement = event.target.closest('li.list-group-item');
            displayItemDetails(itemElement);
            templateNavLink.classList.add('active');
            searchResultsCont.style.display = "none";
            templateContainer.style.display = 'block';
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
        Launchers: "Launchers",
        LightLaserDevices: "Light/laser devices",
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
        Rounds: "Rounds",
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

    const paginate = (items, currentPage, itemsPerPage) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return items.slice(startIndex, endIndex);
    };
    let currentPage = 1;
    let browseItemsData = [];
    let filteredItemsData = []; // New variable for filtered data
    const itemsPerPage = 50;

    const renderPaginationControls = (totalItems, perPage) => {
        const totalPages = Math.ceil(totalItems / perPage);

        let paginationHTML = '<div id="browsePagination">';
        paginationHTML += `
            <div class="search-filter">
                <input type="text" id="browseSearchInput" placeholder="Filter by name" />
            </div>
        `;

        if (totalPages > 1) {
            paginationHTML += '<nav aria-label="Page navigation"><ul class="pagination pagination-sm">';
            for (let i = 1; i <= totalPages; i++) {
                paginationHTML += `
                    <li class="page-item ${i === currentPage ? 'active' : ''}">
                        <a href="javascript:void(0);" class="page-link">${i}</a>
                    </li>`;
            }
            paginationHTML += '</ul></nav>';
        }

        paginationHTML += '</div>';
        return paginationHTML;
    };

    const renderBrowseItems = () => {
        const itemsToDisplay = filteredItemsData.length > 0 ? filteredItemsData : browseItemsData;
        const paginatedItems = paginate(itemsToDisplay, currentPage, itemsPerPage);
        let browseHTML = '';

        paginatedItems.forEach(item => {
            const itemIconLink = item.iconLink.replace(/^.*\/data\/icons\//, 'data/icons/');
            browseHTML += `
                <a href="javascript:void(0);" class="browse-item card-bfx" data-item-id="${item.id}">
                    <div class="card-body">
                        <img class="small-glow" width="46" height="46" src="${itemIconLink}" alt="${item.name}" />
                        <div class="item-title">
                            <h4>${item.name}</h4>
                        </div>
                    </div>
                </a>
            `;
        });

        browseHTML += renderPaginationControls(itemsToDisplay.length, itemsPerPage);
        browseItems.innerHTML = browseHTML;

        attachEventListeners();
    };

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
                currentPage = parseInt(event.target.textContent, 10);
                renderBrowseItems();
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        });

        const browseSearchInput = document.getElementById('browseSearchInput');
        if (browseSearchInput) {
            browseSearchInput.removeEventListener('change', handleSearch); // Prevent duplicate listeners
            browseSearchInput.addEventListener('change', handleSearch);
        }

        document.querySelectorAll('.browse-category').forEach(categoryElement => {
            categoryElement.addEventListener('click', () => {
                document.querySelectorAll('.browse-category').forEach(el => el.classList.remove('active'));
                categoryElement.classList.add('active');
                const itemType = categoryElement.dataset.itemType.replace(/-/g, ' ');
                fetchBrowseData(itemType);
            });
        });
    };


    const handleSearch = (event) => {
        const searchTerm = event.target.value.toLowerCase();
        filteredItemsData = browseItemsData.filter(item => item.name.toLowerCase().includes(searchTerm));
        currentPage = 1; // Reset to the first page on search
        renderBrowseItems();
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const fetchBrowseData = (itemType) => {
        browseItems.innerHTML = '<div id="activityContent"><span class="loader"></span></div>';
        currentPage = 1;

        fetchData(DATA_URL, { method: 'GET' })
            .then(data => {
                const items = Object.values(data.items);
                browseItemsData = items.filter(item =>
                    item.handbookCategories.some(category => category.name === itemType)
                );
                browseItemsData.sort((a, b) => a.name.localeCompare(b.name));

                filteredItemsData = []; // Reset filtered data
                renderBrowseItems();
            })
            .catch(error => {
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

    attachEventListeners();


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

            // Additional logic when browseContainer is activated
            if (activeContainer.id === 'browseContainer') {
                const ammoCategory = document.querySelector('#browseSidebar .browse-category[data-item-type="Ammo-packs"]');
                if (ammoCategory) {
                    document.querySelectorAll('#browseSidebar .browse-category').forEach(category => category.classList.remove('active'));
                    ammoCategory.classList.add('active');
                    fetchBrowseData('Ammo packs');
                }
            } else {
                const firstCategory = document.querySelector('#browseSidebar .browse-category');
                if (firstCategory) {
                    document.querySelectorAll('#browseSidebar .browse-category').forEach(category => category.classList.remove('active'));
                    firstCategory.classList.add('active');
                }
            }
        }
    }

    templateNavLink.addEventListener('click', (event) => {
        event.preventDefault();
        toggleContainers(templateContainer, templateContainer, handbookContainer, browseContainer);
    });

    handbookNavLink.addEventListener('click', (event) => {
        event.preventDefault();
        toggleContainers(handbookContainer, templateContainer, handbookContainer, browseContainer);
    });

    browseNavLink.addEventListener('click', (event) => {
        event.preventDefault();
        toggleContainers(browseContainer, templateContainer, handbookContainer, browseContainer);
        toggleNav.classList.add('inactive');
        fetchBrowseData('Ammo packs');
        breadcrumb.style.display = 'none';
    });

});