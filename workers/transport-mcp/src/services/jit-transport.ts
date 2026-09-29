import { JITEngine, MDLoader, type RouteDefinition } from "jit-api";
import { INLINE_TRANSPORT_SPECS } from "../specs.inline.js";
import { TDXClient } from "./tdx/client.js";
import { evaluateTransportContext } from "./context/evaluator.js";
import { planContextualRoute } from "./context/router.js";
import { createCacheService, type CacheService } from "./cache.js";
import { safeJsonParse } from "../utils/json.js";
import type { AppEnv } from "../types/env.js";
import type { TransportIdentity, TransportState } from "../types/context.js";

export interface TransportJITServices {
  engine: JITEngine;
  mdLoader: MDLoader;
  tdxClient: TDXClient;
  cacheService: CacheService;
}

export function createTransportJITEngine(options?: {
  cacheService?: CacheService;
  env?: AppEnv;
  specsDir?: string;
}): TransportJITServices {
  const specsDir = options?.specsDir;
  const mdLoader = new MDLoader(specsDir, undefined, INLINE_TRANSPORT_SPECS);
  const cacheService = options?.cacheService ?? createCacheService(options?.env);
  const tdxClient = new TDXClient(
    {
      clientId: options?.env?.TDX_CLIENT_ID,
      clientSecret: options?.env?.TDX_CLIENT_SECRET,
      apiBaseUrl: options?.env?.TDX_BASE_URL,
    },
    cacheService
  );
  const engine = new JITEngine({
    stabilityThreshold: 3, // 3 consecutive matches to freeze
    confidenceThreshold: 0.8,
    driftMode: "evolve",
  });

  // Load markdown specs (schema definitions)
  mdLoader.loadAll(engine);

  // ── Register actual domain handlers to match specs ────────────────────────

  // 1. get_transport_context
  engine.register({
    route: "get_transport_context",
    description: "依使用者身分、狀態與GPS座標，自動評估整體交通情境並產出行動建議與風險警示",
    intentCriteria: "Transport context evaluation with nearby parking, YouBike, weather and traffic alerts",
    handler: async (payload: any) => {
      const identity: TransportIdentity = payload.identity || "car";
      const state: TransportState = payload.state || "cruising";
      const lat = Number(payload.latitude ?? payload.lat ?? 25.033964);
      const lon = Number(payload.longitude ?? payload.lon ?? payload.lng ?? 121.564468);
      const radius = Number(payload.radius_meters ?? payload.radius ?? 800);
      const locationName = payload.location_name || payload.name;

      // Generate rounded geohash-like key to cache identical context queries for 30s
      const roundedLat = lat.toFixed(3); // ~110m precision
      const roundedLon = lon.toFixed(3);
      const cacheKey = `jit:context:${identity}:${state}:${roundedLat}:${roundedLon}:${radius}`;
      const cached = await cacheService.get(cacheKey);
      const parsed = safeJsonParse(cached);
      if (parsed) return parsed;

      const result = await evaluateTransportContext(
        tdxClient,
        identity,
        state,
        { latitude: lat, longitude: lon, name: locationName },
        { radiusMeters: radius }
      );

      await cacheService.set(cacheKey, JSON.stringify(result), 30);
      return result;
    },
  });

  // 2. plan_contextual_route
  engine.register({
    route: "plan_contextual_route",
    description: "結合起訖點、身分、沿途施工/事故避讓與終點停車/充電即時預警之情境全旅程路徑規劃",
    intentCriteria: "Contextual journey route planning",
    handler: async (payload: any) => {
      const originLat = Number(payload.origin_latitude ?? payload.origin?.latitude ?? 25.047761);
      const originLon = Number(payload.origin_longitude ?? payload.origin?.longitude ?? 121.517055);
      const destLat = Number(payload.destination_latitude ?? payload.destination?.latitude ?? 25.041045);
      const destLon = Number(payload.destination_longitude ?? payload.destination?.longitude ?? 121.565261);

      const origin = {
        latitude: originLat,
        longitude: originLon,
        name: payload.origin_name || payload.origin?.name || "出發地",
      };
      const destination = {
        latitude: destLat,
        longitude: destLon,
        name: payload.destination_name || payload.destination?.name || "目的地",
      };

      const identity = payload.identity || "car";
      const urgency = payload.urgency || "normal";
      const preferences = payload.preferences || {};

      const cacheKey = `jit:route:${identity}:${urgency}:${originLat.toFixed(3)}:${originLon.toFixed(3)}:${destLat.toFixed(3)}:${destLon.toFixed(3)}`;
      const cached = await cacheService.get(cacheKey);
      const parsed = safeJsonParse(cached);
      if (parsed) return parsed;

      const result = await planContextualRoute(
        tdxClient,
        origin,
        destination,
        identity,
        urgency,
        preferences
      );

      await cacheService.set(cacheKey, JSON.stringify(result), 60);
      return result;
    },
  });

  // 3. query_station_timetable
  engine.register({
    route: "query_station_timetable",
    description: "查詢指定台鐵、高鐵或捷運車站之發車時刻表與列車動態",
    intentCriteria: "Query train or metro station live boards and timetables",
    handler: async (payload: any) => {
      const railType = (payload.rail_type || "tra") as "tra" | "thsr" | "metro";
      const stationId = String(payload.station_id || "1000"); // default Taipei
      const result = await tdxClient.getRailLiveBoard(stationId, railType);
      return {
        station_id: stationId,
        rail_type: railType,
        board: result,
      };
    },
  });

  return { engine, mdLoader, tdxClient, cacheService };
}
