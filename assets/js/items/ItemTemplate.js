// ItemTemplate - Handles JSON template loading and display
import { fetchData } from "../core/cache.js";
import { ITEMS_URL } from "../core/localData.js";
import { withViewTransition } from "../core/viewTransitionManager.js";
import { setOverlayLoading } from "../core/pageLoading.js";

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

    const templateContent =
        instance.elements.templateContent ||
        document.getElementById("templateContent");

    setOverlayLoading(templateContent, true, {
        label: "Loading template...",
        spinnerClass: "spinner-border spinner-border-sm",
    });

    try {
        // Fetch template data
        const data = await fetchData(ITEMS_URL, { method: "GET" });

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

        displayUnavailableTemplate();
        disableTemplateNavLink(instance);
    } finally {
        setOverlayLoading(templateContent, false);
    }
}

function displayTemplate(itemTemplate) {
    if (typeof editor !== "undefined" && editor) {
        withViewTransition(() => {
            editor.setValue(JSON.stringify(itemTemplate, null, 2));
        }, { skipIfBusy: true });
    }
}

function displayNoTemplate() {
    if (typeof editor !== "undefined" && editor) {
        withViewTransition(() => {
            editor.setValue("No JSON template found for this item.");
        }, { skipIfBusy: true });
    }
}

function displayInvalidData() {
    if (typeof editor !== "undefined" && editor) {
        withViewTransition(() => {
            editor.setValue("Invalid data format.");
        }, { skipIfBusy: true });
    }
}

function displayUnavailableTemplate() {
    if (typeof editor !== "undefined" && editor) {
        withViewTransition(() => {
            editor.setValue(
                "JSON template unavailable (this is normal if items.json cannot be cached)."
            );
        }, { skipIfBusy: true });
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
