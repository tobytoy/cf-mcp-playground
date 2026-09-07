import type { RoutingResult } from "../types/env";

export class NeedleClassifier {
  classify(prompt: string): RoutingResult {
    const trimmed = prompt.trim();

    // 1. Feature List / Help -> list_features
    if (/(功能|你會做什麼|你能做什麼|help|指令|服務項目|支援什麼|清單|目錄|說明)/i.test(trimmed)) {
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
    if (/^(待辦|代辦|todo)[:：\s]/i.test(trimmed) || /^(查看待辦|列出待辦|我的待辦|待辦事項)/i.test(trimmed)) {
      const itemText = trimmed.replace(/^(待辦|代辦|todo)[:：\s]*/i, "").trim();
      return {
        tool: "manage_todo",
        arguments: {
          action: itemText.includes("查看") || itemText.includes("列出") || !itemText ? "list" : "add",
          item: itemText
        },
        confidence: 0.95,
        reasoning: "Heuristic: Detected todo command"
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
