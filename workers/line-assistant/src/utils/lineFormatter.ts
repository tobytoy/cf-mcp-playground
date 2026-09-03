/**
 * LINE Mobile Typography & Markdown Formatter.
 * Converts raw Markdown syntax (**, ###, ---, *, etc.) into mobile-friendly
 * typography with clear visual hierarchy, emoji badges, clean brackets, and bullet indentations.
 */
export function formatForLineMessage(text: string): string {
  if (!text) return "";

  let out = text;

  // 1. Strip redundant inner quotes inside bold: **「text」** -> 「text」
  out = out.replace(/\*\*「([^」]+)」\*\*/g, "「$1」");
  out = out.replace(/「「([^」]+)」」/g, "「$1」");

  // 2. Convert bulleted bolds: "* **名稱：**" -> "• 【名稱】：", preserving line breaks!
  out = out.replace(/^[^\S\r\n]*[*+-][^\S\r\n]+\*\*([^*]+?)[:：]\*\*[^\S\r\n]*/gm, "• 【$1】：");
  out = out.replace(/^[^\S\r\n]{2,3}[*+-][^\S\r\n]+\*\*([^*]+?)[:：]\*\*[^\S\r\n]*/gm, "   ▸ 【$1】：");
  out = out.replace(/^[^\S\r\n]{4,}[*+-][^\S\r\n]+\*\*([^*]+?)[:：]\*\*[^\S\r\n]*/gm, "      ▪ 【$1】：");

  // 3. Convert numbered bolds: "1. **階段...**" -> "1. 📌 階段..."
  out = out.replace(/^(\d+)\.[^\S\r\n]+\*\*([^*]+?)\*\*/gm, "$1. 📌 $2");

  // 4. Convert standalone bold keys: "**名稱：**" -> "【名稱】：", "**名稱**" -> "「$1」"
  out = out.replace(/\*\*([^*]+?)[:：]\*\*/g, "【$1】：");
  out = out.replace(/\*\*([^*]+?)\*\*/g, "「$1」");
  out = out.replace(/(?<!\*)\*([^*\n]+?)\*(?!\*)/g, "$1");

  // 5. Convert Markdown headers to clean emoji section banners
  out = out.replace(/^###[^\S\r\n]*(.*)$/gm, "\n🔷【$1】");
  out = out.replace(/^##[^\S\r\n]*(.*)$/gm, "\n📌【$1】");
  out = out.replace(/^#[^\S\r\n]*(.*)$/gm, "\n⭐️【$1】");

  // 6. Convert horizontal dividers (---) to clean visual lines
  out = out.replace(/^[^\S\r\n]*---+[^\S\r\n]*$/gm, "\n─────────────────────\n");

  // 7. Standardize bullets with visual hierarchy
  out = out.replace(/^[^\S\r\n]{4,}[*+-][^\S\r\n]+/gm, "      ▪ ");
  out = out.replace(/^[^\S\r\n]{2,3}[*+-][^\S\r\n]+/gm, "   ▸ ");
  out = out.replace(/^[^\S\r\n]*[*+-][^\S\r\n]+/gm, "• ");

  // 8. Clean up redundant empty lines
  out = out.replace(/\n{3,}/g, "\n\n");

  return out.trim();
}
