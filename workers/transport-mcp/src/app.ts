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
import { safeJsonParse } from "./utils/json.js";
import { createTransportJITEngine } from "./services/jit-transport.js";
import { MCPAdapter } from "jit-api/edge";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AppEnv } from "./types/env.js";
import type { TransportIdentity, TransportState } from "./types/context.js";
export type McpApp = Hono<{ Bindings: AppEnv; Variables: { userRole: UserRole; token?: string } }>;

export function createApp(envBindings?: AppEnv): McpApp {
  // Cache is created once per app instance — no module-level singleton
  const cache = createCacheService(envBindings);
  const { engine: jitEngine, mdLoader, tdxClient, prometheusPlugin } = createTransportJITEngine({
    cacheService: cache,
    env: envBindings,
  });
  const app: McpApp = new Hono<{ Bindings: AppEnv; Variables: { userRole: UserRole; token?: string } }>();

  // ── CORS Middleware ───────────────────────────────────────────────────────
  app.use(
    "*",
    cors({
      origin: (origin: string) => {
        const rawAllowed = typeof envBindings?.ALLOWED_ORIGINS === "string" ? envBindings.ALLOWED_ORIGINS : "*";
        const allowedOrigins = rawAllowed.split(",").map((o: string) => o.trim());
        if (allowedOrigins.includes("*") || (origin && allowedOrigins.includes(origin))) {
          return origin || "*";
        }
        return null;
      },
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


  // ── Status dashboard / API Info (Public) ──────────────────────────────────
  app.get("/api/info", async (c) => {
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
        jitMcp: "/jit-mcp (JIT-Powered MCP Protocol Endpoint - Protected)",
        metrics: "/metrics (Prometheus OpenMetrics P50/P90/P99 latency & phase counters)",
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

  // 首頁導向 MCP API 資訊
  app.get("/", (c) => c.redirect("/api/info"));
  app.get("/health", async (c) => {
    const stats = await cache.getStats();
    return c.json({ status: "healthy", timestamp: new Date().toISOString(), cache: stats });
  });

  // ── Observability: Prometheus Metrics Endpoint (jit-api v1.4.3+) ──────────
  app.get("/metrics", async (c) => {
    const text = prometheusPlugin?.getMetricsAsText() || "";
    return c.text(text, 200, {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
    });
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

  // ── REST: JIT-Powered Transport Context & Route APIs (0 AI Latency once Frozen) ──
  app.post("/api/transport/context", async (c) => {
    try {
      const body = await c.req.json<Record<string, unknown>>();
      const result = await jitEngine.execute(body, "get_transport_context");
      return c.json(result.data, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal Error";
      const isSecurityBlocked = message.includes("AI Safety Guardrail") || message.includes("Prompt Injection");
      return c.json({ error: message }, isSecurityBlocked ? 400 : 500);
    }
  });

  app.post("/api/transport/route", async (c) => {
    try {
      const body = await c.req.json<Record<string, unknown>>();
      const result = await jitEngine.execute(body, "plan_contextual_route");
      return c.json(result.data, 200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal Error";
      const isSecurityBlocked = message.includes("AI Safety Guardrail") || message.includes("Prompt Injection");
      return c.json({ error: message }, isSecurityBlocked ? 400 : 500);
    }
  });

  // Generic JIT API Dispatcher: supports any spec route directly
  app.post("/api/jit/:route", async (c) => {
    try {
      const route = c.req.param("route");
      const body = (await c.req.json().catch(() => ({}))) as Record<string, unknown>;
      const result = await jitEngine.execute(body, route);
      return c.json({
        route,
        phase: result.context.phase,
        aiLatencyMs: result.context.aiLatencyMs,
        engineUsed: result.context.engineUsed,
        data: result.data,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal Error";
      const isSecurityBlocked = message.includes("AI Safety Guardrail") || message.includes("Prompt Injection");
      return c.json({ error: message }, isSecurityBlocked ? 400 : 500);
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
      const parsed = safeJsonParse<{ originalQuestion: string; answer: string; cachedAt: string }>(cached);
      if (parsed) {
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
  // ── Unified MCP Protocol Endpoints (Serving full toolset: 15 Native + JIT Specs) ──
  const handleUnifiedMcp = async (c: Context) => {
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

  app.get("/mcp", handleUnifiedMcp);
  app.post("/mcp", handleUnifiedMcp);
  app.delete("/mcp", handleUnifiedMcp);
  app.get("/sse", handleUnifiedMcp);
  app.post("/sse", handleUnifiedMcp);
  app.post("/message", handleUnifiedMcp);

  // JIT MCP Adapter route also mounted under /jit-mcp for dedicated dynamic spec experimentation
  MCPAdapter.attachToHono(app, jitEngine, mdLoader, {
    mcpPath: "/jit-mcp",
    ssePath: "/jit-sse",
    messagePath: "/jit-message",
    stageFilter: "prod",
    authMiddleware,
  });
  return app;
}
