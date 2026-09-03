import type { Env } from "../types/env";
import type { LineEvent } from "../types/line";
import { LineClient } from "../line/client";
import {
  createSearchFlexMessage,
  createCalculatorFlexMessage,
  createTodoFlexMessage,
  createFileFlexMessage,
  createStatsFlexMessage,
  createLocationTransportFlexMessage,
  createQuizQuestionFlexMessage,
  createQuizAnswerFlexMessage,
  createWeatherFlexMessage,
  DEFAULT_QUICK_REPLY
} from "../line/templates";
import { NeedleClassifier } from "../classifier/needle";
import { AiRouter } from "../classifier/aiRouter";
import { evaluateMathExpression } from "../tools/calculator";
import { executeTavilySearch } from "../tools/search";
import { summarizeUrl } from "../tools/reader";
import { TodoMemoManager } from "../tools/todoMemo";
import { generateAiResponse } from "../tools/aiChat";
import { lookupFile } from "../tools/fileSender";
import { AnalyticsManager } from "../tools/analytics";
import { getNearbyTransportContext } from "../tools/tdxTransport";
import { QuizManager } from "../tools/quizManager";
import { getTaiwanWeatherForecast } from "../tools/weather";
import { DiagnosticLogger } from "../tools/diagnostics";
import { transcribeLineAudio } from "../tools/voiceTranscribe";
import { LocationManager } from "../tools/locationManager";
import { formatForLineMessage } from "../utils/lineFormatter";

export async function processLineEvent(event: LineEvent, env: Env): Promise<void> {
  const startTime = Date.now();
  const lineClient = new LineClient(env.LINE_CHANNEL_ACCESS_TOKEN);
  const todoMemo = new TodoMemoManager(env.ASSISTANT_KV, env.GOOGLE_SHEET_APP_URL);
  const classifier = new NeedleClassifier(env);
  const aiRouter = new AiRouter(env.GEMINI_API_KEY);
  const analytics = new AnalyticsManager(env.ASSISTANT_KV);
  const locManager = new LocationManager(env.ASSISTANT_KV);
  const diagLogger = new DiagnosticLogger(env.ASSISTANT_KV);
  const userId = event.source.userId || "anonymous";
  const replyToken = event.replyToken;

  const stageLogs: string[] = [];

  try {
    // 1. Handle Postback Actions (e.g. clicking "完成" on Todo or Quiz choice)
    if (event.type === "postback" && event.postback?.data) {
      await handlePostback(event.postback.data, userId, replyToken, lineClient, todoMemo);
      return;
    }

    // 2. Handle Location Sharing Messages (GPS pin dropped by user in LINE)
    if (event.type === "message" && event.message && event.message.type === "location") {
      const locMsg = event.message as { latitude: number; longitude: number; title?: string; address?: string };
      const lat = locMsg.latitude;
      const lon = locMsg.longitude;
      const title = locMsg.title || "目前分享位置";
      const address = locMsg.address || "";

      // Save / Update user's persistent location state
      const savedLoc = await locManager.saveLocation(userId, lat, lon, title, address);
      stageLogs.push(`Updated user location state: ${savedLoc.address} (${savedLoc.latitude}, ${savedLoc.longitude})`);
      await analytics.recordUsage(userId, "nearby_transport", `位置更新: ${title}`);

      const transportContext = await getNearbyTransportContext(lat, lon, title, address, env.CWA_API_KEY);
      stageLogs.push("Retrieved transport & weather context");
      await lineClient.replyOrPush(replyToken, userId, createLocationTransportFlexMessage(transportContext));

      await diagLogger.log({
        durationMs: Date.now() - startTime,
        userId,
        userPrompt: `[Location] ${title} (${lat}, ${lon})`,
        tool: "nearby_transport",
        status: "success",
        stageLogs
      });
      return;
    }

    // 3. Handle Voice Messages (Audio) and Text Messages
    let userText = "";
    let isVoice = false;

    if (event.type === "message" && event.message) {
      if (event.message.type === "audio") {
        isVoice = true;
        const audioMsg = event.message as { id: string; duration?: number };
        stageLogs.push(`Received audio message ID: ${audioMsg.id} (${audioMsg.duration || 0}ms)`);

        if (event.source.userId) {
          await lineClient.showLoading(event.source.userId, 20);
        }

        const audioBuffer = await lineClient.getMessageContent(audioMsg.id);
        if (!audioBuffer) {
          await lineClient.replyOrPush(replyToken, userId, {
            type: "text",
            text: "🎙️ 語音檔下載失敗，請靠近麥克風再試一次，或以文字輸入。",
            quickReply: DEFAULT_QUICK_REPLY
          });
          return;
        }

        const transcription = await transcribeLineAudio(audioBuffer, env.GEMINI_API_KEY);
        if (!transcription.success || !transcription.text) {
          await lineClient.replyOrPush(replyToken, userId, {
            type: "text",
            text: `🎙️ 抱歉，未能清晰辨識您的語音內容（${transcription.error || "請再試一次或直接打字"}）`,
            quickReply: DEFAULT_QUICK_REPLY
          });
          return;
        }

        userText = transcription.text.trim();
        stageLogs.push(`Voice transcribed -> "${userText}"`);
        await analytics.recordUsage(userId, "voice_transcribe", userText);
      } else if (event.message.type === "text" && typeof event.message.text === "string") {
        userText = event.message.text.trim();
        stageLogs.push(`Received text: "${userText}"`);
      }
    }

    if (userText) {
      // Start LINE chat loading animation if not already started
      if (event.source.userId && !isVoice) {
        await lineClient.showLoading(event.source.userId, 20);
      }

      // Retrieve user's saved location (defaults to Tianmu if not yet shared)
      const userLoc = await locManager.getLocation(userId);
      let effectiveText = userText;

      // If user asks about "我現在位置", "我的位置", "從這裡", etc., enrich with geographic coordinates and address
      if (locManager.hasRelativeLocationReference(userText)) {
        effectiveText = locManager.enrichPromptWithLocation(userText, userLoc);
        stageLogs.push(`Resolved relative location: [${userLoc.title} - ${userLoc.address}]`);
      }
      // Classify intent via Needle (with Gemini fallback)
      const routingStart = Date.now();
      const routing = await classifier.classify(userText, (p) => aiRouter.routeWithGemini(p));
      stageLogs.push(`Routed to [${routing.tool}] in ${Date.now() - routingStart}ms (conf: ${routing.confidence})`);

      // Record usage statistics
      await analytics.recordUsage(userId, routing.tool, userText, routing.target_model);

      // Dispatch to Tool
      switch (routing.tool) {
        case "calculator": {
          const expr = (routing.arguments.expression as string) || userText;
          const calcResult = evaluateMathExpression(expr);
          stageLogs.push(`Calculated: ${calcResult.expression} = ${calcResult.result}`);
          await lineClient.replyOrPush(
            replyToken,
            userId,
            createCalculatorFlexMessage(calcResult.expression, calcResult.result, calcResult.explanation)
          );
          break;
        }

        case "search_web": {
          const query = (routing.arguments.query as string) || userText;
          stageLogs.push(`Starting 2-stage search pipeline for: "${query}"`);
          const searchStart = Date.now();
          const searchRes = await executeTavilySearch(query, env.TAVILY_API_KEY || "", env.GEMINI_API_KEY);
          stageLogs.push(`Search & synthesis completed in ${Date.now() - searchStart}ms`);
          await lineClient.replyOrPush(
            replyToken,
            userId,
            createSearchFlexMessage(
              searchRes.query,
              searchRes.summary,
              searchRes.results.map((r) => ({ title: r.title, url: r.url }))
            )
          );
          break;
        }

        case "read_url": {
          const targetUrl = (routing.arguments.url as string) || (userText.match(/https?:\/\/[^\s]+/)?.[0] ?? "");
          stageLogs.push(`Reading URL: ${targetUrl}`);
          const summaryRes = await summarizeUrl(targetUrl, env.GEMINI_API_KEY, userText);
          stageLogs.push(`URL summary completed`);
          await lineClient.replyOrPush(replyToken, userId, {
            type: "text",
            text: `📰 【網頁摘要整理】\n\n${formatForLineMessage(summaryRes.summary)}`,
            quickReply: DEFAULT_QUICK_REPLY
          });
          break;
        }

        case "manage_todo": {
          const action = (routing.arguments.action as string) || "list";
          const itemText = (routing.arguments.item as string) || "";
          const itemId = (routing.arguments.item_id as string) || "";

          if (action === "add" && itemText) {
            await todoMemo.addTodo(userId, itemText, isVoice ? "LINE 語音" : "LINE 文字");
          } else if (action === "done" && itemId) {
            await todoMemo.completeTodo(userId, itemId);
          } else if (action === "delete" && itemId) {
            await todoMemo.deleteTodo(userId, itemId);
          }

          const currentTodos = await todoMemo.getTodos(userId);
          stageLogs.push(`Todo action: ${action}, total items: ${currentTodos.length}`);
          await lineClient.replyOrPush(replyToken, userId, createTodoFlexMessage(currentTodos));
          break;
        }

        case "save_memo": {
          const content = (routing.arguments.content as string) || userText;
          const memo = await todoMemo.saveMemo(userId, content);
          stageLogs.push(`Saved memo ID: ${memo.id}`);
          await lineClient.replyOrPush(replyToken, userId, {
            type: "text",
            text: `📌 已為您記錄備忘 (ID: ${memo.id})：\n\n「${memo.content}」`,
            quickReply: DEFAULT_QUICK_REPLY
          });
          break;
        }

        case "send_file": {
          const fileQuery = (routing.arguments.file_id as string) || userText;
          const file = lookupFile(fileQuery);
          stageLogs.push(`Delivering file: ${file.name}`);
          await lineClient.replyOrPush(
            replyToken,
            userId,
            createFileFlexMessage(file.name, file.url, file.description)
          );
          break;
        }

        case "nearby_transport": {
          const locQuery = (routing.arguments.location as string) || userText;
          const isRelative = locManager.hasRelativeLocationReference(locQuery) || !locQuery || locQuery.includes("附近") || locQuery.includes("周邊");
          const lat = isRelative ? userLoc.latitude : 25.1119;
          const lon = isRelative ? userLoc.longitude : 121.5312;
          const title = isRelative ? userLoc.title : locQuery;
          const address = isRelative ? userLoc.address : `台北市 (${locQuery})`;
          stageLogs.push(`Querying transport context for ${title} (${lat}, ${lon})`);
          const transportContext = await getNearbyTransportContext(lat, lon, title, address, env.CWA_API_KEY);
          await lineClient.replyOrPush(replyToken, userId, createLocationTransportFlexMessage(transportContext));
          break;
        }
        case "weather_forecast": {
          let locQuery = (routing.arguments.location as string) || userText;
          if (locManager.hasRelativeLocationReference(locQuery) || !locQuery) {
            locQuery = userLoc.address || userLoc.title;
          }
          stageLogs.push(`Querying CWA weather for ${locQuery}`);
          const weather = await getTaiwanWeatherForecast(locQuery, env.CWA_API_KEY);
          await lineClient.replyOrPush(replyToken, userId, createWeatherFlexMessage(weather));
          break;
        }

        case "exam_quiz": {
          let subjectFilter: string | undefined = undefined;
          const prompt = userText.toLowerCase();
          if (prompt.includes("資料庫") || prompt.includes("db") || prompt.includes("sql")) subjectFilter = "高等資料庫設計";
          else if (prompt.includes("資安") || prompt.includes("安全") || prompt.includes("資管")) subjectFilter = "資訊管理與資通安全";
          else if (prompt.includes("系統分析") || prompt.includes("uml") || prompt.includes("架構")) subjectFilter = "系統分析與設計";
          else if (prompt.includes("專案") || prompt.includes("軟工") || prompt.includes("敏捷")) subjectFilter = "軟體專案管理";
          else if (prompt.includes("憲法") || prompt.includes("英文") || prompt.includes("法學")) subjectFilter = "憲法與英文";
          else if (prompt.includes("國文") || prompt.includes("公文")) subjectFilter = "國文";

          const question = QuizManager.pickRandomQuestion(subjectFilter);
          stageLogs.push(`Quiz question selected: [${question.year} ${question.subject}] ${question.id}`);
          await lineClient.replyOrPush(replyToken, userId, createQuizQuestionFlexMessage(question));
          break;
        }

        case "view_stats": {
          const stats = await analytics.getUsageReport(userId);
          stageLogs.push(`Retrieved stats: total ${stats.totalCalls} calls`);
          await lineClient.replyOrPush(replyToken, userId, createStatsFlexMessage(stats));
          break;
        }

        case "view_debug": {
          const recentLogs = await diagLogger.getRecentLogs(10);
          const recentErrors = await diagLogger.getRecentErrors(5);

          let debugReport = "🛠️ 【系統運行診斷與日誌報告】\n";
          debugReport += `• 狀態：系統正常運行中\n`;
          debugReport += `• 完整線上日誌網址：https://line-assistant-worker.tobywang2021.workers.dev/debug\n\n`;

          debugReport += "⏱️ 【最近 5 筆請求耗時紀錄】：\n";
          if (recentLogs.length > 0) {
            for (const l of recentLogs.slice(0, 5)) {
              const statusIcon = l.status === "success" ? "✅" : "❌";
              debugReport += `${statusIcon} [${l.timestamp}] ${l.tool}: ${l.durationMs}ms\n   問: "${l.userPrompt.slice(0, 20)}"\n`;
            }
          } else {
            debugReport += "尚無近期日誌\n";
          }

          if (recentErrors.length > 0) {
            debugReport += "\n⚠️ 【最近異常紀錄】：\n";
            for (const err of recentErrors.slice(0, 3)) {
              debugReport += `• [${err.timestamp}] ${err.tool}: ${err.error || "未知錯誤"}\n`;
            }
          }

          await lineClient.replyOrPush(replyToken, userId, {
            type: "text",
            text: debugReport.trim(),
            quickReply: DEFAULT_QUICK_REPLY
          });
          break;
        }
        case "complex_task": {
          const prompt = effectiveText;
          const targetModel = routing.target_model || aiRouter.pickTargetModel(prompt, "complex_task");
          stageLogs.push(`Complex Task identified! Invoking Advanced Gemini (${targetModel}) with deep reasoning`);

          const aiStart = Date.now();
          const isCode = /(程式碼|代碼|debug|演算法|code|function|class|sql|ts|py|重構)/i.test(prompt);
          const aiReply = await generateAiResponse(
            prompt,
            env.GEMINI_API_KEY,
            targetModel,
            [],
            isCode ? "code" : "detailed",
            userLoc
          );
          stageLogs.push(`Advanced Gemini responded in ${Date.now() - aiStart}ms using ${aiReply.modelUsed}`);

          if (aiReply.modelUsed && aiReply.modelUsed !== "none") {
            await analytics.recordUsage(userId, "complex_task", userText, aiReply.modelUsed);
          }

          const voicePrefix = isVoice ? `🎙️ 【語音辨識】：「${userText}」\n\n` : "";
          const headerBadge = `🧠 【高級深度思考・${aiReply.modelUsed || targetModel}】\n\n`;

          await lineClient.replyOrPush(replyToken, userId, {
            type: "text",
            text: `${voicePrefix}${headerBadge}${aiReply.text}`,
            quickReply: DEFAULT_QUICK_REPLY
          });
          break;
        }

        case "ask_llm":
        default: {
          const prompt = effectiveText;
          const targetModel = routing.target_model || aiRouter.pickTargetModel(prompt);
          stageLogs.push(`Invoking LLM with target model: ${targetModel}`);
          const aiStart = Date.now();
          const aiReply = await generateAiResponse(prompt, env.GEMINI_API_KEY, targetModel, [], "concise", userLoc);
          stageLogs.push(`LLM responded in ${Date.now() - aiStart}ms using ${aiReply.modelUsed}`);

          if (aiReply.modelUsed && aiReply.modelUsed !== "none") {
            await analytics.recordUsage(userId, "ask_llm", userText, aiReply.modelUsed);
          }

          const replyPrefix = isVoice ? `🎙️ 【語音辨識】：「${userText}」\n\n` : "";
          await lineClient.replyOrPush(replyToken, userId, {
            type: "text",
            text: `${replyPrefix}${aiReply.text}`,
            quickReply: DEFAULT_QUICK_REPLY
          });
          break;
        }

      }

      // Record successful diagnostic log
      await diagLogger.log({
        durationMs: Date.now() - startTime,
        userId,
        userPrompt: userText,
        tool: routing.tool,
        targetModel: routing.target_model,
        status: "success",
        stageLogs
      });
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    stageLogs.push(`ERROR: ${errorMsg}`);
    console.error("[EventProcessor] Error handling LINE event:", error);

    await diagLogger.log({
      durationMs: Date.now() - startTime,
      userId,
      userPrompt: event.type === "message" && event.message && "text" in event.message ? String(event.message.text) : "[Non-text event]",
      tool: "error_handler",
      status: "error",
      stageLogs,
      error: errorMsg
    });

    await lineClient.replyOrPush(replyToken, userId, {
      type: "text",
      text: `抱歉，處理您的訊息時發生異常：${errorMsg}\n(此事件已記錄至系統日誌，您可隨時輸入「看系統日誌」排查)`,
      quickReply: DEFAULT_QUICK_REPLY
    });
  }
}

async function handlePostback(
  postbackData: string,
  userId: string,
  replyToken: string | undefined,
  lineClient: LineClient,
  todoMemo: TodoMemoManager
): Promise<void> {
  try {
    const data = JSON.parse(postbackData) as { action: string; id?: string; qid?: string; choice?: string };

    // 1. Todo Actions
    if (data.action === "complete_todo" && data.id) {
      await todoMemo.completeTodo(userId, data.id);
      const updatedTodos = await todoMemo.getTodos(userId);
      await lineClient.replyOrPush(replyToken, userId, createTodoFlexMessage(updatedTodos));
      return;
    } else if (data.action === "delete_todo" && data.id) {
      await todoMemo.deleteTodo(userId, data.id);
      const updatedTodos = await todoMemo.getTodos(userId);
      await lineClient.replyOrPush(replyToken, userId, createTodoFlexMessage(updatedTodos));
      return;
    }

    // 2. Exam Quiz Answer Submission
    if (data.action === "quiz_answer" && data.qid && data.choice) {
      const checkResult = QuizManager.checkAnswer(data.qid, data.choice);
      if (checkResult) {
        await lineClient.replyOrPush(replyToken, userId, createQuizAnswerFlexMessage(checkResult));
      }
      return;
    }

    // 3. Exam Quiz Next Question
    if (data.action === "quiz_next") {
      const nextQuestion = QuizManager.pickRandomQuestion();
      await lineClient.replyOrPush(replyToken, userId, createQuizQuestionFlexMessage(nextQuestion));
      return;
    }
  } catch (e) {
    console.error("[EventProcessor] Postback parse error:", e);
  }
}
