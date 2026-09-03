import { getTaiwanTimeString } from "../utils/time";

export interface LogEntry {
  id: string;
  timestamp: string;
  durationMs: number;
  userId: string;
  userPrompt: string;
  tool: string;
  targetModel?: string;
  status: "success" | "error" | "fallback";
  stageLogs: string[];
  error?: string;
}

const memoryLogs: LogEntry[] = [];

export class DiagnosticLogger {
  private kv?: KVNamespace;

  constructor(kv?: KVNamespace) {
    this.kv = kv;
  }

  /**
   * Save a completed execution log entry.
   */
  async log(entry: Omit<LogEntry, "id" | "timestamp">): Promise<void> {
    const fullEntry: LogEntry = {
      id: crypto.randomUUID().slice(0, 8),
      timestamp: getTaiwanTimeString(),
      ...entry
    };

    console.log(
      `[DIAGNOSTIC] ${fullEntry.timestamp} | Tool: ${fullEntry.tool} | Status: ${fullEntry.status} | Duration: ${fullEntry.durationMs}ms | Prompt: "${fullEntry.userPrompt.slice(0, 30)}"${fullEntry.error ? ` | Error: ${fullEntry.error}` : ""}`
    );

    // Keep last 50 in memory
    memoryLogs.unshift(fullEntry);
    if (memoryLogs.length > 50) memoryLogs.pop();

    // Persist to KV
    if (this.kv) {
      try {
        const key = "debug:recent_logs";
        const existing = (await this.kv.get<LogEntry[]>(key, "json")) || [];
        existing.unshift(fullEntry);
        await this.kv.put(key, JSON.stringify(existing.slice(0, 50)));

        if (fullEntry.status === "error") {
          const errKey = "debug:recent_errors";
          const errors = (await this.kv.get<LogEntry[]>(errKey, "json")) || [];
          errors.unshift(fullEntry);
          await this.kv.put(errKey, JSON.stringify(errors.slice(0, 20)));
        }
      } catch (err) {
        console.warn("[DiagnosticLogger] Failed to write log to KV:", err);
      }
    }
  }

  /**
   * Retrieve recent logs.
   */
  async getRecentLogs(limit: number = 20): Promise<LogEntry[]> {
    if (this.kv) {
      const logs = await this.kv.get<LogEntry[]>("debug:recent_logs", "json");
      if (logs && logs.length > 0) return logs.slice(0, limit);
    }
    return memoryLogs.slice(0, limit);
  }

  /**
   * Retrieve recent errors.
   */
  async getRecentErrors(limit: number = 10): Promise<LogEntry[]> {
    if (this.kv) {
      const errors = await this.kv.get<LogEntry[]>("debug:recent_errors", "json");
      if (errors && errors.length > 0) return errors.slice(0, limit);
    }
    return memoryLogs.filter((l) => l.status === "error").slice(0, limit);
  }
}
