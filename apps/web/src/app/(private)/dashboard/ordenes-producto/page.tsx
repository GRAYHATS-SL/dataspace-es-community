import { Suspense } from 'react';

import OrdenesProductoClient from './page.client';

export default function OrdenesProductoPage() {
  return (
    <Suspense>
      <OrdenesProductoClient />
    </Suspense>
  );
}
