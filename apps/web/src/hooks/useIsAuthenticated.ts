import { useCurrentSessionQuery } from '@/hooks/queries/useSessionQuery';

/** Checks, from a public page, whether there is an active session. */
export const useIsAuthenticated = () => {
  const { data, isLoading } = useCurrentSessionQuery();
  return { isAuthenticated: data?.ok ?? false, isSessionLoading: isLoading };
};
