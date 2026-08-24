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
import { buildCacheKey } from "../utils/hash.js";
import type { AppEnv } from "../types/env.js";

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
  // Split on level-4 headings; find the chunk whose heading contains keyword
  const sections = content.split(/\n(?=####)/);
  const match = sections.find((s) => s.includes(keyword));
  return match?.trim() || content;
}

export function createMCPServer(options?: { cacheService?: CacheService; env?: AppEnv }): Server {
  const cache = options?.cacheService ?? createCacheService(options?.env);

  const server = new Server(
    { name: "cf-mcp-playground", version: "1.0.0" },
    { capabilities: { tools: {}, resources: {}, prompts: {} } }
  );

  // ── Tools List ────────────────────────────────────────────────────────────
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "explain_mcp_skill",
        description:
          "詳細介紹什麼是 MCP (Model Context Protocol) 以及什麼是 MCP Skill，包含與 Tool、Resource、Prompt 的差別與範例說明。",
        inputSchema: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              description: "想了解的具體主題 (例如: 'skills', 'tools', 'resources', 'prompts', 'architecture', 'all')",
              enum: ["skills", "tools", "resources", "prompts", "architecture", "all"],
              default: "all",
            },
          },
        },
      },
      {
        name: "get_mcp_quickstart",
        description:
          "取得 MCP 在各大客戶端 (Claude Desktop, Cursor, Docker, Cloudflare) 的安裝與設定快速上手指南。",
        inputSchema: {
          type: "object",
          properties: {
            client: {
              type: "string",
              description: "目標客戶端或部署環境，回傳對應段落；'all' 回傳完整指南。",
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
              description: "主題分類過濾 (可選)",
              enum: ["overview", "skills", "tools", "resources", "prompts", "transports", "clients", "deployment", "faq", "all"],
              default: "all",
            },
          },
        },
      },
      {
        name: "ask_mcp_assistant",
        description:
          "向 MCP 智能助手提問任何關於 MCP 的問題。內建 Redis 快取，若曾問過相同問題將直接從快取極速回答。",
        inputSchema: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description: "您想提問的問題 (例如: 'MCP Skill 是什麼？', '如何用 Docker 部署 MCP？')",
            },
          },
          required: ["question"],
        },
      },
      {
        name: "get_cache_stats",
        description: "查看 Redis 快取的運行狀態、命中率 (Hits/Misses) 與總快取項目數量。",
        inputSchema: { type: "object", properties: {} },
      },
      {
        name: "clear_mcp_cache",
        description: "清空 Redis 快取中的所有問答資料。",
        inputSchema: { type: "object", properties: {} },
      },
    ],
  }));

  // ── Tool Execution ────────────────────────────────────────────────────────
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    if (name === "explain_mcp_skill") {
      const topic = (args.topic as string) || "all";
      if (topic === "skills" || topic === "all") {
        const overview = findTopicById("what-is-mcp");
        const skill = findTopicById("what-is-mcp-skill");
        return {
          content: [{ type: "text", text: `${overview?.content ?? ""}\n\n---\n\n${skill?.content ?? ""}` }],
        };
      }
      const matches = searchTopics(topic);
      return {
        content: [{ type: "text", text: matches.map((m) => m.content).join("\n\n---\n\n") || "未找到對應主題說明。" }],
      };
    }

    if (name === "get_mcp_quickstart") {
      const client = (args.client as string) || "all";
      const setupTopic = findTopicById("how-to-use-mcp");
      const raw = setupTopic?.content ?? "未找到快速上手指南。";
      return {
        content: [{ type: "text", text: extractClientSection(raw, client) }],
      };
    }

    if (name === "list_mcp_concepts") {
      const category = (args.category as string) || "all";
      const items =
        category === "all"
          ? MCP_KNOWLEDGE_BASE
          : MCP_KNOWLEDGE_BASE.filter((t) => t.category === category);
      const listText = items
        .map(
          (t) =>
            `• [${t.category.toUpperCase()}] **${t.title}** (ID: \`${t.id}\`)\n  ${t.summary}\n  標籤: ${t.tags.join(", ")}`
        )
        .join("\n\n");
      return {
        content: [{ type: "text", text: `### MCP 知識庫概念清單 (${items.length} 筆):\n\n${listText}` }],
      };
    }

    if (name === "ask_mcp_assistant") {
      const question = (args.question as string)?.trim();
      if (!question) {
        return { isError: true, content: [{ type: "text", text: "請提供想詢問的問題。" }] };
      }

      const cacheKey = buildCacheKey(question);
      const startTime = Date.now();

      const cached = await cache.get(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached) as { originalQuestion: string; answer: string; cachedAt: string };
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
      const answer =
        matches.length > 0
          ? `依據 MCP 官方規範與知識庫為您解答：\n\n${matches.map((m) => m.content).join("\n\n---\n\n")}`
          : `關於「${question}」：\nModel Context Protocol (MCP) 是讓 AI 與外部資料、工具安全對接的開放協議。包含 Tools (執行動作)、Resources (讀取資料)、Prompts (提示詞模板)。\n\n您可以嘗試使用 \`explain_mcp_skill\` 了解 Skill 細節，或 \`get_mcp_quickstart\` 查看設定指引。`;

      await cache.set(
        cacheKey,
        JSON.stringify({ originalQuestion: question, answer, cachedAt: new Date().toISOString() }),
        86400
      );

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
      const total = stats.hits + stats.misses;
      const hitRatio = total > 0 ? `${((stats.hits / total) * 100).toFixed(1)}%` : "N/A";
      return {
        content: [
          {
            type: "text",
            text: [
              `### 📊 Redis 快取運行狀態`,
              `- **快取後端類型**: \`${stats.type}\``,
              `- **連線狀態**: ${stats.connected ? "✅ 正常連線" : "⚠️ 未連線 (已降級為記憶體快取)"}`,
              `- **總快取項目數**: ${stats.keysCount}`,
              `- **快取命中次數 (Hits)**: ${stats.hits}`,
              `- **快取未命中次數 (Misses)**: ${stats.misses}`,
              `- **命中率 (Hit Ratio)**: ${hitRatio}`,
            ].join("\n"),
          },
        ],
      };
    }

    if (name === "clear_mcp_cache") {
      await cache.clear();
      return { content: [{ type: "text", text: "✅ 已成功清空所有 MCP 問答快取記錄！" }] };
    }

    return { isError: true, content: [{ type: "text", text: `未知的工具名稱: ${name}` }] };
  });

  // ── Resources ─────────────────────────────────────────────────────────────
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [
      { uri: "mcp://guide/introduction", name: "MCP 基礎入門介紹", description: "MCP 核心架構與概念指南", mimeType: "text/markdown" },
      { uri: "mcp://guide/skills", name: "MCP Skill 完整技術手冊", description: "Skill 與 Tool/Resource/Prompt 比較與設計模式", mimeType: "text/markdown" },
      { uri: "mcp://guide/docker-redis", name: "Docker 與 Redis 部署手冊", description: "容器化 MCP 服務與 Redis 快取架構", mimeType: "text/markdown" },
    ],
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    const topicId =
      uri === "mcp://guide/introduction" ? "what-is-mcp"
      : uri === "mcp://guide/skills" ? "what-is-mcp-skill"
      : uri === "mcp://guide/docker-redis" ? "redis-caching-design"
      : null;

    if (!topicId) throw new Error(`找不到指定的資源 URI: ${uri}`);
    const topic = findTopicById(topicId);
    return { contents: [{ uri, mimeType: "text/markdown", text: topic?.content ?? "" }] };
  });

  // ── Prompts ───────────────────────────────────────────────────────────────
  server.setRequestHandler(ListPromptsRequestSchema, async () => ({
    prompts: [
      {
        name: "learn_mcp_skills",
        description: "引導 AI 成為 MCP 教練，循序漸進教授使用者 MCP Skill 與架構知識。",
        arguments: [{ name: "user_level", description: "技術背景 (beginner / intermediate / advanced)", required: false }],
      },
      {
        name: "debug_mcp_connection",
        description: "診斷 MCP 客戶端與伺服器之間的連線、SSE 傳輸或 Redis 快取異常問題。",
        arguments: [{ name: "error_message", description: "遇到的錯誤訊息或異常現象", required: true }],
      },
    ],
  }));

  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    if (name === "learn_mcp_skills") {
      const level = args.user_level || "beginner";
      return {
        description: "MCP Skills 學習引導 Prompt",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `你好！我是技術背景為 ${level} 的開發者。請為我系統性介紹 MCP (Model Context Protocol) 以及什麼是 MCP Skill，並透過具體範例說明 Tools, Resources, Prompts 的差別與組合方式。`,
            },
          },
        ],
      };
    }

    if (name === "debug_mcp_connection") {
      const errMsg = args.error_message || "連線超時";
      return {
        description: "MCP 連線除錯 Prompt",
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `我在使用 MCP 服務時遇到了以下錯誤：\n\`\`\`\n${errMsg}\n\`\`\`\n請協助我從以下角度進行問題排查：\n1. 傳輸協議 (Stdio / SSE) 設定是否正確\n2. Docker 網路與 Redis 連線狀況\n3. Cloudflare Worker 的 CORS 與端點路由`,
            },
          },
        ],
      };
    }

    throw new Error(`找不到指定的 Prompt: ${name}`);
  });

  return server;
}
