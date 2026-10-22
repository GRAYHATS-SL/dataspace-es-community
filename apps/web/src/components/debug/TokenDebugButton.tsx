'use client';

import { useEffect, useMemo, useState } from 'react';

import { getDecodedToken, getSessionProfile } from '@/lib/services/session';
import { UserProfile } from '@/lib/session';
import { cn } from '@/lib/utils';
import { trackError } from '@/lib/utils/sentry';

function formatRemaining(seconds: number): string {
  if (seconds <= 0) return 'Expirado';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d}d ${h}h ${m}m ${s}s`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function ProfileSection({ profile }: Readonly<{ profile: UserProfile }>) {
  const rows: { label: string; value: string | undefined; highlight?: boolean }[] = [
    { label: 'organizationId', value: profile.organizationId, highlight: true },
    { label: 'sub (DID)', value: profile.sub },
    { label: 'name', value: profile.name },
    { label: 'organization', value: profile.organization },
    { label: 'email', value: profile.email },
    { label: 'roles', value: profile.roles?.join(', ') },
  ];

  return (
    <div className="mt-3 border-t border-gray-700 pt-3">
      <p className="mb-2 text-xs font-semibold text-blue-400 uppercase tracking-wide">
        Perfil de sesión
      </p>
      <table className="w-full text-xs">
        <tbody>
          {rows.map(({ label, value, highlight }) => (
            <tr key={label}>
              <td className="pr-2 py-0.5 text-gray-400 align-top whitespace-nowrap">{label}</td>
              <td
                className={cn('py-0.5 font-mono break-all', {
                  'text-red-400 italic': value === undefined,
                  'text-yellow-300': highlight,
                  'text-green-300': !highlight && value !== undefined,
                })}
              >
                {value ?? '— ausente'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TokenDebugButton() {
  const [claims, setClaims] = useState<Record<string, unknown> | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const exp = typeof claims?.exp === 'number' ? claims.exp : null;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const [decoded, prof] = await Promise.all([getDecodedToken(), getSessionProfile()]);
      if (!cancelled) {
        setClaims(decoded);
        setProfile(prof);
      }
    };
    load().catch((error: unknown) => trackError(error, { reason: 'token_debug_load_failed' }));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (exp === null) return;
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, [exp]);

  const remainingSeconds = exp === null ? null : exp - now;
  const remainingLabel = useMemo(
    () => (remainingSeconds === null ? null : formatRemaining(remainingSeconds)),
    [remainingSeconds],
  );
  const expDate = exp === null ? null : new Date(exp * 1000).toLocaleString();
  const isExpired = remainingSeconds !== null && remainingSeconds <= 0;

  const handleClick = async () => {
    if (open) {
      setOpen(false);
      return;
    }
    if (!claims && !profile) {
      setLoading(true);
      try {
        const [decoded, prof] = await Promise.all([getDecodedToken(), getSessionProfile()]);
        setClaims(decoded);
        setProfile(prof);
      } catch (error) {
        trackError(error, { reason: 'token_debug_load_failed' });
      } finally {
        setLoading(false);
      }
    }
    setOpen(true);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {remainingLabel && (
        <span
          className={`rounded-md px-2 py-1 font-mono text-xs shadow ${
            isExpired ? 'bg-red-900 text-red-300' : 'bg-gray-800 text-yellow-300'
          }`}
          title={expDate ?? undefined}
        >
          ⏱ {remainingLabel}
        </span>
      )}
      <button
        onClick={handleClick}
        className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-mono text-green-400 shadow-lg hover:bg-gray-700"
      >
        {loading && '...'}
        {open ? '✕ Cerrar token' : '🔍 Ver token'}
      </button>
      {open && (claims || profile) && (
        <div className="max-h-128 max-w-lg overflow-auto rounded-lg bg-gray-900 p-4 shadow-xl">
          {remainingLabel && (
            <div
              className={`mb-2 font-mono text-xs ${isExpired ? 'text-red-400' : 'text-yellow-300'}`}
            >
              <div>Expira en: {remainingLabel}</div>
              {expDate && <div className="text-gray-400">({expDate})</div>}
            </div>
          )}
          {profile && <ProfileSection profile={profile} />}
          {claims && (
            <div className="mt-3 border-t border-gray-700 pt-3">
              <p className="mb-2 text-xs font-semibold text-blue-400 uppercase tracking-wide">
                JWT claims
              </p>
              <pre className="text-xs text-green-300">{JSON.stringify(claims, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
      {open && !claims && !profile && (
        <p className="rounded-lg bg-red-900 px-3 py-2 text-xs text-red-300">No hay sesión activa</p>
      )}
    </div>
  );
}
