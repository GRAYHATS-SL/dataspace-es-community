import { useQuery, type UseQueryResult } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants/queryConfig';
import type { UserProfile } from '@/lib/session';

import { queryKeys } from './queryKeys';

export interface CurrentSessionResult {
  ok: boolean;
  userProfile: UserProfile | null;
}

const fetchCurrentSession = async (): Promise<CurrentSessionResult> => {
  const res = await fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' });
  if (res.status === 401) return { ok: false, userProfile: null };
  if (!res.ok)
    throw new Error(`HTTP ${res.status}: ${await res.text().catch(() => res.statusText)}`);
  const data = (await res.json()) as { ok: boolean; userProfile?: UserProfile | null };
  return { ok: data.ok, userProfile: data.userProfile ?? null };
};

/**
 * Checks, without throwing, whether the browser has an active session.
 * Safe to call from public pages.
 *
 * @returns `{ ok, userProfile }`; `ok: false` and `userProfile: null` when there is no session.
 */
export const useCurrentSessionQuery = (): UseQueryResult<CurrentSessionResult, Error> =>
  useQuery<CurrentSessionResult, Error>({
    queryKey: queryKeys.session.list(),
    queryFn: fetchCurrentSession,
    staleTime: STALE_TIME.TRANSACTIONAL,
    retry: false,
  });
