'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import type { OfferingFilters } from '@/lib/utils/filterOfferings';

import { PAGE_PARAM, withUpdatedParams } from './urlSearchParams';

const P_SEARCH = 'q';
const P_STATUS = 'status';
const P_CATALOG = 'catalog';
const P_CAT = 'cat';
const P_PRECIO = 'precio';
const P_PROV = 'prov';
const P_FECHA = 'fecha';
const P_FORMATO = 'formato';
const P_STANDARD = 'standard';
const P_LICENSE = 'license';
const P_QUALITY = 'quality';

// Multi-value filters are serialized comma-separated: each value is encoded before joining so that a comma or a `%` inside the value (e.g. "Acme, S.L.") does not split it in two.
const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value; // URL antigua o editada a mano con un `%` suelto
  }
};

const joinParam = (values: string[]): string => values.map(encodeURIComponent).join(',');

const splitParam = (value: string | null): string[] =>
  value ? value.split(',').filter(Boolean).map(safeDecode) : [];

const buildParams = (searchParams: URLSearchParams, next: OfferingFilters): URLSearchParams =>
  withUpdatedParams(searchParams, {
    [PAGE_PARAM]: undefined,
    [P_SEARCH]: next.searchTerm,
    [P_STATUS]: joinParam(next.statusFilters),
    [P_CATALOG]: joinParam(next.catalogFilters),
    [P_CAT]: joinParam(next.categoriaFilters),
    [P_PRECIO]: joinParam(next.precioFilters),
    [P_PROV]: joinParam(next.proveedorFilters),
    [P_FECHA]: next.fechaFilter,
    [P_FORMATO]: joinParam(next.formatoFilters),
    [P_STANDARD]: joinParam(next.standardFilters),
    [P_LICENSE]: joinParam(next.licenseFilters),
    [P_QUALITY]: joinParam(next.qualityFilters),
  });

/**
 * Manages the public catalog filter state, synced with the URL search params.
 *
 * @returns `filters` - current state read from the URL.
 * @returns `setFilters` - updates one or more filters.
 * @returns `clearAllFilters` - navigates to the pathname without query params.
 * @returns `activeFilterCount` - number of active filter dimensions.
 */
export const useCatalogPublicFilters = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters = useMemo(
    (): OfferingFilters => ({
      searchTerm: searchParams.get(P_SEARCH) ?? '',
      statusFilters: splitParam(searchParams.get(P_STATUS)),
      catalogFilters: splitParam(searchParams.get(P_CATALOG)),
      categoriaFilters: splitParam(searchParams.get(P_CAT)),
      precioFilters: splitParam(searchParams.get(P_PRECIO)),
      proveedorFilters: splitParam(searchParams.get(P_PROV)),
      fechaFilter: (searchParams.get(P_FECHA) ?? '') as OfferingFilters['fechaFilter'],
      formatoFilters: splitParam(searchParams.get(P_FORMATO)),
      standardFilters: splitParam(searchParams.get(P_STANDARD)),
      licenseFilters: splitParam(searchParams.get(P_LICENSE)),
      qualityFilters: splitParam(searchParams.get(P_QUALITY)),
    }),
    [searchParams],
  );

  const setFilters = useCallback(
    (partial: Partial<OfferingFilters>) => {
      const next: OfferingFilters = { ...filters, ...partial };
      const params = buildParams(searchParams, next);
      const qs = params.toString();
      router.push(qs ? `${pathname}?${qs}` : pathname);
    },
    [filters, searchParams, router, pathname],
  );

  const clearAllFilters = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  const activeFilterCount = useMemo(() => {
    const hasValue = (value: string | string[]): boolean =>
      Array.isArray(value) ? value.length > 0 : Boolean(value);
    return Object.values(filters).filter((value) => hasValue(value as string | string[])).length;
  }, [filters]);

  return { filters, setFilters, clearAllFilters, activeFilterCount };
};
