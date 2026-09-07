export type ModelTier = "strong" | "light" | "balanced";

export const WEIGHTED_STRONG_POOL = [
  "gemini-3.5-flash-lite", // 1 (500 RPD)
  "gemini-3.8-flash",      // 2 (20 RPD)
  "gemini-3.5-flash-lite", // 3 (500 RPD)
  "gemini-3.7-flash",      // 4 (20 RPD)
  "gemini-3.5-flash-lite", // 5 (500 RPD)
  "gemini-3.6-flash",      // 6 (20 RPD)
  "gemini-3.5-flash-lite", // 7 (500 RPD)
  "gemini-3.5-flash",      // 8 (20 RPD)
  "gemini-3.5-flash-lite", // 9 (500 RPD)
  "gemini-3.5-flash-lite", // 10 (500 RPD)
  "gemini-3.5-flash-lite", // 11 (500 RPD)
  "gemini-3.5-flash-lite"  // 12 (500 RPD)
] as const;

export const WEIGHTED_LIGHT_POOL = [
  "gemini-3.1-flash-lite", // 1
  "gemini-3.1-flash-lite", // 2
  "gemini-3.5-flash-lite", // 3
  "gemini-3.1-flash-lite", // 4
  "gemini-3.1-flash-lite", // 5
  "gemini-3.5-flash-lite", // 6
  "gemini-3.1-flash-lite", // 7
  "gemini-3.1-flash-lite"  // 8
] as const;

export const WEIGHTED_BALANCED_POOL = [
  "gemini-3.5-flash-lite", // 1
  "gemini-3.1-flash-lite", // 2
  "gemini-3.8-flash",      // 3
  "gemini-3.1-flash-lite", // 4
  "gemini-3.7-flash",      // 5
  "gemini-3.5-flash",      // 6
  "gemini-3.5-flash-lite", // 7
  "gemini-3.1-flash-lite", // 8
  "gemini-3.6-flash",      // 9
  "gemini-3.1-flash-lite", // 10
  "gemini-3.5-flash",      // 11
  "gemini-3.5-flash-lite"  // 12
] as const;

export type StrongModel = (typeof WEIGHTED_STRONG_POOL)[number];
export type LightModel = (typeof WEIGHTED_LIGHT_POOL)[number];
export type BalancedModel = (typeof WEIGHTED_BALANCED_POOL)[number];
export type AvailableModel = StrongModel | LightModel;

let strongIndex = 0;
let lightIndex = 0;
let balancedIndex = 0;

export class ModelLoadBalancer {
  static pickNextModel(tier: ModelTier = "balanced"): AvailableModel {
    if (tier === "strong") {
      const model = WEIGHTED_STRONG_POOL[strongIndex % WEIGHTED_STRONG_POOL.length];
      strongIndex = (strongIndex + 1) % WEIGHTED_STRONG_POOL.length;
      return model;
    }

    if (tier === "light") {
      const model = WEIGHTED_LIGHT_POOL[lightIndex % WEIGHTED_LIGHT_POOL.length];
      lightIndex = (lightIndex + 1) % WEIGHTED_LIGHT_POOL.length;
      return model;
    }

    const model = WEIGHTED_BALANCED_POOL[balancedIndex % WEIGHTED_BALANCED_POOL.length];
    balancedIndex = (balancedIndex + 1) % WEIGHTED_BALANCED_POOL.length;
    return model;
  }

  static getModelChain(tier: ModelTier = "balanced", preferredModel?: string): AvailableModel[] {
    const rawPool =
      tier === "strong"
        ? WEIGHTED_STRONG_POOL
        : tier === "light"
        ? WEIGHTED_LIGHT_POOL
        : WEIGHTED_BALANCED_POOL;

    const startModel =
      preferredModel && (rawPool as readonly string[]).includes(preferredModel)
        ? (preferredModel as AvailableModel)
        : this.pickNextModel(tier);

    const uniqueChain: AvailableModel[] = [startModel];
    for (const m of rawPool) {
      if (!uniqueChain.includes(m as AvailableModel)) {
        uniqueChain.push(m as AvailableModel);
      }
    }

    return uniqueChain;
  }
}
