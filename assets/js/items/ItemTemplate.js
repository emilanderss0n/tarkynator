/**
 * ItemTemplate - Handles JSON template loading and display
 * Manages the template editor and template-related functionality
 */

import { fetchData } from "../core/cache.js";
import { ITEMS_URL } from "../core/localData.js";

export class ItemTemplate {
    constructor(context) {
        this.context = context;
        this.elements = context.elements;
    }

    /**
     * Initialize the template manager
     */
    init() {
        // Setup any initial configurations
    }

    /**
     * Load and display item template
     */
    async loadTemplate(itemId) {
        if (!itemId) return;

        try {
            // Show loader
            if (this.elements.templateLoader) {
                this.elements.templateLoader.style.display = "block";
            }

            // Fetch template data
            const data = await fetchData(ITEMS_URL, { method: "GET" });
            
            // Hide loader
            if (this.elements.templateLoader) {
                this.elements.templateLoader.style.display = "none";
            }

            if (data && typeof data === "object") {
                const itemTemplate = data[itemId];
                
                if (itemTemplate) {
                    this.displayTemplate(itemTemplate);
                    this.enableTemplateNavLink();
                } else {
                    this.displayNoTemplate();
                    this.disableTemplateNavLink();
                }
            } else {
                this.displayInvalidData();
                this.disableTemplateNavLink();
            }

        } catch (error) {
            console.warn("Could not load JSON template:", error.message);
            
            // Hide loader
            if (this.elements.templateLoader) {
                this.elements.templateLoader.style.display = "none";
            }
            
            this.displayUnavailableTemplate();
            this.disableTemplateNavLink();
        }
    }

    /**
     * Display template in editor
     */
    displayTemplate(itemTemplate) {
        if (typeof editor !== "undefined" && editor) {
            editor.setValue(JSON.stringify(itemTemplate, null, 2));
        }
    }

    /**
     * Display message when no template found
     */
    displayNoTemplate() {
        if (typeof editor !== "undefined" && editor) {
            editor.setValue("No JSON template found for this item.");
        }
    }

    /**
     * Display message for invalid data format
     */
    displayInvalidData() {
        if (typeof editor !== "undefined" && editor) {
            editor.setValue("Invalid data format.");
        }
    }

    /**
     * Display message when template is unavailable
     */
    displayUnavailableTemplate() {
        if (typeof editor !== "undefined" && editor) {
            editor.setValue(
                "JSON template unavailable (this is normal if items.json cannot be cached)."
            );
        }
    }

    /**
     * Enable template navigation link
     */
    enableTemplateNavLink() {
        if (this.elements.templateNavLink) {
            this.elements.templateNavLink.classList.remove("disabled");
        }
    }

    /**
     * Disable template navigation link
     */
    disableTemplateNavLink() {
        if (this.elements.templateNavLink) {
            this.elements.templateNavLink.classList.add("disabled");
        }
    }

    /**
     * Check if template is available for item
     */
    async isTemplateAvailable(itemId) {
        try {
            const data = await fetchData(ITEMS_URL, { method: "GET" });
            return data && data[itemId] !== undefined;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get template data for item
     */
    async getTemplateData(itemId) {
        try {
            const data = await fetchData(ITEMS_URL, { method: "GET" });
            return data && data[itemId] ? data[itemId] : null;
        } catch (error) {
            console.error("Error fetching template data:", error);
            return null;
        }
    }

    /**
     * Export template as JSON string
     */
    exportTemplate(itemTemplate, pretty = true) {
        if (pretty) {
            return JSON.stringify(itemTemplate, null, 2);
        }
        return JSON.stringify(itemTemplate);
    }

    /**
     * Validate template data
     */
    validateTemplate(itemTemplate) {
        if (!itemTemplate || typeof itemTemplate !== 'object') {
            return { valid: false, error: 'Template is not a valid object' };
        }

        // Basic validation checks
        const requiredFields = ['_id', '_name', '_parent'];
        const missingFields = requiredFields.filter(field => !itemTemplate[field]);
        
        if (missingFields.length > 0) {
            return { 
                valid: false, 
                error: `Missing required fields: ${missingFields.join(', ')}` 
            };
        }

        return { valid: true };
    }

    /**
     * Get template metadata
     */
    getTemplateMetadata(itemTemplate) {
        if (!itemTemplate) return null;

        return {
            id: itemTemplate._id,
            name: itemTemplate._name,
            parent: itemTemplate._parent,
            type: itemTemplate._type,
            hasProps: !!itemTemplate._props,
            propsCount: itemTemplate._props ? Object.keys(itemTemplate._props).length : 0
        };
    }

    /**
     * Search within template properties
     */
    searchInTemplate(itemTemplate, searchTerm) {
        if (!itemTemplate || !searchTerm) return [];

        const results = [];
        const search = searchTerm.toLowerCase();

        const searchInObject = (obj, path = '') => {
            if (typeof obj === 'object' && obj !== null) {
                for (const [key, value] of Object.entries(obj)) {
                    const currentPath = path ? `${path}.${key}` : key;
                    
                    if (key.toLowerCase().includes(search)) {
                        results.push({
                            path: currentPath,
                            key: key,
                            value: value,
                            type: 'key'
                        });
                    }

                    if (typeof value === 'string' && value.toLowerCase().includes(search)) {
                        results.push({
                            path: currentPath,
                            key: key,
                            value: value,
                            type: 'value'
                        });
                    }

                    if (typeof value === 'object') {
                        searchInObject(value, currentPath);
                    }
                }
            }
        };

        searchInObject(itemTemplate);
        return results;
    }

    /**
     * Refresh template editor
     */
    refreshEditor() {
        if (typeof editor !== "undefined" && editor) {
            setTimeout(() => {
                editor.refresh();
            }, 50);
        }
    }

    /**
     * Clean up resources
     */
    destroy() {
        // Clean up any resources if needed
    }
}
