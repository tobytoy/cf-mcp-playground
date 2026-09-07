const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface DialogueItem {
  speaker: string;
  timestamp?: string;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  success: boolean;
  dialogue?: DialogueItem[];
  summary?: string;
  actionItems?: string[];
  error?: string;
}

export async function transcribeAudio(
  audioBuffer: ArrayBuffer,
  apiKey: string,
  mimeType: string = "audio/m4a",
  speakerDiarization: boolean = true
): Promise<TranscriptionResult> {
  if (!apiKey) {
    return { text: "", success: false, error: "未設定 GEMINI_API_KEY" };
  }

  try {
    const base64Audio = arrayBufferToBase64(audioBuffer);

    const prompt = speakerDiarization
      ? `請將此錄音轉寫為精準的繁體中文（台灣，zh-TW）逐字稿。
請務必進行說話者辨識 (Speaker Diarization)，區分發言者：
1. 每一段對話請標明：【說話者 A】、【說話者 B】（或已知說話者），並附帶對話時間點（如 00:05）。
2. 在文末整理【🎯 核心主旨摘要】與【📌 具體待辦事項】。
請排版整齊，適合直接閱讀。`
      : `請將此錄音清晰轉寫為繁體中文（台灣，zh-TW）文字內容，並修飾語氣與錯別字。`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Audio
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048
      }
    };

    const url = `${GEMINI_API_BASE}/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.text();
      return { text: "", success: false, error: `Gemini API 失敗 (${res.status}): ${err.slice(0, 100)}` };
    }

    const data = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };

    const fullText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse dialogue bubbles if diarization requested
    const dialogue: DialogueItem[] = [];
    const lines = fullText.split("\n");
    for (const line of lines) {
      const match = line.match(/^【(說話者\s*[^】]+)】[:：\s]*(.*)/i);
      if (match) {
        dialogue.push({
          speaker: match[1],
          text: match[2].trim()
        });
      }
    }

    return {
      text: fullText,
      success: true,
      dialogue: dialogue.length > 0 ? dialogue : undefined
    };
  } catch (err) {
    return {
      text: "",
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
