export interface CalculationResult {
  expression: string;
  result: number;
  explanation: string;
}

/**
 * Safe mathematical calculator using a recursive descent parser.
 * No eval() or new Function() — complete AST safety.
 */
export function evaluateMathExpression(rawExpr: string): CalculationResult {
  const cleanExpr = rawExpr
    .replace(/^(計算|算一下|幫我算|請問|math|calc|eval)[:：\s]*/i, "")
    .replace(/(等於多少|是多少|等於|多少|\?|？|=)/g, "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/（/g, "(")
    .replace(/）/g, ")")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim();

  try {
    const tokens = tokenize(cleanExpr);
    const parser = new MathParser(tokens);
    const value = parser.parse();

    if (typeof value !== "number" || !isFinite(value)) {
      throw new Error("無法計算此數學式");
    }

    // Round to avoid floating point quirks (e.g. 0.1 + 0.2)
    const rounded = Number(value.toFixed(10));

    return {
      expression: cleanExpr,
      result: rounded,
      explanation: generateExplanation(cleanExpr, rounded)
    };
  } catch (err) {
    return {
      expression: cleanExpr,
      result: 0,
      explanation: `計算發生錯誤：${err instanceof Error ? err.message : String(err)}`
    };
  }
}

// ── Tokenizer ──────────────────────────────────────────────────────────────

type TokenType = "NUMBER" | "OP" | "LPAREN" | "RPAREN" | "FUNC" | "CONST" | "PERCENT";

interface Token {
  type: TokenType;
  value: string;
  num?: number;
}

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < expr.length) {
    const char = expr[i];

    if (/\s/.test(char)) {
      i++;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let numStr = "";
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        numStr += expr[i];
        i++;
      }
      tokens.push({ type: "NUMBER", value: numStr, num: parseFloat(numStr) });
      continue;
    }

    if (char === "%") {
      tokens.push({ type: "PERCENT", value: "%" });
      i++;
      continue;
    }

    if (/[+\-*/^]/.test(char)) {
      tokens.push({ type: "OP", value: char });
      i++;
      continue;
    }

    if (char === "(") {
      tokens.push({ type: "LPAREN", value: "(" });
      i++;
      continue;
    }

    if (char === ")") {
      tokens.push({ type: "RPAREN", value: ")" });
      i++;
      continue;
    }

    if (/[a-zA-Z]/.test(char)) {
      let word = "";
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        word += expr[i];
        i++;
      }
      const lower = word.toLowerCase();
      if (lower === "pi") {
        tokens.push({ type: "CONST", value: "pi", num: Math.PI });
      } else if (lower === "e") {
        tokens.push({ type: "CONST", value: "e", num: Math.E });
      } else if (["sqrt", "sin", "cos", "tan", "abs", "log", "ln", "round", "floor", "ceil"].includes(lower)) {
        tokens.push({ type: "FUNC", value: lower });
      } else {
        throw new Error(`未知函數或常數: ${word}`);
      }
      continue;
    }

    throw new Error(`無效字元: '${char}'`);
  }

  return tokens;
}

// ── Recursive Descent Parser ───────────────────────────────────────────────

class MathParser {
  private tokens: Token[];
  private pos = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): number {
    const result = this.parseExpression();
    if (this.pos < this.tokens.length) {
      throw new Error(`未預期的語法標記: ${this.tokens[this.pos].value}`);
    }
    return result;
  }

  private parseExpression(): number {
    let left = this.parseTerm();

    while (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos];
      if (token.type === "OP" && (token.value === "+" || token.value === "-")) {
        this.pos++;
        const right = this.parseTerm();
        if (token.value === "+") left += right;
        else left -= right;
      } else {
        break;
      }
    }

    return left;
  }

  private parseTerm(): number {
    let left = this.parseFactor();

    while (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos];
      if (token.type === "OP" && (token.value === "*" || token.value === "/")) {
        this.pos++;
        const right = this.parseFactor();
        if (token.value === "*") {
          left *= right;
        } else {
          if (right === 0) throw new Error("除數不可為零 (Division by zero)");
          left /= right;
        }
      } else {
        break;
      }
    }

    return left;
  }

  private parseFactor(): number {
    let left = this.parseUnary();

    while (this.pos < this.tokens.length) {
      const token = this.tokens[this.pos];
      if (token.type === "OP" && token.value === "^") {
        this.pos++;
        const right = this.parseFactor(); // Right associative
        left = Math.pow(left, right);
      } else if (token.type === "PERCENT") {
        this.pos++;
        left = left / 100;
      } else {
        break;
      }
    }

    return left;
  }

  private parseUnary(): number {
    const token = this.tokens[this.pos];
    if (!token) throw new Error("語句不完整");

    if (token.type === "OP" && token.value === "-") {
      this.pos++;
      return -this.parseUnary();
    }
    if (token.type === "OP" && token.value === "+") {
      this.pos++;
      return this.parseUnary();
    }

    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const token = this.tokens[this.pos];
    if (!token) throw new Error("缺少運算數值");

    if (token.type === "NUMBER" || token.type === "CONST") {
      this.pos++;
      return token.num ?? 0;
    }

    if (token.type === "FUNC") {
      const funcName = token.value;
      this.pos++;
      if (this.tokens[this.pos]?.type !== "LPAREN") {
        throw new Error(`函數 ${funcName} 後方需接 '('`);
      }
      this.pos++; // skip '('
      const arg = this.parseExpression();
      if (this.tokens[this.pos]?.type !== "RPAREN") {
        throw new Error(`函數 ${funcName} 缺少結尾 ')'`);
      }
      this.pos++; // skip ')'

      switch (funcName) {
        case "sqrt":
          if (arg < 0) throw new Error("不能對負數開根號");
          return Math.sqrt(arg);
        case "sin":
          return Math.sin(arg);
        case "cos":
          return Math.cos(arg);
        case "tan":
          return Math.tan(arg);
        case "abs":
          return Math.abs(arg);
        case "log":
          return Math.log10(arg);
        case "ln":
          return Math.log(arg);
        case "round":
          return Math.round(arg);
        case "floor":
          return Math.floor(arg);
        case "ceil":
          return Math.ceil(arg);
        default:
          throw new Error(`未實現的函數: ${funcName}`);
      }
    }

    if (token.type === "LPAREN") {
      this.pos++;
      const val = this.parseExpression();
      if (this.tokens[this.pos]?.type !== "RPAREN") {
        throw new Error("括號未閉合，缺少 ')'");
      }
      this.pos++;
      return val;
    }

    throw new Error(`無法解析的標記: ${token.value}`);
  }
}

function generateExplanation(expr: string, result: number): string {
  if (expr.includes("^")) {
    return `指數運算：${expr} = ${result}`;
  }
  if (expr.includes("%")) {
    return `百分比運算：${expr} = ${result}`;
  }
  if (expr.includes("sqrt")) {
    return `開根號運算：${expr} = ${result}`;
  }
  return `運算步驟解析：${expr} = ${result}`;
}
