import { createMCPServer } from "../src/mcp/server.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

async function test() {
  const server = createMCPServer();
  const transport = new WebStandardStreamableHTTPServerTransport();
  await server.connect(transport);
  console.log("Connected successfully!");

  const req = new Request("http://localhost:3000/mcp", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    }),
  });

  const res = await transport.handleRequest(req);
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response text:", text);
}

test().catch(console.error);
