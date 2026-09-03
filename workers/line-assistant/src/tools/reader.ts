import { ModelLoadBalancer } from "./modelPool";

export interface UrlSummaryResponse {
  url: string;
  title?: string;
  summary: string;
  success: boolean;
  error?: string;
}

/**
 * Fetch and extract clean article markdown via Jina Reader API, then summarize with Gemini.
 */
export async function summarizeUrl(
  targetUrl: string,
  geminiKey: string,
  userPrompt?: string
): Promise<UrlSummaryResponse> {
  if (!targetUrl) {
    return {
      url: targetUrl,
      summary: "未提供有效的網址。",
      success: false
    };
  }

  try {
    // 1. Fetch clean markdown from Jina Reader
    const jinaEndpoint = `https://r.jina.ai/${encodeURI(targetUrl)}`;
    const jinaRes = await fetch(jinaEndpoint, {
      headers: {
        Accept: "text/plain",
        "X-No-Cache": "true"
      }
    });

    if (!jinaRes.ok) {
      throw new Error(`Jina Reader failed to fetch URL (${jinaRes.status})`);
    }

    const rawMarkdown = await jinaRes.text();
    const truncatedMarkdown = rawMarkdown.slice(0, 15000); // Guard memory limit

    // 2. Summarize content with Gemini
    const prompt = `目標網址: ${targetUrl}
使用者額外需求: ${userPrompt || "請整理這篇網頁的核心重點與結論"}

以下為網頁內文 Markdown:
---
${truncatedMarkdown}
---

【語言規範】：請務必一律使用道地的「繁體中文（台灣，zh-TW）」回覆，嚴禁簡體中文。
請依據上述內容提供：
1. 📌 文章標題與主題概要 (1 句話)
2. 💡 核心重點整理 (3~5 點，條列式清晰呈現)
3. 🎯 實用結論或行動建議`;

    const chain = ModelLoadBalancer.getModelChain("strong");
    let summary = "";

    for (const modelId of chain) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: prompt }] }]
            })
          }
        );

        if (geminiRes.ok) {
          const data = (await geminiRes.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
          };
          const resText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
          if (resText) {
            summary = resText;
            break;
          }
        }
      } catch (e) {
        console.warn(`[UrlReader] Summary failed on ${modelId}:`, e);
      }
    }

    if (!summary) {
      summary = "未能產生摘要。";
    }

    return {
      url: targetUrl,
      summary,
      success: true
    };
  } catch (error) {
    console.error("[UrlReader] Error summarizing URL:", error);
    return {
      url: targetUrl,
      summary: `讀取網頁失敗: ${error instanceof Error ? error.message : String(error)}`,
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
