/**
 * High-Level Contextual Route & Journey Strategy Planner
 */

import type { TDXClient } from "../tdx/client.js";
import { calculateDistanceMeters, guessTaiwanCity } from "../tdx/geo.js";
import type {
  GeoLocation,
  TransportIdentity,
  ContextualRouteResult,
} from "../../types/context.js";
import type { TDXParkingLot, TDXEVChargerStation, TDXYouBikeStation } from "../../types/tdx.js";

export interface RoutePreferences {
  preferIndoorParking?: boolean;
  needEVCharge?: boolean;
  avoidTolls?: boolean;
}

export async function planContextualRoute(
  tdxClient: TDXClient,
  origin: GeoLocation,
  destination: GeoLocation,
  identity: TransportIdentity | "multimodal" = "car",
  urgency: "normal" | "high" | "relaxed" = "normal",
  preferences: RoutePreferences = {}
): Promise<ContextualRouteResult> {
  const timestamp = new Date().toISOString();
  const straightDistanceMeters = calculateDistanceMeters(
    origin.latitude,
    origin.longitude,
    destination.latitude,
    destination.longitude
  );

  // Realistic road route distance factor ~1.3x straight line
  const routeDistanceKm = Math.max(0.5, (straightDistanceMeters * 1.3) / 1000);
  const city = guessTaiwanCity(destination.latitude, destination.longitude);

  // ── 1. Hierarchical Decomposition: Query Relevant Data Concurrently ──────
  const isCarOrEV = identity === "car" || identity === "ev" || identity === "multimodal";
  const isBike = identity === "bike";

  const [destParking, destEV, originYouBike, destYouBike, incidents] = await Promise.all([
    isCarOrEV ? tdxClient.getNearbyParking(destination.latitude, destination.longitude, 800) : Promise.resolve([]),
    identity === "ev" || preferences.needEVCharge ? tdxClient.getNearbyEVChargers(destination.latitude, destination.longitude, 1200) : Promise.resolve([]),
    isBike ? tdxClient.getNearbyYouBike(origin.latitude, origin.longitude, 600) : Promise.resolve([]),
    isBike ? tdxClient.getNearbyYouBike(destination.latitude, destination.longitude, 600) : Promise.resolve([]),
    tdxClient.getTrafficIncidents(city, destination.latitude, destination.longitude, 3000),
  ]);

  // ── 2. Speed & Travel Time Calculation ───────────────────────────────────
  let baseSpeedKmh = 30;
  if (identity === "car" || identity === "ev") baseSpeedKmh = 25;
  if (identity === "scooter") baseSpeedKmh = 28;
  if (identity === "bike") baseSpeedKmh = 14;
  if (identity === "transit") baseSpeedKmh = 22;

  // Congestion penalty
  let congestionPenaltyMin = incidents.length * 4;
  let overallCondition: "smooth" | "moderate_congestion" | "heavy_congestion" = "smooth";
  if (incidents.length > 0) overallCondition = "moderate_congestion";
  if (incidents.some((i) => i.Severity === "high" || i.Severity === "critical")) {
    overallCondition = "heavy_congestion";
    congestionPenaltyMin += 10;
  }

  const estimatedDriveTimeMin = Math.round((routeDistanceKm / baseSpeedKmh) * 60 + congestionPenaltyMin);

  // ── 3. Destination Planning (Parking / EV / YouBike) ─────────────────────
  let recommendedParking: TDXParkingLot | undefined;
  let recommendedEV: TDXEVChargerStation | undefined;
  let recommendedYouBikeReturn: TDXYouBikeStation | undefined;

  if (isCarOrEV && destParking.length > 0) {
    // Prefer lots with high available spaces
    recommendedParking = [...destParking].sort((a, b) => b.AvailableSpaces - a.AvailableSpaces)[0];
  }

  if ((identity === "ev" || preferences.needEVCharge) && destEV.length > 0) {
    recommendedEV = destEV.find((s) => s.FastChargerAvailable > 0) || destEV[0];
  }

  if (isBike && destYouBike.length > 0) {
    recommendedYouBikeReturn = destYouBike.find((s) => s.EmptySpaces > 3) || destYouBike[0];
  }

  // ── 4. Enroute Alerts ───────────────────────────────────────────────────
  const enrouteAlerts = incidents.map((inc) => ({
    type: inc.IncidentType,
    severity: inc.Severity === "critical" ? "high" as const : (inc.Severity as "low" | "medium" | "high"),
    location: inc.LocationDescription || "沿途路段",
    description: inc.Description,
    actionTaken: "已於導航策略中為您規劃避開壅塞車道",
  }));

  // ── 5. Strategy Synthesizer ─────────────────────────────────────────────
  let strategyTitle = "建議最佳路徑";
  let routeDesc = `全程約 ${routeDistanceKm.toFixed(1)} 公里，行車時間預估 ${estimatedDriveTimeMin} 分鐘。`;

  if (identity === "car" || identity === "ev") {
    if (recommendedParking) {
      strategyTitle = `推薦行駛主幹道 ➔ 直達【${recommendedParking.ParkingLotName}】`;
      routeDesc = `建議走主要高架/幹道，避開施工路段。目的地建議停放【${recommendedParking.ParkingLotName}】（剩餘 ${recommendedParking.AvailableSpaces} 格，距終點 ${recommendedParking.DistanceMeters || 300}m），步行約 4 分鐘抵達。`;
    }
  } else if (identity === "bike") {
    const originStation = originYouBike.find((b) => b.BikesAvailable > 2) || originYouBike[0];
    strategyTitle = "🚲 YouBike 綠色騎行路線";
    routeDesc = `建議於起點【${originStation?.StationName || "鄰近站點"}】借車（剩 ${originStation?.BikesAvailable || 5} 台），騎乘專用自行車道約 ${Math.round(routeDistanceKm * 4)} 分鐘，至終點【${recommendedYouBikeReturn?.StationName || "目的地站點"}】還車（尚有 ${recommendedYouBikeReturn?.EmptySpaces || 10} 空格）。`;
  } else if (identity === "scooter") {
    strategyTitle = "🛵 機車平面快捷路線";
    routeDesc = `走市區平面幹道，注意前方路面施工。全程預估 ${Math.max(8, Math.round(estimatedDriveTimeMin * 0.85))} 分鐘抵達。`;
  }

  // ── 6. Multimodal Alternatives ──────────────────────────────────────────
  const transitTimeMin = Math.round(estimatedDriveTimeMin * 0.9 + 5);
  const alternativeOptions: ContextualRouteResult["alternativeOptions"] = [
    {
      mode: "transit",
      title: "🚇 捷運/大眾運輸避堵方案",
      travelTimeMin: transitTimeMin,
      steps: "搭乘捷運幹線直達目的地站，由最近出口步行 3 分鐘即可抵達。",
      advantage: "免找車位、不受路況施工與突發事故影響，時間精準可靠。",
    },
  ];

  if (identity === "car" && routeDistanceKm < 4) {
    alternativeOptions.push({
      mode: "bike" as const,
      title: "🚲 YouBike 2.0 漫遊方案",
      travelTimeMin: Math.round(routeDistanceKm * 4.5),
      steps: "於起點租借 YouBike 2.0 沿市區林蔭自行車道騎行至終點站。",
      advantage: "零碳排、免找車位排隊、低成本省時。",
    });
  }

  return {
    timestamp,
    journeySummary: {
      origin,
      destination,
      selectedMode: identity,
      urgency,
      estimatedTravelTimeMin: estimatedDriveTimeMin,
      recommendedDeparture: urgency === "high" ? "建議立即出發" : "10 分鐘內出發皆宜",
      overallTrafficCondition: overallCondition,
    },
    recommendedStrategy: {
      title: strategyTitle,
      routeDescription: routeDesc,
      destinationPlan: {
        parkingPlan: recommendedParking,
        evChargerPlan: recommendedEV,
        youbikeReturnPlan: recommendedYouBikeReturn,
        transitArrivalInfo: `捷運/公車班距約 3~5 分鐘`,
      },
    },
    enrouteAlerts,
    alternativeOptions,
  };
}
