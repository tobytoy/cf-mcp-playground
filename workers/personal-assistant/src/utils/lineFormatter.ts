export function formatForLineMessage(text: string): string {
  if (!text) return "";

  let formatted = text
    .replace(/^#{1,3}\s+(.+)$/gm, "🔷【$1】")
    .replace(/\*\*(.+?)\*\*/g, "「$1」")
    .replace(/__(.+?)__/g, "「$1」")
    .replace(/^---\s*$/gm, "────────────────")
    .replace(/^[*•-]\s+\*\*(.+?)\*\*[:：]/gm, "• 【$1】：")
    .replace(/^[*•-]\s+/gm, "• ")
    .replace(/^\d+\.\s+\*\*(.+?)\*\*[:：]/gm, "📌【$1】：")
    .replace(/`([^`]+)`/g, "「$1」");

  return formatted.trim();
}
