import fs from "fs";
import path from "path";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const TOKEN = "2QrQh6Mx5FvaQOzIhBsJB3wGZaNkhQUMskf5OKY/hOwXnEJtDPkXi4RbWjIlcGHIBHVHltnXayV1ym7Yb1OCORqtj+k2r4O5GPDmXwFYKhBzPOpx0xt7INqmASNf/pZHNJBu7cGczgQUsAYEXQlXWAdB04t89/1O/w1cDnyilFU=";
const USER_ID = "Uba361995b7ae8345b4a23e195253d27c";

async function main() {
  console.log("🚀 Setting up Rich Menu for bfg007 Personal Assistant...");

  const imagePath = path.resolve("workers/personal-assistant/src/assets/richmenu.png");
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image not found at ${imagePath}`);
  }

  const richMenuPayload = {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: "bfg007 HelperDog 6-Grid Menu",
    chatBarText: "🐶 快捷功能選單",
    areas: [
      {
        bounds: { x: 0, y: 0, width: 833, height: 843 },
        action: { type: "message", text: "查看待辦事項" }
      },
      {
        bounds: { x: 833, y: 0, width: 834, height: 843 },
        action: { type: "message", text: "幫我找附近的 YouBike" }
      },
      {
        bounds: { x: 1667, y: 0, width: 833, height: 843 },
        action: { type: "message", text: "今天天氣如何？會下雨嗎" }
      },
      {
        bounds: { x: 0, y: 843, width: 833, height: 843 },
        action: { type: "message", text: "精選專案" }
      },
      {
        bounds: { x: 833, y: 843, width: 834, height: 843 },
        action: { type: "uri", uri: "https://miniapp.line.me/2011472036-bVXeg5I6" }
      },
      {
        bounds: { x: 1667, y: 843, width: 833, height: 843 },
        action: { type: "message", text: "選單" }
      }
    ]
  };

  // 1. Create Rich Menu Object
  console.log("1. Creating Rich Menu object on LINE...");
  const createRes = await fetch("https://api.line.me/v2/bot/richmenu", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`
    },
    body: JSON.stringify(richMenuPayload)
  });

  if (!createRes.ok) {
    const err = await createRes.text();
    throw new Error(`Create rich menu failed (${createRes.status}): ${err}`);
  }

  const { richMenuId } = (await createRes.json()) as { richMenuId: string };
  console.log(`✅ Rich Menu ID: ${richMenuId}`);

  // 2. Upload Image
  console.log("2. Uploading 2500x1686 image buffer...");
  const imageBuffer = fs.readFileSync(imagePath);
  const uploadRes = await fetch(`https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: {
      "Content-Type": "image/png",
      Authorization: `Bearer ${TOKEN}`
    },
    body: imageBuffer
  });

  if (!uploadRes.ok) {
    const err = await uploadRes.text();
    throw new Error(`Upload image failed (${uploadRes.status}): ${err}`);
  }
  console.log("✅ Image successfully uploaded!");

  // 3. Set as default for ALL users
  console.log("3. Setting default rich menu for ALL users...");
  const defRes = await fetch(`https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  if (!defRes.ok) {
    console.warn("Set all users warning:", await defRes.text());
  }

  // 4. Also explicitly link to owner user
  console.log(`4. Linking directly to owner user (${USER_ID})...`);
  const linkRes = await fetch(`https://api.line.me/v2/bot/user/${USER_ID}/richmenu/${richMenuId}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  if (!linkRes.ok) {
    console.warn("Link user warning:", await linkRes.text());
  }

  console.log("🎉 Complete! Active Rich Menu is now permanently attached to bfg007!");
}

main().catch(console.error);
