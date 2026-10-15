import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ParkingRadarEnv, ParkingFilterOptions } from "./types.js";
import { TDXParkingClient } from "./services/tdx.js";
import { renderParkingRadarPage } from "./views/radar.js";
import { renderParkingDashboardPage } from "./views/dashboard.js";
import { getCityStats, getNationwideStats } from "./services/stats.js";
import { TAIWAN_CITIES } from "./data/cities.js";

const app = new Hono<{ Bindings: ParkingRadarEnv }>();

// ── CORS 中介層 ─────────────────────────────────────────────────────────────
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Accept", "Authorization"],
  })
);

// ── Favicon ──────────────────────────────────────────────────────────────────
app.get("/favicon.ico", (c) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" rx="22" fill="#0284c7"/>
    <text x="50" y="70" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="62" font-weight="900" fill="white" text-anchor="middle">P</text>
  </svg>`;
  return c.body(svg, 200, { "Content-Type": "image/svg+xml" });
});

// ── Web Radar UI (視覺化全功能即時停車雷達介面) ───────────────────────────────
app.get("/", (c) => c.html(renderParkingRadarPage()));

// ── Web Dashboard UI (全台巨量停車數據與車種統計戰情室) ─────────────────────────
app.get("/dashboard", (c) => c.html(renderParkingDashboardPage()));

// ── API: 全台灣停車綜合與各縣市統計戰情數據 ────────────────────────────────────
app.get("/api/stats/overview", async (c) => {
  try {
    const client = new TDXParkingClient(c.env);
    const stats = await getNationwideStats(client);
    return c.json(stats);
  } catch (err: unknown) {
    console.error("[ParkingRadarWorker] /api/stats/overview error:", err);
    return c.json({ error: err instanceof Error ? err.message : "Internal Error" }, 500);
  }
});

// ── API: 單一縣市深度停車與車種統計數據 ─────────────────────────────────────────
app.get("/api/stats/city/:city", async (c) => {
  try {
    const city = c.req.param("city") || "Taipei";
    const client = new TDXParkingClient(c.env);
    const stats = await getCityStats(client, city);
    return c.json(stats);
  } catch (err: unknown) {
    console.error(`[ParkingRadarWorker] /api/stats/city/${c.req.param("city")} error:`, err);
    return c.json({ error: err instanceof Error ? err.message : "Internal Error" }, 500);
  }
});

// ── API: 依縣市取得停車場與即時剩餘位 ─────────────────────────────────────────
app.get("/api/parking/city/:city", async (c) => {
  try {
    const city = c.req.param("city") || "Taipei";
    const lat = c.req.query("lat") ? parseFloat(c.req.query("lat")!) : undefined;
    const lon = c.req.query("lon") ? parseFloat(c.req.query("lon")!) : undefined;
    const radiusMeters = c.req.query("radius") ? parseInt(c.req.query("radius")!, 10) : undefined;
    const searchQuery = c.req.query("q")?.trim() || undefined;

    const evOnly = c.req.query("ev") === "true";
    const evDedicatedOnly = c.req.query("evDedicated") === "true";
    const disabilityOnly = c.req.query("disability") === "true";
    const parentChildOnly = c.req.query("parentChild") === "true";
    const indoorOnly = c.req.query("indoor") === "true";
    const availableOnly = c.req.query("available") === "true";

    const options: ParkingFilterOptions = {
      lat,
      lon,
      radiusMeters,
      searchQuery,
      evOnly,
      evDedicatedOnly,
      disabilityOnly,
      parentChildOnly,
      indoorOnly,
      availableOnly,
    };

    const client = new TDXParkingClient(c.env);
    const results = await client.getCityParking(city, options);

    return c.json(results);
  } catch (err: unknown) {
    console.error("[ParkingRadarWorker] /api/parking/city error:", err);
    return c.json({ error: err instanceof Error ? err.message : "Internal Error" }, 500);
  }
});

// ── API: 單一停車場即時重新查詢 (精確直接查詢 TDX) ───────────────────────────
app.get("/api/parking/city/:city/lot/:id", async (c) => {
  try {
    const city = c.req.param("city") || "Taipei";
    const id = c.req.param("id");
    const client = new TDXParkingClient(c.env);
    const lot = await client.getSingleLot(city, id);
    if (!lot) {
      return c.json({ error: "Lot not found" }, 404);
    }
    return c.json(lot);
  } catch (err: unknown) {
    console.error("[ParkingRadarWorker] /api/parking/city/lot error:", err);
    return c.json({ error: err instanceof Error ? err.message : "Internal Error" }, 500);
  }
});

// ── API: 支援城市清單 ────────────────────────────────────────────────────────
app.get("/api/cities", (c) => {
  return c.json(TAIWAN_CITIES);
});

// ── API: 健康檢查 ────────────────────────────────────────────────────────────
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    service: "parking-radar-worker",
    timestamp: new Date().toISOString(),
  });
});

export default app;
