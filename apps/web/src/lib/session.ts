'use server';
import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

import { getJWTExp } from '@/lib/utils/jwtEdge';

const SESSION_SECRET = process.env.SESSION_SECRET ?? '';
// iron-session requires a password of at least 32 characters.
const SESSION_CONFIGURED = SESSION_SECRET.length >= 32;

if (!SESSION_CONFIGURED) {
  // Never fall back to a default secret: it would make session cookies forgeable.
  // Without a valid secret, sessions are disabled and the app renders as anonymous.
  console.warn(
    '[session] SESSION_SECRET is missing or shorter than 32 characters. Sessions are disabled.',
  );
}

export interface UserProfile {
  sub: string;
  name: string;
  email?: string;
  roles?: string[];
  /** TMF Party (Organization) id of the user, resolved at login. */
  organizationId?: string;
  /** TMF Party (Individual) id of the user, resolved at login. */
  individualId?: string;
}

export interface SessionData {
  accessToken?: string;
  /** Session expiry, in milliseconds since Unix epoch. */
  expiresAt?: number;
  userProfile?: UserProfile;
}

export interface PendingOAuthData {
  state?: string;
  nonce?: string;
  codeVerifier?: string;
}

const SESSION_OPTIONS: SessionOptions = {
  cookieName: 'app-session',
  password: SESSION_SECRET,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
};

const PENDING_OAUTH_OPTIONS: SessionOptions = {
  cookieName: 'app-oauth-pending',
  password: SESSION_SECRET,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600,
  },
};

/** Empty, non-persistent session used when sessions are disabled. Writing to it fails. */
function disabledSession<T extends object>(): IronSession<T> {
  return {
    save: async () => {
      throw new Error('Sessions are disabled: SESSION_SECRET is not configured.');
    },
    destroy: () => undefined,
    updateConfig: () => undefined,
  } as IronSession<T>;
}

/** Whether a valid `SESSION_SECRET` is configured. */
export async function isSessionConfigured(): Promise<boolean> {
  return SESSION_CONFIGURED;
}

export async function getSession(): Promise<IronSession<SessionData>> {
  if (!SESSION_CONFIGURED) return disabledSession<SessionData>();
  return getIronSession<SessionData>(await cookies(), SESSION_OPTIONS);
}

/**
 * Same as `getSession()`, but destroys the session when it has expired.
 * Use it wherever you need to know whether the user is authenticated.
 */
export async function getValidSession(): Promise<IronSession<SessionData>> {
  const session = await getSession();
  if (session.expiresAt && Date.now() >= session.expiresAt) {
    try {
      session.destroy();
    } catch {
      // Server Components cannot modify cookies; the middleware or next login clears it.
    }
    return disabledSession<SessionData>();
  }
  return session;
}

/**
 * Resolves the session expiry (ms): `expires_in` from the token response first,
 * then the access_token `exp` claim when it is a JWT. `undefined` when unknown.
 */
function resolveExpiresAt(accessToken: string, expiresIn?: number): number | undefined {
  if (typeof expiresIn === 'number' && expiresIn > 0) return Date.now() + expiresIn * 1000;
  const exp = getJWTExp(accessToken);
  return exp === null ? undefined : exp * 1000;
}

/**
 * Persists the authenticated session with a TTL aligned to the access_token expiry.
 * Works with both JWT and opaque access tokens.
 *
 * @throws {Error} If sessions are disabled.
 */
export async function createAuthenticatedSession(
  accessToken: string,
  userProfile: UserProfile | null,
  expiresIn?: number,
): Promise<void> {
  if (!SESSION_CONFIGURED) {
    throw new Error('Sessions are disabled: SESSION_SECRET is not configured.');
  }

  const expiresAt = resolveExpiresAt(accessToken, expiresIn);
  const ttl = expiresAt ? Math.floor((expiresAt - Date.now()) / 1000) : undefined;

  const session = await getIronSession<SessionData>(await cookies(), {
    ...SESSION_OPTIONS,
    ...(ttl && ttl > 0 ? { ttl } : {}),
  });
  session.accessToken = accessToken;
  session.expiresAt = expiresAt;
  if (userProfile) session.userProfile = userProfile;
  await session.save();
}

/** Short-lived cookie holding the OAuth `state`, `nonce` and PKCE verifier between login and callback. */
export async function getPendingOAuthSession(): Promise<IronSession<PendingOAuthData>> {
  if (!SESSION_CONFIGURED) return disabledSession<PendingOAuthData>();
  return getIronSession<PendingOAuthData>(await cookies(), PENDING_OAUTH_OPTIONS);
}
