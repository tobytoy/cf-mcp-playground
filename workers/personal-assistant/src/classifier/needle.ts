import type { RoutingResult } from "../types/env";

export class NeedleClassifier {
  classify(prompt: string): RoutingResult {
    const trimmed = prompt.trim();

    // 0. Interactive Dashboard Card -> dashboard
    if (/^(選單|menu|卡片|快捷|控制台|開始|主選單|首頁|哈囉|hi|hello|你好|您好)$/i.test(trimmed) || /(快捷鍵|快捷功能|操作卡片)/i.test(trimmed)) {
      return {
        tool: "dashboard",
        arguments: {},
        confidence: 0.99,
        reasoning: "Heuristic: Detected interactive dashboard menu request"
      };
    }
    // 1. Promo Projects / Recommendations -> promo_projects
    if (/(精選專案|推薦專案|專案推薦|宣傳|精選服務|作品推薦|熱門專案|拍照單據|拍照記帳)/i.test(trimmed)) {
      return {
        tool: "promo_projects",
        arguments: {},
        confidence: 0.99,
        reasoning: "Heuristic: Detected promo projects inquiry"
      };
    }

    // 1b. OCR Inquiry -> ocr_vault
    if (/(照片辨識|ocr|發票功能|收據功能)/i.test(trimmed)) {
      return {
        tool: "ocr_vault",
        arguments: {},
        confidence: 0.99,
        reasoning: "Heuristic: Detected OCR inquiry"
      };
    }


    // 1. Feature List / Help -> list_features
    if (!/(待辦|代辦)/.test(trimmed) && /(功能|你會做什麼|你能做什麼|help|指令|服務項目|支援什麼|^清單$|功能清單|目錄|說明)/i.test(trimmed)) {
      return {
        tool: "list_features",
        arguments: {},
        confidence: 0.99,
        reasoning: "Heuristic: Detected feature list or help query"
      };
    }

    // 2. Discord Log Toggle -> discord_toggle
    if (/(開啟\s*discord|啟用\s*discord|打開\s*discord|關閉\s*discord|停用\s*discord)/i.test(trimmed)) {
      const isEnable = /(開啟|啟用|打開)/i.test(trimmed);
      return {
        tool: "discord_toggle",
        arguments: { enable: isEnable },
        confidence: 0.99,
        reasoning: "Heuristic: Detected discord logging toggle command"
      };
    }

    // 3. Calculator -> calculator
    if (
      /^(計算|算一下|幫我算|math|calc)[:：\s]/i.test(trimmed) ||
      (/^[\d\s+\-*/^().,%]+$/i.test(trimmed) && /[+\-*/^]/.test(trimmed))
    ) {
      const cleanExpr = trimmed.replace(/^(計算|算一下|幫我算|math|calc)[:：\s]*/i, "").trim();
      return {
        tool: "calculator",
        arguments: { expression: cleanExpr || trimmed },
        confidence: 0.98,
        reasoning: "Heuristic: Detected calculation request"
      };
    }

    // 4. Todo Management -> manage_todo
    if (/^(查看待辦|列出待辦|我的待辦|待辦事項|待辦清單|代辦清單|待辦有哪些|有哪些待辦|待辦|代辦|todo)$/i.test(trimmed)) {
      return {
        tool: "manage_todo",
        arguments: { action: "list" },
        confidence: 0.98,
        reasoning: "Heuristic: Detected todo list request"
      };
    }
    // 4b. Complete Todo (supports "完成 1", "完成待辦 1", "完成：買鮮奶", "做完 2", "搞定 1", "done 1", "check 1")
    const todoCompleteMatch = trimmed.match(
      /^(?:(?:幫我|請幫我)?(?:標記|設為)?(?:已完成|完成|做完|搞定|done|check)(?:待辦|代辦|事項)?|(?:完成|做完|搞定|done|check))[:：\s]*(.+)$/i
    );
    if (todoCompleteMatch) {
      const itemIdentifier = todoCompleteMatch[1].trim();
      return {
        tool: "manage_todo",
        arguments: {
          action: "complete",
          item: itemIdentifier
        },
        confidence: 0.98,
        reasoning: "Heuristic: Detected natural language todo complete request"
      };
    }

    // 4c. Add Todo (supports "新增待辦 ...", "待辦：...", "提醒我 ...")
    const todoAddMatch = trimmed.match(/^(?:(?:幫我|請幫我)?(?:新增|記一下|記|記錄)?(?:待辦|代辦|todo)|(?:幫我|請幫我)?提醒我)[:：\s]*(.+)$/i);
    if (todoAddMatch) {
      const itemText = todoAddMatch[1].trim();
      if (["清單", "事項", "有哪些", "列表", "查看", "列出"].includes(itemText)) {
        return {
          tool: "manage_todo",
          arguments: { action: "list" },
          confidence: 0.98,
          reasoning: "Heuristic: Detected todo list request"
        };
      }
      return {
        tool: "manage_todo",
        arguments: {
          action: "add",
          item: itemText
        },
        confidence: 0.98,
        reasoning: "Heuristic: Detected natural language todo add request"
      };
    }

    // 5. Weather Forecast -> weather_forecast
    if (/(天氣|氣象|會下雨嗎|下雨|帶傘|降雨機率|氣溫|溫度|熱不熱|天母天氣|台北天氣)/i.test(trimmed)) {
      return {
        tool: "weather_forecast",
        arguments: { location: trimmed },
        confidence: 0.98,
        reasoning: "Heuristic: Detected weather forecast request"
      };
    }

    // 5b. Stock & Morning Briefings
    if (/(台股|大盤|股市|收盤|股票)/i.test(trimmed)) {
      return {
        tool: "briefing_stock",
        arguments: {},
        confidence: 0.99,
        reasoning: "Heuristic: Detected Taiwan stock briefing request"
      };
    }

    if (/(美股|早報|晨報|每日晨報)/i.test(trimmed)) {
      return {
        tool: "briefing_morning",
        arguments: {},
        confidence: 0.99,
        reasoning: "Heuristic: Detected morning briefing request"
      };
    }

    // 6. Transport & YouBike -> nearby_transport
    if (/(youbike|ubike|單車|找停車|停車位|公車|捷運|周邊交通|附近交通)/i.test(trimmed)) {
      return {
        tool: "nearby_transport",
        arguments: { location: trimmed },
        confidence: 0.95,
        reasoning: "Heuristic: Detected transport request"
      };
    }

    // 7. Search -> search_web
    if (/^(搜尋|查一下|查詢|即時|最新|search)[:：\s]/i.test(trimmed)) {
      const query = trimmed.replace(/^(搜尋|查一下|查詢|即時|最新|search)[:：\s]*/i, "").trim();
      return {
        tool: "search_web",
        arguments: { query: query || trimmed },
        confidence: 0.92,
        reasoning: "Heuristic: Detected web search request"
      };
    }

    // Default: General AI Chat
    return {
      tool: "ask_llm",
      arguments: { prompt: trimmed },
      confidence: 0.8,
      reasoning: "Default conversational query"
    };
  }
}
