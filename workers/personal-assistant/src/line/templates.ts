import type { OutgoingLineMessage, LineQuickReply } from "../types/line";
import type { OcrResult } from "../tools/ocrDriveVault";
import type { PersonalTodoItem } from "../tools/personalTodo";

export const DEFAULT_QUICK_REPLY: LineQuickReply = {
  items: [
    {
      type: "action",
      action: {
        type: "message",
        label: "📋 功能總覽",
        text: "功能"
      }
    },
    {
      type: "action",
      action: {
        type: "message",
        label: "📝 生活待辦",
        text: "查看待辦"
      }
    },
    {
      type: "action",
      action: {
        type: "message",
        label: "🚲 附近YouBike",
        text: "幫我找附近的 YouBike"
      }
    },
    {
      type: "action",
      action: {
        type: "message",
        label: "☀️ 今天天氣",
        text: "今天天氣如何？"
      }
    },
    {
      type: "action",
      action: {
        type: "uri",
        label: "📱 開啟Mini App",
        uri: "https://miniapp.line.me/2011472036-bVXeg5I6"
      }
    }
  ]
};

/**
 * Interactive Dashboard Card for bfg007 (點擊卡片直接生效免打字).
 */
export function createDashboardFlexMessage(): OutgoingLineMessage {
  return {
    type: "flex",
    altText: "🐶 【bfg007 私人生活助理】快捷互動控制台",
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#4F46E5",
        paddingAll: "lg",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "🐶 bfg007 私人生活助理", weight: "bold", size: "md", color: "#FFFFFF", flex: 4 },
              { type: "text", text: "快捷控制台", size: "xs", color: "#C7D2FE", align: "end", flex: 2 }
            ]
          },
          {
            type: "text",
            text: "點擊下方卡片即可直接觸發各項生活服務 (免打字秒速回應)",
            size: "xxs",
            color: "#E0E7FF",
            margin: "xs"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "md",
        spacing: "md",
        contents: [
          // Row 1
          {
            type: "box",
            layout: "horizontal",
            spacing: "md",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#EEF2FF",
                paddingAll: "md",
                cornerRadius: "10px",
                flex: 1,
                action: { type: "message", text: "查看待辦清單" },
                contents: [
                  { type: "text", text: "📝 生活待辦", weight: "bold", size: "sm", color: "#3730A3" },
                  { type: "text", text: "查看與新增待辦", size: "xxs", color: "#6366F1", margin: "xs" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#F0FDF4",
                paddingAll: "md",
                cornerRadius: "10px",
                flex: 1,
                action: { type: "message", text: "幫我找附近的 YouBike" },
                contents: [
                  { type: "text", text: "🚲 找 YouBike", weight: "bold", size: "sm", color: "#166534" },
                  { type: "text", text: "周邊站點可借可還", size: "xxs", color: "#15803D", margin: "xs" }
                ]
              }
            ]
          },
          // Row 2
          {
            type: "box",
            layout: "horizontal",
            spacing: "md",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#F0F9FF",
                paddingAll: "md",
                cornerRadius: "10px",
                flex: 1,
                action: { type: "message", text: "今天天氣如何？會下雨嗎" },
                contents: [
                  { type: "text", text: "☀️ 即時天氣", weight: "bold", size: "sm", color: "#075985" },
                  { type: "text", text: "降雨機率與穿衣", size: "xxs", color: "#0284C7", margin: "xs" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#FEF3C7",
                paddingAll: "md",
                cornerRadius: "10px",
                flex: 1,
                action: { type: "uri", uri: "https://miniapp.line.me/2011472036-bVXeg5I6" },
                contents: [
                  { type: "text", text: "🎙️ 語音轉文字", weight: "bold", size: "sm", color: "#92400E" },
                  { type: "text", text: "開啟 Mini App 錄音", size: "xxs", color: "#B45309", margin: "xs" }
                ]
              }
            ]
          },
          // Row 3
          {
            type: "box",
            layout: "horizontal",
            spacing: "md",
            contents: [
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#ECFDF5",
                paddingAll: "md",
                cornerRadius: "10px",
                flex: 1,
                action: { type: "message", text: "📸 拍照單據功能" },
                contents: [
                  { type: "text", text: "📸 拍照 OCR", weight: "bold", size: "sm", color: "#065F46" },
                  { type: "text", text: "直接傳照片存 Drive", size: "xxs", color: "#059669", margin: "xs" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                backgroundColor: "#FDF2F8",
                paddingAll: "md",
                cornerRadius: "10px",
                flex: 1,
                action: { type: "message", text: "開啟 Discord 紀錄" },
                contents: [
                  { type: "text", text: "🔔 Discord 監控", weight: "bold", size: "sm", color: "#9D174D" },
                  { type: "text", text: "切換即時告警日誌", size: "xxs", color: "#BE185D", margin: "xs" }
                ]
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        paddingAll: "md",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#4F46E5",
            height: "sm",
            action: {
              type: "uri",
              label: "📱 開啟 Mini App 檔案庫",
              uri: "https://miniapp.line.me/2011472036-bVXeg5I6"
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "message",
              label: "📋 完整功能清單",
              text: "功能"
            }
          }
        ]
      }
    },
    quickReply: DEFAULT_QUICK_REPLY
  };
}

/**
 * Flex Message for Photo OCR & Drive Vault Result.
 */
export function createOcrVaultFlexMessage(result: OcrResult): OutgoingLineMessage {
  return {
    type: "flex",
    altText: `📸 【單據 OCR 與雲端歸檔完成】單號：${result.fileId}`,
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#059669",
        paddingAll: "lg",
        contents: [
          { type: "text", text: "📸 圖片文字辨識 (OCR) 與雲端硬碟歸檔", color: "#FFFFFF", weight: "bold", size: "sm" },
          { type: "text", text: `檔案流水號：${result.fileId} • 已存入 Google Drive`, color: "#E0F2FE", size: "xxs", margin: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          {
            type: "text",
            text: "💡 AI 智能重點摘要：",
            weight: "bold",
            size: "xs",
            color: "#059669"
          },
          {
            type: "text",
            text: result.summary || "已完成影像文字結構化分析。",
            size: "xs",
            color: "#1E293B",
            wrap: true,
            margin: "xs"
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "📝 OCR 提取全文紀錄：",
            weight: "bold",
            size: "xs",
            color: "#64748B",
            margin: "md"
          },
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F8FAFC",
            paddingAll: "md",
            cornerRadius: "6px",
            margin: "xs",
            contents: [
              {
                type: "text",
                text: result.ocrText.slice(0, 500) + (result.ocrText.length > 500 ? "..." : ""),
                size: "xxs",
                color: "#475569",
                wrap: true
              }
            ]
          },
          {
            type: "text",
            text: "📌 提示：此記錄已同步寫入 Google Sheet 第二頁，您可在 Mini App 中隨時預覽或一鍵刪除。",
            size: "xxs",
            color: "#94A3B8",
            margin: "md",
            wrap: true
          }
        ]
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        paddingAll: "md",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#059669",
            height: "sm",
            action: {
              type: "uri",
              label: "📂 開啟 Google Drive 原檔",
              uri: result.fileUrl || "https://drive.google.com/"
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "uri",
              label: "📱 開啟檔案倉庫",
              uri: "https://miniapp.line.me/2011472036-bVXeg5I6"
            }
          }
        ]
      }
    },
    quickReply: DEFAULT_QUICK_REPLY
  };
}

/**
 * Flex Message for Personal Todos List.
 */
export function createTodoFlexMessage(todos: PersonalTodoItem[]): OutgoingLineMessage {
  const activeTodos = todos.filter((t) => t.status === "進行中");
  const completedTodos = todos.filter((t) => t.status === "已完成");

  const rows = todos.slice(0, 6).map((t) => ({
    type: "box",
    layout: "horizontal",
    margin: "sm",
    contents: [
      {
        type: "text",
        text: t.status === "已完成" ? "✅" : "⏳",
        size: "xs",
        flex: 1
      },
      {
        type: "text",
        text: `[${t.category}] ${t.item}`,
        size: "xs",
        color: t.status === "已完成" ? "#94A3B8" : "#1E293B",
        wrap: true,
        flex: 7
      }
    ]
  }));

  return {
    type: "flex",
    altText: `📝 【生活待辦事項】目前共 ${activeTodos.length} 項進行中`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#4F46E5",
        paddingAll: "lg",
        contents: [
          { type: "text", text: "📝 個人生活待辦清單", color: "#FFFFFF", weight: "bold", size: "md" },
          { type: "text", text: `進行中：${activeTodos.length} 項 • 已完成：${completedTodos.length} 項 (與 Google Sheet 同步)`, color: "#E0E7FF", size: "xs", margin: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          ...rows,
          ...(todos.length === 0 ? [{ type: "text", text: "目前沒有任何待辦事項，輸入「待辦：...」即可新增！", size: "xs", color: "#64748B" }] : [])
        ]
      },
      footer: {
        type: "box",
        layout: "horizontal",
        paddingAll: "md",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#4F46E5",
            height: "sm",
            action: {
              type: "uri",
              label: "📱 開啟 Mini App 完整管理",
              uri: "https://miniapp.line.me/2011472036-bVXeg5I6"
            }
          }
        ]
      }
    },
    quickReply: DEFAULT_QUICK_REPLY
  };
}

export function createCalculatorFlexMessage(
  expression: string,
  result: number,
  explanation?: string
): OutgoingLineMessage {
  return {
    type: "flex",
    altText: `🧮 計算結果：${expression} = ${result}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0284C7",
        paddingAll: "lg",
        contents: [
          { type: "text", text: "🧮 智慧計算結果", color: "#FFFFFF", weight: "bold", size: "md" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          { type: "text", text: "運算式：", size: "xs", color: "#64748B" },
          { type: "text", text: expression, size: "sm", color: "#1E293B", weight: "bold", margin: "xs" },
          { type: "separator", margin: "md" },
          { type: "text", text: "計算答案：", size: "xs", color: "#64748B", margin: "md" },
          { type: "text", text: String(result), size: "xxl", color: "#059669", weight: "bold", margin: "xs" },
          ...(explanation ? [
            { type: "text", text: `💡 說明：${explanation}`, size: "xxs", color: "#64748B", margin: "md", wrap: true }
          ] : [])
        ]
      }
    },
    quickReply: DEFAULT_QUICK_REPLY
  };
}

export function createWeatherFlexMessage(weather: {
  locationName: string;
  condition: string;
  rainProb: string;
  minTemp: string;
  maxTemp: string;
  comfort: string;
  advice: string;
}): OutgoingLineMessage {
  return {
    type: "flex",
    altText: `☀️ 【${weather.locationName}天氣】${weather.condition} 氣溫 ${weather.minTemp}°C~${weather.maxTemp}°C 降雨機率 ${weather.rainProb}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0284C7",
        paddingAll: "lg",
        contents: [
          { type: "text", text: `☀️ ${weather.locationName} 即時天氣預報`, color: "#FFFFFF", weight: "bold", size: "md" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          { type: "text", text: `${weather.condition} • 氣溫 ${weather.minTemp}°C ~ ${weather.maxTemp}°C`, size: "md", weight: "bold", color: "#1E293B" },
          { type: "text", text: `降雨機率：${weather.rainProb} • 舒適度：${weather.comfort}`, size: "xs", color: "#64748B", margin: "xs" },
          { type: "separator", margin: "md" },
          { type: "text", text: `💡 穿衣與出門提醒：${weather.advice}`, size: "xs", color: "#0369A1", margin: "md", wrap: true }
        ]
      }
    },
    quickReply: DEFAULT_QUICK_REPLY
  };
}

export function createLocationTransportFlexMessage(info: {
  locationTitle: string;
  address?: string;
  latitude: number;
  longitude: number;
  weather?: { condition: string; rainProb: string; minTemp: string; maxTemp: string; comfort: string };
  youbikes: Array<{ name: string; availableBikes: number; emptySpaces: number; distanceMeters: number }>;
  parkingLots: Array<{ name: string; availableSpaces: number; totalSpaces: number; hourlyRate?: number; distanceMeters: number }>;
  transitTips: string[];
}): OutgoingLineMessage {
  const youbikeRows = info.youbikes.slice(0, 3).map((y) => ({
    type: "box",
    layout: "horizontal",
    margin: "sm",
    contents: [
      { type: "text", text: `🚲 ${y.name} (${y.distanceMeters}m)`, size: "xs", color: "#334155", flex: 3, wrap: true },
      { type: "text", text: `借:${y.availableBikes} | 還:${y.emptySpaces}`, size: "xs", weight: "bold", color: y.availableBikes > 3 ? "#059669" : "#D97706", align: "end", flex: 2 }
    ]
  }));

  const parkingRows = info.parkingLots.slice(0, 2).map((p) => ({
    type: "box",
    layout: "horizontal",
    margin: "sm",
    contents: [
      { type: "text", text: `🅿️ ${p.name}`, size: "xs", color: "#334155", flex: 3, wrap: true },
      { type: "text", text: `餘:${p.availableSpaces}位 (${p.hourlyRate || 40}元/h)`, size: "xs", weight: "bold", color: p.availableSpaces > 5 ? "#0284C7" : "#DC2626", align: "end", flex: 2 }
    ]
  }));

  return {
    type: "flex",
    altText: `📍 【周邊交通】${info.locationTitle || "當前位置"} YouBike與停車位情報`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0284C7",
        paddingAll: "lg",
        contents: [
          { type: "text", text: "📍 周邊 YouBike 與即時交通", color: "#FFFFFF", weight: "bold", size: "md" },
          { type: "text", text: info.locationTitle, color: "#E0F2FE", size: "xs", margin: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          { type: "text", text: "🚲 周邊 YouBike 2.0 站點：", weight: "bold", size: "xs", color: "#64748B" },
          ...youbikeRows,
          { type: "separator", margin: "md" },
          { type: "text", text: "🅿️ 周邊停車場即時車位：", weight: "bold", size: "xs", color: "#64748B", margin: "md" },
          ...parkingRows
        ]
      }
    },
    quickReply: DEFAULT_QUICK_REPLY
  };
}

export function createSearchFlexMessage(
  query: string,
  summary: string,
  results: Array<{ title: string; url: string }>
): OutgoingLineMessage {
  const resultBoxes = results.slice(0, 3).map((r) => ({
    type: "box",
    layout: "vertical",
    margin: "sm",
    action: { type: "uri", label: r.title.slice(0, 40), uri: r.url },
    contents: [
      { type: "text", text: `🔗 ${r.title}`, size: "xs", color: "#2563EB", weight: "bold", wrap: true }
    ]
  }));

  return {
    type: "flex",
    altText: `🌐 搜尋結果：${query}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#2563EB",
        paddingAll: "lg",
        contents: [
          { type: "text", text: "🌐 網際網路即時搜尋結果", color: "#FFFFFF", weight: "bold", size: "md" },
          { type: "text", text: `關鍵字：${query}`, color: "#DBEAFE", size: "xs", margin: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          { type: "text", text: summary, size: "xs", color: "#1E293B", wrap: true },
          { type: "separator", margin: "md" },
          { type: "text", text: "📚 參考資訊來源：", weight: "bold", size: "xs", color: "#64748B", margin: "md" },
          ...resultBoxes
        ]
      }
    },
    quickReply: DEFAULT_QUICK_REPLY
  };
}
