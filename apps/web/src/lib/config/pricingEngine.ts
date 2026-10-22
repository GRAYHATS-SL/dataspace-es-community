/** Platform constants for the dynamic token pricing engine. */
export interface PricingEngineConfig {
  /** Scarcity coefficient (ke). */
  ke: number;
  /** Demand boost per purchase (β). */
  beta: number;
  /** Demand decay rate, in hours^-1 (λ). */
  lambda: number;
  /** Demand baseline (D0). */
  d0: number;
}

export const PRICING_ENGINE_DEFAULTS: PricingEngineConfig = {
  ke: 1.4,
  beta: 0.4,
  lambda: Math.LN2 / 6,
  d0: 0,
};
