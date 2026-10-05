import type { UseQueryOptions } from '@tanstack/react-query';

/** Extra `useQuery` options accepted by hooks that allow caller overrides. */
export type ExtraQueryOptions<T> = Partial<Omit<UseQueryOptions<T, Error>, 'queryKey' | 'queryFn'>>;

/** Minimal entity reference (id/href/name). */
export interface PriceRef {
  id?: string;
  href?: string;
  name?: string;
}
