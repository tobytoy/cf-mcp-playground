import { createMCPServer } from "../src/mcp/server.js";
import { MemoryCache } from "../src/services/cache.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

async function executeMcpRequest(id: number, method: string, params: Record<string, unknown> = {}) {
  const cache = new MemoryCache();
  const server = createMCPServer({ cacheService: cache });
  const transport = new WebStandardStreamableHTTPServerTransport();
  await server.connect(transport);

  const req = new Request("http://localhost:3000/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    },
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });

  const res = await transport.handleRequest(req);
  const text = await res.text();
  const lines = text.split("\n");
  const dataLine = lines.find((l) => l.startsWith("data: "));
  if (dataLine) return JSON.parse(dataLine.slice(6));
  return JSON.parse(text);
}

async function verifyFixes() {
  console.log("🔍 驗證第二輪修復項目...");

  // 1. 驗證 get_mcp_quickstart 是否能成功取得文章內容（非不可用）
  console.log("\n[Test 1] 驗證 get_mcp_quickstart...");
  const quickstartRes = await executeMcpRequest(1, "tools/call", {
    name: "get_mcp_quickstart",
    arguments: { client: "claude-desktop" },
  });
  const qsContent = quickstartRes?.result?.content?.[0]?.text;
  console.log("Quickstart result length:", qsContent?.length);
  if (!qsContent || qsContent.includes("暫時不可用")) {
    throw new Error("❌ get_mcp_quickstart 依舊失敗！");
  }
  console.log("✅ get_mcp_quickstart 修復成功！內容摘要:", qsContent.slice(0, 100));

  // 2. 驗證 explain_mcp_skill 詢問 tools / resources 是否不再返回「找不到內容」
  console.log("\n[Test 2] 驗證 explain_mcp_skill (topic: tools)...");
  const skillRes = await executeMcpRequest(2, "tools/call", {
    name: "explain_mcp_skill",
    arguments: { topic: "tools" },
  });
  const skillContent = skillRes?.result?.content?.[0]?.text;
  if (!skillContent || skillContent.includes("找不到內容")) {
    throw new Error("❌ explain_mcp_skill (tools) 依舊返回找不到內容！");
  }
  console.log("✅ explain_mcp_skill 修復成功！標題與摘要:", skillContent.slice(0, 100));

  console.log("\n🎉 第二輪修復項目驗證全數通過！");
}

verifyFixes().catch((err) => {
  console.error("驗證失敗:", err);
  process.exit(1);
});
