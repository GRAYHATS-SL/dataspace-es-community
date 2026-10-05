import { Suspense } from 'react';

import MyProductsClient from './page.client';

/** "My products" page: products the user consumes or provides. */
export default function MyProductsPage() {
  return (
    <Suspense>
      <MyProductsClient />
    </Suspense>
  );
}
