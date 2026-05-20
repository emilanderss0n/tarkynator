// IndexedDB Cache Utility for Tarkynator
// Handles caching of large JSON data files like tarkov_data.json

class IndexedDBCache {
    constructor(dbName = 'TarkynatorCache', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
        this.storeName = 'itemsCache';
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                console.error('IndexedDB open error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object store if it doesn't exist
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'key' });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                }
            };
        });
    }

    async get(key) {
        const result = await this.runRequest('readonly', (store) => store.get(key), 'get');
        return result && result.data ? result.data : null;
    }

    async set(key, data) {
        const cacheEntry = {
            key: key,
            data: data,
            timestamp: Date.now()
        };

        await this.runRequest('readwrite', (store) => store.put(cacheEntry), 'set');
        return true;
    }

    async delete(key) {
        await this.runRequest('readwrite', (store) => store.delete(key), 'delete');
        return true;
    }

    async clear() {
        await this.runRequest('readwrite', (store) => store.clear(), 'clear');
        return true;
    }

    async getAllKeys() {
        return this.runRequest('readonly', (store) => store.getAllKeys(), 'getAllKeys');
    }

    async getSize() {
        return this.runRequest('readonly', (store) => store.count(), 'count');
    }

    async migrateFromLocalStorage(localStorageKey) {
        try {
            const existingData = localStorage.getItem(localStorageKey);
            if (existingData) {
                const parsedData = JSON.parse(existingData);
                await this.set(localStorageKey, parsedData);
                localStorage.removeItem(localStorageKey);
                return true;
            }
        } catch (error) {
            console.warn(`Failed to migrate ${localStorageKey} from localStorage:`, error);
        }
        return false;
    }

    async ensureDb() {
        if (!this.db) {
            await this.init();
        }
    }

    async runRequest(mode, requestFactory, operationName) {
        await this.ensureDb();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], mode);
            const store = transaction.objectStore(this.storeName);
            const request = requestFactory(store);

            request.onerror = () => {
                console.error(`IndexedDB ${operationName} error:`, request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                resolve(request.result);
            };
        });
    }
}

// Create and export a singleton instance
export const indexedDBCache = new IndexedDBCache();
