import { getTaiwanTimeString } from "../utils/time";

export interface UsageLogItem {
  id: string;
  timestamp: string;
  tool: string;
  targetModel?: string;
  preview: string;
}

export interface UserStats {
  userId: string;
  totalCalls: number;
  firstUsedAt: string;
  lastActiveAt: string;
  toolCounts: Record<string, number>;
  modelCounts: Record<string, number>;
  recentHistory: UsageLogItem[];
}

// In-memory fallback map for dev / testing
const memoryStatsStore = new Map<string, string>();

export class AnalyticsManager {
  private kv?: KVNamespace;

  constructor(kv?: KVNamespace) {
    this.kv = kv;
  }

  private async getStats(userId: string): Promise<UserStats> {
    const key = `stats:${userId}`;
    let data: UserStats | null = null;

    if (this.kv) {
      data = await this.kv.get<UserStats>(key, "json");
    } else {
      const raw = memoryStatsStore.get(key);
      data = raw ? JSON.parse(raw) : null;
    }

    if (!data) {
      const now = getTaiwanTimeString();
      data = {
        userId,
        totalCalls: 0,
        firstUsedAt: now,
        lastActiveAt: now,
        toolCounts: {},
        modelCounts: {},
        recentHistory: []
      };
    }
    return data;
  }

  private async saveStats(userId: string, stats: UserStats): Promise<void> {
    const key = `stats:${userId}`;
    const jsonStr = JSON.stringify(stats);
    if (this.kv) {
      await this.kv.put(key, jsonStr);
    } else {
      memoryStatsStore.set(key, jsonStr);
    }
  }

  /**
   * Record a single tool/model execution event.
   */
  async recordUsage(
    userId: string,
    tool: string,
    queryPreview: string,
    targetModel?: string
  ): Promise<void> {
    const stats = await this.getStats(userId);
    const now = getTaiwanTimeString();

    stats.totalCalls += 1;
    stats.lastActiveAt = now;

    // Tool count
    stats.toolCounts[tool] = (stats.toolCounts[tool] || 0) + 1;

    // Model count (if applicable)
    if (targetModel) {
      stats.modelCounts[targetModel] = (stats.modelCounts[targetModel] || 0) + 1;
    }

    // Append to recent history (retaining last 15 items)
    const logItem: UsageLogItem = {
      id: crypto.randomUUID().slice(0, 6),
      timestamp: now,
      tool,
      targetModel,
      preview: queryPreview.length > 40 ? queryPreview.slice(0, 37) + "…" : queryPreview
    };

    stats.recentHistory.unshift(logItem);
    stats.recentHistory = stats.recentHistory.slice(0, 15);

    await this.saveStats(userId, stats);
  }

  /**
   * Retrieve structured usage stats for display.
   */
  async getUsageReport(userId: string): Promise<UserStats> {
    return await this.getStats(userId);
  }

  /**
   * Reset stats if user requests.
   */
  async resetStats(userId: string): Promise<void> {
    const now = getTaiwanTimeString();
    const emptyStats: UserStats = {
      userId,
      totalCalls: 0,
      firstUsedAt: now,
      lastActiveAt: now,
      toolCounts: {},
      modelCounts: {},
      recentHistory: []
    };
    await this.saveStats(userId, emptyStats);
  }
}
