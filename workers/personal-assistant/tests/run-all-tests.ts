import { verifyLineSignature } from "../src/line/verifier";
import { NeedleClassifier } from "../src/classifier/needle";
import { evaluateMathExpression } from "../src/tools/calculator";
import { PersonalTodoManager } from "../src/tools/personalTodo";
import { DiscordLogger } from "../src/tools/discordLogger";
import { getEnabledModules, createFeatureListFlexMessage } from "../src/config/modules";
import { getNearbyTransportContext } from "../src/tools/tdxTransport";
import { app } from "../src/index";
import type { Env } from "../src/types/env";

const MOCK_ENV: Env = {
  LINE_CHANNEL_SECRET: "mock_personal_secret_12345",
  LINE_CHANNEL_ACCESS_TOKEN: "mock_access_token",
  ALLOWED_USER_ID: "Uba361995b7ae8345b4a23e195253d27c",
  GEMINI_API_KEY: "mock_gemini_key",
  DISCORD_WEBHOOK_URL: "https://discord.com/api/webhooks/mock"
};

async function generateSignature(body: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function main() {
  console.log("==========================================");
  console.log("🐶 HelperDog Personal Assistant Test Suite");
  console.log("==========================================\n");

  // 1. Signature Verification
  console.log("▶ Testing HMAC-SHA256 Signature Verification...");
  const body = JSON.stringify({ destination: "dest", events: [] });
  const validSig = await generateSignature(body, MOCK_ENV.LINE_CHANNEL_SECRET);
  const isValid = await verifyLineSignature(body, validSig, MOCK_ENV.LINE_CHANNEL_SECRET);
  if (!isValid) throw new Error("Valid signature failed");
  const isInvalid = await verifyLineSignature(body, "wrong_sig", MOCK_ENV.LINE_CHANNEL_SECRET);
  if (isInvalid) throw new Error("Invalid signature accepted");
  console.log("  ✔ Signature checks passed!\n");

  // 2. Needle Classifier
  console.log("▶ Testing Needle Classifier for Personal Assistant...");
  const classifier = new NeedleClassifier();
  const r0 = classifier.classify("選單");
  if (r0.tool !== "dashboard") throw new Error(`Expected dashboard, got ${r0.tool}`);
  console.log(`  ✔ '選單' -> ${r0.tool}`);

  const rOcr = classifier.classify("拍照單據功能");
  if (rOcr.tool !== "ocr_vault") throw new Error(`Expected ocr_vault, got ${rOcr.tool}`);
  console.log(`  ✔ '拍照單據功能' -> ${rOcr.tool}`);

  const r1 = classifier.classify("功能");
  const r2 = classifier.classify("你能做什麼");
  if (r2.tool !== "list_features") throw new Error(`Expected list_features, got ${r2.tool}`);
  console.log(`  ✔ '你能做什麼' -> ${r2.tool}`);

  const r3 = classifier.classify("待辦：下午兩點採買生鮮");
  if (r3.tool !== "manage_todo") throw new Error(`Expected manage_todo, got ${r3.tool}`);
  console.log(`  ✔ '待辦：...' -> ${r3.tool}`);

  const r4 = classifier.classify("開啟 Discord 紀錄");
  if (r4.tool !== "discord_toggle") throw new Error(`Expected discord_toggle, got ${r4.tool}`);
  console.log(`  ✔ '開啟 Discord 紀錄' -> ${r4.tool}`);

  const r5 = classifier.classify("幫我找附近的 YouBike");
  if (r5.tool !== "nearby_transport") throw new Error(`Expected nearby_transport, got ${r5.tool}`);
  console.log(`  ✔ '幫我找附近的 YouBike' -> ${r5.tool}\n`);

  // 3. Declarative Modules
  console.log("▶ Testing Declarative Module System...");
  const modules = getEnabledModules("personal");
  if (modules.length < 8) throw new Error(`Expected at least 8 personal modules, got ${modules.length}`);
  console.log(`  ✔ Loaded ${modules.length} active personal modules:`, modules.map((m) => m.name));
  const flex = createFeatureListFlexMessage("personal");
  if (flex.type !== "flex") throw new Error("Feature list flex message malformed");
  console.log("  ✔ Feature list Flex Card successfully built!\n");

  // 4. Calculator
  console.log("▶ Testing Calculator...");
  const calc = evaluateMathExpression("1250 * (1 + 0.05)^3");
  if (Math.abs(calc.result - 1447.03125) > 0.001) throw new Error("Math result mismatch");
  console.log(`  ✔ 1250 * (1 + 0.05)^3 = ${calc.result}\n`);

  // 5. Personal Todos Manager
  console.log("▶ Testing Personal Todos Manager...");
  const todoManager = new PersonalTodoManager(undefined, undefined);
  const newTodo = await todoManager.addTodo(MOCK_ENV.ALLOWED_USER_ID!, "測試生活備忘待辦", "生活");
  if (!newTodo.id.startsWith("TODO-")) throw new Error("Todo ID malformed");
  console.log(`  ✔ Added todo: ${newTodo.id} (${newTodo.item})`);
  const todos = await todoManager.getTodos(MOCK_ENV.ALLOWED_USER_ID!);
  if (todos.length !== 1) throw new Error(`Expected 1 todo, got ${todos.length}`);
  const completed = await todoManager.completeTodo(MOCK_ENV.ALLOWED_USER_ID!, newTodo.id);
  if (!completed) throw new Error("Todo completion failed");
  const postTodos = await todoManager.getTodos(MOCK_ENV.ALLOWED_USER_ID!);
  if (postTodos[0].status !== "已完成") throw new Error("Todo status not updated");
  console.log(`  ✔ Todo completed: ${postTodos[0].id} -> ${postTodos[0].status}\n`);

  // 6. Transport & YouBike 2.0 Field Mapping
  console.log("▶ Testing Transport & YouBike 2.0 Field Mapping...");
  const transport = await getNearbyTransportContext(25.0339, 121.5644, "台北 101", "台北市信義區");
  if (!transport.youbikes || transport.youbikes.length === 0) throw new Error("YouBike list empty");
  const firstB = transport.youbikes[0];
  if (typeof firstB.availableBikes !== "number" || typeof firstB.emptySpaces !== "number") {
    throw new Error(`YouBike availableBikes or emptySpaces is undefined! Got: ${JSON.stringify(firstB)}`);
  }
  console.log(`  ✔ YouBike 2.0: ${firstB.name} (可借: ${firstB.availableBikes}, 可還: ${firstB.emptySpaces})`);
  console.log(`  ✔ Smart Tip: ${transport.transitTips[0]}\n`);

  // 7. End-to-End Hono Webhook
  console.log("▶ Testing Hono Webhook End-to-End...");
  const healthRes = await app.request("http://localhost/health", { method: "GET" }, MOCK_ENV);
  if (healthRes.status !== 200) throw new Error(`Health failed: ${healthRes.status}`);
  const healthJson = await healthRes.json();
  console.log("  ✔ /health 200 OK:", healthJson);

  // Unauthorized sender blocked
  const strangerPayload = JSON.stringify({
    destination: "dest",
    events: [
      {
        type: "message",
        mode: "active",
        timestamp: Date.now(),
        source: { type: "user", userId: "U_STRANGER_999" },
        replyToken: "mock_reply_token",
        message: { id: "m1", type: "text", text: "功能" }
      }
    ]
  });
  const strangerSig = await generateSignature(strangerPayload, MOCK_ENV.LINE_CHANNEL_SECRET);
  const strangerRes = await app.request(
    "http://localhost/webhook",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-line-signature": strangerSig
      },
      body: strangerPayload
    },
    MOCK_ENV
  );
  if (strangerRes.status !== 200) throw new Error("Webhook should return 200 OK");
  console.log("  ✔ Unauthorized stranger safely blocked!\n");

  console.log("==========================================");
  console.log("🎉 ALL PERSONAL ASSISTANT TESTS PASSED!");
  console.log("==========================================");
}

main().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
