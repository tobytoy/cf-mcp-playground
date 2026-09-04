import { LineClient } from "../line/client";
import { getTaiwanTimeString } from "../utils/time";

export interface StudyMouseApplication {
  ticketId: string;
  userId: string;
  displayName: string;
  targetExam: string;
  purpose: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  appliedAt: string;
  approvedAt?: string;
  adminNote?: string;
}

export class StudyMouseManager {
  private kv?: KVNamespace;
  private sheetUrl?: string;
  private lineClient?: LineClient;
  private adminUserId?: string;

  constructor(kv?: KVNamespace, sheetUrl?: string, lineClient?: LineClient, adminUserId?: string) {
    this.kv = kv;
    this.sheetUrl = sheetUrl;
    this.lineClient = lineClient;
    this.adminUserId = adminUserId;
  }

  /**
   * Check user's current approval status.
   * Priority: Cloudflare KV (5ms) -> Google Sheet fallback.
   */
  async checkStatus(userId: string): Promise<{ status: "APPROVED" | "PENDING" | "REJECTED" | "NONE"; application?: StudyMouseApplication }> {
    // 1. KV Fast Path
    if (this.kv) {
      const kvStatus = await this.kv.get(`studymouse:user:${userId}`);
      if (kvStatus === "APPROVED" || kvStatus === "PENDING" || kvStatus === "REJECTED") {
        return { status: kvStatus };
      }
    }

    // 2. Google Sheet Fallback
    if (this.sheetUrl) {
      try {
        const res = await fetch(`${this.sheetUrl}?action=studymouse_check&userId=${encodeURIComponent(userId)}`, {
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
          const data = (await res.json()) as { status?: string };
          if (data.status) {
            const normalized = data.status === "已核准" ? "APPROVED" : data.status === "待審核" ? "PENDING" : "REJECTED";
            if (this.kv) {
              await this.kv.put(`studymouse:user:${userId}`, normalized, { expirationTtl: 86400 });
            }
            return { status: normalized };
          }
        }
      } catch (e) {
        console.warn("[StudyMouseManager] Sheet check failed:", e);
      }
    }

    return { status: "NONE" };
  }

  /**
   * Submit a new member application.
   */
  async submitApplication(app: StudyMouseApplication): Promise<{ success: boolean; ticketId: string }> {
    // 1. Cache to KV as PENDING
    if (this.kv) {
      await this.kv.put(`studymouse:user:${app.userId}`, "PENDING");
      await this.kv.put(`studymouse:ticket:${app.ticketId}`, JSON.stringify(app));
    }

    // 2. Sync to Google Sheet (Sheet Tab: StudyMouseMembers)
    if (this.sheetUrl) {
      try {
        await fetch(this.sheetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            action: "studymouse_apply",
            ticketId: app.ticketId,
            userId: app.userId,
            displayName: app.displayName,
            targetExam: app.targetExam,
            purpose: app.purpose,
            status: "待審核",
            appliedAt: app.appliedAt || getTaiwanTimeString(),
          }),
        });
      } catch (e) {
        console.warn("[StudyMouseManager] Sheet post failed:", e);
      }
    }

    // 3. Notify Admin via LINE Push Flex Message!
    if (this.lineClient && this.adminUserId) {
      try {
        await this.lineClient.push(this.adminUserId, {
          type: "flex",
          altText: `🐭 [會員申請] ${app.displayName} 申請解鎖題庫`,
          contents: {
            type: "bubble",
            size: "kilo",
            header: {
              type: "box",
              layout: "vertical",
              backgroundColor: "#FFFBEB",
              paddingAll: "15px",
              contents: [
                {
                  type: "text",
                  text: "🐭 Study Mouse 會員申請",
                  weight: "bold",
                  color: "#B45309",
                  size: "sm",
                },
                {
                  type: "text",
                  text: `單號：${app.ticketId}`,
                  size: "xs",
                  color: "#78350F",
                  margin: "xs",
                },
              ],
            },
            body: {
              type: "box",
              layout: "vertical",
              spacing: "md",
              contents: [
                {
                  type: "box",
                  layout: "vertical",
                  spacing: "xs",
                  contents: [
                    {
                      type: "text",
                      text: "申請人",
                      size: "xxs",
                      color: "#94A3B8",
                      weight: "bold",
                    },
                    {
                      type: "text",
                      text: `${app.displayName} (${app.userId.slice(0, 8)}...)`,
                      size: "xs",
                      weight: "bold",
                      color: "#1E293B",
                    },
                  ],
                },
                {
                  type: "box",
                  layout: "vertical",
                  spacing: "xs",
                  contents: [
                    {
                      type: "text",
                      text: "預計應考科目",
                      size: "xxs",
                      color: "#94A3B8",
                      weight: "bold",
                    },
                    {
                      type: "text",
                      text: app.targetExam,
                      size: "xs",
                      color: "#475569",
                      wrap: true,
                    },
                  ],
                },
                {
                  type: "box",
                  layout: "vertical",
                  spacing: "xs",
                  contents: [
                    {
                      type: "text",
                      text: "用途說明",
                      size: "xxs",
                      color: "#94A3B8",
                      weight: "bold",
                    },
                    {
                      type: "text",
                      text: app.purpose || "考友自主練習",
                      size: "xs",
                      color: "#64748B",
                      wrap: true,
                    },
                  ],
                },
              ],
            },
            footer: {
              type: "box",
              layout: "horizontal",
              spacing: "sm",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  color: "#059669",
                  height: "sm",
                  action: {
                    type: "postback",
                    label: "✅ 核准",
                    data: JSON.stringify({
                      action: "studymouse_approve",
                      ticketId: app.ticketId,
                      userId: app.userId,
                    }),
                  },
                },
                {
                  type: "button",
                  style: "secondary",
                  height: "sm",
                  action: {
                    type: "postback",
                    label: "❌ 拒絕",
                    data: JSON.stringify({
                      action: "studymouse_reject",
                      ticketId: app.ticketId,
                      userId: app.userId,
                    }),
                  },
                },
              ],
            },
          },
        });
      } catch (e) {
        console.warn("[StudyMouseManager] Push to admin failed:", e);
      }
    }

    return { success: true, ticketId: app.ticketId };
  }

  /**
   * Approve a user application.
   */
  async approveApplication(ticketOrUserId: string, adminNote: string = "LINE Bot 一鍵核准"): Promise<{ success: boolean; message: string }> {
    const nowStr = getTaiwanTimeString();

    // 1. Resolve userId if ticketId was passed
    let targetUserId = ticketOrUserId;
    let targetTicketId = ticketOrUserId;

    if (this.kv && ticketOrUserId.startsWith("SM-")) {
      const raw = await this.kv.get(`studymouse:ticket:${ticketOrUserId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as StudyMouseApplication;
        targetUserId = parsed.userId;
      }
    }

    // 2. Update KV to APPROVED
    if (this.kv) {
      await this.kv.put(`studymouse:user:${targetUserId}`, "APPROVED");
    }

    // 3. Update Google Sheet
    if (this.sheetUrl) {
      try {
        await fetch(this.sheetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            action: "studymouse_update",
            target: ticketOrUserId,
            status: "已核准",
            approvedAt: nowStr,
            adminNote,
          }),
        });
      } catch (e) {
        console.warn("[StudyMouseManager] Sheet update failed:", e);
      }
    }

    return {
      success: true,
      message: `✅ 已成功核准會員！\n單號 / ID：${ticketOrUserId}\n核准時間：${nowStr}\n考友現在開啟 Mini App 即可暢行刷題！`,
    };
  }

  /**
   * Reject / Cancel a user application.
   */
  async rejectApplication(ticketOrUserId: string, adminNote: string = "管理員取消"): Promise<{ success: boolean; message: string }> {
    const nowStr = getTaiwanTimeString();

    let targetUserId = ticketOrUserId;
    if (this.kv && ticketOrUserId.startsWith("SM-")) {
      const raw = await this.kv.get(`studymouse:ticket:${ticketOrUserId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as StudyMouseApplication;
        targetUserId = parsed.userId;
      }
    }

    if (this.kv) {
      await this.kv.put(`studymouse:user:${targetUserId}`, "REJECTED");
    }

    if (this.sheetUrl) {
      try {
        await fetch(this.sheetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            action: "studymouse_update",
            target: ticketOrUserId,
            status: "已取消",
            approvedAt: nowStr,
            adminNote,
          }),
        });
      } catch (e) {
        console.warn("[StudyMouseManager] Sheet update failed:", e);
      }
    }

    return {
      success: true,
      message: `❌ 已取消該申請：${ticketOrUserId}`,
    };
  }
}
