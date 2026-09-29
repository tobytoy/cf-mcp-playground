import type { AppEnv } from "../types/env.js";

export interface CacheStats {
  hits: number;
  misses: number;
  keysCount: number;
  type: "redis" | "memory" | "kv";
  connected: boolean;
}

export interface CacheService {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  clear(): Promise<void>;
  getStats(): Promise<CacheStats>;
}

const DEFAULT_MAX_SIZE = 500;

export class MemoryCache implements CacheService {
  private store = new Map<string, { value: string; expiresAt: number | null }>();
  private hits = 0;
  private misses = 0;
  private readonly maxSize: number;

  constructor(maxSize = DEFAULT_MAX_SIZE) {
    this.maxSize = maxSize;
  }

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    // Evict oldest entry when at capacity (Map preserves insertion order)
    if (this.store.size >= this.maxSize && !this.store.has(key)) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) {
        this.store.delete(oldest);
      }
    }
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  async getStats(): Promise<CacheStats> {
    return {
      hits: this.hits,
      misses: this.misses,
      keysCount: this.store.size,
      type: "memory",
      connected: true,
    };
  }
}

/**
 * KVCache — Cloudflare KV-backed cache (preferred in Workers production).
 * Provides cross-instance, globally replicated caching with TTL support.
 */
export class KVCache implements CacheService {
  private kv: KVNamespace;
  private hits = 0;
  private misses = 0;

  constructor(kv: KVNamespace) {
    this.kv = kv;
  }

  async get(key: string): Promise<string | null> {
    try {
      const val = await this.kv.get(key);
      if (val !== null) { this.hits++; return val; }
      this.misses++;
      return null;
    } catch (err) {
      console.warn(`[KVCache] get error for key "${key}":`, err);
      this.misses++;
      return null;
    }
  }

  async set(key: string, value: string, ttlSeconds = 86400): Promise<void> {
    try {
      await this.kv.put(key, value, { expirationTtl: Math.max(60, ttlSeconds) });
    } catch (err) {
      console.warn(`[KVCache] set error for key "${key}":`, err);
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.kv.delete(key);
      return true;
    } catch {
      return false;
    }
  }

  async clear(): Promise<void> {
    // KV does not support bulk-delete; this is a no-op in production.
    console.warn("[KVCache] clear() is a no-op on Cloudflare KV.");
  }

  async getStats(): Promise<CacheStats> {
    return {
      hits: this.hits,
      misses: this.misses,
      keysCount: -1,
      type: "kv",
      connected: true,
    };
  }
}

/**
 * Create a cache instance from env bindings — no global singleton,
 * callers own the lifetime of the returned service.
 *
 * Priority: Cloudflare KV → Redis (URL) → Redis (host) → In-Memory
 */
export function createCacheService(env?: AppEnv): CacheService {
  if (env?.CACHE_KV) return new KVCache(env.CACHE_KV as KVNamespace);

  const redisUrl = env?.REDIS_URL;
  const redisHost = env?.REDIS_HOST;

  if (redisUrl || redisHost) {
    try {
      // Use node require / dynamic loader to avoid Workers bundling of ioredis
      const redisModule = "./cache.redis.js";
      const mod = typeof require !== "undefined" ? require(redisModule) : null;
      if (mod && mod.RedisCache) {
        if (redisUrl) return new mod.RedisCache(redisUrl);
        return new mod.RedisCache({
          host: redisHost,
          port: env?.REDIS_PORT ? parseInt(env.REDIS_PORT, 10) : undefined,
          password: env?.REDIS_PASSWORD,
        });
      }
    } catch {
      // ignore and fallback to MemoryCache
    }
  }
  return new MemoryCache();
}
