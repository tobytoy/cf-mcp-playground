import { LocationManager, DEFAULT_TIANMU_LOCATION } from "../src/tools/locationManager";

export async function testLocationManager(): Promise<void> {
  console.log("▶ Testing LocationManager & Relative Location Intelligence...");

  const locManager = new LocationManager();
  const userId = "test_user_location_456";

  // 1. Test default location fallback
  const defaultLoc = await locManager.getLocation(userId);
  if (defaultLoc.title !== DEFAULT_TIANMU_LOCATION.title || defaultLoc.latitude !== DEFAULT_TIANMU_LOCATION.latitude) {
    throw new Error(`Default location mismatch: ${JSON.stringify(defaultLoc)}`);
  }
  console.log(`  ✔ Default location fallback -> ${defaultLoc.title} (${defaultLoc.address})`);

  // 2. Test saving / updating user location (e.g. user shares GPS at Taipei Main Station)
  const saved = await locManager.saveLocation(
    userId,
    25.0478,
    121.5170,
    "台北車站",
    "台北市中正區北平西路3號"
  );
  if (saved.latitude !== 25.0478 || saved.title !== "台北車站") {
    throw new Error(`Saved location mismatch: ${JSON.stringify(saved)}`);
  }
  console.log(`  ✔ Saved user location -> ${saved.title} (${saved.latitude}, ${saved.longitude}) at ${saved.updatedAt}`);

  // 3. Test retrieving updated location
  const retrieved = await locManager.getLocation(userId);
  if (retrieved.title !== "台北車站") {
    throw new Error(`Retrieved location mismatch: ${JSON.stringify(retrieved)}`);
  }
  console.log(`  ✔ Retrieved user location -> ${retrieved.title}`);

  // 4. Test relative location keywords detection
  const hasLoc1 = locManager.hasRelativeLocationReference("我現在位置如何去花蓮？");
  const hasLoc2 = locManager.hasRelativeLocationReference("從這裡開車去宜蘭要多久？");
  const hasLoc3 = locManager.hasRelativeLocationReference("今天天母會下雨嗎？");

  if (!hasLoc1 || !hasLoc2 || hasLoc3) {
    throw new Error(`Relative location detection mismatch: loc1=${hasLoc1}, loc2=${hasLoc2}, loc3=${hasLoc3}`);
  }
  console.log("  ✔ Relative location detection: '我現在位置' (true), '從這裡' (true), '今天天母天氣' (false)");

  // 5. Test prompt transformation and enrichment
  const originalPrompt = "我現在位置如何去花蓮？";
  const enriched = locManager.enrichPromptWithLocation(originalPrompt, retrieved);
  if (!enriched.includes("台北車站") || !enriched.includes("花蓮")) {
    throw new Error(`Enriched prompt missing expected content: ${enriched}`);
  }
  console.log(`  ✔ Prompt transformation output:\n${enriched.split('\n').map(l => '     ' + l).join('\n')}`);

  console.log("✅ LocationManager tests passed!\n");
}
