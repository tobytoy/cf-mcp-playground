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
  // FNV-1a 64-bit hash (using BigInt for near-zero collision in QA cache)
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  for (let i = 0; i < str.length; i++) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * prime) & 0xffffffffffffffffn;
  }
  return hash.toString(36);
}

export function buildCacheKey(question: string): string {
  return `mcp:qa:${hashString(normalizeQuestion(question))}`;
}
