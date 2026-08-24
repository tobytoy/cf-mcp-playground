/**
 * Shared question normalisation and cache-key helpers.
 * Single source of truth used by both the MCP tool handler and the REST API.
 */

export function normalizeQuestion(question: string): string {
  return question
    .toLowerCase()
    .trim()
    .replace(/[？\?！\!。，,、\s]+/g, "");
}

export function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // coerce to int32
  }
  return Math.abs(hash).toString(36);
}

export function buildCacheKey(question: string): string {
  return `mcp:qa:${hashString(normalizeQuestion(question))}`;
}
