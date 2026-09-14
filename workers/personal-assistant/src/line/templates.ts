import type { OutgoingLineMessage, LineQuickReply } from "../types/line";
import type { OcrResult } from "../tools/ocrDriveVault";
import type { PersonalTodoItem } from "../tools/personalTodo";

export const DEFAULT_QUICK_REPLY: LineQuickReply = {
  items: [
    {
      type: "action",
      action: {
        type: "location",
        label: "📍 一鍵傳送位置"
      }
    },
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
                backgroundColor: "#EEF2FF",
                paddingAll: "md",
                cornerRadius: "10px",
                flex: 1,
                action: { type: "message", text: "精選專案" },
                contents: [
                  { type: "text", text: "🚀 精選專案", weight: "bold", size: "sm", color: "#4338CA" },
                  { type: "text", text: "Luna AI • 公告 • 聊天室", size: "xxs", color: "#6366F1", margin: "xs" }
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
 * Flex Message Bubble for Promoting Ecosystem Projects (Luna AI Hub, Public Announcement, Collaborative Chatroom).
 */
export function createPromoProjectsFlexMessage(): OutgoingLineMessage {
  return {
    type: "flex",
    altText: "🚀 【精選推薦專案】Luna AI Hub、官方公告中心、聯手聊天室",
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
              { type: "text", text: "🚀 精選推薦生態系專案", weight: "bold", size: "md", color: "#FFFFFF", flex: 4 },
              { type: "text", text: "線上體驗", size: "xs", color: "#C7D2FE", align: "end", flex: 2 }
            ]
          },
          {
            type: "text",
            text: "為您精選三項熱門 AI、官方公告與協同通訊服務，點擊按鈕即可立即開啟體驗！",
            size: "xxs",
            color: "#E0E7FF",
            margin: "xs",
            wrap: true
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        spacing: "md",
        contents: [
          // Project 1: Luna AI Hub
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F8FAFC",
            paddingAll: "md",
            cornerRadius: "8px",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "🤖 Luna AI Hub", weight: "bold", size: "sm", color: "#1E293B", flex: 3 },
                  { type: "text", text: "40+ 微服務", size: "xxs", color: "#4F46E5", align: "end", flex: 2, weight: "bold" }
                ]
              },
              {
                type: "text",
                text: "企業級 AI 整合平台與智能微服務生態系，聚合 40+ 智能應用，支援 WebGPU 邊緣加速與超低延遲運算，支援 PWA 隨開即用。",
                size: "xxs",
                color: "#475569",
                wrap: true,
                margin: "xs"
              }
            ]
          },
          // Project 2: Public Announcement
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F8FAFC",
            paddingAll: "md",
            cornerRadius: "8px",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "📢 官方公告中心", weight: "bold", size: "sm", color: "#1E293B", flex: 3 },
                  { type: "text", text: "即時通訊", size: "xxs", color: "#0284C7", align: "end", flex: 2, weight: "bold" }
                ]
              },
              {
                type: "text",
                text: "Public Announcement 官方公告發布中心，提供機密與公開官方最新政策、通訊動態與即時事項通知。",
                size: "xxs",
                color: "#475569",
                wrap: true,
                margin: "xs"
              }
            ]
          },
          // Project 3: Collaborative Chatroom
          {
            type: "box",
            layout: "vertical",
            backgroundColor: "#F8FAFC",
            paddingAll: "md",
            cornerRadius: "8px",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  { type: "text", text: "💬 聯手聊天室", weight: "bold", size: "sm", color: "#1E293B", flex: 3 },
                  { type: "text", text: "多人在線", size: "xxs", color: "#059669", align: "end", flex: 2, weight: "bold" }
                ]
              },
              {
                type: "text",
                text: "Collaborative Multi-session Chatroom 多人協同多會話聊天室，支援跨房間即時交流、協作與流暢互動體驗。",
                size: "xxs",
                color: "#475569",
                wrap: true,
                margin: "xs"
              }
            ]
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
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
              label: "🤖 前往 Luna AI Hub",
              uri: "https://luna-ai-b7862.web.app/"
            }
          },
          {
            type: "button",
            style: "primary",
            color: "#0284C7",
            height: "sm",
            action: {
              type: "uri",
              label: "📢 開啟 官方公告中心",
              uri: "https://toydogcat.github.io/public-announcement/"
            }
          },
          {
            type: "button",
            style: "primary",
            color: "#059669",
            height: "sm",
            action: {
              type: "uri",
              label: "💬 進入 聯手聊天室",
              uri: "https://toydogcat.github.io/collaborative-chatroom"
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
export function createTodoFlexMessage(
  todos: PersonalTodoItem[],
  feedbackNotice?: string
): OutgoingLineMessage {
  const activeTodos = todos.filter((t) => t.status === "進行中");
  const completedCount = todos.filter((t) => t.status === "已完成").length;

  const rows = activeTodos.slice(0, 8).map((t, idx) => ({
    type: "box",
    layout: "horizontal",
    margin: "md",
    alignItems: "center",
    contents: [
      {
        type: "text",
        text: `${idx + 1}.`,
        weight: "bold",
        size: "sm",
        color: "#4F46E5",
        flex: 1
      },
      {
        type: "box",
        layout: "vertical",
        flex: 6,
        contents: [
          {
            type: "text",
            text: `[${t.category}] ${t.item}`,
            size: "sm",
            color: "#1E293B",
            weight: "bold",
            wrap: true
          },
          {
            type: "text",
            text: `編號: ${t.id} ｜ 建立於 ${t.createdAt ? t.createdAt.slice(5, 16) : "近期"}`,
            size: "xxs",
            color: "#64748B",
            margin: "xs"
          }
        ]
      },
      {
        type: "button",
        style: "secondary",
        height: "sm",
        color: "#E0E7FF",
        flex: 2,
        action: {
          type: "message",
          label: "完成",
          text: `完成 ${idx + 1}`
        }
      }
    ]
  }));

  const noticeBox = feedbackNotice
    ? [
        {
          type: "box",
          layout: "vertical",
          backgroundColor: feedbackNotice.startsWith("✅") ? "#ECFDF5" : "#FEF3C7",
          cornerRadius: "md",
          paddingAll: "sm",
          margin: "sm",
          contents: [
            {
              type: "text",
              text: feedbackNotice,
              size: "xs",
              color: feedbackNotice.startsWith("✅") ? "#065F46" : "#92400E",
              wrap: true
            }
          ]
        },
        { type: "separator", margin: "md" }
      ]
    : [];

  return {
    type: "flex",
    altText: `📝 【生活待辦事項】目前共 ${activeTodos.length} 項進行中`,
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#4F46E5",
        paddingAll: "lg",
        contents: [
          { type: "text", text: "📝 個人生活待辦清單（進行中）", color: "#FFFFFF", weight: "bold", size: "md" },
          {
            type: "text",
            text: `⏳ 處理中：${activeTodos.length} 項 • ✅ 已完成：${completedCount} 項 (已自動隱藏)`,
            color: "#E0E7FF",
            size: "xs",
            margin: "xs"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          ...noticeBox,
          ...rows,
          ...(activeTodos.length === 0
            ? [
                {
                  type: "text",
                  text: "🎉 目前沒有任何進行中的待辦事項！太棒了！",
                  size: "sm",
                  weight: "bold",
                  color: "#059669",
                  margin: "md"
                },
                {
                  type: "text",
                  text: "💡 提示：輸入「新增待辦 買鮮奶」或「提醒我 明天繳水費」即可新增待辦。",
                  size: "xs",
                  color: "#64748B",
                  margin: "sm",
                  wrap: true
                }
              ]
            : [
                { type: "separator", margin: "lg" },
                {
                  type: "text",
                  text: "💡 點擊右側「完成」按鈕，或直接對話回覆「完成 1」即可標記完成。",
                  size: "xxs",
                  color: "#64748B",
                  margin: "md",
                  wrap: true
                }
              ])
        ]
      },
      footer: {
        type: "box",
        layout: "horizontal",
        paddingAll: "md",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#4F46E5",
            height: "sm",
            flex: 1,
            action: {
              type: "message",
              label: "➕ 新增待辦",
              text: "待辦："
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            flex: 1,
            action: {
              type: "uri",
              label: "📱 開啟 Mini App",
              uri: "https://miniapp.line.me/2011472036-bVXeg5I6"
            }
          }
        ]
      }
    },
    quickReply: {
      items: [
        {
          type: "action",
          action: {
            type: "message",
            label: "📋 待辦清單",
            text: "查看待辦"
          }
        },
        {
          type: "action",
          action: {
            type: "message",
            label: "➕ 新增待辦",
            text: "待辦："
          }
        },
        {
          type: "action",
          action: {
            type: "message",
            label: "🐶 快捷選單",
            text: "選單"
          }
        }
      ]
    }
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
  weather?: { condition: string; rainProb: string; minTemp: string; maxTemp: string; comfort: string; advice?: string };
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

  const weatherBox = info.weather
    ? [
        {
          type: "box",
          layout: "vertical",
          backgroundColor: "#F0F9FF",
          paddingAll: "md",
          cornerRadius: "8px",
          margin: "xs",
          contents: [
            {
              type: "box",
              layout: "horizontal",
              contents: [
                { type: "text", text: `☀️ ${info.weather.condition}`, weight: "bold", size: "sm", color: "#0369A1", flex: 3 },
                { type: "text", text: `${info.weather.minTemp}°C ~ ${info.weather.maxTemp}°C`, size: "xs", color: "#0284C7", align: "end", flex: 2 }
              ]
            },
            {
              type: "text",
              text: `降雨機率：${info.weather.rainProb} • 體感：${info.weather.comfort}`,
              size: "xxs",
              color: "#64748B",
              margin: "xs"
            },
            {
              type: "text",
              text: `💡 穿衣建議：${info.weather.advice}`,
              size: "xxs",
              color: "#0284C7",
              wrap: true,
              margin: "xs"
            }
          ]
        },
        { type: "separator", margin: "md" }
      ]
    : [];

  return {
    type: "flex",
    altText: `📍 【007 位置與生活情報】${info.locationTitle || "當前位置"} YouBike與天氣`,
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0284C7",
        paddingAll: "lg",
        contents: [
          { type: "text", text: "📍 007 即時位置與生活情報", color: "#FFFFFF", weight: "bold", size: "md" },
          { type: "text", text: `${info.locationTitle || "當前定位"} • 即時氣象、YouBike與停車場`, color: "#E0F2FE", size: "xs", margin: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          ...weatherBox,
          { type: "text", text: "🚲 周邊 YouBike 2.0 站點：", weight: "bold", size: "xs", color: "#64748B", margin: "md" },
          ...youbikeRows,
          { type: "separator", margin: "md" },
          { type: "text", text: "🅿️ 周邊停車場即時車位：", weight: "bold", size: "xs", color: "#64748B", margin: "md" },
          ...parkingRows
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
            color: "#0284C7",
            height: "sm",
            action: {
              type: "uri",
              label: "🗺️ MOTC 交通導航",
              uri: "https://miniapp.line.me/2011479506-1DIDNGJQ"
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "uri",
              label: "📱 開啟生活 Mini App",
              uri: "https://miniapp.line.me/2011472036-bVXeg5I6"
            }
          }
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

export function createMorningBriefingFlexMessage(info: {
  dateStr: string;
  timeStr: string;
  weather: { condition: string; rainProb: string; tempRange: string; comfort: string; advice: string };
  todos: PersonalTodoItem[];
  finance: {
    usStocks: Array<{ symbol: string; name: string; price: number; changePercent: number }>;
    crypto: Array<{ symbol: string; name: string; priceUsd: number; changePercent24h: number }>;
  };
  newsSummary: string;
}): OutgoingLineMessage {
  const usStockRows = info.finance.usStocks.slice(0, 4).map((s) => ({
    type: "box",
    layout: "horizontal",
    contents: [
      { type: "text", text: s.name, size: "xs", color: "#334155", flex: 3 },
      { type: "text", text: `$${s.price}`, size: "xs", color: "#0F172A", align: "end", flex: 2 },
      {
        type: "text",
        text: `${s.changePercent >= 0 ? "+" : ""}${s.changePercent}%`,
        size: "xs",
        weight: "bold",
        color: s.changePercent >= 0 ? "#059669" : "#DC2626",
        align: "end",
        flex: 2
      }
    ]
  }));

  const cryptoRows = info.finance.crypto.slice(0, 2).map((c) => ({
    type: "box",
    layout: "horizontal",
    contents: [
      { type: "text", text: `${c.name} (${c.symbol})`, size: "xs", color: "#334155", flex: 3 },
      { type: "text", text: `$${c.priceUsd.toLocaleString()}`, size: "xs", color: "#0F172A", align: "end", flex: 2 },
      {
        type: "text",
        text: `${c.changePercent24h >= 0 ? "+" : ""}${c.changePercent24h}%`,
        size: "xs",
        weight: "bold",
        color: c.changePercent24h >= 0 ? "#059669" : "#DC2626",
        align: "end",
        flex: 2
      }
    ]
  }));

  const displayed = info.todos.slice(0, 5);
  const remaining = info.todos.length - displayed.length;

  const todoRows =
    displayed.length > 0
      ? displayed.map((t) => ({
          type: "box",
          layout: "horizontal",
          margin: "xs",
          contents: [
            { type: "text", text: "•", size: "xs", color: "#059669", flex: 0 },
            {
              type: "text",
              text: `[${t.category}] ${t.item}`,
              size: "xs",
              color: "#1E293B",
              wrap: true,
              flex: 1,
              margin: "sm"
            }
          ]
        }))
      : [{ type: "text", text: "今日無進行中待辦 🎉", size: "xs", color: "#64748B", margin: "xs" }];

  const todoSection = [
    { type: "text", text: `📋 進行中待辦（${info.todos.length} 項）`, weight: "bold", size: "xs", color: "#059669", margin: "md" },
    ...todoRows,
    ...(remaining > 0
      ? [{ type: "text", text: `還有 ${remaining} 項…`, size: "xxs", color: "#94A3B8", margin: "xs" }]
      : [])
  ];

  return {
    type: "flex",
    altText: `🌅 【007 晨間生活早報】${info.dateStr} 07:00 天氣、${info.todos.length} 項待辦、美股走勢`,
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0284C7",
        paddingAll: "lg",
        contents: [
          { type: "text", text: "🌅 007 晨間生活早報", color: "#FFFFFF", weight: "bold", size: "md" },
          { type: "text", text: ` 台灣時間 ${info.dateStr} ${info.timeStr}`, color: "#E0F2FE", size: "xs", margin: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          // 天氣列
          {
            type: "box",
            layout: "horizontal",
            backgroundColor: "#F0F9FF",
            cornerRadius: "md",
            paddingAll: "md",
            contents: [
              {
                type: "box",
                layout: "vertical",
                flex: 3,
                contents: [
                  { type: "text", text: "⛅ 今日天氣（台北）", size: "xs", color: "#0284C7", weight: "bold" },
                  { type: "text", text: `${info.weather.condition} ｜ ${info.weather.tempRange}`, size: "xs", color: "#0F172A", margin: "xs" },
                  { type: "text", text: `降雨率 ☔ ${info.weather.rainProb}`, size: "xs", color: parseInt(info.weather.rainProb) >= 30 ? "#DC2626" : "#059669" },
                  { type: "text", text: info.weather.advice, size: "xxs", color: "#64748B", margin: "xs", wrap: true }
                ]
              }
            ]
          },
          // 待辦明細
          { type: "separator", margin: "md" },
          ...todoSection,
          // 美股與加密
          { type: "separator", margin: "md" },
          { type: "text", text: "📈 隔夜美股與加密走勢", weight: "bold", size: "xs", color: "#0284C7", margin: "md" },
          ...usStockRows,
          ...cryptoRows,
          // 生活要聞
          { type: "separator", margin: "md" },
          { type: "text", text: "📰 今日生活要聞", weight: "bold", size: "xs", color: "#0284C7", margin: "md" },
          { type: "text", text: info.newsSummary, wrap: true, size: "xs", color: "#334155", margin: "sm" }
        ]
      }
    },
    quickReply: DEFAULT_QUICK_REPLY
  };
}

export function createStockBriefingFlexMessage(info: {
  dateStr: string;
  timeStr: string;
  quotes: Array<{ symbol: string; name: string; price: number; change: number; changePercent: number }>;
  summary: string;
}): OutgoingLineMessage {
  const quoteBoxes = info.quotes.map((q) => {
    const isUp = q.change >= 0;
    const color = isUp ? "#DC2626" : "#059669";
    return {
      type: "box",
      layout: "horizontal",
      margin: "sm",
      contents: [
        { type: "text", text: `${q.name} (${q.symbol.replace(".TW", "")})`, size: "xs", color: "#1E293B", flex: 3 },
        { type: "text", text: `${q.price}`, size: "xs", weight: "bold", color: "#0F172A", align: "end", flex: 2 },
        {
          type: "text",
          text: `${isUp ? "▲ +" : "▼ "}${q.changePercent.toFixed(2)}%`,
          size: "xs",
          weight: "bold",
          color,
          align: "end",
          flex: 2
        }
      ]
    };
  });

  return {
    type: "flex",
    altText: `📈 【台股收盤行情】${info.dateStr} 15:00 加權指數與權值股`,
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#DC2626",
        paddingAll: "lg",
        contents: [
          { type: "text", text: "📈 007 台股收盤行情快報", color: "#FFFFFF", weight: "bold", size: "md" },
          { type: "text", text: ` 台灣時間 ${info.dateStr} ${info.timeStr}`, color: "#FEE2E2", size: "xs", margin: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          { type: "text", text: "📊 今日台股權值大盤表現：", weight: "bold", size: "xs", color: "#64748B" },
          ...quoteBoxes,
          { type: "separator", margin: "md" },
          { type: "text", text: "💡 法人動向與盤後總結：", weight: "bold", size: "xs", color: "#DC2626", margin: "md" },
          { type: "text", text: info.summary, wrap: true, size: "xs", color: "#334155", margin: "sm" }
        ]
      }
    },
    quickReply: DEFAULT_QUICK_REPLY
  };
}

export function createGithubBriefingFlexMessage(info: {
  dateStr: string;
  timeStr: string;
  repos: Array<{ name: string; url: string; description: string; language: string; stars: number }>;
}): OutgoingLineMessage {
  const repoBoxes = info.repos.map((r, i) => ({
    type: "box",
    layout: "vertical",
    margin: "md",
    backgroundColor: "#F8FAFC",
    cornerRadius: "md",
    paddingAll: "md",
    action: {
      type: "uri",
      label: r.name,
      uri: r.url
    },
    contents: [
      {
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: `${i + 1}. ${r.name}`, weight: "bold", size: "xs", color: "#0969DA", flex: 4, wrap: true },
          { type: "text", text: `⭐ ${r.stars.toLocaleString()}`, weight: "bold", size: "xs", color: "#F59E0B", align: "end", flex: 2 }
        ]
      },
      { type: "text", text: r.description, size: "xxs", color: "#475569", wrap: true, margin: "xs" },
      {
        type: "box",
        layout: "horizontal",
        margin: "xs",
        contents: [{ type: "text", text: `語言: ${r.language}`, size: "xxs", color: "#64748B" }]
      }
    ]
  }));

  return {
    type: "flex",
    altText: `🚀 【GitHub 今日熱點黑馬】${info.dateStr} 19:00 增長最快的開源新星`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#1F2937",
        paddingAll: "lg",
        contents: [
          { type: "text", text: "🚀 GitHub 今日熱門開源黑馬", color: "#FFFFFF", weight: "bold", size: "md" },
          { type: "text", text: `📅 台灣時間 ${info.dateStr} ${info.timeStr} (點擊可開啟倉庫)`, color: "#E5E7EB", size: "xs", margin: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          { type: "text", text: "🔥 今日 Star 增長最快的開源新專案：", weight: "bold", size: "xs", color: "#64748B" },
          ...repoBoxes
        ]
      }
    },
    quickReply: DEFAULT_QUICK_REPLY
  };
}
