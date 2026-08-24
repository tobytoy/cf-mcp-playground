import { Redis } from "ioredis";
import type { AppEnv } from "../types/env.js";

export interface CacheStats {
  hits: number;
  misses: number;
  keysCount: number;
  type: "redis" | "memory";
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

export class RedisCache implements CacheService {
  private client: Redis | null = null;
  private readonly memoryFallback = new MemoryCache();
  private isConnected = false;
  private hits = 0;
  private misses = 0;

  constructor(redisUrlOrOptions?: string | { host?: string; port?: number; password?: string }) {
    try {
      this.client = typeof redisUrlOrOptions === "string"
        ? new Redis(redisUrlOrOptions, {
            maxRetriesPerRequest: 2,
            retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 100, 1000)),
            lazyConnect: true,
          })
        : new Redis({
            host: redisUrlOrOptions?.host ?? "127.0.0.1",
            port: redisUrlOrOptions?.port ?? 6379,
            password: redisUrlOrOptions?.password,
            maxRetriesPerRequest: 2,
            retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 100, 1000)),
            lazyConnect: true,
          });

      this.client.on("connect", () => { this.isConnected = true; });
      this.client.on("error", (_err: unknown) => { this.isConnected = false; });
      this.client.on("close", () => { this.isConnected = false; });
      this.client.connect().catch(() => { this.isConnected = false; });
    } catch {
      this.isConnected = false;
      this.client = null;
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.client && this.isConnected) {
      try {
        const val = await this.client.get(key);
        if (val !== null) { this.hits++; return val; }
        this.misses++;
        return null;
      } catch {
        return this.memoryFallback.get(key);
      }
    }
    return this.memoryFallback.get(key);
  }

  async set(key: string, value: string, ttlSeconds = 86400): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        if (ttlSeconds > 0) {
          await this.client.set(key, value, "EX", ttlSeconds);
        } else {
          await this.client.set(key, value);
        }
        return;
      } catch {
        // fall through to memory fallback
      }
    }
    await this.memoryFallback.set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<boolean> {
    if (this.client && this.isConnected) {
      try {
        return (await this.client.del(key)) > 0;
      } catch {
        return this.memoryFallback.delete(key);
      }
    }
    return this.memoryFallback.delete(key);
  }

  async clear(): Promise<void> {
    if (this.client && this.isConnected) {
      try {
        await this.client.flushdb();
        return;
      } catch {
        // fall through
      }
    }
    await this.memoryFallback.clear();
  }

  async getStats(): Promise<CacheStats> {
    if (this.client && this.isConnected) {
      try {
        return {
          hits: this.hits,
          misses: this.misses,
          keysCount: await this.client.dbsize(),
          type: "redis",
          connected: true,
        };
      } catch {
        // fall through
      }
    }
    const mem = await this.memoryFallback.getStats();
    return {
      hits: this.hits + mem.hits,
      misses: this.misses + mem.misses,
      keysCount: mem.keysCount,
      type: "memory",
      connected: this.isConnected,
    };
  }
}

/**
 * Create a cache instance from env bindings — no global singleton,
 * callers own the lifetime of the returned service.
 */
export function createCacheService(env?: AppEnv): CacheService {
  const redisUrl = env?.REDIS_URL;
  const redisHost = env?.REDIS_HOST;

  if (redisUrl) return new RedisCache(redisUrl);
  if (redisHost) {
    return new RedisCache({
      host: redisHost,
      port: env?.REDIS_PORT ? parseInt(env.REDIS_PORT, 10) : undefined,
      password: env?.REDIS_PASSWORD,
    });
  }
  return new MemoryCache();
}
