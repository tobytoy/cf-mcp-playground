/**
 * Service Worker for PWA Offline Caching
 */

const CACHE_NAME = "transport-context-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./styles/main.css",
  "./scripts/app.js",
  "./scripts/api.js",
  "./scripts/location.js",
  "./scripts/map-modal.js",
  "./manifest.json",
  "./assets/icon.svg",
  "./assets/icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch((err) => console.warn("SW cache pre-fetch error:", err));
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Do not intercept external TDX/Worker API requests, let network handle them
  if (event.request.url.includes("/api/") || event.request.url.includes("/mcp")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
