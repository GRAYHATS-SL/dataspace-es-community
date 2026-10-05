'use client';

import Container from '@/components/atoms/Container';
import TabFeedback from '@/components/atoms/TabFeedback';
import Typography from '@/components/atoms/Typography';
import SectionHeader from '@/components/molecules/SectionHeader';
import Table from '@/components/organisms/Table';
import { useProductInventory } from '@/hooks/queries';
import { cn } from '@/lib/utils';
import type { ProductInventory, ProductStatus } from '@/types/api';

// ---------------------------------------------------------------------------
// State config
// ---------------------------------------------------------------------------

interface StatusConfig {
  dotColor: string;
  textColor: string;
  label: string;
}

const STATUS_CONFIG: Record<ProductStatus, StatusConfig> = {
  created: { dotColor: 'bg-gray-400', textColor: 'text-gray-600', label: 'Creado' },
  pendingActive: { dotColor: 'bg-neutral-400', textColor: 'text-neutral-700', label: 'Activando' },
  active: { dotColor: 'bg-emerald-500', textColor: 'text-emerald-700', label: 'Activo' },
  suspended: { dotColor: 'bg-amber-400', textColor: 'text-amber-700', label: 'Suspendido' },
  pendingTerminate: {
    dotColor: 'bg-orange-400',
    textColor: 'text-orange-700',
    label: 'Terminando',
  },
  terminated: { dotColor: 'bg-red-500', textColor: 'text-red-700', label: 'Terminado' },
  cancelled: { dotColor: 'bg-red-400', textColor: 'text-red-700', label: 'Cancelado' },
  aborted: { dotColor: 'bg-red-600', textColor: 'text-red-800', label: 'Abortado' },
};

const DEFAULT_STATUS: StatusConfig = {
  dotColor: 'bg-gray-300',
  textColor: 'text-gray-500',
  label: '—',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderStatusBadge(status?: ProductStatus) {
  const config = (status && STATUS_CONFIG[status]) ?? DEFAULT_STATUS;
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className={cn('size-2 rounded-full', config.dotColor)} aria-hidden="true" />
      <Typography variant="small" className={cn('font-mono font-medium', config.textColor)}>
        {config.label}
      </Typography>
    </div>
  );
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const COLUMNS = [
  { key: 'name', label: 'Producto', align: 'left' as const },
  { key: 'offering', label: 'Oferta', align: 'left' as const },
  { key: 'startDate', label: 'Fecha de inicio', align: 'center' as const },
  { key: 'status', label: 'Estado', align: 'center' as const },
  { key: 'id', label: 'ID', align: 'right' as const },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/** InventarioClient - Inventory table with loading, error and empty states. */
export default function InventarioClient() {
  const { data: products = [], isLoading, isError, error } = useProductInventory();

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-muted py-12">
        <SectionHeader
          title="Mi inventario"
          subtitle="Productos adquiridos a través de tus órdenes de compra"
          className="px-4"
        />
      </section>

      <Container className="py-10">
        <div className="mb-6 flex items-center justify-between">
          <Typography as="h2" variant="subtitle" color="primary">
            Mis productos
          </Typography>
          {!isLoading && (
            <Typography variant="small" color="gray">
              {products.length} {products.length === 1 ? 'producto' : 'productos'}
            </Typography>
          )}
        </div>

        {isError ? (
          <div role="alert">
            <TabFeedback loading={false} error />
            <Typography variant="form-hint" className="text-center">
              {error.message}
            </Typography>
          </div>
        ) : (
        <Table
          columns={COLUMNS}
          data={products}
          loading={isLoading}
          keyExtractor={(p, i) => p.id ?? i}
          emptyState={
            <Typography variant="body" color="gray" className="py-8 text-center">
              No tienes productos en tu inventario todavía. Las órdenes completadas generarán
              entradas aquí automáticamente.
            </Typography>
          }
          renderRow={(product: ProductInventory) => (
            <>
              <td className="px-4 py-3 text-left">
                <Typography variant="body" className="font-medium">
                  {product.name ?? '—'}
                </Typography>
                {product.description && (
                  <Typography variant="small" color="gray" className="mt-0.5">
                    {product.description}
                  </Typography>
                )}
              </td>
              <td className="px-4 py-3 text-left">
                <Typography variant="small">
                  {product.productOffering?.name ?? product.productOffering?.id ?? '—'}
                </Typography>
              </td>
              <td className="px-4 py-3 text-center">
                <Typography variant="small" color="gray">
                  {formatDate(product.startDate)}
                </Typography>
              </td>
              <td className="px-4 py-3 text-center">{renderStatusBadge(product.status)}</td>
              <td className="px-4 py-3 text-right">
                <Typography variant="small" className="font-mono text-gray-400">
                  {product.id ?? '—'}
                </Typography>
              </td>
            </>
          )}
        />
        )}
      </Container>
    </div>
  );
}
