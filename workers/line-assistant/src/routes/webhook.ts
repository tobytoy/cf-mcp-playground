import { Hono } from "hono";
import type { Env } from "../types/env";
import type { LineWebhookPayload } from "../types/line";
import { verifyLineSignature } from "../line/verifier";
import { processLineEvent } from "../services/eventProcessor";
import { DiagnosticLogger } from "../tools/diagnostics";

export const webhookRouter = new Hono<{ Bindings: Env }>();

webhookRouter.post("/webhook", async (c) => {
  const signature = c.req.header("x-line-signature");
  const rawBody = await c.req.text();

  if (!signature) {
    return c.text("Missing x-line-signature header", 400);
  }

  // 1. Verify LINE Webhook HMAC-SHA256 signature
  const isValid = await verifyLineSignature(rawBody, signature, c.env.LINE_CHANNEL_SECRET);
  if (!isValid) {
    console.warn("[Webhook] Invalid signature detected. Request rejected.");
    return c.text("Invalid signature", 401);
  }

  let payload: LineWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.text("Malformed JSON payload", 400);
  }

  const events = payload.events || [];

  // 2. Dispatch events asynchronously with ctx.waitUntil
  for (const event of events) {
    const senderId = event.source?.userId;

    // Single-user whitelist verification
    if (c.env.ALLOWED_USER_ID && senderId && senderId !== c.env.ALLOWED_USER_ID) {
      console.warn(`[Webhook] Blocked unauthorized sender ID: ${senderId}`);
      continue;
    }

    try {
      c.executionCtx.waitUntil(processLineEvent(event, c.env));
    } catch {
      // In unit test or environment without executionCtx, execute directly
      await processLineEvent(event, c.env);
    }
  }

  // 3. Immediately return 200 OK to prevent LINE timeout
  return c.text("OK", 200);
});

webhookRouter.get("/health", (c) => {
  return c.json({
    status: "healthy",
    service: "line-assistant-worker",
    timestamp: new Date().toISOString()
  });
});

webhookRouter.get("/debug", async (c) => {
  const logger = new DiagnosticLogger(c.env.ASSISTANT_KV);
  const logs = await logger.getRecentLogs(30);
  return c.json({
    status: "ok",
    count: logs.length,
    logs
  });
});

webhookRouter.get("/debug/errors", async (c) => {
  const logger = new DiagnosticLogger(c.env.ASSISTANT_KV);
  const errors = await logger.getRecentErrors(20);
  return c.json({
    status: "ok",
    count: errors.length,
    errors
  });
});
