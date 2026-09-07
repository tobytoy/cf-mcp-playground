import { getTaiwanTimeString } from "../utils/time";

const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

export interface OcrResult {
  ocrText: string;
  summary: string;
  fileId: string;
  fileUrl: string;
  success: boolean;
  error?: string;
}

/**
 * Perform Gemini Vision OCR on an image and persist to Google Drive & Google Sheet.
 */
export async function processImageOcrAndVault(
  imageBuffer: ArrayBuffer,
  mimeType: string = "image/jpeg",
  geminiApiKey: string,
  googleSheetAppUrl?: string
): Promise<OcrResult> {
  const base64Image = arrayBufferToBase64(imageBuffer);
  const now = getTaiwanTimeString();

  // 1. Gemini Vision OCR & Analysis
  let ocrText = "";
  let summary = "";

  try {
    const prompt = `你是一個精準的繁體中文 OCR 與單據分析助理。請仔細辨識這張圖片中的所有文字，並提供結構化分析：
1. 【OCR 辨識全文】：完整真實抄錄圖片中的所有繁體中文、英文、數字與關鍵代碼。
2. 【AI 智能重點摘要】：
   • 若為收據/發票/水電費單/醫療收據：請明確提取【機構名稱】、【應繳/消費總金額 NT$】、【繳費期限/交易日期】、【核心明細摘要】。
   • 若為名片/公告/筆記/文件：請簡潔條列 2~3 點核心主旨與行動要項。
請一律使用繁體中文回答，排版清晰易讀。`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Image
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

    const visionUrl = `${GEMINI_API_BASE}/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
    const res = await fetch(visionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(20000),
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      ocrText = text;
      
      // Parse summary section
      const summaryMatch = text.match(/【(?:AI\s*)?智能重點摘要】[:：\s]*([\s\S]*)/i);
      summary = summaryMatch ? summaryMatch[1].trim() : text.slice(0, 300);
    } else {
      const errText = await res.text();
      console.warn("[OcrDriveVault] Gemini Vision error:", errText);
      ocrText = `無法透過 Vision 模型辨識圖片（狀態: ${res.status}）`;
      summary = "圖片已接收但文字辨識未成。";
    }
  } catch (e) {
    console.error("[OcrDriveVault] Gemini vision processing exception:", e);
    ocrText = "圖片解析過程發生逾時或網路異常";
    summary = "辨識失敗，原檔仍會嘗試備份。";
  }

  // 2. Upload to Google Drive and append to Sheet via Google Apps Script Web App
  let fileId = `FILE-${Date.now().toString().slice(-8)}`;
  let fileUrl = "https://drive.google.com/";

  if (googleSheetAppUrl) {
    try {
      const gasPayload = {
        action: "save_ocr_file",
        fileName: `LINE_IMG_${Date.now()}.jpg`,
        fileBase64: base64Image,
        mimeType,
        ocrText,
        summary
      };

      const gasRes = await fetch(googleSheetAppUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify(gasPayload)
      });

      if (gasRes.ok) {
        const gasData = (await gasRes.json()) as {
          status: string;
          fileId?: string;
          fileUrl?: string;
        };
        if (gasData.status === "success") {
          if (gasData.fileId) fileId = gasData.fileId;
          if (gasData.fileUrl) fileUrl = gasData.fileUrl;
        }
      }
    } catch (err) {
      console.warn("[OcrDriveVault] Google Apps Script sync warning:", err);
    }
  }

  return {
    ocrText,
    summary,
    fileId,
    fileUrl,
    success: true
  };
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
