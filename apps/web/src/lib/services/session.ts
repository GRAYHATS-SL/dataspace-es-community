'use server';

import { getSession, UserProfile } from '@/lib/session';
import { getJWTPayload } from '@/lib/utils/verifyJWT';

export async function getDecodedToken(): Promise<Record<string, unknown> | null> {
  const session = await getSession();
  if (!session.accessToken) return null;

  return getJWTPayload(session.accessToken);
}

export async function getSessionProfile(): Promise<UserProfile | null> {
  const session = await getSession();
  return session.userProfile ?? null;
}
