import { createMCPServer } from "../src/mcp/server.js";
import { MemoryCache } from "../src/services/cache.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

async function executeMcpRequest(cache: MemoryCache, id: number, method: string, params: Record<string, unknown> = {}) {
  const server = createMCPServer({ cacheService: cache });
  const transport = new WebStandardStreamableHTTPServerTransport();
  await server.connect(transport);

  const req = new Request("http://localhost:3000/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id,
      method,
      params,
    }),
  });

  const res = await transport.handleRequest(req);
  const text = await res.text();
  const lines = text.split("\n");
  const dataLine = lines.find((l) => l.startsWith("data: "));
  if (dataLine) {
    return JSON.parse(dataLine.slice(6));
  }
  return JSON.parse(text);
}

async function runTests() {
  console.log("🚀 Starting MCP & Cache Unit Tests...\n");

  const cache = new MemoryCache();

  // 1. Test Tools List
  console.log("▶ Test 1: List Tools");
  const listResp = await executeMcpRequest(cache, 1, "tools/list");
  const tools = listResp?.result?.tools as Array<{ name: string; description: string }>;
  console.log(`  Found ${tools.length} tools:`);
  tools.forEach((t) => console.log(`  - ${t.name}: ${t.description.slice(0, 40)}...`));

  if (!tools || tools.length < 5) {
    throw new Error("Expected at least 5 registered tools!");
  }
  console.log("  ✅ Test 1 Passed!\n");

  // 2. Test explain_mcp_skill Tool
  console.log("▶ Test 2: Execute explain_mcp_skill");
  const explainResp = await executeMcpRequest(cache, 2, "tools/call", {
    name: "explain_mcp_skill",
    arguments: { topic: "skills" },
  });
  const explainText = explainResp?.result?.content?.[0]?.text as string;
  console.log("  Response length:", explainText?.length);
  if (!explainText?.includes("MCP Skill")) {
    throw new Error("explain_mcp_skill did not return expected content!");
  }
  console.log("  ✅ Test 2 Passed!\n");

  // 3. Test ask_mcp_assistant with Cache Miss & Hit
  console.log("▶ Test 3: ask_mcp_assistant Cache Miss & Cache Hit");
  const question = "MCP Skill 和 Tool 有什麼不同？";

  // First call -> Cache Miss
  console.log(`  [Call 1] Asking: "${question}"`);
  const askResp1 = await executeMcpRequest(cache, 3, "tools/call", {
    name: "ask_mcp_assistant",
    arguments: { question },
  });
  const text1 = askResp1?.result?.content?.[0]?.text as string;
  console.log("  Result 1 preview:", text1?.slice(0, 80).replace(/\n/g, " "));
  if (!text1?.includes("Cache MISS")) {
    throw new Error("Expected first call to be Cache MISS!");
  }

  // Second call with same question -> Cache HIT!
  console.log(`  [Call 2] Asking again (same question): "${question}"`);
  const askResp2 = await executeMcpRequest(cache, 4, "tools/call", {
    name: "ask_mcp_assistant",
    arguments: { question },
  });
  const text2 = askResp2?.result?.content?.[0]?.text as string;
  console.log("  Result 2 preview:", text2?.slice(0, 80).replace(/\n/g, " "));
  if (!text2?.includes("Cache HIT")) {
    throw new Error("Expected second call to be Cache HIT!");
  }

  // Third call with slightly different punctuation / case -> Should still Cache HIT due to normalization!
  console.log(`  [Call 3] Asking with different punctuation: "  mcp skill 和 tool 有什麼不同???  "`);
  const askResp3 = await executeMcpRequest(cache, 5, "tools/call", {
    name: "ask_mcp_assistant",
    arguments: { question: "  mcp skill 和 tool 有什麼不同???  " },
  });
  const text3 = askResp3?.result?.content?.[0]?.text as string;
  console.log("  Result 3 preview:", text3?.slice(0, 80).replace(/\n/g, " "));
  if (!text3?.includes("Cache HIT")) {
    throw new Error("Expected normalized question to be Cache HIT!");
  }
  console.log("  ✅ Test 3 Passed!\n");

  // 4. Test Cache Stats
  console.log("▶ Test 4: Cache Stats");
  const statsResp = await executeMcpRequest(cache, 6, "tools/call", {
    name: "get_cache_stats",
    arguments: {},
  });
  const statsText = statsResp?.result?.content?.[0]?.text as string;
  console.log("  Stats:\n" + statsText?.split("\n").map((l) => "    " + l).join("\n"));
  console.log("  ✅ Test 4 Passed!\n");

  console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
}

runTests().catch((err) => {
  console.error("❌ Test Failed:", err);
  process.exit(1);
});
