import assert from "node:assert";
import { resolveTHSRStation, resolveTRAStation, THSR_STATIONS, TRA_STATIONS } from "../src/data/stations.js";
import { TDXRadarClient } from "../src/services/tdx.js";

async function runTests() {
  console.log("🚀 [RailRadarTests] 開始驗證專用雙鐵雷達 Worker 功能...\n");

  // 1. 站點清單數量驗證
  console.log("👉 1. 驗證站點清單完整性...");
  assert.strictEqual(THSR_STATIONS.length, 12, "高鐵站點數量必須為 12 站");
  assert.ok(TRA_STATIONS.length >= 240, `台鐵站點數量必須 >= 240 站 (目前: ${TRA_STATIONS.length})`);
  console.log("   ✅ 高鐵 12 站與台鐵 240+ 站資料齊全！");

  // 2. 台北站與異體字解析驗證 (解決使用者回報之核心問題)
  console.log("\n👉 2. 驗證台北站與異體字解析能力...");
  const thsrTaipei = resolveTHSRStation("台北");
  assert.ok(thsrTaipei, "高鐵必須能解析「台北」");
  assert.strictEqual(thsrTaipei.id, "1000", "高鐵台北站 ID 應為 1000");

  const thsrTaipeiStation = resolveTHSRStation("台北車站");
  assert.ok(thsrTaipeiStation, "高鐵必須能解析「台北車站」");
  assert.strictEqual(thsrTaipeiStation.id, "1000");

  const traTaipei1 = resolveTRAStation("台北");
  assert.ok(traTaipei1, "台鐵必須能解析「台北」");
  assert.strictEqual(traTaipei1.id, "1000", "台鐵台北站 ID 應為 1000");

  const traTaipei2 = resolveTRAStation("臺北");
  assert.ok(traTaipei2, "台鐵必須能解析「臺北」");
  assert.strictEqual(traTaipei2.id, "1000", "台鐵臺北站 ID 應為 1000");

  const traNangang = resolveTRAStation("南港");
  assert.ok(traNangang, "台鐵必須能解析「南港」");
  assert.strictEqual(traNangang.id, "0980", "台鐵南港站 ID 必須為 0980 (非 0990)");

  const traSongshan = resolveTRAStation("松山");
  assert.ok(traSongshan, "台鐵必須能解析「松山」");
  assert.strictEqual(traSongshan.id, "0990", "台鐵松山站 ID 必須為 0990 (非 1000)");

  const traHualien = resolveTRAStation("花蓮");
  assert.ok(traHualien, "台鐵必須能解析「花蓮」");
  assert.strictEqual(traHualien.id, "7000", "台鐵花蓮站 ID 必須為 7000 (非舊版 7130)");

  const traTaitung = resolveTRAStation("台東");
  assert.ok(traTaitung, "台鐵必須能解析「台東」");
  assert.strictEqual(traTaitung.id, "6000", "台鐵台東站 ID 必須為 6000 (非舊版 7360)");

  console.log("   ✅ 台北、南港、松山、花蓮、台東代碼與繁簡別名完全正確！");

  // 3. TDX API 實測：高鐵即時餘位與台鐵班次查詢
  console.log("\n👉 3. 實測 TDX API 雙鐵綜合查詢 (台北 ➔ 左營)...");
  const env = {
    TDX_CLIENT_ID: "tobywang-0717f1b3-278a-4873",
    TDX_CLIENT_SECRET: "fbba5b5d-0025-4d66-9617-e30b607ebc2e",
    TDX_BASE_URL: "https://tdx.transportdata.tw/api/basic",
  };

  const client = new TDXRadarClient(env);
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());
  const radarResult = await client.getCombinedRailRadar("台北", "左營", today);

  console.log(`   📡 查詢結果：找到 ${radarResult.schedules.length} 班次`);
  assert.ok(radarResult.schedules.length > 0, "台北至左營必須有班次");

  const thsrTrains = radarResult.schedules.filter((s) => s.system === "THSR");
  console.log(`   🚄 高鐵班次數: ${thsrTrains.length}`);
  assert.ok(thsrTrains.length > 0, "必須包含高鐵班次");

  const sampleThsr = thsrTrains[0];
  console.log(
    `   🔍 範例高鐵 ${sampleThsr.trainNo} 次: 發車 ${sampleThsr.departureTime}, 標準座[${sampleThsr.seats.standard}], 商務座[${sampleThsr.seats.business}]`
  );
  assert.ok(["O", "L", "X", "-"].includes(sampleThsr.seats.standard), "標準座必須為 O/L/X/- 狀態代碼");

  // 4. 台鐵東部幹線查詢 (台北 ➔ 花蓮)
  console.log("\n👉 4. 實測東部幹線 (台北 ➔ 花蓮)...");
  const eastResult = await client.getCombinedRailRadar("台北", "花蓮", today);
  const traTrains = eastResult.schedules.filter((s) => s.system === "TRA");
  console.log(`   🚆 台鐵台北➔花蓮班次數: ${traTrains.length}`);
  assert.ok(traTrains.length > 0, "台北至花蓮必須能查出台鐵班次");

  // 5. 測試時間區間篩選與雙鐵分欄 (出發時間/抵達時間 filter)
  console.log("\n👉 5. 實測時間區間篩選功能 (出發: 10:00~14:00, 最晚抵達: 16:00)...");
  const filteredResult = await client.getCombinedRailRadar("台北", "左營", today, {
    depAfter: "10:00",
    depBefore: "14:00",
    arrBefore: "16:00",
  });
  console.log(`   ⏱️ 時間篩選後總班次: ${filteredResult.total} (高鐵: ${filteredResult.thsr.length}, 台鐵: ${filteredResult.tra.length})`);
  assert.ok(filteredResult.thsr.length > 0, "高鐵在 10:00~14:00 區間必須有班次");
  for (const t of filteredResult.schedules) {
    assert.ok(t.departureTime >= "10:00", `發車時間 ${t.departureTime} 必須 >= 10:00`);
    assert.ok(t.departureTime <= "14:00", `發車時間 ${t.departureTime} 必須 <= 14:00`);
    assert.ok(t.arrivalTime <= "16:00", `到站時間 ${t.arrivalTime} 必須 <= 16:00`);
  }
  console.log("   ✅ 時間範圍篩選與雙鐵分欄邏輯完全正確！");

  console.log("\n🎉 [All Tests Passed] 所有測試 100% 成功通過！雙鐵雷達 Worker 運行正常！");
}

runTests().catch((err) => {
  console.error("❌ 測試失敗:", err);
  process.exit(1);
});
