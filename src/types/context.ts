/**
 * Transport Context & Journey Planning Domain Types
 */

import type {
  TDXParkingLot,
  TDXEVChargerStation,
  TDXYouBikeStation,
  TDXTrafficIncident,
  TDXBusArrival,
  TDXRailLiveBoard,
} from "./tdx.js";

export type TransportIdentity =
  | "car"
  | "ev"
  | "scooter"
  | "bike"
  | "transit"
  | "pedestrian";

export type TransportState =
  | "cruising"
  | "urgent"
  | "commute_in"
  | "commute_out"
  | "transit_transfer"
  | "rain_fallback";

export interface GeoLocation {
  latitude: number;
  longitude: number;
  name?: string;
}

export interface ContextRecommendation {
  priority: number;
  type: string;
  title: string;
  detail: string;
  actionableUrl?: string;
}

export interface ContextRisk {
  category: "traffic_incident" | "parking_exhaustion" | "bike_depleted" | "weather" | "transit_delay";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  impactMinutes?: number;
}

export interface TransportContextResult {
  timestamp: string;
  queryContext: {
    identity: TransportIdentity;
    state: TransportState;
    location: GeoLocation;
  };
  situation: {
    level: "normal" | "warning" | "alert";
    headline: string;
    summary: string;
  };
  recommendations: ContextRecommendation[];
  risks: ContextRisk[];
  quickMetrics: {
    availableParkingSpots?: number;
    nearestAvailableDistanceMeters?: number;
    availableYouBikes?: number;
    availableYouBikeSpaces?: number;
    evFastChargersAvailable?: number;
    activeIncidentsCount: number;
    trafficCongestionLevel: "smooth" | "moderate" | "heavy" | "gridlock";
  };
  rawDetails?: {
    parking?: TDXParkingLot[];
    evChargers?: TDXEVChargerStation[];
    youbike?: TDXYouBikeStation[];
    incidents?: TDXTrafficIncident[];
    bus?: TDXBusArrival[];
    rail?: TDXRailLiveBoard[];
  };
}

export interface ContextualRouteResult {
  timestamp: string;
  journeySummary: {
    origin: GeoLocation;
    destination: GeoLocation;
    selectedMode: TransportIdentity | "multimodal";
    urgency: "normal" | "high" | "relaxed";
    estimatedTravelTimeMin: number;
    recommendedDeparture: string;
    overallTrafficCondition: "smooth" | "moderate_congestion" | "heavy_congestion";
  };
  recommendedStrategy: {
    title: string;
    routeDescription: string;
    destinationPlan?: {
      parkingPlan?: TDXParkingLot;
      evChargerPlan?: TDXEVChargerStation;
      youbikeReturnPlan?: TDXYouBikeStation;
      transitArrivalInfo?: string;
    };
  };
  enrouteAlerts: {
    type: string;
    severity: "low" | "medium" | "high";
    location: string;
    description: string;
    actionTaken: string;
  }[];
  alternativeOptions: {
    mode: TransportIdentity | "transit" | "multimodal";
    title: string;
    travelTimeMin: number;
    steps: string;
    advantage: string;
  }[];
}
