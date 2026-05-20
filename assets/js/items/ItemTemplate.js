// ItemTemplate - Handles JSON template loading and display
import { fetchData } from "../core/cache.js";
import { ITEMS_URL } from "../core/localData.js";

export class ItemTemplate {
    constructor(context) {
        this.context = context;
        this.elements = context.elements;
        this.loadTemplate = async (itemId) => {
            await loadTemplate(this, itemId);
        };
    }
}

async function loadTemplate(instance, itemId) {
    if (!itemId) return;

    try {
        // Show loader
        if (instance.elements.templateLoader) {
            instance.elements.templateLoader.style.display = "block";
        }

        // Fetch template data
        const data = await fetchData(ITEMS_URL, { method: "GET" });

        // Hide loader
        if (instance.elements.templateLoader) {
            instance.elements.templateLoader.style.display = "none";
        }

        if (data && typeof data === "object") {
            const itemTemplate = data[itemId];

            if (itemTemplate) {
                displayTemplate(itemTemplate);
                enableTemplateNavLink(instance);
            } else {
                displayNoTemplate();
                disableTemplateNavLink(instance);
            }
        } else {
            displayInvalidData();
            disableTemplateNavLink(instance);
        }

    } catch (error) {
        console.warn("Could not load JSON template:", error.message);

        // Hide loader
        if (instance.elements.templateLoader) {
            instance.elements.templateLoader.style.display = "none";
        }

        displayUnavailableTemplate();
        disableTemplateNavLink(instance);
    }
}

function displayTemplate(itemTemplate) {
    if (typeof editor !== "undefined" && editor) {
        editor.setValue(JSON.stringify(itemTemplate, null, 2));
    }
}

function displayNoTemplate() {
    if (typeof editor !== "undefined" && editor) {
        editor.setValue("No JSON template found for this item.");
    }
}

function displayInvalidData() {
    if (typeof editor !== "undefined" && editor) {
        editor.setValue("Invalid data format.");
    }
}

function displayUnavailableTemplate() {
    if (typeof editor !== "undefined" && editor) {
        editor.setValue(
            "JSON template unavailable (this is normal if items.json cannot be cached)."
        );
    }
}

function enableTemplateNavLink(instance) {
    if (instance.elements.templateNavLink) {
        instance.elements.templateNavLink.classList.remove("disabled");
    }
}

function disableTemplateNavLink(instance) {
    if (instance.elements.templateNavLink) {
        instance.elements.templateNavLink.classList.add("disabled");
    }
}
