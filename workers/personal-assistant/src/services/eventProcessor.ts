import type { Env } from "../types/env";
import type { LineEvent } from "../types/line";
import { LineClient } from "../line/client";
import {
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

      // Discord Info notification if enabled
      await discord.sendInfo(
        "📸 圖片單據 OCR 歸檔完成",
        `單號：\`${ocrResult.fileId}\`\n摘要：${ocrResult.summary}`,
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
    // 2. Audio Voice Messages (Voice to Text + Speaker Diarization)
    // -------------------------------------------------------------------------
    if (event.type === "message" && event.message.type === "audio") {
      const audioId = event.message.id;
      if (userId) await lineClient.showLoading(userId, 20);

      const audioBuffer = await lineClient.getMessageContent(audioId);
      if (!audioBuffer) {
        await lineClient.replyOrPush(replyToken, userId, {
          type: "text",
          text: "🎙️ 語音音訊下載失敗，請靠近麥克風再試一次。",
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

      await lineClient.replyOrPush(replyToken, userId, {
        type: "text",
        text: `🎙️ 【語音逐字稿整理】：\n\n${transcription.text}\n\n💡 提示：點擊下方快速按鈕可將內容存為待辦！`,
        quickReply: DEFAULT_QUICK_REPLY
      });
      return;
    }

    // -------------------------------------------------------------------------
    // 3. Location Pin Sharing Messages
    // -------------------------------------------------------------------------
    if (event.type === "message" && event.message.type === "location") {
      const loc = event.message;
      await locManager.saveLocation(userId, loc.latitude, loc.longitude, loc.title, loc.address);
      const transportContext = await getNearbyTransportContext(loc.latitude, loc.longitude, loc.title, loc.address);
      await lineClient.replyOrPush(replyToken, userId, createLocationTransportFlexMessage(transportContext));
      return;
    }

    // -------------------------------------------------------------------------
    // 4. Text Messages
    // -------------------------------------------------------------------------
    if (event.type === "message" && event.message.type === "text") {
      const text = event.message.text.trim();
      if (userId) await lineClient.showLoading(userId, 15);

      const routing = classifier.classify(text);

      switch (routing.tool) {
        // List Supported Features
        case "list_features": {
          await lineClient.replyOrPush(replyToken, userId, createFeatureListFlexMessage("personal"));
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
          const expr = (routing.arguments.expression as string) || text;
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

          if (action === "add" && itemText) {
            await todoManager.addTodo(userId, itemText, "生活");
          }

          const currentTodos = await todoManager.getTodos(userId);
          await lineClient.replyOrPush(replyToken, userId, createTodoFlexMessage(currentTodos));
          break;
        }

        // Weather
        case "weather_forecast": {
          const weather = await getTaiwanWeatherForecast(text, env.CWA_API_KEY);
          await lineClient.replyOrPush(replyToken, userId, createWeatherFlexMessage(weather));
          break;
        }

        // Transport & YouBike
        case "nearby_transport": {
          const userLoc = await locManager.getLocation(userId);
          const transport = await getNearbyTransportContext(
            userLoc.latitude,
            userLoc.longitude,
            userLoc.title,
            userLoc.address
          );
          await lineClient.replyOrPush(replyToken, userId, createLocationTransportFlexMessage(transport));
          break;
        }

        // Search
        case "search_web": {
          const query = (routing.arguments.query as string) || text;
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
          const aiReply = await generateAiResponse(text, env.GEMINI_API_KEY, "gemini-3.5-flash-lite");
          await lineClient.replyOrPush(replyToken, userId, {
            type: "text",
            text: aiReply.text,
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
