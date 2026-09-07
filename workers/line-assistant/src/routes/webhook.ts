import { Hono } from "hono";
import type { Env } from "../types/env";
import type { LineWebhookPayload } from "../types/line";
import { verifyLineSignature } from "../line/verifier";
import { processLineEvent } from "../services/eventProcessor";
import { DiagnosticLogger } from "../tools/diagnostics";
import { DiscordLogger } from "../tools/discordLogger";
import { executeMorningBriefing } from "../cron/morningBriefing";
import { executeStockBriefing } from "../cron/stockBriefing";
import { executeGithubBriefing } from "../cron/githubBriefing";
import { StudyMouseManager, type StudyMouseApplication } from "../tools/studyMouseManager";
import { LineClient } from "../line/client";
export const webhookRouter = new Hono<{ Bindings: Env }>();

webhookRouter.post("/webhook", async (c) => {
  const signature = c.req.header("x-line-signature");
  const rawBody = await c.req.text();

  if (!signature) {
    return c.text("Missing x-line-signature header", 400);
  }

  const isValid = await verifyLineSignature(rawBody, signature, c.env.LINE_CHANNEL_SECRET);
  if (!isValid) {
    console.warn("[Webhook] Invalid signature detected. Request rejected.");
    const discord = new DiscordLogger(c.env.DISCORD_WEBHOOK_URL, c.env.ASSISTANT_KV);
    try {
      c.executionCtx.waitUntil(discord.sendError("小貓 Webhook 簽章驗證失敗 (401)", "收到 Webhook 但 x-line-signature 驗證不合。"));
    } catch {
      await discord.sendError("小貓 Webhook 簽章驗證失敗 (401)", "收到 Webhook 但 x-line-signature 驗證不合。");
    }
    return c.text("Invalid signature", 401);
  }

  let payload: LineWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return c.text("Malformed JSON payload", 400);
  }

  const events = payload.events || [];

  const discord = new DiscordLogger(c.env.DISCORD_WEBHOOK_URL, c.env.ASSISTANT_KV);

  // 2. Dispatch events asynchronously with ctx.waitUntil
  for (const event of events) {
    const senderId = event.source?.userId;
    const isAllowed = !c.env.ALLOWED_USER_ID || !senderId || senderId === c.env.ALLOWED_USER_ID;

    try {
      c.executionCtx.waitUntil(discord.sendWebhookEvent(event as unknown as Record<string, unknown>, isAllowed));
    } catch {
      await discord.sendWebhookEvent(event as unknown as Record<string, unknown>, isAllowed);
    }

    // Single-user whitelist verification
    if (!isAllowed) {
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

webhookRouter.get("/cron/trigger", async (c) => {
  const type = c.req.query("type") || "morning";
  let success = false;

  if (type === "stock") {
    success = await executeStockBriefing(c.env);
  } else if (type === "github") {
    success = await executeGithubBriefing(c.env);
  } else {
    success = await executeMorningBriefing(c.env);
  }

  return c.json({
    status: success ? "success" : "failed",
    type,
    message: `Triggered ${type} briefing push to LINE.`
  });
});

// =========================================================================
// Study Mouse LINE Mini App Member API (CORS Enabled)
// =========================================================================
webhookRouter.options("/api/studymouse/*", (c) => {
  return c.body(null, 204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
});

webhookRouter.post("/api/studymouse/apply", async (c) => {
  try {
    const body = await c.req.json() as StudyMouseApplication;
    if (!body.userId || !body.ticketId) {
      return c.json({ error: "Missing required fields" }, 400, {
        "Access-Control-Allow-Origin": "*",
      });
    }

    const lineClient = new LineClient(c.env.LINE_CHANNEL_ACCESS_TOKEN);
    const manager = new StudyMouseManager(
      c.env.ASSISTANT_KV,
      c.env.GOOGLE_SHEET_APP_URL,
      lineClient,
      c.env.ALLOWED_USER_ID
    );

    const res = await manager.submitApplication(body);
    return c.json(res, 200, {
      "Access-Control-Allow-Origin": "*",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500, {
      "Access-Control-Allow-Origin": "*",
    });
  }
});
webhookRouter.post("/api/studymouse/feedback", async (c) => {
  try {
    const body = await c.req.json() as {
      userId: string;
      displayName: string;
      rating: number;
      message: string;
      page?: string;
    };

    if (!body.userId || !body.message) {
      return c.json({ error: "Missing required fields" }, 400, {
        "Access-Control-Allow-Origin": "*",
      });
    }

    const lineClient = new LineClient(c.env.LINE_CHANNEL_ACCESS_TOKEN);
    const manager = new StudyMouseManager(
      c.env.ASSISTANT_KV,
      c.env.GOOGLE_SHEET_APP_URL,
      lineClient,
      c.env.ALLOWED_USER_ID
    );

    const res = await manager.recordFeedback(body);
    return c.json(res, 200, {
      "Access-Control-Allow-Origin": "*",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500, {
      "Access-Control-Allow-Origin": "*",
    });
  }
});


webhookRouter.get("/api/studymouse/status", async (c) => {
  const userId = c.req.query("userId");
  if (!userId) {
    return c.json({ error: "Missing userId query param" }, 400, {
      "Access-Control-Allow-Origin": "*",
    });
  }

  const manager = new StudyMouseManager(
    c.env.ASSISTANT_KV,
    c.env.GOOGLE_SHEET_APP_URL
  );

  const res = await manager.checkStatus(userId);
  return c.json(res, 200, {
    "Access-Control-Allow-Origin": "*",
  });
});
