'use server';

import { getSession } from '@/lib/session';
import type { Individual } from '@/types/api';

import { findOrCreateIndividual } from './findOrCreateIndividual';
import { findOrganizationIdByExternalId } from './party';

/** Result of `linkIndividualProfile`. */
export type LinkIndividualProfileResult =
  | { status: 'linked'; individual: Individual }
  | { status: 'no_organization' }
  | { status: 'no_email' }
  | { status: 'error'; message: string };

/** Links the session user to its TMF Individual and Organization. */
export async function linkIndividualProfile(): Promise<LinkIndividualProfileResult> {
  const session = await getSession();
  const profile = session.userProfile;
  if (!profile || !session.accessToken) return { status: 'error', message: 'No active session.' };
  if (!profile.email) return { status: 'no_email' };

  // Here you define your business logic (resolve the organization, persist the link in the session).
  const organizationId = await findOrganizationIdByExternalId(profile.sub, session.accessToken);
  if (!organizationId) return { status: 'no_organization' };

  try {
    const individual = await findOrCreateIndividual({
      email: profile.email,
      organizationId,
      fullName: profile.name,
      accessToken: session.accessToken,
    });
    return { status: 'linked', individual };
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Unknown error.' };
  }
}
