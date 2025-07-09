// Service worker for background data processing and caching
// This helps offload heavy computations from the main thread and provides caching

const CACHE_NAME = 'tarkynator-v2';
const STATIC_CACHE_URLS = [
    '/',
    'assets/js/cache.js',
    'assets/js/core/searchOptimizer.js',
    'assets/js/core/indexedDbCache.js',
    'assets/js/items/ItemManager.js',
    'assets/js/items/ItemSearcher.js',
    'assets/js/items/ItemDisplayer.js',
    'assets/js/items/ItemBrowser.js',
    'assets/js/items/ItemTemplate.js',
    'assets/js/items/ItemDependencies.js',
    'assets/js/items/ItemBreadcrumb.js',
    'assets/css/main.css'
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                return cache.addAll(STATIC_CACHE_URLS.map(url => new Request(url, { cache: 'reload' })));
            })
            .catch((error) => {
                console.error('Service Worker: Cache installation failed', error);
            })
    );
    // Force the waiting service worker to become the active service worker
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
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
        }).then(() => {
            // Take control of all clients immediately
            return self.clients.claim();
        })
    );
});

// Fetch event - serve from cache when available, with network-first for data
self.addEventListener('fetch', (event) => {
    // Only handle same-origin requests
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    const url = new URL(event.request.url);
    
    // Network-first strategy for JSON data files (always fresh)
    if (url.pathname.includes('/data/') && url.pathname.endsWith('.json')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Clone the response to cache it
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                    return response;
                })
                .catch(() => {
                    // Fallback to cache if network fails
                    return caches.match(event.request);
                })
        );
    }
    // Cache-first strategy for static assets (JS, CSS, images)
    else {
        event.respondWith(
            caches.match(event.request)
                .then((response) => {
                    // Return cached version or fetch from network
                    if (response) {
                        return response;
                    }
                    
                    return fetch(event.request)
                        .then((response) => {
                            // Don't cache non-successful responses
                            if (!response || response.status !== 200 || response.type !== 'basic') {
                                return response;
                            }

                            // Clone the response to cache it
                            const responseClone = response.clone();
                            caches.open(CACHE_NAME).then((cache) => {
                                cache.put(event.request, responseClone);
                            });

                            return response;
                        });
                })
        );
    }
});

// Handle background sync for offline functionality
self.addEventListener('sync', (event) => {
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

// Background sync function
async function doBackgroundSync() {
    try {
        // Perform any background tasks here
        console.log('Service Worker: Background sync triggered');
    } catch (error) {
        console.error('Service Worker: Background sync failed', error);
    }
}

// Handle push notifications if needed
self.addEventListener('push', (event) => {
    if (event.data) {
        const data = event.data.json();
        
        event.waitUntil(
            self.registration.showNotification(data.title, {
                body: data.body,
                icon: data.icon || 'assets/img/icon.png',
                badge: 'assets/img/favicon.png'
            })
        );
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('/')
    );
});
