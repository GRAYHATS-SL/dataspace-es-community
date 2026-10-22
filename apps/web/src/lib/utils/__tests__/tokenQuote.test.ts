import { describe, expect, it } from 'vitest';

import { deriveDemand, quote, type TokenPricingParams } from '../tokenQuote';

const BASE_PARAMS: TokenPricingParams = {
  P0: 25,
  N: 20,
  gamma: 1.8,
  kd: 0.6,
  floor: 25,
  cap: 75,
};

describe('quote', () => {
  it('returns P0 unchanged in fixed mode regardless of v/D', () => {
    expect(quote({ pricingMode: 'fijo' }, BASE_PARAMS, 15, 2)).toBe(25);
  });

  // Truth table with P0=25, N=20, ke=1.4, gamma=1.8, kd=0.6, floor=25, cap=75. 1-decimal tolerance: the table values round Me/Md to 3 decimals before multiplying, while `quote` computes at full precision — they differ by cents.
  it.each([
    ['Inicial (sin demanda)', 0, 0, 25],
    ['Demanda moderada', 6, 0.12, 31.09],
    ['Pico de demanda', 6, 0.8, 42.92],
    ['Suministro casi agotado', 18, 0.2, 60.42],
    ['Último token + demanda alta', 19, 0.5, 73.99],
    ['Límite superior (acotado al techo)', 20, 0.5, 75],
  ])('%s: v=%i, D=%f -> %f €', (_label, v, D, expected) => {
    expect(quote({ pricingMode: 'dinamico' }, BASE_PARAMS, v, D)).toBeCloseTo(expected, 1);
  });

  it('never goes below floor when v=0 and D is very negative', () => {
    expect(quote({ pricingMode: 'dinamico' }, BASE_PARAMS, 0, -10)).toBe(BASE_PARAMS.floor);
  });

  it('never exceeds cap when v=N and D is very high', () => {
    expect(quote({ pricingMode: 'dinamico' }, BASE_PARAMS, 20, 10)).toBe(BASE_PARAMS.cap);
  });

  it('applies Me=1 (no scarcity pressure) when supply is unlimited (N undefined)', () => {
    const unlimited: TokenPricingParams = { ...BASE_PARAMS, N: undefined };
    // Me=1 always, whatever v is -> the price depends only on demand.
    expect(quote({ pricingMode: 'dinamico' }, unlimited, 1000, 0)).toBe(
      quote({ pricingMode: 'dinamico' }, unlimited, 0, 0),
    );
    expect(quote({ pricingMode: 'dinamico' }, unlimited, 500, 0.12)).toBeCloseTo(25 * 1.072, 2);
  });
});

describe('deriveDemand', () => {
  it('returns D0 with no purchases', () => {
    expect(deriveDemand([], Date.now())).toBe(0);
  });

  it('adds a full impulse (beta) for a purchase at t=now', () => {
    const now = Date.now();
    expect(deriveDemand([{ timestamp: now }], now)).toBeCloseTo(0.4, 5);
  });

  it('decays the contribution of older purchases toward the baseline', () => {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const recent = deriveDemand([{ timestamp: now }], now);
    const decayed = deriveDemand([{ timestamp: oneHourAgo }], now);
    expect(decayed).toBeLessThan(recent);
    expect(decayed).toBeGreaterThan(0);
  });

  it('ignores purchases in the future or outside the half-life window', () => {
    const now = Date.now();
    const future = now + 1000;
    const farPast = now - 1000 * 60 * 60 * 24 * 365;
    expect(deriveDemand([{ timestamp: future }], now)).toBe(0);
    expect(deriveDemand([{ timestamp: farPast }], now)).toBe(0);
  });

  it('sums contributions from multiple recent purchases', () => {
    const now = Date.now();
    const single = deriveDemand([{ timestamp: now }], now);
    const triple = deriveDemand([{ timestamp: now }, { timestamp: now }, { timestamp: now }], now);
    expect(triple).toBeCloseTo(single * 3, 5);
  });
});
