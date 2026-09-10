import type { Env } from "../types/env";
import { LineClient } from "../line/client";
import { getTaiwanWeatherForecast } from "../tools/weather";
import { PersonalTodoManager } from "../tools/personalTodo";
import { fetchMorningFinanceSnapshot } from "../tools/financeData";
import { executeTavilySearch } from "../tools/search";
import { createMorningBriefingFlexMessage } from "../line/templates";
import { getTaiwanDateOnly, getTaiwanShortTime } from "../utils/time";
import { DiscordLogger } from "../tools/discordLogger";

export async function executeMorningBriefing(env: Env, customUserId?: string): Promise<boolean> {
  const userId = customUserId || env.ALLOWED_USER_ID?.split(",")[0]?.trim();
  if (!userId) {
    console.warn("[MorningBriefing] No user ID configured, skipping push.");
    return false;
  }

  const lineClient = new LineClient(env.LINE_CHANNEL_ACCESS_TOKEN);
  const todoManager = new PersonalTodoManager(env.PERSONAL_KV, env.GOOGLE_SHEET_APP_URL);
  const discord = new DiscordLogger(env.DISCORD_WEBHOOK_URL, env.PERSONAL_KV);

  const dateStr = getTaiwanDateOnly();
  const timeStr = getTaiwanShortTime();

  console.log(`[MorningBriefing] Starting morning briefing generation at ${dateStr} ${timeStr}...`);

  await discord.sendInfo(
    `🌅 晨間早報開始執行 ${dateStr} ${timeStr}`,
    "正在並行抓取天氣、待辦、美股、新聞...",
    [],
    true
  );

  try {
    const [weather, allTodos, finance, news] = await Promise.all([
      getTaiwanWeatherForecast("台北", env.CWA_API_KEY),
      todoManager.getTodos(userId).catch(() => []),
      fetchMorningFinanceSnapshot(),
      executeTavilySearch("今日台灣重點新聞 科技 AI 財經 股市 生活", env.TAVILY_API_KEY, env.GEMINI_API_KEY)
    ]);

    const activeTodos = allTodos.filter((t) => t.status === "進行中");

    await discord.sendInfo(
      "📦 資料抓取完成",
      [
        `**天氣**：${weather.condition} ${weather.minTemp}～${weather.maxTemp}°C　降雨率 ${weather.rainProb}`,
        `**待辦**：共 ${allTodos.length} 筆，進行中 ${activeTodos.length} 筆`,
        `**美股**：${finance.usStocks.map((s) => `${s.name} ${s.changePercent >= 0 ? "+" : ""}${s.changePercent}%`).join("　")}`,
        `**新聞摘要**（前 80 字）：${news.summary.slice(0, 80)}…`
      ].join("\n"),
      [],
      true
    );

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
      todos: activeTodos,
      finance,
      newsSummary: news.summary
    });

    const success = await lineClient.push(userId, flexMessage);
    console.log(`[MorningBriefing] Push result to ${userId}: ${success ? "SUCCESS" : "FAILED"}`);

    await discord.sendInfo(
      success ? "✅ 晨間早報推送成功" : "❌ 晨間早報推送失敗",
      `LINE push → \`${userId}\`　結果：${success ? "SUCCESS" : "FAILED"}`,
      [],
      true
    );

    return success;
  } catch (error) {
    console.error("[MorningBriefing] Execution failed:", error);
    await discord.sendError("晨間早報執行失敗", error instanceof Error ? error : String(error));
    await lineClient.push(userId, {
      type: "text",
      text: `🌅 晨間生活與美股早報推播異常：${error instanceof Error ? error.message : String(error)}`
    });
    return false;
  }
}
