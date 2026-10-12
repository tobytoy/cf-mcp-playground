export type SeatAvailabilityCode = "O" | "L" | "X" | "-"; // O: 充足, L: 緊張(倒數中), X: 售完, -: 依官方或無資訊

export type RailSystem = "THSR" | "TRA";

export interface StationItem {
  id: string;
  nameZh: string;
  nameEn: string;
  system: RailSystem;
  region?: "north" | "central" | "south" | "east";
  isMajor?: boolean;
}

export interface CombinedRailScheduleItem {
  system: RailSystem;
  trainNo: string;
  trainTypeName: string;
  originStationName: string;
  destinationStationName: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  seats: {
    standard: SeatAvailabilityCode;
    business: SeatAvailabilityCode;
    standardNumeric?: string; // ">50" | "<10" | "0" | "-"
    businessNumeric?: string; // ">50" | "<10" | "0" | "-"
    note?: string;
  };
  bookingUrl: string;
}

export interface TDXAvailableSeatStatusResponse {
  TrainDate?: string;
  AvailableSeats?: Array<{
    TrainNo: string;
    Direction?: number;
    OriginStationID?: string;
    DestinationStationID?: string;
    StandardSeatStatus: SeatAvailabilityCode;
    BusinessSeatStatus: SeatAvailabilityCode;
  }>;
}

export interface RailRadarFilterOptions {
  depAfter?: string; // HH:mm
  depBefore?: string; // HH:mm
  arrAfter?: string; // HH:mm
  arrBefore?: string; // HH:mm
}

export interface RailRadarResult {
  origin: { query: string; thsr?: string; tra?: string };
  destination: { query: string; thsr?: string; tra?: string };
  date: string;
  updatedAt: string;
  total: number;
  filters?: RailRadarFilterOptions;
  schedules: CombinedRailScheduleItem[];
  thsr: CombinedRailScheduleItem[];
  tra: CombinedRailScheduleItem[];
}

export interface RailRadarEnv {
  ENVIRONMENT?: string;
  TDX_CLIENT_ID?: string;
  TDX_CLIENT_SECRET?: string;
  TDX_BASE_URL?: string;
}

