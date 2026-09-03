import { evaluateMathExpression } from "../src/tools/calculator";

export function testCalculator(): void {
  console.log("▶ Testing Deterministic Calculator Tool...");

  // 1. Basic Arithmetic
  const r1 = evaluateMathExpression("1250 * (1 + 0.05)^3");
  if (!r1.success || typeof r1.result !== "string") {
    throw new Error(`r1 failed: ${JSON.stringify(r1)}`);
  }
  console.log(`  ✔ 1250 * (1 + 0.05)^3 = ${r1.result}`);

  // 2. Math functions
  const r2 = evaluateMathExpression("sqrt(144) + 25 * 4");
  if (!r2.success || r2.result !== "112") {
    throw new Error(`r2 failed: expected 112, got ${r2.result}`);
  }
  console.log(`  ✔ sqrt(144) + 25 * 4 = ${r2.result}`);

  // 3. Percentage
  const r3 = evaluateMathExpression("2000 * 15%");
  if (!r3.success || r3.result !== "300") {
    throw new Error(`r3 failed: expected 300, got ${r3.result}`);
  }
  console.log(`  ✔ 2000 * 15% = ${r3.result}`);

  // 4. Division by zero protection
  const r4 = evaluateMathExpression("100 / 0");
  if (r4.success) {
    throw new Error("r4 division by zero did not fail gracefully!");
  }
  console.log(`  ✔ Division by zero caught: ${r4.error}`);

  // 5. Chinese characters clean-up
  const r5 = evaluateMathExpression("算一下：100 × 5 ÷ 2 等於多少");
  if (!r5.success || r5.result !== "250") {
    throw new Error(`r5 failed: expected 250, got ${r5.result}`);
  }
  console.log(`  ✔ Clean-up test passed: 100 × 5 ÷ 2 = ${r5.result}`);

  console.log("✅ Calculator tests passed!\n");
}
