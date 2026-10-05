import Container from '@/components/atoms/Container';
import SectionHeader from '@/components/molecules/SectionHeader';

import OfferingManager from './_sections/OfferingManager';

export default function OfertasPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-muted py-12">
        <SectionHeader
          title="Ofertas"
          subtitle="Consulta, crea, edita, publica y elimina tus ofertas de producto."
          className="px-4"
        />
      </section>

      <Container className="py-10">
        <OfferingManager />
      </Container>
    </div>
  );
}
