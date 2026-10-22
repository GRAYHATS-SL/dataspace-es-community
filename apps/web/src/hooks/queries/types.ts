import type { UseQueryOptions } from '@tanstack/react-query';

/** Extra `useQuery` options callers may override. */
export type ExtraQueryOptions<T> = Partial<Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>>;

/** Minimal id/href/name reference used in price/offering relations. */
export interface PriceRef {
  id?: string;
  href?: string;
  name?: string;
}
