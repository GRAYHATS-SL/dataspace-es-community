import { useQuery } from '@tanstack/react-query';

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
 * React Query hook — checks, without throwing, whether there is an active browser session.
 *
 * @returns `{ ok, userProfile }`; `ok: false` and `userProfile: null` when there is no session.
 */
export const useCurrentSessionQuery = () =>
  useQuery<CurrentSessionResult, Error>({
    queryKey: queryKeys.session.list(),
    queryFn: fetchCurrentSession,
    staleTime: STALE_TIME.TRANSACTIONAL,
    retry: false,
  });
