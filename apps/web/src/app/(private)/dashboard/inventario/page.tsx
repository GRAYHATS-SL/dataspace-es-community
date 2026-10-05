import { Suspense } from 'react';

import InventarioClient from './page.client';

/** Inventory of products acquired by the user. */
export default function InventarioPage() {
  return (
    <Suspense>
      <InventarioClient />
    </Suspense>
  );
}
