import { PRICING_ENGINE_DEFAULTS } from '@/lib/config/pricingEngine';

import type { TokenPricingMode } from './tokenOfferConfig';

/** Quote parameters set by the offering owner. */
export interface TokenPricingParams {
  /** Base price (P0). */
  P0: number;
  /** Supply (N); absent means unlimited. */
  N?: number;
  /** Scarcity curve exponent (γ). */
  gamma: number;
  /** Demand sensitivity (kd). */
  kd: number;
  /** Quote floor (Pmin). */
  floor: number;
  /** Quote cap (Pmax). */
  cap: number;
}

const clamp = (x: number, min: number, max: number): number => Math.max(min, Math.min(max, x));

/** Quote at instant t: C(t) = clamp(P0 · Me(v) · Md(t), floor, cap). */
export function quote(
  config: { pricingMode: TokenPricingMode },
  params: TokenPricingParams,
  v: number,
  D: number,
): number {
  if (config.pricingMode === 'fijo') return params.P0;

  const soldFrac = params.N ? clamp(v / params.N, 0, 1) : 0;
  const scarcityMult = 1 + PRICING_ENGINE_DEFAULTS.ke * soldFrac ** params.gamma;
  const demandMult = 1 + params.kd * D;
  return clamp(params.P0 * scarcityMult * demandMult, params.floor, params.cap);
}

export interface DemandPurchase {
  /** Purchase time, in ms since epoch. */
  timestamp: number;
}

/** Derives the demand index D(t) as a sum of decayed purchase contributions. */
export function deriveDemand(purchases: DemandPurchase[], now: number): number {
  const { d0, beta, lambda } = PRICING_ENGINE_DEFAULTS;
  const halfLifeHours = Math.LN2 / lambda;
  const windowMs = halfLifeHours * 6 * 60 * 60 * 1000;

  const contribution = purchases.reduce((sum, { timestamp }) => {
    const deltaMs = now - timestamp;
    if (deltaMs < 0 || deltaMs > windowMs) return sum;
    const deltaHours = deltaMs / (60 * 60 * 1000);
    return sum + beta * Math.exp(-lambda * deltaHours);
  }, 0);

  return d0 + contribution;
}
