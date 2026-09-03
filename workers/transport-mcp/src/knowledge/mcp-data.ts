/**
 * MCP (Model Context Protocol) & Skills Knowledge Base
 */

export interface MCPTopic {
  id: string;
  title: string;
  category: "overview" | "skills" | "tools" | "resources" | "prompts" | "transports" | "clients" | "deployment" | "faq";
  summary: string;
  content: string;
  tags: string[];
}

export const MCP_KNOWLEDGE_BASE: MCPTopic[] = [
  {
    id: "what-is-mcp",
    title: "什麼是 Model Context Protocol (MCP)？",
    category: "overview",
    summary: "MCP 是一個開源標準協議，讓 AI 模型能夠安全、標準化地連接外部資料來源、工具與服務。",
    tags: ["mcp", "overview", "protocol", "architecture"],
    content: `### 什麼是 Model Context Protocol (MCP)？

Model Context Protocol (MCP) 是由 Anthropic 推出的開放標準協議（Open Standard Protocol），被譽為 **「AI 應用的 USB-C 接口」**。

#### 核心目標
在 MCP 出現之前，每個 AI 應用（如 Claude、Cursor、ChatGPT、自建 Agent）如果要連接外部資料庫、API 或工具，都需要個別撰寫客製化 Plugin 或整合代碼。MCP 制定了一套統一的客戶端-伺服器（Client-Server）協議，讓任何 AI 應用（Host/Client）都能無縫接入任何 MCP 伺服器（Server）。

#### MCP 核心架構
1. **MCP Host**：發起請求的 AI 應用程式（例如 Claude Desktop、Cursor、Zed、LangChain 框架等）。
2. **MCP Client**：在 Host 內部實作 MCP 協議的客戶端模組，負責與 MCP Server 建立通訊通道。
3. **MCP Server**：輕量級服務程式，負責向 AI 暴露具體的能力（Tools）、資源（Resources）與提示詞模板（Prompts）。
4. **Data Sources / Services**：實際底層的資料來源（如 Local Files、PostgreSQL、GitHub、Redis、Cloudflare Workers 等）。

#### 主要傳輸協定 (Transports)
- **Stdio Transport**：透過標準輸入輸出（stdin/stdout）進行處理，適合本機執行的 CLI 工具與本地腳本。
- **SSE Transport (Server-Sent Events)**：透過 HTTP + SSE 進行即時雙向通訊，適合雲端部署（如 Cloudflare Workers、Docker 容器、遠端 API 服務）。
- **Stream Transport**：支援現代環境的串流傳輸。`
  },
  {
    id: "what-is-mcp-skill",
    title: "什麼是 MCP Skill？與 Tool、Resource、Prompt 的差別是什麼？",
    category: "skills",
    summary: "MCP Skill 代表 AI 具備的特定專業能力與動作集合，通常由 Tools、Resources 和 Prompts 組合而成。",
    tags: ["skill", "tools", "resources", "prompts", "comparison"],
    content: `### 什麼是 MCP Skill？

在 MCP 生態系中，**Skill（技能）** 指的是 AI 代理（Agent）透過 MCP 所獲得的 **「特定領域端到端能力」**。

一個完整的 MCP Skill 通常結合了以下三個 MCP 核心原語（Primitives）：

---

### MCP 三大核心原語比較

| 概念 | 角色定位 | 誰發起 | 典型用途 | 範例 |
| :--- | :--- | :--- | :--- | :--- |
| **Tools (工具)** | AI 可執行的可調用函數 (可產生副作用) | **模型決定調用** | 執行計算、發送 API、寫入資料庫、執行命令 | \`query_database\`, \`deploy_worker\`, \`send_email\` |
| **Resources (資源)** | 提供給 AI 閱讀的上下文資料 (唯讀) | **客戶端/使用者附加** | 讀取檔案、取得日誌、API 文件、即時數據 | \`file:///logs/app.log\`, \`postgres://users/schema\` |
| **Prompts (提示詞)** | 預定義的提示詞範本與引導工作流 | **使用者選取觸發** | 程式碼重構引導、程式碼審查、問題排查流程 | \`review_pr\`, \`debug_error\`, \`generate_test\` |

---

### 一個典型的 MCP Skill 範例：Cloudflare 運維 Skill
- **Resource**: 提供 \`cf://worker/status\` 讓 AI 讀取當前 Worker 狀態。
- **Tool**: 提供 \`deploy_cf_worker\` 讓 AI 執行自動化部署。
- **Prompt**: 提供 \`cf_incident_investigation\` 引導 AI 進行線上故障分析。

這三者組合在一起，就構成了強大的 **Cloudflare DevOps Skill**！`
  },
  {
    id: "how-to-use-mcp",
    title: "如何使用與配置 MCP 服務？(Claude Desktop / Cursor / Docker / Cloudflare)",
    category: "clients",
    summary: "在主流 AI 工具中設定 MCP 伺服器的完整設定檔範例與連線方式。",
    tags: ["setup", "config", "claude-desktop", "cursor", "docker", "cloudflare"],
    content: `### 如何在各客戶端使用 MCP 服務

#### 1. 在 Claude Desktop 中配置
在 Claude Desktop 的設定檔 \`claude_desktop_config.json\` 中加入 MCP Server：

- **macOS**: \`~/Library/Application Support/Claude/claude_desktop_config.json\`
- **Windows**: \`%APPDATA%\\Claude\\claude_desktop_config.json\`

\`\`\`json
{
  "mcpServers": {
    "cf-mcp-service": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "cf-mcp-playground-app-1",
        "node",
        "dist/node-server.js"
      ]
    },
    "cf-mcp-remote-sse": {
      "url": "https://your-worker-subdomain.workers.dev/sse"
    }
  }
}
\`\`\`

---

#### 2. 在 Cursor / VS Code 中配置
在 Cursor 的 Settings -> Features -> MCP Servers 中添加：
- **Name**: \`cf-mcp-service\`
- **Type**: \`sse\` (遠端 Cloudflare Worker) 或 \`command\` (本機 Node / Docker)
- **URL / Command**: \`http://localhost:3000/sse\` 或 \`https://your-worker.workers.dev/sse\`

---

#### 3. 使用 Docker 與 Redis 運行
本專案提供標準 \`docker-compose.yml\`：
\`\`\`bash
# 啟動 MCP 服務與 Redis
docker compose up -d

# 查看運行日誌
docker compose logs -f
\`\`\`

---

#### 4. 部署至 Cloudflare Workers
透過 Wrangler 即可秒級全球部署：
\`\`\`bash
# 登入 Cloudflare
npx wrangler login

# 部署至 Cloudflare Workers
npm run deploy
\`\`\``
  },
  {
    id: "mcp-best-practices",
    title: "開發 MCP 伺服器的最佳實踐與安全指南",
    category: "tools",
    summary: "設計高品質、安全、穩定的 MCP Tool 與 Resource 的工程指引。",
    tags: ["best-practices", "security", "design", "development"],
    content: `### 開發 MCP 伺服器的最佳實踐

#### 1. 命名與描述清晰 (Critical for LLM)
- **Tool 命名**: 使用清晰的動詞+名詞組合，如 \`explain_mcp_skill\`、\`search_documents\`。
- **Description 說明**: LLM 依賴 Tool 的 Description 來判斷何時調用該工具。請務必詳細說明**功能**、**參數限制**以及**使用時機**。
- **Schema 驗證**: 使用 Zod 定義強型別參數驗證，提供預設值與詳細欄位描述。

#### 2. 錯誤處理與防禦性設計
- 工具內部發生錯誤時，應回傳結構化的錯誤文字說明，而不是直接崩潰伺服器。
- 讓 LLM 能夠理解錯誤原因（例如「缺少 API Key」、「資料庫查無此 ID」）並嘗試自我修復或向使用者詢問。

#### 3. 快取與效能優化 (Redis Caching)
- 對於昂貴的 LLM 運算或重複問題，使用 Redis 或 Cloudflare KV 快取查詢結果。
- 快取鍵值標準化（去除前後空白、統一小寫、雜湊比對）。

#### 4. 安全原則
- **最小權限原則**：只開放必要的 Tools 與 Resources。
- **敏感資料保護**：不要在 Tool 回傳值中洩漏未經脫敏的密鑰或個資。`
  },
  {
    id: "redis-caching-design",
    title: "MCP 服務中的 Redis 快取架構與重複問題即答機制",
    category: "deployment",
    summary: "如何利用 Redis 快取儲存使用者提問，當重複問題出現時直接命中快取回答。",
    tags: ["redis", "cache", "performance", "architecture"],
    content: `### Redis 快取與重複問題即答機制

#### 為什麼 MCP 服務需要 Redis 快取？
1. **降低延遲 (Sub-millisecond latency)**：重複的知識庫查詢或 LLM 生成可以直接在幾毫秒內回傳。
2. **節省成本 (Cost Saving)**：避免重複消耗 AI 模型 Token 費用。
3. **高併發承載 (High Throughput)**：Redis 能夠輕鬆應對數萬 QPS 的重複熱門問題。

#### 快取處理流程 (Cache Flow)
1. **接收提問**：使用者透過 MCP Tool (\`ask_mcp_assistant\`) 或 HTTP API 提問。
2. **標準化 Key**：去除標點空白、轉換為統一格式，產生 \`mcp:qa:<hash>\` 快取鍵。
3. **查詢 Redis**：
   - **Cache HIT (命中)**：從 Redis 讀取 JSON 物件，標註 \`cached: true\` 與時間戳記，立即回傳。
   - **Cache MISS (未命中)**：檢索知識庫並產生完整回答，寫入 Redis（設定 TTL 例如 24 小時），標註 \`cached: false\` 後回傳。`
  }
];

export function findTopicById(id: string): MCPTopic | undefined {
  return MCP_KNOWLEDGE_BASE.find(t => t.id.toLowerCase() === id.toLowerCase());
}

export function searchTopics(query: string): MCPTopic[] {
  const q = query.toLowerCase().trim();
  if (!q) return MCP_KNOWLEDGE_BASE;
  
  return MCP_KNOWLEDGE_BASE.filter(t => 
    t.title.toLowerCase().includes(q) ||
    t.summary.toLowerCase().includes(q) ||
    t.content.toLowerCase().includes(q) ||
    t.tags.some(tag => tag.toLowerCase().includes(q))
  );
}
