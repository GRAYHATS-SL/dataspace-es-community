import { useMemo } from 'react';

import { useLaunchedCatalogs, useLaunchedCatalogsPublic } from '@/hooks/queries/useCatalogQueries';
import { useCategories, useCategoriesPublic } from '@/hooks/queries/useCategoryQueries';
import { useOrganizations } from '@/hooks/queries/usePartyQueries';
import {
  useProductOfferingPrices,
  useProductOfferingPricesPublicQuery,
} from '@/hooks/queries/useProductOfferingPriceQueries';
import {
  useProductOfferings,
  useProductOfferingsPublic,
} from '@/hooks/queries/useProductOfferingQueries';
import {
  useAllProductSpecificationsQuery,
  useProductSpecificationsAllPublicQuery,
} from '@/hooks/queries/useProductSpecificationQueries';
import { useCatalogPublicFilters } from '@/hooks/useCatalogPublicFilters';
import { useIsAuthenticated } from '@/hooks/useIsAuthenticated';
import { useIsOwnOffering } from '@/hooks/useIsOwnOffering';
import { usePagination } from '@/hooks/usePagination';
import { deriveFilterOptions, filterOfferings } from '@/lib/utils/filterOfferings';
import {
  filterOfferingsByActiveProvider,
  getClosedOrganizationIds,
} from '@/lib/utils/organizationStatus';
import type { ProductOfferingPrice, ProductSpecification } from '@/types/api';

const PAGE_SIZE = 12;

/**
 * Main public catalog hook: loads data, applies client-side filtering and URL-based pagination.
 *
 * @returns `filters` / `setFilters` / `clearAllFilters` - URL filter state.
 * @returns `filterOptions` - available options derived from the current data.
 * @returns `isOwnOffering(offering)` - `true` if the offering belongs to the user.
 * @returns `isAuthenticated` - `true` if there is an active session.
 * @returns `isLoading` - `true` while any query is in flight.
 * @returns `isError` / `refetch` - error flag and retry of the failed queries.
 * @returns `paginatedOfferings` - current page of filtered results.
 */
export const useCatalogPublicPage = () => {
  const { isAuthenticated, isSessionLoading } = useIsAuthenticated();
  const fetchPublic = !isSessionLoading && !isAuthenticated;
  const fetchAuth = !isSessionLoading && isAuthenticated;

  const catalogsPublicQuery = useLaunchedCatalogsPublic({ enabled: fetchPublic });
  const catalogsAuthQuery = useLaunchedCatalogs({ enabled: fetchAuth });
  const catalogsQuery = isAuthenticated ? catalogsAuthQuery : catalogsPublicQuery;

  const categoriesPublicQuery = useCategoriesPublic({ enabled: fetchPublic });
  const categoriesAuthQuery = useCategories({ enabled: fetchAuth });
  const categoriesQuery = isAuthenticated ? categoriesAuthQuery : categoriesPublicQuery;

  const offeringsPublicQuery = useProductOfferingsPublic({ enabled: fetchPublic });
  const offeringsAuthQuery = useProductOfferings({ enabled: fetchAuth });
  const offeringsQuery = isAuthenticated ? offeringsAuthQuery : offeringsPublicQuery;

  const pricesPublicQuery = useProductOfferingPricesPublicQuery({ enabled: fetchPublic });
  const pricesAuthQuery = useProductOfferingPrices({ enabled: fetchAuth });
  const pricesQuery = isAuthenticated ? pricesAuthQuery : pricesPublicQuery;

  const specsPublicQuery = useProductSpecificationsAllPublicQuery({ enabled: fetchPublic });
  const specsAuthQuery = useAllProductSpecificationsQuery({ enabled: fetchAuth });
  const specsQuery = isAuthenticated ? specsAuthQuery : specsPublicQuery;

  const orgsQuery = useOrganizations({ enabled: fetchAuth });

  const { isOwnOffering, isLoading: isOwnSpecsLoading } = useIsOwnOffering();

  const catalogs = useMemo(() => catalogsQuery.data ?? [], [catalogsQuery.data]);
  const allPrices = useMemo(() => pricesQuery.data ?? [], [pricesQuery.data]);
  const allSpecs = useMemo(() => specsQuery.data ?? [], [specsQuery.data]);

  const dataQueries = [catalogsQuery, categoriesQuery, offeringsQuery, pricesQuery, specsQuery];
  const isError = dataQueries.some((q) => q.isError);
  const refetch = () => {
    for (const q of dataQueries) if (q.isError) q.refetch().catch(() => undefined);
  };

  const { filters, setFilters, clearAllFilters, activeFilterCount } = useCatalogPublicFilters();

  // ── Lookup Maps ─────────────────────────────────────────────────────────────

  const priceById = useMemo(() => {
    const map = new Map<string, ProductOfferingPrice>();
    for (const p of allPrices) if (p.id) map.set(p.id, p);
    return map;
  }, [allPrices]);

  const specById = useMemo(() => {
    const map = new Map<string, ProductSpecification>();
    for (const s of allSpecs) if (s.id) map.set(s.id, s);
    return map;
  }, [allSpecs]);

  const allOfferings = useMemo(() => {
    const offerings = offeringsQuery.data ?? [];
    if (!isAuthenticated) return offerings;
    return filterOfferingsByActiveProvider(
      offerings,
      specById,
      getClosedOrganizationIds(orgsQuery.data ?? []),
    );
  }, [offeringsQuery.data, isAuthenticated, specById, orgsQuery.data]);

  // Map: catalogId → Set of categoryIds it contains (for catalog filter predicate)
  const catalogCategoryIdsMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const catalog of catalogs) {
      if (!catalog.id) continue;
      map.set(
        catalog.id,
        new Set((catalog.category?.map((r) => r.id).filter(Boolean) as string[]) ?? []),
      );
    }
    return map;
  }, [catalogs]);

  // ── Filter options ───────────────────────────────────────────────────────────

  const filterOptions = useMemo(
    () => deriveFilterOptions(allOfferings, priceById, catalogs, specById),
    [allOfferings, priceById, catalogs, specById],
  );

  // ── Filtered offerings ───────────────────────────────────────────────────────

  const filteredOfferings = useMemo(
    () => filterOfferings(allOfferings, priceById, specById, filters, catalogCategoryIdsMap),
    [allOfferings, priceById, specById, filters, catalogCategoryIdsMap],
  );

  // ── Pagination (URL-based) ───────────────────────────────────────────────────

  const { currentPage, totalPages, paginatedItems, goToPage, rangeStart, rangeEnd } = usePagination(
    filteredOfferings,
    PAGE_SIZE,
  );

  return {
    filters,
    filterOptions,
    activeFilterCount,
    isOwnOffering,
    isAuthenticated,
    isLoading:
      isSessionLoading ||
      catalogsQuery.isLoading ||
      categoriesQuery.isLoading ||
      offeringsQuery.isLoading ||
      pricesQuery.isLoading ||
      specsQuery.isLoading ||
      (fetchAuth && orgsQuery.isLoading) ||
      isOwnSpecsLoading,
    isError,
    refetch,
    isFiltering: activeFilterCount > 0,
    hasResults: filteredOfferings.length > 0,
    paginatedOfferings: paginatedItems,
    totalItems: filteredOfferings.length,
    safePage: currentPage,
    totalPages,
    rangeStart,
    rangeEnd,
    setFilters,
    clearAllFilters,
    goToPage,
  };
};
