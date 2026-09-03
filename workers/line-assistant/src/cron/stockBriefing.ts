import type { Env } from "../types/env";
import { LineClient } from "../line/client";
import { fetchTaiwanStockSnapshot } from "../tools/financeData";
import { executeTavilySearch } from "../tools/search";
import { createStockBriefingFlexMessage } from "../line/templates";
import { getTaiwanDateOnly, getTaiwanShortTime } from "../utils/time";

export async function executeStockBriefing(env: Env, customUserId?: string): Promise<boolean> {
  const userId = customUserId || env.ALLOWED_USER_ID;
  if (!userId) {
    console.warn("[StockBriefing] No user ID configured, skipping push.");
    return false;
  }

  const lineClient = new LineClient(env.LINE_CHANNEL_ACCESS_TOKEN);
  const dateStr = getTaiwanDateOnly();
  const timeStr = getTaiwanShortTime();

  console.log(`[StockBriefing] Starting Taiwan stock closing briefing generation at ${dateStr} ${timeStr}...`);

  try {
    // 1. Fetch real-time quotes & institutional investor summary
    const [quotes, marketAnalysis] = await Promise.all([
      fetchTaiwanStockSnapshot(),
      executeTavilySearch("今日台股收盤 三大法人外資投信買賣超 台積電 重點族群行情總結", env.TAVILY_API_KEY || "", env.GEMINI_API_KEY)
    ]);

    // 2. Format into Stock Closing Flex Message
    const flexMessage = createStockBriefingFlexMessage({
      dateStr,
      timeStr,
      quotes,
      summary: marketAnalysis.summary
    });

    // 3. Push to LINE
    const success = await lineClient.push(userId, flexMessage);
    console.log(`[StockBriefing] Push result to ${userId}: ${success ? "SUCCESS" : "FAILED"}`);
    return success;
  } catch (error) {
    console.error("[StockBriefing] Execution failed:", error);
    await lineClient.push(userId, {
      type: "text",
      text: `📈 台股盤後總結推播異常：${error instanceof Error ? error.message : String(error)}`
    });
    return false;
  }
}
