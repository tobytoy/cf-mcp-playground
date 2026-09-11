import type { Env } from "../types/env";
import type { LineEvent } from "../types/line";
import { LineClient } from "../line/client";
import {
  createDashboardFlexMessage,
  createOcrVaultFlexMessage,
  createTodoFlexMessage,
  createCalculatorFlexMessage,
  createWeatherFlexMessage,
  createLocationTransportFlexMessage,
  createSearchFlexMessage,
  DEFAULT_QUICK_REPLY
} from "../line/templates";
import { createFeatureListFlexMessage } from "../config/modules";
import { NeedleClassifier } from "../classifier/needle";
import { evaluateMathExpression } from "../tools/calculator";
import { executeTavilySearch } from "../tools/search";
import { getTaiwanWeatherForecast } from "../tools/weather";
import { getNearbyTransportContext } from "../tools/tdxTransport";
import { LocationManager } from "../tools/locationManager";
import { PersonalTodoManager } from "../tools/personalTodo";
import { processImageOcrAndVault } from "../tools/ocrDriveVault";
import { transcribeAudio } from "../tools/voiceTranscribe";
import { generateAiResponse } from "../tools/aiChat";
import { DiscordLogger } from "../tools/discordLogger";
import { executeStockBriefing } from "../cron/stockBriefing";
import { executeMorningBriefing } from "../cron/morningBriefing";

export async function processLineEvent(event: LineEvent, env: Env): Promise<void> {
  const startTime = Date.now();
  const lineClient = new LineClient(env.LINE_CHANNEL_ACCESS_TOKEN);
  const discord = new DiscordLogger(env.DISCORD_WEBHOOK_URL, env.PERSONAL_KV);
  const locManager = new LocationManager(env.PERSONAL_KV);
  const todoManager = new PersonalTodoManager(env.PERSONAL_KV, env.GOOGLE_SHEET_APP_URL);
  const classifier = new NeedleClassifier();
  const userId = event.source.userId || "anonymous";
  const replyToken = "replyToken" in event ? event.replyToken : undefined;

  try {
    // -------------------------------------------------------------------------
    // 0. Follow Event (New Friend / Unblock Greeting)
    // -------------------------------------------------------------------------
    if (event.type === "follow") {
      await discord.sendInfo("👋 新好友加入關注", `使用者：\`${userId}\` 加入了 bfg007 私人生活助理！`);
      await lineClient.replyOrPush(replyToken, userId, createDashboardFlexMessage());
      return;
    }

    // -------------------------------------------------------------------------
    // 1. Image Messages (Auto OCR & Drive Vault)
    // -------------------------------------------------------------------------
    if (event.type === "message" && event.message.type === "image") {
      const imageId = event.message.id;
      if (userId) await lineClient.showLoading(userId, 25);

      const imageBuffer = await lineClient.getMessageContent(imageId);
      if (!imageBuffer) {
        await lineClient.replyOrPush(replyToken, userId, {
          type: "text",
          text: "📸 抱歉，圖片下載失敗，請重新傳送一次。",
          quickReply: DEFAULT_QUICK_REPLY
        });
        return;
      }

      // Perform Gemini Vision OCR & sync to Google Drive / Sheet
      const ocrResult = await processImageOcrAndVault(
        imageBuffer,
        "image/jpeg",
        env.GEMINI_API_KEY,
        env.GOOGLE_SHEET_APP_URL
      );

      // Discord Info notification
      await discord.sendInfo(
        "📸 圖片單據 OCR 歸檔完成",
        `單號：\`${ocrResult.fileId}\`\n摘要：${ocrResult.summary}\nDrive 連結：${ocrResult.fileUrl}`,
        [
          { name: "使用者", value: userId, inline: true },
          { name: "耗時", value: `${Date.now() - startTime}ms`, inline: true }
        ]
      );

      // Reply with dedicated Flex Message
      await lineClient.replyOrPush(replyToken, userId, createOcrVaultFlexMessage(ocrResult));
      return;
    }

    // -------------------------------------------------------------------------
    // 1b. File Document Messages (PDF, Docs -> Auto Drive Vault)
    // -------------------------------------------------------------------------
    if (event.type === "message" && event.message.type === "file") {
      const fileMsg = event.message;
      if (userId) await lineClient.showLoading(userId, 20);

      const fileBuffer = await lineClient.getMessageContent(fileMsg.id);
      if (!fileBuffer) {
        await lineClient.replyOrPush(replyToken, userId, {
          type: "text",
          text: `📁 檔案「${fileMsg.fileName}」下載失敗，請重新傳送一次。`,
          quickReply: DEFAULT_QUICK_REPLY
        });
        return;
      }

      const isPdf = fileMsg.fileName.toLowerCase().endsWith(".pdf");
      const mimeType = isPdf ? "application/pdf" : "application/octet-stream";

      const ocrResult = await processImageOcrAndVault(
        fileBuffer,
        mimeType,
        env.GEMINI_API_KEY,
        env.GOOGLE_SHEET_APP_URL
      );

      await discord.sendInfo(
        "📁 收到文件檔案並歸檔至 Google Drive",
        `檔名：\`${fileMsg.fileName}\` (${(fileMsg.fileSize / 1024).toFixed(1)} KB)\n單號：\`${ocrResult.fileId}\`\nDrive 連結：${ocrResult.fileUrl}`,
        [
          { name: "使用者", value: userId, inline: true },
          { name: "耗時", value: `${Date.now() - startTime}ms`, inline: true }
        ]
      );

      await lineClient.replyOrPush(replyToken, userId, {
        type: "text",
        text: `📁 【檔案已自動歸檔至 Google Drive】\n\n• 檔案名稱：${fileMsg.fileName}\n• 檔案大小：${(fileMsg.fileSize / 1024).toFixed(1)} KB\n• 儲存單號：${ocrResult.fileId}\n• 雲端連結：${ocrResult.fileUrl}\n\n已同步記錄於 Google Sheet 第二頁，您可在 Mini App 隨時檢視或管理！`,
        quickReply: DEFAULT_QUICK_REPLY
      });
      return;
    }

    // -------------------------------------------------------------------------
    // 2. Location Pin Sharing Messages
    // -------------------------------------------------------------------------
    if (event.type === "message" && event.message.type === "location") {
      const loc = event.message;
      await locManager.saveLocation(userId, loc.latitude, loc.longitude, loc.title, loc.address);
      const [transportContext, weather] = await Promise.all([
        getNearbyTransportContext(loc.latitude, loc.longitude, loc.title, loc.address),
        getTaiwanWeatherForecast(loc.title || loc.address || "台北", env.CWA_API_KEY)
      ]);
      transportContext.weather = weather;

      await discord.sendInfo(
        "📍 收到位置資訊並產生生活情報",
        `地點：\`${loc.title || "未知"}\` (${loc.latitude}, ${loc.longitude})\n地址：${loc.address || ""}\n天氣：${weather.condition} ${weather.minTemp}~${weather.maxTemp}°C`
      );

      await lineClient.replyOrPush(replyToken, userId, createLocationTransportFlexMessage(transportContext));
      return;
    }

    // -------------------------------------------------------------------------
    // 3. Audio Messages (Voice to Text) & Text Messages -> Unified into userText
    // -------------------------------------------------------------------------
    let userText = "";
    let isVoice = false;

    if (event.type === "message" && event.message) {
      if (event.message.type === "audio") {
        isVoice = true;
        const audioId = event.message.id;
        if (userId) await lineClient.showLoading(userId, 20);

        const audioBuffer = await lineClient.getMessageContent(audioId);
        if (!audioBuffer) {
          await lineClient.replyOrPush(replyToken, userId, {
            type: "text",
            text: "🎙️ 語音音訊下載失敗，請靠近麥克風再試一次，或以文字輸入。",
            quickReply: DEFAULT_QUICK_REPLY
          });
          return;
        }

        const transcription = await transcribeAudio(audioBuffer, env.GEMINI_API_KEY, "audio/m4a", true);
        if (!transcription.success || !transcription.text) {
          await lineClient.replyOrPush(replyToken, userId, {
            type: "text",
            text: `🎙️ 語音辨識未能完成：${transcription.error || "請重試一次"}`,
            quickReply: DEFAULT_QUICK_REPLY
          });
          return;
        }

        userText = transcription.text.trim();
        await discord.sendInfo(
          "🎙️ 語音訊息轉寫完成",
          `發送者：\`${userId}\`\n轉寫內容：\`${userText}\`\n準備進行 Needle 意圖分析與執行...`
        );
      } else if (event.message.type === "text" && typeof event.message.text === "string") {
        userText = event.message.text.trim();
      }
    }

    // -------------------------------------------------------------------------
    // 4. Needle Intent Classification & Tool Dispatch
    // -------------------------------------------------------------------------
    if (userText) {
      if (userId && !isVoice) await lineClient.showLoading(userId, 15);

      const userLoc = await locManager.getLocation(userId);
      let effectiveText = userText;

      if (locManager.hasRelativeLocationReference(userText)) {
        effectiveText = locManager.enrichPromptWithLocation(userText, userLoc);
      }

      const routing = classifier.classify(userText);
      // Discord Info log of Needle routing
      await discord.sendInfo(
        "🤖 Needle 意圖路由分發",
        `**輸入內容**：\`${userText}\`\n**分發工具**：\`${routing.tool}\` (信心度: ${routing.confidence})\n**使用者**：\`${userId}\``
      );

      switch (routing.tool) {
        // Interactive Dashboard Card (bfg007 快捷操作卡片)
        case "dashboard": {
          await lineClient.replyOrPush(replyToken, userId, createDashboardFlexMessage());
          break;
        }

        // List Supported Features
        case "list_features": {
          await lineClient.replyOrPush(replyToken, userId, createFeatureListFlexMessage("personal"));
          break;
        }

        // OCR Inquiry
        case "ocr_vault": {
          await lineClient.replyOrPush(replyToken, userId, {
            type: "text",
            text: "📸 【拍照單據 OCR 與雲端存檔功能】：\n\n只要直接在對話中拍照或傳送圖片（發票、收據、公用事業繳費單、醫療收據或公文）：\n\n1. AI (Gemini Vision) 在 2 秒內辨識文字與應繳金額\n2. 自動備份上傳至 Google Drive\n3. 同步寫入您的 Google 試算表第二頁\n\n👉 您現在就可以直接拍一張收據或發票傳給我試試看喔！",
            quickReply: DEFAULT_QUICK_REPLY
          });
          break;
        }

        // Discord Log Toggle
        case "discord_toggle": {
          const isEnable = (routing.arguments.enable as boolean) ?? true;
          await discord.setInfoLoggingEnabled(isEnable);
          await lineClient.replyOrPush(replyToken, userId, {
            type: "text",
            text: isEnable
              ? "🔔 已成功「開啟」Discord 日誌紀錄！後續的對話與操作摘要將同步轉發至您的 Discord 頻道。"
              : "🔕 已「關閉」Discord 一般訊息紀錄，僅保留重大異常錯誤告警。",
            quickReply: DEFAULT_QUICK_REPLY
          });
          break;
        }

        // Calculator
        case "calculator": {
          const expr = (routing.arguments.expression as string) || userText;
          const calcResult = evaluateMathExpression(expr);
          await lineClient.replyOrPush(
            replyToken,
            userId,
            createCalculatorFlexMessage(calcResult.expression, calcResult.result, calcResult.explanation)
          );
          break;
        }

        // Todos
        case "manage_todo": {
          const action = (routing.arguments.action as string) || "list";
          const itemText = (routing.arguments.item as string) || "";
          let feedbackNotice: string | undefined;

          if (action === "add" && itemText) {
            const added = await todoManager.addTodo(userId, itemText, "生活");
            feedbackNotice = `✅ 已成功新增待辦：「[${added.category}] ${added.item}」`;
          } else if (action === "complete" && itemText) {
            const completed = await todoManager.completeTodo(userId, itemText);
            if (completed) {
              feedbackNotice = `✅ 已將待辦「[${completed.category}] ${completed.item}」標記為已完成！`;
            } else {
              feedbackNotice = `⚠️ 找不到符合「${itemText}」的進行中待辦項目。`;
            }
          }

          const currentTodos = await todoManager.getTodos(userId);
          await lineClient.replyOrPush(replyToken, userId, createTodoFlexMessage(currentTodos, feedbackNotice));
          break;
        }

        // Transport & YouBike
        case "nearby_transport": {
          const userLoc = await locManager.getLocation(userId);
          const [transport, weather] = await Promise.all([
            getNearbyTransportContext(
              userLoc.latitude,
              userLoc.longitude,
              userLoc.title,
              userLoc.address
            ),
            getTaiwanWeatherForecast(userLoc.title || userLoc.address || "台北", env.CWA_API_KEY)
          ]);
          transport.weather = weather;
          await lineClient.replyOrPush(replyToken, userId, createLocationTransportFlexMessage(transport));
          break;
        }

        // Weather
        case "weather_forecast": {
          const targetLoc = locManager.hasRelativeLocationReference(userText)
            ? (userLoc.address || userLoc.title)
            : userText;
          const weather = await getTaiwanWeatherForecast(targetLoc, env.CWA_API_KEY);
          await lineClient.replyOrPush(replyToken, userId, createWeatherFlexMessage(weather));
          break;
        }

        // Stock & Market Briefings
        case "briefing_stock": {
          await executeStockBriefing(env, userId);
          break;
        }

        case "briefing_morning": {
          await executeMorningBriefing(env, userId);
          break;
        }

        // Search
        case "search_web": {
          const query = (routing.arguments.query as string) || userText;
          const searchRes = await executeTavilySearch(query, env.TAVILY_API_KEY, env.GEMINI_API_KEY);
          await lineClient.replyOrPush(
            replyToken,
            userId,
            createSearchFlexMessage(searchRes.query, searchRes.summary, searchRes.results)
          );
          break;
        }

        // Default: Chat with HelperDog
        case "ask_llm":
        default: {
          const aiReply = await generateAiResponse(effectiveText, env.GEMINI_API_KEY, "gemini-3.5-flash-lite");
          const voicePrefix = isVoice ? `🎙️ 【語音辨識】：「${userText}」\n\n` : "";
          await lineClient.replyOrPush(replyToken, userId, {
            type: "text",
            text: `${voicePrefix}${aiReply.text}`,
            quickReply: DEFAULT_QUICK_REPLY
          });
          break;
        }
      }
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[EventProcessor] Personal Assistant Error:", error);

    // Mandatory: Send alert to Discord Webhook!
    await discord.sendError("LINE 助理事件處理異常", errorMsg, {
      userId,
      eventType: event.type,
      durationMs: Date.now() - startTime
    });

    await lineClient.replyOrPush(replyToken, userId, {
      type: "text",
      text: `🐶 抱歉，處理您的訊息時發生了一點小狀況：${errorMsg}\n(已自動回報系統錯誤紀錄至守護犬 Discord)`,
      quickReply: DEFAULT_QUICK_REPLY
    });
  }
}
