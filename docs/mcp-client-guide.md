# 智慧交通 MCP 伺服器 — AI 客戶端整合與使用指南
## AI Client Integration Guide (Claude Desktop, Cursor, ChatGPT, Cline, Zed)

本指南說明如何將部署在 Cloudflare Worker 的 **智慧交通情境感知 MCP 伺服器** 連接至各類主流 AI 介面（如 Claude Desktop、Cursor、ChatGPT Custom GPTs、VS Code Cline 等），讓大語言模型具備全台即時交通、停車位、充電站、YouBike、路況避堵與雙鐵動態的感知能力。

---

## 📡 1. 核心連線資訊與端點

| 協議類型 | 連線 URL (Endpoint) | 說明 |
| :--- | :--- | :--- |
| **Streamable HTTP (推薦)** | `https://<YOUR_WORKER_URL>/mcp` | 標準 MCP 2024-11-05 規範，支援 POST JSON-RPC 雙向流 |
| **Server-Sent Events (SSE)** | `https://<YOUR_WORKER_URL>/sse` | 適用於僅支援 SSE 模式的客戶端 (如 Cursor, Zed) |
| **REST API (適用 ChatGPT Action)** | `https://<YOUR_WORKER_URL>/api/transport/context` | 適用於 OpenAI Custom GPTs 的標準 OpenAPI 規範 |

### 🔑 身份驗證方式 (Authentication)
在請求中附加你的 Token（享有 Dev 0頻控 或 VIP 15秒刷新）：
* **方式 A (Header)**：`Authorization: Bearer <YOUR_TOKEN>`
* **方式 B (Query String)**：`https://<YOUR_WORKER_URL>/sse?token=<YOUR_TOKEN>`

---

## 💻 2. 各大 AI 客戶端設定方法

### 2.1 Claude Desktop 設定

編輯 Claude Desktop 設定檔：
* **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
* **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

使用 `mcp-remote` 連接遠端 Cloudflare Worker：

```json
{
  "mcpServers": {
    "taiwan-transport": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "https://<YOUR_WORKER_URL>/sse?token=<YOUR_TOKEN>"
      ]
    }
  }
}
```

> 💡 **提示**：儲存後重啟 Claude Desktop，點擊右下角 🔌 即可看到 14 個交通工具與情境感知能力！

---

### 2.2 Cursor IDE 設定

1. 打開 Cursor ➔ 點擊右上角 **⚙️ Settings** ➔ **Features** ➔ **MCP**。
2. 點擊 **+ Add New MCP Server**。
3. 填寫以下資訊：
   * **Name**: `Taiwan Transport MCP`
   * **Type**: `SSE`
   * **Server URL**: `https://<YOUR_WORKER_URL>/sse?token=<YOUR_TOKEN>`
4. 點擊 Save，狀態燈顯示 🟢 綠燈即可在 Cursor Composer 中使用 `@Taiwan Transport MCP`。

---

### 2.3 VS Code (Cline / Roo Code / Continue) 設定

在 VS Code 的 Cline / Roo Code 擴充功能設定中，編輯 `cline_mcp_settings.json`：

```json
{
  "mcpServers": {
    "taiwan-transport": {
      "type": "sse",
      "url": "https://<YOUR_WORKER_URL>/sse?token=<YOUR_TOKEN>"
    }
  }
}
```

---

### 2.4 ChatGPT (Custom GPTs / Actions 設定)

若你想在 **ChatGPT (GPT-4o)** 中使用，可利用 OpenAI 的 **Custom Actions**：

1. 前往 [ChatGPT Custom GPTs 建立頁面](https://chatgpt.com/gpts/editor)。
2. 在 **Configure** 標籤頁下方點擊 **Create new action**。
3. 在 **Schema** 中貼上以下 OpenAPI 3.0 定義（將 `servers.url` 替換為你的 Worker 網址）：

```yaml
openapi: 3.0.1
info:
  title: Taiwan Context Transport API
  description: 即時感知身分、狀態與經緯度之台灣交通決策 API
  version: 2.2.0
servers:
  - url: https://<YOUR_WORKER_URL>
paths:
  /api/transport/context:
    post:
      summary: 取得周邊即時交通情境感知分析
      operationId: getTransportContext
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                identity:
                  type: string
                  enum: [car, ev, scooter, bike, transit, pedestrian]
                  description: 交通身分 (汽車/電動車/機車/單車/大眾運輸)
                state:
                  type: string
                  enum: [cruising, urgent, commute_in, commute_out, rain_fallback]
                  description: 當前狀態意圖 (漫遊/趕時間/上班/下班/雨天)
                latitude:
                  type: number
                  description: 目前位置緯度 (WGS84)
                longitude:
                  type: number
                  description: 目前位置經度 (WGS84)
                location_name:
                  type: string
                  description: 位置地名 (選填)
              required: [identity, state, latitude, longitude]
      responses:
        '200':
          description: 成功回傳情境與即時指標
  /api/transport/route:
    post:
      summary: 規劃情境全旅程路徑（結合施工避讓與目的地停車指引）
      operationId: planContextualRoute
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                origin:
                  type: object
                  properties:
                    name: { type: string }
                    latitude: { type: number }
                    longitude: { type: number }
                destination:
                  type: object
                  properties:
                    name: { type: string }
                    latitude: { type: number }
                    longitude: { type: number }
                identity:
                  type: string
                  enum: [car, ev, scooter, bike, transit]
                urgency:
                  type: string
                  enum: [normal, high]
              required: [origin, destination, identity]
      responses:
        '200':
          description: 成功回傳全旅程導航策略報告
```

4. 在 **Authentication** 選擇 **Bearer**，貼上你的 Token 即可！

---

## 🛠️ 3. 核心工具能力一覽

| 工具名稱 (Tool) | 階層 | 功能說明 |
| :--- | :--- | :--- |
| **`get_transport_context`** | 🌟 高階情境 | 依身分與狀態，並行索取周邊停車/充電/YouBike/路況並綜合推理評分 |
| **`plan_contextual_route`** | 🌟 高階導航 | 產生全旅程策略：起點狀況 ➔ 沿途施工避讓 ➔ 目的地最優停車場/還車指引 |
| `get_nearby_parking` | 原子工具 | 查詢指定座標周邊剩餘車位、費率、距離與空位率 |
| `get_nearby_ev_chargers` | 原子工具 | 查詢周邊可用快充/慢充槍數與支援規格 (CCS1/CCS2/TPC) |
| `get_nearby_youbike` | 原子工具 | 查詢 YouBike 2.0 即時可借車數與可還空格數 |
| `get_traffic_incidents` | 原子工具 | 查詢周邊即時施工管制、交通事故與壅塞回堵通報 |
| `get_bus_estimated_arrival` | 原子工具 | 查詢特定公車路線與站牌之即時動態預估到站時間 |
| `get_rail_live_board` | 原子工具 | 查詢台鐵 (tra) 或高鐵 (thsr) 車站即時發車月台與延誤看板 |

---

## 💬 4. 實用提問 Prompt 範例

直接對 Claude Desktop、Cursor 或 ChatGPT 提問即可觸發智慧交通工具：

### 🚗 情境 A：開車趕時間去重要會議
> **提問**：「我現在開車在『台北101商圈 (25.033964, 121.564468)』，要趕在 25 分鐘內到『台北車站 (25.047761, 121.517049)』開會。請幫我調用交通 MCP 規劃最佳路線，告訴我沿途有沒有施工避開，以及到了台北車站要停哪一個停車場最快、最不用排隊？」

### ⚡ 情境 B：電動車快沒電尋找快充
> **提問**：「我是 Tesla 車主 (支援 CCS2)，目前人在內湖科技園區港墘站附近，電量剩 12%。請幫我查周邊 1.5 公里內有哪些目前有空閒的快充樁？」

### 🚲 情境 C：下班租借 YouBike 通勤
> **提問**：「我準備從捷運市政府站下班騎 YouBike 回信義國中，請幫我確認現在市政府站附近哪一個站點還有車可以借，並確認目的地站點有沒有足夠的空格可以還車？」

### 🌧️ 情境 D：突發大雨切換雨天避難模式
> **提問**：「現在外頭突然下大雨，我原本打算走路，目前在板橋車站附近，請調用 `get_transport_context`（身分: transit, 狀態: rain_fallback）幫我評估最快進室內轉乘的捷運或公車動線。」
