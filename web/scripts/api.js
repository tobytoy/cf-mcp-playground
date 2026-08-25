/**
 * Worker API Connector Module
 */

const STORAGE_KEY_TOKEN = "transport_mcp_token";
const STORAGE_KEY_ENDPOINT = "transport_mcp_endpoint";

export function getStoredToken() {
  return localStorage.getItem(STORAGE_KEY_TOKEN) || "";
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(STORAGE_KEY_TOKEN, token.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  }
}

export function getApiBaseUrl() {
  // If hosted on GitHub Pages, defaults to custom Cloudflare Worker endpoint if configured,
  // or relative origin if hosted directly on Cloudflare Worker.
  const customEndpoint = localStorage.getItem(STORAGE_KEY_ENDPOINT);
  if (customEndpoint) return customEndpoint.replace(/\/$/, "");
  
  if (window.location.hostname.includes("github.io")) {
    return "https://cf-mcp-playground.tobywang2021.workers.dev"; // Live Cloudflare Worker URL
  }
  return window.location.origin;
}

export function setApiBaseUrl(url) {
  if (url) {
    localStorage.setItem(STORAGE_KEY_ENDPOINT, url.trim());
  } else {
    localStorage.removeItem(STORAGE_KEY_ENDPOINT);
  }
}

/**
 * Common request wrapper with token injection and error handling.
 */
async function fetchApi(endpoint, options = {}) {
  const baseUrl = getApiBaseUrl();
  const token = getStoredToken();
  const url = `${baseUrl}${endpoint}`;

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const errorMsg = data.error || `請求失敗 (HTTP ${res.status})`;
    const error = new Error(errorMsg);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function checkAuthStatus(tokenOverride) {
  const token = tokenOverride !== undefined ? tokenOverride : getStoredToken();
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}/api/auth/status${token ? `?token=${encodeURIComponent(token)}` : ""}`;
  
  const res = await fetch(url);
  return await res.json();
}

export async function fetchTransportContext(params) {
  return await fetchApi("/api/transport/context", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export async function fetchTransportRoute(params) {
  return await fetchApi("/api/transport/route", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
