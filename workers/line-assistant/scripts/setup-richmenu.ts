import fetch from "node-fetch";
import fs from "fs";
import path from "path";

/**
 * Programmatic LINE Rich Menu Generator & Publisher
 */
async function setupRichMenu() {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  const userId = process.env.ALLOWED_USER_ID;
  if (!token) {
    throw new Error("LINE_CHANNEL_ACCESS_TOKEN environment variable is required.");
  }
  const imagePath = path.resolve(__dirname, "../src/assets/richmenu.png");

  const richMenuPayload = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: "LINE Assistant 6-Grid Menu",
    chatBarText: "⚡ 功能選單 (點擊開啟)",
    areas: [
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: "message", text: "查看待辦事項" }
      },
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: { type: "message", text: "今天天母天氣如何？會下雨嗎" }
      },
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: "message", text: "考一題公職考古題" }
      },
      {
        bounds: { x: 0, y: 843, width: 833, height: 843 },
        action: { type: "message", text: "搜尋今日台灣與科技重大新聞" }
      },
      {
        bounds: { x: 833, y: 843, width: 834, height: 843 },
        action: { type: "message", text: "天母附近交通與YouBike" }
      },
      {
        bounds: { x: 1667, y: 843, width: 833, height: 843 },
        action: { type: "message", text: "查看歷史用量統計" }
      }
    ]
  };

  console.log("1. Creating Rich Menu object...");
  const createRes = await fetch("https://api.line.me/v2/bot/richmenu", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(richMenuPayload)
  });

  const { richMenuId } = (await createRes.json()) as { richMenuId: string };
  console.log(`✅ Rich Menu ID: ${richMenuId}`);

  console.log("2. Uploading image...");
  const imageBuffer = fs.readFileSync(imagePath);
  await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: {
      "Content-Type": "image/png",
      Authorization: `Bearer ${token}`
    },
    body: imageBuffer
  });

  console.log("3. Setting default and linking to user...");
  await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

  await fetch(`https://api.line.me/v2/bot/user/${userId}/richmenu/${richMenuId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` }
  });

  console.log("🎉 Complete! Active rich menu bound to your account.");
}

setupRichMenu().catch(console.error);
