import type {
  UnifiedCarPark,
  CityParkingStats,
  NationwideParkingStats,
} from "../types.js";
import { TAIWAN_CITIES, CITY_NAME_MAP } from "../data/cities.js";
import type { TDXParkingClient } from "./tdx.js";

// 快取統計資料，預設 60 秒過期
interface StatsCacheItem<T> {
  data: T;
  expireAt: number;
}

let nationwideCache: StatsCacheItem<NationwideParkingStats> | null = null;
const cityStatsCache = new Map<string, StatsCacheItem<CityParkingStats>>();

/**
 * 計算單一縣市停車場綜合統計
 */
export function calculateCityStats(
  lots: UnifiedCarPark[],
  city: string,
  cityNameZh: string
): CityParkingStats {
  const totalLots = lots.length;
  let lotsWithLiveOccupancy = 0;
  let totalSpaces = 0;
  let availableSpaces = 0;

  let generalTotal = 0;
  let generalAvailable = 0;
  let motoTotal = 0;
  let motoAvailable = 0;
  let evDedicated = 0;
  let evShared = 0;
  let evTotal = 0;
  let disabilityTotal = 0;
  let disabilityAvailable = 0;
  let parentChildTotal = 0;
  let parentChildAvailable = 0;

  let evLotCount = 0;
  let flatCount = 0;
  let multiStoreyCount = 0;
  let undergroundCount = 0;
  let mechanicalCount = 0;

  let indoorCount = 0;
  let wheelchairCount = 0;
  let ticketMachineCount = 0;
  let gatedCount = 0;
  let overnightCount = 0;

  for (const lot of lots) {
    if (lot.status !== "unknown") {
      lotsWithLiveOccupancy++;
    }
    if (lot.totalSpaces !== null) totalSpaces += lot.totalSpaces;
    if (lot.availableSpaces !== null) availableSpaces += lot.availableSpaces;

    const sp = lot.spacesByType || {};
    if (sp.general?.total !== null && sp.general?.total !== undefined) {
      generalTotal += sp.general.total;
    } else if (lot.totalSpaces !== null) {
      generalTotal += lot.totalSpaces;
    }

    if (sp.general?.available !== null && sp.general?.available !== undefined) {
      generalAvailable += sp.general.available;
    } else if (lot.availableSpaces !== null) {
      generalAvailable += lot.availableSpaces;
    }

    if (sp.motorcycle?.total) {
      motoTotal += sp.motorcycle.total;
      motoAvailable += sp.motorcycle.available || 0;
    }

    if (lot.evSpaces) {
      if (lot.evSpaces.dedicated) evDedicated += lot.evSpaces.dedicated;
      if (lot.evSpaces.shared) evShared += lot.evSpaces.shared;
      if (lot.evSpaces.total) {
        evTotal += lot.evSpaces.total;
      } else if (lot.evSpaces.dedicated || lot.evSpaces.shared) {
        evTotal += (lot.evSpaces.dedicated || 0) + (lot.evSpaces.shared || 0);
      }
    }
    if (lot.hasEVCharging) {
      evLotCount++;
    }

    if (sp.disability?.total) {
      disabilityTotal += sp.disability.total;
      disabilityAvailable += sp.disability.available || 0;
    }

    if (sp.parentChild?.total) {
      parentChildTotal += sp.parentChild.total;
      parentChildAvailable += sp.parentChild.available || 0;
    }

    // 場站型態 (CarParkType 1~4)
    if (lot.carParkType === 1) flatCount++;
    else if (lot.carParkType === 2) multiStoreyCount++;
    else if (lot.carParkType === 3) undergroundCount++;
    else if (lot.carParkType === 4) mechanicalCount++;
    else flatCount++;

    if (lot.isIndoor) indoorCount++;
    if (lot.hasDisabilitySpace) wheelchairCount++;
    if (lot.facilities?.some((f) => f.includes("繳費機"))) ticketMachineCount++;
    if (lot.facilities?.some((f) => f.includes("柵欄"))) gatedCount++;
    if (lot.hasOvernight) overnightCount++;
  }

  const occupancyRate =
    totalSpaces > 0 ? Math.round(((totalSpaces - availableSpaces) / totalSpaces) * 100) : 0;
  const evCoverageRate = totalLots > 0 ? Math.round((evLotCount / totalLots) * 100) : 0;

  // 排序前 5 大即時空位最多的場站
  const topAvailableLots = [...lots]
    .filter((l) => l.availableSpaces !== null && l.availableSpaces > 0)
    .sort((a, b) => (b.availableSpaces ?? 0) - (a.availableSpaces ?? 0))
    .slice(0, 5)
    .map((l) => ({
      id: l.id,
      name: l.name,
      availableSpaces: l.availableSpaces ?? 0,
      totalSpaces: l.totalSpaces ?? 0,
      evDedicated: l.evSpaces?.dedicated || 0,
      evShared: l.evSpaces?.shared || 0,
    }));

  // 排序前 5 大滿載場站 (需有總車位且滿位率高)
  const topOccupiedLots = [...lots]
    .filter((l) => l.totalSpaces !== null && l.totalSpaces > 20 && l.occupancyRate !== null)
    .sort((a, b) => (b.occupancyRate ?? 0) - (a.occupancyRate ?? 0))
    .slice(0, 5)
    .map((l) => ({
      id: l.id,
      name: l.name,
      availableSpaces: l.availableSpaces ?? 0,
      totalSpaces: l.totalSpaces ?? 0,
      occupancyRate: l.occupancyRate ?? 0,
    }));

  return {
    city,
    cityNameZh,
    totalLots,
    lotsWithLiveOccupancy,
    totalSpaces,
    availableSpaces,
    occupancyRate: Math.max(0, Math.min(100, occupancyRate)),
    spacesByType: {
      general: { total: generalTotal, available: generalAvailable },
      motorcycle: { total: motoTotal, available: motoAvailable },
      ev: { total: evTotal, dedicated: evDedicated, shared: evShared },
      disability: { total: disabilityTotal, available: disabilityAvailable },
      parentChild: { total: parentChildTotal, available: parentChildAvailable },
    },
    evLotCount,
    evCoverageRate,
    carParkTypeDistribution: {
      flatCount,
      multiStoreyCount,
      undergroundCount,
      mechanicalCount,
    },
    facilitiesDistribution: {
      indoorCount,
      evCount: evLotCount,
      wheelchairCount,
      ticketMachineCount,
      gatedCount,
      overnightCount,
    },
    topAvailableLots,
    topOccupiedLots,
  };
}

/**
 * 取得指定縣市統計（具備 60 秒記憶體快取）
 */
export async function getCityStats(
  client: TDXParkingClient,
  city: string
): Promise<CityParkingStats> {
  const now = Date.now();
  const cached = cityStatsCache.get(city);
  if (cached && cached.expireAt > now) {
    return cached.data;
  }

  const lots = await client.getCityParking(city);
  const cityNameZh = CITY_NAME_MAP[city] || city;
  const stats = calculateCityStats(lots, city, cityNameZh);

  cityStatsCache.set(city, {
    data: stats,
    expireAt: now + 60000,
  });

  return stats;
}

/**
 * 取得全台灣各縣市綜合與橫向比較統計（具備 60 秒記憶體快取）
 */
export async function getNationwideStats(
  client: TDXParkingClient
): Promise<NationwideParkingStats> {
  const now = Date.now();
  if (nationwideCache && nationwideCache.expireAt > now) {
    return nationwideCache.data;
  }

  // 並行抓取各縣市停車場資訊 (有快取所以極快)
  const cityPromises = TAIWAN_CITIES.map(async (meta) => {
    try {
      const lots = await client.getCityParking(meta.code);
      return calculateCityStats(lots, meta.code, meta.nameZh);
    } catch (err) {
      console.warn(`[getNationwideStats] Failed for ${meta.code}:`, err);
      return calculateCityStats([], meta.code, meta.nameZh);
    }
  });

  const citySummaries = await Promise.all(cityPromises);

  let totalLots = 0;
  let totalSpaces = 0;
  let availableSpaces = 0;
  let totalEVSpaces = 0;
  let totalEVDedicated = 0;
  let totalEVShared = 0;
  let totalDisabilitySpaces = 0;
  let totalParentChildSpaces = 0;
  let totalMotorcycleSpaces = 0;
  let evLotsNationwide = 0;

  let flatCount = 0;
  let multiStoreyCount = 0;
  let undergroundCount = 0;
  let mechanicalCount = 0;

  let indoorCount = 0;
  let evCount = 0;
  let wheelchairCount = 0;
  let ticketMachineCount = 0;
  let gatedCount = 0;
  let overnightCount = 0;

  for (const cs of citySummaries) {
    totalLots += cs.totalLots;
    totalSpaces += cs.totalSpaces;
    availableSpaces += cs.availableSpaces;
    totalEVSpaces += cs.spacesByType.ev.total;
    totalEVDedicated += cs.spacesByType.ev.dedicated;
    totalEVShared += cs.spacesByType.ev.shared;
    totalDisabilitySpaces += cs.spacesByType.disability.total;
    totalParentChildSpaces += cs.spacesByType.parentChild.total;
    totalMotorcycleSpaces += cs.spacesByType.motorcycle.total;
    evLotsNationwide += cs.evLotCount;

    flatCount += cs.carParkTypeDistribution.flatCount;
    multiStoreyCount += cs.carParkTypeDistribution.multiStoreyCount;
    undergroundCount += cs.carParkTypeDistribution.undergroundCount;
    mechanicalCount += cs.carParkTypeDistribution.mechanicalCount;

    indoorCount += cs.facilitiesDistribution.indoorCount;
    evCount += cs.facilitiesDistribution.evCount;
    wheelchairCount += cs.facilitiesDistribution.wheelchairCount;
    ticketMachineCount += cs.facilitiesDistribution.ticketMachineCount;
    gatedCount += cs.facilitiesDistribution.gatedCount;
    overnightCount += cs.facilitiesDistribution.overnightCount;
  }

  const overallOccupancyRate =
    totalSpaces > 0 ? Math.round(((totalSpaces - availableSpaces) / totalSpaces) * 100) : 0;
  const evCoverageRate =
    totalLots > 0 ? Math.round((evLotsNationwide / totalLots) * 100) : 0;

  const result: NationwideParkingStats = {
    overview: {
      totalCities: citySummaries.length,
      totalLots,
      totalSpaces,
      availableSpaces,
      overallOccupancyRate: Math.max(0, Math.min(100, overallOccupancyRate)),
      totalEVSpaces,
      totalEVDedicated,
      totalEVShared,
      totalDisabilitySpaces,
      totalParentChildSpaces,
      totalMotorcycleSpaces,
      evCoverageRate,
      carParkTypeSummary: {
        flatCount,
        multiStoreyCount,
        undergroundCount,
        mechanicalCount,
      },
      facilitiesSummary: {
        indoorCount,
        evCount,
        wheelchairCount,
        ticketMachineCount,
        gatedCount,
        overnightCount,
      },
    },
    citySummaries: citySummaries.sort((a, b) => b.totalSpaces - a.totalSpaces),
  };

  nationwideCache = {
    data: result,
    expireAt: now + 60000,
  };

  return result;
}
