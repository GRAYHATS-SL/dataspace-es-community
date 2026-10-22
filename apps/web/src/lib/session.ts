'use server';
import { getIronSession, IronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';

import { getJWTExp, isJWTExpired } from '@/lib/utils/jwtEdge';

if (!process.env.SESSION_SECRET) {
  throw new Error(
    'SESSION_SECRET no está definida. Configura esta variable de entorno antes de iniciar la aplicación.',
  );
}

export type BusinessRole = 'proveedor' | 'consumidor';

export interface UserProfile {
  name: string;
  organization: string;
  sub: string;
  roles: string[];
  businessRoles: BusinessRole[];
  email?: string;
  firstName?: string;
  lastName?: string;
  organizationId?: string;
  /** Organization name in TMF (`tradingName` or `name`), resolved at login. */
  organizationName?: string;
}

export interface SessionData {
  accessToken?: string;
  userProfile?: UserProfile;
}

export interface PendingOAuthData {
  state?: string;
}

const SESSION_OPTIONS: SessionOptions = {
  cookieName: 'ds-session',
  password: process.env.SESSION_SECRET,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
  },
};

const PENDING_OAUTH_OPTIONS: SessionOptions = {
  cookieName: 'ds-oauth-pending',
  password: process.env.SESSION_SECRET,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 600,
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), SESSION_OPTIONS);
}

/** Like getSession(), but destroys the cookie and returns an empty session if the internal JWT has expired. */
export async function getValidSession(): Promise<IronSession<SessionData>> {
  const session = await getSession();
  if (session.accessToken && isJWTExpired(session.accessToken)) {
    session.destroy();
  }
  return session;
}

/** Persists the authenticated session with a TTL aligned to the JWT `exp` claim. */
export async function createAuthenticatedSession(
  accessToken: string,
  userProfile: UserProfile | null,
): Promise<void> {
  const exp = getJWTExp(accessToken);
  const now = Math.floor(Date.now() / 1000);
  const ttl = exp && exp > now ? exp - now : undefined;

  const session = await getIronSession<SessionData>(await cookies(), {
    ...SESSION_OPTIONS,
    ...(ttl ? { ttl } : {}),
  });
  session.accessToken = accessToken;
  if (userProfile) session.userProfile = userProfile;
  await session.save();
}

export async function getPendingOAuthSession(): Promise<IronSession<PendingOAuthData>> {
  return getIronSession<PendingOAuthData>(await cookies(), PENDING_OAUTH_OPTIONS);
}
