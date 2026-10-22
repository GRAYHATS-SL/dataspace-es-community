'use client';

import { useMemo } from 'react';

import { type AffectedEntity, type PriceAffectedOffering } from '@/components/molecules/TableRow';
import { useCatalogs } from '@/hooks/queries/useCatalogQueries';
import { useOwnCategories } from '@/hooks/queries/useCategoryQueries';
import { useOrganizations } from '@/hooks/queries/usePartyQueries';
import { useOwnProductOfferingPrices } from '@/hooks/queries/useProductOfferingPriceQueries';
import { useProductOfferings } from '@/hooks/queries/useProductOfferingQueries';
import {
  useAllProductSpecificationsQuery,
  useProductSpecifications,
} from '@/hooks/queries/useProductSpecificationQueries';
import { useResourceSpecifications } from '@/hooks/queries/useResourceSpecificationQueries';
import { useServiceSpecifications } from '@/hooks/queries/useServiceSpecificationQueries';

import type { TabId } from './constants';

type Dataset =
  | 'catalogs'
  | 'categories'
  | 'offerings'
  | 'productSpecs'
  | 'resourceSpecs'
  | 'serviceSpecs'
  | 'prices';

const ALL_DATASETS: readonly Dataset[] = [
  'catalogs',
  'categories',
  'offerings',
  'productSpecs',
  'resourceSpecs',
  'serviceSpecs',
  'prices',
];

// Lists each tab needs (its own + those it cross-references to compute references). Next runs server actions one at a time, so each extra list adds latency.
const DATASETS_BY_TAB = new Map<string, readonly Dataset[]>([
  ['catalogos', ['catalogs', 'categories']],
  ['categorias', ['categories', 'catalogs', 'offerings']],
  ['ofertas', ['offerings', 'productSpecs', 'categories']],
  ['especificaciones-producto', ['productSpecs', 'offerings']],
  ['especificaciones-recurso', ['resourceSpecs', 'productSpecs']],
  ['especificaciones-servicio', ['serviceSpecs', 'productSpecs']],
  ['precios', ['prices', 'offerings']],
]);

/**
 * @param activeTab - Active tab of `ofertas/`.
 */
export const useOfertasData = (activeTab: TabId) => {
  const needs = new Set(DATASETS_BY_TAB.get(activeTab) ?? ALL_DATASETS);
  const catalogsQuery = useCatalogs({ enabled: needs.has('catalogs') });
  const categoriesQuery = useOwnCategories({ enabled: needs.has('categories') });
  const offeringsQuery = useProductOfferings({ enabled: needs.has('offerings') });
  const productSpecsQuery = useProductSpecifications({ enabled: needs.has('productSpecs') });
  const allProductSpecsQuery = useAllProductSpecificationsQuery({
    enabled: activeTab === 'ofertas',
  });
  const orgsQuery = useOrganizations({ enabled: activeTab === 'ofertas' });
  const resourceSpecsQuery = useResourceSpecifications({ enabled: needs.has('resourceSpecs') });
  const serviceSpecsQuery = useServiceSpecifications({ enabled: needs.has('serviceSpecs') });
  const pricesQuery = useOwnProductOfferingPrices({ enabled: needs.has('prices') });

  const catalogs = catalogsQuery.data ?? [];
  const productSpecs = productSpecsQuery.data ?? [];
  const resourceSpecs = resourceSpecsQuery.data ?? [];
  const serviceSpecs = serviceSpecsQuery.data ?? [];

  // Offerings: no relatedParty — indirect filter by own specifications
  const ownedSpecIds = useMemo(
    () => new Set(productSpecs.map((s) => s.id).filter((id): id is string => !!id)),
    [productSpecs],
  );

  const offerings = useMemo(
    () =>
      (offeringsQuery.data ?? []).filter(
        (o) => o.productSpecification?.id && ownedSpecIds.has(o.productSpecification.id),
      ),
    [offeringsQuery.data, ownedSpecIds],
  );

  // Categories and prices: no relatedParty — ownership is resolved on the server (`fetchOwnCategories`, `getOwnProductOfferingPrices`), including newly created ones not yet linked.
  const categories = categoriesQuery.data ?? [];
  const prices = pricesQuery.data ?? [];

  const categoryCatalogRefs = useMemo(() => {
    const map = new Map<string, AffectedEntity[]>();
    (catalogsQuery.data ?? []).forEach((catalog) => {
      if (!catalog.id) return;
      (catalog.category ?? []).forEach((ref) => {
        if (!ref.id) return;
        const prev = map.get(ref.id) ?? [];
        prev.push({
          id: catalog.id!,
          name: catalog.name,
          currentCategories: catalog.category ?? [],
        });
        map.set(ref.id, prev);
      });
    });
    return map;
  }, [catalogsQuery.data]);

  const categoryOfferingRefs = useMemo(() => {
    const map = new Map<string, AffectedEntity[]>();
    (offeringsQuery.data ?? []).forEach((po) => {
      if (!po.id) return;
      (po.category ?? []).forEach((ref) => {
        if (!ref.id) return;
        const prev = map.get(ref.id) ?? [];
        prev.push({ id: po.id!, name: po.name, currentCategories: po.category ?? [] });
        map.set(ref.id, prev);
      });
    });
    return map;
  }, [offeringsQuery.data]);

  const productSpecOfferingRefs = useMemo(() => {
    const map = new Map<string, { id: string; name?: string }[]>();
    (offeringsQuery.data ?? []).forEach((po) => {
      const specId = po.productSpecification?.id;
      if (!specId || !po.id) return;
      const prev = map.get(specId) ?? [];
      prev.push({ id: po.id, name: po.name });
      map.set(specId, prev);
    });
    return map;
  }, [offeringsQuery.data]);

  const resourceSpecProductSpecRefs = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name?: string; currentRefs: { id?: string; href?: string; name?: string }[] }[]
    >();
    (productSpecsQuery.data ?? []).forEach((ps) => {
      if (!ps.id) return;
      (ps.resourceSpecification ?? []).forEach((ref) => {
        if (!ref.id) return;
        const prev = map.get(ref.id) ?? [];
        prev.push({ id: ps.id!, name: ps.name, currentRefs: ps.resourceSpecification ?? [] });
        map.set(ref.id, prev);
      });
    });
    return map;
  }, [productSpecsQuery.data]);

  const serviceSpecProductSpecRefs = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name?: string; currentRefs: { id?: string; href?: string; name?: string }[] }[]
    >();
    (productSpecsQuery.data ?? []).forEach((ps) => {
      if (!ps.id) return;
      (ps.serviceSpecification ?? []).forEach((ref) => {
        if (!ref.id) return;
        const prev = map.get(ref.id) ?? [];
        prev.push({ id: ps.id!, name: ps.name, currentRefs: ps.serviceSpecification ?? [] });
        map.set(ref.id, prev);
      });
    });
    return map;
  }, [productSpecsQuery.data]);

  // Map of specification id → full specification, to read/update `tokenOfferConfig` in `OfferingList` without losing the other characteristics on PATCH.
  const specById = useMemo(() => {
    const map = new Map<string, (typeof productSpecs)[number]>();
    productSpecs.forEach((spec) => {
      if (spec.id) map.set(spec.id, spec);
    });
    return map;
  }, [productSpecs]);

  const publisherBySpecId = useMemo(() => {
    const orgById = new Map(
      (orgsQuery.data ?? []).map((o) => [o.id, o.tradingName ?? o.name ?? o.id]),
    );
    const map = new Map<string, string>();
    (allProductSpecsQuery.data ?? []).forEach((spec) => {
      if (!spec.id) return;
      const orgId = spec.relatedParty?.[0]?.id;
      if (!orgId) return;
      map.set(spec.id, orgById.get(orgId) ?? orgId);
    });
    return map;
  }, [allProductSpecsQuery.data, orgsQuery.data]);

  const priceOfferingRefs = useMemo(() => {
    const map = new Map<string, PriceAffectedOffering[]>();
    (offeringsQuery.data ?? []).forEach((po) => {
      if (!po.id) return;
      (po.productOfferingPrice ?? []).forEach((ref) => {
        if (!ref.id) return;
        const prev = map.get(ref.id) ?? [];
        prev.push({ id: po.id!, name: po.name, currentPrices: po.productOfferingPrice ?? [] });
        map.set(ref.id, prev);
      });
    });
    return map;
  }, [offeringsQuery.data]);

  return {
    catalogsQuery,
    categoriesQuery,
    offeringsQuery,
    productSpecsQuery,
    resourceSpecsQuery,
    serviceSpecsQuery,
    pricesQuery,
    catalogs,
    categories,
    offerings,
    productSpecs,
    resourceSpecs,
    serviceSpecs,
    prices,
    categoryCatalogRefs,
    categoryOfferingRefs,
    productSpecOfferingRefs,
    resourceSpecProductSpecRefs,
    serviceSpecProductSpecRefs,
    priceOfferingRefs,
    publisherBySpecId,
    specById,
  };
};
