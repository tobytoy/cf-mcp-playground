/**
 * Tiered Authentication & Rate Limiting Middleware
 * Supports:
 * - 'dev': Unlimited requests, 0 cooldown
 * - 'vip': High-frequency refresh (15s cooldown), priority access
 * - 'guest': Standard rate limit (60s cooldown per IP), protected quota
 *
 * Rate limit state is stored in Cloudflare KV (CACHE_KV) when available,
 * ensuring consistent enforcement across all edge instances.
 * Falls back to in-memory store for local development.
 */

import type { Context, Next } from "hono";
import type { AppEnv } from "../types/env.js";

export type UserRole = "dev" | "vip" | "guest";

export interface RateLimitState {
  lastRequestTime: number;
  requestCountToday: number;
  dayString: string;
}

// In-memory fallback for local dev (not shared across instances)
const memRateLimitStore = new Map<string, RateLimitState>();

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

async function getRateLimitState(
  kv: KVNamespace | undefined,
  key: string,
  today: string
): Promise<RateLimitState> {
  if (kv) {
    try {
      const raw = await kv.get(`rl:${key}`);
      if (raw) {
        const state: RateLimitState = JSON.parse(raw);
        if (state.dayString !== today) {
          return { lastRequestTime: 0, requestCountToday: 0, dayString: today };
        }
        return state;
      }
    } catch {
      // fall through to memory
    }
  }
  const state = memRateLimitStore.get(key);
  if (!state) return { lastRequestTime: 0, requestCountToday: 0, dayString: today };
  if (state.dayString !== today) return { lastRequestTime: 0, requestCountToday: 0, dayString: today };
  return state;
}

async function setRateLimitState(
  kv: KVNamespace | undefined,
  key: string,
  state: RateLimitState
): Promise<void> {
  if (kv) {
    try {
      // TTL: expire KV entry at end of day + 1 hour buffer
      const midnightTtl = 86400 - (Date.now() % 86400000) / 1000 + 3600;
      await kv.put(`rl:${key}`, JSON.stringify(state), {
        expirationTtl: Math.ceil(midnightTtl),
      });
      return;
    } catch {
      // fall through to memory
    }
  }
  memRateLimitStore.set(key, state);
}

export function createAuthMiddleware() {
  return async function authAndRateLimitMiddleware(
    c: Context<{ Bindings: AppEnv; Variables: { userRole: UserRole; token?: string } }>,
    next: Next
  ) {
    const devKey = c.env?.DEV_SECRET_KEY || "dev_local_secret";
    const vipKeysList = (c.env?.VIP_SECRET_KEYS || "vip_default,vip_friends")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    // Extract token from:
    // 1. Authorization: Bearer <token>
    // 2. X-API-Key: <token>
    // 3. Query string ?token=<token>
    const authHeader = c.req.header("Authorization");
    let token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7).trim()
      : c.req.header("X-API-Key") || c.req.query("token");

    token = token?.trim();

    // Determine User Role — strict exact-match only (no prefix shortcuts in production)
    let role: UserRole = "guest";
    if (token) {
      if (token === devKey) {
        role = "dev";
      } else if (vipKeysList.includes(token)) {
        role = "vip";
      }
      // NOTE: prefix-based auto-upgrade (e.g. token.startsWith("dev_")) has been
      // intentionally removed to prevent unauthorized privilege escalation.
    }

    // Dev bypasses rate limiting entirely
    if (role === "dev") {
      c.set("userRole", role);
      if (token) c.set("token", token);
      c.header("X-User-Role", role);
      c.header("X-RateLimit-Cooldown", "0s");
      c.header("X-RateLimit-Remaining-Today", "unlimited");
      await next();
      return;
    }

    // Rate Limiting Check (KV-backed for cross-instance consistency)
    const now = Date.now();
    const today = getTodayString();
    const clientIP =
      c.req.header("CF-Connecting-IP") ||
      c.req.header("X-Forwarded-For") ||
      "anonymous_client";

    const rateLimitKey = role === "guest" ? `guest:${clientIP}` : `${role}:${token}`;
    const kv = c.env?.CACHE_KV as KVNamespace | undefined;
    const state = await getRateLimitState(kv, rateLimitKey, today);

    // Define cooldown and daily quota per role
    let cooldownMs = 60_000; // Guest: 60s
    let dailyQuota = 60;

    if (role === "vip") {
      cooldownMs = 15_000; // VIP: 15s
      dailyQuota = 1_000;
    }

    const elapsedMs = now - state.lastRequestTime;

    // Enforce cooldown
    if (cooldownMs > 0 && elapsedMs < cooldownMs) {
      const waitSeconds = Math.ceil((cooldownMs - elapsedMs) / 1000);
      return c.json(
        {
          error: `請求過於頻繁 (${role.toUpperCase()} 模式)。請於 ${waitSeconds} 秒後再試。`,
          role,
          retryAfterSeconds: waitSeconds,
          cooldownSeconds: cooldownMs / 1000,
          upgradeTip:
            role === "guest"
              ? "若需高頻更新 (15秒) 或無限制，請在右上角輸入 VIP 或 Dev API Key。"
              : undefined,
        },
        429
      );
    }

    // Update state
    state.lastRequestTime = now;
    state.requestCountToday += 1;
    await setRateLimitState(kv, rateLimitKey, state);

    // Set Context variables for handlers
    c.set("userRole", role);
    if (token) c.set("token", token);

    // Inject response headers
    c.header("X-User-Role", role);
    c.header("X-RateLimit-Cooldown", `${cooldownMs / 1000}s`);
    c.header("X-RateLimit-Remaining-Today", `${Math.max(0, dailyQuota - state.requestCountToday)}`);

    await next();
  };
}
