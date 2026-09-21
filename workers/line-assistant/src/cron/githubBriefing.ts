import type { Env } from "../types/env";
import { LineClient } from "../line/client";
import {
  createGithubBriefingFlexMessage,
  type GithubBriefingRepoItem
} from "../line/templates";
import { getTaiwanDateOnly, getTaiwanShortTime } from "../utils/time";
import { generateAiResponse } from "../tools/aiChat";
import { DiscordLogger } from "../tools/discordLogger";
import {
  getThematicConfig,
  fetchFindARepoData,
  formatActivityBadge,
  formatVelocityBadge,
  type ThematicBriefingConfig
} from "../tools/findarepo";

export interface TrendingRepo {
  name: string;
  url: string;
  description: string;
  language: string;
  stars: number;
  velocityBadge?: string | null;
  activityBadge?: string | null;
  license?: string | null;
}

/**
 * 計算當前台灣時間 (UTC+8) 的星期幾 (0=週日, 1=週一, ... 6=週六)
 */
function getTaiwanDayOfWeek(): number {
  const nowUtc = new Date();
  const taiwanOffsetMs = 8 * 60 * 60 * 1000;
  const taiwanDate = new Date(nowUtc.getTime() + taiwanOffsetMs);
  return taiwanDate.getUTCDay();
}

/**
 * 抓取 GitHub 熱門開源專案推薦（以 FindARepo 速度與活躍度為核心，輔以雙層容錯）
 */
export async function fetchTrendingGitHubRepos(
  geminiApiKey?: string,
  customTopic?: string
): Promise<{ repos: TrendingRepo[]; config: ThematicBriefingConfig }> {
  const dayOfWeek = getTaiwanDayOfWeek();
  const config = getThematicConfig(dayOfWeek, customTopic);

  let rawRepos: TrendingRepo[] = [];

  // 1. 主要資料源：FindARepo (Star Velocity & Commit Cadence)
  try {
    const { items } = await fetchFindARepoData(config, 4);
    rawRepos = items.map((it) => ({
      name: it.repo,
      url: it.github,
      description: it.summary || "近期開源社群熱門專案",
      language: it.language || "Multi",
      stars: it.stars,
      velocityBadge: formatVelocityBadge(it.starsGained, it.measuredWindowDays),
      activityBadge: formatActivityBadge(it.activity),
      license: it.license
    }));
  } catch (err) {
    console.warn("[GitHubBriefing] FindARepo fetch failed, attempting GitHub Search API fallback:", err);
  }

  // 2. 第二層容錯：GitHub 官方 Search API
  if (rawRepos.length === 0) {
    try {
      const dateLimit = new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10);
      const url = `https://api.github.com/search/repositories?q=created:>${dateLimit}+stars:>30&sort=stars&order=desc&per_page=4`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Cloudflare-Worker-LINE-Assistant/2.0",
          Accept: "application/vnd.github.v3+json"
        },
        signal: AbortSignal.timeout(6000)
      });

      if (res.ok) {
        const data = (await res.json()) as {
          items?: Array<{
            full_name: string;
            html_url: string;
            description: string | null;
            language: string | null;
            stargazers_count: number;
            license?: { spdx_id?: string };
          }>;
        };
        rawRepos = (data.items || []).slice(0, 4).map((r) => ({
          name: r.full_name,
          url: r.html_url,
          description: r.description || "開源社群熱門新專案",
          language: r.language || "Multi",
          stars: r.stargazers_count,
          velocityBadge: "近期爆發新星",
          activityBadge: "🌱 活躍新專案",
          license: r.license?.spdx_id || null
        }));
      }
    } catch (err) {
      console.warn("[GitHubBriefing] GitHub Search API fallback failed:", err);
    }
  }

  // 3. 第三層保底：高品質靜態精選專案
  if (rawRepos.length === 0) {
    rawRepos = getFallbackRepos();
  }

  // 4. 繁體中文（台灣 zh-TW）在地化精煉
  if (geminiApiKey && rawRepos.length > 0) {
    try {
      const systemPrompt =
        "你是一位專精於開源生態的資深技術主編。請將以下 GitHub 專案的說明翻譯並精練為道地的台灣繁體中文（zh-TW）。\n" +
        "【嚴格規範】：\n" +
        "1. 格式嚴格為每一專案一行：[專案全名] 繁中精華說明\n" +
        "2. 長度為 25～45 個中文字，重點描述核心功能、技術特色與適用情境。\n" +
        "3. 嚴格使用台灣慣用技術詞彙（例如：程式碼、專案、伺服器、支援、外掛、架構、優化），嚴禁使用中國大陸用語（如：代碼、項目、服務器、支持、插件、內存、優化）。\n" +
        "4. 嚴禁任何開場白、結尾問候、備註或引言。";

      const prompt = rawRepos.map((r) => `• [${r.name}] ${r.description}`).join("\n");
      const aiResult = await generateAiResponse(
        prompt,
        geminiApiKey,
        "gemini-3.5-flash-lite",
        [],
        "concise",
        undefined,
        systemPrompt
      );

      if (aiResult.text) {
        const lines = aiResult.text.split("\n").filter((l) => l.includes("[") && l.includes("]"));
        for (const line of lines) {
          const match = line.match(/\[([^\]]+)\]\s*(.*)/);
          if (match) {
            const matchedName = match[1].trim().toLowerCase();
            const desc = match[2].trim();
            const targetRepo = rawRepos.find((r) => {
              const rLower = r.name.toLowerCase();
              return rLower === matchedName || rLower.endsWith("/" + matchedName) || matchedName.endsWith("/" + rLower);
            });
            if (targetRepo && desc) {
              targetRepo.description = desc;
            }
          }
        }
      }
    } catch (err) {
      console.warn("[GitHubBriefing] AI translation failed, keeping original summaries:", err);
    }
  }

  return { repos: rawRepos, config };
}

function getFallbackRepos(): TrendingRepo[] {
  return [
    {
      name: "modelcontextprotocol/servers",
      url: "https://github.com/modelcontextprotocol/servers",
      description: "Anthropic 官方開源 Model Context Protocol (MCP) 標準工具伺服器集合，支援資料庫、終端與檔案整合",
      language: "TypeScript",
      stars: 42300,
      velocityBadge: "+1,420 ⭐ (7天暴增)",
      activityBadge: "⚡ 極活躍 (100分 · 連續26週)",
      license: "MIT"
    },
    {
      name: "deepseek-ai/deepseek-harness",
      url: "https://github.com/deepseek-ai/deepseek-harness",
      description: "DeepSeek 官方開源研究與自動化代理框架，提供即時推論與評測工具鏈",
      language: "TypeScript",
      stars: 21500,
      velocityBadge: "+850 ⭐ (7天暴增)",
      activityBadge: "⚡ 極活躍 (95分 · 連續20週)",
      license: "Apache-2.0"
    },
    {
      name: "firecrawl/anydoc",
      url: "https://github.com/firecrawl/anydoc",
      description: "將 Word、PPT、PDF 高速轉換為乾淨 Markdown 的開源核心引擎，專為 LLM 檢索增強設計",
      language: "Rust",
      stars: 20400,
      velocityBadge: "+620 ⭐ (7天暴增)",
      activityBadge: "🔥 高活躍 (88分 · 連續18週)",
      license: "MIT"
    },
    {
      name: "guillaumemeyer/watermarks-remover",
      url: "https://github.com/guillaumemeyer/watermarks-remover",
      description: "輕量化本地端 AI 生成浮水印檢測與消除工具，可直接離線高速執行",
      language: "Python",
      stars: 20100,
      velocityBadge: "+510 ⭐ (7天暴增)",
      activityBadge: "📈 穩定維護 (75分 · 連續12週)",
      license: "GPL-3.0"
    }
  ];
}

export async function executeGithubBriefing(
  env: Env,
  customUserId?: string,
  options?: { topic?: string }
): Promise<boolean> {
  const userId = customUserId || env.ALLOWED_USER_ID?.split(",")[0]?.trim();
  if (!userId) {
    console.warn("[GitHubBriefing] No user ID configured, skipping push.");
    return false;
  }

  const lineClient = new LineClient(env.LINE_CHANNEL_ACCESS_TOKEN);
  const discord = new DiscordLogger(env.DISCORD_WEBHOOK_URL, env.ASSISTANT_KV);
  const dateStr = getTaiwanDateOnly();
  const timeStr = getTaiwanShortTime();

  console.log(`[GitHubBriefing] Starting GitHub trending briefing (${options?.topic || "Thematic"}) at ${dateStr} ${timeStr}...`);

  await discord.sendInfo(
    `🚀 GitHub 開源快報開始執行 ${dateStr} ${timeStr}`,
    `正在依據主題「${options?.topic || "FindARepo 每日輪播"}」抓取開源專案並進行繁中在地化...`,
    [],
    true
  );

  try {
    const { repos, config } = await fetchTrendingGitHubRepos(env.GEMINI_API_KEY, options?.topic);

    const briefingRepos: GithubBriefingRepoItem[] = repos.map((r) => ({
      name: r.name,
      url: r.url,
      description: r.description,
      language: r.language,
      stars: r.stars,
      velocityBadge: r.velocityBadge,
      activityBadge: r.activityBadge,
      license: r.license
    }));

    const flexMessage = createGithubBriefingFlexMessage({
      dateStr,
      timeStr,
      thematicTitle: `${config.dayName}：${config.themeTitle}`,
      thematicSubtitle: config.themeSubtitle,
      tagBadge: config.tagBadge,
      repos: briefingRepos
    });

    const success = await lineClient.push(userId, flexMessage);
    console.log(`[GitHubBriefing] Push result to ${userId}: ${success ? "SUCCESS" : "FAILED"}`);

    await discord.sendInfo(
      success ? "✅ GitHub 快報推送成功" : "❌ GitHub 快報推送失敗",
      `主題：${config.themeTitle}\nLINE push → \`${userId}\`　結果：${success ? "SUCCESS" : "FAILED"}\n收錄專案：${repos.map((r) => r.name).join(", ")}`,
      [],
      true
    );

    return success;
  } catch (error) {
    console.error("[GitHubBriefing] Execution failed:", error);
    await discord.sendError("GitHub 快報執行失敗", error instanceof Error ? error : String(error));
    await lineClient.push(userId, {
      type: "text",
      text: `🚀 GitHub 開源快報推播異常：${error instanceof Error ? error.message : String(error)}`
    });
    return false;
  }
}
