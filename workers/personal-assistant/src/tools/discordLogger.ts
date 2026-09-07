import { getTaiwanTimeString } from "../utils/time";

export interface DiscordField {
  name: string;
  value: string;
  inline?: boolean;
}

export class DiscordLogger {
  private webhookUrl?: string;
  private kv?: KVNamespace;

  constructor(webhookUrl?: string, kv?: KVNamespace) {
    this.webhookUrl = webhookUrl;
    this.kv = kv;
  }

  /**
   * Check if Info-level Discord logging is enabled in KV.
   * Default: false (only Errors are sent unless user turned it on).
   */
  async isInfoLoggingEnabled(): Promise<boolean> {
    if (!this.kv) return false;
    try {
      const val = await this.kv.get("discord_info_enabled");
      return val === "true";
    } catch {
      return false;
    }
  }

  /**
   * Toggle Info-level Discord logging.
   */
  async setInfoLoggingEnabled(enabled: boolean): Promise<void> {
    if (this.kv) {
      await this.kv.put("discord_info_enabled", enabled ? "true" : "false");
    }
  }

  /**
   * Send an Error alert to Discord.
   * Mandatory: ALWAYS sends if webhook URL is configured.
   */
  async sendError(
    title: string,
    error: Error | string,
    context?: Record<string, unknown>
  ): Promise<boolean> {
    if (!this.webhookUrl) return false;

    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack?.slice(0, 800) : "";
    const twTime = getTaiwanTimeString();

    const fields: DiscordField[] = [
      { name: "⏰ 發生時間 (TW)", value: twTime, inline: true },
      { name: "🚨 錯誤等級", value: "FATAL ERROR", inline: true }
    ];

    if (context) {
      for (const [k, v] of Object.entries(context)) {
        fields.push({
          name: `📌 ${k}`,
          value: String(v).slice(0, 300),
          inline: true
        });
      }
    }

    if (errStack) {
      fields.push({
        name: "📄 錯誤呼叫堆疊 (Stack Trace)",
        value: `\`\`\`ts\n${errStack}\n\`\`\``,
        inline: false
      });
    }

    const payload = {
      username: "🐶 HelperDog 守護犬 (監控告警)",
      avatar_url: "https://miniapp.line.me/2011472036-bVXeg5I6",
      embeds: [
        {
          title: `❌ 【系統異常告警】${title}`,
          description: `**異常原因**：\`${errMsg}\``,
          color: 0xDC2626, // Red
          fields,
          footer: {
            text: "Cloudflare Workers • Personal Assistant Service"
          },
          timestamp: new Date().toISOString()
        }
      ]
    };

    return this.postToWebhook(payload);
  }

  /**
   * Send an Informational log to Discord.
   * Sends only if info logging is enabled by user or force=true.
   */
  async sendInfo(
    title: string,
    description: string,
    fields?: DiscordField[],
    force: boolean = false
  ): Promise<boolean> {
    if (!this.webhookUrl) return false;

    if (!force) {
      const isEnabled = await this.isInfoLoggingEnabled();
      if (!isEnabled) return false;
    }

    const payload = {
      username: "🐶 HelperDog (私人生活助理)",
      embeds: [
        {
          title: `ℹ️ 【系統訊息】${title}`,
          description,
          color: 0x4F46E5, // Indigo
          fields: [
            { name: "⏰ 時間 (TW)", value: getTaiwanTimeString(), inline: true },
            ...(fields || [])
          ],
          footer: {
            text: "Personal Assistant Info Stream"
          },
          timestamp: new Date().toISOString()
        }
      ]
    };

    return this.postToWebhook(payload);
  }

  private async postToWebhook(payload: Record<string, unknown>): Promise<boolean> {
    if (!this.webhookUrl) return false;

    try {
      const res = await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(6000),
        body: JSON.stringify(payload)
      });
      return res.status >= 200 && res.status < 300;
    } catch (e) {
      console.error("[DiscordLogger] Failed to send Discord webhook:", e);
      return false;
    }
  }
}
