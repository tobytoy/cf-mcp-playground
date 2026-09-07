import type { OutgoingLineMessage } from "../types/line";

export interface ModuleConfig {
  id: string;
  name: string;
  icon: string;
  category: "生活管家" | "交通出行" | "智慧分析" | "系統監控";
  description: string;
  example: string;
  enabled_for: ("personal" | "work")[];
  keywords: string[];
}

/**
 * Declarative Modules Registry.
 * Easily enable/disable or migrate features between Work and Personal assistants
 * simply by updating the `enabled_for` array!
 */
export const MODULES_REGISTRY: ModuleConfig[] = [
  {
    id: "ocr_drive_vault",
    name: "📸 拍照單據 OCR 與雲端硬碟歸檔",
    icon: "📸",
    category: "生活管家",
    description: "在 LINE 傳送任何收據、發票、醫療單據或文件照片，AI 自動辨識文字、萃取金額與明細，並自動備份至 Google Drive 與試算表！",
    example: "直接在對話中拍照或傳送圖片",
    enabled_for: ["personal"],
    keywords: ["ocr", "照片辨識", "單據", "發票", "收據"]
  },
  {
    id: "personal_todos",
    name: "📝 生活待辦事項管理",
    icon: "📝",
    category: "生活管家",
    description: "語音或打字隨手記下生活代辦、家庭採買與急件事項，並與 Google Sheet 第一頁自動即時同步。",
    example: "待辦：購買全脂鮮奶與洗碗精",
    enabled_for: ["personal", "work"],
    keywords: ["待辦", "代辦", "todo", "清單"]
  },
  {
    id: "voice_studio",
    name: "🎙️ 語音逐字稿與說話者辨識",
    icon: "🎙️",
    category: "生活管家",
    description: "傳送語音訊息或開啟 Mini App 錄音，自動區分不同說話者（說話者A、說話者B），輸出完整逐字稿與結論。",
    example: "直接按住麥克風發送 LINE 語音訊息",
    enabled_for: ["personal", "work"],
    keywords: ["錄音", "語音轉文字", "逐字稿"]
  },
  {
    id: "nearby_transport",
    name: "🚲 周邊 YouBike 2.0 與停車位查詢",
    icon: "🚲",
    category: "交通出行",
    description: "精確定位周邊 1km 內 YouBike 站點之真實可借車輛數、可還空格數與停車場剩餘空位（已修正新版 API 欄位）。",
    example: "幫我找附近的 YouBike",
    enabled_for: ["personal", "work"],
    keywords: ["youbike", "ubike", "單車", "找停車", "停車位", "附近交通"]
  },
  {
    id: "weather_forecast",
    name: "☀️ 氣象局即時天氣與穿衣提醒",
    icon: "☀️",
    category: "交通出行",
    description: "串接中央氣象署 (CWA) 官方數據，查詢今明 36 小時天氣、降雨機率、舒適度與出門帶傘建議。",
    example: "今天出門要帶傘嗎？",
    enabled_for: ["personal", "work"],
    keywords: ["天氣", "氣象", "會下雨嗎", "降雨機率", "氣溫"]
  },
  {
    id: "calculator",
    name: "🧮 算式計算機與匯率",
    icon: "🧮",
    category: "智慧分析",
    description: "支援多層括號、次方、百分比與數學運算，毫秒級確定性計算輸出。",
    example: "計算 1250 * (1 + 0.05)^3",
    enabled_for: ["personal", "work"],
    keywords: ["計算", "算一下", "math", "calc"]
  },
  {
    id: "search_web",
    name: "🌐 網際網路即時搜尋",
    icon: "🌐",
    category: "智慧分析",
    description: "串接即時搜尋引擎與 AI 摘要，迅速獲取今日最新新聞、時事、店家營業資訊與生活事實查核。",
    example: "搜尋：信義區推薦義大利麵",
    enabled_for: ["personal", "work"],
    keywords: ["搜尋", "查一下", "查詢", "最新"]
  },
  {
    id: "discord_logger",
    name: "🔔 Discord 異常告警與監控通知",
    icon: "🔔",
    category: "系統監控",
    description: "系統發生任何異常自動推播至 Discord Webhook；亦可隨時指令切換是否開啟一般訊息日誌。",
    example: "開啟 Discord 紀錄 / 關閉 Discord 紀錄",
    enabled_for: ["personal", "work"],
    keywords: ["discord", "監控", "告警", "日誌"]
  }
];

export function getEnabledModules(botType: "personal" | "work"): ModuleConfig[] {
  return MODULES_REGISTRY.filter((m) => m.enabled_for.includes(botType));
}

/**
 * Generate a mobile-friendly LINE Flex Message listing all active features.
 */
export function createFeatureListFlexMessage(botType: "personal" | "work" = "personal"): OutgoingLineMessage {
  const modules = getEnabledModules(botType);
  const botTitle = botType === "personal" ? "🐶 HelperDog 私人生活助理" : "🐱 HelperCat 上班公務助理";

  const moduleRows = modules.map((m) => ({
    type: "box",
    layout: "vertical",
    margin: "md",
    backgroundColor: "#F8FAFC",
    paddingAll: "12px",
    cornerRadius: "8px",
    contents: [
      {
        type: "box",
        layout: "horizontal",
        contents: [
          { type: "text", text: m.name, weight: "bold", size: "sm", color: "#1E293B", flex: 4 },
          { type: "text", text: m.category, size: "xxs", color: "#4F46E5", align: "end", flex: 2 }
        ]
      },
      {
        type: "text",
        text: m.description,
        size: "xs",
        color: "#64748B",
        wrap: true,
        margin: "xs"
      },
      {
        type: "box",
        layout: "horizontal",
        margin: "xs",
        contents: [
          { type: "text", text: "範例：", size: "xxs", color: "#94A3B8", flex: 1 },
          { type: "text", text: `「${m.example}」`, size: "xxs", color: "#3B82F6", flex: 4 }
        ]
      }
    ]
  }));

  return {
    type: "flex",
    altText: `📋 【${botTitle}】功能服務總覽`,
    contents: {
      type: "bubble",
      size: "giga",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#4F46E5",
        paddingAll: "lg",
        contents: [
          { type: "text", text: botTitle, color: "#FFFFFF", weight: "bold", size: "md" },
          { type: "text", text: `目前啟用 ${modules.length} 項智慧生活與雲端工具 (點擊可直接體驗)`, color: "#E0E7FF", size: "xs", margin: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          { type: "text", text: "💡 只要在對話中直接說話、傳照片或文字，我會自動為您處理：", weight: "bold", size: "xs", color: "#475569" },
          ...moduleRows
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
              label: "📱 開啟 Mini App",
              uri: "https://miniapp.line.me/2011472036-bVXeg5I6"
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "message",
              label: "🚲 找周邊YouBike",
              text: "幫我找附近的 YouBike"
            }
          }
        ]
      }
    }
  };
}
