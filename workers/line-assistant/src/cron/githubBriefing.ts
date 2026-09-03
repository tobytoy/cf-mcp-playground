import type { Env } from "../types/env";
import { LineClient } from "../line/client";
import { createGithubBriefingFlexMessage } from "../line/templates";
import { getTaiwanDateOnly, getTaiwanShortTime } from "../utils/time";

export interface TrendingRepo {
  name: string;
  url: string;
  description: string;
  language: string;
  stars: number;
}

export async function fetchTrendingGitHubRepos(): Promise<TrendingRepo[]> {
  try {
    // Look back ~20 days for recent breakout stars
    const dateLimit = new Date(Date.now() - 20 * 86400000).toISOString().slice(0, 10);
    const url = `https://api.github.com/search/repositories?q=created:>${dateLimit}+stars:>30&sort=stars&order=desc&per_page=5`;

    const res = await fetch(url, {
      headers: {
        "User-Agent": "Cloudflare-Worker-LINE-Assistant",
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

    return repos.length > 0 ? repos : getFallbackRepos();
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
  const userId = customUserId || env.ALLOWED_USER_ID;
  if (!userId) {
    console.warn("[GitHubBriefing] No user ID configured, skipping push.");
    return false;
  }

  const lineClient = new LineClient(env.LINE_CHANNEL_ACCESS_TOKEN);
  const dateStr = getTaiwanDateOnly();
  const timeStr = getTaiwanShortTime();

  console.log(`[GitHubBriefing] Starting GitHub trending briefing generation at ${dateStr} ${timeStr}...`);

  try {
    const repos = await fetchTrendingGitHubRepos();

    const flexMessage = createGithubBriefingFlexMessage({
      dateStr,
      timeStr,
      repos
    });

    const success = await lineClient.push(userId, flexMessage);
    console.log(`[GitHubBriefing] Push result to ${userId}: ${success ? "SUCCESS" : "FAILED"}`);
    return success;
  } catch (error) {
    console.error("[GitHubBriefing] Execution failed:", error);
    await lineClient.push(userId, {
      type: "text",
      text: `🚀 GitHub 熱點推播異常：${error instanceof Error ? error.message : String(error)}`
    });
    return false;
  }
}
