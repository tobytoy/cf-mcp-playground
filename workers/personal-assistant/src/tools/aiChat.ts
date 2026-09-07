import { formatForLineMessage } from "../utils/lineFormatter";
import { getTaiwanTimeString } from "../utils/time";
import { ModelLoadBalancer, type ModelTier, WEIGHTED_STRONG_POOL } from "./modelPool";
import type { GeminiModel } from "../types/env";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface AiResponseResult {
  text: string;
  modelUsed: string;
}

export interface ChatMessage {
  role: "user" | "model" | "system";
  text: string;
}

function cleanThinkingLeakage(text: string): string {
  let cleaned = text.trim();
  if (/^(?:[\s,.;*]*(?:friendly|smart|helpful|thinking|drafting)[^:\n]*[:\n]+|\d+\.\s*\*{0,2}Drafting)/i.test(cleaned)) {
    cleaned = cleaned.replace(/^(?:[\s,.;*]*(?:friendly|smart|helpful|thinking|drafting)[^:\n]*[:\n]+|\d+\.\s*\*{0,2}Drafting[^\n]*\n*)+/i, "");
  }
  return cleaned.trim() || text.trim();
}

export async function generateAiResponse(
  prompt: string,
  apiKey: string,
  targetModel: GeminiModel | string = "gemini-3.5-flash-lite",
  history: ChatMessage[] = [],
  style: "concise" | "detailed" | "warm" = "warm"
): Promise<AiResponseResult> {
  if (!apiKey) {
    return { text: "尚未設定 GEMINI_API_KEY，請確認環境變數。", modelUsed: "none" };
  }

  const isStrong =
    targetModel === "gemini-3.5-flash-lite" ||
    (WEIGHTED_STRONG_POOL as readonly string[]).includes(targetModel) ||
    targetModel.includes("3.8") ||
    targetModel.includes("3.7");
  const tier: ModelTier = isStrong ? "strong" : "balanced";
  const modelChain = ModelLoadBalancer.getModelChain(tier, targetModel);

  const twTime = getTaiwanTimeString();

  let systemPrompt = `你是一個貼心、溫暖、高智慧的專屬私人生活助理【HelperDog 守護犬】。
【目前時間與背景】：
• 目前標準時間：台灣時間 (UTC+8 / Asia/Taipei) — ${twTime}
• 服務對象：主要使用者個人與家庭日常生活。
• 住家/常駐地點：台灣台北市。

【回答規範與語氣風格】：
1. 一律使用自然親切、有溫度且專業的「繁體中文（台灣，zh-TW）」回答。
2. LINE 手機端不支援 Markdown 粗體，嚴禁在回覆中使用 **星號加粗**，強調重點或關鍵名稱請一律使用「」引號標註。
3. 排版請多利用 🔷【大標題】、📌【重點】 與條列符號（•），分段適度留白，適合手機快速閱讀。
4. 嚴禁在回覆中洩漏任何思考過程或內部草稿標記（如 Drafting、thinking 等），請直接給出溫暖體貼的最終答案。`;

  if (style === "concise") {
    systemPrompt += "\n5. 請簡明扼要回覆核心重點，避免冗長。";
  }

  const contents = [
    ...history.map((h) => ({
      role: h.role === "system" ? "user" : h.role,
      parts: [{ text: h.text }]
    })),
    {
      role: "user",
      parts: [{ text: prompt }]
    }
  ];

  const payload = {
    contents,
    systemInstruction: {
      parts: [{ text: systemPrompt }]
    },
    generationConfig: {
      temperature: 0.5,
      maxOutputTokens: 4096
    }
  };

  let lastError: Error | null = null;

  for (const modelId of modelChain) {
    try {
      const url = `${GEMINI_API_BASE}/models/${modelId}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[AiChat] Model ${modelId} failed (${res.status}): ${errText.slice(0, 100)}, failing over...`);
        continue;
      }

      const data = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string; thought?: boolean }> };
        }>;
      };

      const candidate = data.candidates?.[0];
      const parts = candidate?.content?.parts || [];
      let rawReply = parts
        .filter((p) => !p.thought)
        .map((p) => p.text || "")
        .join("\n")
        .trim();

      if (!rawReply) {
        rawReply = parts.map((p) => p.text || "").join("\n").trim();
      }

      if (rawReply) {
        const cleaned = formatForLineMessage(cleanThinkingLeakage(rawReply));
        return { text: cleaned, modelUsed: modelId };
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[AiChat] Error with ${modelId}:`, lastError.message);
    }
  }

  return {
    text: `AI 助理暫時無法回應，錯誤：${lastError?.message || "請稍後再試"}`,
    modelUsed: modelChain[0]
  };
}
