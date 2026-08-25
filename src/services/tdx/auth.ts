/**
 * TDX OAuth 2.0 Token Manager with Edge Caching & Auto-Renewal
 */

import type { CacheService } from "../cache.js";
import type { TDXTokenResponse } from "../../types/tdx.js";

const DEFAULT_AUTH_URL =
  "https://tdx.transportdata.gov.tw/auth/realms/TDXConnect/protocol/openid-connect/token";
const TOKEN_CACHE_KEY = "tdx:auth:access_token";

export interface TDXAuthConfig {
  clientId?: string;
  clientSecret?: string;
  authUrl?: string;
}

export class TDXAuthService {
  private clientId?: string;
  private clientSecret?: string;
  private authUrl: string;
  private cache: CacheService;
  private inMemoryToken?: { token: string; expiresAt: number };

  constructor(config: TDXAuthConfig, cache: CacheService) {
    this.clientId = config.clientId;
    this.clientSecret = config.clientSecret;
    this.authUrl = config.authUrl || DEFAULT_AUTH_URL;
    this.cache = cache;
  }

  /**
   * Returns a valid Bearer access token, checking in-memory, edge cache, or requesting from TDX.
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now();

    // 1. Check in-memory fast cache (valid if > 60s remaining)
    if (this.inMemoryToken && this.inMemoryToken.expiresAt > now + 60_000) {
      return this.inMemoryToken.token;
    }

    // 2. Check distributed Cache Service (KV/Redis/Memory)
    const cachedToken = await this.cache.get(TOKEN_CACHE_KEY);
    if (cachedToken) {
      this.inMemoryToken = { token: cachedToken, expiresAt: now + 3600_000 };
      return cachedToken;
    }

    // 3. If credentials missing, return mock token for offline development/testing
    if (!this.clientId || !this.clientSecret) {
      console.warn(
        "[TDXAuth] Missing TDX_CLIENT_ID / TDX_CLIENT_SECRET. Operating in development mock mode."
      );
      const mockToken = "mock_tdx_token_dev_environment";
      this.inMemoryToken = { token: mockToken, expiresAt: now + 86400_000 };
      await this.cache.set(TOKEN_CACHE_KEY, mockToken, 86400);
      return mockToken;
    }

    // 4. Request new token from TDX OAuth endpoint
    try {
      const body = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: this.clientId,
        client_secret: this.clientSecret,
      });

      const res = await fetch(this.authUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`TDX Token request failed (${res.status}): ${errText}`);
      }

      const data = (await res.json()) as TDXTokenResponse;
      const token = data.access_token;
      // TDX default expires_in is 86400s (24h). We cache for 23h (82800s).
      const ttlSeconds = Math.max(300, (data.expires_in || 86400) - 3600);

      this.inMemoryToken = { token, expiresAt: now + ttlSeconds * 1000 };
      await this.cache.set(TOKEN_CACHE_KEY, token, ttlSeconds);

      return token;
    } catch (err) {
      console.error("[TDXAuth] Failed to obtain real TDX token:", err);
      // Fallback to mock token to prevent app crash
      const fallbackToken = "mock_tdx_token_fallback";
      this.inMemoryToken = { token: fallbackToken, expiresAt: now + 300_000 };
      return fallbackToken;
    }
  }

  /**
   * Clears cached token
   */
  async invalidateToken(): Promise<void> {
    this.inMemoryToken = undefined;
    await this.cache.delete(TOKEN_CACHE_KEY);
  }
}
