/**
 * FindARepo Integration Client (https://findarepo.com)
 * 每日 GitHub 開源專案動態推薦與 Star 增長速度 (Velocity) / 活躍度 (Activity) 深度指標分析。
 * 支援全繁體中文（台灣 zh-TW）在地化精煉。
 */

const FINDAREPO_BASE = "https://findarepo.com";

export interface FindARepoActivity {
  score: number;
  band: string;
  label: string;
  activeWeeks: number;
  weeksMeasured: number;
  streak: number;
}

export interface FindARepoItem {
  repo: string;
  github: string;
  findarepo?: string;
  summary: string;
  stars: number;
  starsGained?: number;
  measuredWindowDays?: number;
  language?: string | null;
  category?: string | null;
  license?: string | null;
  activity?: FindARepoActivity;
}

export interface ThematicBriefingConfig {
  dayName: string;
  themeTitle: string;
  themeSubtitle: string;
  tagBadge: string;
  endpoint: string;
  categorySlug?: string;
}

/**
 * 依據台灣時間星期幾 (0=週日, 1=週一, ... 6=週六) 提供特色主題輪播
 */
export function getThematicConfig(dayOfWeek: number, manualTopic?: string): ThematicBriefingConfig {
  if (manualTopic) {
    const lower = manualTopic.toLowerCase();
    if (lower.includes("mcp")) {
      return {
        dayName: "專題",
        themeTitle: "MCP 核心伺服器精選",
        themeSubtitle: "Model Context Protocol 社群高動能擴充工具與連線協議",
        tagBadge: "🔌 MCP 精選",
        endpoint: "/data/mcp.json"
      };
    }
    if (lower.includes("agent") || lower.includes("代理")) {
      return {
        dayName: "專題",
        themeTitle: "AI Agents 自主代理架構",
        themeSubtitle: "社群最受關注的開源 AI Agent 框架與自動化執行引擎",
        tagBadge: "🤖 AI Agents",
        endpoint: "/data/categories.json",
        categorySlug: "ai-agents"
      };
    }
    if (lower.includes("tool") || lower.includes("工具") || lower.includes("dev")) {
      return {
        dayName: "專題",
        themeTitle: "開發者效率神器",
        themeSubtitle: "工程師必備的 CLI、除錯工具與終端現代化套裝",
        tagBadge: "🛠️ 開發神器",
        endpoint: "/data/categories.json",
        categorySlug: "dev-tools"
      };
    }
    if (lower.includes("skill") || lower.includes("claude")) {
      return {
        dayName: "專題",
        themeTitle: "Claude Skills & 擴充技能",
        themeSubtitle: "Coding Agent 專屬技能模組與研究優先工作流",
        tagBadge: "🧩 Agent 技能",
        endpoint: "/data/skills.json"
      };
    }
  }

  // 星期日 (0)
  if (dayOfWeek === 0) {
    return {
      dayName: "週日特輯",
      themeTitle: "Claude Skills & 擴充技能",
      themeSubtitle: "提升 Coding Agent 效率的技能外掛與 Prompt 工作流",
      tagBadge: "🧩 Agent 技能",
      endpoint: "/data/skills.json"
    };
  }

  // 星期一 (1)
  if (dayOfWeek === 1) {
    return {
      dayName: "週一主題",
      themeTitle: "AI Agents 智慧代理架構",
      themeSubtitle: "前沿開源自主代理框架、Multi-Agent 協作系統",
      tagBadge: "🤖 AI Agents",
      endpoint: "/data/categories.json",
      categorySlug: "ai-agents"
    };
  }

  // 星期二 (2)
  if (dayOfWeek === 2) {
    return {
      dayName: "週二主題",
      themeTitle: "MCP 核心伺服器精選",
      themeSubtitle: "Model Context Protocol 社群最活躍之工具擴充伺服器",
      tagBadge: "🔌 MCP 工具",
      endpoint: "/data/mcp.json"
    };
  }

  // 星期三 (3)
  if (dayOfWeek === 3) {
    return {
      dayName: "週三主題",
      themeTitle: "開發者神器 & 效能工具",
      themeSubtitle: "優雅強大的 CLI、終端輔助、除錯與現代開發生態系",
      tagBadge: "🛠️ 開發神器",
      endpoint: "/data/categories.json",
      categorySlug: "dev-tools"
    };
  }

  // 星期四 (4)
  if (dayOfWeek === 4) {
    return {
      dayName: "週四主題",
      themeTitle: "本地模型 & 邊緣 AI",
      themeSubtitle: "私有化開源模型推論、邊緣端高效運算與量化技術",
      tagBadge: "⚡ 本地 AI",
      endpoint: "/data/categories.json",
      categorySlug: "local-ai"
    };
  }

  // 星期五 (5)
  if (dayOfWeek === 5) {
    return {
      dayName: "週五總榜",
      themeTitle: "全網 Star 飆升黑馬總冠軍",
      themeSubtitle: "本週 GitHub Star 增速最快、社群熱度最高的開源專案",
      tagBadge: "🔥 增速黑馬",
      endpoint: "/data/trending.json"
    };
  }

  // 星期六 (6)
  return {
    dayName: "週末特輯",
    themeTitle: "長期活躍穩健開源基石",
    themeSubtitle: "連續 26 週穩定 Commit 維護、健康度最高的優質專案",
    tagBadge: "💎 穩健活躍",
    endpoint: "/data/active.json"
  };
}

/**
 * 從 FindARepo 抓取指定端點的專案清單
 */
export async function fetchFindARepoData(
  config: ThematicBriefingConfig,
  limit: number = 4
): Promise<{ items: FindARepoItem[]; config: ThematicBriefingConfig }> {
  try {
    const url = `${FINDAREPO_BASE}${config.endpoint}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "HelperDog-Personal-Assistant/2.0 (findarepo-client)"
      },
      signal: AbortSignal.timeout(6000)
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} from ${url}`);
    }

    interface CategoryGroup {
      category: string;
      name?: string;
      items?: FindARepoItem[];
    }

    const data = (await res.json()) as {
      items?: unknown[];
    };

    let extracted: FindARepoItem[] = [];
    const rawItems = Array.isArray(data?.items) ? data.items : [];

    if (config.categorySlug) {
      // categories.json 格式解析
      for (const item of rawItems) {
        if (item && typeof item === "object" && "category" in item && "items" in item) {
          const group = item as CategoryGroup;
          if (group.category === config.categorySlug && Array.isArray(group.items)) {
            extracted = group.items;
            break;
          }
        }
      }
    } else {
      extracted = rawItems.filter((it): it is FindARepoItem => Boolean(it && typeof it === "object" && "repo" in it && "github" in it));
    }

    // 剔除缺少必要資訊的項目並限制數量
    const validItems = extracted
      .filter((it) => it && it.repo && it.github)
      .slice(0, limit);

    if (validItems.length > 0) {
      return { items: validItems, config };
    }

    throw new Error("No valid items in findarepo response");
  } catch (err) {
    console.warn(`[FindARepo] Primary endpoint ${config.endpoint} failed, falling back to trending:`, err);
    // 平滑降級：若專門分類失敗，退回 trending.json
    if (config.endpoint !== "/data/trending.json") {
      const fallbackConfig: ThematicBriefingConfig = {
        ...config,
        endpoint: "/data/trending.json",
        themeTitle: "全網 Star 飆升黑馬榜 (備援)",
        tagBadge: "🔥 增速黑馬"
      };
      return await fetchFindARepoData(fallbackConfig, limit);
    }
    throw err;
  }
}

/**
 * 將 FindARepo 活躍度標籤在地化為道地繁體中文
 */
export function formatActivityBadge(activity?: FindARepoActivity): string {
  if (!activity || activity.score === 0) return "🌱 成長期專案";
  if (activity.score >= 90) return `⚡ 極活躍 (${activity.score}分 · 連續${activity.streak}週)`;
  if (activity.score >= 70) return `🔥 高活躍 (${activity.score}分 · ${activity.activeWeeks}/26週)`;
  if (activity.score >= 40) return `📈 穩定維護 (${activity.score}分)`;
  return `💡 偶爾更新 (${activity.score}分)`;
}

/**
 * 將 Star 增量轉為易讀標籤
 */
export function formatVelocityBadge(starsGained?: number, windowDays?: number): string | null {
  if (!starsGained || starsGained <= 0) return null;
  const days = windowDays || 7;
  return `+${starsGained.toLocaleString()} ⭐ (${days}天暴增)`;
}
