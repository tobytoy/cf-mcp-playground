import type { CityMeta } from "../types.js";

export const TAIWAN_CITIES: CityMeta[] = [
  { code: "Taipei", name: "Taipei", nameZh: "臺北市", centerLat: 25.0375, centerLon: 121.5637, defaultZoom: 14 },
  { code: "NewTaipei", name: "NewTaipei", nameZh: "新北市", centerLat: 25.0124, centerLon: 121.4657, defaultZoom: 13 },
  { code: "Taichung", name: "Taichung", nameZh: "臺中市", centerLat: 24.1477, centerLon: 120.6736, defaultZoom: 13 },
  { code: "Kaohsiung", name: "Kaohsiung", nameZh: "高雄市", centerLat: 22.6273, centerLon: 120.3014, defaultZoom: 13 },
  { code: "Tainan", name: "Tainan", nameZh: "臺南市", centerLat: 22.9997, centerLon: 120.2270, defaultZoom: 14 },
  { code: "Taoyuan", name: "Taoyuan", nameZh: "桃園市", centerLat: 24.9936, centerLon: 121.3010, defaultZoom: 13 },
  { code: "Hsinchu", name: "Hsinchu", nameZh: "新竹市", centerLat: 24.8039, centerLon: 120.9647, defaultZoom: 14 },
  { code: "Keelung", name: "Keelung", nameZh: "基隆市", centerLat: 25.1276, centerLon: 121.7392, defaultZoom: 14 },
  { code: "YilanCounty", name: "YilanCounty", nameZh: "宜蘭縣", centerLat: 24.7570, centerLon: 121.7533, defaultZoom: 13 },
];

export const CITY_NAME_MAP: Record<string, string> = {
  Taipei: "臺北市",
  NewTaipei: "新北市",
  Taichung: "臺中市",
  Kaohsiung: "高雄市",
  Tainan: "臺南市",
  Taoyuan: "桃園市",
  Hsinchu: "新竹市",
  Keelung: "基隆市",
  YilanCounty: "宜蘭縣",
};
