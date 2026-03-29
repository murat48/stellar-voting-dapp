// Simple in-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const cacheStore = new Map<string, CacheEntry<unknown>>();

export const cache = {
  set<T>(key: string, data: T, ttlMs: number = 30000): void {
    cacheStore.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  },

  get<T>(key: string): T | null {
    const entry = cacheStore.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.ttl;
    if (isExpired) {
      cacheStore.delete(key);
      return null;
    }

    return entry.data;
  },

  invalidate(key: string): void {
    cacheStore.delete(key);
  },

  clear(): void {
    cacheStore.clear();
  },

  has(key: string): boolean {
    const val = cache.get(key);
    return val !== null;
  },
};