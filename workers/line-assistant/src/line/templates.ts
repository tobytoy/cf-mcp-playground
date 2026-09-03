import type { OutgoingLineMessage, LineQuickReply } from "../types/line";

export const DEFAULT_QUICK_REPLY: LineQuickReply = {
  items: [
    {
      type: "action",
      action: {
        type: "message",
        label: "📝 待辦清單",
        text: "查看待辦事項"
      }
    },
    {
      type: "action",
      action: {
        type: "message",
        label: "📊 歷史用量",
        text: "查看歷史用量統計"
      }
    },
    {
      type: "action",
      action: {
        type: "message",
        label: "🌦️ 天母天氣",
        text: "今天天母天氣如何？會下雨嗎"
      }
    },
    {
      type: "action",
      action: {
        type: "message",
        label: "🎯 國考刷題",
        text: "考一題公職考古題"
      }
    },
    {
      type: "action",
      action: {
        type: "message",
        label: "🔍 今日焦點",
        text: "搜尋今日台灣與科技重大新聞"
      }
    },
    {
      type: "action",
      action: {
        type: "location",
        label: "📍 即時定位"
      }
    },
    {
      type: "action",
      action: {
        type: "message",
        label: "🛠️ 系統日誌",
        text: "看系統日誌"
      }
    }
  ]
};

export function createSearchFlexMessage(
  query: string,
  summary: string,
  sources: Array<{ title: string; url: string }> = []
): OutgoingLineMessage {
  const sourceButtons = sources.slice(0, 3).map((s) => ({
    type: "button",
    style: "link",
    height: "sm",
    action: {
      type: "uri",
      label: s.title.length > 25 ? s.title.slice(0, 24) + "…" : s.title,
      uri: s.url
    }
  }));

  const contents: Record<string, unknown> = {
    type: "bubble",
    header: {
      type: "box",
      layout: "vertical",
      backgroundColor: "#0F766E",
      paddingAll: "lg",
      contents: [
        {
          type: "text",
          text: "🔍 即時聯網搜尋與分析",
          color: "#FFFFFF",
          weight: "bold",
          size: "md"
        }
      ]
    },
    body: {
      type: "box",
      layout: "vertical",
      paddingAll: "lg",
      contents: [
        {
          type: "text",
          text: `查詢主題：${query}`,
          weight: "bold",
          size: "xs",
          color: "#64748B"
        },
        {
          type: "separator",
          margin: "md"
        },
        {
          type: "text",
          text: summary,
          wrap: true,
          margin: "md",
          size: "sm",
          color: "#1E293B"
        }
      ]
    }
  };

  if (sourceButtons.length > 0) {
    contents.footer = {
      type: "box",
      layout: "vertical",
      paddingAll: "sm",
      contents: sourceButtons
    };
  }

  return {
    type: "flex",
    altText: `🔍 搜尋結果：${query}`,
    contents,
    quickReply: DEFAULT_QUICK_REPLY
  };
}

export function createCalculatorFlexMessage(
  expression: string,
  result: string | number,
  explanation?: string
): OutgoingLineMessage {
  const bodyContents: unknown[] = [
    {
      type: "text",
      text: `運算式：${expression}`,
      size: "xs",
      color: "#64748B"
    },
    {
      type: "text",
      text: `= ${result}`,
      weight: "bold",
      size: "xl",
      color: "#0284C7",
      margin: "sm"
    }
  ];

  if (explanation) {
    bodyContents.push(
      { type: "separator", margin: "md" },
      {
        type: "text",
        text: explanation,
        wrap: true,
        size: "xs",
        color: "#475569",
        margin: "md"
      }
    );
  }

  return {
    type: "flex",
    altText: `🧮 計算結果：${expression} = ${result}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0369A1",
        paddingAll: "md",
        contents: [
          {
            type: "text",
            text: "🧮 精準數學計算機",
            color: "#FFFFFF",
            weight: "bold",
            size: "md"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: bodyContents
      }
    },
    quickReply: DEFAULT_QUICK_REPLY
  };
}

export function createTodoFlexMessage(
  items: Array<{ id: string; text: string; done: boolean }>
): OutgoingLineMessage {
  if (items.length === 0) {
    return {
      type: "text",
      text: "📝 目前沒有待辦事項！您可以對我說「待辦：買咖啡」來新增。",
      quickReply: DEFAULT_QUICK_REPLY
    };
  }

  const sheetUrl = "https://docs.google.com/spreadsheets/d/1_Q-xY1WSpV_pQ82hGzyTXPkR3Q8QiABOL4ApxsimH8Y/edit";

  const todoRows = items.map((item, idx) => ({
    type: "box",
    layout: "horizontal",
    margin: "md",
    backgroundColor: "#F8FAFC",
    cornerRadius: "md",
    paddingAll: "sm",
    contents: [
      {
        type: "text",
        text: `${idx + 1}. ${item.text}`,
        size: "sm",
        flex: 4,
        wrap: true,
        color: "#1E293B",
        gravity: "center"
      },
      {
        type: "button",
        style: "primary",
        color: "#059669",
        height: "sm",
        flex: 2,
        action: {
          type: "postback",
          label: "✅ 完成",
          displayText: `已完成：「${item.text.slice(0, 10)}」`,
          data: JSON.stringify({ action: "complete_todo", id: item.id })
        }
      }
    ]
  }));

  return {
    type: "flex",
    altText: `📝 個人待辦事項清單 (共 ${items.length} 項未完成)`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#059669",
        paddingAll: "lg",
        contents: [
          {
            type: "text",
            text: "📝 Google 試算表同步待辦清單",
            color: "#FFFFFF",
            weight: "bold",
            size: "md"
          },
          {
            type: "text",
            text: `目前剩餘 ${items.length} 項待辦事項 (點擊「完成」自動打勾)`,
            color: "#D1FAE5",
            size: "xs",
            margin: "xs"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: todoRows
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "sm",
        contents: [
          {
            type: "button",
            style: "link",
            height: "sm",
            action: {
              type: "uri",
              label: "📊 開啟 Google 試算表完整檢視",
              uri: sheetUrl
            }
          }
        ]
      }
    },
    quickReply: DEFAULT_QUICK_REPLY
  };
}

export function createFileFlexMessage(
  fileName: string,
  fileUrl: string,
  description?: string
): OutgoingLineMessage {
  return {
    type: "flex",
    altText: `📄 檔案下載：${fileName}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#334155",
        paddingAll: "md",
        contents: [
          {
            type: "text",
            text: "📄 檔案傳送與下載",
            color: "#FFFFFF",
            weight: "bold",
            size: "md"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          {
            type: "text",
            text: fileName,
            weight: "bold",
            size: "md",
            color: "#0F172A"
          },
          ...(description
            ? [
                {
                  type: "text",
                  text: description,
                  size: "sm",
                  color: "#64748B",
                  wrap: true,
                  margin: "sm"
                }
              ]
            : [])
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#0284C7",
            action: {
              type: "uri",
              label: "開啟 / 下載檔案",
              uri: fileUrl
            }
          }
        ]
      }
    },
    quickReply: DEFAULT_QUICK_REPLY
  };
}

export function createStatsFlexMessage(stats: {
  totalCalls: number;
  firstUsedAt: string;
  lastActiveAt: string;
  toolCounts: Record<string, number>;
  modelCounts: Record<string, number>;
  recentHistory: Array<{ id: string; timestamp: string; tool: string; preview: string }>;
}): OutgoingLineMessage {
  const toolLabels: Record<string, string> = {
    search_web: "🔍 聯網搜尋",
    calculator: "🧮 精準計算",
    ask_llm: "🤖 AI 對話",
    manage_todo: "📝 待辦管理",
    save_memo: "📌 筆記備忘",
    read_url: "📰 網頁摘要",
    send_file: "📄 檔案傳送",
    view_stats: "📊 統計查詢"
  };

  const toolRows = Object.entries(stats.toolCounts).map(([tool, count]) => ({
    type: "box",
    layout: "horizontal",
    contents: [
      {
        type: "text",
        text: toolLabels[tool] || tool,
        size: "sm",
        color: "#475569",
        flex: 3
      },
      {
        type: "text",
        text: `${count} 次`,
        weight: "bold",
        size: "sm",
        color: "#0F172A",
        align: "end",
        flex: 1
      }
    ]
  }));

  const historyRows = stats.recentHistory.slice(0, 5).map((h, i) => {
    const timeStr = new Date(h.timestamp).toLocaleTimeString("zh-TW", { hour: "2-digit", minute: "2-digit" });
    return {
      type: "box",
      layout: "vertical",
      margin: "sm",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          contents: [
            {
              type: "text",
              text: `[${timeStr}] ${toolLabels[h.tool] || h.tool}`,
              size: "xs",
              weight: "bold",
              color: "#0284C7"
            }
          ]
        },
        {
          type: "text",
          text: h.preview,
          size: "xs",
          color: "#334155",
          wrap: true
        }
      ]
    };
  });

  return {
    type: "flex",
    altText: `📊 個人使用統計：累計調用 ${stats.totalCalls} 次`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#1E293B",
        paddingAll: "lg",
        contents: [
          {
            type: "text",
            text: "📊 Needle 使用資訊統計與歷史紀錄",
            color: "#FFFFFF",
            weight: "bold",
            size: "md"
          }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "text",
                text: "總調用次數",
                size: "sm",
                color: "#64748B",
                flex: 2
              },
              {
                type: "text",
                text: `${stats.totalCalls}`,
                weight: "bold",
                size: "xxl",
                color: "#059669",
                align: "end",
                flex: 2
              }
            ]
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "📈 功能使用分佈",
            weight: "bold",
            size: "xs",
            color: "#64748B",
            margin: "md"
          },
          ...(toolRows.length > 0
            ? toolRows
            : [
                {
                  type: "text",
                  text: "尚無功能呼叫記錄",
                  size: "xs",
                  color: "#94A3B8"
                }
              ]),
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "🕒 最近歷史請求紀錄",
            weight: "bold",
            size: "xs",
            color: "#64748B",
            margin: "md"
          },
          ...(historyRows.length > 0
            ? historyRows
            : [
                {
                  type: "text",
                  text: "尚無近期歷史紀錄",
                  size: "xs",
                  color: "#94A3B8"
                }
              ])
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
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${info.latitude},${info.longitude}`;

  const youbikeRows = info.youbikes.slice(0, 3).map((y) => ({
    type: "box",
    layout: "horizontal",
    margin: "sm",
    contents: [
      {
        type: "text",
        text: `🚲 ${y.name} (${y.distanceMeters}m)`,
        size: "xs",
        color: "#334155",
        flex: 3,
        wrap: true
      },
      {
        type: "text",
        text: `借:${y.availableBikes} | 還:${y.emptySpaces}`,
        size: "xs",
        weight: "bold",
        color: y.availableBikes > 3 ? "#059669" : "#D97706",
        align: "end",
        flex: 2
      }
    ]
  }));

  const parkingRows = info.parkingLots.slice(0, 2).map((p) => ({
    type: "box",
    layout: "horizontal",
    margin: "sm",
    contents: [
      {
        type: "text",
        text: `🅿️ ${p.name}`,
        size: "xs",
        color: "#334155",
        flex: 3,
        wrap: true
      },
      {
        type: "text",
        text: `餘:${p.availableSpaces}位 (${p.hourlyRate || 40}元/h)`,
        size: "xs",
        weight: "bold",
        color: p.availableSpaces > 5 ? "#0284C7" : "#DC2626",
        align: "end",
        flex: 2
      }
    ]
  }));

  return {
    type: "flex",
    altText: `📍 位置情報：${info.locationTitle || "當前位置"} 周邊即時交通與站點`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0284C7",
        paddingAll: "lg",
        contents: [
          {
            type: "text",
            text: "📍 周邊即時交通與位置情報",
            color: "#FFFFFF",
            weight: "bold",
            size: "md"
          },
          {
            type: "text",
            text: info.locationTitle || "目前座標位置",
            color: "#E0F2FE",
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
          ...(info.address
            ? [
                {
                  type: "text",
                  text: `📌 地址：${info.address}`,
                  size: "xs",
                  color: "#64748B",
                  wrap: true
                }
              ]
            : []),
          ...(info.weather
            ? [
                { type: "separator", margin: "md" },
                {
                  type: "box",
                  layout: "horizontal",
                  margin: "md",
                  backgroundColor: "#F0F9FF",
                  cornerRadius: "md",
                  paddingAll: "md",
                  contents: [
                    {
                      type: "text",
                      text: `🌦️ 當地氣象：${info.weather.condition} | 氣溫 ${info.weather.minTemp}~${info.weather.maxTemp} | 降雨機率 ${info.weather.rainProb}`,
                      size: "xs",
                      color: "#0369A1",
                      weight: "bold",
                      wrap: true
                    }
                  ]
                }
              ]
            : []),
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "🚲 周邊 YouBike 2.0 即時可借/可還",
            weight: "bold",
            size: "xs",
            color: "#0284C7",
            margin: "md"
          },
          ...(youbikeRows.length > 0
            ? youbikeRows
            : [{ type: "text", text: "周邊 1 公里內無 YouBike 站點", size: "xs", color: "#94A3B8" }]),
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "🅿️ 周邊即時停車位與費率",
            weight: "bold",
            size: "xs",
            color: "#0284C7",
            margin: "md"
          },
          ...(parkingRows.length > 0
            ? parkingRows
            : [{ type: "text", text: "暫無即時停車位數據", size: "xs", color: "#94A3B8" }]),
          ...(info.transitTips.length > 0
            ? [
                { type: "separator", margin: "md" },
                {
                  type: "text",
                  text: "💡 智慧出行建議",
                  weight: "bold",
                  size: "xs",
                  color: "#64748B",
                  margin: "md"
                },
                {
                  type: "text",
                  text: info.transitTips[0],
                  size: "xs",
                  color: "#334155",
                  wrap: true,
                  margin: "xs"
                }
              ]
            : [])
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#0284C7",
            height: "sm",
            action: {
              type: "uri",
              label: "開啟 Google 地圖導航",
              uri: mapUrl
            }
          }
        ]
      }
    },
    quickReply: DEFAULT_QUICK_REPLY
  };
}

export function createWeatherFlexMessage(w: {
  city: string;
  targetArea: string;
  condition: string;
  rainProb: string;
  minTemp: string;
  maxTemp: string;
  comfort: string;
  periods: Array<{ timeLabel: string; condition: string; rainProb: string; minTemp: string; maxTemp: string; comfort: string }>;
  advice: string;
  radarImageUrl: string;
  source: string;
}): OutgoingLineMessage {
  const periodRows = w.periods.map((p) => ({
    type: "box",
    layout: "horizontal",
    margin: "sm",
    contents: [
      {
        type: "text",
        text: p.timeLabel,
        size: "xs",
        color: "#475569",
        flex: 3
      },
      {
        type: "text",
        text: p.condition,
        size: "xs",
        color: "#1E293B",
        weight: "bold",
        flex: 2
      },
      {
        type: "text",
        text: `${p.minTemp}~${p.maxTemp}`,
        size: "xs",
        color: "#0284C7",
        flex: 2
      },
      {
        type: "text",
        text: `☔ ${p.rainProb}`,
        size: "xs",
        weight: "bold",
        color: parseInt(p.rainProb) >= 30 ? "#DC2626" : "#059669",
        align: "end",
        flex: 2
      }
    ]
  }));

  return {
    type: "flex",
    altText: `🌦️ 【${w.targetArea}】天氣預報：${w.condition}，氣溫 ${w.minTemp}~${w.maxTemp}，降雨機率 ${w.rainProb}`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#0284C7",
        paddingAll: "lg",
        contents: [
          {
            type: "text",
            text: "🌦️ 中央氣象署 (CWA) 官方即時天氣",
            color: "#FFFFFF",
            weight: "bold",
            size: "md"
          },
          {
            type: "text",
            text: `📍 觀測地區：${w.targetArea}`,
            color: "#E0F2FE",
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
          {
            type: "box",
            layout: "horizontal",
            contents: [
              {
                type: "box",
                layout: "vertical",
                flex: 3,
                contents: [
                  {
                    type: "text",
                    text: w.condition,
                    weight: "bold",
                    size: "xl",
                    color: "#0F172A"
                  },
                  {
                    type: "text",
                    text: `體感：${w.comfort}`,
                    size: "xs",
                    color: "#64748B",
                    margin: "xs"
                  }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                flex: 3,
                contents: [
                  {
                    type: "text",
                    text: `${w.minTemp} ~ ${w.maxTemp}`,
                    weight: "bold",
                    size: "lg",
                    color: "#0284C7",
                    align: "end"
                  },
                  {
                    type: "text",
                    text: `降雨率 ☔ ${w.rainProb}`,
                    weight: "bold",
                    size: "xs",
                    color: parseInt(w.rainProb) >= 30 ? "#DC2626" : "#059669",
                    align: "end",
                    margin: "xs"
                  }
                ]
              }
            ]
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "🕒 今明 36 小時時段預報",
            weight: "bold",
            size: "xs",
            color: "#64748B",
            margin: "md"
          },
          ...periodRows,
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "💡 氣象生活建議",
            weight: "bold",
            size: "xs",
            color: "#0284C7",
            margin: "md"
          },
          {
            type: "text",
            text: w.advice,
            size: "xs",
            color: "#334155",
            wrap: true,
            margin: "sm"
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "sm",
        contents: [
          {
            type: "button",
            style: "link",
            height: "sm",
            action: {
              type: "uri",
              label: "📡 開啟氣象署即時雷達回波圖",
              uri: w.radarImageUrl
            }
          }
        ]
      }
    },
    quickReply: DEFAULT_QUICK_REPLY
  };
}

export function createQuizQuestionFlexMessage(q: {
  id: string;
  subject: string;
  year: number;
  question: string;
  options: string[];
}): OutgoingLineMessage {
  // Render full wrapped option boxes (never truncated)
  const optionBoxes = q.options.map((opt, i) => {
    const letter = ["A", "B", "C", "D"][i] || "A";
    const cleanText = opt.replace(/^[A-D][.、\s]*/, "");
    return {
      type: "box",
      layout: "horizontal",
      margin: "md",
      backgroundColor: "#F8FAFC",
      cornerRadius: "md",
      paddingAll: "md",
      action: {
        type: "postback",
        displayText: `我選擇 (${letter})`,
        data: JSON.stringify({ action: "quiz_answer", qid: q.id, choice: letter })
      },
      contents: [
        {
          type: "text",
          text: `(${letter})`,
          weight: "bold",
          size: "sm",
          color: "#4F46E5",
          flex: 1
        },
        {
          type: "text",
          text: cleanText,
          wrap: true,
          size: "sm",
          color: "#1E293B",
          flex: 6
        }
      ]
    };
  });

  return {
    type: "flex",
    altText: `📝 國考測驗：[${q.year}年 ${q.subject}] ${q.question.slice(0, 30)}…`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#4F46E5",
        paddingAll: "lg",
        contents: [
          {
            type: "text",
            text: "📝 國考資訊處理考古題測驗",
            color: "#FFFFFF",
            weight: "bold",
            size: "md"
          },
          {
            type: "text",
            text: `🎯 【${q.year}年】${q.subject}`,
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
          {
            type: "text",
            text: q.question,
            wrap: true,
            weight: "bold",
            size: "sm",
            color: "#0F172A"
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "【選項清單 (可直接點擊卡片作答)】：",
            size: "xs",
            weight: "bold",
            color: "#64748B",
            margin: "md"
          },
          ...optionBoxes
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "md",
        contents: [
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            contents: [
              {
                type: "button",
                style: "primary",
                color: "#4F46E5",
                height: "sm",
                flex: 1,
                action: {
                  type: "postback",
                  label: "👉 選 (A)",
                  displayText: "我選擇 (A)",
                  data: JSON.stringify({ action: "quiz_answer", qid: q.id, choice: "A" })
                }
              },
              {
                type: "button",
                style: "primary",
                color: "#4F46E5",
                height: "sm",
                flex: 1,
                action: {
                  type: "postback",
                  label: "👉 選 (B)",
                  displayText: "我選擇 (B)",
                  data: JSON.stringify({ action: "quiz_answer", qid: q.id, choice: "B" })
                }
              }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            spacing: "sm",
            margin: "sm",
            contents: [
              {
                type: "button",
                style: "primary",
                color: "#4F46E5",
                height: "sm",
                flex: 1,
                action: {
                  type: "postback",
                  label: "👉 選 (C)",
                  displayText: "我選擇 (C)",
                  data: JSON.stringify({ action: "quiz_answer", qid: q.id, choice: "C" })
                }
              },
              {
                type: "button",
                style: "primary",
                color: "#4F46E5",
                height: "sm",
                flex: 1,
                action: {
                  type: "postback",
                  label: "👉 選 (D)",
                  displayText: "我選擇 (D)",
                  data: JSON.stringify({ action: "quiz_answer", qid: q.id, choice: "D" })
                }
              }
            ]
          }
        ]
      }
    },
    quickReply: DEFAULT_QUICK_REPLY
  };
}

export function createQuizAnswerFlexMessage(res: {
  isCorrect: boolean;
  userChoice: string;
  correctAnswer: string;
  question: {
    subject: string;
    year: number;
    question: string;
    options: string[];
    explanation: string;
  };
}): OutgoingLineMessage {
  const headerColor = res.isCorrect ? "#059669" : "#DC2626";
  const headerTitle = res.isCorrect ? "🎉 恭喜答對！正確！" : "❌ 哎呀答錯囉！";

  return {
    type: "flex",
    altText: res.isCorrect ? "🎉 測驗結果：答對了！" : "❌ 測驗結果：答錯了！",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: headerColor,
        paddingAll: "lg",
        contents: [
          {
            type: "text",
            text: headerTitle,
            color: "#FFFFFF",
            weight: "bold",
            size: "md"
          },
          {
            type: "text",
            text: `科目：${res.question.subject} (${res.question.year}年考題)`,
            color: "#F0FDF4",
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
          {
            type: "box",
            layout: "horizontal",
            contents: [
              { type: "text", text: "你的選擇：", size: "sm", color: "#64748B", flex: 2 },
              {
                type: "text",
                text: `(${res.userChoice})`,
                weight: "bold",
                size: "sm",
                color: res.isCorrect ? "#059669" : "#DC2626",
                align: "end",
                flex: 1
              }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "xs",
            contents: [
              { type: "text", text: "正確答案：", size: "sm", color: "#64748B", flex: 2 },
              {
                type: "text",
                text: `(${res.correctAnswer})`,
                weight: "bold",
                size: "sm",
                color: "#059669",
                align: "end",
                flex: 1
              }
            ]
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "【題目回顧】：",
            weight: "bold",
            size: "xs",
            color: "#64748B",
            margin: "md"
          },
          {
            type: "text",
            text: res.question.question,
            wrap: true,
            size: "xs",
            color: "#334155",
            margin: "xs"
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "💡 題目解析與重點概念",
            weight: "bold",
            size: "xs",
            color: "#4F46E5",
            margin: "md"
          },
          {
            type: "text",
            text: res.question.explanation,
            wrap: true,
            size: "xs",
            color: "#1E293B",
            margin: "sm"
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: res.isCorrect
              ? "✨ 答對了！若此題在錯題本中，系統已自動為您標記攻克！"
              : "📌 此題已為您自動收錄至【錯題本】，隨時可輸入「複習錯題」重測！",
            size: "xxs",
            color: res.isCorrect ? "#059669" : "#DC2626",
            wrap: true,
            margin: "md"
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "sm",
        spacing: "sm",
        contents: res.isCorrect
          ? [
              {
                type: "button",
                style: "primary",
                color: "#4F46E5",
                height: "sm",
                action: {
                  type: "postback",
                  label: "👉 再來一題 (下一題)",
                  displayText: "下一題測驗",
                  data: JSON.stringify({ action: "quiz_next" })
                }
              }
            ]
          : [
              {
                type: "button",
                style: "primary",
                color: "#4F46E5",
                height: "sm",
                action: {
                  type: "postback",
                  label: "👉 再來一題 (下一題)",
                  displayText: "下一題測驗",
                  data: JSON.stringify({ action: "quiz_next" })
                }
              },
              {
                type: "button",
                style: "secondary",
                height: "sm",
                action: {
                  type: "postback",
                  label: "📚 複習錯題本",
                  displayText: "複習錯題",
                  data: JSON.stringify({ action: "quiz_review_mistakes" })
                }
              }
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
  todoCount: number;
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

  return {
    type: "flex",
    altText: `🌅 【晨間全能早報】${info.dateStr} 07:00 天母天氣、美股加密與焦點要聞`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#1E3A5F",
        paddingAll: "lg",
        contents: [
          { type: "text", text: "🌅 晨間全能早報", color: "#FFFFFF", weight: "bold", size: "md" },
          { type: "text", text: `📅 台灣時間 ${info.dateStr} ${info.timeStr}`, color: "#93C5FD", size: "xs", margin: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          // Weather & Todo Row
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
                  { type: "text", text: "⛅ 天母氣象", size: "xs", color: "#0284C7", weight: "bold" },
                  { type: "text", text: `${info.weather.condition} ｜ ${info.weather.tempRange}`, size: "xs", color: "#0F172A", margin: "xs" },
                  { type: "text", text: `降雨率 ☔ ${info.weather.rainProb}`, size: "xs", color: parseInt(info.weather.rainProb) >= 30 ? "#DC2626" : "#059669" }
                ]
              },
              {
                type: "box",
                layout: "vertical",
                flex: 2,
                contents: [
                  { type: "text", text: "📋 待辦事項", size: "xs", color: "#059669", weight: "bold" },
                  { type: "text", text: `${info.todoCount} 項未完成`, size: "sm", weight: "bold", color: "#10B981", margin: "xs" },
                  { type: "text", text: "Google Sheet 同步", size: "xxs", color: "#64748B" }
                ]
              }
            ]
          },
          { type: "separator", margin: "md" },
          // US Stocks & Crypto Markets
          { type: "text", text: "📈 隔夜美股與加密走勢", weight: "bold", size: "xs", color: "#0284C7", margin: "md" },
          ...usStockRows,
          ...cryptoRows,
          { type: "separator", margin: "md" },
          // News summary
          { type: "text", text: "📰 今日重點要聞", weight: "bold", size: "xs", color: "#0284C7", margin: "md" },
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
    // Taiwan convention: Red = Up, Green = Down
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
    altText: `📈 【台股收盤總結】${info.dateStr} 15:00 加權指數與三大法人籌碼動向`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#831843", // Financial deep ruby
        paddingAll: "lg",
        contents: [
          { type: "text", text: "📈 台股收盤與籌碼總結", color: "#FFFFFF", weight: "bold", size: "md" },
          { type: "text", text: `📅 台灣時間 ${info.dateStr} ${info.timeStr} (15:00 盤後定案)`, color: "#FBCFE8", size: "xs", margin: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          { type: "text", text: "📊 主要指數與權值股表現 (紅漲綠跌)", weight: "bold", size: "xs", color: "#64748B" },
          ...quoteBoxes,
          { type: "separator", margin: "md" },
          { type: "text", text: "🏛️ 三大法人籌碼與盤面解析", weight: "bold", size: "xs", color: "#9D174D", margin: "md" },
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
      {
        type: "text",
        text: r.description,
        size: "xxs",
        color: "#475569",
        wrap: true,
        margin: "xs"
      },
      {
        type: "box",
        layout: "horizontal",
        margin: "xs",
        contents: [
          { type: "text", text: `語言: ${r.language}`, size: "xxs", color: "#64748B" }
        ]
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
        backgroundColor: "#1F2937", // GitHub dark
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

export function createFareUpdateFlexMessage(info: {
  updatedAt: string;
  source: string;
  routeCount: number;
  message: string;
}): OutgoingLineMessage {
  return {
    type: "flex",
    altText: "🚆 交通部 (TDX) 官方票價資料庫同步完成",
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#065F46", // Emerald forest
        paddingAll: "lg",
        contents: [
          { type: "text", text: "🚆 官方鐵路票價資料庫同步", color: "#FFFFFF", weight: "bold", size: "md" },
          { type: "text", text: `更新完成：${info.updatedAt}`, color: "#A7F3D0", size: "xs", margin: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          {
            type: "text",
            text: info.message,
            weight: "bold",
            size: "sm",
            color: "#0F172A",
            wrap: true
          },
          { type: "separator", margin: "md" },
          {
            type: "box",
            layout: "horizontal",
            margin: "md",
            contents: [
              { type: "text", text: "權威資料來源", size: "xs", color: "#64748B", flex: 2 },
              { type: "text", text: info.source, size: "xs", weight: "bold", color: "#065F46", align: "end", flex: 3 }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "xs",
            contents: [
              { type: "text", text: "涵蓋起訖路線", size: "xs", color: "#64748B", flex: 2 },
              { type: "text", text: `${info.routeCount} 條全台主要鐵路路線`, size: "xs", weight: "bold", color: "#0F172A", align: "end", flex: 3 }
            ]
          },
          {
            type: "box",
            layout: "horizontal",
            margin: "xs",
            contents: [
              { type: "text", text: "支援車種/車廂", size: "xs", color: "#64748B", flex: 2 },
              { type: "text", text: "台鐵各級 / 高鐵標準自由商務", size: "xs", color: "#334155", align: "end", flex: 3 }
            ]
          },
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "💡 提示：現在您可以直接在 LINE 詢問「我現在位置如何去花蓮/新竹/台中」，Bot 會自動以最新官方票價回覆！",
            size: "xs",
            color: "#475569",
            wrap: true,
            margin: "md"
          }
        ]
      }
    },
    quickReply: DEFAULT_QUICK_REPLY
  };
}

export function createMistakesFlexMessage(summary: {
  totalCount: number;
  bySubject: Record<string, number>;
  recentMistakes: Array<{
    qid: string;
    subject: string;
    year: number;
    wrongCount: number;
    lastFailedAt: string;
  }>;
}): OutgoingLineMessage {
  if (summary.totalCount === 0) {
    return {
      type: "flex",
      altText: "🎉 恭喜！目前錯題本空空如也，沒有待攻克的錯題！",
      contents: {
        type: "bubble",
        header: {
          type: "box",
          layout: "vertical",
          backgroundColor: "#059669",
          paddingAll: "lg",
          contents: [
            { type: "text", text: "📚 個人國考錯題本", color: "#FFFFFF", weight: "bold", size: "md" },
            { type: "text", text: "全科目前掌握度：100% 滿分！", color: "#F0FDF4", size: "xs", margin: "xs" }
          ]
        },
        body: {
          type: "box",
          layout: "vertical",
          paddingAll: "lg",
          contents: [
            { type: "text", text: "🎉 太棒了！您目前沒有任何未攻克的錯題。", size: "sm", color: "#1E293B", weight: "bold" },
            { type: "text", text: "持續保持練習，輸入「考一題」隨機測驗最新 114/113 年高頻考題！", size: "xs", color: "#64748B", wrap: true, margin: "md" }
          ]
        },
        footer: {
          type: "box",
          layout: "vertical",
          paddingAll: "sm",
          contents: [
            {
              type: "button",
              style: "primary",
              color: "#059669",
              height: "sm",
              action: {
                type: "postback",
                label: "🎯 開始隨機測驗",
                displayText: "考一題",
                data: JSON.stringify({ action: "quiz_next" })
              }
            }
          ]
        }
      },
      quickReply: DEFAULT_QUICK_REPLY
    };
  }

  const subjectRows = Object.entries(summary.bySubject).map(([subj, count]) => ({
    type: "box",
    layout: "horizontal",
    margin: "xs",
    contents: [
      { type: "text", text: `• ${subj}`, size: "xs", color: "#475569", flex: 3 },
      { type: "text", text: `${count} 題`, size: "xs", weight: "bold", color: "#DC2626", align: "end", flex: 1 }
    ]
  }));

  return {
    type: "flex",
    altText: `📚 【個人國考錯題本】目前累積 ${summary.totalCount} 題待攻克錯題`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        backgroundColor: "#DC2626", // Red for mistake book
        paddingAll: "lg",
        contents: [
          { type: "text", text: "📚 個人國考錯題本 (待攻克)", color: "#FFFFFF", weight: "bold", size: "md" },
          { type: "text", text: `累積待突破錯題：共 ${summary.totalCount} 題`, color: "#FEF2F2", size: "xs", margin: "xs" }
        ]
      },
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "lg",
        contents: [
          { type: "text", text: "📊 各考科待複習分佈：", weight: "bold", size: "xs", color: "#64748B" },
          ...subjectRows,
          { type: "separator", margin: "md" },
          {
            type: "text",
            text: "💡 專項建議：點擊下方按鈕或輸入「複習錯題」，系統將優先抽取您曾答錯的高頻考點進行重新挑戰！答對自動移出錯題本。",
            size: "xxs",
            color: "#64748B",
            wrap: true,
            margin: "md"
          }
        ]
      },
      footer: {
        type: "box",
        layout: "vertical",
        paddingAll: "sm",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            color: "#DC2626",
            height: "sm",
            action: {
              type: "postback",
              label: "🎯 開始複習錯題 (重測)",
              displayText: "複習錯題",
              data: JSON.stringify({ action: "quiz_review_mistakes" })
            }
          },
          {
            type: "button",
            style: "secondary",
            height: "sm",
            action: {
              type: "postback",
              label: "👉 做一般新題 (隨機)",
              displayText: "考一題",
              data: JSON.stringify({ action: "quiz_next" })
            }
          }
        ]
      }
    },
    quickReply: DEFAULT_QUICK_REPLY
  };
}
