import { Suspense } from 'react';

import { getSession } from '@/lib/session';

import ConsumoClient from './page.client';

export default async function ConsumoPage() {
  const { userProfile } = await getSession();
  return (
    <Suspense>
      <ConsumoClient businessRoles={userProfile?.businessRoles} />
    </Suspense>
  );
}
