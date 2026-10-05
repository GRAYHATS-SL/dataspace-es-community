import { Suspense } from 'react';

import CatalogPublicClient from './page.client';

export default function CatalogPublicPage() {
  return (
    <Suspense>
      <CatalogPublicClient />
    </Suspense>
  );
}
