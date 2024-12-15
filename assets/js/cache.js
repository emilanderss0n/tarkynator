// Set cacheTTL to a high value to cache data for a long time
const cacheTTL = 1000 * 60 * 60 * 24 * 2; // 2 days

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
    localStorage.setItem(key, JSON.stringify(entry));
}

export function fetchData(url, options) {
    const cacheKey = url + (options.body ? JSON.stringify(options.body) : '');

    const cachedData = getFromCache(cacheKey);
    if (cachedData) {
        return Promise.resolve(cachedData);
    }

    return fetch(url, options)
        .then(response => response.json())
        .then(data => {
            setInCache(cacheKey, data);
            return data;
        });
}