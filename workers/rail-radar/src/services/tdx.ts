import type {
  CombinedRailScheduleItem,
  RailRadarEnv,
  SeatAvailabilityCode,
  TDXAvailableSeatStatusResponse,
  RailRadarFilterOptions,
  RailRadarResult,
} from "../types.js";
import { resolveTHSRStation, resolveTRAStation } from "../data/stations.js";

interface TokenCache {
  token: string;
  expiresAt: number;
}

export class TDXRadarClient {
  private clientId: string;
  private clientSecret: string;
  private baseUrl: string;
  private tokenCache: TokenCache | null = null;
  // Local in-memory micro-cache for seat status & timetables (TTL: 60s)
  private memoryCache: Map<string, { data: any; expireAt: number }> = new Map();

  constructor(env: RailRadarEnv) {
    this.clientId = env.TDX_CLIENT_ID || "";
    this.clientSecret = env.TDX_CLIENT_SECRET || "";
    this.baseUrl = (env.TDX_BASE_URL || "https://tdx.transportdata.tw/api/basic").replace(/\/$/, "");
  }

  /**
   * 取得 TDX OAuth 2.0 存取憑證 (自帶過期快取)
   */
  async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.expiresAt > now + 60000) {
      return this.tokenCache.token;
    }

    if (!this.clientId || !this.clientSecret) {
      console.warn("[TDXRadar] Warning: TDX credentials not configured, proceeding without auth (may fail).");
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
      throw new Error(`TDX Token Auth Failed: ${res.status} ${await res.text()}`);
    }

    const json = (await res.json()) as { access_token: string; expires_in: number };
    this.tokenCache = {
      token: json.access_token,
      expiresAt: now + (json.expires_in || 86400) * 1000,
    };
    return this.tokenCache.token;
  }

  /**
   * 底層 TDX API 請求與記憶體快取封裝
   */
  async fetchTDX<T>(path: string, ttlSeconds = 60): Promise<T | null> {
    const cacheKey = `tdx:${path}`;
    const cached = this.memoryCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expireAt > now) {
      return cached.data as T;
    }

    try {
      const token = await this.getAccessToken();
      const headers: Record<string, string> = {
        Accept: "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const url = `${this.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
      const res = await fetch(url, { headers });

      if (!res.ok) {
        console.warn(`[TDXRadar] Request failed: ${url} status=${res.status}`);
        return null;
      }

      const data = (await res.json()) as T;
      this.memoryCache.set(cacheKey, { data, expireAt: now + ttlSeconds * 1000 });
      return data;
    } catch (err) {
      console.error(`[TDXRadar] Error calling ${path}:`, err);
      return null;
    }
  }

  /**
   * 取得高鐵即時對號座剩餘位 (O/L/X)
   */
  async getTHSRAvailableSeats(
    originId: string,
    destId: string,
    date: string
  ): Promise<Record<string, { standard: SeatAvailabilityCode; business: SeatAvailabilityCode }>> {
    const seatMap: Record<string, { standard: SeatAvailabilityCode; business: SeatAvailabilityCode }> = {};
    const path = `/v2/Rail/THSR/AvailableSeatStatus/Train/OD/${originId}/to/${destId}/TrainDate/${date}`;
    const raw = await this.fetchTDX<TDXAvailableSeatStatusResponse>(path, 60);

    if (raw && Array.isArray(raw.AvailableSeats)) {
      for (const item of raw.AvailableSeats) {
        seatMap[item.TrainNo] = {
          standard: item.StandardSeatStatus || "X",
          business: item.BusinessSeatStatus || "X",
        };
      }
    }
    return seatMap;
  }

  /**
   * 取得高鐵當日時刻表
   */
  async getTHSRTimetable(originId: string, destId: string, date: string): Promise<any[]> {
    const path = `/v2/Rail/THSR/DailyTimetable/OD/${originId}/to/${destId}/${date}`;
    const raw = await this.fetchTDX<any[]>(path, 300);
    return Array.isArray(raw) ? raw : [];
  }

  /**
   * 取得台鐵當日時刻表 (v3)
   */
  async getTRATimetable(originId: string, destId: string, date: string): Promise<any[]> {
    const path = `/v3/Rail/TRA/DailyTrainTimetable/OD/${originId}/to/${destId}/${date}`;
    const raw = await this.fetchTDX<{ TrainTimetables?: any[] }>(path, 300);
    return raw && Array.isArray(raw.TrainTimetables) ? raw.TrainTimetables : [];
  }

  /**
   * 將 O/L/X 轉為直覺數值化區間 (>50 / <10 / 0)
   */
  private toNumericSeat(code: SeatAvailabilityCode): string {
    if (code === "O") return ">50";
    if (code === "L") return "<10";
    if (code === "X") return "0";
    return "-";
  }

  /**
   * 綜合查詢：雙鐵班次與剩餘位整合雷達 (支援出發/抵達時間區間篩選與雙鐵分欄)
   */
  async getCombinedRailRadar(
    originName: string,
    destName: string,
    travelDate?: string,
    filters?: RailRadarFilterOptions
  ): Promise<RailRadarResult> {
    const date = travelDate || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei" }).format(new Date());

    const thsrOrigin = resolveTHSRStation(originName);
    const thsrDest = resolveTHSRStation(destName);
    const traOrigin = resolveTRAStation(originName);
    const traDest = resolveTRAStation(destName);

    const schedules: CombinedRailScheduleItem[] = [];

    // 1. 若兩站皆支援高鐵，抓取高鐵時刻表與即時剩餘位
    if (thsrOrigin && thsrDest && thsrOrigin.id !== thsrDest.id) {
      try {
        const [seatMap, timetables] = await Promise.all([
          this.getTHSRAvailableSeats(thsrOrigin.id, thsrDest.id, date),
          this.getTHSRTimetable(thsrOrigin.id, thsrDest.id, date),
        ]);

        for (const item of timetables) {
          const trainNo = item.DailyTrainInfo?.TrainNo;
          const dep = item.OriginStopTime?.DepartureTime;
          const arr = item.DestinationStopTime?.ArrivalTime;
          if (!trainNo || !dep || !arr) continue;

          const [depH, depM] = dep.split(":").map(Number);
          const [arrH, arrM] = arr.split(":").map(Number);
          let duration = arrH * 60 + arrM - (depH * 60 + depM);
          if (duration < 0) duration += 24 * 60;

          const seat = seatMap[trainNo] || { standard: "-", business: "-" };

          schedules.push({
            system: "THSR",
            trainNo,
            trainTypeName: "台灣高鐵",
            originStationName: item.OriginStopTime?.StationName?.Zh_tw || thsrOrigin.nameZh,
            destinationStationName: item.DestinationStopTime?.StationName?.Zh_tw || thsrDest.nameZh,
            departureTime: dep,
            arrivalTime: arr,
            durationMinutes: duration,
            seats: {
              standard: seat.standard,
              business: seat.business,
              standardNumeric: this.toNumericSeat(seat.standard),
              businessNumeric: this.toNumericSeat(seat.business),
              note: "10-12 車為自由座車廂",
            },
            bookingUrl: `https://irs.thsrc.com.tw/IMINT/?locale=tw&station_from=${thsrOrigin.id}&station_to=${thsrDest.id}`,
          });
        }
      } catch (err) {
        console.warn("[TDXRadar] Error processing THSR:", err);
      }
    }

    // 2. 若兩站皆支援台鐵，抓取台鐵時刻表
    if (traOrigin && traDest && traOrigin.id !== traDest.id) {
      try {
        const traTimetables = await this.getTRATimetable(traOrigin.id, traDest.id, date);

        for (const item of traTimetables) {
          const trainInfo = item.TrainInfo;
          const stopTimes = item.StopTimes;
          if (!trainInfo || !stopTimes || stopTimes.length < 2) continue;

          const originStop = stopTimes[0];
          const destStop = stopTimes[stopTimes.length - 1];
          const dep = originStop.DepartureTime;
          const arr = destStop.ArrivalTime;
          if (!dep || !arr) continue;

          const [depH, depM] = dep.split(":").map(Number);
          const [arrH, arrM] = arr.split(":").map(Number);
          let duration = arrH * 60 + arrM - (depH * 60 + depM);
          if (duration < 0) duration += 24 * 60;

          const typeName = trainInfo.TrainTypeName?.Zh_tw || "台鐵列車";

          schedules.push({
            system: "TRA",
            trainNo: trainInfo.TrainNo,
            trainTypeName: typeName,
            originStationName: originStop.StationName?.Zh_tw || traOrigin.nameZh,
            destinationStationName: destStop.StationName?.Zh_tw || traDest.nameZh,
            departureTime: dep,
            arrivalTime: arr,
            durationMinutes: duration,
            seats: {
              standard: "-",
              business: "-",
              standardNumeric: "-",
              businessNumeric: "-",
              note: "依台鐵 e 訂通/官方系統即時售票為準 (直連官方訂票)",
            },
            bookingUrl: `https://www.railway.gov.tw/tra-tip-web/tip/tip001/tip121/query`,
          });
        }
      } catch (err) {
        console.warn("[TDXRadar] Error processing TRA:", err);
      }
    }

    // 3. 依發車時間排序 (由早到晚)
    schedules.sort((a, b) => a.departureTime.localeCompare(b.departureTime));

    // 4. 套用出發時間與到站時間篩選
    let filtered = schedules;
    if (filters) {
      if (filters.depAfter) {
        filtered = filtered.filter((s) => s.departureTime >= filters.depAfter!);
      }
      if (filters.depBefore) {
        filtered = filtered.filter((s) => s.departureTime <= filters.depBefore!);
      }
      if (filters.arrAfter) {
        filtered = filtered.filter((s) => s.arrivalTime >= filters.arrAfter!);
      }
      if (filters.arrBefore) {
        filtered = filtered.filter((s) => s.arrivalTime <= filters.arrBefore!);
      }
    }

    const thsrList = filtered.filter((s) => s.system === "THSR");
    const traList = filtered.filter((s) => s.system === "TRA");

    return {
      origin: {
        query: originName,
        thsr: thsrOrigin?.nameZh,
        tra: traOrigin?.nameZh,
      },
      destination: {
        query: destName,
        thsr: thsrDest?.nameZh,
        tra: traDest?.nameZh,
      },
      date,
      updatedAt: new Date().toISOString(),
      total: filtered.length,
      filters,
      schedules: filtered,
      thsr: thsrList,
      tra: traList,
    };
  }
}

