import { getTaiwanTimeString } from "../utils/time";

export interface PersonalTodoItem {
  id: string;
  item: string;
  category: string;
  status: "進行中" | "已完成";
  createdAt: string;
  completedAt?: string;
}
const memoryTodos = new Map<string, PersonalTodoItem[]>();

export class PersonalTodoManager {
  private kv?: KVNamespace;
  private gasUrl?: string;

  constructor(kv?: KVNamespace, gasUrl?: string) {
    this.kv = kv;
    this.gasUrl = gasUrl;
  }

  async addTodo(
    userId: string,
    item: string,
    category: string = "生活"
  ): Promise<PersonalTodoItem> {
    const now = getTaiwanTimeString();
    const todos = await this.getTodos(userId);
    const nextNum = todos.length + 1;
    const id = `TODO-${String(nextNum).padStart(3, "0")}`;

    const newTodo: PersonalTodoItem = {
      id,
      item,
      category,
      status: "進行中",
      createdAt: now
    };

    todos.unshift(newTodo);

    memoryTodos.set(userId, todos);

    // Save to KV
    if (this.kv) {
      await this.kv.put(`user:${userId}:todos`, JSON.stringify(todos));
    }
    // Sync to Google Sheet
    if (this.gasUrl) {
      try {
        await fetch(this.gasUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            action: "todo_add",
            id,
            item,
            category,
            status: "進行中",
            timestamp: now
          })
        });
      } catch (err) {
        console.warn("[PersonalTodo] Google Sheet sync failed:", err);
      }
    }

    return newTodo;
  }

  async completeTodo(userId: string, todoId: string): Promise<boolean> {
    const todos = await this.getTodos(userId);
    const target = todos.find((t) => t.id === todoId);
    if (!target) return false;

    target.status = "已完成";
    memoryTodos.set(userId, todos);

    if (this.kv) {
      await this.kv.put(`user:${userId}:todos`, JSON.stringify(todos));
    }

    if (this.gasUrl) {
      try {
        await fetch(this.gasUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({ action: "todo_complete", id: todoId })
        });
      } catch (err) {
        console.warn("[PersonalTodo] Google Sheet complete sync failed:", err);
      }
    }

    return true;
  }

  async getTodos(userId: string): Promise<PersonalTodoItem[]> {
    // 1. Try Google Sheet if available
    if (this.gasUrl) {
      try {
        const res = await fetch(`${this.gasUrl}?type=todos`, {
          signal: AbortSignal.timeout(6000)
        });
        if (res.ok) {
          const raw = (await res.json()) as PersonalTodoItem[];
          if (Array.isArray(raw)) {
            const filtered = raw.filter(
              (t) => t && t.id && String(t.id).startsWith("TODO-")
            );
            if (filtered.length > 0) {
              if (this.kv) {
                await this.kv.put(`user:${userId}:todos`, JSON.stringify(filtered));
              }
              return filtered;
            }
          }
        }
      } catch {
        // Fallback to KV
      }
    }

    // 2. KV Fallback
    if (this.kv) {
      const stored = await this.kv.get<PersonalTodoItem[]>(`user:${userId}:todos`, "json");
      if (stored && Array.isArray(stored)) {
        memoryTodos.set(userId, stored);
        return stored;
      }
    }

    return memoryTodos.get(userId) || [];
  }
}
