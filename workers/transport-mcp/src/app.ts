import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { createMCPServer } from "./mcp/server.js";
import { createCacheService } from "./services/cache.js";
import { TDXClient } from "./services/tdx/client.js";
import { evaluateTransportContext } from "./services/context/evaluator.js";
import { planContextualRoute } from "./services/context/router.js";
import { createAuthMiddleware, type UserRole } from "./middlewares/auth.js";
import { MCP_KNOWLEDGE_BASE, searchTopics } from "./knowledge/mcp-data.js";
import { buildCacheKey } from "./utils/hash.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AppEnv } from "./types/env.js";
import type { TransportIdentity, TransportState } from "./types/context.js";

export type McpApp = Hono<{ Bindings: AppEnv; Variables: { userRole: UserRole; token?: string } }>;

export function createApp(envBindings?: AppEnv): McpApp {
  // Cache is created once per app instance — no module-level singleton
  const cache = createCacheService(envBindings);
  const tdxClient = new TDXClient(
    {
      clientId: envBindings?.TDX_CLIENT_ID,
      clientSecret: envBindings?.TDX_CLIENT_SECRET,
      apiBaseUrl: envBindings?.TDX_BASE_URL,
    },
    cache
  );

  const app: McpApp = new Hono<{ Bindings: AppEnv; Variables: { userRole: UserRole; token?: string } }>();

  // ── CORS Middleware ───────────────────────────────────────────────────────
  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: [
        "Content-Type",
        "Accept",
        "Authorization",
        "X-API-Key",
        "X-Session-Id",
        "mcp-session-id",
      ],
      exposeHeaders: [
        "Content-Type",
        "mcp-session-id",
        "X-User-Role",
        "X-RateLimit-Cooldown",
        "X-RateLimit-Remaining-Today",
      ],
    })
  );

  // ── Security Headers Middleware ───────────────────────────────────────────
  app.use("*", async (c, next) => {
    await next();
    c.res.headers.set("X-Content-Type-Options", "nosniff");
    c.res.headers.set("X-Frame-Options", "DENY");
    c.res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  });

  // ── Status dashboard (Public) ─────────────────────────────────────────────
  app.get("/", async (c) => {
    const stats = await cache.getStats();
    return c.json({
      service: "Cloudflare Worker Context-Aware Transportation MCP Service",
      status: "running",
      version: "2.1.0",
      description: "Edge Context-Aware Transportation Inference Engine & Multimodal Journey Planning on Cloudflare Workers",
      authModes: {
        dev: "Unlimited (0s cooldown, full debug)",
        vip: "High-Frequency (15s cooldown, 1000 req/day)",
        guest: "Standard (60s cooldown, 60 req/day by IP)",
      },
      endpoints: {
        mcp: "/mcp (Streamable HTTP / SSE MCP Protocol Endpoint)",
        sse: "/sse (SSE Transport Endpoint)",
        transportContextApi: "POST /api/transport/context",
        transportRouteApi: "POST /api/transport/route",
        authStatusApi: "GET /api/auth/status",
        askApi: "POST /api/ask { question: string }",
        cacheStats: "GET /api/cache/stats",
        health: "GET /health",
      },
      cache: {
        backend: stats.type,
        connected: stats.connected,
        totalKeys: stats.keysCount,
        hits: stats.hits,
        misses: stats.misses,
      },
      availableTools: [
        "get_transport_context",
        "plan_contextual_route",
        "get_nearby_parking",
        "get_nearby_ev_chargers",
        "get_nearby_youbike",
        "get_traffic_incidents",
        "get_bus_estimated_arrival",
        "get_rail_live_board",
        "explain_mcp_skill",
        "get_mcp_quickstart",
        "ask_mcp_assistant",
      ],
    });
  });

  app.get("/health", async (c) => {
    const stats = await cache.getStats();
    return c.json({ status: "healthy", timestamp: new Date().toISOString(), cache: stats });
  });

  // ── Auth Status Endpoint ──────────────────────────────────────────────────
  app.get("/api/auth/status", async (c) => {
    const devKey = c.env?.DEV_SECRET_KEY || envBindings?.DEV_SECRET_KEY || "dev_local_secret";
    const vipKeysList = (c.env?.VIP_SECRET_KEYS || envBindings?.VIP_SECRET_KEYS || "vip_default,vip_friends")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);

    const authHeader = c.req.header("Authorization");
    const token = (
      authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7).trim()
        : c.req.header("X-API-Key") || c.req.query("token")
    )?.trim();

    let role: UserRole = "guest";
    if (token) {
      if (token === devKey) {
        role = "dev";
      } else if (vipKeysList.includes(token)) {
        role = "vip";
      }
    }

    return c.json({
      role,
      authenticated: role !== "guest",
      cooldownSeconds: role === "dev" ? 0 : role === "vip" ? 15 : 60,
      dailyQuota: role === "dev" ? 999999 : role === "vip" ? 1000 : 60,
      tokenProvided: !!token,
      message:
        role === "dev"
          ? "⚡ 開發者模式：無頻率與配額限制"
          : role === "vip"
          ? "💎 VIP 會員模式：高頻 15 秒更新與專屬情境路徑規劃"
          : "🟢 訪客模式：每 60 秒可刷新 1 次，若需高頻更新請輸入 VIP/Dev Token",
    });
  });

  // ── Apply Auth & Rate Limit to Protected Endpoints ────────────────────────
  const authMiddleware = createAuthMiddleware(envBindings);

  app.use("/api/transport/*", authMiddleware);
  app.use("/mcp", authMiddleware);
  app.use("/sse", authMiddleware);
  app.use("/message", authMiddleware);

  // ── REST: Transport Context & Route APIs ──────────────────────────────────
  app.post("/api/transport/context", async (c) => {
    try {
      const body = await c.req.json<{
        identity?: TransportIdentity;
        state?: TransportState;
        latitude?: number;
        longitude?: number;
        location_name?: string;
        radius_meters?: number;
      }>();

      const identity = body.identity || "car";
      const state = body.state || "cruising";
      const lat = body.latitude ?? 25.033964;
      const lon = body.longitude ?? 121.564468;
      const radius = body.radius_meters ?? 800;

      const result = await evaluateTransportContext(
        tdxClient,
        identity,
        state,
        { latitude: lat, longitude: lon, name: body.location_name },
        { radiusMeters: radius }
      );

      return c.json(result);
    } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Internal Error" }, 500);
    }
  });

  app.post("/api/transport/route", async (c) => {
    try {
      const body = await c.req.json<{
        origin: { latitude: number; longitude: number; name?: string };
        destination: { latitude: number; longitude: number; name?: string };
        identity?: TransportIdentity | "multimodal";
        urgency?: "normal" | "high" | "relaxed";
        preferences?: any;
      }>();

      if (!body.origin || !body.destination) {
        return c.json({ error: "Missing origin or destination coordinates" }, 400);
      }

      const result = await planContextualRoute(
        tdxClient,
        body.origin,
        body.destination,
        body.identity || "car",
        body.urgency || "normal",
        body.preferences || {}
      );

      return c.json(result);
    } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Internal Error" }, 500);
    }
  });

  // ── REST: ask with caching ────────────────────────────────────────────────
  app.post("/api/ask", async (c) => {
    try {
      const body = await c.req.json<{ question?: string }>();
      const question = body.question?.trim();
      if (!question) {
        return c.json({ error: "Missing required field: question" }, 400);
      }

      const cacheKey = buildCacheKey(question);
      const start = Date.now();

      const cached = await cache.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { originalQuestion: string; answer: string; cachedAt: string };
        return c.json({
          cached: true,
          responseTimeMs: Date.now() - start,
          originalQuestion: parsed.originalQuestion,
          answer: parsed.answer,
          cachedAt: parsed.cachedAt,
        });
      }

      const matches = searchTopics(question);
      const answer =
        matches.length > 0
          ? matches.map((m) => m.content).join("\n\n---\n\n")
          : `關於「${question}」：Model Context Protocol (MCP) 是開放標準協議，提供 Tools、Resources 與 Prompts。`;

      const cachedAt = new Date().toISOString();
      await cache.set(cacheKey, JSON.stringify({ originalQuestion: question, answer, cachedAt }), 86400);

      return c.json({ cached: false, responseTimeMs: Date.now() - start, cacheKey, originalQuestion: question, answer, cachedAt });
    } catch (err: unknown) {
      return c.json({ error: err instanceof Error ? err.message : "Internal Error" }, 500);
    }
  });

  // ── REST: knowledge & cache management ────────────────────────────────────
  app.get("/api/concepts", (c) =>
    c.json({ total: MCP_KNOWLEDGE_BASE.length, topics: MCP_KNOWLEDGE_BASE })
  );

  app.get("/api/cache/stats", async (c) => c.json(await cache.getStats()));

  app.post("/api/cache/clear", authMiddleware, async (c) => {
    const role = c.get("userRole");
    if (role !== "dev") {
      return c.json({ error: "Unauthorized: only dev role can clear cache" }, 403);
    }
    await cache.clear();
    return c.json({ success: true, message: "Cache successfully cleared." });
  });

  // ── MCP protocol handler (stateless per-request transport) ───────────────
  const handleMcp = async (c: Context) => {
    try {
      const server = createMCPServer({ cacheService: cache, env: c.env as AppEnv });
      const transport = new WebStandardStreamableHTTPServerTransport({
        keepAliveMs: 0,
        enableJsonResponse: true,
      });
      await server.connect(transport);
      return await transport.handleRequest(c.req.raw);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return c.json({ jsonrpc: "2.0", error: { code: -32603, message }, id: null }, 500);
    }
  };

  app.get("/mcp", handleMcp);
  app.post("/mcp", handleMcp);
  app.delete("/mcp", handleMcp);
  app.get("/sse", handleMcp);
  app.post("/sse", handleMcp);
  app.post("/message", handleMcp);

  return app;
}
