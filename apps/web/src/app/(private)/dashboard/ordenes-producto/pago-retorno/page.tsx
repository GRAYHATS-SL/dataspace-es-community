import { Suspense } from 'react';

import PagoRetornoClient from './page.client';

export default function PagoRetornoPage() {
  return (
    <Suspense>
      <PagoRetornoClient />
    </Suspense>
  );
}
