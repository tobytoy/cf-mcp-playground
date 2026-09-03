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
import { lookupOfficialRailFare } from "../services/tdx/fares.js";
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
      // 🚆 [ATOMIC] 9. Rail OD Fare Lookup (台鐵/高鐵/北捷票價查詢)
      {
        name: "get_rail_od_fare",
        description:
          "【原子工具】查詢台灣鐵路 (台鐵 TRA 各級自強/新自強3000/太魯閣/普悠瑪/莒光/區間)、台灣高鐵 (THSR 標準/自由/商務) 與捷運官方核定起訖點票價與優惠資訊。",
        inputSchema: {
          type: "object",
          properties: {
            origin: { type: "string", description: "出發地車站或縣市名稱 (例如 '台北', '板橋', '新竹')" },
            destination: { type: "string", description: "目的地車站或縣市名稱 (例如 '花蓮', '新竹', '台中', '高雄')" },
            rail_type: {
              type: "string",
              enum: ["all", "tra", "thsr", "metro"],
              default: "all",
              description: "查詢車種：全部 (all)、台鐵 (tra)、高鐵 (thsr)、捷運 (metro)"
            }
          },
          required: ["origin", "destination"]
        }
      },
    ],
  }));


// ── Input Validation Helpers ────────────────────────────────────────────────

const VALID_IDENTITIES = new Set(["car", "ev", "scooter", "bike", "transit", "pedestrian", "multimodal"]);
const VALID_STATES = new Set(["cruising", "urgent", "commute_in", "commute_out", "transit_transfer", "rain_fallback"]);
const VALID_RAIL_TYPES = new Set(["tra", "thsr", "metro"]);

function requireLatLon(args: Record<string, unknown>, prefix = ""): { lat: number; lon: number } {
  const latKey = prefix ? `${prefix}_latitude` : "latitude";
  const lonKey = prefix ? `${prefix}_longitude` : "longitude";
  const lat = Number(args[latKey] ?? (args[prefix] as any)?.latitude);
  const lon = Number(args[lonKey] ?? (args[prefix] as any)?.longitude);
  if (isNaN(lat) || lat < -90 || lat > 90) throw new Error(`緯度 (latitude) 不合法：${args[latKey]}，請提供 -90 ~ 90 之間的數值。`);
  if (isNaN(lon) || lon < -180 || lon > 180) throw new Error(`經度 (longitude) 不合法：${args[lonKey]}，請提供 -180 ~ 180 之間的數值。`);
  return { lat, lon };
}

function requireString(args: Record<string, unknown>, key: string, label: string): string {
  const val = String(args[key] ?? "").trim();
  if (!val) throw new Error(`缺少必填欄位「${label}」(${key})，請提供有效的字串值。`);
  return val;
}

function toolError(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: `❌ 輸入驗證錯誤：${message}` }] };
}

// ── Call Tool Handler ─────────────────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {

    // 1. get_transport_context
    if (name === "get_transport_context") {
      const identity = requireString(args, "identity", "交通身分");
      if (!VALID_IDENTITIES.has(identity)) return toolError(`identity 必須為 ${[...VALID_IDENTITIES].join(" / ")} 其中之一，收到：「${identity}」`);
      const state = requireString(args, "state", "當前狀態");
      if (!VALID_STATES.has(state)) return toolError(`state 必須為 ${[...VALID_STATES].join(" / ")} 其中之一，收到：「${state}」`);
      const { lat, lon } = requireLatLon(args);
      const radius = args.radius_meters ? Number(args.radius_meters) : 800;


      const result = await evaluateTransportContext(
        tdxClient,
        identity as TransportIdentity,
        state as TransportState,
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
      const { lat, lon } = requireLatLon(args);
      const radius = args.radius_meters ? Number(args.radius_meters) : 800;
      const result = await tdxClient.getNearbyParking(lat, lon, radius);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    // 4. get_nearby_ev_chargers
    if (name === "get_nearby_ev_chargers") {
      const { lat, lon } = requireLatLon(args);
      const radius = args.radius_meters ? Number(args.radius_meters) : 1500;
      const result = await tdxClient.getNearbyEVChargers(lat, lon, radius);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    // 5. get_nearby_youbike
    if (name === "get_nearby_youbike") {
      const { lat, lon } = requireLatLon(args);
      const radius = args.radius_meters ? Number(args.radius_meters) : 800;
      const result = await tdxClient.getNearbyYouBike(lat, lon, radius);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    // 6. get_traffic_incidents
    if (name === "get_traffic_incidents") {
      const city = (args.city as string) || "Taipei";
      const lat = args.latitude !== undefined ? Number(args.latitude) : undefined;
      const lon = args.longitude !== undefined ? Number(args.longitude) : undefined;
      if (lat !== undefined && (isNaN(lat) || lat < -90 || lat > 90)) return toolError(`緯度不合法：${args.latitude}`);
      if (lon !== undefined && (isNaN(lon) || lon < -180 || lon > 180)) return toolError(`經度不合法：${args.longitude}`);
      const result = await tdxClient.getTrafficIncidents(city, lat, lon);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    // 7. get_bus_estimated_arrival
    if (name === "get_bus_estimated_arrival") {
      const routeName = requireString(args, "route_name", "公車路線號碼");
      const city = (args.city as string) || "Taipei";
      const stopName = args.stop_name as string | undefined;
      const result = await tdxClient.getBusEstimatedArrival(city, routeName, stopName);
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    }

    // 8. get_rail_live_board
    if (name === "get_rail_live_board") {
      const stationId = (args.station_id as string) || "1000";
      const railType = ((args.rail_type as string) || "tra") as "tra" | "thsr" | "metro";
      if (!VALID_RAIL_TYPES.has(railType)) return toolError(`rail_type 必須為 tra / thsr / metro 其中之一，收到：「${railType}」`);
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
              text: `⚡ **[KV 快取命中 (Cache HIT)]**\n⏱️ 響應時間: ${Date.now() - startTime}ms | 原提問: 「${parsed.originalQuestion}」 | 快取建立時間: ${parsed.cachedAt}\n\n${parsed.answer}`,
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
            text: `💾 **[新問題生成並已快取至 KV (Cache MISS)]**\n⏱️ 處理時間: ${Date.now() - startTime}ms | 快取鍵: \`${cacheKey}\`\n\n${answer}`,
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

    if (name === "get_rail_od_fare") {
      const origin = requireString(args, "origin", "出發地");
      const destination = requireString(args, "destination", "目的地");
      const railType = String(args.rail_type || "all");

      const fareInfo = lookupOfficialRailFare(origin, destination);
      if (!fareInfo) {
        return {
          content: [
            {
              type: "text" as const,
              text: `⚠️ 查無「${origin}」至「${destination}」的直達鐵路票價記錄，請確認車站名稱（支援：台北、新竹、台中、台南、左營/高雄、花蓮、宜蘭、台東等主要站點）。`
            }
          ]
        };
      }

      let markdown = `## 🚆 台灣軌道官方核定票價查詢結果 (MOTC / TDX)\n\n`;
      markdown += `* **起訖區間**：${fareInfo.origin} ⟷ ${fareInfo.destination}\n\n`;

      if (fareInfo.tra && (railType === "all" || railType === "tra")) {
        markdown += `### 🚂 台鐵 (TRA) 列車票價\n`;
        markdown += `* **自強號 / 新自強號(EMU3000) / 普悠瑪 / 太魯閣**：**NT$ ${fareInfo.tra.tZeQiang}** 元\n`;
        markdown += `* **莒光號**：**NT$ ${fareInfo.tra.chuKuang}** 元\n`;
        markdown += `* **區間車 / 區間快**：**NT$ ${fareInfo.tra.local}** 元\n\n`;
      }

      if (fareInfo.thsr && (railType === "all" || railType === "thsr")) {
        markdown += `### 🚅 台灣高鐵 (THSR) 車廂票價\n`;
        markdown += `* **標準車廂對號座**：**NT$ ${fareInfo.thsr.standard}** 元\n`;
        markdown += `* **自由座**：**NT$ ${fareInfo.thsr.nonReserved}** 元\n`;
        markdown += `* **商務車廂**：**NT$ ${fareInfo.thsr.business}** 元\n\n`;
      }

      if (fareInfo.metro && (railType === "all" || railType === "metro")) {
        markdown += `### 🚇 捷運接駁票價\n`;
        markdown += `* **全票單程**：**NT$ ${fareInfo.metro.adult}** 元\n\n`;
      }

      markdown += `> 💡 官方備註：以上票價為交通部官方核定全票基準價格，敬老/愛心/孩童票享半價優惠。`;

      return {
        content: [{ type: "text" as const, text: markdown }]
      };
    }

    return { isError: true, content: [{ type: "text", text: `未知的工具名稱: ${name}` }] };

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { isError: true, content: [{ type: "text" as const, text: `❌ 工具執行失敗：${message}` }] };
    }
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
