// ItemBreadcrumb - Handles breadcrumb navigation for items
import { navigationManager } from "../core/navigationManager.js";

export class ItemBreadcrumb {
    constructor(context) {
        this.context = context;
        this.elements = context.elements;
        this.updateBreadcrumb = (itemTypes, itemName) => {
            updateBreadcrumb(this, itemTypes, itemName);
        };
    }
}


function updateBreadcrumb(instance, itemTypes, itemName) {
    if (!instance.elements.breadcrumb || !itemTypes) return;

    // Get types enum from browser module
    const typesEnum = instance.context.manager.modules.browser.getTypesEnum();

    const types = itemTypes.split(",").reverse();
    const validCategories = new Set(Object.values(typesEnum));

    const breadcrumbHTML = generateBreadcrumbHTML(instance, types, validCategories, typesEnum, itemName);

    instance.elements.breadcrumb.innerHTML = `<div class='breadcrumb-container'>${breadcrumbHTML}</div>`;
    instance.elements.breadcrumb.style.display = "block";

    // Setup breadcrumb link handlers
    setupBreadcrumbHandlers(instance);
}

function generateBreadcrumbHTML(instance, types, validCategories, typesEnum, itemName) {
    const breadcrumbParts = types.map((type, index) => {
        const normalizedType = type.trim();
        const isValidCategory = validCategories.has(normalizedType) ||
            Object.keys(instance.context.categoryNameMapping).includes(normalizedType);

        if (index === types.length - 1 && isValidCategory) {
            // Last item - make it a browse link
            return createBrowseLink(normalizedType, typesEnum, type);
        } else if (index === 0 || !isValidCategory) {
            // First item or invalid category - just text
            return `<span class="breadcrumb-text">${type}</span>`;
        } else if (isValidCategory) {
            // Middle valid category - make it a link
            return createCategoryLink(normalizedType, typesEnum, type);
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

function createBrowseLink(normalizedType, typesEnum, displayText) {
    const enumKey = Object.entries(typesEnum).find(
        ([key, value]) => value === normalizedType
    )?.[0] || normalizedType;

    return `<a href="javascript:void(0);" class="breadcrumb-link" data-view="browse" data-category="${enumKey}">${displayText}</a>`;
}

function createCategoryLink(normalizedType, typesEnum, displayText) {
    const enumKey = Object.entries(typesEnum).find(
        ([key, value]) => value === normalizedType
    )?.[0] || normalizedType;

    return `<a href="javascript:void(0);" class="breadcrumb-link" data-category="${enumKey}">${displayText}</a>`;
}

function setupBreadcrumbHandlers(instance) {
    if (!instance.elements.breadcrumb) return;

    instance.elements.breadcrumb.querySelectorAll(".breadcrumb-link").forEach((link) => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            handleBreadcrumbClick(instance, link);
        });
    });
}

function handleBreadcrumbClick(instance, link) {
    // Navigate to browse view
    if (instance.elements.browseNavLink) {
        instance.elements.browseNavLink.click();
    }

    let categoryName = link.dataset.category;

    // Apply category name mapping
    const mappedName = Object.entries(instance.context.categoryNameMapping).find(
        ([key, value]) => value === categoryName
    )?.[0];

    if (mappedName) {
        categoryName = mappedName.replace(/\s+/g, "-");
    } else {
        const typesEnum = instance.context.manager.modules.browser.getTypesEnum();
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
