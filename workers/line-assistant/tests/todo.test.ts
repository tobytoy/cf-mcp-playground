import { TodoMemoManager } from "../src/tools/todoMemo";

export async function testTodoMemoManager(): Promise<void> {
  console.log("▶ Testing TodoMemoManager (Add, List, Complete, Deduplication)...");

  const manager = new TodoMemoManager(); // Uses in-memory fallback
  const testUserId = "U_test_user_todo_123";

  // 1. Initial should be empty
  const initial = await manager.getTodos(testUserId);
  if (initial.length !== 0) {
    throw new Error(`Expected initial todos to be 0, got ${initial.length}`);
  }

  // 2. Add first item
  const item1 = await manager.addTodo(testUserId, "購買高鐵車票", "LINE 文字");
  if (item1.text !== "購買高鐵車票" || item1.done !== false) {
    throw new Error(`Failed to add item 1: ${JSON.stringify(item1)}`);
  }

  // 3. Add second item
  const item2 = await manager.addTodo(testUserId, "下午兩點開會", "LINE 文字");
  if (item2.text !== "下午兩點開會") {
    throw new Error(`Failed to add item 2: ${JSON.stringify(item2)}`);
  }

  // 4. Verify list has 2 items
  let current = await manager.getTodos(testUserId);
  if (current.length !== 2) {
    throw new Error(`Expected 2 items, got ${current.length}`);
  }

  // 5. Complete first item
  const completed = await manager.completeTodo(testUserId, "購買高鐵車票");
  if (!completed) {
    throw new Error("completeTodo returned false");
  }

  // 6. Verify list now has ONLY the second item
  current = await manager.getTodos(testUserId);
  if (current.length !== 1 || current[0].text !== "下午兩點開會") {
    throw new Error(`Expected only item 2 after completion, got: ${JSON.stringify(current)}`);
  }

  // 7. Complete second item
  await manager.completeTodo(testUserId, "下午兩點開會");
  current = await manager.getTodos(testUserId);
  if (current.length !== 0) {
    throw new Error(`Expected 0 items after completing all, got: ${JSON.stringify(current)}`);
  }

  // 8. Re-adding an item that was previously completed should work
  const itemReadded = await manager.addTodo(testUserId, "購買高鐵車票", "LINE 文字");
  current = await manager.getTodos(testUserId);
  if (current.length !== 1 || current[0].text !== "購買高鐵車票") {
    throw new Error(`Expected re-added item to be visible, got: ${JSON.stringify(current)}`);
  }

  console.log("✅ TodoMemoManager tests passed!\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testTodoMemoManager().catch((err) => {
    console.error("Test failed:", err);
    process.exit(1);
  });
}
