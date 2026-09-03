import {
  lookupOfficialRailFare,
  extractRouteOD,
  formatOfficialFareContext
} from "../src/tools/railFares";

export function testOfficialRailFares(): void {
  console.log("▶ Testing Official MOTC / TDX Rail Fares Lookup Engine...");

  // 1. Test Taipei -> Hualien Official Fares
  const hualienFare = lookupOfficialRailFare("台北", "花蓮");
  if (!hualienFare || !hualienFare.tra) {
    throw new Error("Taipei -> Hualien fare lookup failed!");
  }
  if (hualienFare.tra.tZeQiang !== 440) {
    throw new Error(`Expected TRA Tze-Chiang NT$ 440, got ${hualienFare.tra.tZeQiang}`);
  }
  if (hualienFare.tra.chuKuang !== 340 || hualienFare.tra.local !== 283) {
    throw new Error(`TRA local/Chu-Kuang fare mismatch: ${JSON.stringify(hualienFare.tra)}`);
  }
  console.log(`  ✔ Taipei -> Hualien: 台鐵自強號/3000/太魯閣全票 NT$ ${hualienFare.tra.tZeQiang} 元 (舊資訊常誤報250~300)`);

  // 2. Test Taipei -> Hsinchu Official Fares (THSR + TRA + Metro)
  const hsinchuFare = lookupOfficialRailFare("台北", "新竹");
  if (!hsinchuFare || !hsinchuFare.thsr || !hsinchuFare.tra) {
    throw new Error("Taipei -> Hsinchu fare lookup failed!");
  }
  if (hsinchuFare.thsr.standard !== 290 || hsinchuFare.thsr.nonReserved !== 280) {
    throw new Error(`THSR fare mismatch: ${JSON.stringify(hsinchuFare.thsr)}`);
  }
  if (hsinchuFare.tra.tZeQiang !== 177) {
    throw new Error(`TRA Hsinchu fare mismatch: ${hsinchuFare.tra.tZeQiang}`);
  }
  console.log(`  ✔ Taipei -> Hsinchu: 高鐵標準座 NT$ ${hsinchuFare.thsr.standard} 元，台鐵自強號 NT$ ${hsinchuFare.tra.tZeQiang} 元`);

  // 3. Test Route OD Extraction from Natural Language
  const od1 = extractRouteOD("我現在位置如何去花蓮？", "台北市士林區天母忠誠路二段");
  if (od1.origin !== "台北" || od1.destination !== "花蓮") {
    throw new Error(`OD extraction failed: ${JSON.stringify(od1)}`);
  }
  console.log(`  ✔ Route extraction: "我現在位置如何去花蓮" -> ${od1.origin} -> ${od1.destination}`);

  const od2 = extractRouteOD("從這裡搭高鐵去新竹要多少錢？", "天母住家");
  if (od2.origin !== "台北" || od2.destination !== "新竹") {
    throw new Error(`OD extraction failed: ${JSON.stringify(od2)}`);
  }
  console.log(`  ✔ Route extraction: "從這裡搭高鐵去新竹" -> ${od2.origin} -> ${od2.destination}`);

  // 4. Test Context Formatting
  const context = formatOfficialFareContext(hualienFare);
  if (!context.includes("440") || !context.includes("官方核定正確票價")) {
    throw new Error(`Formatted context missing expected content: ${context}`);
  }
  console.log(`  ✔ Context formatted:\n${context.split('\n').map(l => '     ' + l).join('\n')}`);

  console.log("✅ Official Rail Fares tests passed!\n");
}
