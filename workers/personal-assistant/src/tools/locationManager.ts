import { getTaiwanTimeString } from "../utils/time";

export interface UserSavedLocation {
  latitude: number;
  longitude: number;
  title: string;
  address: string;
  updatedAt: string;
}

const DEFAULT_TIANMU_LOCATION: UserSavedLocation = {
  latitude: 25.1119,
  longitude: 121.5312,
  title: "天母住家",
  address: "台北市士林區天母忠誠路二段（天母棒球場/高島屋周邊）",
  updatedAt: "預設常駐位置"
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
      /我的位置/,
      /從這裡/,
      /從這/,
      /從目前位置/,
      /我所在地/,
      /現在在/,
      /附近/
    ];
    return patterns.some((p) => p.test(text));
  }
}
