import { generateAiResponse } from "./aiChat";

export interface SearchResultItem {
  title: string;
  url: string;
  content: string;
}

export interface SearchResponse {
  query: string;
  summary: string;
  results: SearchResultItem[];
}

export async function executeTavilySearch(
  query: string,
  apiKey?: string,
  geminiApiKey?: string,
  summaryPrompt?: string
): Promise<SearchResponse> {
  if (apiKey) {
    try {
      const res = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          api_key: apiKey,
          query,
          search_depth: "basic",
          include_answer: false,
          max_results: 6
        })
      });

      if (res.ok) {
        const data = (await res.json()) as {
          answer?: string;
          results?: Array<{ title: string; url: string; content: string }>;
        };

        const results = (data.results || []).map((r) => ({
          title: r.title,
          url: r.url,
          content: r.content
        }));

        // 拼原始素材：僅取各條搜尋結果標題與摘要（純繁體中文）
        const rawMaterial = results
          .map((r) => `${r.title}: ${r.content.slice(0, 250)}`)
          .filter(Boolean)
          .join("\n");

        // 預設 fallback：若 AI 生成失敗，直接呈現繁中新聞標題條列，絕對不回傳英文
        let summary = results
          .slice(0, 3)
          .map((r) => `• ${r.title}`)
          .join("\n");

        if (geminiApiKey && rawMaterial) {
          const systemPrompt =
            "你是一位專業的繁體中文新聞主編。請根據提供的搜尋新聞素材，嚴格使用道地的繁體中文（台灣，zh-TW）精煉摘要，排版簡明俐落，適合手機閱讀。嚴禁任何開場白、問候語、結語廢話或思考標記，直接輸出排版內容。";

          const prompt = summaryPrompt
            ? `${summaryPrompt}\n\n內容來源：\n\n${rawMaterial}`
            : `以下是今日重點新聞搜尋素材，請以繁體中文整理成三個板塊，格式如下（嚴格遵守，不要加其他說明、標記或開場白）：\n\n📰 時事\n• （3 條台灣或國際重要時事，每條 25～40 字）\n\n💻 科技\n• （3 條科技／AI 新聞，每條 25～40 字）\n\n📈 財經\n• （3 條股市／財經新聞，每條 25～40 字）\n\n若素材某板塊資料不足，可適當精要延伸補充，但每板塊至少 3 條。\n\n內容來源：\n\n${rawMaterial}`;

          const aiResult = await generateAiResponse(
            prompt,
            geminiApiKey,
            "gemini-3.5-flash-lite",
            [],
            "concise",
            systemPrompt
          );
          if (aiResult.text && !aiResult.text.startsWith("尚未設定") && !aiResult.text.startsWith("AI 助理")) {
            summary = aiResult.text.trim();
          }
        }

        return { query, summary, results };
      }
    } catch {
      // Fallback below
    }
  }

  return {
    query,
    summary: `已為您搜尋關於「${query}」之最新生活與網路資訊。`,
    results: [
      {
        title: `${query} — 即時資訊彙整`,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`,
        content: `最新生活與網路情報摘要...`
      }
    ]
  };
}
