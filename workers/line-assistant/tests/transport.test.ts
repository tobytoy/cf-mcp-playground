import { getNearbyTransportContext, calculateDistanceMeters, guessCity } from "../src/tools/tdxTransport";
import { NeedleClassifier } from "../src/classifier/needle";
import type { Env } from "../src/types/env";

export async function testTransportAndLocation(): Promise<void> {
  console.log("▶ Testing TDX Transport & Location Intelligence...");

  // 1. Distance Calculation (Taipei 101 to Taipei Main Station ~4.7km)
  const dist = calculateDistanceMeters(25.0339, 121.5644, 25.0478, 121.5170);
  if (dist < 4000 || dist > 6000) {
    throw new Error(`Distance calculation unexpected: ${dist}m`);
  }
  console.log(`  ✔ Distance check: Taipei 101 to Taipei Main Station = ${dist}m`);

  // 2. City Guessing
  const city1 = guessCity(25.0339, 121.5644, "台北市信義區");
  if (city1 !== "Taipei") throw new Error(`Expected Taipei, got ${city1}`);
  console.log(`  ✔ City Guess -> ${city1}`);

  // 3. Nearby Transport Context (Taipei 101 coordinates)
  const context = await getNearbyTransportContext(25.0339, 121.5644, "台北 101", "台北市信義區信義路五段7號");
  if (!context.locationTitle || !Array.isArray(context.youbikes) || !Array.isArray(context.parkingLots)) {
    throw new Error(`Transport context malformed: ${JSON.stringify(context)}`);
  }
  console.log(`  ✔ Context retrieved: ${context.youbikes.length} YouBike stations, ${context.parkingLots.length} parking lots`);
  console.log(`  ✔ Smart Tip: ${context.transitTips[0]}`);

  // 4. Test Needle Routing for Transport
  const mockEnv: Env = {
    LINE_CHANNEL_SECRET: "s",
    LINE_CHANNEL_ACCESS_TOKEN: "t",
    GEMINI_API_KEY: "k"
  };
  const classifier = new NeedleClassifier(mockEnv);

  const route1 = await classifier.classify("幫我找附近的 YouBike 站點");
  if (route1.tool !== "nearby_transport") {
    throw new Error(`Expected nearby_transport, got ${route1.tool}`);
  }
  console.log(`  ✔ '幫我找附近的 YouBike 站點' -> ${route1.tool}`);

  const route2 = await classifier.classify("查附近停車位");
  if (route2.tool !== "nearby_transport") {
    throw new Error(`Expected nearby_transport, got ${route2.tool}`);
  }
  console.log(`  ✔ '查附近停車位' -> ${route2.tool}`);

  console.log("✅ Transport & Location tests passed!\n");
}
