// Service worker for background data processing and caching
// This helps offload heavy computations from the main thread

const CACHE_NAME = 'tarkynator-v1';
const STATIC_CACHE_URLS = [
    'assets/js/cache.js',
    'assets/js/searchOptimizer.js',
    'assets/js/indexedDbCache.js'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching static assets');
                return cache.addAll(STATIC_CACHE_URLS);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch event - serve from cache when available
self.addEventListener('fetch', (event) => {
    // Only handle same-origin requests
    if (event.request.url.startsWith(self.location.origin)) {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // Return cached version or fetch from network
                    return response || fetch(event.request);
                })
        );
    }
});

// Handle background data processing messages
self.addEventListener('message', (event) => {
    const { type, data } = event.data;

    switch (type) {
        case 'PROCESS_SEARCH_INDEX':
            // Process search index in background
            const searchIndex = processSearchIndex(data.items);
            event.ports[0].postMessage({ type: 'SEARCH_INDEX_READY', data: searchIndex });
            break;

        case 'PROCESS_CATEGORY_FILTER':
            // Process category filter in background
            const categoryFilter = processCategoryFilter(data.items);
            event.ports[0].postMessage({ type: 'CATEGORY_FILTER_READY', data: categoryFilter });
            break;

        default:
            console.warn('Unknown message type:', type);
    }
});

// Helper function to process search index
function processSearchIndex(items) {
    const index = new Map();

    items.forEach(item => {
        const searchableText = item.name.toLowerCase();

        // Create n-gram indices
        for (let i = 0; i < searchableText.length; i++) {
            for (let len = 1; len <= Math.min(6, searchableText.length - i); len++) {
                const ngram = searchableText.substring(i, i + len);

                if (!index.has(ngram)) {
                    index.set(ngram, []);
                }
                index.get(ngram).push(item.id); // Store only ID to reduce memory
            }
        }
    });

    // Convert Map to Object for serialization
    return Object.fromEntries(index);
}

// Helper function to process category filter
function processCategoryFilter(items) {
    const categoryMap = {};

    items.forEach(item => {
        item.handbookCategories.forEach(category => {
            const categoryName = category.name;
            if (!categoryMap[categoryName]) {
                categoryMap[categoryName] = [];
            }
            categoryMap[categoryName].push(item.id); // Store only ID to reduce memory
        });
    });

    return categoryMap;
}
