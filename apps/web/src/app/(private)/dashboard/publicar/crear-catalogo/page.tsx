import Link from 'next/link';

import Container from '@/components/atoms/Container';
import Typography from '@/components/atoms/Typography';
import SectionHeader from '@/components/molecules/SectionHeader';

export default function CreateCatalog() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-muted py-12">
        <SectionHeader
          title="Crear Catálogo"
          subtitle="Completa el formulario para crear un nuevo catálogo."
          className="px-4"
        />
      </section>
      <section className="py-10">
        <Container>
          <form className="bg-white border rounded-lg p-6 shadow-sm flex flex-col gap-4 max-w-md mx-auto">
            <Typography variant="small" color="gray">
              Formulario básico (placeholder)
            </Typography>
          </form>
          <div className="mt-8 text-center">
            <Link href="/dashboard/publicar" className="text-gray-600">
              Volver a publicar
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
