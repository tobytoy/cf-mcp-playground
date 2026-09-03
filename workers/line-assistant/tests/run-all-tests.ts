import { testSignatureVerification } from "./signature.test";
import { testCalculator } from "./calculator.test";
import { testRouter } from "./router.test";
import { testWebhookEndpoint } from "./webhook.test";
import { testAnalyticsAndStats } from "./analytics.test";
import { testTransportAndLocation } from "./transport.test";
import { testQuizAndTaiwanTime } from "./quiz.test";
import { testWeatherFeature } from "./weather.test";
import { testVoiceTranscription } from "./voice.test";
async function main() {
  console.log("==========================================");
  console.log("🚀 LINE Assistant Worker Test Suite");
  console.log("==========================================\n");

  try {
    await testSignatureVerification();
    testCalculator();
    await testRouter();
    await testWebhookEndpoint();
    await testAnalyticsAndStats();
    await testTransportAndLocation();
    await testQuizAndTaiwanTime();
    await testWeatherFeature();
    await testVoiceTranscription();

    console.log("==========================================");
    console.log("🎉 ALL TESTS PASSED SUCCESSFULLY!");
    console.log("==========================================");
  } catch (error) {
    console.error("\n❌ TEST SUITE FAILED:", error);
    process.exit(1);
  }
}

main();
