export type ModelTier = "strong" | "light" | "balanced";

/**
 * High-performance reasoning & STEM models
 */
export const STRONG_MODEL_POOL = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash"
] as const;

/**
 * Fast, high-quota lightweight models
 */
export const LIGHT_MODEL_POOL = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash"
] as const;

/**
 * Balanced pool: Interleaved 1:1 ratio between High & Low models for equal load distribution
 */
export const BALANCED_MODEL_POOL = [
  "gemini-3.8-flash",
  "gemini-3.5-flash-lite",
  "gemini-3.7-flash",
  "gemini-3.1-flash-lite",
  "gemini-3.6-flash",
  "gemini-2.5-flash",
  "gemini-3.5-flash"
] as const;

/**
 * Dedicated top-tier Gemma model for raw information processing and note structuring
 */
export const GEMMA_ORGANIZER_MODEL = "gemma-4-31b-it";

export type StrongModel = (typeof STRONG_MODEL_POOL)[number];
export type LightModel = (typeof LIGHT_MODEL_POOL)[number];
export type BalancedModel = (typeof BALANCED_MODEL_POOL)[number];
export type AvailableModel = StrongModel | LightModel | typeof GEMMA_ORGANIZER_MODEL;

// Round-robin index counters per isolate
let strongIndex = 0;
let lightIndex = 0;
let balancedIndex = 0;

export class ModelLoadBalancer {
  /**
   * Pick next model with round-robin load balancing.
   * "balanced" alternates evenly between High and Low tiers (50% : 50%).
   */
  static pickNextModel(tier: ModelTier = "balanced"): AvailableModel {
    if (tier === "strong") {
      const model = STRONG_MODEL_POOL[strongIndex % STRONG_MODEL_POOL.length];
      strongIndex = (strongIndex + 1) % STRONG_MODEL_POOL.length;
      return model;
    }

    if (tier === "light") {
      const model = LIGHT_MODEL_POOL[lightIndex % LIGHT_MODEL_POOL.length];
      lightIndex = (lightIndex + 1) % LIGHT_MODEL_POOL.length;
      return model;
    }

    // Balanced tier: 1:1 High vs Low interleaved
    const model = BALANCED_MODEL_POOL[balancedIndex % BALANCED_MODEL_POOL.length];
    balancedIndex = (balancedIndex + 1) % BALANCED_MODEL_POOL.length;
    return model;
  }

  /**
   * Get failover candidate chain for a tier.
   */
  static getModelChain(tier: ModelTier = "balanced", preferredModel?: string): AvailableModel[] {
    let pool: AvailableModel[];
    if (tier === "strong") {
      pool = [...STRONG_MODEL_POOL];
    } else if (tier === "light") {
      pool = [...LIGHT_MODEL_POOL];
    } else {
      pool = [...BALANCED_MODEL_POOL];
    }

    if (preferredModel && pool.includes(preferredModel as AvailableModel)) {
      return [
        preferredModel as AvailableModel,
        ...pool.filter((m) => m !== preferredModel)
      ];
    }

    const startModel = this.pickNextModel(tier);
    return [
      startModel,
      ...pool.filter((m) => m !== startModel)
    ];
  }
}
