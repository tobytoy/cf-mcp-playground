import { TDXParkingClient } from "../src/services/tdx.js";

async function runTests() {
  console.log("🧪 Testing Parking Radar Worker TDX Client...");

  const mockEnv = {
    TDX_CLIENT_ID: process.env.TDX_CLIENT_ID || "tobywang-0717f1b3-278a-4873",
    TDX_CLIENT_SECRET: process.env.TDX_CLIENT_SECRET || "fbba5b5d-0025-4d66-9617-e30b607ebc2e",
    TDX_BASE_URL: "https://tdx.transportdata.tw/api/basic",
  };

  const client = new TDXParkingClient(mockEnv);
  
  console.log("Fetching Taipei parking lots...");
  const results = await client.getCityParking("Taipei");
  
  console.log(`✅ Received ${results.length} parking lots.`);
  if (results.length > 0) {
    const sample = results[0];
    console.log("Sample lot:", {
      id: sample.id,
      name: sample.name,
      totalSpaces: sample.totalSpaces,
      availableSpaces: sample.availableSpaces,
      status: sample.status,
      fare: sample.fareDescription,
    });
  }

  console.log("🎉 All tests passed!");
}

runTests().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
