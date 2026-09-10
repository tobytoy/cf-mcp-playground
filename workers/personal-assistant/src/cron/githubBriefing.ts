import type { Env } from "../types/env";
import { LineClient } from "../line/client";
import { createGithubBriefingFlexMessage } from "../line/templates";
import { getTaiwanDateOnly, getTaiwanShortTime } from "../utils/time";
import { generateAiResponse } from "../tools/aiChat";
import { DiscordLogger } from "../tools/discordLogger";
export interface TrendingRepo {
  name: string;
  url: string;
  description: string;
  language: string;
  stars: number;
}

export async function fetchTrendingGitHubRepos(geminiApiKey?: string): Promise<TrendingRepo[]> {
  try {
    // Look back ~20 days for recent breakout stars
    const dateLimit = new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10);
    const url = `https://api.github.com/search/repositories?q=created:>${dateLimit}+stars:>30&sort=stars&order=desc&per_page=5`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Cloudflare-Worker-Personal-Assistant",
        Accept: "application/vnd.github.v3+json"
      },
      signal: AbortSignal.timeout(8000)
    });

    if (!res.ok) return getFallbackRepos();

    const data = (await res.json()) as {
      items?: Array<{
        full_name: string;
        html_url: string;
        description: string | null;
        language: string | null;
        stargazers_count: number;
      }>;
    };

    const repos: TrendingRepo[] = (data.items || []).slice(0, 4).map((r) => ({
      name: r.full_name,
      url: r.html_url,
      description: r.description || "開源社群熱門專案",
      language: r.language || "Multi",
      stars: r.stargazers_count
    }));

    if (repos.length === 0) return getFallbackRepos();

    // 繁體中文翻譯與精煉（避免直接輸出英文描述）
    if (geminiApiKey) {
      try {
        const systemPrompt =
          "你是一位專業的開源技術主編。請將以下 GitHub 專案的英文說明翻譯並精煉為道地的繁體中文（台灣，zh-TW）。每專案一行，格式嚴格為：\n[專案全名] 繁體中文說明（20～35字，說明核心功能，禁止廢話、開場白或問候語）";
        const prompt = repos.map((r) => `• [${r.name}] ${r.description}`).join("\n");
        const aiResult = await generateAiResponse(
          prompt,
          geminiApiKey,
          "gemini-3.5-flash-lite",
          [],
          "concise",
          systemPrompt
        );
        if (aiResult.text) {
          const lines = aiResult.text.split("\n").filter((l) => l.includes("[") && l.includes("]"));
          for (const line of lines) {
            const match = line.match(/\[([^\]]+)\]\s*(.*)/);
            if (match) {
              const matchedName = match[1].trim().toLowerCase();
              const desc = match[2].trim();
              const repo = repos.find((r) => {
                const rLower = r.name.toLowerCase();
                return rLower === matchedName || rLower.endsWith("/" + matchedName) || matchedName.endsWith("/" + rLower);
              });
              if (repo && desc) {
                repo.description = desc;
              }
            }
          }
        }
      } catch (err) {
        console.warn("[GitHubBriefing] AI translation failed, keeping fallback:", err);
      }
    }

    return repos;
  } catch (err) {
    console.warn("[GitHubBriefing] API fetch failed, using fallback:", err);
    return getFallbackRepos();
  }
}

function getFallbackRepos(): TrendingRepo[] {
  return [
    {
      name: "deepseek-ai/deepseek-harness",
      url: "https://github.com/deepseek-ai/deepseek-harness",
      description: "DeepSeek 官方開源外掛與自動化代理框架",
      language: "TypeScript",
      stars: 21500
    },
    {
      name: "firecrawl/anydoc",
      url: "https://github.com/firecrawl/anydoc",
      description: "將 Word、PPT、PDF 高速轉換為乾淨 Markdown 的開源核心",
      language: "Rust",
      stars: 20400
    },
    {
      name: "guillaumemeyer/watermarks-remover",
      url: "https://github.com/guillaumemeyer/watermarks-remover",
      description: "本地端 AI 生成浮水印檢測與消除工具",
      language: "Python",
      stars: 20100
    }
  ];
}

export async function executeGithubBriefing(env: Env, customUserId?: string): Promise<boolean> {
  const userId = customUserId || env.ALLOWED_USER_ID?.split(",")[0]?.trim();
  if (!userId) {
    console.warn("[GitHubBriefing] No user ID configured, skipping push.");
    return false;
  }

  const lineClient = new LineClient(env.LINE_CHANNEL_ACCESS_TOKEN);
  const discord = new DiscordLogger(env.DISCORD_WEBHOOK_URL, env.PERSONAL_KV);
  const dateStr = getTaiwanDateOnly();
  const timeStr = getTaiwanShortTime();

  console.log(`[GitHubBriefing] Starting GitHub trending briefing generation at ${dateStr} ${timeStr}...`);

  await discord.sendInfo(
    `🚀 GitHub 熱門快報開始執行 ${dateStr} ${timeStr}`,
    "正在抓取熱門開源專案與翻譯繁中摘要...",
    [],
    true
  );

  try {
    const repos = await fetchTrendingGitHubRepos(env.GEMINI_API_KEY);

    await discord.sendInfo(
      "📦 GitHub 專案抓取完成",
      repos.map((r) => `• **${r.name}** (${r.language} ⭐${r.stars.toLocaleString()})：${r.description}`).join("\n"),
      [],
      true
    );

    const flexMessage = createGithubBriefingFlexMessage({ dateStr, timeStr, repos });

    const success = await lineClient.push(userId, flexMessage);
    console.log(`[GitHubBriefing] Push result to ${userId}: ${success ? "SUCCESS" : "FAILED"}`);

    await discord.sendInfo(
      success ? "✅ GitHub 快報推送成功" : "❌ GitHub 快報推送失敗",
      `LINE push → \`${userId}\`　結果：${success ? "SUCCESS" : "FAILED"}`,
      [],
      true
    );

    return success;
  } catch (error) {
    console.error("[GitHubBriefing] Execution failed:", error);
    await discord.sendError("GitHub 快報執行失敗", error instanceof Error ? error : String(error));
    await lineClient.push(userId, {
      type: "text",
      text: `🚀 GitHub 熱點推播異常：${error instanceof Error ? error.message : String(error)}`
    });
    return false;
  }
}
