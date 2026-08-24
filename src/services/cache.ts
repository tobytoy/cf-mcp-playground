import { Redis } from "ioredis";

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

export class MemoryCache implements CacheService {
  private store = new Map<string, { value: string; expiresAt: number | null }>();
  private hits = 0;
  private misses = 0;

  async get(key: string): Promise<string | null> {
    const entry = this.store.get(key);
    if (!entry) {
      this.misses++;
      return null;
    }
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.misses++;
      return null;
    }
    this.hits++;
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
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
  private memoryFallback: MemoryCache = new MemoryCache();
  private isConnected = false;
  private hits = 0;
  private misses = 0;

  constructor(redisUrlOrOptions?: string | { host?: string; port?: number; password?: string }) {
    try {
      if (typeof redisUrlOrOptions === "string") {
        this.client = new Redis(redisUrlOrOptions, {
          maxRetriesPerRequest: 2,
          retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 100, 1000)),
          lazyConnect: true,
        });
      } else {
        const host = redisUrlOrOptions?.host || process.env.REDIS_HOST || "127.0.0.1";
        const port = redisUrlOrOptions?.port || parseInt(process.env.REDIS_PORT || "6379", 10);
        const password = redisUrlOrOptions?.password || process.env.REDIS_PASSWORD;
        this.client = new Redis({
          host,
          port,
          maxRetriesPerRequest: 2,
          retryStrategy: (times: number) => (times > 3 ? null : Math.min(times * 100, 1000)),
          lazyConnect: true,
        });
      }

      this.client.on("connect", () => {
        this.isConnected = true;
      });

      this.client.on("error", (_err: unknown) => {
        this.isConnected = false;
      });

      this.client.on("close", () => {
        this.isConnected = false;
      });

      // Attempt initial connection asynchronously
      this.client.connect().catch(() => {
        this.isConnected = false;
      });
    } catch {
      this.isConnected = false;
      this.client = null;
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.client && this.isConnected) {
      try {
        const val = await this.client.get(key);
        if (val !== null) {
          this.hits++;
          return val;
        }
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
        await this.memoryFallback.set(key, value, ttlSeconds);
        return;
      }
    }
    await this.memoryFallback.set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<boolean> {
    if (this.client && this.isConnected) {
      try {
        const res = await this.client.del(key);
        return res > 0;
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
      } catch {
        await this.memoryFallback.clear();
      }
    } else {
      await this.memoryFallback.clear();
    }
  }

  async getStats(): Promise<CacheStats> {
    if (this.client && this.isConnected) {
      try {
        const dbsize = await this.client.dbsize();
        return {
          hits: this.hits,
          misses: this.misses,
          keysCount: dbsize,
          type: "redis",
          connected: true,
        };
      } catch {
        // fallback
      }
    }
    const memStats = await this.memoryFallback.getStats();
    return {
      hits: this.hits + memStats.hits,
      misses: this.misses + memStats.misses,
      keysCount: memStats.keysCount,
      type: "memory",
      connected: this.isConnected,
    };
  }
}

let globalCacheInstance: CacheService | null = null;

export function getCacheService(env?: Record<string, any>): CacheService {
  if (globalCacheInstance) {
    return globalCacheInstance;
  }

  const redisUrl = env?.REDIS_URL || process.env.REDIS_URL;
  const redisHost = env?.REDIS_HOST || process.env.REDIS_HOST;

  if (redisUrl || redisHost) {
    globalCacheInstance = new RedisCache(redisUrl || {
      host: redisHost,
      port: env?.REDIS_PORT ? parseInt(env.REDIS_PORT, 10) : undefined,
      password: env?.REDIS_PASSWORD || process.env.REDIS_PASSWORD,
    });
  } else {
    globalCacheInstance = new MemoryCache();
  }

  return globalCacheInstance;
}
