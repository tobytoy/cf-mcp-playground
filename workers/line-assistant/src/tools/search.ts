import { formatForLineMessage } from "../utils/lineFormatter";

import { getTaiwanTimeString } from "../utils/time";

import { ModelLoadBalancer } from "./modelPool";

export interface SearchResultItem {
  title: string;
  url: string;
  content: string;
  score?: number;
}

export interface SearchResponse {
  query: string;
  answer?: string;
  results: SearchResultItem[];
  summary: string;
}

export async function executeTavilySearch(
  query: string,
  apiKey: string,
  geminiKey?: string
): Promise<SearchResponse> {
  if (!apiKey) {
    return {
      query,
      results: [],
      summary: "未設定 TAVILY_API_KEY，無法執行即時聯網搜尋。"
    };
  }

  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(8000), // 8s timeout
      body: JSON.stringify({
        api_key: apiKey,
        query,
        include_answer: true,
        max_results: 8,
        search_depth: "basic"
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Tavily search API failed (${res.status}): ${err}`);
    }

    const data = (await res.json()) as {
      answer?: string;
      results?: Array<{ title: string; url: string; content: string; score: number }>;
    };

    const results: SearchResultItem[] = (data.results || []).map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score
    }));
    let finalSummary = "";

    // Always synthesize with Gemini in Traditional Chinese + Bullet points if key available
    if (geminiKey && (results.length > 0 || data.answer)) {
      finalSummary = await synthesizeWithGemini(query, results, data.answer, geminiKey);
    }

    if (!finalSummary) {
      if (results.length > 0) {
        finalSummary = results.map((r, i) => `• [${r.title}]\n  ${r.content}`).join("\n\n");
      } else if (data.answer) {
        finalSummary = data.answer;
      } else {
        finalSummary = "未找到符合的即時搜尋結果。";
      }
    }

    return {
      query,
      answer: data.answer,
      results,
      summary: finalSummary
    };
  } catch (error) {
    console.error("[SearchTool] Error during Tavily search:", error);
    return {
      query,
      results: [],
      summary: `搜尋時發生錯誤: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

async function synthesizeWithGemini(
  query: string,
  results: SearchResultItem[],
  rawAnswer: string | undefined,
  geminiKey: string
): Promise<string> {
  try {
    const contextParts = results.map((r, i) => `[來源 ${i + 1}: ${r.title}]\n${r.content}`);
    if (rawAnswer) {
      contextParts.unshift(`[初步搜尋摘要]\n${rawAnswer}`);
    }
    const context = contextParts.join("\n\n");

    // ── STAGE 1: Use Gemma 4 31B to digest and organize raw search sources ──
    let gemmaOrganizedNotes = "";
    try {
      const gemmaPrompt = `你是一個專業的資訊整理與萃取專家。請研讀以下多方搜尋結果，將散亂資訊統整為條理分明的繁體中文結構化事實筆記：

【原始搜尋資料】：
${context}

【整理任務規範】：
1. 去除重複內容、行銷雜訊與廣告資訊。
2. 萃取核心關鍵事實、具體數字數據、確切時間點與最新動態。
3. 整理為條列清晰的客觀事實筆記。`;

      const gemmaRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key=${geminiKey}`,
        {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000), // 10s timeout for Gemma
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: gemmaPrompt }] }]
        })
        }
      );

      if (gemmaRes.ok) {
        const gemmaData = (await gemmaRes.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        gemmaOrganizedNotes = gemmaData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "";
      }
    } catch (gemmaErr) {
      console.warn("[SearchTool] Gemma preprocessing failed, falling back to raw context:", gemmaErr);
    }

    // ── STAGE 2: Gemini Balanced Model Pool for Final Output Synthesis ──
    const finalInputContext = gemmaOrganizedNotes
      ? `【經 Gemma 4 31B 萃取統整之精確事實筆記】：\n${gemmaOrganizedNotes}`
      : `【原始搜尋資料】：\n${context}`;
    const twTime = getTaiwanTimeString();

    const finalGeminiPrompt = `使用者搜尋問題: "${query}"
當前基準時間：台灣時間 (UTC+8) ${twTime}
使用者常駐生活圈：台北市士林區天母

${finalInputContext}

【核心指令與排版規範】：
1. 務必一律使用道地的「繁體中文（台灣，zh-TW）」回答，嚴禁使用簡體中文或直接貼出未翻譯的英文。
2. 盡量以「條列式 (• 點列)」清晰整理重點，讓使用者在手機上一目了然。
3. 若搜尋結果涉及最新時間（如今天、近期日期、最新數據），請明確以台灣時間 (UTC+8) 標註。
4. 結構請包含：
   • 📌 核心速覽 (1~2 句話重點)
   • 🔍 重點整理 (3~5 點，條列清晰說明)
   • 💡 結論或建議 (1 句話)`;

    // Balanced Pool alternates evenly across Strong and Light Gemini models
    const chain = ModelLoadBalancer.getModelChain("balanced");
    for (const modelId of chain) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiKey}`,
          {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(14000), // 14s timeout per Gemini candidate
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: finalGeminiPrompt }] }]
          })
          }
        );

        if (res.ok) {
          const data = (await res.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const ans = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (ans) return formatForLineMessage(ans);
        }
      } catch (err) {
        console.warn(`[SearchTool] Synthesis failed on ${modelId}:`, err);
      }
    }
  } catch (e) {
    console.warn("[SearchTool] Gemini synthesis failed, using raw results:", e);
  }
  return "";
}
