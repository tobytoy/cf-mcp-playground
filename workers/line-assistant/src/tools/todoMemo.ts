import { getTaiwanTimeString } from "../utils/time";

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
}

export interface MemoItem {
  id: string;
  content: string;
  tags?: string[];
  createdAt: string;
}

// In-memory fallback cache for local dev / testing
const memoryStore = new Map<string, string>();

export class TodoMemoManager {
  private kv?: KVNamespace;
  private sheetUrl?: string;

  constructor(kv?: KVNamespace, sheetUrl?: string) {
    this.kv = kv;
    this.sheetUrl = sheetUrl;
  }

  private async getJson<T>(key: string): Promise<T | null> {
    if (this.kv) {
      return await this.kv.get<T>(key, "json");
    }
    const val = memoryStore.get(key);
    return val ? JSON.parse(val) : null;
  }

  private async putJson<T>(key: string, value: T): Promise<void> {
    const jsonStr = JSON.stringify(value);
    if (this.kv) {
      await this.kv.put(key, jsonStr);
    } else {
      memoryStore.set(key, jsonStr);
    }
  }

  // --- TODO MANAGEMENT WITH GOOGLE SHEETS DUAL-SYNC ---

  /**
   * Get active uncompleted todos from Google Sheet (or KV fallback).
   */
  async getTodos(userId: string): Promise<TodoItem[]> {
    if (this.sheetUrl) {
      try {
        const res = await fetch(this.sheetUrl, { signal: AbortSignal.timeout(7000) });
        if (res.ok) {
          const rows = (await res.json()) as Array<[boolean | string, string, string, string, string, string]>;
          // Skip header row 0
          const sheetTodos: TodoItem[] = [];
          for (let i = 1; i < rows.length; i++) {
            const r = rows[i];
            const isDone = r[0] === true || String(r[0]).toUpperCase() === "TRUE";
            const content = (r[2] || "").toString().trim();
            const createdAt = (r[1] || "").toString().trim();

            // Only return active, uncompleted items for clean LINE UI!
            if (content && !isDone) {
              sheetTodos.push({
                id: content,
                text: content,
                done: false,
                createdAt: createdAt || getTaiwanTimeString()
              });
            }
          }

          // Cache to local KV
          await this.putJson(`todos:${userId}`, sheetTodos);
          return sheetTodos;
        }
      } catch (err) {
        console.warn("[TodoMemo] Error reading from Google Sheet, using local KV cache:", err);
      }
    }

    const key = `todos:${userId}`;
    const items = await this.getJson<TodoItem[]>(key);
    return (items || []).filter((t) => !t.done);
  }

  /**
   * Add a new todo item to Google Sheet and local KV.
   */
  async addTodo(userId: string, text: string, source: string = "LINE"): Promise<TodoItem> {
    const cleanText = text.trim();
    const nowStr = getTaiwanTimeString();

    const newItem: TodoItem = {
      id: cleanText,
      text: cleanText,
      done: false,
      createdAt: nowStr
    };

    // 1. Sync to Google Sheet
    if (this.sheetUrl) {
      try {
        await fetch(this.sheetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            action: "add",
            content: cleanText,
            category: "待辦",
            source
          })
        });
      } catch (err) {
        console.warn("[TodoMemo] Error posting to Google Sheet:", err);
      }
    }

    // 2. Sync to local KV
    const localTodos = await this.getTodos(userId);
    localTodos.push(newItem);
    await this.putJson(`todos:${userId}`, localTodos);

    return newItem;
  }

  /**
   * Mark a todo as completed (checks the box in Google Sheet and stamps completion time).
   */
  async completeTodo(userId: string, todoContentOrId: string): Promise<boolean> {
    const cleanQuery = todoContentOrId.trim();

    // 1. Sync to Google Sheet
    if (this.sheetUrl) {
      try {
        await fetch(this.sheetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            action: "complete",
            content: cleanQuery
          })
        });
      } catch (err) {
        console.warn("[TodoMemo] Error completing on Google Sheet:", err);
      }
    }

    // 2. Sync to local KV
    const localTodos = await this.getTodos(userId);
    const item = localTodos.find((t) => t.id === cleanQuery || t.text.includes(cleanQuery));
    if (item) {
      item.done = true;
      const remaining = localTodos.filter((t) => t.id !== item.id);
      await this.putJson(`todos:${userId}`, remaining);
      return true;
    }

    return true;
  }

  /**
   * Remove from local KV (deletions are primarily done on computer).
   */
  async deleteTodo(userId: string, todoId: string): Promise<boolean> {
    const todos = await this.getTodos(userId);
    const filtered = todos.filter((t) => t.id !== todoId && !t.text.includes(todoId));
    await this.putJson(`todos:${userId}`, filtered);
    return true;
  }

  // --- MEMO MANAGEMENT ---

  async getMemos(userId: string): Promise<MemoItem[]> {
    const key = `memos:${userId}`;
    const items = await this.getJson<MemoItem[]>(key);
    return items || [];
  }

  async saveMemo(userId: string, content: string, tags: string[] = []): Promise<MemoItem> {
    const memos = await this.getMemos(userId);
    const newMemo: MemoItem = {
      id: crypto.randomUUID().slice(0, 8),
      content: content.trim(),
      tags,
      createdAt: getTaiwanTimeString()
    };
    memos.unshift(newMemo);
    await this.putJson(`memos:${userId}`, memos.slice(0, 50));
    return newMemo;
  }
}
