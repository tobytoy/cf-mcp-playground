import { Hono } from "hono";
import type { Env } from "../types/env";
import type { LineWebhookPayload } from "../types/line";
import { verifyLineSignature } from "../line/verifier";
import { processLineEvent } from "../services/eventProcessor";
import { transcribeAudio } from "../tools/voiceTranscribe";

export const webhookRouter = new Hono<{ Bindings: Env }>();

// CORS Preflight
webhookRouter.options("/*", (c) => {
  return c.body(null, 204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
});

// Health Check
webhookRouter.get("/health", (c) => {
  return c.json({
    status: "healthy",
    service: "personal-assistant-worker",
    name: "HelperDog",
    timestamp: new Date().toISOString()
  });
});

// LINE Webhook Endpoint
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

    // Whitelist verification for Personal Assistant (supports comma-separated IDs)
    if (c.env.ALLOWED_USER_ID && senderId) {
      const allowedList = c.env.ALLOWED_USER_ID.split(",").map((s) => s.trim());
      if (!allowedList.includes(senderId)) {
        console.warn(`[Webhook] Blocked unauthorized sender ID: ${senderId}`);
        continue;
      }
    }

    try {
      c.executionCtx.waitUntil(processLineEvent(event, c.env));
    } catch {
      // In unit tests or environments without executionCtx, execute directly
      await processLineEvent(event, c.env);
    }
  }

  // 3. Immediately return 200 OK
  return c.text("OK", 200);
});

// API endpoint for Mini App Voice2Text Studio
webhookRouter.post("/api/transcribe", async (c) => {
  try {
    const body = (await c.req.json()) as {
      audioBase64?: string;
      mimeType?: string;
      speakerDiarization?: boolean;
    };

    if (!body.audioBase64) {
      return c.json({ error: "Missing audioBase64" }, 400, {
        "Access-Control-Allow-Origin": "*"
      });
    }

    // Convert Base64 to ArrayBuffer
    const binary = atob(body.audioBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const result = await transcribeAudio(
      bytes.buffer,
      c.env.GEMINI_API_KEY,
      body.mimeType || "audio/webm",
      body.speakerDiarization ?? true
    );

    return c.json(result, 200, {
      "Access-Control-Allow-Origin": "*"
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return c.json({ error: msg }, 500, {
      "Access-Control-Allow-Origin": "*"
    });
  }
});
