import type {
  ParkingRadarEnv,
  UnifiedCarPark,
  ParkingFilterOptions,
  SpaceOccupancyStatus,
} from "../types.js";
import { CITY_NAME_MAP } from "../data/cities.js";

interface TokenCache {
  token: string;
  expiresAt: number;
}

interface CacheItem<T> {
  data: T;
  expireAt: number;
}

export class TDXParkingClient {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;
  private tokenCache: TokenCache | null = null;
  private memoryCache: Map<string, CacheItem<any>> = new Map();

  constructor(env: ParkingRadarEnv) {
    this.clientId = env.TDX_CLIENT_ID || "";
    this.clientSecret = env.TDX_CLIENT_SECRET || "";
    this.baseUrl = (env.TDX_BASE_URL || "https://tdx.transportdata.tw/api/basic").replace(/\/$/, "");
  }

  /**
   * 取得 TDX OAuth 2.0 存取憑證
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60000) {
      return this.tokenCache.token;
    }

    if (!this.clientId || !this.clientSecret) {
      return "";
    }

    const tokenUrl = "https://tdx.transportdata.tw/auth/realms/TDXConnect/protocol/openid-connect/token";
    const body = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: this.clientId,
      client_secret: this.clientSecret,
    });

    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });

    if (!res.ok) {
      console.warn(`[TDXParkingClient] Auth failed: ${res.status}`);
      return "";
    }

    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.tokenCache = {
      token: json.access_token,
      expiresAt: now + json.expires_in * 1000,
    };

    return this.tokenCache.token;
  }

  /**
   * 呼叫 TDX API (具備快取與自動授權)
   */
  private async fetchTDX<T>(endpoint: string, queryParams: Record<string, string | number> = {}, cacheTtlSeconds = 60): Promise<T | null> {
    const cacheKey = `${endpoint}?${new URLSearchParams(queryParams as any).toString()}`;
    const cached = this.memoryCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expireAt > now) {
      return cached.data as T;
    }

    try {
      const token = await this.getAccessToken();
      const url = new URL(`${this.baseUrl}${endpoint}`);
      url.searchParams.set("$format", "JSON");
      for (const [k, v] of Object.entries(queryParams)) {
        url.searchParams.set(k, String(v));
      }

      const headers: Record<string, string> = { Accept: "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(url.toString(), { headers });
      if (!res.ok) {
        console.warn(`[TDXParkingClient] Endpoint ${endpoint} returned ${res.status}`);
        return null;
      }

      const data = (await res.json()) as T;
      this.memoryCache.set(cacheKey, { data, expireAt: now + cacheTtlSeconds * 1000 });
      return data;
    } catch (err) {
      console.error(`[TDXParkingClient] Fetch error for ${endpoint}:`, err);
      return null;
    }
  }

  /**
   * 取得指定縣市的聚合停車場資料 (基本靜態 + 即時剩餘位)
   */
  async getCityParking(city: string, options?: ParkingFilterOptions): Promise<UnifiedCarPark[]> {
    const normalizedCity = city || "Taipei";
    
    // 1. 取得靜態資料 (快取 1 小時)
    const staticRes = await this.fetchTDX<{ CarParks?: any[] }>(
      `/v1/Parking/OffStreet/CarPark/City/${normalizedCity}`,
      { $top: 250 },
      3600
    );

    // 2. 取得即時剩餘車位 (快取 60 秒)
    const availRes = await this.fetchTDX<{ ParkingAvailabilities?: any[] }>(
      `/v1/Parking/OffStreet/ParkingAvailability/City/${normalizedCity}`,
      { $top: 250 },
      60
    );

    let rawCarParks = staticRes?.CarParks || [];
    const availMap = new Map<string, any>();
    if (availRes?.ParkingAvailabilities) {
      for (const item of availRes.ParkingAvailabilities) {
        if (item.CarParkID) availMap.set(item.CarParkID, item);
      }
    }

    let results: UnifiedCarPark[] = [];

    if (rawCarParks.length > 0) {
      for (const cp of rawCarParks) {
        const id = cp.CarParkID;
        const avail = availMap.get(id);
        const unified = this.mapToUnifiedCarPark(cp, avail, normalizedCity, options);
        if (unified) results.push(unified);
      }
    }

    // 套用過濾器
    if (options) {
      results = applyFilters(results, options);
    }

    // 依距離或空位排序
    if (options?.lat && options?.lon) {
      results.sort((a, b) => (a.distanceMeters || 999999) - (b.distanceMeters || 999999));
    } else {
      results.sort((a, b) => (b.availableSpaces ?? -1) - (a.availableSpaces ?? -1));
    }

    return results;
  }

  /**
   * 依據交通部 TDX 規格書將原始 CarPark 與 ParkingAvailability 映射為 UnifiedCarPark
   */
  mapToUnifiedCarPark(
    cp: any,
    avail: any,
    normalizedCity: string,
    options?: ParkingFilterOptions
  ): UnifiedCarPark | null {
    const lat = cp.CarParkPosition?.PositionLat || 0;
    const lon = cp.CarParkPosition?.PositionLon || 0;
    if (!lat || !lon) return null;

    const id = cp.CarParkID;

    // 計算距離
    let distanceMeters: number | undefined = undefined;
    if (options?.lat && options?.lon) {
      distanceMeters = calculateDistanceMeters(options.lat, options.lon, lat, lon);
    }

    // 官方規格欄位：場站硬體類型 (規格書 Page 30: 1: 平面型, 2: 立體型, 3: 地下型, 4: 機械塔/複合型)
    const carParkType = cp.CarParkType || 1;
    let carParkTypeName = "平面型 (露天/戶外)";
    if (carParkType === 2) carParkTypeName = "立體型 (地上建築)";
    else if (carParkType === 3) carParkTypeName = "地下型停車場";
    else if (carParkType === 4) carParkTypeName = "機械塔/複合型";

    const isIndoor = carParkType === 2 || carParkType === 3 || carParkType === 4;

    // 車位容量與即時空位：僅採用官方結構化欄位 (規格書 Page 77 & 86)
    let total: number | null = null;
    if (avail?.TotalSpaces !== undefined && avail.TotalSpaces > 0) {
      total = avail.TotalSpaces;
    } else if (cp.TotalSpaces !== undefined && cp.TotalSpaces > 0) {
      total = cp.TotalSpaces;
    }

    let available: number | null = null;
    if (avail?.AvailableSpaces !== undefined && avail.AvailableSpaces >= 0) {
      available = avail.AvailableSpaces;
    }

    // 整理專用車種席位 (依據交通部《停車資料標準v1.1》規格書明訂 SpaceType 代碼，嚴格不進行文字爬蟲推測)
    let generalAvailable: number | null = available;
    let generalTotal: number | null = total;
    let motoAvailable: number | null = null;
    let motoTotal: number | null = null;
    let disAvailable: number | null = null;
    let disTotal: number | null = null;
    let pcAvailable: number | null = null;
    let pcTotal: number | null = null;
    let evDedicatedTotal: number | null = null;
    let evSharedTotal: number | null = null;
    let evDedicatedAvail: number | null = null;
    let evSharedAvail: number | null = null;
    let hasEVInAvailabilities = false;

    // 依據 TDX 規格書標準 Availabilities 陣列解析各車種與專用席位 (Page 96)
    if (avail?.Availabilities && Array.isArray(avail.Availabilities)) {
      for (const a of avail.Availabilities) {
        const num = a.NumberOfSpaces !== undefined && a.NumberOfSpaces >= 0 ? a.NumberOfSpaces : null;
        const spAvail = a.AvailableSpaces !== undefined && a.AvailableSpaces >= 0 ? a.AvailableSpaces : null;

        if (a.SpaceType === 1) {
          // 1: Car 一般自小客車位
          if (num !== null) generalTotal = num;
          if (spAvail !== null) generalAvailable = spAvail;
        } else if (a.SpaceType === 2) {
          // 2: Scooter/Motorcycle 機車位
          if (num !== null) motoTotal = (motoTotal || 0) + num;
          if (spAvail !== null) motoAvailable = (motoAvailable || 0) + spAvail;
        } else if (a.SpaceType === 7) {
          // 7: PregnantAndChild 孕婦及親子專用車位 (規格書 Page 96)
          if (num !== null) pcTotal = (pcTotal || 0) + num;
          if (spAvail !== null) pcAvailable = (pcAvailable || 0) + spAvail;
        } else if (a.SpaceType === 9) {
          // 9: DisabledParkingForCar 身心障礙汽車車位 (規格書 Page 96)
          if (num !== null) disTotal = (disTotal || 0) + num;
          if (spAvail !== null) disAvailable = (disAvailable || 0) + spAvail;
        } else if (a.SpaceType === 11) {
          // 11: EVRechargeForCar 電動汽車專用/優先車位 (規格書 Page 96)
          // ChargingSpaceType: 1: 專用車位 (Dedicated), 2: 優先車位 (Priority/Shared)
          hasEVInAvailabilities = true;
          if (a.ChargingSpaceType === 1) {
            if (num !== null) evDedicatedTotal = (evDedicatedTotal || 0) + num;
            if (spAvail !== null) evDedicatedAvail = (evDedicatedAvail || 0) + spAvail;
          } else {
            if (num !== null) evSharedTotal = (evSharedTotal || 0) + num;
            if (spAvail !== null) evSharedAvail = (evSharedAvail || 0) + spAvail;
          }
        }
      }
    }

    // 依據規格加減乘除推導佔用率 (OccupancyRate) 與狀態 (Status)
    let occupancyRate: number | null = null;
    let status: SpaceOccupancyStatus = "unknown";

    if (total !== null && available !== null && total > 0) {
      const occ = Math.max(0, total - available);
      occupancyRate = Math.min(100, Math.round((occ / total) * 100));

      if (available <= 0) {
        status = "full";
      } else if (available <= total * 0.15 || available <= 10) {
        status = "tight";
      } else {
        status = "available";
      }
    } else if (available !== null) {
      status = available > 0 ? "available" : "full";
    }

    // 電動車席位：若官方未提供細部 SpaceType: 11，但有 EVRechargingAvailable: 1 標記，格數嚴格標示為 null (不亂猜)
    const hasEVFlag = Boolean(cp.EVRechargingAvailable);
    const hasEVCharging = hasEVFlag || hasEVInAvailabilities;

    let evTotalCount: number | null = null;
    if (hasEVInAvailabilities) {
      const d = evDedicatedTotal || 0;
      const s = evSharedTotal || 0;
      evTotalCount = d + s;
    }

    const evSpaces = {
      total: evTotalCount,
      dedicated: evDedicatedTotal,
      shared: evSharedTotal,
      available: (evDedicatedAvail !== null || evSharedAvail !== null) ? ((evDedicatedAvail || 0) + (evSharedAvail || 0)) : null,
    };

    // 特殊席位依據官方標記
    const hasDisabilitySpace = (disTotal !== null && disTotal > 0) || Boolean(cp.WheelchairAccessible);
    const hasParentChildSpace = pcTotal !== null && pcTotal > 0;
    const isMotorcycleAvailable = (motoTotal !== null && motoTotal > 0) || Boolean(cp.IsMotorcycle);

    // 官方設施清單 (規格書明定欄位)
    const facilities: string[] = [];
    if (cp.WheelchairAccessible) facilities.push("無障礙設施");
    if (hasEVCharging) {
      if (evSpaces.dedicated !== null && evSpaces.shared !== null && evSpaces.total !== null) {
        facilities.push(`充電樁 (專屬${evSpaces.dedicated}格/混用${evSpaces.shared}格)`);
      } else if (evSpaces.dedicated !== null && evSpaces.dedicated > 0) {
        facilities.push(`純電專屬充電 (${evSpaces.dedicated}格)`);
      } else if (evSpaces.shared !== null && evSpaces.shared > 0) {
        facilities.push(`混用充電樁 (${evSpaces.shared}格)`);
      } else {
        facilities.push("電動車充電設施 (格數未連線)");
      }
    }
    if (cp.TicketMachine) facilities.push("自動繳費機");
    if (cp.Toilet) facilities.push("廁所");
    if (cp.Restaurant) facilities.push("餐廳");
    if (cp.Shop) facilities.push("超商/商店");
    if (cp.Gated) facilities.push("柵欄門禁");
    if (cp.SecurityGuard) facilities.push("保全人員");
    if (cp.OvernightPermitted) facilities.push("可過夜停放");
    if (cp.ReservationAvailable) facilities.push("預約車位");
    facilities.push(carParkTypeName);

    const fareDesc = cp.FareDescription || "依現場公告";

    return {
      id,
      name: cp.CarParkName?.Zh_tw || "停車場",
      city: normalizedCity,
      cityNameZh: CITY_NAME_MAP[normalizedCity] || normalizedCity,
      address: cp.Address || "",
      lat,
      lon,
      distanceMeters,
      totalSpaces: total,
      availableSpaces: available,
      occupancyRate,
      status,
      fareDescription: fareDesc,
      carParkType,
      carParkTypeName,
      isIndoor,
      hasEVCharging,
      evSpaces,
      hasDisabilitySpace,
      hasParentChildSpace,
      isMotorcycleAvailable,
      hasOvernight: Boolean(cp.OvernightPermitted),
      hasReservation: Boolean(cp.ReservationAvailable),
      spacesByType: {
        general: { total: generalTotal, available: generalAvailable },
        motorcycle: { total: motoTotal, available: motoAvailable },
        disability: { total: disTotal, available: disAvailable },
        parentChild: { total: pcTotal, available: pcAvailable },
      },
      facilities,
      serviceStatus: avail?.ServiceStatus ?? 1,
      lastUpdated: avail?.DataCollectTime || new Date().toISOString(),
    };
  }

  /**
   * 取得單一停車場即時資料 (直接向 TDX 依 CarParkID 精確過濾查詢，避開全縣市 $top 250 筆數截斷限制)
   */
  async getSingleLot(city: string, id: string): Promise<UnifiedCarPark | null> {
    const normalizedCity = city || "Taipei";
    
    // 直接向 TDX 以 CarParkID 精準過濾 (不設長快取，允許使用者手動即時刷新)
    const [cpData, avData] = await Promise.all([
      this.fetchTDX<{ CarParks?: any[] }>(
        `/v1/Parking/OffStreet/CarPark/City/${normalizedCity}`,
        { $filter: `CarParkID eq '${id}'` },
        10
      ),
      this.fetchTDX<{ ParkingAvailabilities?: any[] }>(
        `/v1/Parking/OffStreet/ParkingAvailability/City/${normalizedCity}`,
        { $filter: `CarParkID eq '${id}'` },
        5
      ),
    ]);

    const cp = cpData?.CarParks?.[0];
    if (!cp) return null;

    const avail = avData?.ParkingAvailabilities?.[0];
    return this.mapToUnifiedCarPark(cp, avail, normalizedCity);
  }
}

/**
 * 空間過濾器 (嚴格依據結構化欄位)
 */
function applyFilters(lots: UnifiedCarPark[], options: ParkingFilterOptions): UnifiedCarPark[] {
  return lots.filter((lot) => {
    // 關鍵字搜尋
    if (options.searchQuery && options.searchQuery.trim()) {
      const q = options.searchQuery.trim().toLowerCase();
      const match =
        lot.name.toLowerCase().includes(q) ||
        lot.address.toLowerCase().includes(q) ||
        lot.fareDescription.toLowerCase().includes(q);
      if (!match) return false;
    }

    // 只要有空位
    if (options.availableOnly && (lot.availableSpaces === null || lot.availableSpaces <= 0)) {
      return false;
    }

    // 電動車充電 (全部)
    if (options.evOnly && !lot.hasEVCharging) {
      return false;
    }

    // 電動車專屬車位 (只給純電動車)
    if (options.evDedicatedOnly && (lot.evSpaces?.dedicated === null || (lot.evSpaces?.dedicated ?? 0) <= 0)) {
      return false;
    }

    // 身障車位
    if (options.disabilityOnly && !lot.hasDisabilitySpace) {
      return false;
    }

    // 婦幼親子
    if (options.parentChildOnly && !lot.hasParentChildSpace) {
      return false;
    }

    // 室內地下
    if (options.indoorOnly && !lot.isIndoor) {
      return false;
    }

    // 距離過濾
    if (options.radiusMeters && lot.distanceMeters !== undefined) {
      if (lot.distanceMeters > options.radiusMeters) {
        return false;
      }
    }

    return true;
  });
}

/**
 * 經緯度兩點距離 (Haversine formula in meters)
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
