function applyLoadState(img) {
    img.classList.add("is-loaded");
}

function setImageFallback(img, fallbackSrc) {
    if (!img || !fallbackSrc) {
        return;
    }

    img.addEventListener("error", () => {
        if (img.dataset.fallbackApplied === "true") {
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

        if (img.complete && img.naturalWidth > 0) {
            applyLoadState(img);
        }
    });
}
