import Link from 'next/link';

import Container from '@/components/atoms/Container';
import Typography from '@/components/atoms/Typography';
import SectionHeader from '@/components/molecules/SectionHeader';

export default function Publish() {
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Catálogo */}
            <div className="rounded-lg border bg-white p-6 shadow-sm flex flex-col gap-4">
              <Typography as="h2" variant="subtitle" color="primary">
                Catálogo
              </Typography>
              <ul className="list-disc pl-5 text-sm">
                <li>Catálogo 1</li>
                <li>Catálogo 2</li>
              </ul>
              <Link href="/dashboard/publicar/crear-catalogo" className="text-blue-600">
                Crear nuevo Catálogo
              </Link>
            </div>
            {/* Oferta */}
            <div className="rounded-lg border bg-white p-6 shadow-sm flex flex-col gap-4">
              <Typography as="h2" variant="subtitle" color="primary">
                Ofertas
              </Typography>
              <ul className="list-disc pl-5 text-sm">
                <li>Oferta 1</li>
                <li>Oferta 2</li>
              </ul>
              <Link href="/dashboard/publicar/crear-oferta" className="text-blue-600">
                Crear nueva oferta
              </Link>
            </div>
            <div />
            {/* Product Specifications */}
            <div className="rounded-lg border bg-white p-6 shadow-sm flex flex-col gap-4">
              <Typography as="h2" variant="subtitle" color="primary">
                Product Specifications
              </Typography>
              <ul className="list-disc pl-5 text-sm">
                <li>Producto 1</li>
                <li>Producto 2</li>
              </ul>
              <Link href="/dashboard/publicar/crear-producto" className="text-blue-600">
                Crear nuevo producto
              </Link>
            </div>
            {/* Service Specifications */}
            <div className="rounded-lg border bg-white p-6 shadow-sm flex flex-col gap-4">
              <Typography as="h2" variant="subtitle" color="primary">
                Service Specifications
              </Typography>
              <ul className="list-disc pl-5 text-sm">
                <li>Servicio 1</li>
                <li>Servicio 2</li>
              </ul>
              <Link href="/dashboard/publicar/crear-servicio" className="text-blue-600">
                Crear nuevo servicio
              </Link>
            </div>
            {/* Resource Specifications */}
            <div className="rounded-lg border bg-white p-6 shadow-sm flex flex-col gap-4">
              <Typography as="h2" variant="subtitle" color="primary">
                Resource Specifications
              </Typography>
              <ul className="list-disc pl-5 text-sm">
                <li>Recurso 1</li>
                <li>Recurso 2</li>
              </ul>
              <Link href="/dashboard/publicar/crear-recurso" className="text-blue-600">
                Crear nuevo recurso
              </Link>
            </div>
          </div>
          <div className="mt-10">
            <Link href="/dashboard" className="text-gray-600">
              Volver al dashboard
            </Link>
          </div>
        </Container>
      </section>
    </div>
  );
}
