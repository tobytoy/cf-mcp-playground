import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { createMCPServer } from "./mcp/server.js";
import { createCacheService } from "./services/cache.js";
import { MCP_KNOWLEDGE_BASE, searchTopics } from "./knowledge/mcp-data.js";
import { buildCacheKey } from "./utils/hash.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { AppEnv } from "./types/env.js";

export type McpApp = Hono<{ Bindings: AppEnv }>;

export function createApp(envBindings?: AppEnv): McpApp {
  // Cache is created once per app instance — no module-level singleton
  const cache = createCacheService(envBindings);

  const app: McpApp = new Hono<{ Bindings: AppEnv }>();

  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Accept", "Authorization", "X-Session-Id", "mcp-session-id"],
      exposeHeaders: ["Content-Type", "mcp-session-id"],
    })
  );

  // ── Status dashboard ──────────────────────────────────────────────────────
  app.get("/", async (c) => {
    const stats = await cache.getStats();
    return c.json({
      service: "Cloudflare Worker & Docker MCP Service",
      status: "running",
      version: "1.0.0",
      description: "MCP Server with Redis Caching and MCP Skills Knowledge Base",
      endpoints: {
        mcp: "/mcp (Streamable HTTP / SSE MCP Endpoint)",
        sse: "/sse (SSE Transport Endpoint)",
        askApi: "POST /api/ask { question: string }",
        conceptsApi: "GET /api/concepts",
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
        "explain_mcp_skill",
        "get_mcp_quickstart",
        "list_mcp_concepts",
        "ask_mcp_assistant",
        "get_cache_stats",
        "clear_mcp_cache",
      ],
    });
  });

  app.get("/health", async (c) => {
    const stats = await cache.getStats();
    return c.json({ status: "healthy", timestamp: new Date().toISOString(), cache: stats });
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

  app.post("/api/cache/clear", async (c) => {
    await cache.clear();
    return c.json({ success: true, message: "Cache successfully cleared." });
  });

  // ── MCP protocol handler (stateless per-request transport) ───────────────
  const handleMcp = async (c: Context) => {
    try {
      const server = createMCPServer({ cacheService: cache });
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
