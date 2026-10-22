import { Suspense } from 'react';

import { getSession } from '@/lib/session';

import OrdenesProductoClient from './page.client';

export default async function OrdenesProductoPage() {
  const { userProfile } = await getSession();
  return (
    <Suspense>
      <OrdenesProductoClient businessRoles={userProfile?.businessRoles} />
    </Suspense>
  );
}
