// Simple cache utility for offline support and performance
const CACHE_PREFIX = 'smartwallet_';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
    data: T;
    timestamp: number;
}

export const cache = {
    set: <T>(key: string, data: T): void => {
        try {
            const entry: CacheEntry<T> = {
                data,
                timestamp: Date.now()
            };
            localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(entry));
        } catch (error) {
            console.warn('Failed to cache data:', error);
        }
    },

    get: <T>(key: string): T | null => {
        try {
            const item = localStorage.getItem(`${CACHE_PREFIX}${key}`);
            if (!item) return null;

            const entry: CacheEntry<T> = JSON.parse(item);
            const isExpired = Date.now() - entry.timestamp > CACHE_EXPIRY;

            if (isExpired) {
                cache.remove(key);
                return null;
            }

            return entry.data;
        } catch (error) {
            console.warn('Failed to retrieve cached data:', error);
            return null;
        }
    },

    remove: (key: string): void => {
        try {
            localStorage.removeItem(`${CACHE_PREFIX}${key}`);
        } catch (error) {
            console.warn('Failed to remove cached data:', error);
        }
    },

    clear: (): void => {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(CACHE_PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.warn('Failed to clear cache:', error);
        }
    }
};
