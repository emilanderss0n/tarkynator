/**
 * ItemBreadcrumb - Handles breadcrumb navigation for items
 * Manages breadcrumb display and navigation between categories
 */

import { navigationManager } from "../core/navigationManager.js";

export class ItemBreadcrumb {
    constructor(context) {
        this.context = context;
        this.elements = context.elements;
    }

    /**
     * Initialize the breadcrumb manager
     */
    init() {
        // Setup any initial configurations
    }

    /**
     * Update breadcrumb display
     */
    updateBreadcrumb(itemTypes, itemName) {
        if (!this.elements.breadcrumb || !itemTypes) return;

        // Get types enum from browser module
        const typesEnum = this.context.manager.modules.browser.getTypesEnum();
        
        const types = itemTypes.split(",").reverse();
        const validCategories = new Set(Object.values(typesEnum));
        
        const breadcrumbHTML = this.generateBreadcrumbHTML(types, validCategories, typesEnum, itemName);
        
        this.elements.breadcrumb.innerHTML = `<div class='breadcrumb-container'>${breadcrumbHTML}</div>`;
        this.elements.breadcrumb.style.display = "block";

        // Setup breadcrumb link handlers
        this.setupBreadcrumbHandlers();
    }

    /**
     * Generate breadcrumb HTML
     */
    generateBreadcrumbHTML(types, validCategories, typesEnum, itemName) {
        const breadcrumbParts = types.map((type, index) => {
            const normalizedType = type.trim();
            const isValidCategory = validCategories.has(normalizedType) ||
                Object.keys(this.context.categoryNameMapping).includes(normalizedType);

            if (index === types.length - 1 && isValidCategory) {
                // Last item - make it a browse link
                return this.createBrowseLink(normalizedType, typesEnum, type);
            } else if (index === 0 || !isValidCategory) {
                // First item or invalid category - just text
                return `<span class="breadcrumb-text">${type}</span>`;
            } else if (isValidCategory) {
                // Middle valid category - make it a link
                return this.createCategoryLink(normalizedType, typesEnum, type);
            } else {
                // Fallback - just text
                return `<span class="breadcrumb-text">${type}</span>`;
            }
        });

        // Join with separators and add current item
        return breadcrumbParts.join(' <i class="bi bi-caret-right-fill"></i> ') +
            ' <i class="bi bi-caret-right-fill"></i> ' +
            `<span class="breadcrumb-current">${itemName}</span>`;
    }

    /**
     * Create browse link for breadcrumb
     */
    createBrowseLink(normalizedType, typesEnum, displayText) {
        const enumKey = Object.entries(typesEnum).find(
            ([key, value]) => value === normalizedType
        )?.[0] || normalizedType;

        return `<a href="javascript:void(0);" class="breadcrumb-link" data-view="browse" data-category="${enumKey}">${displayText}</a>`;
    }

    /**
     * Create category link for breadcrumb
     */
    createCategoryLink(normalizedType, typesEnum, displayText) {
        const enumKey = Object.entries(typesEnum).find(
            ([key, value]) => value === normalizedType
        )?.[0] || normalizedType;

        return `<a href="javascript:void(0);" class="breadcrumb-link" data-category="${enumKey}">${displayText}</a>`;
    }

    /**
     * Setup breadcrumb link click handlers
     */
    setupBreadcrumbHandlers() {
        if (!this.elements.breadcrumb) return;

        this.elements.breadcrumb.querySelectorAll(".breadcrumb-link").forEach((link) => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                this.handleBreadcrumbClick(link);
            });
        });
    }

    /**
     * Handle breadcrumb link click
     */
    handleBreadcrumbClick(link) {
        // Navigate to browse view
        if (this.elements.browseNavLink) {
            this.elements.browseNavLink.click();
        }

        let categoryName = link.dataset.category;

        // Apply category name mapping
        const mappedName = Object.entries(this.context.categoryNameMapping).find(
            ([key, value]) => value === categoryName
        )?.[0];

        if (mappedName) {
            categoryName = mappedName.replace(/\s+/g, "-");
        } else {
            const typesEnum = this.context.manager.modules.browser.getTypesEnum();
            if (typesEnum[categoryName]) {
                categoryName = typesEnum[categoryName].replace(/\s+/g, "-");
            } else {
                categoryName = categoryName.replace(/\s+/g, "-");
            }
        }

        // Find and click the category element
        const categoryElement = document.querySelector(
            `#browseSidebar .browse-category[data-item-type="${categoryName}"]`
        );
        
        if (categoryElement) {
            categoryElement.click();
        }
    }

    /**
     * Hide breadcrumb
     */
    hideBreadcrumb() {
        if (this.elements.breadcrumb) {
            this.elements.breadcrumb.style.display = "none";
        }
    }

    /**
     * Show breadcrumb
     */
    showBreadcrumb() {
        if (this.elements.breadcrumb) {
            this.elements.breadcrumb.style.display = "block";
        }
    }

    /**
     * Clear breadcrumb content
     */
    clearBreadcrumb() {
        if (this.elements.breadcrumb) {
            this.elements.breadcrumb.innerHTML = "";
        }
    }

    /**
     * Check if breadcrumb is visible
     */
    isBreadcrumbVisible() {
        return this.elements.breadcrumb && 
               this.elements.breadcrumb.style.display !== "none";
    }

    /**
     * Get breadcrumb path as array
     */
    getBreadcrumbPath() {
        if (!this.elements.breadcrumb) return [];

        const textElements = this.elements.breadcrumb.querySelectorAll('.breadcrumb-text, .breadcrumb-link, .breadcrumb-current');
        return Array.from(textElements).map(el => el.textContent.trim());
    }

    /**
     * Generate breadcrumb from category path
     */
    generateFromCategoryPath(categoryPath, itemName) {
        if (!Array.isArray(categoryPath)) return;

        const itemTypes = categoryPath.join(", ");
        this.updateBreadcrumb(itemTypes, itemName);
    }

    /**
     * Update breadcrumb with custom path
     */
    updateWithCustomPath(pathSegments, currentItem) {
        if (!this.elements.breadcrumb || !Array.isArray(pathSegments)) return;

        const breadcrumbHTML = pathSegments
            .map((segment, index) => {
                if (segment.link) {
                    return `<a href="javascript:void(0);" class="breadcrumb-link" data-category="${segment.category || segment.text}">${segment.text}</a>`;
                } else {
                    return `<span class="breadcrumb-text">${segment.text}</span>`;
                }
            })
            .join(' <i class="bi bi-caret-right-fill"></i> ') +
            (currentItem ? ` <i class="bi bi-caret-right-fill"></i> <span class="breadcrumb-current">${currentItem}</span>` : '');

        this.elements.breadcrumb.innerHTML = `<div class='breadcrumb-container'>${breadcrumbHTML}</div>`;
        this.elements.breadcrumb.style.display = "block";

        this.setupBreadcrumbHandlers();
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Clean up any resources if needed
    }
}
