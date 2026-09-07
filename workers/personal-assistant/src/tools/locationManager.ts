import { getTaiwanTimeString } from "../utils/time";

export interface UserSavedLocation {
  latitude: number;
  longitude: number;
  title: string;
  address: string;
  updatedAt: string;
}

export const DEFAULT_TIANMU_LOCATION: UserSavedLocation = {
  latitude: 25.1119,
  longitude: 121.5312,
  title: "天母住家",
  address: "台北市士林區天母忠誠路二段（天母棒球場/高島屋周邊）",
  updatedAt: "系統預設 (天母生活住家)"
};

const memoryLocations = new Map<string, UserSavedLocation>();

export class LocationManager {
  private kv?: KVNamespace;

  constructor(kv?: KVNamespace) {
    this.kv = kv;
  }

  async getLocation(userId: string): Promise<UserSavedLocation> {
    if (this.kv) {
      try {
        const stored = await this.kv.get<UserSavedLocation>(`user:${userId}:location`, "json");
        if (stored && stored.latitude && stored.longitude) {
          memoryLocations.set(userId, stored);
          return stored;
        }
      } catch {
        // Fallback
      }
    }

    return memoryLocations.get(userId) || DEFAULT_TIANMU_LOCATION;
  }

  async saveLocation(
    userId: string,
    latitude: number,
    longitude: number,
    title?: string,
    address?: string
  ): Promise<UserSavedLocation> {
    const loc: UserSavedLocation = {
      latitude,
      longitude,
      title: title || "分享位置",
      address: address || `座標 (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
      updatedAt: getTaiwanTimeString()
    };

    memoryLocations.set(userId, loc);

    if (this.kv) {
      try {
        await this.kv.put(`user:${userId}:location`, JSON.stringify(loc));
      } catch {
        // Fallback
      }
    }

    return loc;
  }

  hasRelativeLocationReference(text: string): boolean {
    const patterns = [
      /我現在位置/,
      /我現在的位置/,
      /我的位置/,
      /從這裡/,
      /從這/,
      /從目前位置/,
      /我所在地/,
      /現在在/,
      /目前位置/,
      /這裡/,
      /附近/,
      /這附近/,
      /周邊/
    ];
    return patterns.some((p) => p.test(text));
  }

  enrichPromptWithLocation(prompt: string, loc: UserSavedLocation): string {
    const locName = loc.title && loc.address && loc.title !== loc.address
      ? `${loc.title} (${loc.address})`
      : (loc.address || loc.title);
    const locationDescription = `${locName}（經度: ${loc.longitude}, 緯度: ${loc.latitude}，定位更新於: ${loc.updatedAt}）`;

    const enriched = prompt.replace(
      /(我現在的位置|我現在位置|我目前的位置|我目前位置|現在位置|我的位置|目前位置|從這裡|從這|我這裡|這裡|這附近)/g,
      `我的目前所在地【${locName}】`
    );

    return `【使用者目前確切位置】：${locationDescription}\n【使用者提問需求】：${enriched}`;
  }
}
