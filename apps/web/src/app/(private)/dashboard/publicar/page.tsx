import Link from 'next/link';

import Container from '@/components/atoms/Container';
import SectionHeader from '@/components/molecules/SectionHeader';

import PublishOverview from './_sections/PublishOverview';

/** Publishing index: lists the user's entities and links to their create forms. */
export default function PublishPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-muted py-12">
        <SectionHeader
          title="Mis publicaciones"
          subtitle="Gestiona tus especificaciones para publicar productos, servicios y recursos."
          className="px-4"
        />
      </section>
      <section className="py-10">
        <Container>
          <PublishOverview />
          <div className="mt-10">
            <Link href="/dashboard" className="text-gray-600">
              Volver al panel
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
