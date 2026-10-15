export interface ParkingRadarEnv {
  ENVIRONMENT?: string;
  TDX_CLIENT_ID?: string;
  TDX_CLIENT_SECRET?: string;
  TDX_BASE_URL?: string;
}

export type SpaceOccupancyStatus = "available" | "tight" | "full" | "unknown";

export interface EVSpacesDetail {
  total: number | null;
  dedicated: number | null; // 專屬車位 (只給純電動車停，ChargingSpaceType: 1)
  shared: number | null;    // 混用/優先車位 (油電車共用，ChargingSpaceType: 2)
  available?: number | null;
}

export interface UnifiedCarPark {
  id: string;
  name: string;
  city: string;
  cityNameZh: string;
  address: string;
  lat: number;
  lon: number;
  distanceMeters?: number;
  totalSpaces: number | null;
  availableSpaces: number | null;
  occupancyRate: number | null; // 0 - 100 percentage, null if unknown
  status: SpaceOccupancyStatus;
  fareDescription: string;
  carParkType?: number; // 1: 平面型, 2: 立體型, 3: 地下型, 4: 機械塔/複合型
  carParkTypeName?: string;
  isIndoor: boolean;
  hasEVCharging: boolean;
  evSpaces: EVSpacesDetail;
  hasDisabilitySpace: boolean;
  hasParentChildSpace: boolean;
  isMotorcycleAvailable: boolean;
  hasOvernight: boolean;
  hasReservation: boolean;
  spacesByType: {
    general?: { total: number | null; available: number | null };
    motorcycle?: { total: number | null; available: number | null };
    disability?: { total: number | null; available: number | null };
    parentChild?: { total: number | null; available: number | null };
  };
  facilities: string[];
  serviceStatus: number; // 1 = normal, 0 = closed
  lastUpdated: string;
}

export interface ParkingFilterOptions {
  vehicleType?: "car" | "motorcycle";
  evOnly?: boolean;
  evDedicatedOnly?: boolean;
  disabilityOnly?: boolean;
  parentChildOnly?: boolean;
  indoorOnly?: boolean;
  availableOnly?: boolean;
  searchQuery?: string;
  lat?: number;
  lon?: number;
  radiusMeters?: number;
}

export interface CityMeta {
  code: string;
  name: string;
  nameZh: string;
  centerLat: number;
  centerLon: number;
  defaultZoom: number;
}

export interface CityParkingStats {
  city: string;
  cityNameZh: string;
  totalLots: number;
  lotsWithLiveOccupancy: number;
  totalSpaces: number;
  availableSpaces: number;
  occupancyRate: number;
  spacesByType: {
    general: { total: number; available: number };
    motorcycle: { total: number; available: number };
    ev: { total: number; dedicated: number; shared: number };
    disability: { total: number; available: number };
    parentChild: { total: number; available: number };
  };
  evLotCount: number;
  evCoverageRate: number;
  carParkTypeDistribution: {
    flatCount: number;         // 1: 平面型 (露天/戶外)
    multiStoreyCount: number;  // 2: 立體型 (地上建築)
    undergroundCount: number;  // 3: 地下型
    mechanicalCount: number;   // 4: 機械塔/複合型
  };
  facilitiesDistribution: {
    indoorCount: number;
    evCount: number;
    wheelchairCount: number;
    ticketMachineCount: number;
    gatedCount: number;
    overnightCount: number;
  };
  topAvailableLots: {
    id: string;
    name: string;
    availableSpaces: number;
    totalSpaces: number;
    evDedicated: number;
    evShared: number;
  }[];
  topOccupiedLots: {
    id: string;
    name: string;
    availableSpaces: number;
    totalSpaces: number;
    occupancyRate: number;
  }[];
}

export interface NationwideParkingStats {
  overview: {
    totalCities: number;
    totalLots: number;
    totalSpaces: number;
    availableSpaces: number;
    overallOccupancyRate: number;
    totalEVSpaces: number;
    totalEVDedicated: number;
    totalEVShared: number;
    totalDisabilitySpaces: number;
    totalParentChildSpaces: number;
    totalMotorcycleSpaces: number;
    evCoverageRate: number;
    carParkTypeSummary: {
      flatCount: number;
      multiStoreyCount: number;
      undergroundCount: number;
      mechanicalCount: number;
    };
    facilitiesSummary: {
      indoorCount: number;
      evCount: number;
      wheelchairCount: number;
      ticketMachineCount: number;
      gatedCount: number;
      overnightCount: number;
    };
  };
  citySummaries: CityParkingStats[];
}
