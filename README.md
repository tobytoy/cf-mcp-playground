# cf-mcp-playground

Cloudflare Worker 與 Docker 雙運行環境的 **Model Context Protocol (MCP)** 服務，內建 **MCP Skills 知識庫** 與 **Redis 提問快取加速** 機制。

---

## 🌟 核心特色

1. **雙重運行環境 (Dual Runtime)**：
   - ⛅ **Cloudflare Workers**：支援 Edge 邊緣全球部署，極速冷啟動與低延遲。
   - 🐳 **Docker & Node.js**：提供 `docker-compose.yml`，一鍵啟動 MCP 服務與 Redis 容器。
2. **MCP Skills 知識庫**：
   - 完整介紹什麼是 MCP、什麼是 MCP Skill。
   - 詳細比較 **Tools (工具)**、**Resources (資源)**、**Prompts (提示詞)** 的差異與組合模式。
   - 提供各大客戶端 (Claude Desktop, Cursor, Zed, Cloudflare) 的配置指南。
3. **Redis 重複提問秒級直答 (Smart Caching)**：
   - 當使用者提問時，系統會自動標準化問題並計算快取鍵。
   - **Cache HIT (命中)**：直接從 Redis 毫秒級回傳歷史快取結果，大幅節省 Token 與延遲。
   - **Cache MISS (未命中)**：檢索知識庫生成完整回答，自動快取至 Redis。
   - 支援 Redis 斷線自動降級為記憶體快取 (Memory Fallback)，確保高可用性。

---

## 🛠️ MCP Tools & Capabilities

| 工具名稱 | 說明 |
| :--- | :--- |
| `explain_mcp_skill` | 詳細介紹什麼是 MCP 與 MCP Skill，以及與 Tool/Resource/Prompt 的差別與範例。 |
| `get_mcp_quickstart` | 取得 MCP 在 Claude Desktop, Cursor, Docker, Cloudflare 的快速安裝指南。 |
| `list_mcp_concepts` | 列出知識庫中所有核心概念清單。 |
| `ask_mcp_assistant` | 智能問答工具，內建 Redis 快取，重複問題直接從快取極速回答。 |
| `get_cache_stats` | 檢視 Redis 快取的命中次數 (Hits)、未命中次數 (Misses) 與總項目數。 |
| `clear_mcp_cache` | 清空快取記錄。 |

---

## 🚀 快速開始

### 方式一：使用 Docker 啟動 (包含 Redis)

```bash
# 啟動 MCP 服務與 Redis 容器
docker compose up --build -d

# 查看運行日誌
docker compose logs -f

# 停止服務
docker compose down
```

服務啟動後：
- 服務首頁 / 儀表板：`http://localhost:3000/`
- MCP 串流通訊端點：`http://localhost:3000/mcp` 或 `http://localhost:3000/sse`
- 健康檢查端點：`http://localhost:3000/health`
- REST 問答 API：`POST http://localhost:3000/api/ask`

---

### 方式二：本機開發模式 (Node.js)

```bash
# 安裝依賴
npm install

# 執行單元測試 (驗證 MCP Tools & 快取機制)
npm test

# 啟動本機開發伺服器
npm run dev:node
```

---

### 方式三：部署至 Cloudflare Workers

#### 1. 登入 Cloudflare
在終端機中執行：
```bash
npx wrangler login
```
*瀏覽器會自動開啟進行 Cloudflare 帳號授權。*

> **若使用 CI/CD 或 API Token 登入**：
> ```bash
> export CLOUDFLARE_API_TOKEN="你的 Cloudflare API Token"
> export CLOUDFLARE_ACCOUNT_ID="你的 Cloudflare Account ID"
> ```

#### 2. 測試 Worker 本機模擬
```bash
npm run dev:worker
```

#### 3. 部署到 Cloudflare 全球邊緣網路
```bash
npm run deploy
```
部署成功後，即可獲得專屬的 Worker 網址（例如 `https://cf-mcp-playground.<your-subdomain>.workers.dev/mcp`）。

---

## 🔌 在 AI 客戶端中使用

### 1. Claude Desktop 配置

編輯 `claude_desktop_config.json`：

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "cf-mcp-remote": {
      "url": "https://<your-worker>.workers.dev/sse"
    },
    "cf-mcp-docker": {
      "command": "docker",
      "args": ["exec", "-i", "cf-mcp-service", "node", "dist/node-server.js"]
    }
  }
}
```

### 2. Cursor 配置

在 Cursor 介面中進入 `Settings` -> `Features` -> `MCP Servers` -> `Add New MCP Server`：
- **Name**: `cf-mcp-service`
- **Type**: `sse`
- **URL**: `http://localhost:3000/sse` (本地 Docker) 或 `https://<your-worker>.workers.dev/sse` (遠端 Worker)

---

## 🧪 測試驗證範例

### 1. 測試 REST API 提問 (首次提問 - Cache MISS)
```bash
curl -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "什麼是 MCP Skill？"}'
```

### 2. 測試相同提問 (重複提問 - Cache HIT ⚡)
```bash
curl -X POST http://localhost:3000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "什麼是 MCP Skill？"}'
```

### 3. 查看快取統計
```bash
curl http://localhost:3000/api/cache/stats
```
