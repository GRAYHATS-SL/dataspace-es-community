'use client';

import { useEffect, useMemo, useState } from 'react';

import { useProductInventoryForOffering } from '@/hooks/queries/useProductInventoryQueries';
import { useProductOfferingPrices } from '@/hooks/queries/useProductOfferingPriceQueries';
import { useProductSpecification } from '@/hooks/queries/useProductSpecificationQueries';
import {
  extractTokenOfferConfig,
  type TokenOfferConfig,
  type TokenPricingMode,
} from '@/lib/utils/tokenOfferConfig';
import { deriveDemand, quote, type TokenPricingParams } from '@/lib/utils/tokenQuote';
import type { ProductOffering } from '@/types/api';

const parseTokenPricingParams = (raw: string | undefined): TokenPricingParams | undefined => {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof (parsed as TokenPricingParams).P0 === 'number'
    ) {
      return parsed as TokenPricingParams;
    }
  } catch {
    // description is not a serialized TokenPricingParams.
  }
  return undefined;
};

export interface TokenOfferingQuote {
  isTokenized: boolean;
  config?: TokenOfferConfig;
  params?: TokenPricingParams;
  /** Derived: 'dinamico' if the price has a parseable `pricingLogicAlgorithm`, else 'fijo'. */
  pricingMode?: TokenPricingMode;
  /** Sold units (v), derived from existing `Product`s referencing this offering. */
  sold: number;
  /** Current quote, or `null` if the offering is not tokenized or parameters are missing. */
  price: number | null;
  isExhausted: boolean;
}

/**
 * Resolves whether a `ProductOffering` is tokenized and, if so, its current quote.
 *
 * @param options.enabled - Set to `false` on public pages without a session.
 */
export const useTokenOfferingQuote = (
  offering: ProductOffering | null,
  options?: { enabled?: boolean },
): TokenOfferingQuote => {
  const enabled = options?.enabled ?? true;
  const specId = offering?.productSpecification?.id;
  const { data: spec } = useProductSpecification(specId ?? '', { enabled });
  const { data: allPrices = [] } = useProductOfferingPrices({ enabled });

  const config = extractTokenOfferConfig(spec);

  const priceIds = new Set((offering?.productOfferingPrice ?? []).map((p) => p.id));
  const offeringPrice = allPrices.find((p) => p.id && priceIds.has(p.id));
  const params = parseTokenPricingParams(offeringPrice?.pricingLogicAlgorithm?.[0]?.description);

  // Inventory is only needed to quote dynamic prices. Also `productInventory` is ADMIN-only in v2 (403 for SELLER/BUYER): no retries, and if it fails it falls back to the base price.
  const { data: allProducts = [], isError: inventoryFailed } = useProductInventoryForOffering(
    offering?.id ?? '',
    { enabled: enabled && !!params, retry: false },
  );

  const offeringProducts = useMemo(
    () => allProducts.filter((p) => p.productOffering?.id === offering?.id),
    [allProducts, offering?.id],
  );

  const sold = offeringProducts.length;

  // Periodic recalculation to reflect the decay of D(t) without reloading the page.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(id);
  }, []);

  const demand = useMemo(() => {
    const purchases = offeringProducts
      .map((p) => new Date(p.startDate ?? p.orderDate ?? '').getTime())
      .filter((t) => !Number.isNaN(t) && t > 0)
      .map((timestamp) => ({ timestamp }));
    return deriveDemand(purchases, now);
  }, [offeringProducts, now]);

  if (!config) {
    return { isTokenized: false, sold, price: null, isExhausted: false };
  }

  // Fixed/dynamic mode is 100% of the price: dynamic if it carries serialized parameters, fixed otherwise — not persisted separately in the ProductSpecification.
  const pricingMode: TokenPricingMode = params ? 'dinamico' : 'fijo';
  const isExhausted = config.supplyMode === 'escaso' && !!config.supply && sold >= config.supply;
  const price =
    params && !inventoryFailed
      ? quote({ pricingMode }, params, sold, demand)
      : (offeringPrice?.price?.value ?? null);

  return { isTokenized: true, config, params, pricingMode, sold, price, isExhausted };
};
