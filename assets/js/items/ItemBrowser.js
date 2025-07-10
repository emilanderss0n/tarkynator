// ItemBrowser - Handles item browsing and category functionality
import { searchOptimizer } from "../core/searchOptimizer.js";
import { navigationManager } from "../core/navigationManager.js";
import { checkJsonEditorSimple } from "../components/checkJsonEditor.js";

export class ItemBrowser {
    constructor(context) {
        this.context = context;
        this.elements = context.elements;
        
        // Browser state
        this.currentPage = 1;
        this.browseItemsData = [];
        this.filteredItemsData = [];
        this.itemsPerPageDefault = 63;
        this.itemsPerPage = this.itemsPerPageDefault;
        this.categoryCache = {};
        this.isRendering = false;
        this.isAttachingListeners = false;

        // Types enum
        this.typesEnum = Object.freeze({
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

        // Types that should be grouped
        this.typesToGroup = new Set([
            this.typesEnum.AmmoPacks,
            this.typesEnum.Barrels,
            this.typesEnum.ChargingHandles,
            this.typesEnum.FlashhidersBrakes,
            this.typesEnum.GasBlocks,
            this.typesEnum.Handguards,
            this.typesEnum.Magazines,
            this.typesEnum.PistolGrips,
            this.typesEnum.ReceiversSlides,
            this.typesEnum.Sights,
            this.typesEnum.StocksChassis,
            this.typesEnum.Suppressors,
        ]);

        // Debounced functions
        this.debouncedRenderBrowseItems = searchOptimizer.debounce(
            this.renderBrowseItems.bind(this),
            200
        );

        this.handleSearch = searchOptimizer.debounce((event) => {
            const searchTerm = event.target.value.toLowerCase();
            if (searchTerm.length > 0) {
                // Filter within current category items only
                this.filteredItemsData = this.browseItemsData.filter(item => {
                    const nameMatch = item.name.toLowerCase().includes(searchTerm);
                    const shortNameMatch = item.shortName?.toLowerCase().includes(searchTerm);
                    const descriptionMatch = item.description?.toLowerCase().includes(searchTerm);
                    
                    return nameMatch || shortNameMatch || descriptionMatch;
                });
                this.currentPage = 1;
                this.renderBrowseItems();
            } else {
                this.filteredItemsData = [];
                this.renderBrowseItems();
            }
        }, 150);
    }

    init() {
        this.setupBrowseCategories();
        // Don't load initial category data until user actually navigates to browse view
    }

    setupBrowseCategories() {
        if (!this.elements.browseSidebar) return;

        Object.values(this.typesEnum).forEach((type) => {
            const browseItem = document.createElement("div");
            browseItem.className = "browse-category";
            browseItem.dataset.itemType = type.replace(/\s+/g, "-");
            browseItem.innerHTML = `${type}`;
            this.elements.browseSidebar.appendChild(browseItem);
        });
    }

    setupInitialCategory() {
        const firstCategory = document.querySelector(".browse-category");
        if (firstCategory) {
            firstCategory.classList.add("active");
            const itemType = firstCategory.dataset.itemType.replace(/-/g, " ");
            this.loadCategory(itemType);
        }
    }

    async loadCategory(itemType, page = 1) {
        if (!this.elements.browseItems) return;

        this.elements.browseItems.innerHTML = '<div id="activityContent"><span class="loader"></span></div>';
        this.currentPage = page;
        
        // Clear search state when switching categories
        this.filteredItemsData = [];

        // Check cache first
        if (this.categoryCache[itemType]) {
            this.browseItemsData = this.categoryCache[itemType];
            this.filteredItemsData = [];
            requestIdleCallback(this.debouncedRenderBrowseItems);
            return;
        }

        const apiCategoryName = this.context.categoryNameMapping[itemType] || itemType;

        try {
            // Ensure data is loaded
            if (!this.context.gameDataCache()) {
                await this.context.ensureDataLoaded();
            }

            // Get items for category
            const categoryFilterMap = this.context.categoryFilterMap();
            if (categoryFilterMap && categoryFilterMap.has(apiCategoryName)) {
                this.browseItemsData = categoryFilterMap.get(apiCategoryName);
            } else {
                const items = this.context.itemsArrayCache() || Object.values(this.context.gameDataCache().items);
                this.browseItemsData = items.filter((item) =>
                    item.handbookCategories.some((category) => {
                        return (
                            category.name === apiCategoryName ||
                            category.name.replace(/\s*\/\s*/g, "/") === itemType.replace(/\s*\/\s*/g, "/")
                        );
                    })
                );
            }

            // Sort items alphabetically
            this.browseItemsData.sort((a, b) => a.name.localeCompare(b.name));
            
            // Cache the results
            this.categoryCache[itemType] = this.browseItemsData;
            this.filteredItemsData = [];
            
            requestIdleCallback(this.debouncedRenderBrowseItems);

        } catch (error) {
            console.error("Error fetching data:", error);
            this.elements.browseItems.innerHTML = "Error fetching data.";
        }
    }

    renderBrowseItems() {
        if (this.isRendering || !this.elements.browseItems) return;
        this.isRendering = true;

        const itemsToDisplay = this.filteredItemsData.length > 0 ? this.filteredItemsData : this.browseItemsData;
        const currentItemType = document.querySelector(".browse-category.active")?.dataset.itemType.replace(/-/g, " ");
        const shouldGroupItems = this.typesToGroup.has(currentItemType);

        this.itemsPerPage = shouldGroupItems ? 30 : this.itemsPerPageDefault;

        const paginatedItems = this.paginate(itemsToDisplay, this.currentPage, this.itemsPerPage);
        const fragment = document.createDocumentFragment();

        if (shouldGroupItems) {
            this.renderGroupedItems(paginatedItems, fragment);
        } else {
            this.renderRegularItems(paginatedItems, fragment);
        }

        // Preserve search input state
        const searchInput = document.getElementById("browseSearchInput");
        const currentSearchValue = searchInput?.value || "";
        const wasFocused = searchInput === document.activeElement;

        // Clear browse items but preserve search filter
        const searchFilter = this.elements.browseItems.querySelector(".search-filter");
        this.elements.browseItems.innerHTML = "";
        
        // Re-add preserved search filter or create new one
        if (searchFilter) {
            this.elements.browseItems.appendChild(searchFilter);
        } else {
            const newSearchFilter = document.createElement("div");
            newSearchFilter.className = "search-filter";
            newSearchFilter.innerHTML = `
                <input type="text" id="browseSearchInput" class="form-control" placeholder="Search within category..." value="${currentSearchValue}">
            `;
            this.elements.browseItems.appendChild(newSearchFilter);
        }

        // Restore focus if it was focused before
        if (wasFocused) {
            requestAnimationFrame(() => {
                const restoredInput = document.getElementById("browseSearchInput");
                if (restoredInput) {
                    restoredInput.focus();
                }
            });
        }
        
        // Add items
        this.elements.browseItems.appendChild(fragment);
        
        // Add pagination
        this.elements.browseItems.insertAdjacentHTML(
            "beforeend",
            this.renderPaginationControls(itemsToDisplay.length, this.itemsPerPage)
        );

        // Attach event listeners
        if (!this.isAttachingListeners) {
            this.isAttachingListeners = true;
            requestIdleCallback(() => {
                this.attachEventListeners();
                this.isAttachingListeners = false;
            });
        }

        this.isRendering = false;
    }

    renderGroupedItems(paginatedItems, fragment) {
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
            groupTitle.className = "break group-title scroll-ani";
            groupTitle.innerHTML = `<h4>${group}</h4>`;
            fragment.appendChild(groupTitle);

            groupedItems[group].forEach((item) => {
                const itemElement = this.createItemElement(item);
                fragment.appendChild(itemElement);
            });
        });
    }

    renderRegularItems(paginatedItems, fragment) {
        paginatedItems.forEach((item) => {
            const itemElement = this.createItemElement(item);
            fragment.appendChild(itemElement);
        });
    }

    createItemElement(item) {
        const itemIconLink = item.iconLink.replace(/^.*\/data\/icons\//, "data/icons/");
        const itemElement = document.createElement("a");
        itemElement.href = "javascript:void(0);";
        itemElement.className = "browse-item card-bfx scroll-ani";
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
    }

    paginate(items, currentPage, itemsPerPage) {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return items.slice(startIndex, endIndex);
    }

    renderPaginationControls(totalItems, perPage) {
        const totalPages = Math.ceil(totalItems / perPage);
        const isFiltered = this.filteredItemsData.length > 0;
        const totalCategoryItems = this.browseItemsData.length;

        let paginationHTML = '<div id="browsePagination">';
        
        // Add search results info
        if (isFiltered) {
            paginationHTML += `<div class="search-results-info">
                Showing ${totalItems} of ${totalCategoryItems} items
            </div>`;
        }
        
        if (totalPages > 1) {
            paginationHTML += '<nav aria-label="Page navigation"><ul class="pagination pagination-sm">';
            for (let i = 1; i <= totalPages; i++) {
                paginationHTML += `
                    <li class="page-item ${i === this.currentPage ? "active" : ""}">
                        <a href="javascript:void(0);" class="page-link" data-page="${i}">${i}</a>
                    </li>`;
            }
            paginationHTML += "</ul></nav>";
        }
        paginationHTML += "</div>";
        return paginationHTML;
    }

    attachEventListeners() {
        // Item click handlers
        document.querySelectorAll("#browseItems .browse-item").forEach((itemElement) => {
            itemElement.addEventListener("click", () => {
                const itemId = itemElement.dataset.itemId;
                navigationManager.navigateToItem(itemId, "handbook");
                checkJsonEditorSimple();
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        });

        // Pagination handlers
        document.querySelectorAll("#browsePagination .page-link").forEach((pageLink) => {
            pageLink.addEventListener("click", (event) => {
                event.preventDefault();
                this.currentPage = parseInt(event.target.dataset.page, 10);
                this.renderBrowseItems();
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        });

        // Search input handler
        const browseSearchInput = document.getElementById("browseSearchInput");
        if (browseSearchInput) {
            browseSearchInput.removeEventListener("input", this.handleSearch);
            browseSearchInput.addEventListener("input", this.handleSearch);
        }

        // Category click handlers
        document.querySelectorAll(".browse-category").forEach((categoryElement) => {
            categoryElement.addEventListener("click", () => {
                document.querySelectorAll(".browse-category").forEach((el) => el.classList.remove("active"));
                categoryElement.classList.add("active");
                const itemType = categoryElement.dataset.itemType;
                this.context.manager.lastActiveCategory = itemType;
                this.loadCategory(itemType.replace(/-/g, " "));
                window.scrollTo({ top: 0, behavior: "smooth" });
            });
        });
    }

    handleBrowseContainerActivation() {
        const activeCategory = this.context.manager.lastActiveCategory || "Ammo-packs";
        const categoryElement = document.querySelector(
            `#browseSidebar .browse-category[data-item-type="${activeCategory}"]`
        );

        if (categoryElement) {
            document.querySelectorAll("#browseSidebar .browse-category")
                .forEach((category) => category.classList.remove("active"));
            categoryElement.classList.add("active");

            const formattedCategory = activeCategory.replace(/-/g, " ");
            this.loadCategory(formattedCategory);
        }
    }

    getTypesEnum() {
        return this.typesEnum;
    }

    destroy() {
        // Clean up any resources if needed
    }
}
