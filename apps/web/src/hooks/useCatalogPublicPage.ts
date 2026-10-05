'use client';

import { useMemo } from 'react';

import {
  useCurrentSessionQuery,
  useLaunchedCatalogs,
  useLaunchedCatalogsPublic,
  useProductOfferingPrices,
  useProductOfferingPricesPublicQuery,
  useProductOfferings,
  useProductOfferingsPublic,
  useProductSpecifications,
  useProductSpecificationsAllPublicQuery,
} from '@/hooks/queries';
import {
  deriveFilterOptions,
  type FilterLookups,
  type FilterOptions,
  filterOfferings,
  type OfferingFilters,
} from '@/lib/utils/filterOfferings';
import type { ProductOffering } from '@/types/api';

import { useCatalogPublicFilters } from './useCatalogPublicFilters';
import { useIsOwnOffering } from './useIsOwnOffering';
import { usePagination } from './usePagination';

const PAGE_SIZE = 12;

/** Return value of `useCatalogPublicPage`. */
export interface UseCatalogPublicPageReturn {
  filters: OfferingFilters;
  filterOptions: FilterOptions;
  activeFilterCount: number;
  isOwnOffering: (offering: ProductOffering) => boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: Error | null;
  isFiltering: boolean;
  hasResults: boolean;
  paginatedOfferings: ProductOffering[];
  totalItems: number;
  currentPage: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  setFilters: (partial: Partial<OfferingFilters>) => void;
  clearAllFilters: () => void;
  goToPage: (page: number) => void;
}

/** Builds a Map from a list of entities by id. */
function indexById<T extends { id?: string }>(items: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) if (item.id) map.set(item.id, item);
  return map;
}

/** Orchestrates the public catalog: data loading, client-side filters and URL pagination. */
export const useCatalogPublicPage = (): UseCatalogPublicPageReturn => {
  const { data: session, isLoading: isSessionLoading } = useCurrentSessionQuery();
  const isAuthenticated = session?.ok ?? false;
  const fetchPublic = !isSessionLoading && !isAuthenticated;
  const fetchAuth = !isSessionLoading && isAuthenticated;

  const catalogsPublic = useLaunchedCatalogsPublic({ enabled: fetchPublic });
  const catalogsAuth = useLaunchedCatalogs({ enabled: fetchAuth });
  const offeringsPublic = useProductOfferingsPublic({ enabled: fetchPublic });
  const offeringsAuth = useProductOfferings({ enabled: fetchAuth });
  const pricesPublic = useProductOfferingPricesPublicQuery({ enabled: fetchPublic });
  const pricesAuth = useProductOfferingPrices({ enabled: fetchAuth });
  const specsPublic = useProductSpecificationsAllPublicQuery({ enabled: fetchPublic });
  const specsAuth = useProductSpecifications({ enabled: fetchAuth });

  const catalogsQuery = isAuthenticated ? catalogsAuth : catalogsPublic;
  const offeringsQuery = isAuthenticated ? offeringsAuth : offeringsPublic;
  const pricesQuery = isAuthenticated ? pricesAuth : pricesPublic;
  const specsQuery = isAuthenticated ? specsAuth : specsPublic;

  const { isOwnOffering, isLoading: isOwnLoading } = useIsOwnOffering();
  const { filters, setFilters, clearAllFilters, activeFilterCount } = useCatalogPublicFilters();

  const catalogs = useMemo(() => catalogsQuery.data ?? [], [catalogsQuery.data]);
  const allOfferings = useMemo(() => offeringsQuery.data ?? [], [offeringsQuery.data]);

  const lookups = useMemo((): FilterLookups => {
    const catalogCategoryIds = new Map<string, Set<string>>();
    for (const catalog of catalogs) {
      if (catalog.id) {
        catalogCategoryIds.set(catalog.id, new Set((catalog.category ?? []).map((r) => r.id)));
      }
    }
    return {
      priceById: indexById(pricesQuery.data ?? []),
      specById: indexById(specsQuery.data ?? []),
      catalogCategoryIds,
    };
  }, [catalogs, pricesQuery.data, specsQuery.data]);

  const filterOptions = useMemo(
    () => deriveFilterOptions(allOfferings, catalogs, lookups),
    [allOfferings, catalogs, lookups],
  );

  const filteredOfferings = useMemo(
    () => filterOfferings(allOfferings, filters, lookups),
    [allOfferings, filters, lookups],
  );

  const pagination = usePagination(filteredOfferings, PAGE_SIZE);

  const isLoading =
    isSessionLoading ||
    catalogsQuery.isLoading ||
    offeringsQuery.isLoading ||
    pricesQuery.isLoading ||
    specsQuery.isLoading ||
    isOwnLoading;

  return {
    filters,
    filterOptions,
    activeFilterCount,
    isOwnOffering,
    isAuthenticated,
    isLoading,
    error: offeringsQuery.error,
    isFiltering: activeFilterCount > 0,
    hasResults: filteredOfferings.length > 0,
    paginatedOfferings: pagination.paginatedItems,
    totalItems: filteredOfferings.length,
    currentPage: pagination.currentPage,
    totalPages: pagination.totalPages,
    rangeStart: pagination.rangeStart,
    rangeEnd: pagination.rangeEnd,
    setFilters,
    clearAllFilters,
    goToPage: pagination.goToPage,
  };
};
