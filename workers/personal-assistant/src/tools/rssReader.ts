/**
 * RSS Reader & MOTC Intelligence Hub Tool for LINE Personal Assistant.
 * Connects to the MOTC multi-source RSS feed and points to the Web PWA reader at:
 * https://motc-mini-dog.pages.dev/rss
 */

export const RSS_WEB_URL = "https://motc-mini-dog.pages.dev/rss";
export const RSS_FEED_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1tRR99FgelTT6xIi6xtUNsKe_My2l3Ral2c_jLmxI4Jo/export?format=csv";

export interface RssArticle {
  id: string;
  source: string;
  sourceIcon: string;
  sourceColor: string;
  pubDate: string;
  rawDate: string;
  timeAgo: string;
  title: string;
  link: string;
  category: string;
  domain: string;
}

export interface RssFeedResult {
  articles: RssArticle[];
  totalArticles: number;
  sources: { name: string; icon: string; count: number }[];
  webUrl: string;
  filterQuery?: string;
  filterCategory?: string;
  success: boolean;
  error?: string;
}

export const SOURCE_META: Record<string, { icon: string; color: string }> = {
  科技新報: { icon: "⚡", color: "#059669" },
  iThome: { icon: "🛡️", color: "#D97706" },
  自由時報: { icon: "🗞️", color: "#2563EB" },
  "Google 新聞": { icon: "🌐", color: "#DC2626" },
  "經理人 Manager Today": { icon: "💼", color: "#7C3AED" }
};

const DEFAULT_SOURCE_META = { icon: "📰", color: "#4F46E5" };

/**
 * Automatically detect topic category from title and source.
 */
export function detectArticleCategory(title: string): string {
  const lower = title.toLowerCase();
  if (/ai|gpt|llm|模型|算力|晶片|半導體|輝達|nvidia|openai|claude|智慧/i.test(lower)) {
    return "🤖 人工智慧";
  }
  if (/資安|漏洞|駭客|勒索|攻擊|防護|密碼|木馬|詐騙|釣魚/i.test(lower)) {
    return "🛡️ 資訊安全";
  }
  if (/交通|高鐵|台鐵|捷運|公車|客運|航運|航空|機場|公路|國道|道安|事故/i.test(lower)) {
    return "🚦 交通道安";
  }
  if (/通膨|升息|降息|股市|美股|台股|大盤|匯率|基金|財經|營收|獲利|經濟|債券|金價|大摩|國巨/i.test(lower)) {
    return "📈 財經總經";
  }
  if (/烏克蘭|中東|以巴|美國|中國|俄羅斯|歐盟|白宮|川普|拜登|聯合國/i.test(lower)) {
    return "🌍 國際情勢";
  }
  if (/職場|管理|領導|面試|工作|履歷|薪資|人才|專案/i.test(lower)) {
    return "💼 職場管理";
  }
  return "⚡ 科技新知";
}

/**
 * Format relative timestamp in Traditional Chinese.
 */
export function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  if (isNaN(diffMs) || diffMs < 0) return "剛剛";
  const minutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "剛剛";
  if (minutes < 60) return `${minutes} 分鐘前`;
  if (hours < 24) return `${hours} 小時前`;
  if (days === 1) return "昨天";
  if (days < 7) return `${days} 天前`;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function getCleanDomain(urlStr: string): string {
  try {
    return new URL(urlStr).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}
/**
 * Safe CSV row parser supporting quoted strings and commas.
 */
export function parseCsvLines(csvText: string): string[][] {
  const rows: string[][] = [];
  const lines = csvText.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim()) continue;
    const row: string[] = [];
    let inQuotes = false;
    let currentVal = "";

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          currentVal += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        row.push(currentVal.trim());
        currentVal = "";
      } else {
        currentVal += char;
      }
    }
    row.push(currentVal.trim());
    if (row.length >= 3) {
      rows.push(row);
    }
  }

  return rows;
}

// In-memory cache for edge worker
let cachedArticles: RssArticle[] = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Fetch and parse all articles from the Google Sheet CSV feed.
 */
export async function fetchAllRssArticles(bypassCache = false): Promise<RssArticle[]> {
  const now = Date.now();
  if (!bypassCache && cachedArticles.length > 0 && now - cacheTimestamp < CACHE_TTL_MS) {
    return cachedArticles;
  }

  try {
    const res = await fetch(RSS_FEED_CSV_URL, {
      headers: {
        Accept: "text/csv, text/plain",
        "User-Agent": "MOTC-PersonalAssistant-Worker/1.0"
      }
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch RSS CSV feed (${res.status})`);
    }

    const csvText = await res.text();
    const rows = parseCsvLines(csvText);

    if (rows.length <= 1) {
      return cachedArticles;
    }

    // Find column indexes from header
    const header = rows[0];
    const sourceIdx = header.indexOf("來源") >= 0 ? header.indexOf("來源") : 0;
    const timeIdx = header.indexOf("發布時間") >= 0 ? header.indexOf("發布時間") : 1;
    const titleIdx = header.indexOf("標題") >= 0 ? header.indexOf("標題") : 2;
    const linkIdx = header.indexOf("連結") >= 0 ? header.indexOf("連結") : 3;

    const parsedArticles: RssArticle[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const source = (row[sourceIdx] || "MOTC 即時情報").trim();
      const rawDate = (row[timeIdx] || "").trim();
      const title = (row[titleIdx] || "").trim();
      const link = (row[linkIdx] || "").trim();

      if (!title || !link) continue;

      const dateObj = rawDate ? new Date(rawDate) : new Date();
      const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;
      const meta = SOURCE_META[source] || DEFAULT_SOURCE_META;

      parsedArticles.push({
        id: `art_${i}_${validDate.getTime()}`,
        source,
        sourceIcon: meta.icon,
        sourceColor: meta.color,
        pubDate: validDate.toISOString(),
        rawDate,
        timeAgo: formatRelativeTime(validDate),
        title,
        link,
        category: detectArticleCategory(title),
        domain: getCleanDomain(link)
      });
    }

    // Sort by publication time descending (newest first)
    parsedArticles.sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

    if (parsedArticles.length > 0) {
      cachedArticles = parsedArticles;
      cacheTimestamp = now;
    }

    return parsedArticles;
  } catch (err) {
    console.error("[RssReader] Error fetching RSS articles:", err);
    if (cachedArticles.length > 0) return cachedArticles;
    return getFallbackArticles();
  }
}

/**
 * Filter and retrieve articles based on query or category.
 */
export async function getRssFeed(options: {
  query?: string;
  category?: string;
  source?: string;
  limit?: number;
} = {}): Promise<RssFeedResult> {
  const allArticles = await fetchAllRssArticles();
  const limit = options.limit || 5;

  let filtered = [...allArticles];

  // 1. Filter by category
  if (options.category && options.category !== "ALL") {
    const catLower = options.category.toLowerCase();
    filtered = filtered.filter((a) => a.category.toLowerCase().includes(catLower));
  }

  // 2. Filter by search query
  if (options.query && options.query.trim()) {
    const q = options.query.toLowerCase().trim();
    filtered = filtered.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.domain.toLowerCase().includes(q)
    );
  }

  // 3. Filter by source
  if (options.source && options.source !== "ALL") {
    filtered = filtered.filter((a) => a.source.includes(options.source!));
  }

  // Source summary count
  const sourceCountMap = new Map<string, number>();
  for (const art of allArticles) {
    sourceCountMap.set(art.source, (sourceCountMap.get(art.source) || 0) + 1);
  }

  const sources = Array.from(sourceCountMap.entries()).map(([name, count]) => ({
    name,
    icon: (SOURCE_META[name] || DEFAULT_SOURCE_META).icon,
    count
  }));

  return {
    articles: filtered.slice(0, limit),
    totalArticles: allArticles.length,
    sources,
    webUrl: RSS_WEB_URL,
    filterQuery: options.query,
    filterCategory: options.category,
    success: true
  };
}

/**
 * Safe fallback articles in case external feed is unreachable.
 */
function getFallbackArticles(): RssArticle[] {
  return [
    {
      id: "fallback_1",
      source: "科技新報",
      sourceIcon: "⚡",
      sourceColor: "#059669",
      pubDate: new Date().toISOString(),
      rawDate: new Date().toUTCString(),
      timeAgo: "剛剛",
      title: "MOTC 即時情報站上線：整合科技、資安與交通多源情報",
      link: RSS_WEB_URL,
      category: "⚡ 科技新知",
      domain: "motc-mini-dog.pages.dev"
    },
    {
      id: "fallback_2",
      source: "iThome",
      sourceIcon: "🛡️",
      sourceColor: "#D97706",
      pubDate: new Date(Date.now() - 3600000).toISOString(),
      rawDate: new Date(Date.now() - 3600000).toUTCString(),
      timeAgo: "1 小時前",
      title: "交通部推動邊緣運算與開放資料，提升大眾運輸即時智慧化",
      link: RSS_WEB_URL,
      category: "🛡️ 資訊安全",
      domain: "motc-mini-dog.pages.dev"
    }
  ];
}
