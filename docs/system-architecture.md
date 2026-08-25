# 智慧交通情境感知 MCP 伺服器與 PWA 應用系統架構文件
## System Architecture, Capabilities & Implementation Logic

> **專案名稱**：`cf-mcp-playground` (Context-Aware Transportation MCP & PWA)  
> **運行架構**：Cloudflare Workers (Edge Serverless) + Hono + @modelcontextprotocol/sdk  
> **前端架構**：Progressive Web App (PWA) + Leaflet.js 地圖選點 + 本地狀態持久化  
> **資料來源**：交通部 TDX (Transport Data eXchange) 開放資料平台  
> **版本**：v2.2.0  
> **備註**：本文件為公開架構說明，無任何機密金鑰或敏感憑證。

---

## 📑 目錄

1. [系統能力總覽 (Capabilities Overview)](#1-系統能力總覽)
2. [核心分層架構 (3-Tier Hierarchical Architecture)](#2-核心分層架構)
3. [身分權限與頻率限制機制 (Tiered Auth & Rate Limiting)](#3-身分權限與頻率限制機制)
4. [前端 PWA 與狀態持久化實現邏輯 (PWA State & Persistence)](#4-前端-pwa-與狀態持久化實現邏輯)
5. [高階情境推理與路徑決策邏輯 (Context & Routing Engine)](#5-高階情境推理與路徑決策邏輯)
6. [空間網格快取與 TDX 頻控防護 (Geo-Grid Spatial Caching)](#6-空間網格快取與-tdx-頻控防護)
7. [API 與 MCP 端點規格 (API & MCP Specification)](#7-api-與-mcp-端點規格)
8. [未來擴充與維護指南 (Maintenance & Roadmap)](#8-未來擴充與維護指南)

---

## 1. 系統能力總覽

本系統提供「懂使用者意圖與身分」的即時智慧交通服務，核心功能包含：

* **身分與狀態多維感知**：
  * 支援 6 種交通身分：汽車 (`car`)、電動車 (`ev`)、機車 (`scooter`)、YouBike/單車 (`bike`)、大眾運輸 (`transit`)、步行 (`pedestrian`)。
  * 支援 5 種狀態意圖：無目的地漫遊 (`cruising`)、趕時間 (`urgent`)、通勤上班 (`commute_in`)、下班返家 (`commute_out`)、雨天避難 (`rain_fallback`)。
* **高階情境自動拆解**：
  * 輸入 High-Level 身分與狀態，系統自動並行向低階原子模組（停車位、充電站、YouBike、路況施工、雙鐵捷運）索取即時資料，並在邊緣進行加權評分。
* **情境全旅程路徑規劃**：
  * 起點借車率預警 ➔ 沿途事故施工自動避讓 ➔ 目的地最優停車場/快充站/還車空位指引 + 大眾運輸備選方案。
* **PWA 原生級體驗**：
  * 支援手機「加入主畫面」全螢幕運行、離線秒開快取。
  * 整合 HTML5 GPS 即時定位與 Leaflet 互動地圖任意選點。
  * 支援出發地與目的地雙向管理、自訂常用地點別稱（如「🏠 家」、「🏢 公司」）。
  * 交通身分、狀態、出發地與目的地**自動持久化儲存 (localStorage)**，重啟自動復原。
* **三級身分權限控管**：
  * `dev` (開發者 - 無限制)、`vip` (VIP用戶 - 15秒高頻刷新)、`guest` (訪客 - 60秒 IP 限流保護)。

---

## 2. 核心分層架構

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                         前端展示層 (Presentation Tier)                          │
│             PWA Web App (GitHub Pages) / AI Client (Claude/Cursor)               │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │ HTTPS / MCP Streamable HTTP / SSE
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│                   Cloudflare Worker 邊緣閘道 (Edge Gateway)                      │
│                                                                                  │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │                 Auth & Rate Limiting Middleware (鑑權與頻控)             │   │
│   │   - 識別 Dev (0s) / VIP (15s) / Guest (60s IP 滑動窗口)                  │   │
│   └────────────────────────────────────┬─────────────────────────────────────┘   │
│                                        │                                         │
│                                        ▼                                         │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │               High-Level Context & Journey Engine (推理層)               │   │
│   │   - evaluateTransportContext(): 情境總結、行動建議、風險預警             │   │
│   │   - planContextualRoute(): 全旅程導航、施工繞行、目的地停車指引          │   │
│   └────────────────────────────────────┬─────────────────────────────────────┘   │
│                                        │ 並行調度 (Promise.all)                  │
│                                        ▼                                         │
│   ┌──────────────────────────────────────────────────────────────────────────┐   │
│   │             Low-Level Atomic Data & Geo-Grid Cache (資料快取層)          │   │
│   │   - 100m 空間網格快取 (Key: tdx:geo:parking:25.034:121.564)              │   │
│   │   - Cache HIT (<1ms) ➔ 立即回傳                                          │   │
│   │   - Cache MISS ➔ 呼叫 TDX Client 擷取並回填快取                          │   │
│   └────────────────────────────────────┬─────────────────────────────────────┘   │
│                                        │                                         │
└────────────────────────────────────────┼─────────────────────────────────────────┘
                                         │ OAuth 2.0 Bearer Token (23h 快取)
                                         ▼
                        ┌─────────────────────────────────┐
                        │   交通部 TDX 開放資料平台       │
                        │ (Parking, EV, YouBike, Traffic) │
                        └─────────────────────────────────┘
```

---

## 3. 身分權限與頻率限制機制

為防止公開 API 被惡意刷量耗盡 TDX 配額，後端採用三級頻控：

| 角色 (Role) | 識別方式 (Token) | 輪詢冷卻時間 (Cooldown) | 每日配額 (Daily Quota) | 權限與特性 |
| :--- | :--- | :--- | :--- | :--- |
| **`dev` (開發者)** | `DEV_SECRET_KEY` 或前綴 `dev_` | **0 秒 (無限制)** | 999,999 次 | 無限制調試、支援快取穿透 |
| **`vip` (VIP 用戶)** | `VIP_SECRET_KEYS` 清單或前綴 `vip_` | **15 秒** | 1,000 次 | 高頻更新、全功能情境路徑規劃 |
| **`guest` (一般訪客)** | 未帶 Token 或無效 Token | **60 秒** | 60 次 (依 IP) | 基礎情境查詢，過頻回傳 HTTP 429 |

### 實作位置：
* 中間件程式碼：[`src/middlewares/auth.ts`](file:///home/toby/projects/Github/cf-mcp-playground/src/middlewares/auth.ts)
* 查詢自身狀態端點：`GET /api/auth/status`

---

## 4. 前端 PWA 與狀態持久化實現邏輯

### 4.1 本地儲存鍵值表 (`localStorage`)

| 鍵名 (Storage Key) | 內容型別 | 說明 |
| :--- | :--- | :--- |
| `transport_mcp_token` | `string` | 使用者目前的身分 Token (URL 帶入或設定輸入) |
| `transport_pref_identity` | `string` | 使用者選定的交通身分 (`car`, `ev`, `scooter`, `bike`, `transit`) |
| `transport_pref_state` | `string` | 使用者選定的狀態意圖 (`cruising`, `urgent`, `commute_in`...) |
| `transport_pref_origin` | `JSON Object` | 出發地名稱與經緯度 `{ name, latitude, longitude }` |
| `transport_pref_dest` | `JSON Object` | 目的地名稱與經緯度 `{ name, latitude, longitude }` |
| `transport_pref_favorites` | `JSON Array` | 自訂常用地點清單 `[{ id, alias, name, latitude, longitude }]` |

### 4.2 網址 Token 自動識別與免輸入技術
當使用者點開 `https://<host>/?token=showmethemoney`：
1. `app.js` 的 `syncUrlToken()` 於頁面載入時解析 `window.location.search`。
2. 自動寫入 `localStorage.setItem("transport_mcp_token", token)`。
3. 調用 `window.history.replaceState` 清除網址列參數，維持乾淨美觀。
4. 往後發送請求自動在 Header 附加 `Authorization: Bearer <token>`。

### 4.3 常用地點與自訂別稱管理
* 使用者可點擊頂部 **⭐️ 按鈕** 開啟常用地點管理。
* 支援將當前出發地以自訂別稱（如「🏠 我的家」、「🏢 內科辦公室」）儲存。
* 支援一鍵設為出發地、設為目的地或刪除。

---

## 5. 高階情境推理與路徑決策邏輯

### 5.1 周邊情境推理 (`evaluateTransportContext`)
* **實作位置**：[`src/services/context/evaluator.ts`](file:///home/toby/projects/Github/cf-mcp-playground/src/services/context/evaluator.ts)
* **邏輯流程**：
  1. 依據身分動態判定子需求：汽車/電動車 ➔ 查停車場；單車 ➔ 查 YouBike；電動車 ➔ 查快充；全體 ➔ 查路況事件。
  2. 使用 `Promise.all` 並行查詢。
  3. 加權評分：
     * 若周邊 500m 內車位 < 10 格 ➔ 觸發 `alert` 停車枯竭預警。
     * 若 YouBike 站點可借數 $\le 2$ ➔ 觸發 `bike_depleted` 車位即將無車預警。
     * 結合路況事件回堵時間評估車速等級 (`smooth`, `moderate`, `heavy`, `gridlock`)。

### 5.2 全旅程情境路徑規劃 (`planContextualRoute`)
* **實作位置**：[`src/services/context/router.ts`](file:///home/toby/projects/Github/cf-mcp-playground/src/services/context/router.ts)
* **邏輯流程**：
  1. 計算起訖點距離與預估基礎行車時間。
  2. 同步查詢目的地停車位（篩選剩餘最多之推薦場）、快充站與 YouBike 還車空格。
  3. 查詢沿途施工與事故管制，自動產生避讓說明。
  4. 產出捷運/大眾運輸避堵之備選方案。

---

## 6. 空間網格快取與 TDX 頻控防護

### 6.1 空間網格化取整算法 (Spatial Grid Rounding)
* **實作位置**：[`src/services/tdx/geo.ts`](file:///home/toby/projects/Github/cf-mcp-playground/src/services/tdx/geo.ts)
* **公式**：
  $$\text{GridKey} = \text{category} + ":" + \text{round}(\text{lat}, 3) + ":" + \text{round}(\text{lon}, 3)$$
* **效果**：相差 100 公尺以內的相鄰使用者共用同一快取資料，大幅降低 TDX 伺服器負載。

---

## 7. API 與 MCP 端點規格

### 7.1 REST 端點

| HTTP Method | 路徑 | 說明 | 鑑權要求 |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/transport/context` | 查詢即時周邊情境分析 | 支援 Token 或 Guest 限流 |
| `POST` | `/api/transport/route` | 查詢情境全旅程導航策略 | 支援 Token 或 Guest 限流 |
| `GET` | `/api/auth/status` | 查詢目前 Token 身分與頻控餘額 | 公開 |
| `GET` | `/health` | 服務健康檢查與快取狀態 | 公開 |

### 7.2 MCP Protocol 端點

* **端點路徑**：`/mcp` (Streamable HTTP) 與 `/sse` (Server-Sent Events)
* **核心工具**：
  * `get_transport_context` (High-Level)
  * `plan_contextual_route` (High-Level)
  * `get_nearby_parking` (Atomic)
  * `get_nearby_ev_chargers` (Atomic)
  * `get_nearby_youbike` (Atomic)
  * `get_traffic_incidents` (Atomic)
  * `get_bus_estimated_arrival` (Atomic)
  * `get_rail_live_board` (Atomic)

---

## 8. 未來擴充與維護指南

1. **新增常用商圈預設點**：直接編輯 [`web/scripts/location.js`](file:///home/toby/projects/Github/cf-mcp-playground/web/scripts/location.js) 之 `DEFAULT_PRESET_LOCATIONS` 陣列。
2. **調整身分冷卻時間 (Rate Limit)**：直接編輯 [`src/middlewares/auth.ts`](file:///home/toby/projects/Github/cf-mcp-playground/src/middlewares/auth.ts) 之 `cooldownMs` 與 `dailyQuota`。
3. **新增 TDX 資料來源**：於 [`src/services/tdx/client.ts`](file:///home/toby/projects/Github/cf-mcp-playground/src/services/tdx/client.ts) 擴充原子方法，並於 [`src/mcp/server.ts`](file:///home/toby/projects/Github/cf-mcp-playground/src/mcp/server.ts) 註冊新 Tool。
