import type { Env } from "../types/env";
import { LineClient } from "../line/client";
import { getTaiwanWeatherForecast } from "../tools/weather";
import { PersonalTodoManager } from "../tools/personalTodo";
import { fetchMorningFinanceSnapshot } from "../tools/financeData";
import { executeTavilySearch } from "../tools/search";
import { createMorningBriefingFlexMessage } from "../line/templates";
import { getTaiwanDateOnly, getTaiwanShortTime } from "../utils/time";

export async function executeMorningBriefing(env: Env, customUserId?: string): Promise<boolean> {
  const userId = customUserId || env.ALLOWED_USER_ID?.split(",")[0]?.trim();
  if (!userId) {
    console.warn("[MorningBriefing] No user ID configured, skipping push.");
    return false;
  }

  const lineClient = new LineClient(env.LINE_CHANNEL_ACCESS_TOKEN);
  const todoManager = new PersonalTodoManager(env.PERSONAL_KV, env.GOOGLE_SHEET_APP_URL);

  const dateStr = getTaiwanDateOnly();
  const timeStr = getTaiwanShortTime();

  console.log(`[MorningBriefing] Starting morning briefing generation at ${dateStr} ${timeStr}...`);

  try {
    const [weather, uncompletedTodos, finance, news] = await Promise.all([
      getTaiwanWeatherForecast("台北", env.CWA_API_KEY),
      todoManager.getTodos(userId).catch(() => []),
      fetchMorningFinanceSnapshot(),
      executeTavilySearch("今日生活要聞與科技大事", env.TAVILY_API_KEY, env.GEMINI_API_KEY)
    ]);

    const flexMessage = createMorningBriefingFlexMessage({
      dateStr,
      timeStr,
      weather: {
        condition: weather.condition,
        rainProb: weather.rainProb,
        tempRange: `${weather.minTemp} ~ ${weather.maxTemp}`,
        comfort: weather.comfort,
        advice: weather.advice
      },
      todoCount: uncompletedTodos.filter((t) => t.status === "進行中").length,
      finance,
      newsSummary: news.summary
    });

    const success = await lineClient.push(userId, flexMessage);
    console.log(`[MorningBriefing] Push result to ${userId}: ${success ? "SUCCESS" : "FAILED"}`);
    return success;
  } catch (error) {
    console.error("[MorningBriefing] Execution failed:", error);
    await lineClient.push(userId, {
      type: "text",
      text: `🌅 晨間生活與美股早報推播異常：${error instanceof Error ? error.message : String(error)}`
    });
    return false;
  }
}
