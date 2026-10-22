import { type QueryKey, useQueryClient } from '@tanstack/react-query';

/**
 * Returns a function that invalidates one or more query keys.
 *
 * @example
 * const invalidate = useInvalidate();
 * return useMutation({
 *   mutationFn: createAgreement,
 *   onSuccess: () => invalidate(queryKeys.agreements.all()),
 * });
 */
export const useInvalidate = () => {
  const queryClient = useQueryClient();
  return (...keys: QueryKey[]) => {
    keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
  };
};
