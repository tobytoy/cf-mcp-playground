/**
 * Context Reasoning Engine: Multi-dimensional Traffic Context Evaluator
 */

import type { TDXClient } from "../tdx/client.js";
import { guessTaiwanCity } from "../tdx/geo.js";
import type {
  TransportIdentity,
  TransportState,
  GeoLocation,
  TransportContextResult,
  ContextRecommendation,
  ContextRisk,
} from "../../types/context.js";
import type {
  TDXParkingLot,
  TDXEVChargerStation,
  TDXYouBikeStation,
  TDXTrafficIncident,
} from "../../types/tdx.js";

export interface ContextOptions {
  radiusMeters?: number;
  preferIndoorParking?: boolean;
}

export async function evaluateTransportContext(
  tdxClient: TDXClient,
  identity: TransportIdentity,
  state: TransportState,
  location: GeoLocation,
  options: ContextOptions = {}
): Promise<TransportContextResult> {
  const radius = options.radiusMeters || 800;
  const city = guessTaiwanCity(location.latitude, location.longitude);
  const timestamp = new Date().toISOString();

  // ── 1. Hierarchical Decomposition: Parallel Fetching of Sub-Data ──────────
  const needParking = identity === "car" || identity === "ev";
  const needEV = identity === "ev";
  const needYouBike = identity === "bike" || state === "rain_fallback";
  const needIncidents = true;

  const [parkingLots, evStations, youbikeStations, incidents] = await Promise.all([
    needParking ? tdxClient.getNearbyParking(location.latitude, location.longitude, radius) : Promise.resolve([]),
    needEV ? tdxClient.getNearbyEVChargers(location.latitude, location.longitude, radius * 1.5) : Promise.resolve([]),
    needYouBike ? tdxClient.getNearbyYouBike(location.latitude, location.longitude, radius) : Promise.resolve([]),
    needIncidents ? tdxClient.getTrafficIncidents(city, location.latitude, location.longitude, 3000) : Promise.resolve([]),
  ]);

  // ── 2. Contextual Rule Scoring & Synthesis ────────────────────────────────
  const recommendations: ContextRecommendation[] = [];
  const risks: ContextRisk[] = [];
  let situationLevel: "normal" | "warning" | "alert" = "normal";
  let situationHeadline = "交通狀況順暢";
  let situationSummary = "周邊無重大交通事故，各運具運行正常。";
  let congestionLevel: "smooth" | "moderate" | "heavy" | "gridlock" = "smooth";

  // Check Incidents first
  const highIncidents = incidents.filter((i) => i.Severity === "high" || i.Severity === "critical");
  if (highIncidents.length > 0) {
    situationLevel = "alert";
    congestionLevel = "heavy";
    situationHeadline = "周邊有重大交通管制或事故";
    situationSummary = `偵測到 ${highIncidents[0].Title}，影響周邊車流通行。`;
    risks.push({
      category: "traffic_incident",
      severity: "high",
      description: highIncidents[0].Description,
      impactMinutes: 15,
    });
  } else if (incidents.length > 0) {
    congestionLevel = "moderate";
    risks.push({
      category: "traffic_incident",
      severity: "medium",
      description: incidents[0].Description,
      impactMinutes: 8,
    });
  }

  // ── 3. Identity & State Specific Reasoning ────────────────────────────────
  if (identity === "car" || identity === "ev") {
    const sortedLots = [...parkingLots].sort((a, b) => b.AvailableSpaces - a.AvailableSpaces);
    const bestLot = sortedLots[0];
    const nearestLot = parkingLots[0];
    const totalAvailable = parkingLots.reduce((sum, p) => sum + p.AvailableSpaces, 0);

    if (totalAvailable < 10) {
      situationLevel = "alert";
      situationHeadline = "周邊停車格極度吃緊 (即將滿位)";
      situationSummary = `周邊 500m 內可用車位僅剩 ${totalAvailable} 格，建議立即前往備選場或改搭捷運。`;
      risks.push({
        category: "parking_exhaustion",
        severity: "critical",
        description: "核心熱點停車場幾乎全數客滿，入場排隊預計超過 20 分鐘。",
      });
    } else if (state === "cruising") {
      situationHeadline = "商圈休閒巡航 — 停車推薦";
      situationSummary = `周邊共有 ${parkingLots.length} 處可用停車場，總計空位 ${totalAvailable} 格。`;
      if (bestLot) {
        recommendations.push({
          priority: 1,
          type: "parking_recommendation",
          title: `推薦停放【${bestLot.ParkingLotName}】`,
          detail: `距離約 ${bestLot.DistanceMeters || 400} 公尺，尚有 ${bestLot.AvailableSpaces} 格空位（費率 ${bestLot.HourlyRate || 40}元/時），進場無須排隊。`,
        });
      }
    } else if (state === "urgent") {
      situationHeadline = "趕時間模式 — 最近可用車位推薦";
      if (nearestLot && nearestLot.AvailableSpaces > 3) {
        recommendations.push({
          priority: 1,
          type: "urgent_parking",
          title: `直達最近【${nearestLot.ParkingLotName}】`,
          detail: `距此僅 ${nearestLot.DistanceMeters || 150} 公尺，尚有 ${nearestLot.AvailableSpaces} 格車位，步行 2 分鐘即可抵達。`,
        });
      } else if (bestLot) {
        recommendations.push({
          priority: 1,
          type: "urgent_parking",
          title: `建議停靠【${bestLot.ParkingLotName}】避開排隊`,
          detail: `最近場已接近滿位，建議直行 200m 至【${bestLot.ParkingLotName}】（剩 ${bestLot.AvailableSpaces} 格）。`,
        });
      }
    }

    if (identity === "ev" && evStations.length > 0) {
      const bestEV = evStations.find((s) => s.FastChargerAvailable > 0) || evStations[0];
      recommendations.push({
        priority: 2,
        type: "ev_charger",
        title: `⚡ 快充充電站：【${bestEV.StationName}】`,
        detail: `距離 ${bestEV.DistanceMeters || 300}m，可用快充 ${bestEV.FastChargerAvailable} 槍 / 慢充 ${bestEV.SlowChargerAvailable} 槍，支援 ${bestEV.SupportedPlugs.join(", ")}。`,
      });
    }
  } else if (identity === "bike") {
    const depletedStation = youbikeStations.find((s) => s.IsDepleted);
    const availableStation = youbikeStations.find((s) => s.BikesAvailable > 3) || youbikeStations[0];

    if (depletedStation) {
      risks.push({
        category: "bike_depleted",
        severity: "high",
        description: `【${depletedStation.StationName}】僅剩 ${depletedStation.BikesAvailable} 台車，即將無車可借！`,
      });
    }

    if (availableStation) {
      recommendations.push({
        priority: 1,
        type: "youbike_pickup",
        title: `🚲 推薦借車站點：【${availableStation.StationName}】`,
        detail: `距離 ${availableStation.DistanceMeters || 100}m，目前可借 ${availableStation.BikesAvailable} 台車，可還空位 ${availableStation.EmptySpaces} 格。`,
      });
    }
  } else if (identity === "scooter") {
    situationHeadline = "機車騎乘路況導航";
    situationSummary = incidents.length > 0
      ? `前方有施工與車多情況，請注意防禦駕駛。`
      : `路況良好，行車平順。`;
    if (incidents.length > 0) {
      recommendations.push({
        priority: 1,
        type: "scooter_safety",
        title: "注意施工路段改道",
        detail: `避開【${incidents[0].LocationDescription}】，建議改走平行市區平面幹道。`,
      });
    }
  } else if (identity === "transit") {
    recommendations.push({
      priority: 1,
      type: "transit_navigation",
      title: "大眾運輸銜接順暢",
      detail: "周邊捷運與公車幹線發車密集，離峰班距 3~5 分鐘，尖峰班距 2~3 分鐘。",
    });
  }

  // Calculate Quick Metrics
  const totalParkingSpaces = parkingLots.reduce((acc, p) => acc + p.AvailableSpaces, 0);
  const totalYouBikes = youbikeStations.reduce((acc, b) => acc + b.BikesAvailable, 0);
  const totalYouBikeSpaces = youbikeStations.reduce((acc, b) => acc + b.EmptySpaces, 0);
  const totalFastChargers = evStations.reduce((acc, e) => acc + e.FastChargerAvailable, 0);

  return {
    timestamp,
    queryContext: {
      identity,
      state,
      location,
    },
    situation: {
      level: situationLevel,
      headline: situationHeadline,
      summary: situationSummary,
    },
    recommendations,
    risks,
    quickMetrics: {
      availableParkingSpots: needParking ? totalParkingSpaces : undefined,
      nearestAvailableDistanceMeters: parkingLots[0]?.DistanceMeters,
      availableYouBikes: needYouBike ? totalYouBikes : undefined,
      availableYouBikeSpaces: needYouBike ? totalYouBikeSpaces : undefined,
      evFastChargersAvailable: needEV ? totalFastChargers : undefined,
      activeIncidentsCount: incidents.length,
      trafficCongestionLevel: congestionLevel,
    },
    rawDetails: {
      parking: parkingLots.slice(0, 5),
      evChargers: evStations.slice(0, 3),
      youbike: youbikeStations.slice(0, 5),
      incidents: incidents.slice(0, 3),
    },
  };
}
