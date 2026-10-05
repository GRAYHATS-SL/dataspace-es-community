'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import type { DateFilter, OfferingFilters } from '@/lib/utils/filterOfferings';

import { PAGE_PARAM, withUpdatedParams } from './urlSearchParams';

type ListFilterKey = Exclude<keyof OfferingFilters, 'searchTerm' | 'fechaFilter'>;

const LIST_PARAMS: Record<ListFilterKey, string> = {
  statusFilters: 'status',
  catalogFilters: 'catalog',
  categoriaFilters: 'cat',
  precioFilters: 'precio',
  proveedorFilters: 'prov',
};

const P_SEARCH = 'q';
const P_FECHA = 'fecha';
const DATE_VALUES: DateFilter[] = ['today', '7d', '30d', '90d', 'older'];
const LIST_KEYS = Object.keys(LIST_PARAMS) as ListFilterKey[];

/** Splits a comma separated param into values. */
const splitParam = (value: string | null): string[] =>
  value ? value.split(',').filter(Boolean) : [];

/** Parses the date filter param, ignoring unknown values. */
const parseDate = (value: string | null): DateFilter =>
  DATE_VALUES.find((v) => v === value) ?? '';

/** Return value of `useCatalogPublicFilters`. */
export interface UseCatalogPublicFiltersReturn {
  filters: OfferingFilters;
  setFilters: (partial: Partial<OfferingFilters>) => void;
  clearAllFilters: () => void;
  activeFilterCount: number;
}

/** Catalog filter state synced with the URL search params (resets `page` on change). */
export const useCatalogPublicFilters = (): UseCatalogPublicFiltersReturn => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo((): OfferingFilters => {
    const lists = Object.fromEntries(
      LIST_KEYS.map((key) => [key, splitParam(searchParams.get(LIST_PARAMS[key]))]),
    ) as Record<ListFilterKey, string[]>;
    return {
      ...lists,
      searchTerm: searchParams.get(P_SEARCH) ?? '',
      fechaFilter: parseDate(searchParams.get(P_FECHA)),
    };
  }, [searchParams]);

  const setFilters = useCallback(
    (partial: Partial<OfferingFilters>) => {
      const next: OfferingFilters = { ...filters, ...partial };
      const updates: Record<string, string | undefined> = {
        [PAGE_PARAM]: undefined,
        [P_SEARCH]: next.searchTerm,
        [P_FECHA]: next.fechaFilter,
      };
      for (const key of LIST_KEYS) updates[LIST_PARAMS[key]] = next[key].join(',');
      const qs = withUpdatedParams(searchParams, updates).toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [filters, searchParams, router, pathname],
  );

  const clearAllFilters = useCallback(() => router.push(pathname), [router, pathname]);

  const activeFilterCount = useMemo(
    () =>
      LIST_KEYS.filter((key) => filters[key].length > 0).length +
      (filters.searchTerm ? 1 : 0) +
      (filters.fechaFilter ? 1 : 0),
    [filters],
  );

  return { filters, setFilters, clearAllFilters, activeFilterCount };
};
