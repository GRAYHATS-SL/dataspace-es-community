'use client';

import type { UseQueryResult } from '@tanstack/react-query';
import Link from 'next/link';

import Typography from '@/components/atoms/Typography';
import {
  useCatalogs,
  useCategories,
  useProductOfferings,
  useProductSpecifications,
  useResourceSpecifications,
  useServiceSpecifications,
} from '@/hooks/queries';

interface NamedEntity {
  id?: string;
  name?: string;
}

/** Props of `EntityCard`. */
interface EntityCardProps {
  title: string;
  query: UseQueryResult<NamedEntity[], Error>;
  createHref: string;
  createLabel: string;
  emptyLabel: string;
}

const MAX_ITEMS = 5;

function EntityCardBody({ query, emptyLabel }: Readonly<Pick<EntityCardProps, 'query' | 'emptyLabel'>>) {
  if (query.isLoading) {
    return (
      <Typography variant="small" color="gray" role="status">
        Cargando…
      </Typography>
    );
  }
  if (query.isError) {
    return (
      <Typography variant="small" color="danger" role="alert">
        No se pudieron cargar los datos.
      </Typography>
    );
  }
  const items = query.data ?? [];
  if (items.length === 0) {
    return (
      <Typography variant="small" color="gray">
        {emptyLabel}
      </Typography>
    );
  }
  return (
    <ul className="list-disc pl-5 text-sm">
      {items.slice(0, MAX_ITEMS).map((item, i) => (
        <li key={item.id ?? i}>{item.name ?? item.id ?? '—'}</li>
      ))}
    </ul>
  );
}

function EntityCard({ title, query, createHref, createLabel, emptyLabel }: Readonly<EntityCardProps>) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm flex flex-col gap-4">
      <Typography as="h2" variant="subtitle" color="primary">
        {title}
      </Typography>
      <EntityCardBody query={query} emptyLabel={emptyLabel} />
      <Link href={createHref} className="text-neutral-700">
        {createLabel}
      </Link>
    </div>
  );
}

/** Overview of the user's publishable entities with links to their create forms. */
export default function PublishOverview() {
  const catalogs = useCatalogs();
  const categories = useCategories();
  const offerings = useProductOfferings();
  const productSpecs = useProductSpecifications();
  const serviceSpecs = useServiceSpecifications();
  const resourceSpecs = useResourceSpecifications();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      <EntityCard
        title="Catálogos"
        query={catalogs}
        createHref="/dashboard/publicar/crear-catalogo"
        createLabel="Crear nuevo catálogo"
        emptyLabel="Todavía no hay catálogos."
      />
      <EntityCard
        title="Ofertas"
        query={offerings}
        createHref="/dashboard/publicar/crear-oferta"
        createLabel="Crear nueva oferta"
        emptyLabel="Todavía no hay ofertas."
      />
      <EntityCard
        title="Categorías"
        query={categories}
        createHref="/dashboard/publicar/crear-categoria"
        createLabel="Crear nueva categoría"
        emptyLabel="Todavía no hay categorías."
      />
      <EntityCard
        title="Especificaciones de producto"
        query={productSpecs}
        createHref="/dashboard/publicar/crear-producto"
        createLabel="Crear nuevo producto"
        emptyLabel="Todavía no hay especificaciones de producto."
      />
      <EntityCard
        title="Especificaciones de servicio"
        query={serviceSpecs}
        createHref="/dashboard/publicar/crear-servicio"
        createLabel="Crear nuevo servicio"
        emptyLabel="Todavía no hay especificaciones de servicio."
      />
      <EntityCard
        title="Especificaciones de recurso"
        query={resourceSpecs}
        createHref="/dashboard/publicar/crear-recurso"
        createLabel="Crear nuevo recurso"
        emptyLabel="Todavía no hay especificaciones de recurso."
      />
    </div>
  );
}
