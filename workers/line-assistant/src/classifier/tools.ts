import type { ToolDefinition } from "../types/env";

export const ASSISTANT_TOOLS: ToolDefinition[] = [
  {
    name: "complex_task",
    description: "處理高難度複雜任務（系統架構設計、程式碼編寫與除錯、多步驟邏輯規劃、專業利弊分析、技術推導等非簡單指令），直接分派給高級 Gemini 3.8/3.7 進行深度思考",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "使用者之複雜任務完整需求說明" },
        domain: {
          type: "string",
          enum: ["coding", "architecture", "reasoning", "analysis", "planning", "general"],
          description: "複雜任務領域"
        }
      },
      required: ["prompt"]
    }
  },
  {
    name: "update_rail_fares",
    description: "同步並更新交通部 (MOTC / TDX) 最新官方核定鐵路票價資料庫 (包含台鐵各級列車與高鐵全線票價)",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "search_web",
    description: "搜尋網際網路最新即時資訊、新聞、即時天氣、股價、賽事或事實查核",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "搜尋關鍵字或經過優化的搜尋語句" },
        freshness: { type: "string", enum: ["day", "week", "month", "year", "all"], description: "搜尋時間範圍" }
      },
      required: ["query"]
    }
  },
  {
    name: "weather_forecast",
    description: "查詢中央氣象署 (CWA) 官方即時天氣預報、今明 36 小時預報、降雨機率、最高最低溫、出門帶傘建議與雷達回波圖 (預設為台北天母)",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "查詢地區名稱，例如 '天母'、'台北'、'台中'、'高雄' (若未指定則預設天母)" }
      }
    }
  },
  {
    name: "view_debug",
    description: "查看系統運行診斷日誌、各步驟耗時毫秒數與最近錯誤排查報告",
    parameters: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["recent", "errors"], description: "查看日誌類型" }
      }
    }
  },
  {
    name: "nearby_transport",
    description: "查詢特定地點或目前位置周邊的即時交通資訊 (YouBike 2.0 借還數量、公有/私有停車場空位、公車到站、捷運與導航)",
    parameters: {
      type: "object",
      properties: {
        location: { type: "string", description: "目標地點名稱或地址，例如 '台北車站' 或 '市府轉運站'" },
        item_type: { type: "string", enum: ["all", "youbike", "parking", "bus", "metro"], description: "交通項目類型" }
      }
    }
  },
  {
    name: "exam_quiz",
    description: "進行資訊處理公職國考考古題測驗 (包含高等資料庫、資管資安、系統分析、軟體專案管理、憲法英文、國文等科目選擇題練習與互動解析)",
    parameters: {
      type: "object",
      properties: {
        subject: { type: "string", description: "指定測驗科目 (若未指定則全科目隨機出題)" }
      }
    }
  },
  {
    name: "calculator",
    description: "執行精準數學運算、百分比、代數、單位換算、開根號、複利與統計計算",
    parameters: {
      type: "object",
      properties: {
        expression: { type: "string", description: "數學表達式，例如 '1250 * (1 + 0.05)^3' 或 'sqrt(144) + 25 * 4'" },
        explanation_needed: { type: "boolean", description: "是否需要附帶計算步驟說明" }
      },
      required: ["expression"]
    }
  },
  {
    name: "read_url",
    description: "當使用者傳入網址連結 (http/https)，讀取該網頁內容並進行重點整理或問答",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "目標網頁完整 URL" },
        user_prompt: { type: "string", description: "使用者對此網頁的特定需求或問題" }
      },
      required: ["url"]
    }
  },
  {
    name: "send_file",
    description: "當使用者要求下載或傳送特定 PDF 文件、報告、圖片或圖檔時觸發",
    parameters: {
      type: "object",
      properties: {
        file_id: { type: "string", description: "檔案唯一代碼或檔案名稱，例如 'report.pdf' 或 'sample.png'" },
        file_type: { type: "string", enum: ["pdf", "image", "excel", "doc"] }
      },
      required: ["file_id"]
    }
  },
  {
    name: "manage_todo",
    description: "管理待辦事項清單（新增待辦、列出待辦、完成事項、刪除事項）",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["add", "list", "done", "delete", "clear"] },
        item: { type: "string", description: "待辦事項文字內容" },
        item_id: { type: "string", description: "待辦事項 ID (用於 done 或 delete)" }
      },
      required: ["action"]
    }
  },
  {
    name: "save_memo",
    description: "記錄個人筆記、想法、臨時資訊或重要備忘",
    parameters: {
      type: "object",
      properties: {
        content: { type: "string", description: "備忘內容" },
        tags: { type: "array", items: { type: "string" }, description: "分類標籤" }
      },
      required: ["content"]
    }
  },
  {
    name: "view_stats",
    description: "查看使用者個人使用統計資訊、各功能計次、模型調用分佈與最近歷史紀錄",
    parameters: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["summary", "history", "reset"], description: "統計查詢動作" }
      }
    }
  },
  {
    name: "view_mistakes",
    description: "查看個人國考錯題本紀錄、待複習題目數量與各科分佈",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "review_mistakes",
    description: "從個人錯題本中抽取曾答錯的題目進行專項重新測驗與攻克複習",
    parameters: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "ask_llm",
    description: "一般知識問答、邏輯推理、程式設計、語言翻譯、創意寫作或聊天",
    parameters: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "處理後的完整 Prompt" },
        target_model: {
          type: "string",
          enum: [
            "gemini-3.7-flash",
            "gemini-3.6-flash",
            "gemini-3.5-flash",
            "gemini-3.5-flash-lite",
            "gemini-3.1-flash-lite",
            "gemma-4-31b",
            "gemma-4-26b"
          ],
          description: "由意圖分類器依問題複雜度分發之目標模型"
        },
        style: { type: "string", enum: ["concise", "detailed", "code", "creative"], description: "回覆風格" }
      },
      required: ["prompt"]
    }
  }
];
