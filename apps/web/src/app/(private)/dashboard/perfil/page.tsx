import { getSession } from '@/lib/session';
import { getJWTPayload } from '@/lib/utils/verifyJWT';

import PerfilPageClient from './page.client';

export default async function PerfilPage() {
  // Get session and token on the server
  const session = await getSession();
  const userProfile = session.userProfile || null;
  let tokenPayload: Record<string, unknown> | null = null;
  if (session.accessToken) {
    tokenPayload = await getJWTPayload(session.accessToken);
  }

  return <PerfilPageClient userProfile={userProfile} token={tokenPayload} />;
}
