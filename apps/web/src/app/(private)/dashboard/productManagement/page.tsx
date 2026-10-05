import Container from '@/components/atoms/Container';
import Link from '@/components/atoms/Link';

const LINKS = [
  { href: '/dashboard/productManagement/party', label: 'Organizaciones e individuos' },
  { href: '/dashboard/publicar/crear-catalogo', label: 'Crear catálogo' },
  { href: '/dashboard/publicar/crear-oferta', label: 'Crear oferta de producto' },
  { href: '/dashboard/publicar/crear-producto', label: 'Crear especificación de producto' },
  { href: '/dashboard/publicar/crear-recurso', label: 'Crear especificación de recurso' },
  { href: '/dashboard/publicar/crear-servicio', label: 'Crear especificación de servicio' },
];

/** Internal page (not linked from the navigation) to exercise the TM Forum APIs during development. */
export default function ProductManagementPage() {
  return (
    <Container className="py-10">
      <span className="mb-3 text-xs font-thin">Herramientas internas de prueba de las APIs</span>
      <div className="mt-8">
        <h3 className="mb-2 text-sm font-semibold">Gestión de entidades (TM Forum)</h3>
        <ul className="list-disc space-y-1 pl-6 text-sm">
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="text-neutral-700 underline hover:text-neutral-900">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Container>
  );
}
