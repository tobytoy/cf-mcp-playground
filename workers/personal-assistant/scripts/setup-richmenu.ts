import fs from "fs";
import path from "path";
import dns from "node:dns";
import { fileURLToPath } from "node:url";

dns.setDefaultResultOrder("ipv4first");

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Reads an environment variable from process.env or falls back to parsing .dev.vars / .env files.
 */
function getEnv(key: string): string | undefined {
  if (process.env[key]) {
    return process.env[key];
  }

  const candidatePaths = [
    path.resolve(__dirname, "../.dev.vars"),
    path.resolve(__dirname, "../../.dev.vars"),
    path.resolve(process.cwd(), ".dev.vars"),
    path.resolve(process.cwd(), "workers/personal-assistant/.dev.vars"),
    path.resolve(process.cwd(), ".env"),
    path.resolve(__dirname, "../.env")
  ];

  for (const filePath of candidatePaths) {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf-8");
        for (const line of content.split("\n")) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith("#")) continue;
          const eqIdx = trimmed.indexOf("=");
          if (eqIdx > 0) {
            const k = trimmed.slice(0, eqIdx).trim();
            let v = trimmed.slice(eqIdx + 1).trim();
            if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
              v = v.slice(1, -1);
            }
            if (k === key) {
              return v;
            }
          }
        }
      } catch {
        // continue searching
      }
    }
  }
  return undefined;
}

async function main() {
  console.log("🚀 Setting up Rich Menu for bfg007 Personal Assistant...");

  const token = getEnv("LINE_CHANNEL_ACCESS_TOKEN");
  const userId = getEnv("ALLOWED_USER_ID") || getEnv("LINE_USER_ID");

  if (!token) {
    throw new Error(
      "Missing LINE_CHANNEL_ACCESS_TOKEN!\nPlease define LINE_CHANNEL_ACCESS_TOKEN in workers/personal-assistant/.dev.vars or pass it as an environment variable."
    );
  }

  const candidateImages = [
    path.resolve(__dirname, "../src/assets/richmenu.png"),
    path.resolve(process.cwd(), "workers/personal-assistant/src/assets/richmenu.png"),
    path.resolve(process.cwd(), "src/assets/richmenu.png")
  ];
  const imagePath = candidateImages.find((p) => fs.existsSync(p));
  if (!imagePath) {
    throw new Error(`Image not found in candidate paths: ${candidateImages.join(", ")}`);
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
      Authorization: `Bearer ${token}`
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
      Authorization: `Bearer ${token}`
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
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!defRes.ok) {
    console.warn("Set all users warning:", await defRes.text());
  }

  // 4. Also explicitly link to owner user(s) if provided
  if (userId) {
    const userIds = userId.split(",").map((s) => s.trim()).filter(Boolean);
    for (const uid of userIds) {
      console.log(`4. Linking directly to owner user (${uid})...`);
      const linkRes = await fetch(`https://api.line.me/v2/bot/user/${uid}/richmenu/${richMenuId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!linkRes.ok) {
        console.warn(`Link user (${uid}) warning:`, await linkRes.text());
      }
    }
  } else {
    console.log("ℹ️ No ALLOWED_USER_ID configured, skipping individual linking.");
  }

  console.log("🎉 Complete! Active Rich Menu is now attached!");
}

main().catch(console.error);
