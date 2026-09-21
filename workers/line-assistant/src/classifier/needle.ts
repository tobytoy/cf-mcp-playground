import type { Env, RoutingResult, GeminiModel } from "../types/env";
import { ASSISTANT_TOOLS } from "./tools";

export class NeedleClassifier {
  private apiUrl?: string;
  private apiKey?: string;

  constructor(env: Env) {
    this.apiUrl = env.NEEDLE_API_URL;
    this.apiKey = env.NEEDLE_API_KEY;
  }

  /**
   * Route user intent using Needle 2 SAN model / Edge heuristics / Gemini fallback.
   */
  async classify(userPrompt: string, geminiFallbackFn?: (prompt: string) => Promise<RoutingResult>): Promise<RoutingResult> {
    const trimmed = userPrompt.trim();

    // 1. Fast Edge Heuristic Classifier (0ms, 100% precision on explicit patterns)
    const fastMatch = this.tryFastPatternMatch(trimmed);
    if (fastMatch) {
      return fastMatch;
    }

    // 2. Call Needle Service (if URL configured)
    if (this.apiUrl) {
      try {
        const needleResult = await this.callNeedleApi(trimmed);
        if (needleResult && needleResult.confidence >= 0.7) {
          return needleResult;
        }
      } catch (error) {
        console.warn("[NeedleClassifier] Needle API call failed or unavailable, falling back:", error);
      }
    }

    // 3. Fallback to Gemini AI Router (if fallback function provided)
    if (geminiFallbackFn) {
      try {
        return await geminiFallbackFn(trimmed);
      } catch (error) {
        console.error("[NeedleClassifier] Gemini fallback router error:", error);
      }
    }

    // Default safe fallback: Ask Gemini 3.5 Flash Lite
    return {
      tool: "ask_llm",
      arguments: {
        prompt: trimmed,
        target_model: "gemini-3.5-flash-lite"
      },
      confidence: 0.5,
      reasoning: "Default fallback to lightweight Gemini model"
    };
  }

  /**
   * Fast regex / keyword heuristic match for sub-millisecond dispatch.
   */
  private tryFastPatternMatch(prompt: string): RoutingResult | null {
    // 1. URL Pattern Match -> read_url
    const urlMatch = prompt.match(/https?:\/\/[^\s]+/i);
    if (urlMatch) {
      return {
        tool: "read_url",
        arguments: {
          url: urlMatch[0],
          user_prompt: prompt
        },
        confidence: 0.99,
        reasoning: "Heuristic: Detected target HTTP/HTTPS URL"
      };
    }

    // 2. Explicit Calculation Pattern Match -> calculator
    if (
      /^(計算|算一下|幫我算|math|calc|eval)[:：\s]/i.test(prompt) ||
      /^[\d\s+\-*/^().,%sqrt|sin|cos|tan|log|pi|e]+$/i.test(prompt) && /[+\-*/^]/.test(prompt)
    ) {
      const cleanExpr = prompt.replace(/^(計算|算一下|幫我算|math|calc|eval)[:：\s]*/i, "").trim();
      return {
        tool: "calculator",
        arguments: {
          expression: cleanExpr || prompt,
          explanation_needed: true
        },
        confidence: 0.98,
        reasoning: "Heuristic: Detected explicit calculation request"
      };
    }

    // 3. Todo Management Pattern Match -> manage_todo
    const trimmedPrompt = prompt.trim();

    // 3a. List Todos
    if (/^(查看待辦|列出待辦|我的待辦|待辦事項|待辦清單|代辦清單|待辦有哪些|有哪些待辦|待辦|代辦|todo)$/i.test(trimmedPrompt)) {
      return {
        tool: "manage_todo",
        arguments: { action: "list" },
        confidence: 0.98,
        reasoning: "Heuristic: Detected todo list request"
      };
    }

    // 3b. Add Todo (supports "新增待辦 ...", "幫我記待辦 ...", "待辦: ...", "提醒我 ...")
    const todoAddMatch = trimmedPrompt.match(/^(?:(?:幫我|請幫我)?(?:新增|記一下|記|記錄)?(?:待辦|代辦|todo)|(?:幫我|請幫我)?提醒我)[:：\s]*(.+)$/i);
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

    // 4. Memo Recording Pattern Match -> save_memo
    if (/^(記一下|備忘|筆記|memo|note)[:：\s]/i.test(prompt)) {
      const memoText = prompt.replace(/^(記一下|備忘|筆記|memo|note)[:：\s]*/i, "").trim();
      return {
        tool: "save_memo",
        arguments: {
          content: memoText
        },
        confidence: 0.95,
        reasoning: "Heuristic: Detected memo recording command"
      };
    }

    // 5. File Transmission Pattern Match -> send_file
    if (/(傳送檔案|傳檔案|下載|給我.*(pdf|文件|報表|圖片))/i.test(prompt)) {
      return {
        tool: "send_file",
        arguments: {
          file_id: prompt
        },
        confidence: 0.90,
        reasoning: "Heuristic: Detected file transfer request"
      };
    }

    // 6. Weather Forecast Pattern Match -> weather_forecast
    if (/(天氣|氣象|降雨|氣溫|溫度|會下雨嗎|下雨|帶傘|雷達回波|寒流|熱不熱|天母天氣|台北天氣)/i.test(prompt)) {
      return {
        tool: "weather_forecast",
        arguments: {
          location: prompt
        },
        confidence: 0.98,
        reasoning: "Heuristic: Detected weather forecast request"
      };
    }

    // 7. Real-time Search Pattern Match -> search_web
    if (/^(搜尋|查一下|查詢|即時|最新|search)/i.test(prompt) || /(即時新聞|股價|今日行情|重大新聞)/i.test(prompt)) {
      const query = prompt.replace(/^(搜尋|查一下|查詢|即時|最新|search)[:：\s]*/i, "").trim();
      return {
        tool: "search_web",
        arguments: {
          query: query || prompt,
          freshness: "day"
        },
        confidence: 0.92,
        reasoning: "Heuristic: Detected real-time search query"
      };
    }

    // 8. System Diagnostics & Error Logs Pattern Match -> view_debug
    if (/(系統日誌|查看日誌|排查|查錯誤|debug|系統診斷|看log|error log|logs)/i.test(prompt)) {
      return {
        tool: "view_debug",
        arguments: {
          type: prompt.includes("錯") || prompt.includes("error") ? "errors" : "recent"
        },
        confidence: 0.98,
        reasoning: "Heuristic: Detected diagnostic / debug logs request"
      };
    }
    // 7. Usage Statistics & History Pattern Match -> view_stats
    if (/(使用統計|使用紀錄|歷史紀錄|歷史對話|統計資訊|我用了幾次|使用次數|查詢紀錄|呼叫次數|歷史用量|用量|stats|history|usage)/i.test(prompt)) {
      return {
        tool: "view_stats",
        arguments: {
          action: prompt.includes("歷史") || prompt.includes("history") ? "history" : "summary"
        },
        confidence: 0.98,
        reasoning: "Heuristic: Detected usage statistics or history request"
      };
    }

    // 8. Transport & Nearby Context Pattern Match -> nearby_transport
    if (/(附近.*(youbike|ubike|單車|停車場|公車|捷運|交通|車站|車位)|(youbike|ubike|找停車|停車位|公車到站|查公車|查捷運|周邊交通))/i.test(prompt)) {
      return {
        tool: "nearby_transport",
        arguments: {
          location: prompt
        },
        confidence: 0.95,
        reasoning: "Heuristic: Detected transport and surroundings query"
      };
    }

    // 9a. Mistake Notebook Pattern Match -> view_mistakes / review_mistakes
    if (/(錯題本|看錯題|我的錯題|錯題紀錄|錯題統計|錯題清單|檢視錯題)/i.test(prompt)) {
      return {
        tool: "view_mistakes",
        arguments: {},
        confidence: 0.99,
        reasoning: "Heuristic: Detected mistake notebook view request"
      };
    }

    if (/(複習錯題|錯題複習|重測錯題|做錯題|錯題重測|練錯題|錯題練習)/i.test(prompt)) {
      return {
        tool: "review_mistakes",
        arguments: {},
        confidence: 0.99,
        reasoning: "Heuristic: Detected mistake notebook review request"
      };
    }

    // 9. Exam Quiz & Practice Pattern Match -> exam_quiz
    if (/(考一題|測驗|出題|考古題|做題目|練習題|刷題|國考題|考我|模擬考|下一題|quiz|exam)/i.test(prompt)) {
      return {
        tool: "exam_quiz",
        arguments: {
          subject: prompt
        },
        confidence: 0.98,
        reasoning: "Heuristic: Detected exam quiz or practice request"
      };
    }


    if (/(更新.*票價|同步.*票價|票價.*更新|最新票價)/i.test(prompt)) {
      return {
        tool: "update_rail_fares",
        arguments: {},
        confidence: 0.99,
        reasoning: "Heuristic: Detected live rail fare update request"
      };
    }
    // 9b. Scheduled Briefings on-demand commands
    if (/(早報|晨報|每日晨報|morning|晨間新聞)/i.test(prompt)) {
      return {
        tool: "briefing_morning",
        arguments: {},
        confidence: 0.99,
        reasoning: "Heuristic: Detected on-demand morning briefing request"
      };
    }

    if (/(台股|大盤|收盤|股市|股票|三大法人|台股收盤)/i.test(prompt)) {
      return {
        tool: "briefing_stock",
        arguments: {},
        confidence: 0.99,
        reasoning: "Heuristic: Detected on-demand Taiwan stock briefing request"
      };
    }

    // 9bb. GitHub Trending & FindARepo Briefings -> briefing_github
    if (/(?:推薦|找|查看|最新)?\s*(?:mcp|mcp\s*伺服器|mcp\s*工具|mcp\s*servers?)/i.test(prompt)) {
      return {
        tool: "briefing_github",
        arguments: { topic: "mcp" },
        confidence: 0.99,
        reasoning: "Heuristic: Detected MCP server recommendation request"
      };
    }

    if (/(?:推薦|找|查看|最新)?\s*(?:ai\s*agent|agent|智慧代理|自主代理)/i.test(prompt)) {
      return {
        tool: "briefing_github",
        arguments: { topic: "ai-agents" },
        confidence: 0.99,
        reasoning: "Heuristic: Detected AI Agent recommendation request"
      };
    }

    if (/(?:推薦|找|查看|最新)?\s*(?:dev\s*tools?|開發神器|開發工具)/i.test(prompt)) {
      return {
        tool: "briefing_github",
        arguments: { topic: "dev-tools" },
        confidence: 0.99,
        reasoning: "Heuristic: Detected Dev Tools recommendation request"
      };
    }

    if (/(github\s*(熱點|趨勢|熱門|專案|repo|黑馬)|開源黑馬|開源專案|熱門repo|trending)/i.test(prompt)) {
      return {
        tool: "briefing_github",
        arguments: {},
        confidence: 0.99,
        reasoning: "Heuristic: Detected on-demand GitHub trending briefing request"
      };
    }
    // 10. Complex Task Pattern Match -> complex_task (Directly to High-Tier Gemini 3.8/3.7)
    // Matches: coding, system architecture, deep technical analysis, multi-step planning, or complex long questions
    const isCodeOrArchitecture = /(程式碼|寫一個|寫一段|代碼|debug|演算法|實作|寫成|重構|架構|微服務|系統設計|分散式|高並發|資料流|uml|design pattern|tdd|ddd|api設計|code|typescript|python|golang|sql|rust)/i.test(prompt);
    const isDeepReasoning = /(深度分析|推導|詳細分析|方案比較|優缺點比較|利弊|策略規劃|技術選型|設計原則|請深入說明|原理是什麼|怎麼實現)/i.test(prompt);
    const isSubstantialQuestion = prompt.length >= 70;

    if (isCodeOrArchitecture || isDeepReasoning || isSubstantialQuestion) {
      let domain = "general";
      if (isCodeOrArchitecture) domain = "coding";
      else if (isDeepReasoning) domain = "analysis";

      return {
        tool: "complex_task",
        arguments: {
          prompt,
          domain
        },
        confidence: 0.98,
        reasoning: "Heuristic: Detected non-trivial complex task requiring high-tier Gemini 3.8/3.7 deep thinking"
      };
    }

    return null;
  }

  /**
   * Call Cactus Compute Needle REST API endpoint.
   */
  private async callNeedleApi(prompt: string): Promise<RoutingResult | null> {
    if (!this.apiUrl) return null;

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {})
      },
      body: JSON.stringify({
        prompt,
        tools: ASSISTANT_TOOLS
      })
    });

    if (!response.ok) {
      throw new Error(`Needle API responded with status ${response.status}`);
    }

    const data = (await response.json()) as {
      tool?: string;
      name?: string;
      arguments?: Record<string, unknown>;
      parameters?: Record<string, unknown>;
      confidence?: number;
      target_model?: GeminiModel;
    };

    return {
      tool: data.tool || data.name || "ask_llm",
      arguments: data.arguments || data.parameters || { prompt },
      confidence: data.confidence ?? 0.85,
      target_model: data.target_model
    };
  }
}
