import { Hono } from "hono";
import type { Env } from "../types/env";
import type { LineWebhookPayload } from "../types/line";
import { verifyLineSignature } from "../line/verifier";
import { processLineEvent } from "../services/eventProcessor";
import { transcribeAudio } from "../tools/voiceTranscribe";
import { DiscordLogger } from "../tools/discordLogger";
import { executeMorningBriefing } from "../cron/morningBriefing";
import { executeStockBriefing } from "../cron/stockBriefing";
import { executeGithubBriefing } from "../cron/githubBriefing";

export const webhookRouter = new Hono<{ Bindings: Env }>();

// CORS Preflight
webhookRouter.options("/*", (c) => {
  return c.body(null, 204, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization"
  });
});

// Health & Debug Endpoint
webhookRouter.get("/health", (c) => {
  return c.json({
    status: "healthy",
    service: "personal-assistant-worker",
    name: "HelperDog",
    timestamp: new Date().toISOString()
  });
});

webhookRouter.get("/debug", async (c) => {
  const secret = c.env.LINE_CHANNEL_SECRET || "";
  const token = c.env.LINE_CHANNEL_ACCESS_TOKEN || "";
  const discordUrl = c.env.DISCORD_WEBHOOK_URL || "";
  const allowed = c.env.ALLOWED_USER_ID || "";

  return c.json({
    status: "ok",
    service: "personal-assistant-worker",
    timestamp: new Date().toISOString(),
    config: {
      hasChannelSecret: secret.length > 0,
      secretPreview: secret ? `${secret.slice(0, 4)}...${secret.slice(-4)}` : "missing",
      hasAccessToken: token.length > 0,
      tokenLength: token.length,
      hasDiscordWebhook: discordUrl.length > 0,
      allowedUserIds: allowed.split(",").map((s) => s.trim()).filter(Boolean)
    }
  });
});

// Manual Cron Trigger for Testing
webhookRouter.get("/cron/trigger", async (c) => {
  const type = c.req.query("type") || "stock";
  let success = false;

  if (type === "morning") {
    success = await executeMorningBriefing(c.env);
  } else if (type === "github") {
    const topic = c.req.query("topic");
    success = await executeGithubBriefing(c.env, undefined, topic ? { topic } : undefined);
  } else {
    success = await executeStockBriefing(c.env);
  }

  return c.json({
    status: success ? "success" : "failed",
    type,
    message: `Triggered ${type} briefing to bfg007 LINE bot.`
  });
});

// LINE Webhook Endpoint
webhookRouter.post("/webhook", async (c) => {
  const signature = c.req.header("x-line-signature");
  const rawBody = await c.req.text();
  const discord = new DiscordLogger(c.env.DISCORD_WEBHOOK_URL, c.env.PERSONAL_KV);

  if (!signature) {
    return c.text("Missing x-line-signature header", 400);
  }

  // 1. Verify LINE Webhook HMAC-SHA256 signature
  const isValid = await verifyLineSignature(rawBody, signature, c.env.LINE_CHANNEL_SECRET);
  if (!isValid) {
    console.warn("[Webhook] Invalid signature detected. Request rejected.");
    try {
      c.executionCtx.waitUntil(
        discord.sendError(
          "LINE Webhook 簽章驗證失敗 (401)",
          "收到 Webhook 請求，但 x-line-signature 驗證不合。請確認 LINE Developers 後台的 Channel Secret 是否與 Worker 設定完全一致。",
          { signatureLength: signature.length }
        )
      );
    } catch {
      await discord.sendError(
        "LINE Webhook 簽章驗證失敗 (401)",
        "收到 Webhook 請求，但 x-line-signature 驗證不合。請確認 LINE Developers 後台的 Channel Secret 是否與 Worker 設定完全一致。"
      );
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

  // Handle LINE Developers Console "Verify" test button (events array is empty)
  if (events.length === 0) {
    try {
      c.executionCtx.waitUntil(
        discord.sendInfo(
          "✅ LINE 後台 Webhook 驗證成功！",
          "收到 LINE Developers 後台點擊「Verify」按鈕的連線測試請求，通訊 100% 正常，簽章驗證通過！",
          [{ name: "狀態", value: "Success (200 OK)", inline: true }]
        )
      );
    } catch {
      await discord.sendInfo(
        "✅ LINE 後台 Webhook 驗證成功！",
        "收到 LINE Developers 後台點擊「Verify」按鈕的連線測試請求，通訊 100% 正常，簽章驗證通過！",
        [{ name: "狀態", value: "Success (200 OK)", inline: true }]
      );
    }
    return c.text("OK", 200);
  }

  // 2. Dispatch events asynchronously with ctx.waitUntil
  for (const event of events) {
    const senderId = event.source?.userId;
    let isAllowed = true;
    let blockReason = "";

    // Whitelist verification for Personal Assistant (supports comma-separated IDs)
    if (c.env.ALLOWED_USER_ID && senderId) {
      const allowedList = c.env.ALLOWED_USER_ID.split(",").map((s) => s.trim());
      if (!allowedList.includes(senderId)) {
        isAllowed = false;
        blockReason = `使用者 ID (${senderId}) 不在允許清單中`;
      }
    }

    // Real-time Discord notification for every incoming event
    try {
      c.executionCtx.waitUntil(
        discord.sendWebhookEvent(event as unknown as Record<string, unknown>, isAllowed, blockReason)
      );
    } catch {
      await discord.sendWebhookEvent(event as unknown as Record<string, unknown>, isAllowed, blockReason);
    }

    if (!isAllowed) {
      console.warn(`[Webhook] Blocked unauthorized sender ID: ${senderId}`);
      const alertMsg = `⚠️ 偵測到未授權使用者傳訊！\n**發送者 LINE ID**：\`${senderId}\`\n**目前授權白名單**：\`${c.env.ALLOWED_USER_ID}\`\n\n👉 若這是您的帳號，請將此 ID 加入 ALLOWED_USER_ID 白名單。`;
      try {
        c.executionCtx.waitUntil(discord.sendError("未授權使用者傳訊攔截", alertMsg, { senderId }));
      } catch {
        await discord.sendError("未授權使用者傳訊攔截", alertMsg, { senderId });
      }
      continue;
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
