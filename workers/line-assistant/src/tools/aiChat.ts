import { getTaiwanTimeString } from "../utils/time";
import type { UserSavedLocation } from "./locationManager";


import type { GeminiModel } from "../types/env";
import { ModelLoadBalancer, type ModelTier, STRONG_MODEL_POOL } from "./modelPool";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface AiResponseResult {
  text: string;
  modelUsed: string;
}
export interface ChatMessage {
  role: "user" | "model" | "system";
  text: string;
}

export async function generateAiResponse(
  prompt: string,
  apiKey: string,
  targetModel: GeminiModel | string = "gemini-3.5-flash-lite",
  history: ChatMessage[] = [],
  style: "concise" | "detailed" | "code" | "creative" = "concise",
  userLocation?: UserSavedLocation
): Promise<AiResponseResult> {
  if (!apiKey) {
    return { text: "尚未設定 GEMINI_API_KEY，請確認環境變數。", modelUsed: "none" };
  }

  // Determine target tier
  const isStrong =
    STRONG_MODEL_POOL.includes(targetModel as (typeof STRONG_MODEL_POOL)[number]) ||
    targetModel.includes("3.7") ||
    targetModel.includes("3.6") ||
    targetModel.includes("pro");
  const tier: ModelTier = isStrong ? "strong" : "light";

  // Get load balanced candidate chain
  const modelChain = ModelLoadBalancer.getModelChain(tier, targetModel);

  const twTime = getTaiwanTimeString();
  const currentLocText = userLocation
    ? `${userLocation.address || userLocation.title} (經度: ${userLocation.longitude}, 緯度: ${userLocation.latitude}，定位更新於: ${userLocation.updatedAt})`
    : "台北市士林區天母忠誠路二段（天母棒球場/高島屋周邊）";

  let systemPrompt = `你是一個貼心、高效、高智慧的個人專屬 LINE 助理。
【個人化使用者資訊與時區背景】：
• 目前標準時間：台灣時間 (UTC+8 / Asia/Taipei) — ${twTime}
• 使用者目前即時定位：${currentLocText}
• 住家/常駐地點：台灣台北市士林區天母。

【位置語意智能解析】：
當使用者問句中提及「我現在位置」、「我的位置」、「從這裡」、「從這」、「我這裡」、「附近」等相對指涉時，務必自動將上述【目前即時定位】作為起點或基準點！例如問「我現在位置如何去花蓮」，請直接以該定位點規劃全旅程（如：步行/公車至台北車站 ➔ 搭乘台鐵新自強/太魯閣號前往花蓮，提供班次、轉乘建議與預估時間）。

【語言與排版規範】：
1. 務必一律使用道地的「繁體中文（台灣，zh-TW）」回答，嚴禁使用簡體中文或未翻譯英文。
2. 專業名詞與日常用語請採用台灣繁體習慣（例如：程式碼、演算法、專案、伺服器、預設、網路、介面等）。
3. 盡量以「條列式 (• 點列)」方式清晰組織重點，版面分段清楚，方便使用者在手機上快速瀏覽。
4. 語氣自然、專業、條理分明。`;
  if (style === "concise") {
    systemPrompt += "\n4. 請以簡明扼要、重點清晰的方式回覆，避免不必要的冗長客套話。";
  } else if (style === "code") {
    systemPrompt += "\n4. 請著重於程式碼品質、架構設計與除錯解析，程式碼中的註解與說明亦請一律使用繁體中文。";
  } else if (style === "detailed") {
    systemPrompt += "\n4. 請提供詳盡且深入的分析，涵蓋背景、核心細節與具體實用建議。";
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
      temperature: style === "creative" ? 0.8 : 0.4,
      maxOutputTokens: 1500
    }
  };

  let lastError: Error | null = null;

  // Try models in load-balanced chain with automatic failover
  for (const modelId of modelChain) {
    try {
      const url = `${GEMINI_API_BASE}/models/${modelId}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(18000), // 18s timeout per model
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[AiChatTool] Model ${modelId} returned ${res.status}: ${errText.slice(0, 100)}, attempting failover...`);
        continue;
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (reply) {
        return { text: reply, modelUsed: modelId };
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[AiChatTool] Error connecting to ${modelId}:`, lastError.message);
    }
  }

  return {
    text: `AI 服務暫時無法回應，已嘗試備援模型，錯誤：${lastError?.message || "未知原因"}`,
    modelUsed: modelChain[0]
  };
}
