'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import type { UserProfile } from '@/lib/session';
import { identifySentryUser } from '@/lib/utils/sentry';

const EXPIRY_MARGIN_MS = 2_000;
const FALLBACK_INTERVAL_MS = 60_000;
const MAX_TIMEOUT_MS = 10 * 60_000;
const SESSION_CHANNEL = 'app-session';

function is401(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith('HTTP 401');
}

interface Props {
  initialExpiresAt: number | null;
  initialUserProfile: UserProfile | null;
}

/**
 * Watches the session expiry and redirects to the login page when it expires.
 * Syncs across tabs through a BroadcastChannel.
 */
export function SessionWatcher({ initialExpiresAt, initialUserProfile }: Readonly<Props>): null {
  const router = useRouter();
  const queryClient = useQueryClient();

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let active = true;
    const bc = new BroadcastChannel(SESSION_CHANNEL);

    identifySentryUser(initialUserProfile);

    const expire = () => {
      if (!active) return;
      active = false;
      identifySentryUser(null);
      bc.postMessage('expired');
      router.replace('/inicio-sesion?error=session_expired');
    };

    const schedule = (delayMs: number) => {
      if (!active) return;
      const delay = Math.min(Math.max(delayMs, 0), MAX_TIMEOUT_MS);
      timeout = setTimeout(check, delay);
    };

    const check = async () => {
      if (!active) return;
      let res: Response;
      try {
        res = await fetch('/api/auth/session', {
          credentials: 'include',
          cache: 'no-store',
        });
      } catch {
        schedule(FALLBACK_INTERVAL_MS);
        return;
      }

      if (res.status === 401) {
        expire();
        return;
      }

      if (!res.ok) {
        schedule(FALLBACK_INTERVAL_MS);
        return;
      }

      const data = (await res.json().catch(() => null)) as {
        expiresAt?: number | null;
        userProfile?: UserProfile | null;
      } | null;

      identifySentryUser(data?.userProfile ?? null);

      const expiresAt = data?.expiresAt ?? null;
      if (!expiresAt) {
        schedule(FALLBACK_INTERVAL_MS);
        return;
      }

      const remaining = expiresAt - Date.now() + EXPIRY_MARGIN_MS;
      if (remaining <= 0) {
        expire();
        return;
      }
      schedule(remaining);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        if (timeout) clearTimeout(timeout);
        check();
      }
    };

    // Another tab detected expiry: redirect without an extra fetch.
    bc.onmessage = () => {
      if (active) router.replace('/inicio-sesion?error=session_expired');
    };

    // Safety net: any query or mutation returning 401 expires the session immediately.
    const unsubQuery = queryClient.getQueryCache().subscribe((event) => {
      if (event.type === 'updated' && is401(event.query.state.error)) expire();
    });
    const unsubMutation = queryClient.getMutationCache().subscribe((event) => {
      if (event.type === 'updated' && is401(event.mutation.state.error)) expire();
    });

    // If the layout already provided expiresAt, start the timer without an initial fetch.
    if (initialExpiresAt !== null) {
      const remaining = initialExpiresAt - Date.now() + EXPIRY_MARGIN_MS;
      if (remaining <= 0) {
        expire();
      } else {
        schedule(remaining);
      }
    } else {
      check();
    }

    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      active = false;
      if (timeout) clearTimeout(timeout);
      document.removeEventListener('visibilitychange', onVisibility);
      unsubQuery();
      unsubMutation();
      bc.close();
    };
  }, [router, queryClient, initialExpiresAt, initialUserProfile]);

  return null;
}
