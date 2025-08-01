// ItemDisplayer - Handles item details display in handbook view
import { fetchData } from "../core/cache.js";
import { navigationManager } from "../core/navigationManager.js";
import { Popover } from "../components/popover.js";
import {
    DATA_URL,
    ITEMS_URL,
    HANDBOOK_URL,
    GLOBALS,
    DEPENDENCIES,
} from "../core/localData.js";
import {
    checkJsonEditorSimple,
} from "../components/checkJsonEditor.js";

export class ItemDisplayer {
    constructor(context) {
        this.context = context;
        this.elements = context.elements;
        this.presetPopover = null;
    }

    init() {
        // Setup any initial configurations
    }

    // Display item by ID
    async displayItemById(itemId) {
        // Ensure data is loaded before displaying
        await this.context.ensureDataLoaded();
        
        let data = this.context.gameDataCache();
        if (!data) {
            console.error("Game data not available");
            return;
        }

        const item = data.items[itemId];
        if (item) {
            const listItem = this.createItemElement(item);
            await this.displayItemDetails(listItem, false);
        }
    }

    // Create item element from item data
    createItemElement(item) {
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

        return listItem;
    }

    // Display item details in handbook
    async displayItemDetails(itemElement, updateHistory = true) {
        const { itemId, itemTypes, usedInTasks } = itemElement.dataset;

        if (updateHistory) {
            navigationManager.navigateToItem(itemId, "handbook");
        }

        // Store in recent searches
        this.context.manager.modules.searcher.storeRecentSearch(itemElement);

        // Update breadcrumb
        this.context.manager.modules.breadcrumb.updateBreadcrumb(itemTypes, itemElement.textContent);

        // Generate tasks HTML
        const usedInTasksHTML = await this.generateUsedInTasksHTML(usedInTasks, itemId);

        // Update handbook content
        await this.updateHandbookContent(itemElement, usedInTasksHTML);

        // Clear search results
        this.context.manager.modules.searcher.clearResults();
        
        if (this.elements.itemSearchInput) {
            this.elements.itemSearchInput.value = "";
        }

        // Load JSON template
        await this.context.manager.modules.template.loadTemplate(itemId);
        
        // Refresh editor if available
        if (typeof editor !== "undefined" && editor) {
            editor.refresh();
            checkJsonEditorSimple();
        }

        // Hide recent searches
        this.context.manager.modules.searcher.hideRecentSearches();
    }

    // Generate HTML for tasks that use this item
    async generateUsedInTasksHTML(usedInTasks, itemId) {
        if (!usedInTasks) return "";

        try {
            let data = this.context.gameDataCache();
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
                return `
                    <div class="used-in card">
                        <figure>
                            <figcaption class="blockquote-footer">Used in quests</figcaption>
                        </figure>
                        <ul class="list-group">${tasks}</ul>
                    </div>`;
            }
        } catch (error) {
            console.error("Error fetching tasks data:", error);
            return "<p>Error fetching tasks data.</p>";
        }

        return "";
    }

    // Update handbook content display
    async updateHandbookContent(itemElement, usedInTasksHTML) {
        if (!this.elements.handbookContent) return;

        try {
            const itemId = itemElement.dataset.itemId;

            let data = this.context.gameDataCache();
            if (!data) {
                data = await fetchData(DATA_URL, { method: "GET" });
            }

            const itemData = data.items[itemId];

            if (!itemData) {
                this.elements.handbookContent.innerHTML = "<p>Item not found in tarkov_data.json</p>";
                return;
            }

            // Generate all HTML sections
            const {
                fleaBanHTML,
                slotsHTML,
                dependenciesHTML,
                allowedAmmoHTML,
                armorClassHTML,
                properties
            } = await this.generateItemSections(itemData, itemId);

            const categoriesHTML = this.generateCategoriesHTML(itemData.categories);
            const bartersHTML = this.generateBartersHTML(itemData.buyFor);
            const image512pxLink = this.generateImageLink(itemData.image512pxLink);

            // Get handbook and preset data
            const { parentId, presets, presetItemsHTML } = await this.getHandbookData(itemId, itemData.categories);

            // Render the complete handbook content
            this.renderHandbookContent({
                itemElement,
                itemData,
                properties,
                fleaBanHTML,
                slotsHTML,
                dependenciesHTML,
                allowedAmmoHTML,
                usedInTasksHTML,
                categoriesHTML,
                bartersHTML,
                image512pxLink,
                parentId,
                presets,
                presetItemsHTML,
                armorClassHTML
            });

            // Setup interactive elements
            this.setupInteractiveElements();

        } catch (error) {
            console.error("Error fetching item data:", error);
            this.elements.handbookContent.innerHTML = "<p>Error fetching item data.</p>";
        }
    }

    // Generate various item sections (slots, dependencies, etc.)
    async generateItemSections(itemData, itemId) {
        let fleaBanHTML = "";
        let slotsHTML = "";
        let dependenciesHTML = "";
        let allowedAmmoHTML = "";
        let armorClassHTML = "";
        let properties = null;

        try {
            const itemsData = await fetchData(ITEMS_URL, { method: "GET" });
            const itemTemplate = itemsData?.[itemId];

            if (itemTemplate) {
                properties = itemTemplate._props;

                // Flea ban check
                const isFleaBanned = properties && !properties.CanSellOnRagfair;
                fleaBanHTML = isFleaBanned
                    ? '<div class="flea-ban flex-box"><div class="icon warning-red"></div><div>Flea Ban</div></div>'
                    : "";

                // Armor class
                if (properties && properties.armorClass > 0) {
                    armorClassHTML = `armor-exist armor-class-${properties.armorClass}`;
                }

                // Slots
                slotsHTML = await this.generateSlotsHTML(properties, itemsData);

                // Dependencies
                dependenciesHTML = await this.generateDependenciesHTML(properties);
            }

            // Allowed ammo
            allowedAmmoHTML = this.generateAllowedAmmoHTML(itemData);

        } catch (error) {
            console.warn("Could not load items.json template data:", error.message);
        }

        return {
            fleaBanHTML,
            slotsHTML,
            dependenciesHTML,
            allowedAmmoHTML,
            armorClassHTML,
            properties
        };
    }

    // Generate slots HTML
    async generateSlotsHTML(properties, itemsData) {
        if (!properties?.Slots) return "";

        const data = this.context.gameDataCache();

        return properties.Slots.map((slot) => {
            if (slot._props.filters) {
                const slotItems = slot._props.filters.flatMap(
                    (filter) =>
                        filter.Filter
                            ? filter.Filter.map((filterId) => {
                                  const slotItem = data.items[filterId];
                                  const itemId = itemsData?.[filterId]?._id;
                                  return slotItem && itemId
                                      ? { ...slotItem, _id: itemId }
                                      : null;
                              }).filter(Boolean)
                            : []
                );

                if (slotItems.length > 0) {
                    const slotItemsHTML = slotItems
                        .map((slotItem) => {
                            let iconLink = slotItem.iconLink
                                ? slotItem.iconLink.replace(/^.*\/data\/icons\//, "data/icons/")
                                : `assets/img/slots/${slot._name.toLowerCase()}.png`;
                            
                            return `<div data-tooltip="${slotItem.name}"><img src="${iconLink}" alt="${slot._name}" class="slot-item-thumbnail" data-item-id="${slotItem._id}" /></div>`;
                        })
                        .join("");
                    return `<div class="slot"><div class="break">${slot._name}</div><div class="items">${slotItemsHTML}</div></div>`;
                }
            }
            return "";
        }).join("");
    }

    // Generate dependencies HTML
    async generateDependenciesHTML(properties) {
        if (!properties?.Prefab?.path) return "";

        try {
            const dependenciesData = await fetchData(DEPENDENCIES, { method: "GET" });
            const prefabPath = properties.Prefab.path;

            if (dependenciesData) {
                const itemDependencies = Object.entries(dependenciesData).filter(([key]) => {
                    if (!prefabPath) return false;
                    const normalizedPrefabPath = prefabPath.toLowerCase();
                    return key.toLowerCase().includes(normalizedPrefabPath);
                });

                if (itemDependencies.length > 0) {
                    const path = itemDependencies[0][0];
                    const deps = itemDependencies[0][1].Dependencies;

                    return `
                        <div class="dependencies card">
                            <div class="dep-item">
                                <div class="dep-item-title ${properties?.RarityPvE ? `${properties.RarityPvE.toLowerCase()}` : ''}">
                                    <h3>Dependency Information</h3>
                                    <button class="btn btn-sm btn-info copy-deps">
                                        <i class="bi bi-clipboard"></i> Copy
                                    </button>
                                </div>
                                <div class="dep-contents">
                                    <p>Asset Path: <span class="global-id">${path}</span></p>
                                    <div class="list-group">
                                        ${deps.map(dep => `<div class="list-group-item"><span class="global-id">${dep}</span></div>`).join("")}
                                    </div>
                                </div>
                            </div>
                        </div>`;
                }
            }
        } catch (error) {
            console.error("Error generating dependencies HTML:", error);
        }

        return "";
    }

    // Generate allowed ammo HTML
    generateAllowedAmmoHTML(itemData) {
        if (!itemData.properties?.allowedAmmo?.length) return "";

        try {
            const ammoItems = itemData.properties.allowedAmmo
                .map((ammo) => 
                    `<a href="?item=${ammo.id}" class="ammo-item" data-tooltip="${ammo.name}">
                        <img src="data/icons/${ammo.id}-icon.webp" alt="${ammo.name}" class="ammo-icon" />
                    </a>`
                )
                .join("");

            if (ammoItems) {
                return `<div class="allowed-ammo card">
                    <figure>
                        <figcaption class="blockquote-footer">Compatible Ammunition</figcaption>
                    </figure>
                    <div class="ammo-list">${ammoItems}</div>
                </div>`;
            }
        } catch (error) {
            console.error("Error generating allowed ammo HTML:", error);
        }

        return "";
    }

    // Generate categories HTML
    generateCategoriesHTML(categories) {
        return categories
            .map((category) => 
                `<li class="list-group-item"><strong>${category.name}</strong><span class="global-id">${category.id}</span></li>`
            )
            .join("");
    }

    // Generate barters HTML
    generateBartersHTML(buyFor) {
        return buyFor
            .map((barter) =>
                barter.vendor.name === "Flea Market"
                    ? ""
                    : `<div class="barter"><strong>${barter.vendor.name}</strong> - ${barter.price} ${barter.currency}</div>`
            )
            .join("");
    }

    // Generate image link
    generateImageLink(image512pxLink) {
        return image512pxLink
            ? image512pxLink.replace(/^.*\/data\/images\//, "data/images/")
            : "";
    }

    // Get handbook and preset data
    async getHandbookData(itemId, categories) {
        try {
            const handbookData = await fetchData(HANDBOOK_URL, { method: "GET" });
            const itemDataHandbook = handbookData.Items.find((item) => item.Id === itemId);
            const parentId = itemDataHandbook ? itemDataHandbook.ParentId : "N/A";

            let presets = [];
            let presetItemsHTML = "";

            // Check if item qualifies for preset data
            if (categories.some(category => 
                ["Weapon", "Chest rig", "Headwear", "Armor"].includes(category.name)
            )) {
                try {
                    // Use local tarkov_data.json instead of globals
                    let data = this.context.gameDataCache();
                    if (!data) {
                        data = await fetchData(DATA_URL, { method: "GET" });
                    }

                    if (data.items) {
                        // Find all presets that are related to this item
                        presets = Object.values(data.items).filter(item => 
                            item.types && item.types.includes("preset") && 
                            item.wikiLink && item.wikiLink === data.items[itemId]?.wikiLink
                        );
                    }
                } catch (error) {
                    console.error("Error fetching preset data:", error);
                }
            }

            return { parentId, presets, presetItemsHTML };
        } catch (error) {
            console.error("Error fetching handbook data:", error);
            return { parentId: "N/A", presets: [], presetItemsHTML: "" };
        }
    }

    // Render the complete handbook content
    renderHandbookContent(data) {
        const {
            itemElement, itemData, properties, fleaBanHTML, slotsHTML, dependenciesHTML,
            allowedAmmoHTML, usedInTasksHTML, categoriesHTML, bartersHTML,
            image512pxLink, parentId, presets, presetItemsHTML, armorClassHTML
        } = data;

        // Generate presets HTML with async button state check
        const presetsHTML = presets && presets.length > 0 
            ? `<div class="presets-available">
                <h5>Available Presets (${presets.length})</h5>
                <div class="presets-list swiper">
                    <div class="swiper-wrapper">
                        ${presets.map(preset => {
                            const presetImageLink = preset.image512pxLink ? preset.image512pxLink.replace(/^.*\/data\/images\//, "data/images/") : "";
                            return `<div class="swiper-slide preset-item-row">
                                <div class="preset-item-slide">
                                    <div class="preset-image">
                                        <img src="${presetImageLink}" alt="${preset.name}" title="${preset.name}" />
                                    </div>

                                    <div class="preset-item-details">
                                        <h6>${preset.name}</h6>
                                        <p><strong>Short Name:</strong> ${preset.shortName}</p>
                                        <p><strong>Preset ID:</strong> <span class="global-id">${preset.id}</span></p>
                                        <p><strong>Base Price:</strong> ${preset.basePrice} RUB</p>
                                        ${preset.description ? `<p><strong>Description:</strong> ${preset.description}</p>` : ''}
                                        <button class="btn btn-sm btn-info preset-template-btn" data-preset-id="${preset.id}">
                                            <i class="bi bi-filetype-json"></i> JSON
                                        </button>
                                    </div>
                                </div>
                            </div>`;
                        }).join('')}
                    </div>
                    <div class="swiper-button-next"></div>
                    <div class="swiper-button-prev"></div>
                </div>
                <div class="swiper-pagination"></div>
            </div>`
            : "";

        this.elements.handbookContent.innerHTML = `
            <div class="d-flex handbook-item">
                <div class="main card ${armorClassHTML}">
                    <div class="top">
                        <div class="left">
                            <div class="handbook-image">
                                ${fleaBanHTML}
                                <div class="stripes"></div>
                                <img src="${image512pxLink}" alt="Handbook image" />
                                ${properties?.RarityPvE ? `<div class="rarity-badge ${properties.RarityPvE.toLowerCase()}" data-tooltip="Rarity in loose/container loot">${properties.RarityPvE.toLowerCase()}</div>` : ''}
                            </div>
                        </div>
                        <div class="right">
                            <div class="handbook-item-header">
                                <div class="handbook-item-title ${properties?.RarityPvE ? `${properties.RarityPvE.toLowerCase()}` : ''}">
                                    <h3 class="title">${itemElement.textContent}</h3>
                                </div>
                                <div class="handbook-item-meta">
                                    <div>Short Name: <span class="global-id">${itemData.shortName}</span></div>
                                    <div>Item ID: <span class="global-id">${itemData.id}</span></div>
                                    <div>Base Price: <span class="global-id">${itemData.basePrice}</span></div>
                                </div>
                            </div>
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
                    ${presetsHTML}
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
            <div id="popover" class="preset-popover" popover>
                <div class="popover-content">
                    <div class="popover-header">
                        <h4 class="popover-title">Preset Details</h4>
                        <span class="popover-close"><i class="bi bi-x-lg"></i></span>
                    </div>
                    <div class="preset-popover-body">
                        <div class="popover-loading">Loading...</div>
                    </div>
                </div>
            </div>
        `;

        // Remove disabled state from handbook nav link
        if (this.elements.handbookNavLink) {
            this.elements.handbookNavLink.classList.remove("disabled");
        }
    }

    // Fetch preset data from local tarkov_data.json
    async fetchPresetData(presetId) {
        try {
            // Fetch globals.json to get the preset template structure
            const globalsData = await fetchData(GLOBALS, { method: "GET" });
            
            if (globalsData && globalsData.ItemPresets && globalsData.ItemPresets[presetId]) {
                const presetTemplate = globalsData.ItemPresets[presetId];
                
                // Also get basic preset info from tarkov_data.json
                let data = this.context.gameDataCache();
                if (!data) {
                    data = await fetchData(DATA_URL, { method: "GET" });
                }
                
                const presetItem = data.items && data.items[presetId] ? data.items[presetId] : null;
                
                return {
                    id: presetId,
                    name: presetItem?.name || "Unknown Preset",
                    template: presetTemplate
                };
            }

            return null;
        } catch (error) {
            console.error("Error fetching preset template data:", error);
            return null;
        }
    }

    // Show preset popover
    async showPresetPopover(presetId, clickedElement) {
        if (!this.presetPopover || !this.presetPopover.isReady()) {
            console.error('Preset popover not initialized');
            return;
        }

        // Show loading state
        this.presetPopover.showLoading('Loading preset template...');
        
        // Show popover
        this.presetPopover.show();

        // Fetch preset template data
        const presetData = await this.fetchPresetData(presetId);
        
        if (presetData && presetData.template) {
            // Update popover title
            this.presetPopover.setTitle(`${presetData.name} - Template Structure`);

            // Create CodeMirror editor container
            const editorId = `preset-editor-${presetId}`;
            const editorContent = `
                <div class="preset-template-editor">
                    <div id="${editorId}" class="preset-codemirror"></div>
                </div>
            `;
            
            this.presetPopover.setContent(editorContent);

            // Initialize CodeMirror editor
            setTimeout(() => {
                const editorElement = document.getElementById(editorId);
                if (editorElement && typeof CodeMirror !== 'undefined') {
                    const presetEditor = CodeMirror(editorElement, {
                        value: JSON.stringify(presetData.template, null, 2),
                        mode: 'application/json',
                        theme: 'mbo',
                        lineNumbers: true,
                        closeBrackets: true,
                        autoCloseBrackets: true,
                        foldCode: true,
                        readOnly: true,
                        foldGutter: true,
                        gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter']
                    });
                    
                    // Set editor size
                    presetEditor.setSize('100%', '70vh');
                } else {
                    // Fallback if CodeMirror is not available
                    editorElement.innerHTML = `<pre style="max-height: 400px; overflow: auto; background: #f5f5f5; padding: 10px; border-radius: 4px;"><code>${JSON.stringify(presetData.template, null, 2)}</code></pre>`;
                }
            }, 50);
        } else {
            this.presetPopover.showError('Failed to load preset template data');
        }
    }

    // Hide preset popover
    hidePresetPopover() {
        if (this.presetPopover && this.presetPopover.isReady()) {
            this.presetPopover.hide();
        }
    }

    // Setup interactive elements in the handbook
    setupInteractiveElements() {
        // Initialize Swiper for presets if present
        const swiperElement = document.querySelector('.presets-list.swiper');
        if (swiperElement) {
            try {
                new Swiper('.presets-list.swiper', {
                    direction: 'horizontal',
                    loop: false,
                    slidesPerView: 1,
                    spaceBetween: 0,
                    grabCursor: true,
                    longSwipes: false,
                    
                    pagination: {
                        el: '.swiper-pagination',
                        clickable: true,
                    },

                    navigation: {
                        nextEl: '.swiper-button-next',
                        prevEl: '.swiper-button-prev',
                    }
                });
            } catch (error) {
                console.warn('Swiper initialization failed:', error);
            }
        }

        // Initialize preset popover
        this.presetPopover = new Popover('popover', {
            closeOnBackdrop: true,
            closeOnEscape: true
        });

        // Check and disable preset buttons that don't have globals data
        this.checkPresetButtonStates();

        // Setup slot item click handlers
        document.querySelectorAll(".slot-item-thumbnail").forEach((slotItem) => {
            slotItem.addEventListener("click", () => {
                const itemId = slotItem.dataset.itemId;
                navigationManager.navigateToItem(itemId, "handbook");
                checkJsonEditorSimple();
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        });

        // Setup ammo item click handlers
        document.querySelectorAll(".ammo-item").forEach((ammoItem) => {
            ammoItem.addEventListener("click", (event) => {
                event.preventDefault();
                const href = ammoItem.getAttribute("href");
                const itemId = href.split("item=")[1];
                navigationManager.navigateToItem(itemId, "handbook");
                checkJsonEditorSimple();
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        });

        // Setup preset popover click handlers
        document.querySelectorAll(".preset-template-btn").forEach((presetButton) => {
            presetButton.addEventListener("click", (event) => {
                event.preventDefault();
                const presetId = presetButton.dataset.presetId;
                if (presetId && !presetButton.disabled) {
                    this.showPresetPopover(presetId, presetButton);
                }
            });
        });
    }

    // Check preset button states and disable buttons without globals data
    async checkPresetButtonStates() {
        try {
            // Fetch globals.json to check for preset templates
            const globalsData = await fetchData(GLOBALS, { method: "GET" });
            
            if (!globalsData || !globalsData.ItemPresets) {
                // If no globals data, disable all preset buttons
                document.querySelectorAll(".preset-template-btn").forEach((button) => {
                    button.disabled = true;
                    button.classList.add("disabled");
                    button.title = "Template data not available";
                });
                return;
            }

            // Check each preset button
            document.querySelectorAll(".preset-template-btn").forEach((button) => {
                const presetId = button.dataset.presetId;
                
                if (presetId && globalsData.ItemPresets[presetId]) {
                    // Preset exists in globals - keep button enabled
                    button.disabled = false;
                    button.classList.remove("disabled");
                    button.title = "View template structure";
                } else {
                    // Preset doesn't exist in globals - disable button
                    button.disabled = true;
                    button.classList.add("disabled");
                    button.title = "Template data not available";
                }
            });
        } catch (error) {
            console.error("Error checking preset button states:", error);
            // On error, disable all preset buttons
            document.querySelectorAll(".preset-template-btn").forEach((button) => {
                button.disabled = true;
                button.classList.add("disabled");
                button.title = "Template data not available";
            });
        }
    }

    // Clean up resources
    destroy() {
        // Clean up any resources if needed
    }
}
