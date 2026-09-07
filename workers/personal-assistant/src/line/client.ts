import type { OutgoingLineMessage } from "../types/line";

const LINE_API_BASE = "https://api.line.me/v2/bot";

export class LineClient {
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

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

  async replyOrPush(
    replyToken: string | undefined,
    toUserId: string | undefined,
    messages: OutgoingLineMessage[] | OutgoingLineMessage
  ): Promise<boolean> {
    if (replyToken) {
      const ok = await this.reply(replyToken, messages);
      if (ok) return true;
      console.warn("[LineClient] replyToken failed (likely expired). Falling back to push...");
    }

    if (toUserId) {
      return await this.push(toUserId, messages);
    }

    return false;
  }

  async getMessageContent(messageId: string): Promise<ArrayBuffer | null> {
    try {
      const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`
        }
      });

      if (!res.ok) {
        console.error(`[LineClient] Failed to download content ${messageId}, status: ${res.status}`);
        return null;
      }

      return await res.arrayBuffer();
    } catch (error) {
      console.error(`[LineClient] Error fetching content ${messageId}:`, error);
      return null;
    }
  }

  async showLoading(chatId: string, loadingSeconds: number = 20): Promise<void> {
    try {
      await fetch(`${LINE_API_BASE}/chat/loading/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`
        },
        body: JSON.stringify({ chatId, loadingSeconds })
      });
    } catch {
      // Best-effort loading indicator
    }
  }
}
