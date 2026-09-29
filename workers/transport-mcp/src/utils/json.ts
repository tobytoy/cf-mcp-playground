/**
 * Safely parses a JSON string into type T.
 * Returns null instead of throwing an error if the JSON is malformed.
 */
export function safeJsonParse<T>(raw: string | null | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
