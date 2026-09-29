import { createApp } from "../src/app.js";

async function runTests() {
  console.log("🚀 開始測試 transport-mcp 整合 JIT-API...");
  const app = createApp();

  // Test 1: Health check
  console.log("\n[Test 1] Health check...");
  const resHealth = await app.request("/health");
  console.log("Status:", resHealth.status);
  const healthJson = await resHealth.json();
  console.log("Health:", healthJson);

  // Test 2: JIT REST API (get_transport_context) - Phase 1 Dynamic / Fallback
  console.log("\n[Test 2] REST POST /api/transport/context (Through JIT Engine)...");
  const resContext1 = await app.request("/api/transport/context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity: "ev",
      state: "urgent",
      latitude: 25.033964,
      longitude: 121.564468,
      location_name: "台北101",
      radius_meters: 800,
    }),
  });
  console.log("Status:", resContext1.status);
  const contextJson1 = await resContext1.json();
  console.log("Context summary:", {
    identity: contextJson1?.identity,
    state: contextJson1?.state,
    recommendationsCount: contextJson1?.recommendations?.length,
  });

  // Test 3: Generic JIT Route endpoint (/api/jit/:route)
  console.log("\n[Test 3] Generic REST POST /api/jit/get_transport_context...");
  const resJitRoute = await app.request("/api/jit/get_transport_context", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      identity: "car",
      state: "cruising",
      latitude: 25.047761,
      longitude: 121.517055,
      location_name: "台北車站",
    }),
  });
  console.log("Status:", resJitRoute.status);
  const jitRouteJson = await resJitRoute.json();
  console.log("JIT Result:", {
    route: jitRouteJson.route,
    phase: jitRouteJson.phase,
    aiLatencyMs: jitRouteJson.aiLatencyMs,
    identity: jitRouteJson.data?.identity,
  });
  console.log("\n[Test 4] MCP Protocol POST /mcp (tools/list)...");
  const mcpListReq = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
  };
  const resMcp = await app.request("/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "Authorization": "Bearer dev_local_secret",
    },
    body: JSON.stringify(mcpListReq),
  });
  console.log("MCP Status:", resMcp.status);
  const mcpData = await resMcp.json();
  console.log("Registered MCP Tools from specs:");
  for (const t of mcpData.result.tools) {
    console.log(`  - 🛠️  ${t.name}: ${t.description.split(" (Intent")[0]}`);
  }

  // Test 4.2: MCP Protocol POST /mcp (tools/call)
  console.log("\n[Test 4.2] MCP Protocol POST /mcp (tools/call: get_transport_context)...");
  const mcpCallReq = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "get_transport_context",
      arguments: {
        identity: "bike",
        state: "cruising",
        latitude: 25.033964,
        longitude: 121.564468,
      },
    },
  };
  const resMcpCall = await app.request("/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
      "Authorization": "Bearer dev_local_secret",
    },
    body: JSON.stringify(mcpCallReq),
  });
  const mcpCallData = await resMcpCall.json();
  console.log("MCP Call Status:", resMcpCall.status);
  console.log("MCP Tool Call Output snippet:", mcpCallData?.result?.content?.[0]?.text?.slice(0, 150) + "...");

  // Test 5: Simulating Traffic to trigger Phase 2 Observer -> Phase 3 Freeze
  console.log("\n[Test 5] Simulating repeated calls to trigger JIT freeze...");
  for (let i = 1; i <= 4; i++) {
    const res = await app.request("/api/jit/get_transport_context", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identity: "ev",
        state: "urgent",
        latitude: 25.033964,
        longitude: 121.564468,
        location_name: "台北101",
        radius_meters: 800,
      }),
    });
    const data = await res.json();
    console.log(`Call #${i}: phase = ${data.phase}, aiLatencyMs = ${data.aiLatencyMs}`);
  }

  console.log("\n🎉 所有測試執行完畢！");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
