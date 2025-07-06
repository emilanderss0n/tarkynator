import { fetchData } from "../core/cache.js";
import { searchOptimizer } from "../core/searchOptimizer.js";
import { navigationManager } from "../core/navigationManager.js";
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

let lastActiveCategory = "";
let isNavigationHandlerActive = false;

let gameDataCache = null;
let itemsArrayCache = null;
let searchIndex = null;
let categoryFilterMap = null;

const categoryNameMapping = {
    "Light & laser devices": "LightLaserDevices",
    "Light/laser devices": "LightLaserDevices",
};

document.body.addEventListener("click", function (e) {
    const copyButton = e.target.closest(".copy-deps");
    if (copyButton) {
        const depItem = copyButton.closest(".dep-item");
        const assetPath = depItem.querySelector(
            "p:nth-of-type(1) .global-id"
        ).textContent;
        const dependencyKeys = Array.from(
            depItem.querySelectorAll(".list-group .global-id")
        ).map((el) => el.textContent);

        const jsonOutput = {
            key: assetPath,
            dependencyKeys: dependencyKeys,
        };

        navigator.clipboard
            .writeText(JSON.stringify(jsonOutput, null, 3))
            .then(() => {
                copyButton.innerHTML = '<i class="bi bi-check"></i> Copied!';
                setTimeout(() => {
                    copyButton.innerHTML =
                        '<i class="bi bi-clipboard"></i> Copy';
                }, 2000);
            })
            .catch((err) => {
                console.error("Failed to copy:", err);
                copyButton.innerHTML = '<i class="bi bi-x"></i> Failed';
                setTimeout(() => {
                    copyButton.innerHTML =
                        '<i class="bi bi-clipboard"></i> Copy';
                }, 2000);
            });
    }
});

document.addEventListener("DOMContentLoaded", () => {
    navigationManager.init();

    const itemSearchInput = document.getElementById("itemSearchInput");
    const handbookContent = document.getElementById("handbookContent");
    const searchResultsCont = document.querySelector(".searchResults");
    const searchResults = document.querySelector(".searchResults .list-group");
    const spinner = document.querySelector("#activity");
    const breadcrumb = document.getElementById("breadcrumb");
    const recentSearchesElement = document.getElementById("recentSearches");

    const templateNavLink = document.getElementById("templateNavLink");
    const handbookNavLink = document.getElementById("handbookNavLink");
    const browseNavLink = document.getElementById("browseNavLink");

    const toggleNav = document.getElementById("toggleNav");
    const templateContainer = document.getElementById("templateContainer");
    const handbookContainer = document.getElementById("handbookContainer");
    const templateLoader = document.querySelector(".template-load");

    const browseContainer = document.getElementById("browseContainer");
    const browseSidebar = document.getElementById("browseSidebar");
    const browseItems = document.getElementById("browseItems");

    const searchFilter = document.createElement("div");
    searchFilter.className = "search-filter";
    searchFilter.innerHTML = `
        <input type="text" id="browseSearchInput" class="form-control" placeholder="Search items by name...">
    `;
    browseItems.insertAdjacentElement("afterbegin", searchFilter);

    checkJsonEditor();
    let localItems = {};
    const preloadGameData = async () => {
        if (!gameDataCache) {
            try {
                gameDataCache = await fetchData(DATA_URL, { method: "GET" });
                itemsArrayCache = Object.values(gameDataCache.items);
                searchIndex =
                    searchOptimizer.createSearchIndex(itemsArrayCache);
                categoryFilterMap =
                    searchOptimizer.createCategoryFilter(itemsArrayCache);
            } catch (error) {
                console.error("Error preloading game data:", error);
            }
        }
        return gameDataCache;
    };

    const fastItemSearch = (query) => {
        if (!itemsArrayCache || !searchIndex) return [];
        return searchOptimizer.fastSearch(query, searchIndex, itemsArrayCache);
    };
    spinner.style.display = "none";

    preloadGameData();

    fetch(ITEMS_URL)
        .then((response) => {
            if (!response.ok)
                throw new Error(`HTTP error! status: ${response.status}`);
            return response.json();
        })
        .then((data) => {
            localItems = data;
        })
        .catch((error) => console.error("Error loading local items:", error));

    const fetchItemData = async (query) => {
        const isId = /^[0-9a-fA-F]{24}$/.test(query);
        spinner.style.display = "inline-block";

        try {
            let data = gameDataCache;
            if (!data) {
                data = await preloadGameData();
            }

            spinner.style.display = "none";

            const filteredItems = fastItemSearch(query);

            if (filteredItems.length > 0) {
                updateSearchResults(filteredItems);
            } else {
                displayNoResults("No results found");
            }
        } catch (error) {
            console.error("Error loading local items:", error);
            spinner.style.display = "none";
            displayNoResults("Error loading local items");
        }
    };

    const updateSearchResults = (items) => {
        searchResults.innerHTML = "";
        searchResultsCont.style.display = "inline-block";
        if (items.length > 0) {
            items.forEach((item, index) => createSearchResultItem(item, index));
        } else {
            displayNoResults("No matching results found");
        }
    };

    const createSearchResultItem = (item, index) => {
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

        searchResults.appendChild(listItem);

        setTimeout(() => {
            listItem.classList.add("show");
        }, 100 * index);
    };

    const displayNoResults = (message) => {
        searchResults.innerHTML = `<li class="list-group-item">${message}</li>`;
    };

    const toggleRecentSearchesVisibility = (isVisible) => {
        recentSearchesElement.style.display = isVisible ? "grid" : "none";
    };
    const displayItemDetails = async (itemElement, updateHistory = true) => {
        const { itemId, itemTypes, usedInTasks } = itemElement.dataset;

        if (updateHistory) {
            navigationManager.navigateToItem(itemId, "handbook");
        }

        storeRecentSearch(itemElement);

        const activeCategoryElement = document.querySelector(
            "#browseSidebar .browse-category.active"
        );
        if (activeCategoryElement) {
            lastActiveCategory = activeCategoryElement.dataset.itemType;
        }

        handbookNavLink.classList.add("active");
        handbookNavLink.classList.remove("disabled");
        toggleContainers(
            handbookContainer,
            browseContainer,
            templateContainer,
            handbookContainer
        );

        toggleNav.classList.remove("inactive");

        const types = itemTypes.split(",").reverse();
        const validCategories = new Set(Object.values(typesEnum));
        const breadcrumbHTML =
            types
                .map((type, index) => {
                    const normalizedType = type.trim();
                    const isValidCategory =
                        validCategories.has(normalizedType) ||
                        Object.keys(categoryNameMapping).includes(
                            normalizedType
                        );

                    if (index === types.length - 1 && isValidCategory) {
                        return `<a href="javascript:void(0);" class="breadcrumb-link" data-view="browse" data-category="${
                            Object.entries(typesEnum).find(
                                ([key, value]) => value === normalizedType
                            )?.[0] || normalizedType
                        }">${type}</a>`;
                    } else if (index === 0 || !isValidCategory) {
                        return `<span class="breadcrumb-text">${type}</span>`;
                    } else if (isValidCategory) {
                        const enumKey =
                            Object.entries(typesEnum).find(
                                ([key, value]) => value === normalizedType
                            )?.[0] || normalizedType;
                        return `<a href="javascript:void(0);" class="breadcrumb-link" data-category="${enumKey}">${type}</a>`;
                    } else {
                        return `<span class="breadcrumb-text">${type}</span>`;
                    }
                })
                .join(' <i class="bi bi-caret-right-fill"></i> ') +
            ' <i class="bi bi-caret-right-fill"></i> ' +
            `<span class="breadcrumb-current">${itemElement.textContent}</span>`;

        breadcrumb.innerHTML =
            "<div class='breadcrumb-container'>" + breadcrumbHTML + "</div>";
        breadcrumb.style.display = "block";

        breadcrumb.querySelectorAll(".breadcrumb-link").forEach((link) => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                browseNavLink.click();

                let categoryName = link.dataset.category;

                const mappedName = Object.entries(categoryNameMapping).find(
                    ([key, value]) => value === categoryName
                )?.[0];

                if (mappedName) {
                    categoryName = mappedName.replace(/\s+/g, "-");
                } else if (typesEnum[categoryName]) {
                    categoryName = typesEnum[categoryName].replace(/\s+/g, "-");
                } else {
                    categoryName = categoryName.replace(/\s+/g, "-");
                }

                const categoryElement = document.querySelector(
                    `#browseSidebar .browse-category[data-item-type="${categoryName}"]`
                );
                if (categoryElement) {
                    categoryElement.click();
                }
            });
        });
        let usedInTasksHTML = "";
        if (usedInTasks) {
            try {
                let data = gameDataCache;
                if (!data) {
                    data = await fetchData(DATA_URL, { method: "GET" });
                }

                const taskIds = usedInTasks.split(",");
                const tasks = taskIds
                    .map((taskId) => {
                        const taskInfo = data.items[itemId].usedInTasks.find(
                            (task) => task.id === taskId
                        );
                        return taskInfo
                            ? `<li class="list-group-item"><strong>${taskInfo.name}</strong><span class="global-id">${taskId}</span></li>`
                            : null;
                    })
                    .filter((task) => task !== null)
                    .join("");

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
                console.error("Error fetching tasks data:", error);
                usedInTasksHTML = "<p>Error fetching tasks data.</p>";
            }
        }

        updateHandbookContent(itemElement, usedInTasksHTML);
        searchResults.innerHTML = "";
        itemSearchInput.value = "";
        await fetchItemJsonTemplate(itemId);
        if (editor) {
            editor.refresh();
            checkJsonEditorSimple();
        }

        toggleRecentSearchesVisibility(false);
    };

    const storeRecentSearch = (itemElement) => {
        const recentSearches =
            JSON.parse(localStorage.getItem("recentSearches")) || [];
        const itemData = {
            id: itemElement.dataset.itemId,
            name: itemElement.textContent,
            iconLink: itemElement.querySelector("img").src,
            itemTypes: itemElement.dataset.itemTypes,
            usedInTasks: itemElement.dataset.usedInTasks,
        };

        const existingIndex = recentSearches.findIndex(
            (item) => item.id === itemData.id
        );
        if (existingIndex !== -1) {
            recentSearches.splice(existingIndex, 1);
        }

        recentSearches.unshift(itemData);

        if (recentSearches.length > 8) {
            recentSearches.pop();
        }

        localStorage.setItem("recentSearches", JSON.stringify(recentSearches));
        updateRecentSearches();
    };

    const updateRecentSearches = () => {
        const recentSearches =
            JSON.parse(localStorage.getItem("recentSearches")) || [];
        const fragment = document.createDocumentFragment();

        recentSearches.forEach((item) => {
            const listItem = document.createElement("a");
            listItem.className = "last-search-item card-bfx";
            listItem.href = "javascript:void(0);";
            listItem.innerHTML = `
                <div class="card-body">
                    <img src="${
                        item.iconLink
                    }" alt="${item.name.trim()}" style="width: 50px; height: 50px; margin-right: 10px;">
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

        recentSearchesElement.innerHTML = "";
        recentSearchesElement.appendChild(fragment);
    };

    updateRecentSearches();

    const observer = new MutationObserver(() => {
        const isBrowseContainerVisible =
            browseContainer.style.display !== "none";
        toggleRecentSearchesVisibility(!isBrowseContainerVisible);
    });

    observer.observe(browseContainer, {
        attributes: true,
        attributeFilter: ["style"],
    });
    const updateHandbookContent = async (itemElement, usedInTasksHTML) => {
        try {
            const itemId = itemElement.dataset.itemId;

            let data = gameDataCache;
            if (!data) {
                data = await fetchData(DATA_URL, { method: "GET" });
            }

            const itemData = data.items[itemId];

            if (!itemData) {
                handbookContent.innerHTML =
                    "<p>Item not found in tarkov_data.json</p>";
                return;
            }
            let itemTemplate = null;
            let properties = null;
            let fleaBanHTML = "";
            let dependenciesHTML = "";
            let slotsHTML = "";
            let dependenciesData = null;
            let itemsData = null;

            try {
                itemsData = await fetchData(ITEMS_URL, { method: "GET" });
                if (itemsData && itemsData[itemId]) {
                    itemTemplate = itemsData[itemId];
                }

                if (itemTemplate) {
                    const isFleaBanned =
                        itemTemplate._props &&
                        !itemTemplate._props.CanSellOnRagfair;
                    fleaBanHTML = isFleaBanned
                        ? '<div class="flea-ban flex-box"><div class="icon warning-red"></div><div>Flea Ban</div></div>'
                        : "";

                    properties = itemTemplate._props;

                    if (properties && properties.Slots) {
                        slotsHTML = properties.Slots.map((slot) => {
                            if (slot._props.filters) {
                                const slotItems = slot._props.filters.flatMap(
                                    (filter) =>
                                        filter.Filter
                                            ? filter.Filter.map((filterId) => {
                                                  const slotItem =
                                                      data.items[filterId];
                                                  const itemId =
                                                      itemsData &&
                                                      itemsData[filterId]
                                                          ? itemsData[filterId]
                                                                ._id
                                                          : null;
                                                  return slotItem && itemId
                                                      ? {
                                                            ...slotItem,
                                                            _id: itemId,
                                                        }
                                                      : null;
                                              }).filter(Boolean)
                                            : []
                                );

                                if (slotItems.length > 0) {
                                    const slotItemsHTML = slotItems
                                        .map((slotItem) => {
                                            let iconLink = slotItem.iconLink
                                                ? slotItem.iconLink.replace(
                                                      /^.*\/data\/icons\//,
                                                      "data/icons/"
                                                  )
                                                : "";
                                            if (!iconLink) {
                                                iconLink = `assets/img/slots/${slot._name.toLowerCase()}.png`;
                                            }
                                            return `<div data-tooltip="${slotItem.name}"><img src="${iconLink}" alt="${slot._name}" class="slot-item-thumbnail" data-item-id="${slotItem._id}" /></div>`;
                                        })
                                        .join("");
                                    return `<div class="slot"><div class="break">${slot._name}</div><div class="items">${slotItemsHTML}</div></div>`;
                                }
                            }
                            return "";
                        }).join("");
                    }

                    if (
                        properties &&
                        properties.Prefab &&
                        properties.Prefab.path
                    ) {
                        dependenciesData = await fetchData(DEPENDENCIES, {
                            method: "GET",
                        });
                        const prefabPath = properties.Prefab.path;

                        if (dependenciesData) {
                            const itemDependencies = Object.entries(
                                dependenciesData
                            ).filter(([key]) => {
                                if (!prefabPath) return false;
                                const normalizedPrefabPath =
                                    prefabPath.toLowerCase();
                                return key
                                    .toLowerCase()
                                    .includes(normalizedPrefabPath);
                            });

                            if (itemDependencies.length > 0) {
                                const path = itemDependencies[0][0];
                                const deps =
                                    itemDependencies[0][1].Dependencies;

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
                                            <p>CRC: <span class="global-id">${
                                                itemDependencies[0][1].Crc
                                            }</span></p>
                                            <div class="list-group">
                                                ${deps
                                                    .map(
                                                        (dep) =>
                                                            `<div class="list-group-item"><span class="global-id">${dep}</span></div>`
                                                    )
                                                    .join(" ")}
                                            </div>
                                        </div>
                                    </div>`;
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn(
                    "Could not load items.json template data:",
                    error.message
                );
            }
            const categories = itemData.categories;

            let prefabPath = "";
            if (properties && properties.Prefab && properties.Prefab.path) {
                prefabPath = properties.Prefab.path;
            }
            let dependencyData = {
                key: prefabPath,
                dependencyKeys: [],
            };

            if (prefabPath && dependenciesData) {
                const itemDependencies = Object.entries(
                    dependenciesData
                ).filter(([key]) => {
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
                                <p>CRC: <span class="global-id">${
                                    itemDependencies[0][1].Crc
                                }</span></p>
                                <div class="list-group">
                                    ${deps
                                        .map(
                                            (dep) =>
                                                `<div class="list-group-item"><span class="global-id">${dep}</span></div>`
                                        )
                                        .join(" ")}
                                </div>
                            </div>
                        </div>`;
                }
            }
            let allowedAmmoHTML = "";
            if (
                itemData.properties &&
                itemData.properties.allowedAmmo &&
                itemData.properties.allowedAmmo.length > 0
            ) {
                try {
                    const ammoItems = itemData.properties.allowedAmmo
                        .map(
                            (ammo) =>
                                `<a href="?item=${ammo.id}" class="ammo-item" data-tooltip="${ammo.name}">
                            <img src="data/icons/${ammo.id}-icon.webp" alt="${ammo.name}" class="ammo-icon" />
                        </a>`
                        )
                        .join("");

                    if (ammoItems) {
                        allowedAmmoHTML = `<div class="allowed-ammo card">
                            <figure>
                                <figcaption class="blockquote-footer">Compatible Ammunition</figcaption>
                            </figure>
                            <div class="ammo-list">${ammoItems}</div>
                        </div>`;
                    }
                } catch (error) {
                    console.error("Error generating allowed ammo HTML:", error);
                }
            }

            const categoriesHTML = categories
                .map(
                    (category) =>
                        `<li class="list-group-item"><strong>${category.name}</strong><span class="global-id">${category.id}</span></li>`
                )
                .join("");
            const barters = itemData.buyFor;
            const bartersHTML = barters
                .map((barter) =>
                    barter.vendor.name === "Flea Market"
                        ? ""
                        : `<div class="barter"><strong>${barter.vendor.name}</strong> - ${barter.price} ${barter.currency}</div>`
                )
                .join("");

            const image512pxLink = itemData.image512pxLink
                ? itemData.image512pxLink.replace(
                      /^.*\/data\/images\//,
                      "data/images/"
                  )
                : "";

            try {
                const handbookData = await fetchData(HANDBOOK_URL, {
                    method: "GET",
                });
                const itemDataHandbook = handbookData.Items.find(
                    (item) => item.Id === itemId
                );
                const parentId = itemDataHandbook
                    ? itemDataHandbook.ParentId
                    : "N/A";

                let masteringName = "";
                let presetId = "";
                let presetName = "";
                let presetItemsHTML = "";

                if (
                    categories.some(
                        (category) =>
                            category.name === "Weapon" ||
                            category.name === "Chest rig" ||
                            category.name === "Headwear" ||
                            category.name === "Armor"
                    )
                ) {
                    try {
                        const globalsData = await fetchData(GLOBALS, {
                            method: "GET",
                        });

                        if (globalsData.Mastering) {
                            const mastering = globalsData.Mastering.find(
                                (master) => master.Templates.includes(itemId)
                            );
                            if (mastering) {
                                masteringName = mastering.Name;
                            }
                        }

                        if (globalsData.ItemPresets) {
                            const itemPreset = Object.values(
                                globalsData.ItemPresets
                            ).find((preset) => preset._encyclopedia === itemId);
                            if (itemPreset) {
                                presetId = itemPreset._id;
                                presetName = itemPreset._name;
                            }
                        }
                    } catch (error) {
                        console.error("Error fetching globals data:", error);
                    }
                }
                let armorClassHTML = "";
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
                                        ${ properties && properties.RarityPvE ? `<div class="rarity-badge ${properties.RarityPvE.toLowerCase()}" data-tooltip="Rarity in loose/container loot">${properties.RarityPvE.toLowerCase()}</div>` : '' }
                                    </div>
                                </div>
                                <div class="right">
                                    <div class="handbook-item-title">
                                        <h3 class="title">${itemElement.textContent}</h3>
                                    </div>
                                    <figure>
                                        <figcaption class="blockquote-footer">
                                            ${
                                                masteringName
                                                    ? `Mastering Name: ${masteringName} ━`
                                                    : ""
                                            } Short Name: <span class="global-id">${
                    itemData.shortName
                }</span> ━ Item ID: <span class="global-id">${
                    itemData.id
                }</span> ━ Base Price: <span class="global-id">${
                    itemData.basePrice
                }</span>
                                        </figcaption>
                                    </figure>
                                    ${
                                        presetId
                                            ? `<div class="preset-available"><h5>Default Preset: ${presetName}</h5><figure><figcaption class="blockquote-footer">Preset ID: <span class="global-id">${presetId}</span></figcaption></figure><div class="preset-items">${presetItemsHTML}</div></div>`
                                            : ""
                                    }
                                    <p class="desc">${itemData.description}</p>
                                    <div class="hb-parent-id">
                                        <figure>
                                            <figcaption class="blockquote-footer">Handbook Parent ID: <span class="global-id">${parentId}</span></figcaption>
                                        </figure>
                                    </div>
                                    <div class="links">
                                        <a class="btn btn-info strong" href="${
                                            itemData.wikiLink
                                        }" target="_blank"><i class="bi bi-book"></i> Wiki</a>
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

                handbookNavLink.classList.remove("disabled");

                document.addEventListener("click", function (event) {
                    const link = event.target.closest(".search-result-link");
                    if (link) {
                        event.preventDefault();
                        const dataLink = link.getAttribute("data-link");
                        itemSearchInput.value = dataLink;
                        fetchItemData(dataLink);
                    }
                });
                document
                    .querySelectorAll(".slot-item-thumbnail")
                    .forEach((slotItem) => {
                        slotItem.addEventListener("click", () => {
                            const itemId = slotItem.dataset.itemId;
                            navigationManager.navigateToItem(
                                itemId,
                                "handbook"
                            );
                            checkJsonEditorSimple();
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        });
                    });
                
                document
                    .querySelectorAll(".ammo-item")
                    .forEach((ammoItem) => {
                        ammoItem.addEventListener("click", (event) => {
                            event.preventDefault();
                            const href = ammoItem.getAttribute("href");
                            const itemId = href.split("item=")[1];
                            navigationManager.navigateToItem(
                                itemId,
                                "handbook"
                            );
                            checkJsonEditorSimple();
                            window.scrollTo({ top: 0, behavior: "smooth" });
                        });
                    });
            } catch (error) {
                console.error("Error fetching handbook data:", error);
                handbookContent.innerHTML =
                    "<p>Error fetching handbook data.</p>";
            }
        } catch (error) {
            console.error("Error fetching item data:", error);
            handbookContent.innerHTML = "<p>Error fetching item data.</p>";
        }
    };
    const fetchItemJsonTemplate = async (itemId) => {
        try {
            const data = await fetchData(ITEMS_URL, { method: "GET" });
            templateLoader.style.display = "none";

            if (data && typeof data === "object") {
                const itemTemplate = data[itemId];
                if (itemTemplate) {
                    if (typeof editor !== "undefined" && editor) {
                        editor.setValue(JSON.stringify(itemTemplate, null, 2));
                    }
                    templateNavLink.classList.remove("disabled");
                } else {
                    if (typeof editor !== "undefined" && editor) {
                        editor.setValue(
                            "No JSON template found for this item."
                        );
                    }
                    templateNavLink.classList.add("disabled");
                }
            } else {
                if (typeof editor !== "undefined" && editor) {
                    editor.setValue("Invalid data format.");
                }
                templateNavLink.classList.add("disabled");
            }
        } catch (error) {
            console.warn("Could not load JSON template:", error.message);
            templateLoader.style.display = "none";
            if (typeof editor !== "undefined" && editor) {
                editor.setValue(
                    "JSON template unavailable (this is normal if items.json cannot be cached)."
                );
            }
            templateNavLink.classList.add("disabled");
        }
    };
    searchResults.addEventListener("click", (event) => {
        if (event.target && event.target.matches("li.list-group-item")) {
            const itemElement = event.target.closest("li.list-group-item");
            const itemId = itemElement.dataset.itemId;

            navigationManager.navigateToItem(itemId, "handbook");

            searchResultsCont.style.display = "none";
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
        LightLaserDevices: "Light & laser devices",
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
        Valuables: "Valuables",
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
        typesEnum.Suppressors,
    ]);

    let currentPage = 1;
    let browseItemsData = [];
    let filteredItemsData = [];
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
            paginationHTML +=
                '<nav aria-label="Page navigation"><ul class="pagination pagination-sm">';
            for (let i = 1; i <= totalPages; i++) {
                paginationHTML += `
                    <li class="page-item ${i === currentPage ? "active" : ""}">
                        <a href="javascript:void(0);" class="page-link" data-page="${i}">${i}</a>
                    </li>`;
            }
            paginationHTML += "</ul></nav>";
        }
        paginationHTML += "</div>";
        return paginationHTML;
    };

    const createItemElement = (item) => {
        const itemIconLink = item.iconLink.replace(
            /^.*\/data\/icons\//,
            "data/icons/"
        );
        const itemElement = document.createElement("a");
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

    let isRendering = false;
    let isAttachingListeners = false;

    const renderBrowseItems = () => {
        if (isRendering) return;
        isRendering = true;

        const itemsToDisplay =
            filteredItemsData.length > 0 ? filteredItemsData : browseItemsData;
        const currentItemType = document
            .querySelector(".browse-category.active")
            .dataset.itemType.replace(/-/g, " ");
        const shouldGroupItems = typesToGroup.has(currentItemType);

        itemsPerPage = shouldGroupItems ? 30 : itemsPerPageDefault;

        const paginatedItems = paginate(
            itemsToDisplay,
            currentPage,
            itemsPerPage
        );
        const fragment = document.createDocumentFragment();

        if (shouldGroupItems) {
            const groupedItems = paginatedItems.reduce((groups, item) => {
                const firstWord = item.name.split(" ")[0];
                if (!groups[firstWord]) {
                    groups[firstWord] = [];
                }
                groups[firstWord].push(item);
                return groups;
            }, {});

            Object.keys(groupedItems).forEach((group) => {
                const groupTitle = document.createElement("div");
                groupTitle.className = "break group-title";
                groupTitle.innerHTML = `<h4>${group}</h4>`;
                fragment.appendChild(groupTitle);

                groupedItems[group].forEach((item) => {
                    const itemElement = createItemElement(item);
                    fragment.appendChild(itemElement);
                });
            });
        } else {
            paginatedItems.forEach((item) => {
                const itemElement = createItemElement(item);
                fragment.appendChild(itemElement);
            });
        }

        browseItems.innerHTML = "";
        browseItems.appendChild(searchFilter);
        browseItems.appendChild(fragment);
        browseItems.insertAdjacentHTML(
            "beforeend",
            renderPaginationControls(itemsToDisplay.length, itemsPerPage)
        );

        if (!isAttachingListeners) {
            isAttachingListeners = true;
            requestIdleCallback(() => {
                attachEventListeners();
                isAttachingListeners = false;
            });
        }

        isRendering = false;
    };

    const debounce = (func, delay) => {
        let debounceTimer;
        return function () {
            const context = this;
            const args = arguments;
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(context, args), delay);
        };
    };
    const debouncedRenderBrowseItems = searchOptimizer.debounce(
        renderBrowseItems,
        200
    );

    const handleSearch = searchOptimizer.debounce((event) => {
        const searchTerm = event.target.value.toLowerCase();
        if (searchTerm.length > 2) {
            filteredItemsData = searchOptimizer.fastSearch(
                searchTerm,
                searchIndex,
                browseItemsData
            );
            currentPage = 1;
            renderBrowseItems();
        } else if (searchTerm.length === 0) {
            filteredItemsData = [];
            renderBrowseItems();
        }
    }, 300);

    const attachEventListeners = () => {
        document
            .querySelectorAll("#browseItems .browse-item")
            .forEach((itemElement) => {
                itemElement.addEventListener("click", () => {
                    const itemId = itemElement.dataset.itemId;
                    navigationManager.navigateToItem(itemId, "handbook");
                    checkJsonEditorSimple();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                });
            });

        document
            .querySelectorAll("#browsePagination .page-link")
            .forEach((pageLink) => {
                pageLink.addEventListener("click", (event) => {
                    event.preventDefault();
                    currentPage = parseInt(event.target.dataset.page, 10);
                    renderBrowseItems();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                });
            });

        const browseSearchInput = document.getElementById("browseSearchInput");
        if (browseSearchInput) {
            browseSearchInput.removeEventListener("input", handleSearch);
            browseSearchInput.addEventListener("input", handleSearch);
        }

        document
            .querySelectorAll(".browse-category")
            .forEach((categoryElement) => {
                categoryElement.addEventListener("click", () => {
                    document
                        .querySelectorAll(".browse-category")
                        .forEach((el) => el.classList.remove("active"));
                    categoryElement.classList.add("active");
                    const itemType = categoryElement.dataset.itemType;
                    lastActiveCategory = itemType;
                    fetchBrowseData(itemType.replace(/-/g, " "));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                });
            });
    };

    const categoryCache = {};

    const fetchBrowseData = (itemType) => {
        browseItems.innerHTML =
            '<div id="activityContent"><span class="loader"></span></div>';
        currentPage = 1;

        if (categoryCache[itemType]) {
            browseItemsData = categoryCache[itemType];
            filteredItemsData = [];
            requestIdleCallback(debouncedRenderBrowseItems);
            return;
        }
        const apiCategoryName = categoryNameMapping[itemType] || itemType;

        const loadBrowseData = async () => {
            if (!gameDataCache) {
                await preloadGameData();
            }

            if (categoryFilterMap && categoryFilterMap.has(apiCategoryName)) {
                browseItemsData = categoryFilterMap.get(apiCategoryName);
            } else {
                const items =
                    itemsArrayCache || Object.values(gameDataCache.items);
                browseItemsData = items.filter((item) =>
                    item.handbookCategories.some((category) => {
                        return (
                            category.name === apiCategoryName ||
                            category.name.replace(/\s*\/\s*/g, "/") ===
                                itemType.replace(/\s*\/\s*/g, "/")
                        );
                    })
                );
            }

            browseItemsData.sort((a, b) => a.name.localeCompare(b.name));
            categoryCache[itemType] = browseItemsData;
            filteredItemsData = [];
            requestIdleCallback(debouncedRenderBrowseItems);
        };

        loadBrowseData().catch((error) => {
            console.error("Error fetching data:", error);
            browseItems.innerHTML = "Error fetching data.";
        });
    };

    Object.values(typesEnum).forEach((type) => {
        const browseItem = document.createElement("div");
        browseItem.className = "browse-category";
        browseItem.dataset.itemType = type.replace(/\s+/g, "-");
        browseItem.innerHTML = `${type}`;
        browseSidebar.appendChild(browseItem);
    });

    const firstCategory = document.querySelector(".browse-category");
    if (firstCategory) {
        firstCategory.classList.add("active");
        const itemType = firstCategory.dataset.itemType.replace(/-/g, " ");
        fetchBrowseData(itemType);
    }

    function toggleContainers(activeContainer, ...containers) {
        const isActive = activeContainer.style.display === "block";

        containers.forEach((container) => {
            const navLinkId = container.id.replace("Container", "NavLink");
            document.getElementById(navLinkId).classList.remove("active");
            container.style.display = "none";
        });

        if (!isActive) {
            activeContainer.style.display = "block";
            const activeNavLinkId = activeContainer.id.replace(
                "Container",
                "NavLink"
            );
            document.getElementById(activeNavLinkId).classList.add("active");

            if (activeContainer.id === "browseContainer") {
                const activeCategory = lastActiveCategory || "Ammo-packs";
                const categoryElement = document.querySelector(
                    `#browseSidebar .browse-category[data-item-type="${activeCategory}"]`
                );

                if (categoryElement) {
                    document
                        .querySelectorAll("#browseSidebar .browse-category")
                        .forEach((category) =>
                            category.classList.remove("active")
                        );
                    categoryElement.classList.add("active");

                    const formattedCategory = activeCategory.replace(/-/g, " ");
                    fetchBrowseData(formattedCategory);
                }
            }
        }
    }

    templateNavLink.addEventListener("click", (event) => {
        event.preventDefault();
        if (!templateNavLink.classList.contains("disabled")) {
            const currentState = navigationManager.getState();
            if (currentState.item) {
                navigationManager.switchView("template");
            }
        }
    });

    handbookNavLink.addEventListener("click", (event) => {
        event.preventDefault();
        const currentState = navigationManager.getState();
        if (currentState.item) {
            navigationManager.switchView("handbook");
        } else {
            navigationManager.navigateToSearch();
        }
    });

    browseNavLink.addEventListener("click", (event) => {
        event.preventDefault();
        navigationManager.navigateToBrowse();
    });
    navigationManager.onStateChange((state, previousState, updateURL) => {
        if (isNavigationHandlerActive) return;
        isNavigationHandlerActive = true;

        handleNavigationStateChange(state, previousState);

        isNavigationHandlerActive = false;
    });

    const showSearchView = () => {
        templateContainer.style.display = "none";
        handbookContainer.style.display = "none";
        browseContainer.style.display = "none";

        toggleRecentSearchesVisibility(true);

        breadcrumb.style.display = "none";
        toggleNav.classList.add("inactive");

        templateNavLink.classList.remove("active");
        handbookNavLink.classList.remove("active");
        browseNavLink.classList.remove("active");

        searchResults.innerHTML = "";
        searchResultsCont.style.display = "none";

        itemSearchInput.focus();
    };

    const performSearch = async (query) => {
        if (query.length > 2) {
            await fetchItemData(query);
        } else {
            searchResults.innerHTML = "";
            searchResultsCont.style.display = "none";
        }
    };
    const loadItemFromId = async (itemId) => {
        let data = gameDataCache;
        if (!data) {
            data = await preloadGameData();
        }

        const item = data.items[itemId];
        if (item) {
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

            await loadItemDataOnly(listItem);
        }
    };

    const loadItemDataOnly = async (itemElement) => {
        const { itemId, itemTypes, usedInTasks } = itemElement.dataset;

        storeRecentSearch(itemElement);

        const activeCategoryElement = document.querySelector(
            "#browseSidebar .browse-category.active"
        );
        if (activeCategoryElement) {
            lastActiveCategory = activeCategoryElement.dataset.itemType;
        }

        toggleNav.classList.remove("inactive");

        const types = itemTypes.split(",").reverse();
        const validCategories = new Set(Object.values(typesEnum));
        const breadcrumbHTML =
            types
                .map((type, index) => {
                    const normalizedType = type.trim();
                    const isValidCategory =
                        validCategories.has(normalizedType) ||
                        Object.keys(categoryNameMapping).includes(
                            normalizedType
                        );

                    if (index === types.length - 1 && isValidCategory) {
                        return `<a href="javascript:void(0);" class="breadcrumb-link" data-view="browse" data-category="${
                            Object.entries(typesEnum).find(
                                ([key, value]) => value === normalizedType
                            )?.[0] || normalizedType
                        }">${type}</a>`;
                    } else if (index === 0 || !isValidCategory) {
                        return `<span class="breadcrumb-text">${type}</span>`;
                    } else if (isValidCategory) {
                        const enumKey =
                            Object.entries(typesEnum).find(
                                ([key, value]) => value === normalizedType
                            )?.[0] || normalizedType;
                        return `<a href="javascript:void(0);" class="breadcrumb-link" data-category="${enumKey}">${type}</a>`;
                    } else {
                        return `<span class="breadcrumb-text">${type}</span>`;
                    }
                })
                .join(' <i class="bi bi-caret-right-fill"></i> ') +
            ' <i class="bi bi-caret-right-fill"></i> ' +
            `<span class="breadcrumb-current">${itemElement.textContent}</span>`;

        breadcrumb.innerHTML =
            "<div class='breadcrumb-container'>" + breadcrumbHTML + "</div>";
        breadcrumb.style.display = "block";

        breadcrumb.querySelectorAll(".breadcrumb-link").forEach((link) => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                browseNavLink.click();

                let categoryName = link.dataset.category;

                const mappedName = Object.entries(categoryNameMapping).find(
                    ([key, value]) => value === categoryName
                )?.[0];

                if (mappedName) {
                    categoryName = mappedName.replace(/\s+/g, "-");
                } else if (typesEnum[categoryName]) {
                    categoryName = typesEnum[categoryName].replace(/\s+/g, "-");
                } else {
                    categoryName = categoryName.replace(/\s+/g, "-");
                }

                const categoryElement = document.querySelector(
                    `#browseSidebar .browse-category[data-item-type="${categoryName}"]`
                );
                if (categoryElement) {
                    categoryElement.click();
                }
            });
        });

        let usedInTasksHTML = "";
        if (usedInTasks) {
            try {
                let data = gameDataCache;
                if (!data) {
                    data = await fetchData(DATA_URL, { method: "GET" });
                }

                const taskIds = usedInTasks.split(",");
                const tasks = taskIds
                    .map((taskId) => {
                        const taskInfo = data.items[itemId].usedInTasks.find(
                            (task) => task.id === taskId
                        );
                        return taskInfo
                            ? `<li class="list-group-item"><strong>${taskInfo.name}</strong><span class="global-id">${taskId}</span></li>`
                            : null;
                    })
                    .filter((task) => task !== null)
                    .join("");

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
                console.error("Error fetching tasks data:", error);
                usedInTasksHTML = "<p>Error fetching tasks data.</p>";
            }
        }

        updateHandbookContent(itemElement, usedInTasksHTML);

        searchResults.innerHTML = "";
        itemSearchInput.value = "";

        await fetchItemJsonTemplate(itemId);

        toggleRecentSearchesVisibility(false);
    };
    const loadBrowseCategory = async (category, page = 1) => {
        if (category) {
            fetchBrowseData(category);
        }
    };

    const handleNavigationStateChange = async (state, previousState) => {
        const { view, item, category, search, page } = state;

        switch (view) {
            case "search":
                if (search) {
                    itemSearchInput.value = search;
                    await performSearch(search);
                } else {
                    showSearchView();
                }
                break;
            case "handbook":
                if (item) {
                    toggleContainers(
                        handbookContainer,
                        templateContainer,
                        browseContainer
                    );
                    handbookNavLink.classList.add("active");
                    templateNavLink.classList.remove("active");
                    browseNavLink.classList.remove("active");
                    toggleNav.classList.remove("inactive");
                    breadcrumb.style.display = "block";
                }
                if (item && item !== previousState?.item) {
                    await loadItemFromId(item);
                }
                break;
            case "template":
                if (item && item !== previousState?.item) {
                    await loadItemFromId(item);
                } else if (item) {
                    await fetchItemJsonTemplate(item);
                }
                if (item) {
                    toggleContainers(
                        templateContainer,
                        templateContainer,
                        handbookContainer,
                        browseContainer
                    );
                    templateNavLink.classList.add("active");
                    handbookNavLink.classList.remove("active");
                    browseNavLink.classList.remove("active");

                    setTimeout(() => {
                        if (typeof editor !== "undefined" && editor) {
                            editor.refresh();
                            checkJsonEditorSimple();
                        }
                    }, 50);
                }
                break;

            case "browse":
                toggleContainers(
                    browseContainer,
                    templateContainer,
                    handbookContainer,
                    browseContainer
                );
                toggleNav.classList.add("inactive");
                breadcrumb.style.display = "none";
                templateNavLink.classList.remove("active");
                handbookNavLink.classList.remove("active");
                browseNavLink.classList.add("active");

                if (category) {
                    await loadBrowseCategory(category, page);
                }
                break;
        }
    };
    itemSearchInput.addEventListener(
        "input",
        searchOptimizer.debounce((e) => {
            const query = itemSearchInput.value.trim();

            if (query.length > 2) {
                fetchItemData(query);
            } else {
                searchResults.innerHTML = "";
                searchResultsCont.style.display = "none";
                handbookContent.innerHTML = "";

                if (query.length === 0) {
                    showSearchView();
                }
            }
            checkJsonEditorSimple();
        }, 150)
    );
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
            showSearchView();
        }, 100);
    }

    attachEventListeners();
});
