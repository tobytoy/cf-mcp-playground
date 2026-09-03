import { NeedleClassifier } from "../src/classifier/needle";
import { AiRouter } from "../src/classifier/aiRouter";
import type { Env } from "../src/types/env";

export async function testRouter(): Promise<void> {
  console.log("▶ Testing Needle Classifier & AI Router...");

  const mockEnv: Env = {
    LINE_CHANNEL_SECRET: "test_secret",
    LINE_CHANNEL_ACCESS_TOKEN: "test_token",
    GEMINI_API_KEY: "test_gemini_key",
    ALLOWED_USER_ID: "Uaecf740fc05ef668b671fa90da9c832e"
  };

  const classifier = new NeedleClassifier(mockEnv);
  const aiRouter = new AiRouter(mockEnv.GEMINI_API_KEY);

  // 1. Test URL routing
  const res1 = await classifier.classify("幫我看這個網頁重點 https://github.com/cactus-compute/needle");
  if (res1.tool !== "read_url" || !res1.arguments.url) {
    throw new Error(`URL routing failed: ${JSON.stringify(res1)}`);
  }
  console.log(`  ✔ URL Routing -> ${res1.tool} (${res1.arguments.url})`);

  // 2. Test Math calculation routing
  const res2 = await classifier.classify("算一下：1250 * 1.05^3");
  if (res2.tool !== "calculator") {
    throw new Error(`Math routing failed: ${JSON.stringify(res2)}`);
  }
  console.log(`  ✔ Math Routing -> ${res2.tool} (${res2.arguments.expression})`);

  // 3. Test Todo routing
  const res3 = await classifier.classify("待辦：下午兩點開會");
  if (res3.tool !== "manage_todo" || res3.arguments.action !== "add") {
    throw new Error(`Todo routing failed: ${JSON.stringify(res3)}`);
  }
  console.log(`  ✔ Todo Routing -> ${res3.tool} (action: ${res3.arguments.action}, item: ${res3.arguments.item})`);

  // 4. Test Search routing
  const res4 = await classifier.classify("搜尋今日台灣科技重大新聞與半導體行情");
  if (res4.tool !== "search_web") {
    throw new Error(`Search routing failed: ${JSON.stringify(res4)}`);
  }
  console.log(`  ✔ Search Routing -> ${res4.tool} (query: ${res4.arguments.query})`);

  // 4b. Test Complex Task routing
  const resComplex = await classifier.classify("請幫我規劃一套高並發微服務系統架構設計，包含 CQRS 與 Event Sourcing 的具體實作與資料庫選型");
  if (resComplex.tool !== "complex_task") {
    throw new Error(`Complex task routing failed: ${JSON.stringify(resComplex)}`);
  }
  console.log(`  ✔ Complex Task Routing -> ${resComplex.tool} (domain: ${resComplex.arguments.domain})`);

  // 5. Test Model Tiering & Load Balancing
  const modelForComplex = aiRouter.pickTargetModel("請用 TypeScript 寫一個基於 Web Crypto 的 HMAC-SHA256 驗證函數");
  const strongModels = ["gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash"];
  if (!strongModels.includes(modelForComplex)) {
    throw new Error(`Model tiering failed for complex code: got ${modelForComplex}`);
  }
  console.log(`  ✔ Complex Code Model Tier -> ${modelForComplex} (from Strong Pool)`);

  const modelForGeneral = aiRouter.pickTargetModel("早安，今天星期幾？");
  const balancedModels = [
    "gemini-3.8-flash",
    "gemini-3.5-flash-lite",
    "gemini-3.7-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-3.5-flash"
  ];
  if (!balancedModels.includes(modelForGeneral)) {
    throw new Error(`Model tiering failed for general Q&A: got ${modelForGeneral}`);
  }
  console.log(`  ✔ General Q&A Model Tier -> ${modelForGeneral} (from Balanced 50:50 Pool)`);
}
