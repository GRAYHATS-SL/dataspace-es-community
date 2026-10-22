import { Suspense } from 'react';

import InventarioClient from './page.client';

export default function InventarioPage() {
  return (
    <Suspense>
      <InventarioClient />
    </Suspense>
  );
}
