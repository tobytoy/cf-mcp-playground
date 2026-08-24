import "dotenv/config";
import { serve } from "@hono/node-server";
import { createApp } from "./app.js";

const port = parseInt(process.env.PORT || "3000", 10);
const host = process.env.HOST || "0.0.0.0";

const app = createApp(process.env);

console.log(`
┌─────────────────────────────────────────────────────────────┐
│  🌟 Cloudflare & Docker MCP Service                        │
│                                                             │
│  - HTTP & SSE Endpoint:  http://${host}:${port}/mcp         │
│  - Health Dashboard:     http://${host}:${port}/            │
│  - REST Q&A Endpoint:    http://${host}:${port}/api/ask     │
│  - Redis Backend:        ${process.env.REDIS_HOST || "127.0.0.1"}:${process.env.REDIS_PORT || "6379"}                 │
└─────────────────────────────────────────────────────────────┘
`);

serve({
  fetch: app.fetch,
  port,
  hostname: host,
});
