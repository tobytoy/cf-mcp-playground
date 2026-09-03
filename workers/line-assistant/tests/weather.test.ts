import { getTaiwanWeatherForecast, normalizeCityName } from "../src/tools/weather";
import { NeedleClassifier } from "../src/classifier/needle";
import type { Env } from "../src/types/env";

export async function testWeatherFeature(): Promise<void> {
  console.log("▶ Testing CWA Weather Feature & Tianmu Default Context...");

  const cwaKey = process.env.CWA_API_KEY;

  // 1. Test City Normalization
  const n1 = normalizeCityName("");
  if (n1.cwaCity !== "臺北市" || !n1.displayName.includes("天母")) {
    throw new Error(`Default normalization failed: ${JSON.stringify(n1)}`);
  }
  console.log(`  ✔ Default location normalized -> ${n1.displayName} (${n1.cwaCity})`);

  const n2 = normalizeCityName("台中今天會下雨嗎");
  if (n2.cwaCity !== "臺中市") {
    throw new Error(`Taichung normalization failed: ${JSON.stringify(n2)}`);
  }
  console.log(`  ✔ Taichung normalized -> ${n2.displayName} (${n2.cwaCity})`);

  // 2. Test Official CWA API Forecast (Tianmu / Taipei)
  const forecast = await getTaiwanWeatherForecast("天母", cwaKey);
  if (!forecast.city || !forecast.condition || !forecast.rainProb || !forecast.minTemp || !forecast.maxTemp) {
    throw new Error(`Weather forecast data incomplete: ${JSON.stringify(forecast)}`);
  }
  console.log(`  ✔ Tianmu Weather: ${forecast.targetArea} | ${forecast.condition} | 氣溫 ${forecast.minTemp}~${forecast.maxTemp} | 降雨機率 ${forecast.rainProb}`);
  console.log(`  ✔ Smart Advice: ${forecast.advice}`);

  // 3. Test Needle Classifier Intent for Weather
  const mockEnv: Env = {
    LINE_CHANNEL_SECRET: "s",
    LINE_CHANNEL_ACCESS_TOKEN: "t",
    GEMINI_API_KEY: "k",
    CWA_API_KEY: cwaKey
  };
  const classifier = new NeedleClassifier(mockEnv);

  const route1 = await classifier.classify("今天天母會下雨嗎？");
  if (route1.tool !== "weather_forecast") {
    throw new Error(`Expected weather_forecast, got ${route1.tool}`);
  }
  console.log(`  ✔ '今天天母會下雨嗎？' -> ${route1.tool}`);

  const route2 = await classifier.classify("查一下明天高雄天氣預報");
  if (route2.tool !== "weather_forecast") {
    throw new Error(`Expected weather_forecast, got ${route2.tool}`);
  }
  console.log(`  ✔ '查一下明天高雄天氣預報' -> ${route2.tool}`);

  const route3 = await classifier.classify("出門要帶傘嗎");
  if (route3.tool !== "weather_forecast") {
    throw new Error(`Expected weather_forecast, got ${route3.tool}`);
  }
  console.log(`  ✔ '出門要帶傘嗎' -> ${route3.tool}`);

  console.log("✅ CWA Weather tests passed!\n");
}
