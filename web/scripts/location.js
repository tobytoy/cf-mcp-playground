/**
 * GPS Geolocation & Hotspot Presets Module
 */

export const PRESET_LOCATIONS = [
  { name: "台北101商圈", latitude: 25.033964, longitude: 121.564468 },
  { name: "台北車站 / 雙鐵轉乘", latitude: 25.047761, longitude: 121.517049 },
  { name: "捷運市政府站 / 信義商圈", latitude: 25.041154, longitude: 121.565416 },
  { name: "板橋車站 / 新板特區", latitude: 25.013627, longitude: 121.463583 },
  { name: "內湖科技園區 (港墘站)", latitude: 25.080184, longitude: 121.575641 },
  { name: "新竹巨城商圈", latitude: 24.809545, longitude: 120.975416 },
  { name: "台中高鐵站", latitude: 24.111823, longitude: 120.615849 },
  { name: "高雄巨蛋商圈", latitude: 22.669862, longitude: 120.302324 },
];

let currentLocation = {
  name: "台北101商圈",
  latitude: 25.033964,
  longitude: 121.564468,
};

export function getCurrentLocation() {
  return { ...currentLocation };
}

export function setCurrentLocation(loc) {
  currentLocation = { ...loc };
}

/**
 * Request device GPS position using HTML5 Geolocation API.
 */
export function requestGpsPosition(): Promise<{ latitude: number; longitude: number; name: string }> {
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
        setCurrentLocation(loc);
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
