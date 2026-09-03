import { fetchMorningFinanceSnapshot, fetchTaiwanStockSnapshot } from "../src/tools/financeData";
import { fetchTrendingGitHubRepos } from "../src/cron/githubBriefing";
import { NeedleClassifier } from "../src/classifier/needle";
import type { Env } from "../src/types/env";

export async function testCronAndMarketBriefings(): Promise<void> {
  console.log("▶ Testing Cron Briefings, Market Data & GitHub Ingestion...");

  // 1. Test US Stocks & Crypto Snapshot
  const finance = await fetchMorningFinanceSnapshot();
  console.log(`  ✔ US Stocks fetched: ${finance.usStocks.length} symbols, Crypto fetched: ${finance.crypto.length} coins`);
  if (finance.crypto.length === 0) {
    throw new Error("Crypto quote fetch failed!");
  }
  for (const c of finance.crypto) {
    console.log(`     • ${c.name} (${c.symbol}): $${c.priceUsd.toLocaleString()} USD (${c.changePercent24h >= 0 ? "+" : ""}${c.changePercent24h}%)`);
  }

  // 2. Test Taiwan Stock Market Snapshot
  const twStocks = await fetchTaiwanStockSnapshot();
  console.log(`  ✔ Taiwan Stocks fetched: ${twStocks.length} symbols`);
  for (const s of twStocks) {
    console.log(`     • ${s.name} (${s.symbol}): ${s.price} (${s.changePercent >= 0 ? "+" : ""}${s.changePercent}%)`);
  }

  // 3. Test GitHub Trending Repos
  const repos = await fetchTrendingGitHubRepos();
  console.log(`  ✔ GitHub Trending Repos fetched: ${repos.length} repos`);
  if (repos.length === 0) {
    throw new Error("GitHub trending repos fetch failed!");
  }
  for (const r of repos.slice(0, 3)) {
    console.log(`     • ⭐ ${r.stars.toLocaleString()} | ${r.name} (${r.language}): ${r.description.slice(0, 30)}…`);
  }

  // 4. Test Needle Intent Routing for Briefing Commands
  const mockEnv: Env = {
    LINE_CHANNEL_SECRET: "s",
    LINE_CHANNEL_ACCESS_TOKEN: "t",
    GEMINI_API_KEY: "k"
  };
  const classifier = new NeedleClassifier(mockEnv);

  const route1 = await classifier.classify("我想看每日晨報");
  if (route1.tool !== "briefing_morning") {
    throw new Error(`Expected briefing_morning, got ${route1.tool}`);
  }
  console.log(`  ✔ '我想看每日晨報' -> ${route1.tool}`);

  const route2 = await classifier.classify("台股今天收盤如何？");
  if (route2.tool !== "briefing_stock") {
    throw new Error(`Expected briefing_stock, got ${route2.tool}`);
  }
  console.log(`  ✔ '台股今天收盤如何？' -> ${route2.tool}`);

  const route3 = await classifier.classify("看今天 github 熱點專案");
  if (route3.tool !== "briefing_github") {
    throw new Error(`Expected briefing_github, got ${route3.tool}`);
  }
  console.log(`  ✔ '看今天 github 熱點專案' -> ${route3.tool}`);

  console.log("✅ Cron & Market Briefings tests passed!\n");
}
