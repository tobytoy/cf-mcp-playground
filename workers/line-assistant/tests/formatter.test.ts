import { formatForLineMessage } from "../src/utils/lineFormatter";

export function testLineFormatter(): void {
  console.log("▶ Testing LINE Mobile Typography & Markdown Formatter...");

  const rawSample = `### 方案一：大眾運輸（最推薦）
* **總車程：** 約 2.5 ~ 3 小時
* **路線規劃：**
1. **第一階段：前往台北車站**
   * **捷運轉乘（約 35 分鐘）：** 搭乘**公車**至「芝山站」。
---
### 方案二：自行開車
* **車程：** 約 3 小時
* **貼心提醒：** 假日易塞車。`;

  const formatted = formatForLineMessage(rawSample);

  // 1. Check ### converted to 🔷【...】
  if (!formatted.includes("🔷【方案一：大眾運輸（最推薦）】") || !formatted.includes("🔷【方案二：自行開車】")) {
    throw new Error("Header conversion failed");
  }
  console.log("  ✔ Headers converted to 🔷【...】 badges");

  // 2. Check no raw asterisks left for bold
  if (formatted.includes("**")) {
    throw new Error(`Raw asterisks found in output: ${formatted}`);
  }
  console.log("  ✔ All raw asterisks (**) successfully stripped and transformed");

  // 3. Check horizontal dividers
  if (!formatted.includes("─────────────────────")) {
    throw new Error("Divider conversion failed");
  }
  console.log("  ✔ Dividers converted to clean mobile visual lines (──────────────)");

  // 4. Check bullet and milestone pins
  if (!formatted.includes("• 【總車程】：") || !formatted.includes("1. 📌 第一階段")) {
    throw new Error(`Bullet/pin conversion failed:\n${formatted}`);
  }
  console.log("  ✔ Bullets converted to • 【...】： and numbered milestones with 📌 pins");

  console.log("✅ Line Formatter tests passed!\n");
}
