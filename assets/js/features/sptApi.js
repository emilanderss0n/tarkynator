import { fetchData } from "../core/cache.js";

const sptReleases = document.getElementById("sptReleases");

if (sptReleases) {
    const url = "https://forge.sp-tarkov.com/api/v0/spt/versions";

    const options = {
        method: "GET",
        headers: {
            "Authorization": "Bearer TJ0qCq8kpXMTGey1vCZtPaa3cN46AiBzh4A3ODQh1c1a107e",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
    };

    fetchData(url, options)
    .then(data => {
        if (data.success && data.data) {
            // Get all releases and sort by version (highest first)
            const releases = data.data.sort((a, b) => {
                // Compare major version first
                if (a.version_major !== b.version_major) {
                    return b.version_major - a.version_major;
                }
                // Then minor version
                if (a.version_minor !== b.version_minor) {
                    return b.version_minor - a.version_minor;
                }
                // Finally patch version
                return b.version_patch - a.version_patch;
            });

            // Create HTML for the releases
            const releasesHTML = releases.map(release => `
                <a href="${release.link}" target="_blank" class="card-bfx ${release.color_class}">
                    <div class="card-body spt">
                        <h5 class="card-title"><span class="round-badge ${release.color_class}"></span> ${release.version}</h5>
                        <p class="card-text">Mods: ${release.mod_count}</p>
                    </div>
                </a>
            `).join('');
            
            // Insert the releases into the sptReleases element
            sptReleases.innerHTML = releasesHTML;
        } else {
            sptReleases.innerHTML = '<p>Failed to load SPT releases</p>';
        }
    })
    .catch(error => {
        console.error('Error fetching SPT releases:', error);
        sptReleases.innerHTML = '<p>Error loading SPT releases</p>';
    });

}