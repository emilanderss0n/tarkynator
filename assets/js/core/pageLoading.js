function createPageLoadingMarkup(options = {}) {
    const {
        label = "Loading...",
        wrapperClass = "page-loading-state d-flex justify-content-center align-items-center",
        spinnerClass = "spinner-border",
        minHeight = 300,
    } = options;

    return `
        <div class="${wrapperClass}" style="min-height: ${minHeight}px;">
            <div class="${spinnerClass}" role="status">
                <span class="visually-hidden">${label}</span>
            </div>
        </div>
    `;
}

function createOverlayLoadingMarkup(options = {}) {
    const {
        label = "Loading...",
        wrapperClass = "page-loading-overlay d-flex justify-content-center align-items-center",
        spinnerClass = "spinner-border",
    } = options;

    return `
        <div class="${wrapperClass}">
            <div class="${spinnerClass}" role="status">
                <span class="visually-hidden">${label}</span>
            </div>
        </div>
    `;
}

function createOverlayElement(options = {}) {
    const {
        label = "Loading...",
        spinnerClass = "spinner-border",
        minHeight = 300,
    } = options;

    const overlay = document.createElement("div");
    overlay.className = "page-loading-overlay d-flex justify-content-center align-items-center";
    overlay.dataset.pageLoadingOverlay = "true";
    overlay.style.minHeight = `${minHeight}px`;
    overlay.innerHTML = `
        <div class="${spinnerClass}" role="status">
            <span class="visually-hidden">${label}</span>
        </div>
    `;

    return overlay;
}

export function setPageLoading(container, isLoading, options = {}) {
    if (!container) {
        return;
    }

    const { minHeight = 300, overlay = false } = options;

    if (isLoading) {
        container.classList.add("is-page-loading");
        container.style.setProperty("--page-loading-min-height", `${minHeight}px`);

        if (overlay) {
            container.classList.add("has-page-loading-overlay");

            let overlayElement = container.querySelector(".page-loading-overlay[data-page-loading-overlay='true']");
            if (!overlayElement) {
                overlayElement = createOverlayElement(options);
                container.appendChild(overlayElement);
            }

            return;
        }

        container.innerHTML = createPageLoadingMarkup(options);
        return;
    }

    container
        .querySelectorAll(".page-loading-overlay[data-page-loading-overlay='true']")
        .forEach((overlayElement) => overlayElement.remove());
    container.classList.remove("has-page-loading-overlay");
    container.classList.remove("is-page-loading");
    container.style.removeProperty("--page-loading-min-height");
}

export function setOverlayLoading(container, isLoading, options = {}) {
    if (!container) {
        return;
    }

    if (isLoading) {
        container.classList.add("is-overlay-loading");
        const existingOverlay = container.querySelector(":scope > .page-loading-overlay");

        if (!existingOverlay) {
            container.insertAdjacentHTML(
                "beforeend",
                createOverlayLoadingMarkup(options)
            );
        }

        return;
    }

    container.classList.remove("is-overlay-loading");
    const overlay = container.querySelector(":scope > .page-loading-overlay");
    if (overlay) {
        overlay.remove();
    }
}
