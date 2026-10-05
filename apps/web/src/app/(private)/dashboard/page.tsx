import Container from '@/components/atoms/Container';
import ActionButton from '@/components/molecules/ActionButton';
import SectionHeader from '@/components/molecules/SectionHeader';
import DashboardMetrics from '@/components/organisms/DashboardMetrics';

/** Dashboard home: quick actions and activity metrics. */
export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-muted py-12">
        <SectionHeader
          title="Panel de control"
          subtitle="Resumen de tu actividad en el marketplace."
          className="px-4"
        />
      </section>

      <Container className="py-10 space-y-10">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <ActionButton icon="Search" title="Explorar catálogo" href="/catalogo" />
          <ActionButton icon="CloudUpload" title="Mis publicaciones" href="/dashboard/ofertas" />
          <ActionButton
            icon="ReceiptText"
            title="Órdenes de producto"
            href="/dashboard/ordenes-producto"
          />
        </div>
        <DashboardMetrics />
      </Container>
    </div>
  );
}
