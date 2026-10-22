import { Suspense } from 'react';

import { getSession } from '@/lib/session';

import MisProductosClient from './page.client';

export default async function MisProductosPage() {
  const { userProfile } = await getSession();
  return (
    <Suspense>
      <MisProductosClient businessRoles={userProfile?.businessRoles} />
    </Suspense>
  );
}
