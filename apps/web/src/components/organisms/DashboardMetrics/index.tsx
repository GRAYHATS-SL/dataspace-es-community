'use client';

import MetricCard from '@/components/molecules/MetricCard';
import { useCatalogs } from '@/hooks/queries/useCatalogQueries';
import { useCategories } from '@/hooks/queries/useCategoryQueries';
import { useProductOfferingPrices } from '@/hooks/queries/useProductOfferingPriceQueries';
import { useProductOfferings } from '@/hooks/queries/useProductOfferingQueries';
import { useProductSpecifications } from '@/hooks/queries/useProductSpecificationQueries';

// Fake — replace with real hooks once Agreement, ProductOrder and Usage Management are integrated (TMF 645, TMF 622, TMF 635)
const DATASPACE_METRICS = [
  {
    icon: 'Handshake',
    label: 'Acuerdos de datos activos',
    value: '3',
    trend: { label: '+2', positive: true },
  },
  {
    icon: 'PackageCheck',
    label: 'Suscripciones en vigor',
    value: '9',
    trend: { label: '+12%', positive: true },
  },
  {
    icon: 'ClipboardList',
    label: 'Peticiones de acceso',
    value: '2',
    trend: { label: '-2', positive: false },
  },
  {
    icon: 'Activity',
    label: 'Consumo este mes',
    value: '1,4 GB',
    trend: { label: '+8%', positive: true },
  },
] as const;

// Component

/** DashboardMetrics - Dashboard metrics panel */
export default function DashboardMetrics() {
  const catalogsQuery = useCatalogs();
  const categoriesQuery = useCategories();
  const offeringsQuery = useProductOfferings();
  const specsQuery = useProductSpecifications();
  const pricesQuery = useProductOfferingPrices();

  const isLoading =
    catalogsQuery.isLoading ||
    categoriesQuery.isLoading ||
    offeringsQuery.isLoading ||
    specsQuery.isLoading ||
    pricesQuery.isLoading;

  const catalogs = catalogsQuery.data ?? [];
  const offerings = offeringsQuery.data ?? [];

  const catalogMetrics = [
    {
      icon: 'Store',
      label: 'Datasets en mercado',
      value: offerings.filter((o) => o.lifecycleStatus === 'Launched').length,
    },
    {
      icon: 'Database',
      label: 'Catálogos activos',
      value: catalogs.filter((c) => c.lifecycleStatus === 'Launched').length,
    },
    {
      icon: 'FileText',
      label: 'Fichas de datos',
      value: specsQuery.data?.length ?? 0,
    },
    {
      icon: 'Layers',
      label: 'Categorías temáticas',
      value: categoriesQuery.data?.length ?? 0,
    },
    {
      icon: 'CircleDollarSign',
      label: 'Modelos de precio',
      value: pricesQuery.data?.length ?? 0,
    },
    {
      icon: 'Package',
      label: 'Total datasets',
      value: offerings.length,
    },
  ];

  return (
    <div className="space-y-10">
      <section aria-label="Mi catálogo de datos">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-gray-light">
          Mi catálogo de datos
        </p>
        <p className="mb-4 text-xs text-gray-light">
          Estado actual de tus catálogos, ofertas y fichas de datos.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {catalogMetrics.map((m) => (
            <MetricCard key={m.label} {...m} loading={isLoading} />
          ))}
        </div>
      </section>

      <section aria-label="Actividad del espacio de datos">
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-gray-light">
          Actividad del espacio de datos
        </p>
        <p className="mb-4 text-xs text-gray-light">Acuerdos, órdenes y consumo.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {DATASPACE_METRICS.map((m) => (
            <MetricCard key={m.label} {...m} estimated loading={isLoading} />
          ))}
        </div>
      </section>
    </div>
  );
}
