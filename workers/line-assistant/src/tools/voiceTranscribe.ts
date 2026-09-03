const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

/**
 * Transcribe LINE voice message audio buffer into Traditional Chinese text using Gemini Multimodal API.
 */
export async function transcribeLineAudio(
  audioBuffer: ArrayBuffer,
  apiKey: string,
  mimeType: string = "audio/mp4"
): Promise<{ text: string; success: boolean; error?: string }> {
  if (!apiKey) {
    return { text: "", success: false, error: "未設定 GEMINI_API_KEY" };
  }

  if (audioBuffer.byteLength === 0) {
    return { text: "", success: false, error: "音訊檔案為空" };
  }

  // Convert binary buffer to base64
  let binary = "";
  const bytes = new Uint8Array(audioBuffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64Audio = btoa(binary);

  const prompt = `請將這段語音錄音精準轉錄為台灣道地的「繁體中文（zh-TW）」。
【轉錄規範】：
1. 請嚴格只輸出語音所表達的文字內容，嚴禁添加任何多餘的客套話、解釋、問候或引號。
2. 標點符號與數字請依台灣口語習慣自然書寫。
3. 若錄音為靜音、雜訊或完全無法辨識人聲，請回傳『（未能辨識語音）』。`;

  const payload = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType,
              data: base64Audio
            }
          },
          {
            text: prompt
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 300
    }
  };

  // Candidate models for fast audio transcription
  const audioModels = ["gemini-2.5-flash", "gemini-3.5-flash", "gemini-3.7-flash"];

  for (const modelId of audioModels) {
    try {
      const url = `${GEMINI_API_BASE}/models/${modelId}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(12000), // 12s timeout
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errText = await res.text();
        console.warn(`[VoiceTranscribe] Model ${modelId} failed (${res.status}): ${errText.slice(0, 80)}`);
        continue;
      }

      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };

      const transcribed = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (transcribed && transcribed !== "（未能辨識語音）") {
        return { text: transcribed, success: true };
      }
    } catch (err) {
      console.warn(`[VoiceTranscribe] Error with ${modelId}:`, err);
    }
  }

  return {
    text: "（未能清晰辨識錄音內容）",
    success: false,
    error: "所有音訊辨識模型皆無法解析該錄音"
  };
}
