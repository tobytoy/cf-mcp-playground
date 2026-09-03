import { AnalyticsManager } from "../src/tools/analytics";
import { NeedleClassifier } from "../src/classifier/needle";
import type { Env } from "../src/types/env";

export async function testAnalyticsAndStats(): Promise<void> {
  console.log("▶ Testing Analytics & Usage Statistics...");

  const analytics = new AnalyticsManager();
  const userId = "test_user_analytics_123";

  // 1. Record several actions
  await analytics.recordUsage(userId, "search_web", "今日科技新聞", "gemini-3.5-flash");
  await analytics.recordUsage(userId, "calculator", "100 * 1.05^3");
  await analytics.recordUsage(userId, "ask_llm", "請解釋什麼是量子力學", "gemini-3.7-flash");

  // 2. Fetch report
  const report = await analytics.getUsageReport(userId);

  if (report.totalCalls !== 3) {
    throw new Error(`Expected totalCalls 3, got ${report.totalCalls}`);
  }
  if (report.toolCounts.search_web !== 1 || report.toolCounts.calculator !== 1 || report.toolCounts.ask_llm !== 1) {
    throw new Error(`Tool counts mismatch: ${JSON.stringify(report.toolCounts)}`);
  }
  if (report.recentHistory.length !== 3) {
    throw new Error(`Expected 3 history items, got ${report.recentHistory.length}`);
  }
  console.log(`  ✔ Recorded ${report.totalCalls} events with tool distribution:`, report.toolCounts);
  console.log(`  ✔ Recent history recorded: ${report.recentHistory[0].preview}`);

  // 3. Test routing classification for stats
  const mockEnv: Env = {
    LINE_CHANNEL_SECRET: "s",
    LINE_CHANNEL_ACCESS_TOKEN: "t",
    GEMINI_API_KEY: "k"
  };
  const classifier = new NeedleClassifier(mockEnv);

  const route1 = await classifier.classify("我想看使用統計資訊");
  if (route1.tool !== "view_stats") {
    throw new Error(`Expected view_stats, got ${route1.tool}`);
  }
  console.log(`  ✔ '我想看使用統計資訊' -> ${route1.tool}`);

  const route2 = await classifier.classify("看歷史紀錄");
  if (route2.tool !== "view_stats") {
    throw new Error(`Expected view_stats, got ${route2.tool}`);
  }
  console.log(`  ✔ '看歷史紀錄' -> ${route2.tool}`);

  console.log("✅ Analytics & Stats tests passed!\n");
}
