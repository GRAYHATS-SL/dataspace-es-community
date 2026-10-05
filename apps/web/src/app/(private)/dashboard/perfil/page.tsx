import { getSession } from '@/lib/session';
import { findOrganizationIdByExternalId } from '@/lib/services/queries/party';
import { getJWTPayload } from '@/lib/utils/verifyJWT';

import PerfilPageClient from './page.client';

/** Profile page: resolves session, token claims and organization on the server. */
export default async function PerfilPage() {
  let userProfile = null;
  let tokenPayload: Record<string, unknown> | null = null;
  let organizationId = '';

  try {
    const session = await getSession();
    userProfile = session.userProfile ?? null;
    if (session.accessToken) {
      tokenPayload = await getJWTPayload(session.accessToken);
      // Prefer the id resolved at login; fall back to a lookup by external id.
      organizationId = userProfile?.organizationId ?? '';
      if (userProfile && !organizationId) {
        organizationId =
          (await findOrganizationIdByExternalId(userProfile.sub, session.accessToken)) ?? '';
      }
    }
  } catch {
    // Backend or session not configured: the client renders its empty/notice states.
  }

  return (
    <PerfilPageClient
      userProfile={userProfile}
      token={tokenPayload}
      organizationId={organizationId}
    />
  );
}
