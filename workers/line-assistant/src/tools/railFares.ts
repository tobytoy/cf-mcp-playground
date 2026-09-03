/**
 * Official Taiwan Rail & Transit Fare Lookup Engine (TRA 台鐵 & THSR 高鐵 & Metro 北捷)
 * Authoritative data sourced from Ministry of Transportation and Communications (MOTC) & TDX.
 */

export interface RailFareInfo {
  origin: string;
  destination: string;
  tra?: {
    tZeQiang: number; // 自強號 / 3000 / 普悠瑪 / 太魯閣
    chuKuang: number; // 莒光號
    local: number;    // 區間車 / 區間快
  };
  thsr?: {
    standard: number; // 標準車廂對號座
    nonReserved: number; // 自由座
    business: number; // 商務車廂
  };
  metro?: {
    adult: number; // 單程票
  };
}

/**
 * Authoritative official fare table for major stations across Taiwan (NTD).
 */
export const OFFICIAL_RAIL_FARES: Record<string, Record<string, RailFareInfo>> = {
  台北: {
    新竹: {
      origin: "台北",
      destination: "新竹",
      tra: { tZeQiang: 177, chuKuang: 137, local: 114 },
      thsr: { standard: 290, nonReserved: 280, business: 670 },
      metro: { adult: 25 } // 芝山至台北車站
    },
    花蓮: {
      origin: "台北",
      destination: "花蓮",
      tra: { tZeQiang: 440, chuKuang: 340, local: 283 } // 自強號/3000/太魯閣 440元
    },
    台中: {
      origin: "台北",
      destination: "台中",
      tra: { tZeQiang: 375, chuKuang: 289, local: 241 },
      thsr: { standard: 700, nonReserved: 675, business: 1250 }
    },
    台南: {
      origin: "台北",
      destination: "台南",
      tra: { tZeQiang: 738, chuKuang: 569, local: 474 },
      thsr: { standard: 1350, nonReserved: 1305, business: 2230 }
    },
    左營: {
      origin: "台北",
      destination: "左營 (高雄)",
      tra: { tZeQiang: 843, chuKuang: 650, local: 542 },
      thsr: { standard: 1490, nonReserved: 1445, business: 2440 }
    },
    高雄: {
      origin: "台北",
      destination: "高雄",
      tra: { tZeQiang: 843, chuKuang: 650, local: 542 },
      thsr: { standard: 1490, nonReserved: 1445, business: 2440 }
    },
    宜蘭: {
      origin: "台北",
      destination: "宜蘭",
      tra: { tZeQiang: 218, chuKuang: 168, local: 140 }
    },
    台東: {
      origin: "台北",
      destination: "台東",
      tra: { tZeQiang: 783, chuKuang: 604, local: 504 }
    },
    桃園: {
      origin: "台北",
      destination: "桃園",
      tra: { tZeQiang: 66, chuKuang: 51, local: 42 },
      thsr: { standard: 160, nonReserved: 155, business: 440 }
    },
    板橋: {
      origin: "台北",
      destination: "板橋",
      tra: { tZeQiang: 23, chuKuang: 18, local: 15 },
      thsr: { standard: 40, nonReserved: 35, business: 260 }
    }
  }
};

/**
 * Standardize station / city names for lookup.
 */
function normalizeStationName(name: string): string {
  const clean = name.replace(/[市縣站區]/g, "").trim();
  if (clean.includes("台北") || clean.includes("臺北") || clean.includes("天母") || clean.includes("士林")) return "台北";
  if (clean.includes("新竹") || clean.includes("竹北") || clean.includes("竹科")) return "新竹";
  if (clean.includes("花蓮")) return "花蓮";
  if (clean.includes("台中") || clean.includes("臺中")) return "台中";
  if (clean.includes("台南") || clean.includes("臺南")) return "台南";
  if (clean.includes("高雄") || clean.includes("左營")) return "左營";
  if (clean.includes("宜蘭") || clean.includes("羅東") || clean.includes("礁溪")) return "宜蘭";
  if (clean.includes("台東") || clean.includes("臺東")) return "台東";
  if (clean.includes("桃園")) return "桃園";
  return clean;
}

/**
 * Extract origin and destination from user travel prompt.
 */
export function extractRouteOD(prompt: string, defaultOrigin: string = "台北"): { origin: string; destination?: string } {
  const normOrigin = normalizeStationName(defaultOrigin);
  let destination: string | undefined = undefined;

  const destinations = ["花蓮", "新竹", "台中", "台南", "高雄", "左營", "宜蘭", "台東", "桃園", "板橋"];
  for (const dest of destinations) {
    if (prompt.includes(dest)) {
      destination = dest;
      break;
    }
  }

  return {
    origin: normOrigin,
    destination
  };
}

/**
 * Lookup authoritative rail and transit fares.
 */
export function lookupOfficialRailFare(origin: string = "台北", destination?: string): RailFareInfo | null {
  if (!destination) return null;

  const normO = normalizeStationName(origin);
  const normD = normalizeStationName(destination);

  const table = OFFICIAL_RAIL_FARES[normO];
  if (table && table[normD]) {
    return table[normD];
  }

  // Symmetric check
  const revTable = OFFICIAL_RAIL_FARES[normD];
  if (revTable && revTable[normO]) {
    return revTable[normO];
  }

  return null;
}

/**
 * Format official rail fare context for injection into Gemini prompt.
 */
export function formatOfficialFareContext(fare: RailFareInfo): string {
  let text = `【官方交通部 (MOTC / TDX) 官方核定正確票價】：\n`;
  text += `• 路線區間：${fare.origin} ⟷ ${fare.destination}\n`;

  if (fare.tra) {
    text += `• 台鐵票價：自強號/新自強號(EMU3000)/普悠瑪/太魯閣 全票 NT$ ${fare.tra.tZeQiang} 元；莒光號 NT$ ${fare.tra.chuKuang} 元；區間車 NT$ ${fare.tra.local} 元。\n`;
  }

  if (fare.thsr) {
    text += `• 台灣高鐵票價：標準車廂對號座 NT$ ${fare.thsr.standard} 元；自由座 NT$ ${fare.thsr.nonReserved} 元；商務車廂 NT$ ${fare.thsr.business} 元。\n`;
  }

  if (fare.metro) {
    text += `• 台北捷運（天母芝山/石牌 ➔ 台北車站）：全票單程 NT$ ${fare.metro.adult} 元。\n`;
  }

  text += `（請務必嚴格使用上述官方正確票價，嚴禁使用舊資料或幻覺估算錯誤票價！）\n`;

  return text;
}
