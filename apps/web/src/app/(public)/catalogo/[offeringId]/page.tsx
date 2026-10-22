import { Suspense } from 'react';

import OfferingDetailClient from './page.client';

interface PageProps {
  params: Promise<{ offeringId: string }>;
}

export default async function OfferingDetailPage({ params }: Readonly<PageProps>) {
  const { offeringId } = await params;
  return (
    <Suspense>
      <OfferingDetailClient offeringId={decodeURIComponent(offeringId)} />
    </Suspense>
  );
}
