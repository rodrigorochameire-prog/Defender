/**
 * Simple in-memory cache implementation
 * Used for caching database queries and computed values
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class Cache {
  private store: Map<string, CacheEntry<any>> = new Map();

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set a value in cache with optional TTL (time to live) in milliseconds
   */
  set<T>(key: string, value: T, ttlMs: number = 5 * 60 * 1000): void {
    const expiresAt = Date.now() + ttlMs;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Delete a specific key from cache
   */
  delete(key: string): void {
    this.store.delete(key);
  }

  /**
   * Delete all keys matching a pattern (regex)
   */
  invalidatePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.store.size;
  }
}

export const cache = new Cache();
