import { Hono } from "hono";
import { cors } from "hono/cors";
import type { RailRadarEnv } from "./types.js";
import { TDXRadarClient } from "./services/tdx.js";
import { renderRadarPage } from "./views/radar.js";
import { THSR_STATIONS, TRA_STATIONS, POPULAR_STATIONS } from "./data/stations.js";

const app = new Hono<{ Bindings: RailRadarEnv }>();

// ── CORS Middleware ──────────────────────────────────────────────────────────
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Accept", "Authorization"],
  })
);

// ── Web Radar UI (網頁版視覺介面) ───────────────────────────────────────────────
app.get("/", (c) => c.html(renderRadarPage()));

// ── API: 雙鐵即時售票狀況與時刻表雷達 ─────────────────────────────────────────────
app.get("/api/status", async (c) => {
  try {
    const origin = c.req.query("origin")?.trim() || "台北";
    const destination = c.req.query("destination")?.trim() || "左營";
    const date = c.req.query("date")?.trim() || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());

    const depAfter = c.req.query("depAfter")?.trim() || undefined;
    const depBefore = c.req.query("depBefore")?.trim() || undefined;
    const arrAfter = c.req.query("arrAfter")?.trim() || undefined;
    const arrBefore = c.req.query("arrBefore")?.trim() || undefined;

    const filters = (depAfter || depBefore || arrAfter || arrBefore) ? { depAfter, depBefore, arrAfter, arrBefore } : undefined;

    const client = new TDXRadarClient(c.env);
    const result = await client.getCombinedRailRadar(origin, destination, date, filters);

    return c.json(result);
  } catch (err: unknown) {
    console.error("[RailRadarWorker] /api/status error:", err);
    return c.json({ error: err instanceof Error ? err.message : "Internal Error" }, 500);
  }
});

// ── API: 雙鐵全量站點清單 ───────────────────────────────────────────────────────
app.get("/api/stations", (c) => {
  return c.json({
    popular: POPULAR_STATIONS,
    thsrCount: THSR_STATIONS.length,
    traCount: TRA_STATIONS.length,
    thsr: THSR_STATIONS,
    tra: TRA_STATIONS,
  });
});

// ── API: Health Check ────────────────────────────────────────────────────────
app.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: "rail-radar-worker",
    version: "1.0.0",
    environment: c.env.ENVIRONMENT || "development",
    timestamp: new Date().toISOString(),
  });
});

export default app;
