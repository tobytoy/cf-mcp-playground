/**
 * Geographic calculation and Spatial Grid Hashing utilities
 */

/**
 * Calculates the great-circle distance between two points in meters (Haversine formula).
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Generates a Spatial Grid cache key for 100m x 100m approximate rounding.
 * precision = 3 yields ~110m (lat) x ~90m (lon at Taiwan latitude 24~25°N).
 */
export function buildGeoGridKey(
  category: string,
  lat: number,
  lon: number,
  precision = 3
): string {
  const gridLat = lat.toFixed(precision);
  const gridLon = lon.toFixed(precision);
  return `tdx:geo:${category}:${gridLat}:${gridLon}`;
}

/**
 * Basic reverse lookup for city name based on latitude/longitude in Taiwan.
 */
export function guessTaiwanCity(lat: number, lon: number): string {
  if (lat >= 25.0 && lat <= 25.25 && lon >= 121.45 && lon <= 121.65) return "Taipei";
  if (lat >= 24.9 && lat <= 25.3 && lon >= 121.3 && lon <= 122.0) return "NewTaipei";
  if (lat >= 24.9 && lat <= 25.1 && lon >= 121.1 && lon <= 121.4) return "Taoyuan";
  if (lat >= 24.7 && lat <= 24.9 && lon >= 120.9 && lon <= 121.2) return "Hsinchu";
  if (lat >= 24.0 && lat <= 24.4 && lon >= 120.5 && lon <= 120.9) return "Taichung";
  if (lat >= 22.9 && lat <= 23.4 && lon >= 120.1 && lon <= 120.5) return "Tainan";
  if (lat >= 22.5 && lat <= 22.9 && lon >= 120.2 && lon <= 120.6) return "Kaohsiung";
  return "Taipei"; // Default fallback
}
