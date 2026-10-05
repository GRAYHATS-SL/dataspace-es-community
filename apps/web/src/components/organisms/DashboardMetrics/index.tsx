'use client';

import MetricCard from '@/components/molecules/MetricCard';
import {
  useAgreements,
  useCatalogs,
  useCategories,
  useProductInventory,
  useProductOfferingPrices,
  useProductOfferings,
  useProductOrders,
  useProductSpecifications,
} from '@/hooks/queries';

interface MetricItem {
  icon: string;
  label: string;
  value: number;
}

/** DashboardMetrics - Dashboard KPIs (own catalog + marketplace activity). */
export default function DashboardMetrics() {
  const catalogsQuery = useCatalogs();
  const categoriesQuery = useCategories();
  const offeringsQuery = useProductOfferings();
  const specsQuery = useProductSpecifications();
  const pricesQuery = useProductOfferingPrices();
  const agreementsQuery = useAgreements();
  const ordersQuery = useProductOrders();
  const inventoryQuery = useProductInventory();

  const catalogLoading =
    catalogsQuery.isLoading ||
    categoriesQuery.isLoading ||
    offeringsQuery.isLoading ||
    specsQuery.isLoading ||
    pricesQuery.isLoading;
  const activityLoading =
    agreementsQuery.isLoading || ordersQuery.isLoading || inventoryQuery.isLoading;

  const offerings = offeringsQuery.data ?? [];
  const catalogs = catalogsQuery.data ?? [];

  // Here you define your business logic (which statuses count as "published", "active", etc.).
  const catalogMetrics: MetricItem[] = [
    {
      icon: 'Store',
      label: 'Ofertas publicadas',
      value: offerings.filter((o) => o.lifecycleStatus === 'Launched').length,
    },
    {
      icon: 'Database',
      label: 'Catálogos activos',
      value: catalogs.filter((c) => c.lifecycleStatus === 'Launched').length,
    },
    { icon: 'FileText', label: 'Especificaciones', value: specsQuery.data?.length ?? 0 },
    { icon: 'Layers', label: 'Categorías', value: categoriesQuery.data?.length ?? 0 },
    { icon: 'CircleDollarSign', label: 'Precios', value: pricesQuery.data?.length ?? 0 },
    { icon: 'Package', label: 'Ofertas totales', value: offerings.length },
  ];

  const activityMetrics: MetricItem[] = [
    { icon: 'Handshake', label: 'Acuerdos', value: agreementsQuery.data?.length ?? 0 },
    { icon: 'ReceiptText', label: 'Órdenes', value: ordersQuery.data?.length ?? 0 },
    {
      icon: 'PackageCheck',
      label: 'Productos activos',
      value: (inventoryQuery.data ?? []).filter((p) => p.status === 'active').length,
    },
    { icon: 'Archive', label: 'Inventario total', value: inventoryQuery.data?.length ?? 0 },
  ];

  return (
    <div className="space-y-10">
      <section aria-label="Mi catálogo">
        <p className="mb-4 text-xs font-medium uppercase tracking-widest text-gray-light">
          Mi catálogo
        </p>
        <p className="mb-4 text-xs text-gray-light">
          Estado actual de tus catálogos, ofertas y especificaciones.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {catalogMetrics.map((m) => (
            <MetricCard key={m.label} {...m} loading={catalogLoading} />
          ))}
        </div>
      </section>

      <section aria-label="Actividad">
        <p className="mb-1 text-xs font-medium uppercase tracking-widest text-gray-light">
          Actividad
        </p>
        <p className="mb-4 text-xs text-gray-light">Acuerdos, órdenes e inventario.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {activityMetrics.map((m) => (
            <MetricCard key={m.label} {...m} loading={activityLoading} />
          ))}
        </div>
      </section>
    </div>
  );
}
