import { fetchData } from "../core/cache.js";

const sptReleases = document.getElementById("sptReleases");

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

if (sptReleases) {
    const url = new URL("../../../includes/forge-api.php?feed=latest-release-v4", import.meta.url).toString();

    const options = {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
    };

    fetchData(url, options)
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

            const releasesHTML = latestMods.map((mod) => {
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
                    <a href="${modLink}" target="_blank" rel="noopener noreferrer" class="card-bfx scroll-ani scroll-70 spt-mod-card">
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
                `;
            }).join("");

            sptReleases.innerHTML = releasesHTML;
        } else {
            sptReleases.innerHTML = '<div class="alert alert-secondary">Failed to load latest mods</div>';
        }
    })
    .catch((error) => {
        console.error("Error fetching latest mods:", error);
        sptReleases.innerHTML = '<div class="alert alert-secondary">Error loading latest mods</div>';
    });
}