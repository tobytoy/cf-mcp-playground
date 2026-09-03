import type { OutgoingLineMessage } from "../types/line";

const LINE_API_BASE = "https://api.line.me/v2/bot";

export class LineClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  /**
   * Reply to a message event using replyToken (valid for ~1 minute).
   */
  async reply(replyToken: string, messages: OutgoingLineMessage[] | OutgoingLineMessage): Promise<boolean> {
    if (!replyToken) {
      console.warn("[LineClient] replyToken is missing, skipping reply");
      return false;
    }

    const payload = {
      replyToken,
      messages: Array.isArray(messages) ? messages : [messages]
    };

    try {
      const res = await fetch(`${LINE_API_BASE}/message/reply`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[LineClient] Reply failed with status ${res.status}: ${errorText}`);
        return false;
      }
      return true;
    } catch (error) {
      console.error("[LineClient] Network error during reply:", error);
      return false;
    }
  }

  /**
   * Push a message directly to a user ID.
   */
  async push(toUserId: string, messages: OutgoingLineMessage[] | OutgoingLineMessage): Promise<boolean> {
    if (!toUserId) {
      console.warn("[LineClient] toUserId is missing, skipping push");
      return false;
    }

    const payload = {
      to: toUserId,
      messages: Array.isArray(messages) ? messages : [messages]
    };

    try {
      const res = await fetch(`${LINE_API_BASE}/message/push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`[LineClient] Push failed with status ${res.status}: ${errorText}`);
        return false;
      }
      return true;
    } catch (error) {
      console.error("[LineClient] Network error during push:", error);
      return false;
    }
  }

  /**
   * Reply first; if replyToken is invalid, expired (>30s), or failed, automatically fallback to push message.
   */
  async replyOrPush(
    replyToken: string | undefined,
    toUserId: string | undefined,
    messages: OutgoingLineMessage[] | OutgoingLineMessage
  ): Promise<boolean> {
    if (replyToken) {
      const ok = await this.reply(replyToken, messages);
      if (ok) return true;
      console.warn("[LineClient] replyToken failed (likely expired). Falling back to pushMessage...");
    }

    if (toUserId) {
      return await this.push(toUserId, messages);
    }

    return false;
  }

  /**
   * Download binary content (audio, image, video, file) for a given LINE message ID.
   */
  async getMessageContent(messageId: string): Promise<ArrayBuffer | null> {
    try {
      const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!res.ok) {
        const err = await res.text();
        console.error(`[LineClient] Failed to download message content (${res.status}): ${err.slice(0, 100)}`);
        return null;
      }

      return await res.arrayBuffer();
    } catch (err) {
      console.error("[LineClient] Error downloading message content:", err);
      return null;
    }
  }

  /**
   * Send loading animation indicator in LINE chat while thinking.
   */
  async showLoading(chatId: string, loadingSeconds: number = 20): Promise<void> {
    try {
      await fetch(`${LINE_API_BASE}/chat/loading/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({
          chatId,
          loadingSeconds: Math.min(60, Math.max(5, loadingSeconds))
        })
      });
    } catch (error) {
      // Non-critical, ignore error
      console.warn("[LineClient] showLoading indicator ignored error:", error);
    }
  }
}
