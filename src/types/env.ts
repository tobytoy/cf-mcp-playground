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
  TDX_CLIENT_ID?: string;
  TDX_CLIENT_SECRET?: string;
  TDX_BASE_URL?: string;
  DEV_SECRET_KEY?: string;
  VIP_SECRET_KEYS?: string; // Comma-separated VIP tokens
  // Allow additional bindings (e.g. Cloudflare KV, R2) without breaking the type
  [key: string]: string | undefined;
}
