// Search optimization utilities for better performance

export class SearchOptimizer {
    constructor() {
        this.searchCache = new Map();
        this.maxCacheSize = 100;
    }

    // Create an optimized search index for text searching
    createSearchIndex(items) {
        const index = new Map();

        items.forEach(item => {
            const searchableText = item.name.toLowerCase();

            // Create n-gram indices for better search performance
            for (let i = 0; i < searchableText.length; i++) {
                for (let len = 1; len <= Math.min(6, searchableText.length - i); len++) {
                    const ngram = searchableText.substring(i, i + len);

                    if (!index.has(ngram)) {
                        index.set(ngram, new Set());
                    }
                    index.get(ngram).add(item);
                }
            }
        });

        return index;
    }

    // Fast search using the search index
    fastSearch(query, searchIndex, items) {
        if (!query || query.length === 0) return [];

        const cacheKey = query.toLowerCase();

        // Check cache first
        if (this.searchCache.has(cacheKey)) {
            return this.searchCache.get(cacheKey);
        }

        const queryLower = query.toLowerCase();
        const isId = /^[0-9a-fA-F]{24}$/.test(query);

        let results;

        if (isId) {
            // Fast ID lookup
            results = items.filter(item => item.id === query);
        } else if (searchIndex && searchIndex.has(queryLower)) {
            // Use search index for exact matches
            results = Array.from(searchIndex.get(queryLower));
        } else {
            // Fallback to linear search for partial matches
            results = items.filter(item =>
                item.name.toLowerCase().includes(queryLower)
            );
        }

        // Cache the results
        this.cacheSearchResult(cacheKey, results);

        return results;
    }

    // Cache search results with LRU eviction
    cacheSearchResult(query, results) {
        if (this.searchCache.size >= this.maxCacheSize) {
            // Remove the oldest entry
            const firstKey = this.searchCache.keys().next().value;
            this.searchCache.delete(firstKey);
        }

        this.searchCache.set(query, results);
    }

    // Clear search cache
    clearCache() {
        this.searchCache.clear();
    }

    // Debounce function for search input
    debounce(func, delay) {
        let debounceTimer;
        return function (...args) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => func.apply(this, args), delay);
        };
    }

    // Create optimized filter for category browsing
    createCategoryFilter(items) {
        const categoryMap = new Map();

        items.forEach(item => {
            item.handbookCategories.forEach(category => {
                const categoryName = category.name;
                if (!categoryMap.has(categoryName)) {
                    categoryMap.set(categoryName, []);
                }
                categoryMap.get(categoryName).push(item);
            });
        });

        return categoryMap;
    }
}

// Create a singleton instance
export const searchOptimizer = new SearchOptimizer();
