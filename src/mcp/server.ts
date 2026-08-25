import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { MCP_KNOWLEDGE_BASE, searchTopics, findTopicById } from "../knowledge/mcp-data.js";
import { CacheService, createCacheService } from "../services/cache.js";
import { TDXClient } from "../services/tdx/client.js";
import { evaluateTransportContext } from "../services/context/evaluator.js";
import { planContextualRoute } from "../services/context/router.js";
import { buildCacheKey } from "../utils/hash.js";
import type { AppEnv } from "../types/env.js";
import type { TransportIdentity, TransportState } from "../types/context.js";

// Maps the `client` enum value → keyword to match in the quickstart section heading
const CLIENT_SECTION: Record<string, string> = {
  "claude-desktop": "Claude Desktop",
  "cursor": "Cursor",
  "docker": "Docker",
  "cloudflare": "Cloudflare",
};

function extractClientSection(content: string, client: string): string {
  if (client === "all" || !(client in CLIENT_SECTION)) return content;
  const keyword = CLIENT_SECTION[client];
  const sections = content.split(/\n(?=####)/);
  const match = sections.find((s) => s.includes(keyword));
  return match?.trim() || content;
}

export function createMCPServer(options?: { cacheService?: CacheService; env?: AppEnv }): Server {
  const cache = options?.cacheService ?? createCacheService(options?.env);
  const tdxClient = new TDXClient(
    {
      clientId: options?.env?.TDX_CLIENT_ID,
      clientSecret: options?.env?.TDX_CLIENT_SECRET,
      apiBaseUrl: options?.env?.TDX_BASE_URL,
    },
    cache
  );

  const server = new Server(
    { name: "cf-transport-context-mcp", version: "2.0.0" },
    { capabilities: { tools: {}, resources: {}, prompts: {} } }
  );

  // ── Tools List ────────────────────────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      // 🌟 [HIGH-LEVEL] 1. Transport Context Evaluator
      {
        name: "get_transport_context",
        description:
          "【高階情境感知】依使用者身分(汽車/電動車/機車/單車/大眾運輸)、狀態(漫遊/趕時間/通勤/雨天)與GPS座標，自動並行擷取周邊停車場、YouBike、路況事件與天候，評估整體情境並產出行動建議與風險警示。",
        inputSchema: {
          type: "object",
          properties: {
            identity: {
              type: "string",
              enum: ["car", "ev", "scooter", "bike", "transit", "pedestrian"],
              description: "使用者目前交通身分 (汽車: car, 電動車: ev, 機車: scooter, 單車: bike, 大眾運輸: transit, 步行: pedestrian)",
            },
            state: {
              type: "string",
              enum: ["cruising", "urgent", "commute_in", "commute_out", "transit_transfer", "rain_fallback"],
              description: "使用者當前狀態與意圖 (無目的地漫遊: cruising, 趕時間: urgent, 通勤上班: commute_in, 下班返家: commute_out, 轉乘: transit_transfer, 雨天備案: rain_fallback)",
            },
            latitude: { type: "number", description: "目前緯度 (WGS84 座標，例如 25.0339)" },
            longitude: { type: "number", description: "目前經度 (WGS84 座標，例如 121.5644)" },
            location_name: { type: "string", description: "地標或行政區名稱 (選填，如 '台北101', '市政府')" },
            radius_meters: { type: "number", default: 800, description: "搜尋半徑公尺數 (預設 800m)" },
          },
          required: ["identity", "state", "latitude", "longitude"],
        },
      },

      // 🌟 [HIGH-LEVEL] 2. Contextual Route & Journey Planner
      {
        name: "plan_contextual_route",
        description:
          "【高階情境路徑規劃】提供具備即時交通感知之全旅程策略。結合起訖點、身分、沿途施工/事故避讓、終點停車位/快充/YouBike還車站點即時預警與大眾運輸備選方案。",
        inputSchema: {
          type: "object",
          properties: {
            origin: {
              type: "object",
              properties: {
                latitude: { type: "number", description: "出發地緯度" },
                longitude: { type: "number", description: "出發地經度" },
                name: { type: "string", description: "出發地名稱" },
              },
              required: ["latitude", "longitude"],
            },
            destination: {
              type: "object",
              properties: {
                latitude: { type: "number", description: "目的地緯度" },
                longitude: { type: "number", description: "目的地經度" },
                name: { type: "string", description: "目的地名稱" },
              },
              required: ["latitude", "longitude"],
            },
            identity: {
              type: "string",
              enum: ["car", "ev", "scooter", "bike", "transit", "multimodal"],
              description: "交通工具類別",
            },
            urgency: {
              type: "string",
              enum: ["normal", "high", "relaxed"],
              default: "normal",
              description: "急迫度：normal (一般), high (趕時間), relaxed (輕鬆漫遊)",
            },
            preferences: {
              type: "object",
              properties: {
                prefer_indoor_parking: { type: "boolean", description: "優先選擇室內停車場" },
                need_ev_charge: { type: "boolean", description: "途中或終點需要充電" },
                avoid_tolls: { type: "boolean", description: "避開收費路段" },
              },
            },
          },
          required: ["origin", "destination", "identity"],
        },
      },

      // 🔹 [LOW-LEVEL] 3. Nearby Parking Lots
      {
        name: "get_nearby_parking",
        description: "【原子工具】查詢指定經緯度周邊停車場即時剩餘車位、費率、距離與空位率。",
        inputSchema: {
          type: "object",
          properties: {
            latitude: { type: "number", description: "目標緯度 (WGS84)" },
            longitude: { type: "number", description: "目標經度 (WGS84)" },
            radius_meters: { type: "number", default: 800, description: "搜尋半徑 (預設 800m)" },
          },
          required: ["latitude", "longitude"],
        },
      },

      // 🔹 [LOW-LEVEL] 4. Nearby EV Chargers
      {
        name: "get_nearby_ev_chargers",
        description: "【原子工具】查詢指定經緯度周邊電動車充電站可用快充/慢充槍數與支援規格 (CCS1/CCS2/Type2)。",
        inputSchema: {
          type: "object",
          properties: {
            latitude: { type: "number", description: "目標緯度 (WGS84)" },
            longitude: { type: "number", description: "目標經度 (WGS84)" },
            radius_meters: { type: "number", default: 1500, description: "搜尋半徑 (預設 1500m)" },
          },
          required: ["latitude", "longitude"],
        },
      },

      // 🔹 [LOW-LEVEL] 5. Nearby YouBike
      {
        name: "get_nearby_youbike",
        description: "【原子工具】查詢周邊 YouBike 2.0 站點即時可借車輛數與可還空格數，包含車輛枯竭預警。",
        inputSchema: {
          type: "object",
          properties: {
            latitude: { type: "number", description: "目標緯度 (WGS84)" },
            longitude: { type: "number", description: "目標經度 (WGS84)" },
            radius_meters: { type: "number", default: 800, description: "搜尋半徑 (預設 800m)" },
          },
          required: ["latitude", "longitude"],
        },
      },

      // 🔹 [LOW-LEVEL] 6. Traffic Incidents
      {
        name: "get_traffic_incidents",
        description: "【原子工具】查詢周邊道路施工、交通事故、管制與壅塞回堵通報。",
        inputSchema: {
          type: "object",
          properties: {
            city: { type: "string", default: "Taipei", description: "城市名稱 (如 Taipei, NewTaipei)" },
            latitude: { type: "number", description: "目前緯度 (選填)" },
            longitude: { type: "number", description: "目前經度 (選填)" },
          },
        },
      },

      // 🔹 [LOW-LEVEL] 7. Bus Estimated Arrival
      {
        name: "get_bus_estimated_arrival",
        description: "【原子工具】查詢特定公車路線與站牌之預估到站時間動態。",
        inputSchema: {
          type: "object",
          properties: {
            city: { type: "string", default: "Taipei", description: "城市名稱" },
            route_name: { type: "string", description: "公車路線號碼 (例如 '307', '承德幹線')" },
            stop_name: { type: "string", description: "站牌名稱 (選填)" },
          },
          required: ["route_name"],
        },
      },

      // 🔹 [LOW-LEVEL] 8. Rail Live Board
      {
        name: "get_rail_live_board",
        description: "【原子工具】查詢台鐵 (tra) 或高鐵 (thsr) 車站即時發車月台與延誤看板。",
        inputSchema: {
          type: "object",
          properties: {
            station_id: { type: "string", default: "1000", description: "車站代碼 (台北車站為 1000)" },
            rail_type: { type: "string", enum: ["tra", "thsr", "metro"], default: "tra", description: "鐵路類別" },
          },
        },
      },

      // 📚 MCP Skills & Cache Tools
      {
        name: "explain_mcp_skill",
        description: "詳細介紹什麼是 MCP 以及什麼是 MCP Skill，包含與 Tool、Resource、Prompt 的差別。",
        inputSchema: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              enum: ["skills", "tools", "resources", "prompts", "architecture", "all"],
              default: "all",
            },
          },
        },
      },
      {
        name: "get_mcp_quickstart",
        description: "取得 MCP 在各大客戶端 (Claude Desktop, Cursor, Docker, Cloudflare) 的安裝與設定快速上手指南。",
        inputSchema: {
          type: "object",
          properties: {
            client: {
              type: "string",
              enum: ["claude-desktop", "cursor", "docker", "cloudflare", "all"],
              default: "all",
            },
          },
        },
      },
      {
        name: "list_mcp_concepts",
        description: "列出知識庫中所有 MCP 核心概念清單與主題概要。",
        inputSchema: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: ["overview", "skills", "tools", "resources", "prompts", "transports", "clients", "deployment", "faq", "all"],
              default: "all",
            },
          },
        },
      },
      {
        name: "ask_mcp_assistant",
        description: "向 MCP 智能助手提問任何關於 MCP 的問題（內建快取）。",
        inputSchema: {
          type: "object",
          properties: {
            question: { type: "string", description: "想提問的問題" },
          },
          required: ["question"],
        },
      },
      {
        name: "get_cache_stats",
        description: "查看 MCP 快取統計數據（命中次數、未命中次數、總鍵數）。",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "clear_mcp_cache",
        description: "清空快取記錄。",
        inputSchema: { type: "object", properties: {} },
      },
    ],
  }));

  // ── Call Tool Handler ─────────────────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    // 1. get_transport_context
    if (name === "get_transport_context") {
      const identity = args.identity as TransportIdentity;
      const state = args.state as TransportState;
      const lat = Number(args.latitude);
      const lon = Number(args.longitude);
      const radius = args.radius_meters ? Number(args.radius_meters) : 800;

      const result = await evaluateTransportContext(
        tdxClient,
        identity,
        state,
        { latitude: lat, longitude: lon, name: args.location_name as string },
        { radiusMeters: radius }
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    // 2. plan_contextual_route
    if (name === "plan_contextual_route") {
      const origin = args.origin as { latitude: number; longitude: number; name?: string };
      const dest = args.destination as { latitude: number; longitude: number; name?: string };
      const identity = (args.identity as TransportIdentity | "multimodal") || "car";
      const urgency = (args.urgency as "normal" | "high" | "relaxed") || "normal";
      const preferences = (args.preferences as any) || {};

      const result = await planContextualRoute(
        tdxClient,
        origin,
        dest,
        identity,
        urgency,
        preferences
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    // 3. get_nearby_parking
    if (name === "get_nearby_parking") {
      const lat = Number(args.latitude);
      const lon = Number(args.longitude);
      const radius = args.radius_meters ? Number(args.radius_meters) : 800;
      const result = await tdxClient.getNearbyParking(lat, lon, radius);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    // 4. get_nearby_ev_chargers
    if (name === "get_nearby_ev_chargers") {
      const lat = Number(args.latitude);
      const lon = Number(args.longitude);
      const radius = args.radius_meters ? Number(args.radius_meters) : 1500;
      const result = await tdxClient.getNearbyEVChargers(lat, lon, radius);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    // 5. get_nearby_youbike
    if (name === "get_nearby_youbike") {
      const lat = Number(args.latitude);
      const lon = Number(args.longitude);
      const radius = args.radius_meters ? Number(args.radius_meters) : 800;
      const result = await tdxClient.getNearbyYouBike(lat, lon, radius);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    // 6. get_traffic_incidents
    if (name === "get_traffic_incidents") {
      const city = (args.city as string) || "Taipei";
      const lat = args.latitude ? Number(args.latitude) : undefined;
      const lon = args.longitude ? Number(args.longitude) : undefined;
      const result = await tdxClient.getTrafficIncidents(city, lat, lon);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    // 7. get_bus_estimated_arrival
    if (name === "get_bus_estimated_arrival") {
      const city = (args.city as string) || "Taipei";
      const routeName = args.route_name as string;
      const stopName = args.stop_name as string | undefined;
      const result = await tdxClient.getBusEstimatedArrival(city, routeName, stopName);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    // 8. get_rail_live_board
    if (name === "get_rail_live_board") {
      const stationId = (args.station_id as string) || "1000";
      const railType = (args.rail_type as "tra" | "thsr" | "metro") || "tra";
      const result = await tdxClient.getRailLiveBoard(stationId, railType);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    // MCP Skills & Knowledge tools
    if (name === "explain_mcp_skill") {
      const topic = (args.topic as string) || "all";
      const topicMap: Record<string, string> = {
        skills: "what-is-mcp-skill",
        tools: "tools-vs-resources-vs-prompts",
        resources: "tools-vs-resources-vs-prompts",
        prompts: "tools-vs-resources-vs-prompts",
        architecture: "what-is-mcp",
      };
      if (topic !== "all" && topic in topicMap) {
        const t = findTopicById(topicMap[topic]);
        return { content: [{ type: "text", text: t ? `# ${t.title}\n\n${t.content}` : "找不到內容" }] };
      }
      const fullText = MCP_KNOWLEDGE_BASE.filter((t) => ["what-is-mcp", "what-is-mcp-skill", "tools-vs-resources-vs-prompts"].includes(t.id))
        .map((t) => `# ${t.title}\n\n${t.content}`)
        .join("\n\n---\n\n");
      return { content: [{ type: "text", text: fullText }] };
    }

    if (name === "get_mcp_quickstart") {
      const client = (args.client as string) || "all";
      const guide = findTopicById("quickstart-guide");
      if (!guide) return { isError: true, content: [{ type: "text", text: "快速上手指南暫時不可用。" }] };
      return { content: [{ type: "text", text: `# ${guide.title}\n\n${extractClientSection(guide.content, client)}` }] };
    }

    if (name === "list_mcp_concepts") {
      const category = (args.category as string) || "all";
      const items = category === "all" ? MCP_KNOWLEDGE_BASE : MCP_KNOWLEDGE_BASE.filter((t) => t.category === category);
      const listText = items
        .map((t) => `• [${t.category.toUpperCase()}] **${t.title}** (ID: \`${t.id}\`)\n  ${t.summary}`)
        .join("\n\n");
      return { content: [{ type: "text", text: `### MCP 知識庫概念清單 (${items.length} 筆):\n\n${listText}` }] };
    }

    if (name === "ask_mcp_assistant") {
      const question = (args.question as string)?.trim();
      if (!question) return { isError: true, content: [{ type: "text", text: "請提供想詢問的問題。" }] };
      const cacheKey = buildCacheKey(question);
      const startTime = Date.now();
      const cached = await cache.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          content: [
            {
              type: "text",
              text: `⚡ **[Redis 快取直接命中 (Cache HIT)]**\n⏱️ 響應時間: ${Date.now() - startTime}ms | 原提問: 「${parsed.originalQuestion}」 | 快取建立時間: ${parsed.cachedAt}\n\n${parsed.answer}`,
            },
          ],
        };
      }
      const matches = searchTopics(question);
      const answer = matches.length > 0
        ? matches.map((m) => m.content).join("\n\n---\n\n")
        : `關於「${question}」：MCP (Model Context Protocol) 是讓 AI 與外部工具安全對接的開放協議。`;
      await cache.set(cacheKey, JSON.stringify({ originalQuestion: question, answer, cachedAt: new Date().toISOString() }), 86400);
      return {
        content: [
          {
            type: "text",
            text: `💾 **[新問題生成並已快取至 Redis (Cache MISS)]**\n⏱️ 處理時間: ${Date.now() - startTime}ms | 快取鍵: \`${cacheKey}\`\n\n${answer}`,
          },
        ],
      };
    }

    if (name === "get_cache_stats") {
      const stats = await cache.getStats();
      return {
        content: [
          {
            type: "text",
            text: `### 📊 快取運行狀態\n- **後端類型**: \`${stats.type}\`\n- **連線狀態**: ${stats.connected ? "✅ 正常" : "⚠️ 記憶體模式"}\n- **總鍵數**: ${stats.keysCount}\n- **Hits/Misses**: ${stats.hits} / ${stats.misses}`,
          },
        ],
      };
    }

    if (name === "clear_mcp_cache") {
      await cache.clear();
      return { content: [{ type: "text", text: "✅ 已清空快取！" }] };
    }

    return { isError: true, content: [{ type: "text", text: `未知的工具名稱: ${name}` }] };
  });

  // ── Resources ─────────────────────────────────────────────────────────────
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      { uri: "transport://context/taipei", name: "台北市即時交通情境摘要", description: "台北市即時交通、停車與路況總覽", mimeType: "application/json" },
      { uri: "mcp://guide/introduction", name: "MCP 基礎入門介紹", description: "MCP 核心架構與概念指南", mimeType: "text/markdown" },
      { uri: "mcp://guide/skills", name: "MCP Skill 完整技術手冊", description: "Skill 與 Tool/Resource/Prompt 比較與設計模式", mimeType: "text/markdown" },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    if (uri === "transport://context/taipei") {
      const context = await evaluateTransportContext(
        tdxClient,
        "car",
        "cruising",
        { latitude: 25.0339, longitude: 121.5644, name: "台北市信義區" }
      );
      return { contents: [{ uri, mimeType: "application/json", text: JSON.stringify(context, null, 2) }] };
    }
    const topicId = uri === "mcp://guide/introduction" ? "what-is-mcp" : uri === "mcp://guide/skills" ? "what-is-mcp-skill" : null;
    if (!topicId) throw new Error(`找不到指定的資源 URI: ${uri}`);
    const topic = findTopicById(topicId);
    return { contents: [{ uri, mimeType: "text/markdown", text: topic?.content ?? "" }] };
  });

  // ── Prompts ───────────────────────────────────────────────────────────────
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      {
        name: "commute_assistant",
        description: "AI 交通小秘書主動通勤晨報/晚報提示詞模板。",
        arguments: [
          { name: "identity", description: "身分 (car / scooter / bike / transit)", required: true },
          { name: "state", description: "狀態 (commute_in / commute_out / urgent)", required: true },
          { name: "location_name", description: "目前或出發地名稱", required: false },
        ],
      },
      {
        name: "parking_hunting_assistant",
        description: "智慧找車位助理引導模板。",
        arguments: [
          { name: "destination", description: "目標地標或商圈", required: true },
          { name: "is_ev", description: "是否為電動車需充電 (true/false)", required: false },
        ],
      },
    ],
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    if (name === "commute_assistant") {
      const identity = args.identity || "car";
      const state = args.state || "commute_in";
      const location = args.location_name || "台北市區";
      return {
        description: "交通小秘書通勤引導 Prompt",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `你好！我是身分為【${identity}】的使用者，目前處於【${state}】狀態，地點位於【${location}】。請調用 \`get_transport_context\` 工具為我診斷當前交通路況、車位/班次動態，並以貼心小秘書的口吻提供重點摘要與行動建議！`,
            },
          },
        ],
      };
    }

    if (name === "parking_hunting_assistant") {
      const dest = args.destination || "台北101";
      const isEV = args.is_ev === "true";
      return {
        description: "智慧停車與充電助理 Prompt",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `我正開車前往【${dest}】${isEV ? "（電動車需要充電）" : ""}，請調用 \`get_transport_context\` 或 \`get_nearby_parking\` 工具，幫我分析目的地周邊停車場即時剩餘位與排隊風險，推薦最不易客滿的優質停車場與進場動線。`,
            },
          },
        ],
      };
    }

    throw new Error(`找不到指定的 Prompt: ${name}`);
  });

  return server;
}
