import { Hono } from "hono";
import type { Env } from "./types/env";
import { webhookRouter } from "./routes/webhook";

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

export default app;
