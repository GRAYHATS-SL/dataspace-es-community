import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  useLaunchedCatalogs,
  useLaunchedCatalogsPublic,
} from '@/hooks/queries/useCatalogQueries';
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
import { useCatalogPublicPage } from '@/hooks/useCatalogPublicPage';
import { useIsAuthenticated } from '@/hooks/useIsAuthenticated';
import { useIsOwnOffering } from '@/hooks/useIsOwnOffering';
import { usePagination, type UsePaginationReturn } from '@/hooks/usePagination';
import type { OfferingFilters } from '@/lib/utils/filterOfferings';
import type { Catalog, Organization, ProductOffering, ProductOfferingPrice, ProductSpecification } from '@/types/api';

// Factory mocks — an automock would still load the real module graph (catalog.ts → _utils.ts → session.ts), which throws at import time without SESSION_SECRET set.
vi.mock('@/hooks/queries/useCatalogQueries', () => ({
  useLaunchedCatalogs: vi.fn(),
  useLaunchedCatalogsPublic: vi.fn(),
}));
vi.mock('@/hooks/queries/useCategoryQueries', () => ({
  useCategories: vi.fn(),
  useCategoriesPublic: vi.fn(),
}));
vi.mock('@/hooks/queries/useProductOfferingPriceQueries', () => ({
  useProductOfferingPrices: vi.fn(),
  useProductOfferingPricesPublicQuery: vi.fn(),
}));
vi.mock('@/hooks/queries/usePartyQueries', () => ({ useOrganizations: vi.fn() }));
vi.mock('@/hooks/queries/useProductOfferingQueries', () => ({
  useProductOfferings: vi.fn(),
  useProductOfferingsPublic: vi.fn(),
}));
vi.mock('@/hooks/queries/useProductSpecificationQueries', () => ({
  useAllProductSpecificationsQuery: vi.fn(),
  useProductSpecificationsAllPublicQuery: vi.fn(),
}));
vi.mock('@/hooks/useCatalogPublicFilters', () => ({ useCatalogPublicFilters: vi.fn() }));
vi.mock('@/hooks/useIsAuthenticated', () => ({ useIsAuthenticated: vi.fn() }));
vi.mock('@/hooks/useIsOwnOffering', () => ({ useIsOwnOffering: vi.fn() }));
vi.mock('@/hooks/usePagination', () => ({ usePagination: vi.fn() }));

const CATALOG: Catalog = { id: 'cat-1', name: 'Catalog 1', category: [{ id: 'c-1', name: 'C1' }] };
const OFFERING_PUBLIC: ProductOffering = {
  id: 'o-pub',
  name: 'Public offering',
  lifecycleStatus: 'Launched',
  category: [{ id: 'c-1', name: 'C1' }],
  productSpecification: { id: 's-pub' },
  productOfferingPrice: [{ id: 'p-pub' }],
} as ProductOffering;
const OFFERING_AUTH: ProductOffering = {
  id: 'o-auth',
  name: 'Auth offering',
  lifecycleStatus: 'Launched',
  category: [{ id: 'c-1', name: 'C1' }],
  productSpecification: { id: 's-auth' },
  productOfferingPrice: [{ id: 'p-auth' }],
} as ProductOffering;
const PRICE: ProductOfferingPrice = { id: 'p-pub', priceType: 'one time' } as ProductOfferingPrice;
const SPEC: ProductSpecification = { id: 's-pub', name: 'Spec' } as ProductSpecification;

const queryResult = <T,>(data: T | undefined, isLoading = false) => ({ data, isLoading });

const defaultFilters: {
  filters: OfferingFilters;
  setFilters: (partial: Partial<OfferingFilters>) => void;
  clearAllFilters: () => void;
  activeFilterCount: number;
} = {
  filters: {
    searchTerm: '',
    statusFilters: [],
    catalogFilters: [],
    categoriaFilters: [],
    precioFilters: [],
    proveedorFilters: [],
    fechaFilter: '',
    formatoFilters: [],
    standardFilters: [],
    licenseFilters: [],
    qualityFilters: [],
  },
  setFilters: vi.fn<(partial: Partial<OfferingFilters>) => void>(),
  clearAllFilters: vi.fn<() => void>(),
  activeFilterCount: 0,
};

const paginationResult: UsePaginationReturn<ProductOffering> = {
  currentPage: 1,
  totalPages: 1,
  paginatedItems: [],
  goToPage: vi.fn(),
  resetPage: vi.fn(),
  rangeStart: 0,
  rangeEnd: 0,
  hasPrev: false,
  hasNext: false,
};

function setup({
  isAuthenticated = false,
  isSessionLoading = false,
  filtersOverride,
  isOwnOfferingOverride,
  organizations = [],
  authSpec = { id: 's-auth', name: 'Auth spec' } as ProductSpecification,
}: {
  organizations?: Organization[];
  authSpec?: ProductSpecification;
  isAuthenticated?: boolean;
  isSessionLoading?: boolean;
  filtersOverride?: typeof defaultFilters;
  isOwnOfferingOverride?: { isOwnOffering: (offering: ProductOffering) => boolean; isLoading: boolean };
} = {}) {
  vi.mocked(useIsAuthenticated).mockReturnValue({ isAuthenticated, isSessionLoading });
  vi.mocked(useLaunchedCatalogsPublic).mockReturnValue(queryResult([CATALOG]) as never);
  vi.mocked(useLaunchedCatalogs).mockReturnValue(queryResult([CATALOG]) as never);
  vi.mocked(useCategoriesPublic).mockReturnValue(queryResult([]) as never);
  vi.mocked(useCategories).mockReturnValue(queryResult([]) as never);
  vi.mocked(useProductOfferingsPublic).mockReturnValue(queryResult([OFFERING_PUBLIC]) as never);
  vi.mocked(useProductOfferings).mockReturnValue(queryResult([OFFERING_AUTH]) as never);
  vi.mocked(useProductOfferingPricesPublicQuery).mockReturnValue(queryResult([PRICE]) as never);
  vi.mocked(useProductOfferingPrices).mockReturnValue(queryResult([PRICE]) as never);
  vi.mocked(useProductSpecificationsAllPublicQuery).mockReturnValue(queryResult([SPEC]) as never);
  vi.mocked(useAllProductSpecificationsQuery).mockReturnValue(
    queryResult([SPEC, authSpec]) as never,
  );
  vi.mocked(useOrganizations).mockReturnValue(queryResult(organizations) as never);
  vi.mocked(useIsOwnOffering).mockReturnValue(
    isOwnOfferingOverride ?? { isOwnOffering: vi.fn(() => false), isLoading: false },
  );
  vi.mocked(useCatalogPublicFilters).mockReturnValue(filtersOverride ?? defaultFilters);
  vi.mocked(usePagination).mockReturnValue(paginationResult);

  return renderHook(() => useCatalogPublicPage());
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useCatalogPublicPage', () => {
  it('uses the public query variants (enabled) and skips the authenticated ones when unauthenticated', () => {
    setup({ isAuthenticated: false, isSessionLoading: false });

    expect(useLaunchedCatalogsPublic).toHaveBeenCalledWith({ enabled: true });
    expect(useLaunchedCatalogs).toHaveBeenCalledWith({ enabled: false });
    expect(useProductOfferingsPublic).toHaveBeenCalledWith({ enabled: true });
    expect(useProductOfferings).toHaveBeenCalledWith({ enabled: false });
  });

  it('uses the authenticated query variants (enabled) and skips the public ones when authenticated', () => {
    setup({ isAuthenticated: true, isSessionLoading: false });

    expect(useLaunchedCatalogs).toHaveBeenCalledWith({ enabled: true });
    expect(useLaunchedCatalogsPublic).toHaveBeenCalledWith({ enabled: false });
    expect(useProductOfferings).toHaveBeenCalledWith({ enabled: true });
    expect(useProductOfferingsPublic).toHaveBeenCalledWith({ enabled: false });
  });

  it('disables both public and authenticated variants while the session is loading', () => {
    setup({ isAuthenticated: false, isSessionLoading: true });

    expect(useLaunchedCatalogsPublic).toHaveBeenCalledWith({ enabled: false });
    expect(useLaunchedCatalogs).toHaveBeenCalledWith({ enabled: false });
  });

  it('picks offerings data from the authenticated query once isAuthenticated is true', () => {
    const { result } = setup({ isAuthenticated: true });
    // OFFERING_AUTH passes through untouched when no filters are set.
    expect(result.current.paginatedOfferings).toBe(paginationResult.paginatedItems);
    expect(usePagination).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'o-auth' })]),
      12,
    );
  });

  it('picks offerings data from the public query when unauthenticated', () => {
    setup({ isAuthenticated: false });
    expect(usePagination).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: 'o-pub' })]),
      12,
    );
  });

  it('isLoading is true while the session itself is loading, before any entity query runs', () => {
    const { result } = setup({ isSessionLoading: true });
    expect(result.current.isLoading).toBe(true);
  });

  it('isLoading is true when any of the five entity queries is loading', () => {
    vi.mocked(useIsAuthenticated).mockReturnValue({ isAuthenticated: false, isSessionLoading: false });
    vi.mocked(useLaunchedCatalogsPublic).mockReturnValue(queryResult([CATALOG], true) as never);
    vi.mocked(useLaunchedCatalogs).mockReturnValue(queryResult(undefined, false) as never);
    vi.mocked(useCategoriesPublic).mockReturnValue(queryResult([]) as never);
    vi.mocked(useCategories).mockReturnValue(queryResult([]) as never);
    vi.mocked(useProductOfferingsPublic).mockReturnValue(queryResult([]) as never);
    vi.mocked(useProductOfferings).mockReturnValue(queryResult(undefined) as never);
    vi.mocked(useProductOfferingPricesPublicQuery).mockReturnValue(queryResult([]) as never);
    vi.mocked(useProductOfferingPrices).mockReturnValue(queryResult(undefined) as never);
    vi.mocked(useProductSpecificationsAllPublicQuery).mockReturnValue(queryResult([]) as never);
    vi.mocked(useAllProductSpecificationsQuery).mockReturnValue(queryResult(undefined) as never);
    vi.mocked(useIsOwnOffering).mockReturnValue({ isOwnOffering: vi.fn(), isLoading: false });
    vi.mocked(useCatalogPublicFilters).mockReturnValue(defaultFilters);
    vi.mocked(usePagination).mockReturnValue(paginationResult);

    const { result } = renderHook(() => useCatalogPublicPage());
    expect(result.current.isLoading).toBe(true);
  });

  it('isLoading is true when isOwnOffering ownership specs are still loading', () => {
    vi.mocked(useIsAuthenticated).mockReturnValue({ isAuthenticated: false, isSessionLoading: false });
    vi.mocked(useLaunchedCatalogsPublic).mockReturnValue(queryResult([CATALOG]) as never);
    vi.mocked(useLaunchedCatalogs).mockReturnValue(queryResult(undefined) as never);
    vi.mocked(useCategoriesPublic).mockReturnValue(queryResult([]) as never);
    vi.mocked(useCategories).mockReturnValue(queryResult([]) as never);
    vi.mocked(useProductOfferingsPublic).mockReturnValue(queryResult([]) as never);
    vi.mocked(useProductOfferings).mockReturnValue(queryResult(undefined) as never);
    vi.mocked(useProductOfferingPricesPublicQuery).mockReturnValue(queryResult([]) as never);
    vi.mocked(useProductOfferingPrices).mockReturnValue(queryResult(undefined) as never);
    vi.mocked(useProductSpecificationsAllPublicQuery).mockReturnValue(queryResult([]) as never);
    vi.mocked(useAllProductSpecificationsQuery).mockReturnValue(queryResult(undefined) as never);
    vi.mocked(useIsOwnOffering).mockReturnValue({ isOwnOffering: vi.fn(), isLoading: true });
    vi.mocked(useCatalogPublicFilters).mockReturnValue(defaultFilters);
    vi.mocked(usePagination).mockReturnValue(paginationResult);

    const { result } = renderHook(() => useCatalogPublicPage());
    expect(result.current.isLoading).toBe(true);
  });

  it('filters offerings by searchTerm using the real filterOfferings logic', () => {
    setup({
      isAuthenticated: false,
      filtersOverride: {
        ...defaultFilters,
        filters: { ...defaultFilters.filters, searchTerm: 'no-match-anywhere' },
      },
    });

    expect(usePagination).toHaveBeenCalledWith([], 12);
  });

  it('derives filterOptions.catalogos from the catalogs query data', () => {
    const { result } = setup({ isAuthenticated: false });
    expect(result.current.filterOptions.catalogos).toEqual([{ id: 'cat-1', name: 'Catalog 1' }]);
  });

  it('hasResults reflects whether the filtered offerings list is non-empty', () => {
    const { result } = setup({ isAuthenticated: false });
    expect(result.current.hasResults).toBe(true);
  });

  it('isFiltering is true only when activeFilterCount is greater than zero', () => {
    const { result } = setup({
      isAuthenticated: false,
      filtersOverride: { ...defaultFilters, activeFilterCount: 2 },
    });
    expect(result.current.isFiltering).toBe(true);
  });

  it('isFiltering is false when there are no active filters', () => {
    const { result } = setup({ isAuthenticated: false });
    expect(result.current.isFiltering).toBe(false);
  });

  it('forwards setFilters, clearAllFilters and goToPage by reference from the underlying hooks', () => {
    const { result } = setup({ isAuthenticated: false });
    expect(result.current.setFilters).toBe(defaultFilters.setFilters);
    expect(result.current.clearAllFilters).toBe(defaultFilters.clearAllFilters);
    expect(result.current.goToPage).toBe(paginationResult.goToPage);
  });

  it('forwards isOwnOffering and pagination page metadata from the underlying hooks', () => {
    const isOwnOfferingFn = vi.fn<(offering: ProductOffering) => boolean>(() => true);
    const { result } = setup({
      isAuthenticated: false,
      isOwnOfferingOverride: { isOwnOffering: isOwnOfferingFn, isLoading: false },
    });

    expect(result.current.isOwnOffering).toBe(isOwnOfferingFn);
    expect(result.current.safePage).toBe(paginationResult.currentPage);
    expect(result.current.totalPages).toBe(paginationResult.totalPages);
    expect(result.current.rangeStart).toBe(paginationResult.rangeStart);
    expect(result.current.rangeEnd).toBe(paginationResult.rangeEnd);
  });

  describe('organizaciones closed', () => {
    const closedAuthSpec = {
      id: 's-auth',
      relatedParty: [{ id: 'org-closed', role: 'provider' }],
    } as ProductSpecification;
    const orgs = [
      { id: 'org-closed', status: 'closed' },
      { id: 'org-ok', status: 'validated' },
    ] as Organization[];

    it('con sesión oculta las ofertas de un proveedor closed con una sola carga de organizaciones', () => {
      setup({ isAuthenticated: true, organizations: orgs, authSpec: closedAuthSpec });
      expect(useOrganizations).toHaveBeenCalledWith({ enabled: true });
      expect(vi.mocked(usePagination).mock.calls.at(-1)?.[0]).toEqual([]);
    });

    it('con sesión conserva las ofertas de proveedores activos o sin status', () => {
      const activeSpec = { id: 's-auth', relatedParty: [{ id: 'org-ok', role: 'provider' }] } as ProductSpecification;
      setup({ isAuthenticated: true, organizations: orgs, authSpec: activeSpec });
      expect(vi.mocked(usePagination).mock.calls.at(-1)?.[0]).toEqual([OFFERING_AUTH]);
    });

    it('anónimo no carga organizaciones ni filtra (party no es público)', () => {
      setup({ isAuthenticated: false, organizations: orgs, authSpec: closedAuthSpec });
      expect(useOrganizations).toHaveBeenCalledWith({ enabled: false });
      expect(vi.mocked(usePagination).mock.calls.at(-1)?.[0]).toEqual([OFFERING_PUBLIC]);
    });
  });
});
