import OfferingDetailClient from './page.client';

interface PageProps {
  params: Promise<{ offeringId: string }>;
}

/** Decodes the route param without throwing on malformed input. */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export default async function OfferingDetailPage({ params }: Readonly<PageProps>) {
  const { offeringId } = await params;
  return <OfferingDetailClient offeringId={safeDecode(offeringId)} />;
}
