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
 * Reverse geo lookup — maps lat/lon to TDX city API path segment.
 * Covers all 22 Taiwan counties & municipalities.
 * Coordinate ranges are conservative bounding boxes; overlapping entries
 * are ordered so the most specific match wins (checked top-to-bottom).
 */
export function guessTaiwanCity(lat: number, lon: number): string {
  // Direct municipalities (most specific first)
  if (lat >= 25.20 && lat <= 25.32 && lon >= 121.39 && lon <= 121.57) return "Keelung";
  if (lat >= 25.00 && lat <= 25.22 && lon >= 121.44 && lon <= 121.67) return "Taipei";
  if (lat >= 24.85 && lat <= 25.34 && lon >= 121.20 && lon <= 121.92) return "NewTaipei";
  if (lat >= 24.86 && lat <= 25.12 && lon >= 120.95 && lon <= 121.40) return "Taoyuan";
  if (lat >= 24.68 && lat <= 24.90 && lon >= 120.85 && lon <= 121.20) return "Hsinchu";  // city
  if (lat >= 24.50 && lat <= 24.90 && lon >= 120.75 && lon <= 121.25) return "HsinchuCounty";
  if (lat >= 24.20 && lat <= 24.60 && lon >= 120.52 && lon <= 121.00) return "Miaoli";
  if (lat >= 23.90 && lat <= 24.50 && lon >= 120.40 && lon <= 121.15) return "Taichung";
  if (lat >= 23.70 && lat <= 24.00 && lon >= 120.35 && lon <= 120.80) return "Changhua";
  if (lat >= 23.65 && lat <= 24.00 && lon >= 120.60 && lon <= 121.00) return "Nantou";
  if (lat >= 23.45 && lat <= 23.78 && lon >= 120.15 && lon <= 120.65) return "Yunlin";
  if (lat >= 23.35 && lat <= 23.65 && lon >= 120.10 && lon <= 120.65) return "Chiayi";    // county
  if (lat >= 23.43 && lat <= 23.52 && lon >= 120.42 && lon <= 120.48) return "ChiayiCity"; // city
  if (lat >= 22.85 && lat <= 23.40 && lon >= 119.95 && lon <= 120.55) return "Tainan";
  if (lat >= 22.45 && lat <= 23.00 && lon >= 120.15 && lon <= 120.75) return "Kaohsiung";
  if (lat >= 22.30 && lat <= 22.65 && lon >= 120.45 && lon <= 120.80) return "Pingtung";
  if (lat >= 24.25 && lat <= 24.85 && lon >= 121.30 && lon <= 121.95) return "Yilan";
  if (lat >= 22.80 && lat <= 24.40 && lon >= 121.30 && lon <= 121.90) return "Hualien";
  if (lat >= 22.50 && lat <= 23.20 && lon >= 120.80 && lon <= 121.40) return "Taitung";
  if (lat >= 25.95 && lat <= 26.40 && lon >= 119.85 && lon <= 120.55) return "Penghu";
  if (lat >= 24.38 && lat <= 24.52 && lon >= 118.28 && lon <= 118.50) return "Kinmen";
  if (lat >= 26.10 && lat <= 26.40 && lon >= 119.90 && lon <= 120.10) return "Matsu";
  return "Taipei"; // Final fallback (TDX default)
}
