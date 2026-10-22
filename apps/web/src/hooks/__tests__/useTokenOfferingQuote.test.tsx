import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useProductInventoryForOffering } from '@/hooks/queries/useProductInventoryQueries';
import { useProductOfferingPrices } from '@/hooks/queries/useProductOfferingPriceQueries';
import { useProductSpecification } from '@/hooks/queries/useProductSpecificationQueries';
import { useTokenOfferingQuote } from '@/hooks/useTokenOfferingQuote';
import { TOKEN_OFFER_CONFIG_CHAR_ID, type TokenOfferConfig } from '@/lib/utils/tokenOfferConfig';
import type { TokenPricingParams } from '@/lib/utils/tokenQuote';
import type {
  ProductInventory,
  ProductOffering,
  ProductOfferingPrice,
  ProductSpecification,
} from '@/types/api';

vi.mock('@/hooks/queries/useProductInventoryQueries', () => ({
  useProductInventoryForOffering: vi.fn(),
}));
vi.mock('@/hooks/queries/useProductOfferingPriceQueries', () => ({
  useProductOfferingPrices: vi.fn(),
}));
vi.mock('@/hooks/queries/useProductSpecificationQueries', () => ({
  useProductSpecification: vi.fn(),
}));

const OFFERING_ID = 'offering-1';
const SPEC_ID = 'spec-1';
const PRICE_ID = 'price-1';

const buildOffering = (): ProductOffering =>
  ({
    id: OFFERING_ID,
    productSpecification: { id: SPEC_ID },
    productOfferingPrice: [{ id: PRICE_ID }],
  }) as ProductOffering;

const buildTokenizedSpec = (config: Partial<TokenOfferConfig> = {}): ProductSpecification =>
  ({
    id: SPEC_ID,
    productSpecCharacteristic: [
      {
        id: TOKEN_OFFER_CONFIG_CHAR_ID,
        name: 'Configuración de tokenización',
        valueType: 'object',
        productSpecCharacteristicValue: [
          {
            isDefault: true,
            value: {
              maxRequests: 1000,
              maxTransferTB: 5,
              supplyMode: 'abundante',
              tokenOfferStatus: 'published',
              ...config,
            },
          },
        ],
      },
    ],
  }) as ProductSpecification;

const buildPrice = (description?: string, value = 42): ProductOfferingPrice =>
  ({
    id: PRICE_ID,
    price: { value, unit: 'EUR' },
    pricingLogicAlgorithm: description ? [{ description }] : undefined,
  }) as ProductOfferingPrice;

const buildProduct = (offeringId: string | undefined, id: string): ProductInventory =>
  ({ id, productOffering: offeringId ? { id: offeringId } : undefined }) as ProductInventory;

const DYNAMIC_PARAMS: TokenPricingParams = {
  P0: 10,
  N: 100,
  gamma: 1.8,
  kd: 0.2,
  floor: 5,
  cap: 100,
};

function mockQueries({
  spec,
  prices = [],
  products = [],
  enabled,
}: {
  spec: ProductSpecification | undefined;
  prices?: ProductOfferingPrice[];
  products?: ProductInventory[];
  enabled?: boolean;
}) {
  vi.mocked(useProductSpecification).mockReturnValue({ data: spec } as never);
  vi.mocked(useProductOfferingPrices).mockReturnValue({ data: prices } as never);
  vi.mocked(useProductInventoryForOffering).mockReturnValue({ data: products } as never);
  return { enabled };
}

beforeEach(() => {
  vi.resetAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useTokenOfferingQuote', () => {
  it('returns isTokenized: false and price: null when offering is null', () => {
    mockQueries({ spec: undefined });
    const { result } = renderHook(() => useTokenOfferingQuote(null));

    expect(result.current.isTokenized).toBe(false);
    expect(result.current.price).toBeNull();
  });

  it('is not tokenized (but still computes sold) when extractTokenOfferConfig finds no config', () => {
    const offering = buildOffering();
    const spec = { id: SPEC_ID, productSpecCharacteristic: [] } as ProductSpecification;
    mockQueries({
      spec,
      products: [buildProduct(OFFERING_ID, 'p1'), buildProduct(OFFERING_ID, 'p2'), buildProduct('other', 'p3')],
    });

    const { result } = renderHook(() => useTokenOfferingQuote(offering));

    expect(result.current.isTokenized).toBe(false);
    expect(result.current.sold).toBe(2);
    expect(result.current.isExhausted).toBe(false);
    expect(result.current.price).toBeNull();
  });

  it('is dinamico and derives price via quote() when pricingLogicAlgorithm[0].description is valid JSON with numeric P0', () => {
    const offering = buildOffering();
    const spec = buildTokenizedSpec();
    const prices = [buildPrice(JSON.stringify(DYNAMIC_PARAMS))];
    mockQueries({ spec, prices, products: [] });

    const { result } = renderHook(() => useTokenOfferingQuote(offering));

    expect(result.current.isTokenized).toBe(true);
    expect(result.current.pricingMode).toBe('dinamico');
    expect(result.current.price).not.toBeNull();
    // At v=0 and baseline demand, price should differ from a flat P0-only fixed value in general, but must be a finite number within [floor, cap].
    expect(result.current.price).toBeGreaterThanOrEqual(DYNAMIC_PARAMS.floor);
    expect(result.current.price).toBeLessThanOrEqual(DYNAMIC_PARAMS.cap);
  });

  it('is fijo and falls back to offeringPrice.price.value when there are no parseable pricing params', () => {
    const offering = buildOffering();
    const spec = buildTokenizedSpec();
    const prices = [buildPrice(undefined, 77)];
    mockQueries({ spec, prices, products: [] });

    const { result } = renderHook(() => useTokenOfferingQuote(offering));

    expect(result.current.isTokenized).toBe(true);
    expect(result.current.pricingMode).toBe('fijo');
    expect(result.current.price).toBe(77);
  });

  it('falls back to fijo mode without throwing when pricingLogicAlgorithm description is malformed JSON', () => {
    const offering = buildOffering();
    const spec = buildTokenizedSpec();
    const prices = [buildPrice('{not valid json', 55)];
    mockQueries({ spec, prices, products: [] });

    expect(() => renderHook(() => useTokenOfferingQuote(offering))).not.toThrow();
    const { result } = renderHook(() => useTokenOfferingQuote(offering));

    expect(result.current.pricingMode).toBe('fijo');
    expect(result.current.price).toBe(55);
  });

  it('falls back to fijo mode when the parsed JSON is missing a numeric P0', () => {
    const offering = buildOffering();
    const spec = buildTokenizedSpec();
    const prices = [buildPrice(JSON.stringify({ gamma: 1.8, kd: 0.2 }), 33)];
    mockQueries({ spec, prices, products: [] });

    const { result } = renderHook(() => useTokenOfferingQuote(offering));

    expect(result.current.pricingMode).toBe('fijo');
    expect(result.current.price).toBe(33);
  });

  it('computes sold as the count of allProducts whose productOffering.id matches offering.id', () => {
    const offering = buildOffering();
    const spec = buildTokenizedSpec();
    const products = [
      buildProduct(OFFERING_ID, 'p1'),
      buildProduct(OFFERING_ID, 'p2'),
      buildProduct(OFFERING_ID, 'p3'),
      buildProduct('another-offering', 'p4'),
      buildProduct(undefined, 'p5'),
    ];
    mockQueries({ spec, prices: [buildPrice(undefined, 10)], products });

    const { result } = renderHook(() => useTokenOfferingQuote(offering));

    expect(result.current.sold).toBe(3);
  });

  it('isExhausted is true only when supplyMode is escaso, supply is set, and sold >= supply', () => {
    const offering = buildOffering();
    const spec = buildTokenizedSpec({ supplyMode: 'escaso', supply: 2 });
    const products = [buildProduct(OFFERING_ID, 'p1'), buildProduct(OFFERING_ID, 'p2')];
    mockQueries({ spec, prices: [buildPrice(undefined, 10)], products });

    const { result } = renderHook(() => useTokenOfferingQuote(offering));

    expect(result.current.isExhausted).toBe(true);
  });

  it('isExhausted is false when supplyMode is escaso but sold < supply', () => {
    const offering = buildOffering();
    const spec = buildTokenizedSpec({ supplyMode: 'escaso', supply: 5 });
    const products = [buildProduct(OFFERING_ID, 'p1')];
    mockQueries({ spec, prices: [buildPrice(undefined, 10)], products });

    const { result } = renderHook(() => useTokenOfferingQuote(offering));

    expect(result.current.isExhausted).toBe(false);
  });

  it('isExhausted is false when supplyMode is escaso but supply is unset, even if sold is high', () => {
    const offering = buildOffering();
    const spec = buildTokenizedSpec({ supplyMode: 'escaso', supply: undefined });
    const products = [buildProduct(OFFERING_ID, 'p1'), buildProduct(OFFERING_ID, 'p2')];
    mockQueries({ spec, prices: [buildPrice(undefined, 10)], products });

    const { result } = renderHook(() => useTokenOfferingQuote(offering));

    expect(result.current.isExhausted).toBe(false);
  });

  it('isExhausted is false when supplyMode is abundante regardless of sold vs. supply-like values', () => {
    const offering = buildOffering();
    const spec = buildTokenizedSpec({ supplyMode: 'abundante', supply: 1 });
    const products = [buildProduct(OFFERING_ID, 'p1'), buildProduct(OFFERING_ID, 'p2')];
    mockQueries({ spec, prices: [buildPrice(undefined, 10)], products });

    const { result } = renderHook(() => useTokenOfferingQuote(offering));

    expect(result.current.isExhausted).toBe(false);
  });

  it('passes options.enabled through to all three underlying query hooks', () => {
    const offering = buildOffering();
    mockQueries({ spec: undefined, enabled: false });

    renderHook(() => useTokenOfferingQuote(offering, { enabled: false }));

    expect(vi.mocked(useProductSpecification)).toHaveBeenCalledWith(SPEC_ID, { enabled: false });
    expect(vi.mocked(useProductOfferingPrices)).toHaveBeenCalledWith({ enabled: false });
    expect(vi.mocked(useProductInventoryForOffering)).toHaveBeenCalledWith(OFFERING_ID, {
      enabled: false,
      retry: false,
    });
  });

  it('defaults enabled to true when options are omitted', () => {
    const offering = buildOffering();
    mockQueries({ spec: undefined });

    renderHook(() => useTokenOfferingQuote(offering));

    expect(vi.mocked(useProductSpecification)).toHaveBeenCalledWith(SPEC_ID, { enabled: true });
    expect(vi.mocked(useProductOfferingPrices)).toHaveBeenCalledWith({ enabled: true });
    // Without dynamic pricing the inventory is not requested (productInventory is ADMIN-only in v2).
    expect(vi.mocked(useProductInventoryForOffering)).toHaveBeenCalledWith(OFFERING_ID, {
      enabled: false,
      retry: false,
    });
  });

  it('pide el inventario solo cuando el precio es dinámico', () => {
    const offering = buildOffering();
    mockQueries({ spec: buildTokenizedSpec(), prices: [buildPrice(JSON.stringify(DYNAMIC_PARAMS))] });

    renderHook(() => useTokenOfferingQuote(offering));

    expect(vi.mocked(useProductInventoryForOffering)).toHaveBeenCalledWith(OFFERING_ID, {
      enabled: true,
      retry: false,
    });
  });

  it('recalculates the dynamic price over time via the 5s setInterval (demand decay)', () => {
    vi.useFakeTimers();
    const offering = buildOffering();
    const spec = buildTokenizedSpec();
    const now = Date.now();
    const products = [
      { ...buildProduct(OFFERING_ID, 'p1'), startDate: new Date(now).toISOString() } as ProductInventory,
    ];
    mockQueries({ spec, prices: [buildPrice(JSON.stringify(DYNAMIC_PARAMS))], products });

    const { result } = renderHook(() => useTokenOfferingQuote(offering));
    const priceAtStart = result.current.price;

    // Advance well past several demand half-lives so D(t) decays meaningfully.
    act(() => {
      vi.advanceTimersByTime(5000 * 20);
    });

    // The hook must still produce a valid, bounded price after recalculation.
    expect(result.current.price).not.toBeNull();
    expect(result.current.price).toBeGreaterThanOrEqual(DYNAMIC_PARAMS.floor);
    expect(result.current.price).toBeLessThanOrEqual(DYNAMIC_PARAMS.cap);
    expect(priceAtStart).not.toBeNull();
  });
});
