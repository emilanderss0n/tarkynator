// ItemDependencies - Handles item dependency management
export class ItemDependencies {
    constructor(context) {
        this.context = context;
        this.elements = context.elements;
    }

    init() {
        // Setup any initial configurations
    }

    // Handle copying dependencies to clipboard
    handleCopyDependencies(copyButton) {
        const depItem = copyButton.closest(".dep-item");
        if (!depItem) return;

        try {
            const assetPath = depItem.querySelector("p:nth-of-type(1) .global-id")?.textContent;
            const dependencyKeys = Array.from(
                depItem.querySelectorAll(".list-group .global-id")
            ).map((el) => el.textContent);

            if (!assetPath) {
                console.error("Asset path not found");
                this.showCopyError(copyButton);
                return;
            }

            const jsonOutput = {
                key: assetPath,
                dependencyKeys: dependencyKeys,
            };

            navigator.clipboard
                .writeText(JSON.stringify(jsonOutput, null, 3))
                .then(() => {
                    this.showCopySuccess(copyButton);
                })
                .catch((err) => {
                    console.error("Failed to copy:", err);
                    this.showCopyError(copyButton);
                });

        } catch (error) {
            console.error("Error processing dependencies:", error);
            this.showCopyError(copyButton);
        }
    }

    showCopySuccess(copyButton) {
        const originalHTML = copyButton.innerHTML;
        copyButton.innerHTML = '<i class="bi bi-check"></i> Copied!';
        
        setTimeout(() => {
            copyButton.innerHTML = originalHTML || '<i class="bi bi-clipboard"></i> Copy';
        }, 2000);
    }

    showCopyError(copyButton) {
        const originalHTML = copyButton.innerHTML;
        copyButton.innerHTML = '<i class="bi bi-x"></i> Failed';
        
        setTimeout(() => {
            copyButton.innerHTML = originalHTML || '<i class="bi bi-clipboard"></i> Copy';
        }, 2000);
    }

    generateDependenciesHTML(dependencies, assetPath, rarityClass = '') {
        if (!dependencies || !Array.isArray(dependencies) || dependencies.length === 0) {
            return '';
        }

        const dependencyItems = dependencies
            .map((dep) => `<div class="list-group-item"><span class="global-id">${dep}</span></div>`)
            .join("");

        return `
            <div class="dependencies card">
                <div class="dep-item">
                    <div class="dep-item-title ${rarityClass}">
                        <h3>Dependency Information</h3>
                        <button class="btn btn-sm btn-info copy-deps">
                            <i class="bi bi-clipboard"></i> Copy
                        </button>
                    </div>
                    <div class="dep-contents">
                        <p>Asset Path: <span class="global-id">${assetPath}</span></p>
                        <div class="list-group">
                            ${dependencyItems}
                        </div>
                    </div>
                </div>
            </div>`;
    }

    parseDependencies(dependenciesData, prefabPath) {
        if (!dependenciesData || !prefabPath) {
            return null;
        }

        const itemDependencies = Object.entries(dependenciesData).filter(([key]) => {
            if (!prefabPath) return false;
            const normalizedPrefabPath = prefabPath.toLowerCase();
            return key.toLowerCase().includes(normalizedPrefabPath);
        });

        if (itemDependencies.length > 0) {
            const [path, data] = itemDependencies[0];
            return {
                path: path,
                dependencies: data.Dependencies || []
            };
        }

        return null;
    }

    extractDependencyData(itemTemplate) {
        if (!itemTemplate || !itemTemplate._props) {
            return null;
        }

        const prefabPath = itemTemplate._props.Prefab?.path;
        if (!prefabPath) {
            return null;
        }

        return {
            prefabPath: prefabPath,
            rarity: itemTemplate._props.RarityPvE
        };
    }

    validateDependencies(dependencies) {
        if (!Array.isArray(dependencies)) {
            return { valid: false, error: 'Dependencies must be an array' };
        }

        const invalidDeps = dependencies.filter(dep => typeof dep !== 'string' || dep.trim() === '');
        if (invalidDeps.length > 0) {
            return { valid: false, error: 'All dependencies must be non-empty strings' };
        }

        return { valid: true };
    }

    getDependencyStats(dependencies) {
        if (!Array.isArray(dependencies)) {
            return { count: 0, unique: 0, duplicates: 0 };
        }

        const unique = new Set(dependencies);
        return {
            count: dependencies.length,
            unique: unique.size,
            duplicates: dependencies.length - unique.size
        };
    }

    filterDependencies(dependencies, pattern) {
        if (!Array.isArray(dependencies) || !pattern) {
            return dependencies;
        }

        const regex = new RegExp(pattern, 'i');
        return dependencies.filter(dep => regex.test(dep));
    }

    sortDependencies(dependencies, sortBy = 'alphabetical') {
        if (!Array.isArray(dependencies)) {
            return dependencies;
        }

        const sorted = [...dependencies];

        switch (sortBy) {
            case 'alphabetical':
                return sorted.sort();
            case 'length':
                return sorted.sort((a, b) => a.length - b.length);
            case 'reverse':
                return sorted.reverse();
            default:
                return sorted;
        }
    }

    exportDependencies(assetPath, dependencies, format = 'pretty') {
        const data = {
            key: assetPath,
            dependencyKeys: dependencies
        };

        if (format === 'pretty') {
            return JSON.stringify(data, null, 2);
        } else if (format === 'compact') {
            return JSON.stringify(data);
        } else if (format === 'formatted') {
            return JSON.stringify(data, null, 3);
        }

        return JSON.stringify(data, null, 2);
    }

    hasDependencies(dependencyElement) {
        if (!dependencyElement) return false;
        
        const dependencyItems = dependencyElement.querySelectorAll('.list-group-item');
        return dependencyItems.length > 0;
    }

    destroy() {
        // Clean up any resources if needed
    }
}
