export interface CalculationResult {
  expression: string;
  result: number;
  explanation: string;
}

export function evaluateMathExpression(expr: string): CalculationResult {
  let clean = expr
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/%/g, "*0.01")
    .replace(/\^/g, "**")
    .replace(/[^\d+\-*/().*eE\s]/g, "")
    .trim();

  try {
    // Safe evaluation using Function
    const fn = new Function(`"use strict"; return (${clean});`);
    const val = fn();

    if (typeof val !== "number" || !isFinite(val)) {
      throw new Error("無法計算此數學式");
    }

    return {
      expression: expr,
      result: Number(val.toFixed(6)),
      explanation: `運算步驟解析：${clean} = ${Number(val.toFixed(6))}`
    };
  } catch (err) {
    return {
      expression: expr,
      result: 0,
      explanation: `計算發生錯誤：${err instanceof Error ? err.message : String(err)}`
    };
  }
}
