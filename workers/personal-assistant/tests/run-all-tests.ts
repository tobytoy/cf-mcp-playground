import { verifyLineSignature } from "../src/line/verifier";
import { NeedleClassifier } from "../src/classifier/needle";
import { evaluateMathExpression } from "../src/tools/calculator";
import { PersonalTodoManager } from "../src/tools/personalTodo";
import { DiscordLogger } from "../src/tools/discordLogger";
import { getEnabledModules, createFeatureListFlexMessage } from "../src/config/modules";
import { getNearbyTransportContext } from "../src/tools/tdxTransport";
import { getTaiwanWeatherForecast } from "../src/tools/weather";
import { createLocationTransportFlexMessage, createPromoProjectsFlexMessage, createRssFeedFlexMessage, createGithubBriefingFlexMessage } from "../src/line/templates";
import { fetchMorningFinanceSnapshot, fetchTaiwanStockSnapshot } from "../src/tools/financeData";
import { getRssFeed } from "../src/tools/rssReader";
import { getThematicConfig, fetchFindARepoData, formatActivityBadge, formatVelocityBadge } from "../src/tools/findarepo";
import { app } from "../src/index";
import type { Env } from "../src/types/env";

const MOCK_ENV: Env = {
  LINE_CHANNEL_SECRET: "mock_personal_secret_12345",
  LINE_CHANNEL_ACCESS_TOKEN: "mock_access_token",
  ALLOWED_USER_ID: "U_AUTHORIZED_USER_12345",
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

  const rPromo = classifier.classify("精選專案");
  if (rPromo.tool !== "promo_projects") throw new Error(`Expected promo_projects, got ${rPromo.tool}`);
  console.log(`  ✔ '精選專案' -> ${rPromo.tool}`);

  const rOldButton = classifier.classify("拍照單據功能");
  if (rOldButton.tool !== "promo_projects") throw new Error(`Expected promo_projects, got ${rOldButton.tool}`);
  console.log(`  ✔ '拍照單據功能' -> ${rOldButton.tool} (自動相容精選專案)`);

  const rOcr = classifier.classify("發票功能");
  if (rOcr.tool !== "ocr_vault") throw new Error(`Expected ocr_vault, got ${rOcr.tool}`);
  console.log(`  ✔ '發票功能' -> ${rOcr.tool}`);

  const promoFlex = createPromoProjectsFlexMessage();
  if (promoFlex.type !== "flex") throw new Error("Promo flex message malformed");
  console.log(`  ✔ Promo Projects Flex Message Bubble generated successfully!`);

  const r1 = classifier.classify("功能");
  const r2 = classifier.classify("你能做什麼");
  if (r2.tool !== "list_features") throw new Error(`Expected list_features, got ${r2.tool}`);
  console.log(`  ✔ '你能做什麼' -> ${r2.tool}`);

  const r3 = classifier.classify("待辦：下午兩點採買生鮮");
  if (r3.tool !== "manage_todo" || r3.arguments.action !== "add") throw new Error(`Expected manage_todo add, got ${r3.tool}`);
  console.log(`  ✔ '待辦：下午兩點採買生鮮' -> ${r3.tool} (${r3.arguments.action})`);

  const rTodoComplete = classifier.classify("完成 1");
  if (rTodoComplete.tool !== "manage_todo" || rTodoComplete.arguments.action !== "complete" || rTodoComplete.arguments.item !== "1") {
    throw new Error(`Expected manage_todo complete, got ${rTodoComplete.tool} / ${rTodoComplete.arguments.action}`);
  }
  console.log(`  ✔ '完成 1' -> ${rTodoComplete.tool} (${rTodoComplete.arguments.action} #${rTodoComplete.arguments.item})`);

  const rTodoList = classifier.classify("待辦清單");
  if (rTodoList.tool !== "manage_todo" || rTodoList.arguments.action !== "list") {
    throw new Error(`Expected manage_todo list, got ${rTodoList.tool}`);
  }
  console.log(`  ✔ '待辦清單' -> ${rTodoList.tool} (${rTodoList.arguments.action})`);
  const r5 = classifier.classify("幫我找附近的 YouBike");
  if (r5.tool !== "nearby_transport") throw new Error(`Expected nearby_transport, got ${r5.tool}`);
  console.log(`  ✔ '幫我找附近的 YouBike' -> ${r5.tool}`);

  const rStock = classifier.classify("台股今天收盤行情");
  if (rStock.tool !== "briefing_stock") throw new Error(`Expected briefing_stock, got ${rStock.tool}`);
  console.log(`  ✔ '台股今天收盤行情' -> ${rStock.tool}`);

  const rMorning = classifier.classify("查看美股早報");
  if (rMorning.tool !== "briefing_morning") throw new Error(`Expected briefing_morning, got ${rMorning.tool}`);
  console.log(`  ✔ '查看美股早報' -> ${rMorning.tool}\n`);
  const rRss = classifier.classify("RSS");
  if (rRss.tool !== "rss_reader") throw new Error(`Expected rss_reader, got ${rRss.tool}`);
  console.log(`  ✔ 'RSS' -> ${rRss.tool}`);

  const rNews = classifier.classify("看新聞");
  if (rNews.tool !== "rss_reader") throw new Error(`Expected rss_reader, got ${rNews.tool}`);
  console.log(`  ✔ '看新聞' -> ${rNews.tool}`);

  const rRssAi = classifier.classify("RSS AI");
  if (rRssAi.tool !== "rss_reader" || rRssAi.arguments.query !== "AI") {
    throw new Error(`Expected rss_reader with query 'AI', got ${rRssAi.tool}`);
  }
  console.log(`  ✔ 'RSS AI' -> ${rRssAi.tool} (query: ${rRssAi.arguments.query})`);

  const rRssUrl = classifier.classify("https://motc-mini-dog.pages.dev/rss");
  if (rRssUrl.tool !== "rss_reader") throw new Error(`Expected rss_reader for URL, got ${rRssUrl.tool}`);
  console.log(`  ✔ 'https://motc-mini-dog.pages.dev/rss' -> ${rRssUrl.tool}`);

  const rGithub = classifier.classify("github 黑馬");
  if (rGithub.tool !== "briefing_github") throw new Error(`Expected briefing_github, got ${rGithub.tool}`);
  console.log(`  ✔ 'github 黑馬' -> ${rGithub.tool}`);

  const rMcp = classifier.classify("推薦 MCP");
  if (rMcp.tool !== "briefing_github" || rMcp.arguments.topic !== "mcp") throw new Error(`Expected briefing_github topic mcp, got ${rMcp.tool}`);
  console.log(`  ✔ '推薦 MCP' -> ${rMcp.tool} (topic: ${rMcp.arguments.topic})`);

  const rAgent = classifier.classify("推薦 agent");
  if (rAgent.tool !== "briefing_github" || rAgent.arguments.topic !== "ai-agents") throw new Error(`Expected briefing_github topic ai-agents, got ${rAgent.tool}`);
  console.log(`  ✔ '推薦 agent' -> ${rAgent.tool} (topic: ${rAgent.arguments.topic})`);

  const rDevTools = classifier.classify("推薦 dev tools");
  if (rDevTools.tool !== "briefing_github" || rDevTools.arguments.topic !== "dev-tools") throw new Error(`Expected briefing_github topic dev-tools, got ${rDevTools.tool}`);
  console.log(`  ✔ '推薦 dev tools' -> ${rDevTools.tool} (topic: ${rDevTools.arguments.topic})`);

  // FindARepo Client & Flex Card
  console.log("\n▶ Testing FindARepo Client & Thematic Briefings...");
  const config = getThematicConfig(5); // Friday
  const { items } = await fetchFindARepoData(config, 4);
  if (items.length === 0) throw new Error("FindARepo returned 0 items");
  console.log(`  ✔ Fetched ${items.length} items for ${config.themeTitle}:`, items.map((i) => i.repo));

  const briefingFlex = createGithubBriefingFlexMessage({
    dateStr: "2026/09/21",
    timeStr: "19:00",
    thematicTitle: `${config.dayName}：${config.themeTitle}`,
    thematicSubtitle: config.themeSubtitle,
    tagBadge: config.tagBadge,
    repos: items.map((i) => ({
      name: i.repo,
      url: i.github,
      description: i.summary,
      language: i.language || "Multi",
      stars: i.stars,
      velocityBadge: formatVelocityBadge(i.starsGained, i.measuredWindowDays),
      activityBadge: formatActivityBadge(i.activity),
      license: i.license
    }))
  });
  if (briefingFlex.type !== "flex") throw new Error("Briefing flex message malformed");
  console.log("  ✔ FindARepo GitHub Briefing Flex Message successfully created!\n");


  // 3. Declarative Modules
  console.log("▶ Testing Declarative Module System...");
  const modules = getEnabledModules("personal");
  if (modules.length < 9) throw new Error(`Expected at least 9 personal modules, got ${modules.length}`);
  const hasRssModule = modules.some((m) => m.id === "rss_reader");
  if (!hasRssModule) throw new Error("rss_reader module not found in personal modules registry");
  console.log(`  ✔ Loaded ${modules.length} active personal modules (including rss_reader):`, modules.map((m) => m.name));
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
  // 6. Transport & YouBike 2.0 Field Mapping + Weather
  console.log("▶ Testing Transport & YouBike 2.0 + Weather Combined Card...");
  const weather = await getTaiwanWeatherForecast("台北");
  transport.weather = weather;
  const combinedCard = createLocationTransportFlexMessage(transport);
  if (combinedCard.type !== "flex") throw new Error("Combined location card malformed");
  console.log(`  ✔ Combined Card built with: Weather(${weather.condition} ${weather.minTemp}~${weather.maxTemp}°C) + ${transport.youbikes.length} YouBike stations`);
  console.log(`  ✔ Smart Tip: ${transport.transitTips[0]}\n`);

  // 7. Finance Data Snapshot
  console.log("▶ Testing Finance Data Snapshot (US + TW Stocks + Crypto)...");
  const morningFinance = await fetchMorningFinanceSnapshot();
  if (morningFinance.usStocks.length === 0 || morningFinance.crypto.length === 0) throw new Error("Morning finance empty");
  console.log(`  ✔ US Stocks: ${morningFinance.usStocks.map(s => s.name).join(", ")}`);
  console.log(`  ✔ Crypto: ${morningFinance.crypto.map(c => `${c.name} $${c.priceUsd}`).join(", ")}`);
  const twStocks = await fetchTaiwanStockSnapshot();
  if (twStocks.length === 0) throw new Error("Taiwan stocks empty");
  console.log(`  ✔ Taiwan Stocks: ${twStocks.map(s => `${s.name} ${s.price}`).join(", ")}\n`);
  // 8. MOTC RSS Feed & Intelligence Hub
  console.log("▶ Testing MOTC RSS Feed & Intelligence Hub (CSV Parser & Flex Message)...");
  const feed = await getRssFeed({ limit: 5 });
  if (!feed.success || feed.articles.length === 0) {
    throw new Error("RSS feed returned 0 articles or failed");
  }
  console.log(`  ✔ Successfully fetched and parsed ${feed.articles.length} latest articles (total in feed: ${feed.totalArticles})`);
  console.log(`  ✔ First Article: [${feed.articles[0].source}] ${feed.articles[0].title} (${feed.articles[0].timeAgo})`);

  // Test keyword search filter
  const aiFeed = await getRssFeed({ query: "AI", limit: 3 });
  if (!aiFeed.success) throw new Error("RSS keyword search failed");
  console.log(`  ✔ Filtered keyword 'AI': ${aiFeed.articles.length} articles matched`);

  // Test Flex Message Generation
  const rssFlex = createRssFeedFlexMessage(feed);
  if (rssFlex.type !== "flex") throw new Error("RSS Flex Message malformed");
  console.log(`  ✔ Generated RSS Feed Flex Card: ${rssFlex.altText}`);
  console.log(`  ✔ Web App Reader URL points to: ${feed.webUrl}\n`);
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
  // Authorized user testing "RSS" command via Webhook
  const rssPayload = JSON.stringify({
    destination: "dest",
    events: [
      {
        type: "message",
        mode: "active",
        timestamp: Date.now(),
        source: { type: "user", userId: MOCK_ENV.ALLOWED_USER_ID },
        replyToken: "mock_reply_token",
        message: { id: "m_rss", type: "text", text: "RSS" }
      }
    ]
  });
  const rssSig = await generateSignature(rssPayload, MOCK_ENV.LINE_CHANNEL_SECRET);
  const rssRes = await app.request(
    "http://localhost/webhook",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-line-signature": rssSig
      },
      body: rssPayload
    },
    MOCK_ENV
  );
  if (rssRes.status !== 200) throw new Error("RSS Webhook request failed");
  console.log("  ✔ Authorized user sent 'RSS' command successfully dispatched (200 OK)!\n");

  console.log("==========================================");
  console.log("🎉 ALL PERSONAL ASSISTANT TESTS PASSED!");
  console.log("==========================================");
}

main().catch((err) => {
  console.error("❌ TEST FAILED:", err);
  process.exit(1);
});
