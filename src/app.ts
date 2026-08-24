import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { createMCPServer } from "./mcp/server.js";
import { getCacheService } from "./services/cache.js";
import { MCP_KNOWLEDGE_BASE, searchTopics } from "./knowledge/mcp-data.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

export function createApp(envBindings?: Record<string, any>) {
  const app = new Hono<{ Bindings: Record<string, any> }>();

  // Enable CORS
  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Accept", "Authorization", "X-Session-Id", "mcp-session-id"],
      exposeHeaders: ["Content-Type", "mcp-session-id"],
    })
  );

  // Health Check & Dashboard
  app.get("/", async (c) => {
    const env = envBindings || c.env || {};
    const cache = getCacheService(env);
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
    const env = envBindings || c.env || {};
    const cache = getCacheService(env);
    const stats = await cache.getStats();
    return c.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      cache: stats,
    });
  });

  // REST API: Ask MCP Assistant with Redis Caching
  app.post("/api/ask", async (c) => {
    try {
      const body = await c.req.json<{ question?: string }>();
      const question = body.question?.trim();

      if (!question) {
        return c.json({ error: "Missing required field: question" }, 400);
      }

      const env = envBindings || c.env || {};
      const cache = getCacheService(env);
      
      const normalized = question.toLowerCase().trim().replace(/[？\?！\!。，,、\s]+/g, "");
      let hash = 0;
      for (let i = 0; i < normalized.length; i++) {
        hash = (hash << 5) - hash + normalized.charCodeAt(i);
        hash |= 0;
      }
      const cacheKey = `mcp:qa:${Math.abs(hash).toString(36)}`;

      const start = Date.now();
      const cached = await cache.get(cacheKey);

      if (cached) {
        const parsed = JSON.parse(cached);
        return c.json({
          cached: true,
          responseTimeMs: Date.now() - start,
          originalQuestion: parsed.originalQuestion,
          answer: parsed.answer,
          cachedAt: parsed.cachedAt,
        });
      }

      // Cache Miss
      const matches = searchTopics(question);
      let answer = "";
      if (matches.length > 0) {
        answer = matches.map((m) => m.content).join("\n\n---\n\n");
      } else {
        answer = `關於「${question}」：Model Context Protocol (MCP) 是開放標準協議，提供 Tools、Resources 與 Prompts。`;
      }

      const cacheData = {
        originalQuestion: question,
        normalizedKey: normalized,
        answer,
        cachedAt: new Date().toISOString(),
      };
      await cache.set(cacheKey, JSON.stringify(cacheData), 86400);

      return c.json({
        cached: false,
        responseTimeMs: Date.now() - start,
        cacheKey,
        originalQuestion: question,
        answer,
        cachedAt: cacheData.cachedAt,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Internal Error";
      return c.json({ error: message }, 500);
    }
  });

  // REST API: List all concepts
  app.get("/api/concepts", (c) => {
    return c.json({
      total: MCP_KNOWLEDGE_BASE.length,
      topics: MCP_KNOWLEDGE_BASE,
    });
  });

  // REST API: Cache stats & clear
  app.get("/api/cache/stats", async (c) => {
    const env = envBindings || c.env || {};
    const cache = getCacheService(env);
    const stats = await cache.getStats();
    return c.json(stats);
  });

  app.post("/api/cache/clear", async (c) => {
    const env = envBindings || c.env || {};
    const cache = getCacheService(env);
    await cache.clear();
    return c.json({ success: true, message: "Cache successfully cleared." });
  });

  // MCP Streamable HTTP / SSE Handlers
  const handleMcp = async (c: Context) => {
    try {
      const env = envBindings || c.env || {};
      const cache = getCacheService(env);
      const server = createMCPServer({ cacheService: cache, env });
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
