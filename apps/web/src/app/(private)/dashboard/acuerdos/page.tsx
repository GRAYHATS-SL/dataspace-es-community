import { getSession } from '@/lib/session';

import AcuerdosClient from './page.client';

export default async function AcuerdosPage() {
  const { userProfile } = await getSession();
  return <AcuerdosClient businessRoles={userProfile?.businessRoles} />;
}
