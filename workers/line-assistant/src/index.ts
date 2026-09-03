import { Hono } from "hono";
import type { Env } from "./types/env";
import { webhookRouter } from "./routes/webhook";
import { handleScheduledEvent } from "./cron/dispatcher";

const app = new Hono<{ Bindings: Env }>();

// Mount routes
app.route("/", webhookRouter);

// Global 404 handler
app.notFound((c) => {
  return c.json({ error: "Not Found", message: "LINE Assistant Worker endpoint" }, 404);
});

// Global Error handler
app.onError((err, c) => {
  console.error("[Worker Error]:", err);
  return c.json({ error: "Internal Server Error", message: err.message }, 500);
});
export default {
  fetch: app.fetch,
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(handleScheduledEvent(controller.cron, env));
  }
};

export { app };
