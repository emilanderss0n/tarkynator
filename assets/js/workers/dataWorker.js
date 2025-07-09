// Dedicated Web Worker for background data processing
// This helps offload heavy computations from the main thread

// Handle background data processing messages
self.addEventListener('message', (event) => {
    const { type, data } = event.data;

    try {
        switch (type) {
            case 'CREATE_SEARCH_INDEX':
                const searchIndex = createSearchIndex(data);
                self.postMessage({ type: 'SEARCH_INDEX_READY', data: searchIndex });
                break;

            case 'CREATE_CATEGORY_FILTER':
                const categoryFilter = createCategoryFilter(data);
                self.postMessage({ type: 'CATEGORY_FILTER_READY', data: categoryFilter });
                break;

            case 'SEARCH_ITEMS':
                const searchResults = performSearch(data.query, data.searchIndex, data.items);
                self.postMessage({ type: 'SEARCH_RESULTS', data: searchResults });
                break;

            default:
                console.warn('Unknown message type:', type);
        }
    } catch (error) {
        self.postMessage({ type: 'ERROR', error: error.message });
    }
});

// Create search index optimized for fast searching
function createSearchIndex(items) {
    const index = new Map();
    
    items.forEach((item, itemIndex) => {
        const searchableText = [
            item.name?.toLowerCase() || '',
            item.shortName?.toLowerCase() || '',
            item.description?.toLowerCase() || ''
        ].join(' ');

        // Create word-based indices
        const words = searchableText.split(/\s+/).filter(word => word.length > 0);
        
        words.forEach(word => {
            // Full word
            if (!index.has(word)) {
                index.set(word, new Set());
            }
            index.get(word).add(itemIndex);
            
            // Prefixes for autocomplete
            for (let i = 1; i <= word.length; i++) {
                const prefix = word.substring(0, i);
                if (!index.has(prefix)) {
                    index.set(prefix, new Set());
                }
                index.get(prefix).add(itemIndex);
            }
        });
    });

    // Convert Sets to Arrays for serialization
    const serializedIndex = {};
    for (const [key, value] of index) {
        serializedIndex[key] = Array.from(value);
    }

    return serializedIndex;
}

// Create category filter for browse functionality
function createCategoryFilter(items) {
    const categoryMap = {};

    items.forEach((item, itemIndex) => {
        if (item.handbookCategories) {
            item.handbookCategories.forEach(category => {
                const categoryName = category.name;
                if (!categoryMap[categoryName]) {
                    categoryMap[categoryName] = [];
                }
                categoryMap[categoryName].push(itemIndex);
            });
        }
    });

    return categoryMap;
}

// Perform search using the created index
function performSearch(query, searchIndex, items) {
    if (!query || query.length < 2) return [];
    
    const queryLower = query.toLowerCase();
    const words = queryLower.split(/\s+/).filter(word => word.length > 0);
    
    let resultIndices = new Set();
    let isFirstWord = true;
    
    words.forEach(word => {
        const wordResults = new Set();
        
        // Look for exact matches and prefixes
        Object.keys(searchIndex).forEach(indexKey => {
            if (indexKey.includes(word)) {
                searchIndex[indexKey].forEach(index => wordResults.add(index));
            }
        });
        
        if (isFirstWord) {
            resultIndices = wordResults;
            isFirstWord = false;
        } else {
            // Intersection for multi-word queries
            resultIndices = new Set([...resultIndices].filter(x => wordResults.has(x)));
        }
    });
    
    // Convert indices back to items and sort by relevance
    const results = Array.from(resultIndices)
        .map(index => items[index])
        .filter(item => item) // Filter out undefined items
        .sort((a, b) => {
            // Simple relevance scoring
            const aScore = calculateRelevanceScore(a, query);
            const bScore = calculateRelevanceScore(b, query);
            return bScore - aScore;
        })
        .slice(0, 50); // Limit results
    
    return results;
}

// Calculate relevance score for search results
function calculateRelevanceScore(item, query) {
    const queryLower = query.toLowerCase();
    let score = 0;
    
    // Exact name match gets highest score
    if (item.name?.toLowerCase() === queryLower) {
        score += 100;
    }
    
    // Name starts with query
    if (item.name?.toLowerCase().startsWith(queryLower)) {
        score += 50;
    }
    
    // Name contains query
    if (item.name?.toLowerCase().includes(queryLower)) {
        score += 25;
    }
    
    // Short name matches
    if (item.shortName?.toLowerCase().includes(queryLower)) {
        score += 15;
    }
    
    // Description contains query
    if (item.description?.toLowerCase().includes(queryLower)) {
        score += 5;
    }
    
    return score;
}
