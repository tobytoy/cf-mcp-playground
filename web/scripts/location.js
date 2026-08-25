/**
 * Location, Preferences & Custom Favorites Management Module
 */

const STORAGE_KEY_IDENTITY = "transport_pref_identity";
const STORAGE_KEY_STATE = "transport_pref_state";
const STORAGE_KEY_ORIGIN = "transport_pref_origin";
const STORAGE_KEY_DESTINATION = "transport_pref_dest";
const STORAGE_KEY_FAVORITES = "transport_pref_favorites";

export const DEFAULT_PRESET_LOCATIONS = [
  { id: "p1", name: "台北101商圈", alias: "🏙️ 台北101", latitude: 25.033964, longitude: 121.564468 },
  { id: "p2", name: "台北車站 / 雙鐵轉乘", alias: "🚅 台北車站", latitude: 25.047761, longitude: 121.517049 },
  { id: "p3", name: "捷運市政府站 / 信義商圈", alias: "🚇 市政府站", latitude: 25.041154, longitude: 121.565416 },
  { id: "p4", name: "板橋車站 / 新板特區", alias: "🏢 板橋特區", latitude: 25.013627, longitude: 121.463583 },
  { id: "p5", name: "內湖科技園區 (港墘站)", alias: "💻 內科園區", latitude: 25.080184, longitude: 121.575641 },
  { id: "p6", name: "新竹巨城商圈", alias: "🛍️ 新竹巨城", latitude: 24.809545, longitude: 120.975416 },
  { id: "p7", name: "台中高鐵站", alias: "🚄 台中高鐵", latitude: 24.111823, longitude: 120.615849 },
  { id: "p8", name: "高雄巨蛋商圈", alias: "🏟️ 高雄巨蛋", latitude: 22.669862, longitude: 120.302324 },
];

// ── Preferences Persistence (Identity & State) ─────────────────────────────
export function getStoredIdentity() {
  return localStorage.getItem(STORAGE_KEY_IDENTITY) || "car";
}

export function setStoredIdentity(identity) {
  localStorage.setItem(STORAGE_KEY_IDENTITY, identity);
}

export function getStoredState() {
  return localStorage.getItem(STORAGE_KEY_STATE) || "cruising";
}

export function setStoredState(st) {
  localStorage.setItem(STORAGE_KEY_STATE, st);
}

// ── Origin & Destination Persistence ───────────────────────────────────────
export function getStoredOrigin() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_ORIGIN);
    return data ? JSON.parse(data) : { name: "台北101商圈", latitude: 25.033964, longitude: 121.564468 };
  } catch {
    return { name: "台北101商圈", latitude: 25.033964, longitude: 121.564468 };
  }
}

export function setStoredOrigin(loc) {
  localStorage.setItem(STORAGE_KEY_ORIGIN, JSON.stringify(loc));
}

export function getStoredDestination() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_DESTINATION);
    return data ? JSON.parse(data) : { name: "台北車站 / 雙鐵轉乘", latitude: 25.047761, longitude: 121.517049 };
  } catch {
    return { name: "台北車站 / 雙鐵轉乘", latitude: 25.047761, longitude: 121.517049 };
  }
}

export function setStoredDestination(loc) {
  localStorage.setItem(STORAGE_KEY_DESTINATION, JSON.stringify(loc));
}

// ── Custom Favorite Locations Management ───────────────────────────────────
export function getFavoriteLocations() {
  try {
    const data = localStorage.getItem(STORAGE_KEY_FAVORITES);
    if (data) return JSON.parse(data);
  } catch {}
  
  // Default favorites if none set
  const defaults = [
    { id: "fav-home", alias: "🏠 家", name: "捷運市政府站周邊", latitude: 25.041154, longitude: 121.565416 },
    { id: "fav-work", alias: "🏢 公司", name: "內湖科技園區", latitude: 25.080184, longitude: 121.575641 },
    { id: "fav-gym",  alias: "🏋️ 健身房", name: "台北101特區", latitude: 25.033964, longitude: 121.564468 },
  ];
  localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(defaults));
  return defaults;
}

export function saveFavoriteLocation(fav) {
  const list = getFavoriteLocations();
  const index = list.findIndex((item) => item.id === fav.id);
  if (index >= 0) {
    list[index] = { ...fav };
  } else {
    list.push({
      ...fav,
      id: fav.id || `fav-${Date.now()}`,
    });
  }
  localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(list));
  return list;
}

export function deleteFavoriteLocation(id) {
  const list = getFavoriteLocations().filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_KEY_FAVORITES, JSON.stringify(list));
  return list;
}

// ── HTML5 GPS Request Helper ───────────────────────────────────────────────
export function requestGpsPosition() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      return reject(new Error("您的瀏覽器或裝置不支援 GPS 定位功能。"));
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lon = Number(position.coords.longitude.toFixed(6));
        const loc = {
          name: "📍 我的 GPS 即時位置",
          latitude: lat,
          longitude: lon,
        };
        setStoredOrigin(loc);
        resolve(loc);
      },
      (error) => {
        let msg = "GPS 定位失敗。";
        if (error.code === error.PERMISSION_DENIED) {
          msg = "請在瀏覽器設定中允許讀取 GPS 位置權限。";
        } else if (error.code === error.TIMEOUT) {
          msg = "GPS 定位連線逾時，請重試。";
        }
        reject(new Error(msg));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  });
}
