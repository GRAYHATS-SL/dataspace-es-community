// INTEGRATION test: useCatalogPublicPage really orchestrating its 5 real queries (catalogs, categories, offerings, prices, specifications), the authentication state, client-side filtering (filterOfferings), URL-based pagination and the ownership calculation — in a single pass, as opposed to the unit test (useCatalogPublicPage.test.tsx) which mocks each of those React Query hooks in isolation. Only the real I/O boundary is mocked: the service functions (equivalent to the mocked `fetch` in the unit tests) and `next/navigation` (there is no Next.js App Router in Vitest).
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

vi.mock('@/hooks/queries/useSessionQuery', () => ({ useCurrentSessionQuery: vi.fn() }));

vi.mock('@/lib/services/queries/catalog', () => ({
  createCatalog: vi.fn(),
  deleteCatalog: vi.fn(),
  fetchCatalogById: vi.fn(),
  fetchCatalogs: vi.fn(),
  fetchLaunchedCatalogs: vi.fn(),
  fetchLaunchedCatalogsPublic: vi.fn(),
  patchCatalog: vi.fn(),
  publishCatalog: vi.fn(),
  setCatalogCategories: vi.fn(),
}));
vi.mock('@/lib/services/queries/category', () => ({
  fetchCategories: vi.fn(),
  fetchCategoryById: vi.fn(),
  createCategory: vi.fn(),
  patchCategory: vi.fn(),
  publishCategory: vi.fn(),
  deleteCategory: vi.fn(),
  fetchLaunchedCategories: vi.fn(),
  fetchCategoriesPublic: vi.fn(),
}));
vi.mock('@/lib/services/queries/party', () => ({
  fetchOrganizations: vi.fn(),
  fetchOrganizationById: vi.fn(),
  patchOrganization: vi.fn(),
}));
vi.mock('@/lib/services/payments/stripe', () => ({ saveStripeConnectAccountId: vi.fn() }));
vi.mock('@/lib/services/queries/productOffering', () => ({
  addOfferingPriceRef: vi.fn(),
  createProductOffering: vi.fn(),
  deleteProductOffering: vi.fn(),
  fetchProductOfferingById: vi.fn(),
  fetchProductOfferings: vi.fn(),
  fetchProductOfferingsPublic: vi.fn(),
  patchProductOffering: vi.fn(),
  publishProductOffering: vi.fn(),
  removeOfferingPriceRef: vi.fn(),
  setProductOfferingCategories: vi.fn(),
  setProductOfferingPriceRefs: vi.fn(),
}));
vi.mock('@/lib/services/queries/productOfferingPrice', () => ({
  createProductOfferingPrice: vi.fn(),
  deleteProductOfferingPrice: vi.fn(),
  getProductOfferingPriceById: vi.fn(),
  getProductOfferingPrices: vi.fn(),
  getProductOfferingPricesPublic: vi.fn(),
  patchProductOfferingPrice: vi.fn(),
}));
vi.mock('@/lib/services/queries/productSpecification', () => ({
  createProductSpecification: vi.fn(),
  deleteProductSpecification: vi.fn(),
  getProductSpecificationById: vi.fn(),
  getProductSpecifications: vi.fn(),
  getProductSpecificationsAll: vi.fn(),
  getProductSpecificationsAllPublic: vi.fn(),
  patchProductSpecification: vi.fn(),
  publishProductSpecification: vi.fn(),
}));

import { useCurrentSessionQuery } from '@/hooks/queries/useSessionQuery';
import { useCatalogPublicPage } from '@/hooks/useCatalogPublicPage';
import { fetchLaunchedCatalogs, fetchLaunchedCatalogsPublic } from '@/lib/services/queries/catalog';
import { fetchCategories, fetchCategoriesPublic } from '@/lib/services/queries/category';
import { fetchOrganizations } from '@/lib/services/queries/party';
import {
  fetchProductOfferings,
  fetchProductOfferingsPublic,
} from '@/lib/services/queries/productOffering';
import {
  getProductOfferingPrices,
  getProductOfferingPricesPublic,
} from '@/lib/services/queries/productOfferingPrice';
import {
  getProductSpecifications,
  getProductSpecificationsAll,
  getProductSpecificationsAllPublic,
} from '@/lib/services/queries/productSpecification';
import type {
  Catalog,
  Category,
  Organization,
  ProductOffering,
  ProductOfferingPrice,
  ProductSpecification,
} from '@/types/api';

const PAGE_SIZE = 12;
const OFFERING_COUNT = 14;

const CATALOG: Catalog = { id: 'catalog-1', name: 'Catalog 1', category: [{ id: 'cat-A' }] } as Catalog;
const CATEGORY: Category = { id: 'cat-A', name: 'Cat A' } as Category;
const PRICE: ProductOfferingPrice = { id: 'price-1', priceType: 'one time' } as ProductOfferingPrice;

const OFFERINGS: ProductOffering[] = Array.from({ length: OFFERING_COUNT }, (_, i) => {
  const n = i + 1;
  return {
    id: `off-${n}`,
    name: n === 5 ? 'Dataset especial de sensores' : `Offering ${n}`,
    lifecycleStatus: 'Launched',
    category: [{ id: 'cat-A' }],
    productSpecification: { id: n === 1 ? 'spec-owned' : `spec-${n}` },
    productOfferingPrice: [{ id: 'price-1' }],
  } as ProductOffering;
});

const SPECS: ProductSpecification[] = OFFERINGS.map(
  (o) => ({ id: o.productSpecification!.id, name: o.name }) as ProductSpecification,
);

function wrapperFor(queryClient: QueryClient) {
  return function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

function setup(query = '', overrideMocks?: () => void) {
  vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams(query) as never);
  vi.mocked(usePathname).mockReturnValue('/catalogo');
  vi.mocked(useRouter).mockReturnValue({ push: vi.fn() } as never);

  vi.mocked(useCurrentSessionQuery).mockReturnValue({
    data: { ok: false, userProfile: null },
    isLoading: false,
  } as never);

  vi.mocked(fetchLaunchedCatalogsPublic).mockResolvedValue([CATALOG]);
  vi.mocked(fetchCategoriesPublic).mockResolvedValue([CATEGORY]);
  vi.mocked(fetchProductOfferingsPublic).mockResolvedValue(OFFERINGS);
  vi.mocked(getProductOfferingPricesPublic).mockResolvedValue([PRICE]);
  vi.mocked(getProductSpecificationsAllPublic).mockResolvedValue(SPECS);
  // Always queried (enabled is not passed) to compute ownership, even without a session.
  vi.mocked(getProductSpecifications).mockResolvedValue([
    { id: 'spec-owned' } as ProductSpecification,
  ]);

  overrideMocks?.();

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return renderHook(() => useCatalogPublicPage(), { wrapper: wrapperFor(queryClient) });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe('useCatalogPublicPage (integracion: 5 queries reales + filtros + paginacion + ownership)', () => {
  it('agrega las 5 queries publicas reales, calcula ownership real y pagina la primera pagina', async () => {
    const { result } = setup();

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchLaunchedCatalogsPublic).toHaveBeenCalledTimes(1);
    expect(fetchCategoriesPublic).toHaveBeenCalledTimes(1);
    expect(fetchProductOfferingsPublic).toHaveBeenCalledTimes(1);
    expect(getProductOfferingPricesPublic).toHaveBeenCalledTimes(1);
    expect(getProductSpecificationsAllPublic).toHaveBeenCalledTimes(1);

    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.totalItems).toBe(OFFERING_COUNT);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.paginatedOfferings).toHaveLength(PAGE_SIZE);
    expect(result.current.paginatedOfferings[0].id).toBe('off-1');

    expect(result.current.filterOptions.catalogos).toEqual([{ id: 'catalog-1', name: 'Catalog 1' }]);
    expect(result.current.filterOptions.priceTypes).toEqual(['one time']);

    // Ownership: off-1 uses spec-owned (returned by getProductSpecifications), the rest do not.
    expect(result.current.isOwnOffering(OFFERINGS[0])).toBe(true);
    expect(result.current.isOwnOffering(OFFERINGS[1])).toBe(false);
  });

  it('expone isError cuando una query publica falla (404/5xx/IP rechazada) y refetch reintenta solo la fallida', async () => {
    const { result } = setup('', () => {
      vi.mocked(getProductOfferingPricesPublic).mockRejectedValue(new Error('HTTP 404: Not Found'));
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(getProductOfferingPricesPublic).toHaveBeenCalledTimes(1);

    vi.mocked(getProductOfferingPricesPublic).mockResolvedValue([PRICE]);
    act(() => result.current.refetch());
    await waitFor(() => expect(result.current.isError).toBe(false));
    expect(getProductOfferingPricesPublic).toHaveBeenCalledTimes(2);
    expect(fetchProductOfferingsPublic).toHaveBeenCalledTimes(1);
  });

  it('con page=2 en la URL, la paginacion real devuelve los items restantes', async () => {
    const { result } = setup('page=2');

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.safePage).toBe(2);
    expect(result.current.paginatedOfferings).toHaveLength(OFFERING_COUNT - PAGE_SIZE);
    expect(result.current.paginatedOfferings[0].id).toBe('off-13');
    expect(result.current.rangeStart).toBe(13);
    expect(result.current.rangeEnd).toBe(14);
  });

  it('con q=especial en la URL, el filtrado real reduce el resultado y recalcula la paginacion', async () => {
    const { result } = setup('q=especial');

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.totalItems).toBe(1);
    expect(result.current.totalPages).toBe(1);
    expect(result.current.paginatedOfferings).toHaveLength(1);
    expect(result.current.paginatedOfferings[0].id).toBe('off-5');
    expect(result.current.isFiltering).toBe(true);
  });

  // Authenticated history/listing: a single load of organizations and a Set of closed ids.
  it('con sesión oculta las ofertas de organizaciones closed con una sola carga de organizaciones', async () => {
    const closedSpecs = SPECS.map((sp) =>
      sp.id === 'spec-2' || sp.id === 'spec-3'
        ? { ...sp, relatedParty: [{ id: 'org-closed', role: 'provider' }] }
        : { ...sp, relatedParty: [{ id: 'org-ok', role: 'provider' }] },
    ) as ProductSpecification[];
    const { result } = setup('', () => {
      vi.mocked(useCurrentSessionQuery).mockReturnValue({
        data: { ok: true, userProfile: { organizationId: 'org-buyer' } },
        isLoading: false,
      } as never);
      vi.mocked(fetchLaunchedCatalogs).mockResolvedValue([CATALOG]);
      vi.mocked(fetchCategories).mockResolvedValue([CATEGORY]);
      vi.mocked(fetchProductOfferings).mockResolvedValue(OFFERINGS);
      vi.mocked(getProductOfferingPrices).mockResolvedValue([PRICE]);
      vi.mocked(getProductSpecificationsAll).mockResolvedValue(closedSpecs);
      vi.mocked(fetchOrganizations).mockResolvedValue([
        { id: 'org-closed', status: 'closed' },
        { id: 'org-ok', status: 'validated' },
      ] as Organization[]);
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchOrganizations).toHaveBeenCalledTimes(1);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.totalItems).toBe(OFFERING_COUNT - 2);
    const ids = result.current.paginatedOfferings.map((o) => o.id);
    expect(ids).not.toContain('off-2');
    expect(ids).not.toContain('off-3');
    expect(fetchProductOfferingsPublic).not.toHaveBeenCalled();
  });
});
