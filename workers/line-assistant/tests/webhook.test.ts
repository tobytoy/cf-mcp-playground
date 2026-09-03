import app from "../src/index";
import { generateLineSignature } from "../src/line/verifier";
import type { Env } from "../src/types/env";

export async function testWebhookEndpoint(): Promise<void> {
  console.log("▶ Testing Hono Webhook Endpoint (End-to-End)...");

  const secret = "mock_test_secret_for_hmac_sha256_verification_32chars";
  const mockEnv: Env = {
    LINE_CHANNEL_SECRET: secret,
    LINE_CHANNEL_ACCESS_TOKEN: "mock_token",
    ALLOWED_USER_ID: "Uaecf740fc05ef668b671fa90da9c832e",
    GEMINI_API_KEY: "mock_gemini_key",
    TAVILY_API_KEY: "mock_tavily_key"
  };

  // 1. Health check
  const healthRes = await app.request("/health", { method: "GET" }, mockEnv);
  if (healthRes.status !== 200) {
    throw new Error(`Health check failed: ${healthRes.status}`);
  }
  console.log("  ✔ /health endpoint status 200");

  // 2. Reject missing signature
  const missingSigRes = await app.request("/webhook", { method: "POST", body: "{}" }, mockEnv);
  if (missingSigRes.status !== 400) {
    throw new Error(`Expected 400 for missing signature, got ${missingSigRes.status}`);
  }
  console.log("  ✔ Missing signature rejected with 400");

  // 3. Reject invalid signature
  const invalidSigRes = await app.request(
    "/webhook",
    {
      method: "POST",
      headers: { "x-line-signature": "invalid_sig_value" },
      body: JSON.stringify({ events: [] })
    },
    mockEnv
  );
  if (invalidSigRes.status !== 401) {
    throw new Error(`Expected 401 for invalid signature, got ${invalidSigRes.status}`);
  }
  console.log("  ✔ Invalid signature rejected with 401");

  // 4. Valid Webhook Event from Whitelisted User
  const validPayload = JSON.stringify({
    destination: "U1234567890",
    events: [
      {
        type: "message",
        source: { type: "user", userId: "Uaecf740fc05ef668b671fa90da9c832e" },
        message: { id: "msg_1", type: "text", text: "計算 100 + 200" },
        replyToken: "mock_reply_token"
      }
    ]
  });

  const validSig = await generateLineSignature(validPayload, secret);
  const validRes = await app.request(
    "/webhook",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-line-signature": validSig
      },
      body: validPayload
    },
    mockEnv
  );

  if (validRes.status !== 200) {
    throw new Error(`Expected 200 OK for valid webhook request, got ${validRes.status}`);
  }
  const text = await validRes.text();
  if (text !== "OK") {
    throw new Error(`Expected 'OK' response body, got '${text}'`);
  }
  console.log("  ✔ Valid signed webhook processed and returned 200 OK");

  // 5. Blocked Non-Whitelisted User
  const blockedPayload = JSON.stringify({
    events: [
      {
        type: "message",
        source: { type: "user", userId: "U_stranger_user_999" },
        message: { id: "msg_2", type: "text", text: "Hello bot" }
      }
    ]
  });

  const blockedSig = await generateLineSignature(blockedPayload, secret);
  const blockedRes = await app.request(
    "/webhook",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-line-signature": blockedSig
      },
      body: blockedPayload
    },
    mockEnv
  );
  if (blockedRes.status !== 200) {
    throw new Error(`Expected 200 OK for webhook lifecycle, got ${blockedRes.status}`);
  }
  console.log("  ✔ Unauthorized sender safely filtered out");

  console.log("✅ Webhook endpoint tests passed!\n");
}
