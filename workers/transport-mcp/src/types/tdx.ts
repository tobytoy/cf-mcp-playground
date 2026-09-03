/**
 * TDX (Transport Data eXchange) Data Models & API Types
 */

export interface TDXTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

export interface TDXGeoPoint {
  PositionLon: number;
  PositionLat: number;
  GeoHash?: string;
}

export interface TDXParkingLot {
  ParkingLotID: string;
  ParkingLotName: string;
  Description?: string;
  TotalSpaces: number;
  AvailableSpaces: number;
  EVSpaces?: number;
  AvailableEVSpaces?: number;
  FareDescription?: string;
  HourlyRate?: number;
  DistanceMeters?: number;
  Position?: TDXGeoPoint;
  Address?: string;
  IsFull?: boolean;
}

export interface TDXEVChargerStation {
  StationID: string;
  StationName: string;
  Address: string;
  DistanceMeters?: number;
  Position?: TDXGeoPoint;
  TotalGuns: number;
  AvailableGuns: number;
  FastChargerAvailable: number;
  SlowChargerAvailable: number;
  SupportedPlugs: string[]; // e.g. ["CCS1", "CCS2", "Type2", "CHAdeMO"]
  Operator?: string;
}

export interface TDXYouBikeStation {
  StationUID: string;
  StationID: string;
  StationName: string;
  BikesAvailable: number;
  EmptySpaces: number;
  TotalSpaces: number;
  ServiceStatus: number; // 0: 停止營運, 1: 正常營運, 2: 暫停營運
  DistanceMeters?: number;
  Position?: TDXGeoPoint;
  IsDepleted?: boolean; // 可借車數 <= 2
  IsFull?: boolean;     // 可還車位 <= 2
}

export interface TDXTrafficIncident {
  IncidentID: string;
  Title: string;
  Description: string;
  LocationDescription: string;
  Severity: "low" | "medium" | "high" | "critical";
  IncidentType: "accident" | "construction" | "congestion" | "control" | "weather" | "other";
  StartTime?: string;
  EndTime?: string;
  DistanceMeters?: number;
  Position?: TDXGeoPoint;
}

export interface TDXBusArrival {
  RouteUID: string;
  RouteName: string;
  StopUID: string;
  StopName: string;
  Direction: number; // 0: 去程, 1: 返程
  EstimateTimeSeconds?: number; // 預估到站時間(秒)
  EstimateTimeMinutes?: number; // 預估到站時間(分)
  StopStatus: number; // 0: 正常, 1: 尚未發車, 2: 交管不停, 3: 末班已過, 4: 今日未營運
  StatusText: string;
  PlateNumb?: string;
}

export interface TDXRailLiveBoard {
  StationID: string;
  StationName: string;
  RailType: "tra" | "thsr" | "metro";
  TrainNo: string;
  TrainTypeName?: string; // 例如 自強號, 普悠瑪, 區間車, 高鐵
  Direction: number; // 0: 順行/南下, 1: 逆行/北上
  DestinationStationName: string;
  ScheduledDepartureTime: string;
  DelayMinutes: number;
  Platform?: string;
  TripStatus: "on_time" | "delayed" | "cancelled" | "unknown";
}
