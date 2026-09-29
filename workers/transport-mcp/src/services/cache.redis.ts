import { Redis } from "ioredis";
import { MemoryCache, type CacheService, type CacheStats } from "./cache.js";

export class RedisCache implements CacheService {
  private client: Redis | null = null;
  private readonly memoryFallback = new MemoryCache();
  private isConnected = false;
  private hits = 0;
  private misses = 0;

  constructor(redisUrlOrOptions?: string | { host?: string; port?: number; password?: string }) {
    try {
      this.client =
        typeof redisUrlOrOptions === "string"
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

      this.client.on("connect", () => {
        this.isConnected = true;
      });
      this.client.on("error", () => {
        this.isConnected = false;
      });
      this.client.on("close", () => {
        this.isConnected = false;
      });
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
        // fall through to memory fallback
      }
    }
    await this.memoryFallback.set(key, value, ttlSeconds);
  }

  async delete(key: string): Promise<boolean> {
    if (this.client && this.isConnected) {
      try {
        const deleted = await this.client.del(key);
        return deleted > 0;
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
    let keysCount = -1;
    if (this.client && this.isConnected) {
      try {
        keysCount = await this.client.dbsize();
      } catch {
        // ignore
      }
    }
    return {
      hits: this.hits,
      misses: this.misses,
      keysCount,
      type: "redis",
      connected: this.isConnected,
    };
  }
}
