import { getTaiwanTimeString } from "../utils/time";

export interface UserSavedLocation {
  latitude: number;
  longitude: number;
  title: string;
  address: string;
  updatedAt: string;
}

// In-memory fallback for local dev / testing
const memoryLocationStore = new Map<string, string>();

export const DEFAULT_MOTC_LOCATION: UserSavedLocation = {
  latitude: 25.0385,
  longitude: 121.5234,
  title: "交通部",
  address: "臺北市中正區仁愛路1段50號",
  updatedAt: "系統預設 (上班常駐辦公室)"
};

export const DEFAULT_LOCATION = DEFAULT_MOTC_LOCATION;
export const DEFAULT_TIANMU_LOCATION = DEFAULT_MOTC_LOCATION;

export class LocationManager {
  private kv?: KVNamespace;

  constructor(kv?: KVNamespace) {
    this.kv = kv;
  }

  /**
   * Save or update the user's latest shared location.
   */
  async saveLocation(
    userId: string,
    lat: number,
    lon: number,
    title: string = "目前位置",
    address: string = ""
  ): Promise<UserSavedLocation> {
    const loc: UserSavedLocation = {
      latitude: lat,
      longitude: lon,
      title: title || address || "目前位置",
      address: address || title || "台灣台北市",
      updatedAt: getTaiwanTimeString()
    };

    const key = `user_location:${userId}`;
    const jsonStr = JSON.stringify(loc);

    if (this.kv) {
      try {
        await this.kv.put(key, jsonStr);
      } catch (err) {
        console.warn("[LocationManager] Failed to save location to KV:", err);
      }
    } else {
      memoryLocationStore.set(key, jsonStr);
    }

    return loc;
  }

  /**
   * Retrieve the user's latest location, defaulting to Tianmu if not yet shared.
   */
  async getLocation(userId: string): Promise<UserSavedLocation> {
    const key = `user_location:${userId}`;

    if (this.kv) {
      try {
        const data = await this.kv.get<UserSavedLocation>(key, "json");
        if (data && data.latitude && data.longitude) {
          return data;
        }
      } catch (err) {
        console.warn("[LocationManager] Failed to read location from KV:", err);
      }
    } else {
      const raw = memoryLocationStore.get(key);
      if (raw) {
        return JSON.parse(raw);
      }
    }

    return DEFAULT_MOTC_LOCATION;
  }

  /**
   * Detect if prompt contains relative location references ("現在位置", "我的位置", "從這裡", etc.)
   */
  hasRelativeLocationReference(prompt: string): boolean {
    return /(現在位置|我現在的位置|我的位置|我目前的位置|目前位置|從這裡|從這|我這裡|這附近|附近哪裡)/i.test(prompt);
  }

  /**
   * Enrich prompt with explicit geographic location context.
   */
  enrichPromptWithLocation(prompt: string, loc: UserSavedLocation): string {
    const locName = loc.title && loc.address && loc.title !== loc.address
      ? `${loc.title} (${loc.address})`
      : (loc.address || loc.title);
    const locationDescription = `${locName}（經度: ${loc.longitude}, 緯度: ${loc.latitude}，定位更新於: ${loc.updatedAt}）`;

    // Replace relative terms
    const enriched = prompt
      .replace(/(我現在的位置|我現在位置|我目前的位置|我目前位置|現在位置|我的位置|目前位置|從這裡|從這|我這裡)/g, `我的目前所在地【${locName}】`);

    return `【使用者目前確切位置】：${locationDescription}\n【使用者提問需求】：${enriched}`;
  }
}
