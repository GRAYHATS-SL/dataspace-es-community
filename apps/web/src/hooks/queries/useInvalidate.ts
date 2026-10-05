import { type QueryKey, useQueryClient } from '@tanstack/react-query';

/**
 * Returns a function that invalidates one or more query keys.
 *
 * @example
 * const invalidate = useInvalidate();
 * return useMutation({
 *   mutationFn: createCatalog,
 *   onSuccess: () => invalidate(queryKeys.catalogs.all()),
 * });
 */
export const useInvalidate = (): ((...keys: QueryKey[]) => void) => {
  const queryClient = useQueryClient();
  return (...keys: QueryKey[]) => {
    keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
  };
};
