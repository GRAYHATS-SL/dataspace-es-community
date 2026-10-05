'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import { PAGE_PARAM, withUpdatedParams } from './urlSearchParams';

/** Clamps a page to `[1, totalPages]`; non-finite values fall back to 1. */
const clampPage = (page: number, totalPages: number): number => {
  const integerPage = Math.floor(page);
  if (!Number.isFinite(integerPage)) return 1;
  return Math.min(Math.max(1, integerPage), totalPages);
};

/** Return value of `usePagination`. */
export interface UsePaginationReturn<T> {
  currentPage: number;
  totalPages: number;
  paginatedItems: T[];
  goToPage: (page: number) => void;
  resetPage: () => void;
  hasPrev: boolean;
  hasNext: boolean;
  rangeStart: number;
  rangeEnd: number;
}

/** Paginates `items` and syncs the current page with the `page` URL param. */
export const usePagination = <T>(items: T[], pageSize: number): UsePaginationReturn<T> => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = clampPage(Number(searchParams.get(PAGE_PARAM)), totalPages);

  const paginatedItems = useMemo(
    () => items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    [items, currentPage, pageSize],
  );

  const goToPage = useCallback(
    (page: number) => {
      const safePage = clampPage(page, totalPages);
      const params = withUpdatedParams(searchParams, {
        [PAGE_PARAM]: safePage === 1 ? undefined : safePage,
      });
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [searchParams, router, pathname, totalPages],
  );

  const resetPage = useCallback(() => goToPage(1), [goToPage]);

  return {
    currentPage,
    totalPages,
    paginatedItems,
    goToPage,
    resetPage,
    hasPrev: currentPage > 1,
    hasNext: currentPage < totalPages,
    rangeStart: items.length === 0 ? 0 : (currentPage - 1) * pageSize + 1,
    rangeEnd: Math.min(currentPage * pageSize, items.length),
  };
};
