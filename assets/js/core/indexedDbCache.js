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
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(key);

            request.onerror = () => {
                console.error('IndexedDB get error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                const result = request.result;
                if (result && result.data) {
                    // Check if data is still valid (optional: add expiration logic here)
                    resolve(result.data);
                } else {
                    resolve(null);
                }
            };
        });
    }

    async set(key, data) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);

            const cacheEntry = {
                key: key,
                data: data,
                timestamp: Date.now()
            };

            const request = store.put(cacheEntry);

            request.onerror = () => {
                console.error('IndexedDB set error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                resolve(true);
            };
        });
    }

    async delete(key) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(key);

            request.onerror = () => {
                console.error('IndexedDB delete error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                resolve(true);
            };
        });
    }

    async clear() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();

            request.onerror = () => {
                console.error('IndexedDB clear error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                resolve(true);
            };
        });
    }

    async getAllKeys() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAllKeys();

            request.onerror = () => {
                console.error('IndexedDB getAllKeys error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                resolve(request.result);
            };
        });
    }

    async getSize() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.count();

            request.onerror = () => {
                console.error('IndexedDB count error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                resolve(request.result);
            };
        });
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
}

// Create and export a singleton instance
export const indexedDBCache = new IndexedDBCache();
