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
import { CacheService, getCacheService } from "../services/cache.js";

function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .trim()
    .replace(/[？\?！\!。，,、\s]+/g, "");
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}

export function createMCPServer(options?: { cacheService?: CacheService; env?: Record<string, any> }): Server {
  const cache = options?.cacheService || getCacheService(options?.env);

  const server = new Server(
    {
      name: "cf-mcp-playground",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // 1. Register Tools List
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "explain_mcp_skill",
          description: "詳細介紹什麼是 MCP (Model Context Protocol) 以及什麼是 MCP Skill，包含與 Tool、Resource、Prompt 的差別與範例說明。",
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
          description: "取得 MCP 在各大客戶端 (Claude Desktop, Cursor, Zed, Cloudflare, Docker) 的安裝與設定快速上手指南。",
          inputSchema: {
            type: "object",
            properties: {
              client: {
                type: "string",
                description: "目標客戶端或環境",
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
          description: "向 MCP 智能助手提問任何關於 MCP 的問題。內建 Redis 快取，若曾問過相同問題將直接從快取極速回答。",
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
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "clear_mcp_cache",
          description: "清空 Redis 快取中的所有問答資料。",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
      ],
    };
  });

  // 2. Register Tool Execution
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    if (name === "explain_mcp_skill") {
      const topic = (args.topic as string) || "all";
      if (topic === "skills" || topic === "all") {
        const skillTopic = findTopicById("what-is-mcp-skill");
        const overviewTopic = findTopicById("what-is-mcp");
        return {
          content: [
            {
              type: "text",
              text: `${overviewTopic?.content || ""}\n\n---\n\n${skillTopic?.content || ""}`,
            },
          ],
        };
      } else {
        const matches = searchTopics(topic);
        const text = matches.map((m) => m.content).join("\n\n---\n\n") || "未找到對應主題說明。";
        return {
          content: [{ type: "text", text }],
        };
      }
    }

    if (name === "get_mcp_quickstart") {
      const client = (args.client as string) || "all";
      const setupTopic = findTopicById("how-to-use-mcp");
      return {
        content: [
          {
            type: "text",
            text: setupTopic?.content || "未找到快速上手指南。",
          },
        ],
      };
    }

    if (name === "list_mcp_concepts") {
      const category = (args.category as string) || "all";
      const items = category === "all"
        ? MCP_KNOWLEDGE_BASE
        : MCP_KNOWLEDGE_BASE.filter((t) => t.category === category);

      const listText = items
        .map((t) => `• [${t.category.toUpperCase()}] **${t.title}** (ID: \`${t.id}\`)\n  ${t.summary}\n  標籤: ${t.tags.join(", ")}`)
        .join("\n\n");

      return {
        content: [
          {
            type: "text",
            text: `### MCP 知識庫概念清單 (${items.length} 筆):\n\n${listText}`,
          },
        ],
      };
    }

    if (name === "ask_mcp_assistant") {
      const question = (args.question as string)?.trim();
      if (!question) {
        return {
          isError: true,
          content: [{ type: "text", text: "請提供想詢問的問題。" }],
        };
      }

      const normalized = normalizeQuestion(question);
      const cacheKey = `mcp:qa:${hashString(normalized)}`;

      const startTime = Date.now();

      // Check Redis Cache
      const cached = await cache.get(cacheKey);
      if (cached) {
        const elapsed = Date.now() - startTime;
        const parsed = JSON.parse(cached);
        return {
          content: [
            {
              type: "text",
              text: `⚡ **[Redis 快取直接命中 (Cache HIT)]**\n⏱️ 響應時間: ${elapsed}ms | 原提問: 「${parsed.originalQuestion}」 | 快取建立時間: ${parsed.cachedAt}\n\n${parsed.answer}`,
            },
          ],
        };
      }

      // Cache Miss: Search Knowledge Base
      const matches = searchTopics(question);
      let answer = "";

      if (matches.length > 0) {
        answer = `依據 MCP 官方規範與知識庫為您解答：\n\n` +
          matches.map((m) => m.content).join("\n\n---\n\n");
      } else {
        answer = `關於「${question}」：\nModel Context Protocol (MCP) 是讓 AI 與外部資料、工具安全對接的開放協議。包含 Tools (執行動作)、Resources (讀取資料)、Prompts (提示詞模板)。\n\n您可以嘗試使用 \`explain_mcp_skill\` 了解 Skill 細節，或 \`get_mcp_quickstart\` 查看設定指引。`;
      }

      // Save to Redis Cache (TTL 24 hours = 86400 seconds)
      const cachePayload = {
        originalQuestion: question,
        normalizedKey: normalized,
        answer,
        cachedAt: new Date().toISOString(),
      };
      await cache.set(cacheKey, JSON.stringify(cachePayload), 86400);

      const elapsed = Date.now() - startTime;
      return {
        content: [
          {
            type: "text",
            text: `💾 **[新問題生成並已快取至 Redis (Cache MISS)]**\n⏱️ 處理時間: ${elapsed}ms | 快取鍵: \`${cacheKey}\`\n\n${answer}`,
          },
        ],
      };
    }

    if (name === "get_cache_stats") {
      const stats = await cache.getStats();
      const hitRatio = stats.hits + stats.misses > 0
        ? ((stats.hits / (stats.hits + stats.misses)) * 100).toFixed(1) + "%"
        : "N/A";

      return {
        content: [
          {
            type: "text",
            text: `### 📊 Redis 快取運行狀態\n- **快取後端類型**: \`${stats.type}\`\n- **連線狀態**: ${stats.connected ? "✅ 正常連線" : "⚠️ 未連線 (已降級為記憶體快取)"}\n- **總快取項目數**: ${stats.keysCount}\n- **快取命中次數 (Hits)**: ${stats.hits}\n- **快取未命中次數 (Misses)**: ${stats.misses}\n- **命中率 (Hit Ratio)**: ${hitRatio}`,
          },
        ],
      };
    }

    if (name === "clear_mcp_cache") {
      await cache.clear();
      return {
        content: [
          {
            type: "text",
            text: "✅ 已成功清空所有 MCP 問答快取記錄！",
          },
        ],
      };
    }

    return {
      isError: true,
      content: [{ type: "text", text: `未知的工具名稱: ${name}` }],
    };
  });

  // 3. Register Resources List & Read
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "mcp://guide/introduction",
          name: "MCP 基礎入門介紹",
          description: "Model Context Protocol 核心架構與概念指南",
          mimeType: "text/markdown",
        },
        {
          uri: "mcp://guide/skills",
          name: "MCP Skill 完整技術手冊",
          description: "Skill 與 Tool/Resource/Prompt 的比較與設計模式",
          mimeType: "text/markdown",
        },
        {
          uri: "mcp://guide/docker-redis",
          name: "Docker 與 Redis 部署手冊",
          description: "如何在容器化環境運行 MCP 服務並啟用 Redis 問答快取",
          mimeType: "text/markdown",
        },
      ],
    };
  });

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    if (uri === "mcp://guide/introduction") {
      const topic = findTopicById("what-is-mcp");
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: topic?.content || "# MCP 簡介",
          },
        ],
      };
    }
    if (uri === "mcp://guide/skills") {
      const topic = findTopicById("what-is-mcp-skill");
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: topic?.content || "# MCP Skill 手冊",
          },
        ],
      };
    }
    if (uri === "mcp://guide/docker-redis") {
      const topic = findTopicById("redis-caching-design");
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: topic?.content || "# Docker 與 Redis 部署",
          },
        ],
      };
    }

    throw new Error(`找不到指定的資源 URI: ${uri}`);
  });

  // 4. Register Prompts List & Get
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    return {
      prompts: [
        {
          name: "learn_mcp_skills",
          description: "引導 AI 成為 MCP 教練，循序漸進教授使用者 MCP Skill 與架構知識。",
          arguments: [
            {
              name: "user_level",
              description: "使用者的技術背景 (例如: beginner, intermediate, advanced)",
              required: false,
            },
          ],
        },
        {
          name: "debug_mcp_connection",
          description: "診斷 MCP 客戶端與伺服器之間的連線、SSE 傳輸或 Redis 快取異常問題。",
          arguments: [
            {
              name: "error_message",
              description: "遇到的錯誤訊息或異常現象",
              required: true,
            },
          ],
        },
      ],
    };
  });

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
