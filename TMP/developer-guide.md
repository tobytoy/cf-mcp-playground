# Cloudflare Worker & Docker MCP 服務開發與使用說明手冊

本專案是一個具備 **雙重運行架構（Cloudflare Workers 邊緣運算 + Docker/Node.js 容器化）** 的 **Model Context Protocol (MCP)** 服務。內建 **MCP Skills 知識庫**、**智能問答系統** 以及 **Redis 提問秒級快取機制**。

---

## 📑 目錄

1. [專案架構概覽](#1-專案架構概覽)
2. [核心概念：什麼是 MCP 與 MCP Skill？](#2-核心概念什麼是-mcp-與-mcp-skill)
3. [目錄結構說明](#3-目錄結構說明)
4. [本地開發與測試指南](#4-本地開發與測試指南)
5. [Docker 與 Redis 容器化運行](#5-docker-與-redis-容器化運行)
6. [Cloudflare Worker 部署指南](#6-cloudflare-worker-部署指南)
7. [在主流 AI 客戶端中使用 (Claude / Cursor / VS Code)](#7-在主流-ai-客戶端中使用)
8. [MCP 工具清單與 REST API 規格](#8-mcp-工具清單與-rest-api-規格)
9. [如何擴充與新增自定義 MCP Tools](#9-如何擴充與新增自定義-mcp-tools)

---

## 1. 專案架構概覽

本服務支援兩種運行環境，共用相同的核心 MCP 邏輯與知識庫：

```
                           ┌───────────────────────────────┐
                           │      AI Client (Host)         │
                           │  Claude Desktop / Cursor /    │
                           │  Windsurf / Agent 應用程式    │
                           └───────────────┬───────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                             │
         [Streamable HTTP / SSE]                       [Streamable HTTP / SSE]
                    ▼                                             ▼
     ┌─────────────────────────────┐               ┌─────────────────────────────┐
     │   Cloudflare Worker (Edge)  │               │   Docker / Node.js 服務     │
     │  - 邊緣全球秒級冷啟動       │               │  - 本地/私有雲完整部署     │
     │  - 記憶體/KV 快取機制       │               │  - 連接獨立 Redis 容器      │
     └──────────────┬──────────────┘               └──────────────┬──────────────┘
                    │                                             │
                    └──────────────────────┬──────────────────────┘
                                           │
                                           ▼
                            ┌─────────────────────────────┐
                            │   MCP 核心引擎 (Hono + SDK) │
                            │   - 6 組 MCP Tools          │
                            │   - 3 組 MCP Resources      │
                            │   - 2 組 MCP Prompts        │
                            │   - 提問標準化與快取分發    │
                            └──────────────┬──────────────┘
                                           │
                                           ▼
                            ┌─────────────────────────────┐
                            │   快取層 (Redis / Memory)   │
                            │   - Cache HIT  : < 1ms 直答 │
                            │   - Cache MISS : 自動寫入   │
                            └─────────────────────────────┘
```

---

## 2. 核心概念：什麼是 MCP 與 MCP Skill？

### 2.1 什麼是 Model Context Protocol (MCP)？
MCP 是由 Anthropic 推出的開放標準協議（Open Standard Protocol），被稱為 **「AI 應用的 USB-C 接口」**。它制定了統一的通訊規範，讓 AI 模型能安全、標準化地調用外部工具與讀取資料。

### 2.2 什麼是 MCP Skill？
**Skill（技能）** 指的是 AI 透過組合多種 MCP 原語所具備的 **「特定領域端到端能力」**。

| 原語概念 | 角色定位 | 誰決定發起 | 典型用途 | 範例 |
| :--- | :--- | :--- | :--- | :--- |
| **Tools (工具)** | AI 可執行的函數（具副作用） | **模型自主決定** | 計算、發送 API、寫資料庫、執行命令 | `query_database`, `ask_mcp_assistant` |
| **Resources (資源)** | 提供給 AI 閱讀的上下文資料（唯讀） | **客戶端/使用者附加** | 讀取日誌、文件、設定檔、即時數據 | `mcp://guide/skills`, `file:///logs/app.log` |
| **Prompts (提示詞)** | 預定義的引導模板與工作流 | **使用者選取觸發** | 程式碼審查、問題排查導引、學習教練 | `learn_mcp_skills`, `debug_mcp_connection` |

---

## 3. 目錄結構說明

```
cf-mcp-playground/
├── .cursor/                 # Cursor IDE 的 MCP 設定檔 (包含 Cloudflare 官方 MCP)
├── .vscode/                  # VS Code / Copilot 的 MCP 設定檔
├── src/
│   ├── index.ts             # 模組統一匯出入口
│   ├── app.ts               # Hono 路由核心 (處理 /mcp, /sse, /health, /api/ask)
│   ├── worker.ts            # Cloudflare Worker 進入點 (export default fetch)
│   ├── node-server.ts       # Docker / Node.js 獨立伺服器進入點 (port 3000)
│   ├── mcp/
│   │   └── server.ts        # MCP Server 定義 (註冊 Tools, Resources, Prompts)
│   ├── services/
│   │   └── cache.ts         # 快取抽象層 (支援 RedisCache 與 MemoryCache 自動降級)
│   └── knowledge/
│       └── mcp-data.ts      # MCP & Skill 核心知識庫資料
├── tests/
│   ├── test-mcp.ts          # 單元與整合測試腳本 (測試 MCP 協議與快取)
│   └── verify-transport.ts  # Transport 傳輸層相容性檢查
├── TMP/
│   ├── todo.md              # 需求清單
│   └── developer-guide.md   # 本開發與使用說明手冊
├── Dockerfile               # 支援生產環境的多階段建置 Dockerfile
├── docker-compose.yml       # 一鍵啟動 MCP 服務 + Redis 7 容器
├── package.json             # 專案依賴與腳本定義
├── tsconfig.json            # TypeScript 編譯器設定
└── wrangler.jsonc           # Cloudflare Worker 部署設定檔
```

---

## 4. 本地開發與測試指南

### 4.1 環境要求
- Node.js 20+
- npm 或 pnpm / bun
- Docker & Docker Compose (可選，容器化運行時需要)

### 4.2 安裝依賴
```bash
npm install
```

### 4.3 執行單元與快取測試
本專案內建完整的自動化測試，會驗證所有 MCP Tools 的註冊、執行，以及 Redis/Memory 的 Cache Miss $\rightarrow$ Cache Hit 流程：
```bash
npm test
```

### 4.4 啟動本機開發伺服器 (Node.js 模式)
```bash
npm run dev:node
```
啟動後終端機將顯示服務網址：`http://localhost:3000`。

### 4.5 啟動 Cloudflare Worker 本地模擬預覽
```bash
npm run dev:worker
```
此命令會使用 Wrangler 在本地啟動與 Cloudflare Edge 完全一致的模擬環境。

---

## 5. Docker 與 Redis 容器化運行

### 5.1 一鍵啟動 (包含 Redis)
```bash
# 建置並於背景啟動容器
docker compose up --build -d
```

### 5.2 檢視容器狀態與日誌
```bash
# 查看容器健康狀態 (均需為 healthy)
docker compose ps

# 即時追蹤 MCP 服務日誌
docker compose logs -f mcp-service

# 即時追蹤 Redis 日誌
docker compose logs -f redis
```

### 5.3 停止容器服務
```bash
docker compose down
```

---

## 6. Cloudflare Worker 部署指南

本專案已完成 Cloudflare Worker 深度相容性適配（包含 `nodejs_compat` 與 `keepAliveMs: 0` 防止 Worker 逾時/生命週期異常）。

### 6.1 登入 Cloudflare
```bash
npx wrangler login
```
*瀏覽器會自動開啟，點擊授權完成 OAuth 登入。*

若在 CI/CD 或無圖形介面伺服器，可直接匯入 API Token：
```bash
export CLOUDFLARE_API_TOKEN="您的_CLOUDFLARE_API_TOKEN"
export CLOUDFLARE_ACCOUNT_ID="您的_CLOUDFLARE_ACCOUNT_ID"
```

### 6.2 部署到 Cloudflare
```bash
npm run deploy
```

部署完成後終端機會輸出您的正式網址：
```
Deployed cf-mcp-playground triggers:
  https://cf-mcp-playground.<your-subdomain>.workers.dev
```

---

## 7. 在主流 AI 客戶端中使用

### 7.1 在 Claude Desktop 中配置
開啟設定檔 `claude_desktop_config.json`：
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

加入以下設定：
```json
{
  "mcpServers": {
    "cf-mcp-remote": {
      "url": "https://cf-mcp-playground.tobywang2021.workers.dev/mcp"
    },
    "cf-mcp-local-docker": {
      "command": "docker",
      "args": ["exec", "-i", "cf-mcp-service", "node", "dist/node-server.js"]
    }
  }
}
```

### 7.2 在 Cursor 中配置
1. 開啟 Cursor $\rightarrow$ 進入 `Settings` $\rightarrow$ `Features` $\rightarrow$ `MCP Servers`。
2. 點擊 `+ Add New MCP Server`：
   - **Name**: `cf-mcp-service`
   - **Type**: `sse`
   - **URL**: `http://localhost:3000/sse`（本地）或 `https://cf-mcp-playground.tobywang2021.workers.dev/mcp`（線上）

---

## 8. MCP 工具清單與 REST API 規格

### 8.1 MCP Tools 清單

| 工具名稱 | 參數 (JSON Schema) | 說明與功能 |
| :--- | :--- | :--- |
| **`explain_mcp_skill`** | `topic`: `'skills' \| 'tools' \| 'resources' \| 'prompts' \| 'architecture' \| 'all'` | 詳細介紹 MCP 協議架構與 Skill 定義，並比對 Tools/Resources/Prompts 差異。 |
| **`get_mcp_quickstart`** | `client`: `'claude-desktop' \| 'cursor' \| 'docker' \| 'cloudflare' \| 'all'` | 取得各 AI 客戶端或部署環境的完整快速上手設定檔與命令。 |
| **`list_mcp_concepts`** | `category`: `'overview' \| 'skills' \| 'tools' \| 'resources' \| 'prompts' \| 'all'` | 檢索知識庫中所有核心概念項目與標籤。 |
| **`ask_mcp_assistant`** | `question`: `string` (必填) | 智能問答，**內建 Redis 快取**，相同問題將以 $1\text{ms}$ 極速從快取直接回答。 |
| **`get_cache_stats`** | *(無參數)* | 檢視 Redis 快取連線狀態、命中數 (Hits)、未命中數 (Misses) 與項目總數。 |
| **`clear_mcp_cache`** | *(無參數)* | 清空目前 Redis/Memory 快取中的所有問答資料。 |

---

### 8.2 HTTP REST API 規格

除了標準 MCP 協議外，本服務亦提供便利的 REST API：

#### 1. 提問與快取 API (`POST /api/ask`)
- **URL**: `/api/ask`
- **Method**: `POST`
- **Request Body**:
  ```json
  {
    "question": "什麼是 MCP Skill？"
  }
  ```
- **Response (首次提問 - Cache MISS)**:
  ```json
  {
    "cached": false,
    "responseTimeMs": 2,
    "cacheKey": "mcp:qa:1ot2ui",
    "originalQuestion": "什麼是 MCP Skill？",
    "answer": "### 什麼是 MCP Skill？...",
    "cachedAt": "2026-08-24T03:36:46.698Z"
  }
  ```
- **Response (重複提問 - Cache HIT ⚡)**:
  ```json
  {
    "cached": true,
    "responseTimeMs": 0,
    "originalQuestion": "什麼是 MCP Skill？",
    "answer": "### 什麼是 MCP Skill？...",
    "cachedAt": "2026-08-24T03:36:46.698Z"
  }
  ```

#### 2. 快取狀態查詢 (`GET /api/cache/stats`)
```bash
curl http://localhost:3000/api/cache/stats
```
**Response**:
```json
{
  "hits": 12,
  "misses": 3,
  "keysCount": 3,
  "type": "redis",
  "connected": true
}
```

#### 3. 清空快取 (`POST /api/cache/clear`)
```bash
curl -X POST http://localhost:3000/api/cache/clear
```

---

## 9. 如何擴充與新增自定義 MCP Tools

如果您想要擴充此 MCP 服務，新增您自己的商業邏輯或工具，只需修改以下兩個核心檔案：

### 步驟 1：在 `src/knowledge/mcp-data.ts` 加入知識主題（可選）
```typescript
export const MCP_KNOWLEDGE_BASE: MCPTopic[] = [
  // ... 現有主題
  {
    id: "my-custom-topic",
    title: "自定義主題標題",
    category: "tools",
    summary: "主題簡述...",
    content: "詳細的 Markdown 格式內容...",
    tags: ["custom", "guide"],
  }
];
```

### 步驟 2：在 `src/mcp/server.ts` 註冊新 Tool
在 `ListToolsRequestSchema` 與 `CallToolRequestSchema` 中加入您的工具：

```typescript
// 1. 宣告工具定義與參數 Schema
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      // ... 現有工具
      {
        name: "my_new_tool",
        description: "工具的功能說明，供 LLM 判斷何時調用",
        inputSchema: {
          type: "object",
          properties: {
            target: { type: "string", description: "目標對象" }
          },
          required: ["target"]
        }
      }
    ]
  };
});

// 2. 實作工具執行邏輯
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  
  if (name === "my_new_tool") {
    const target = args.target as string;
    // 執行自定義計算、API 呼叫或資料庫讀寫...
    return {
      content: [
        {
          type: "text",
          text: `成功執行工具！處理目標為：${target}`
        }
      ]
    };
  }
  
  // ...
});
```

### 步驟 3：測試與重新部署
```bash
# 1. 本地驗證
npm test

# 2. 部署至 Cloudflare Workers
npm run deploy

# 3. 或重新建置 Docker 容器
docker compose up --build -d
```
