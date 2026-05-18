const sptReleases = document.getElementById("sptReleases");
const LATEST_MODS_CACHE_KEY = "latest-mods-feed-v1";
const LATEST_MODS_CACHE_TTL = 1000 * 60 * 60 * 3; // 3 hours

function getCachedLatestMods() {
    try {
        const rawEntry = localStorage.getItem(LATEST_MODS_CACHE_KEY);
        if (!rawEntry) {
            return null;
        }

        const entry = JSON.parse(rawEntry);
        if (!entry || !entry.expiry || Date.now() > entry.expiry) {
            localStorage.removeItem(LATEST_MODS_CACHE_KEY);
            return null;
        }

        return entry.data ?? null;
    } catch (error) {
        console.warn("Failed to read latest mods cache:", error);
        return null;
    }
}

function setCachedLatestMods(data) {
    try {
        const entry = {
            data,
            expiry: Date.now() + LATEST_MODS_CACHE_TTL
        };

        localStorage.setItem(LATEST_MODS_CACHE_KEY, JSON.stringify(entry));
    } catch (error) {
        console.warn("Failed to write latest mods cache:", error);
    }
}

function escapeHtml(value) {
    const stringValue = String(value ?? "");
    return stringValue
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function formatDate(dateValue) {
    if (!dateValue) {
        return "Unknown";
    }

    const parsedDate = new Date(dateValue);
    if (Number.isNaN(parsedDate.getTime())) {
        return "Unknown";
    }

    return parsedDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
    });
}

function truncate(text, maxLength = 120) {
    const safeText = String(text ?? "").trim();
    if (!safeText) {
        return "No description provided.";
    }

    if (safeText.length <= maxLength) {
        return safeText;
    }

    return `${safeText.slice(0, maxLength).trimEnd()}...`;
}

function updateSliderEdgeState(sliderElement) {
    const maxScrollLeft = Math.max(0, sliderElement.scrollWidth - sliderElement.clientWidth);
    const threshold = 2;
    const atStart = sliderElement.scrollLeft <= threshold;
    const atEnd = sliderElement.scrollLeft >= maxScrollLeft - threshold;
    const notScrollable = maxScrollLeft <= threshold;

    sliderElement.classList.toggle("is-at-start", atStart);
    sliderElement.classList.toggle("is-at-end", atEnd);
    sliderElement.classList.toggle("is-not-scrollable", notScrollable);
}

function setupSliderEdgeState(sliderElement) {
    const syncState = () => updateSliderEdgeState(sliderElement);

    sliderElement.addEventListener("scroll", syncState, { passive: true });
    window.addEventListener("resize", syncState, { passive: true });

    requestAnimationFrame(syncState);

    const thumbnails = sliderElement.querySelectorAll("img");
    thumbnails.forEach((img) => {
        if (!img.complete) {
            img.addEventListener("load", syncState, { once: true });
            img.addEventListener("error", syncState, { once: true });
        }
    });
}

if (sptReleases) {
    const url = new URL("../../../includes/forge-api.php?feed=latest-release-v6", import.meta.url).toString();

    const options = {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
    };

    const cachedData = getCachedLatestMods();
    const dataPromise = cachedData
        ? Promise.resolve(cachedData)
        : fetch(url, {
            ...options,
            cache: "no-store"
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Request failed with status ${response.status}`);
                }

                return response.json();
            })
            .then((data) => {
                setCachedLatestMods(data);
                return data;
            });

    dataPromise
    .then((data) => {
        if (data.success && Array.isArray(data.data)) {
            const latestMods = [...data.data]
                .filter((mod) => mod && mod.name && mod.detail_url)
                .sort((a, b) => {
                    const aTime = Date.parse(a.published_at || a.created_at || "");
                    const bTime = Date.parse(b.published_at || b.created_at || "");

                    if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
                        return 0;
                    }

                    if (Number.isNaN(aTime)) {
                        return 1;
                    }

                    if (Number.isNaN(bTime)) {
                        return -1;
                    }

                    return bTime - aTime;
                });

            if (latestMods.length === 0) {
                sptReleases.innerHTML = '<div class="alert alert-secondary">No released mods found</div>';
                return;
            }

            const totalMods = latestMods.length;
            const releasesHTML = latestMods.map((mod, index) => {
                const modName = escapeHtml(mod.name);
                const modTeaser = escapeHtml(truncate(mod.teaser));
                const modAuthor = escapeHtml(mod.owner?.name || "Unknown author");
                const modCategory = escapeHtml(mod.category?.title || "Uncategorized");
                const modDate = formatDate(mod.published_at || mod.created_at);
                const downloadCount = Number.isFinite(Number(mod.downloads))
                    ? Number(mod.downloads).toLocaleString()
                    : "0";
                const modLink = escapeHtml(mod.detail_url);
                const thumbnailUrl = typeof mod.thumbnail === "string" ? mod.thumbnail.trim() : "";
                const thumbnailHtml = thumbnailUrl
                    ? `<img src="${escapeHtml(thumbnailUrl)}" alt="${modName} thumbnail" class="card-img-top spt-mod-thumbnail" loading="lazy">`
                    : '<div class="spt-mod-thumbnail spt-mod-thumbnail-placeholder" aria-hidden="true"></div>';

                return `
                    <article class="moxo-swipe-slide" aria-label="Slide ${index + 1} of ${totalMods}">
                        <a href="${modLink}" target="_blank" rel="noopener noreferrer" class="card-bfx spt-mod-card">
                            <div class="card-body spt spt-mod-body">
                                <div class="spt-mod-media">
                                    ${thumbnailHtml}
                                </div>
                                <div class="spt-mod-content">
                                    <h5 class="card-title">${modName}</h5>
                                    <div class="spt-mod-meta">
                                        <span class="spt-mod-pill spt-mod-category">${modCategory}</span>
                                        <span class="spt-mod-pill">${downloadCount} downloads</span>
                                    </div>
                                    <p class="card-text spt-mod-teaser">${modTeaser}</p>
                                    <div class="spt-mod-footer">
                                        <span class="spt-mod-author">By ${modAuthor}</span>
                                        <span class="spt-mod-date">Released ${modDate}</span>
                                    </div>
                                </div>
                            </div>
                        </a>
                    </article>
                `;
            }).join("");

            sptReleases.innerHTML = releasesHTML;
            setupSliderEdgeState(sptReleases);
        } else {
            sptReleases.innerHTML = '<div class="alert alert-secondary">Failed to load latest mods</div>';
        }
    })
    .catch((error) => {
        console.error("Error fetching latest mods:", error);
        sptReleases.innerHTML = '<div class="alert alert-secondary">Error loading latest mods</div>';
    });
}