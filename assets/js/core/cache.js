import { indexedDBCache } from './indexedDbCache.js';

// Set cacheTTL to a high value to cache data for a long time
const cacheTTL = 1000 * 60 * 60 * 24 * 2; // 2 days

// Define which URLs should use IndexedDB for caching (large files > 1MB)
const LARGE_DATA_URLS = [
    'data/tarkov_data.json',
    'tarkov_data.json',
    'data/items.json',
    'items.json',
    'data/quests.json',
    'quests.json',
    'data/Windows.json',
    'Windows.json',
    'data/tarkov_data_tasks.json',
    'tarkov_data_tasks.json',
    'data/globals.json',
    'globals.json'
];

// In-memory cache for frequently accessed data
const memoryCache = new Map();
const MAX_MEMORY_CACHE_SIZE = 50; // Limit memory cache size

function isLargeDataFile(url) {
    return LARGE_DATA_URLS.some(largeUrl => url.includes(largeUrl));
}

function getFromCache(key) {
    const entry = JSON.parse(localStorage.getItem(key));
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
        localStorage.removeItem(key);
        return null;
    }

    return entry.data;
}

function setInCache(key, data) {
    const expiry = Date.now() + cacheTTL;
    const entry = { data, expiry };
    try {
        localStorage.setItem(key, JSON.stringify(entry));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            console.warn('Local storage quota exceeded for key:', key);
            // Clear some old entries or handle the quota issue
            localStorage.clear();
            localStorage.setItem(key, JSON.stringify(entry));
        } else {
            throw e;
        }
    }
}

// Optimized memory cache management
function setInMemoryCache(key, data) {
    if (memoryCache.size >= MAX_MEMORY_CACHE_SIZE) {
        // Remove the oldest entry (first item in the Map)
        const firstKey = memoryCache.keys().next().value;
        memoryCache.delete(firstKey);
    }
    memoryCache.set(key, data);
}

function getFromMemoryCache(key) {
    if (memoryCache.has(key)) {
        // Move to end (most recently used)
        const value = memoryCache.get(key);
        memoryCache.delete(key);
        memoryCache.set(key, value);
        return value;
    }
    return null;
}

async function getFromIndexedDB(key) {
    try {
        const data = await indexedDBCache.get(key);
        if (data) {
            return data;
        }

        // If no data found in IndexedDB, try to migrate from localStorage
        const migrated = await indexedDBCache.migrateFromLocalStorage(key);
        if (migrated) {
            return await indexedDBCache.get(key);
        }

        return null;
    } catch (error) {
        console.warn('Failed to get from IndexedDB:', error);
        return null;
    }
}

async function setInIndexedDB(key, data) {
    try {
        await indexedDBCache.set(key, data);
        return true;
    } catch (error) {
        console.warn('Failed to set in IndexedDB:', error);
        return false;
    }
}

export async function fetchData(url, options) {
    const cacheKey = url + (options?.body ? JSON.stringify(options.body) : '');
    const isLargeFile = isLargeDataFile(url);

    // Check memory cache first for all requests
    const memoryData = getFromMemoryCache(cacheKey);
    if (memoryData) {
        return memoryData;
    }

    // For large files, try IndexedDB
    if (isLargeFile) {
        const cachedData = await getFromIndexedDB(cacheKey);
        if (cachedData) {
            // Also store in memory for faster subsequent access
            setInMemoryCache(cacheKey, cachedData);
            return cachedData;
        }
    } else {
        // For smaller files, use localStorage
        const cachedData = getFromCache(cacheKey);
        if (cachedData) {
            // Store in memory cache for faster subsequent access
            setInMemoryCache(cacheKey, cachedData);
            return cachedData;
        }
    }

    // Fetch from network
    try {
        const response = await fetch(url, options);
        const data = await response.json();

        // Cache the data in appropriate storage
        if (isLargeFile) {
            const success = await setInIndexedDB(cacheKey, data);
            if (!success) {
                // Fallback to localStorage if IndexedDB fails
                setInCache(cacheKey, data);
            }
        } else {
            setInCache(cacheKey, data);
        }

        // Always store in memory cache for immediate subsequent access
        setInMemoryCache(cacheKey, data);

        return data;
    } catch (error) {
        console.error(`Error fetching data from ${url}:`, error);
        throw error;
    }
}