import type { Env } from "../types/env";
import { executeMorningBriefing } from "./morningBriefing";
import { executeStockBriefing } from "./stockBriefing";

export async function handleScheduledEvent(cronSchedule: string, env: Env): Promise<void> {
  console.log(`[CronDispatcher] Triggered by cron schedule: "${cronSchedule}"`);

  // 1. Morning Briefing: 0 23 * * * (07:00 AM Taiwan Time UTC+8)
  if (cronSchedule.includes("23 * * *") || cronSchedule.includes("0 23")) {
    console.log("[CronDispatcher] Executing Morning & US Stock Briefing (07:00 TW)...");
    await executeMorningBriefing(env);
    return;
  }

  // 2. Taiwan Stock Closing: 0 7 * * 1-5 (15:00 PM Taiwan Time UTC+8)
  if (cronSchedule.includes("7 * *") || cronSchedule.includes("0 7")) {
    console.log("[CronDispatcher] Executing Taiwan Stock Closing (15:00 TW)...");
    await executeStockBriefing(env);
    return;
  }

  // Fallback default
  console.log("[CronDispatcher] Executing Default Briefing...");
  await executeMorningBriefing(env);
}
