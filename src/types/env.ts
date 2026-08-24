/**
 * Shared environment interface for Cloudflare Workers bindings and Node.js process.env.
 * Used across app.ts, cache.ts, server.ts, and worker.ts.
 */
export interface AppEnv {
  REDIS_URL?: string;
  REDIS_HOST?: string;
  REDIS_PORT?: string;
  REDIS_PASSWORD?: string;
  ENVIRONMENT?: string;
  // Allow additional bindings (e.g. Cloudflare KV, R2) without breaking the type
  [key: string]: string | undefined;
}
