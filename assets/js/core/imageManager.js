function getImageSpinnerHost(img) {
    if (!img?.parentElement) {
        return null;
    }

    const parent = img.parentElement;
    if (parent.classList.contains("image-loading-host")) {
        return parent;
    }

    // If the image is already isolated in its parent, use that parent directly.
    if (parent.childElementCount === 1) {
        parent.classList.add("image-loading-host");
        return parent;
    }

    // Otherwise, wrap only this image to avoid affecting sibling layout/content.
    const wrapper = document.createElement("span");
    wrapper.className =
        "image-loading-host image-loading-host-wrapper d-inline-flex justify-content-center align-items-center";
    parent.insertBefore(wrapper, img);
    wrapper.appendChild(img);

    return wrapper;
}

function applyHostLoadingDimensions(host, img) {
    if (!host || !img || host.dataset.loadingDimensionsApplied === "true") {
        return;
    }

    const computed = window.getComputedStyle(img);
    const computedWidth = parseFloat(computed.width) || 0;
    const computedHeight = parseFloat(computed.height) || 0;
    const attributeWidth = parseFloat(img.getAttribute("width")) || 0;
    const attributeHeight = parseFloat(img.getAttribute("height")) || 0;

    const width = computedWidth || attributeWidth;
    const height = computedHeight || attributeHeight;
    const fallbackSize = 28;

    if (width > 0) {
        host.style.minWidth = `${width}px`;
    } else {
        host.style.minWidth = `${fallbackSize}px`;
    }

    if (height > 0) {
        host.style.minHeight = `${height}px`;
    } else {
        host.style.minHeight = `${fallbackSize}px`;
    }

    host.dataset.loadingDimensionsApplied = "true";
}

function clearHostLoadingDimensions(host) {
    if (!host) {
        return;
    }

    if (host.dataset.loadingDimensionsApplied === "true") {
        host.style.removeProperty("min-width");
        host.style.removeProperty("min-height");
        delete host.dataset.loadingDimensionsApplied;
    }
}

function addImageLoadingSpinner(img) {
    if (!img || img.dataset.noImageSpinner === "true") {
        return;
    }

    const host = getImageSpinnerHost(img);
    if (!host) {
        return;
    }

    applyHostLoadingDimensions(host, img);
    host.classList.add("image-loading-active");

    const existingSpinner = host.querySelector(".image-loading-spinner");
    if (existingSpinner) {
        return;
    }

    const spinner = document.createElement("span");
    spinner.className = "image-loading-spinner d-flex justify-content-center align-items-center";
    spinner.setAttribute("aria-hidden", "true");
    spinner.innerHTML = `
        <span class="spinner-border spinner-border-sm" role="status">
            <span class="visually-hidden">Loading...</span>
        </span>
    `;

    host.appendChild(spinner);
}

function removeImageLoadingSpinner(img) {
    const host = img?.parentElement;
    if (!host) {
        return;
    }

    const spinner = host.querySelector(".image-loading-spinner");
    if (spinner) {
        spinner.remove();
    }

    host.classList.remove("image-loading-active");
    clearHostLoadingDimensions(host);
    host.classList.add("image-loaded");
}

function scheduleImageLoadingSpinner(img, attempts = 0) {
    if (!img || img.dataset.noImageSpinner === "true") {
        return;
    }

    if (img.complete && img.naturalWidth > 0) {
        applyLoadState(img);
        return;
    }

    if (img.parentElement) {
        addImageLoadingSpinner(img);
        return;
    }

    if (attempts < 8) {
        requestAnimationFrame(() => {
            scheduleImageLoadingSpinner(img, attempts + 1);
        });
    }
}

function applyLoadState(img) {
    img.classList.add("is-loaded");
    removeImageLoadingSpinner(img);
}

function setImageFallback(img, fallbackSrc) {
    if (!img) {
        return;
    }

    img.addEventListener("error", () => {
        if (!fallbackSrc) {
            removeImageLoadingSpinner(img);
            return;
        }

        if (img.dataset.fallbackApplied === "true") {
            removeImageLoadingSpinner(img);
            return;
        }

        img.dataset.fallbackApplied = "true";
        img.src = fallbackSrc;
    });
}

export function createManagedImage(config = {}) {
    const {
        src,
        alt = "",
        className = "",
        loading = "lazy",
        decoding = "async",
        fetchPriority,
        width,
        height,
        fallbackSrc,
    } = config;

    const img = document.createElement("img");
    img.classList.add("managed-image");

    if (className) {
        img.className = `managed-image ${className}`.trim();
    }

    if (src) {
        img.src = src;
    }

    img.alt = alt;
    img.loading = loading;
    img.decoding = decoding;

    if (fetchPriority) {
        img.setAttribute("fetchpriority", fetchPriority);
    }

    if (typeof width === "number") {
        img.width = width;
    }

    if (typeof height === "number") {
        img.height = height;
    }

    setImageFallback(img, fallbackSrc);

    img.addEventListener("load", () => {
        applyLoadState(img);
    });

    scheduleImageLoadingSpinner(img);

    if (img.complete && img.naturalWidth > 0) {
        applyLoadState(img);
    }

    return img;
}

export function enhanceContainerImages(container, config = {}) {
    if (!container) {
        return;
    }

    const {
        loading = "lazy",
        decoding = "async",
        fallbackSrc,
    } = config;

    const images = container.querySelectorAll("img:not([data-managed='true'])");

    images.forEach((img) => {
        img.dataset.managed = "true";

        if (!img.classList.contains("managed-image")) {
            img.classList.add("managed-image");
        }

        if (!img.getAttribute("loading")) {
            img.setAttribute("loading", loading);
        }

        if (!img.getAttribute("decoding")) {
            img.setAttribute("decoding", decoding);
        }

        const imageFallback = img.dataset.fallbackSrc || fallbackSrc;
        setImageFallback(img, imageFallback);

        img.addEventListener("load", () => {
            applyLoadState(img);
        });

        scheduleImageLoadingSpinner(img);

        if (img.complete && img.naturalWidth > 0) {
            applyLoadState(img);
        }
    });
}
