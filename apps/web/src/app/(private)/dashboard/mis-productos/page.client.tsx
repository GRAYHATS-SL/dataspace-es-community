'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import Button from '@/components/atoms/Button';
import Container from '@/components/atoms/Container';
import Icon from '@/components/atoms/Icon';
import Meter from '@/components/atoms/Meter';
import ProductStatusBadge from '@/components/atoms/ProductStatusBadge';
import Typography from '@/components/atoms/Typography';
import SectionHeader from '@/components/molecules/SectionHeader';
import TabNavigation from '@/components/molecules/TabNavigation';
import Table from '@/components/organisms/Table';
import {
  useProductInventoriesAsBuyer,
  useProductInventoriesAsSeller,
  useUpdateProductStatus,
} from '@/hooks/queries';
import { useUsagesByProduct } from '@/hooks/queries/useUsageQueries';
import type { BusinessRole } from '@/lib/session';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/utils/formatDate';
import { getVisibleRoleTabs } from '@/lib/utils/roleTabs';
import { deriveTokenConsumption, extractTokenLimits } from '@/lib/utils/tokenUsage';
import type { ProductInventory, ProductStatus } from '@/types/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'buyer', label: 'Como consumidor', icon: 'ShoppingCart' },
  { id: 'seller', label: 'Como proveedor', icon: 'Package' },
];

interface PillConfig {
  bgColor: string;
  textColor: string;
  dotColor: string;
  label: string;
}

const STATUS_PILL_CONFIG: Record<string, PillConfig> = {
  active: {
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    dotColor: 'bg-emerald-500',
    label: 'Activo',
  },
  created: {
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    dotColor: 'bg-blue-400',
    label: 'Creado',
  },
  pendingActive: {
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    dotColor: 'bg-amber-400',
    label: 'Activando',
  },
  suspended: {
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    dotColor: 'bg-orange-400',
    label: 'Suspendido',
  },
  pendingTerminate: {
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    dotColor: 'bg-amber-400',
    label: 'Terminando',
  },
  terminated: {
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600',
    dotColor: 'bg-gray-400',
    label: 'Terminado',
  },
  cancelled: {
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    dotColor: 'bg-red-400',
    label: 'Cancelado',
  },
  aborted: {
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    dotColor: 'bg-red-600',
    label: 'Abortado',
  },
};

const DEFAULT_PILL_CONFIG: PillConfig = {
  bgColor: 'bg-gray-50',
  textColor: 'text-gray-500',
  dotColor: 'bg-gray-300',
  label: '—',
};

const BUYER_COLUMNS = [
  { key: 'dataset', label: 'Dataset', align: 'left' as const },
  { key: 'provider', label: 'Proveedor', align: 'left' as const },
  { key: 'start', label: 'Inicio', align: 'center' as const },
  { key: 'expiry', label: 'Expiración', align: 'center' as const },
  { key: 'status', label: 'Estado', align: 'center' as const },
  { key: 'consumption', label: 'Consumo', align: 'center' as const },
  { key: 'agreement', label: 'Acuerdo', align: 'center' as const },
  { key: 'detail', label: '', align: 'right' as const },
];

const SELLER_COLUMNS = [
  { key: 'dataset', label: 'Dataset', align: 'left' as const },
  { key: 'buyer', label: 'Comprador', align: 'left' as const },
  { key: 'start', label: 'Inicio', align: 'center' as const },
  { key: 'expiry', label: 'Expiración', align: 'center' as const },
  { key: 'status', label: 'Estado', align: 'center' as const },
  { key: 'actions', label: 'Acciones', align: 'right' as const },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getParty(product: ProductInventory, role: 'buyer' | 'seller') {
  const party = product.relatedParty?.find((p) => p.role?.toLowerCase() === role);
  return party?.name ?? party?.id ?? '—';
}

// ─── ProductDetailDrawer ──────────────────────────────────────────────────────

function ProductDetailDrawer({
  product,
  onClose,
}: Readonly<{ product: ProductInventory | null; onClose: () => void }>) {
  const router = useRouter();
  if (!product) return null;

  const statusConfig =
    (product.status ? STATUS_PILL_CONFIG[product.status] : undefined) ?? DEFAULT_PILL_CONFIG;
  const agreementId = product.agreement?.[0]?.id;
  const orderId = product.productOrderItem?.[0]?.productOrderId;
  const seller = product.relatedParty?.find((p) => p.role?.toLowerCase() === 'seller');
  const buyer = product.relatedParty?.find((p) => p.role?.toLowerCase() === 'buyer');

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden="true" />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <Typography as="h2" variant="subtitle">
              Detalle del producto
            </Typography>
            {product.name && (
              <Typography variant="small" color="gray">
                {product.name}
              </Typography>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="rounded p-1 text-gray-400 hover:text-gray-700"
          >
            <Icon name="X" size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-6 p-6">
          <span
            className={cn(
              'inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium',
              statusConfig.bgColor,
              statusConfig.textColor,
            )}
          >
            <span className={cn('size-2 rounded-full', statusConfig.dotColor)} />
            {statusConfig.label}
          </span>

          <div className="flex flex-col gap-1">
            <Typography variant="small" className="mb-1 font-semibold text-gray-700">
              Partes
            </Typography>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 text-sm">
              {buyer && (
                <div className="flex justify-between border-b border-gray-100 py-1.5">
                  <Typography variant="small" color="gray">
                    Comprador
                  </Typography>
                  <Typography variant="small">{buyer.name ?? buyer.id}</Typography>
                </div>
              )}
              {seller && (
                <div className="flex justify-between py-1.5">
                  <Typography variant="small" color="gray">
                    Proveedor
                  </Typography>
                  <Typography variant="small">{seller.name ?? seller.id}</Typography>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <Typography variant="small" className="mb-1 font-semibold text-gray-700">
              Vigencia
            </Typography>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <div className="flex justify-between border-b border-gray-100 py-1.5">
                <Typography variant="small" color="gray">
                  Inicio
                </Typography>
                <Typography variant="small">{formatDate(product.startDate)}</Typography>
              </div>
              <div className="flex justify-between py-1.5">
                <Typography variant="small" color="gray">
                  Expiración
                </Typography>
                <Typography variant="small">
                  {product.terminationDate ? formatDate(product.terminationDate) : 'Sin expiración'}
                </Typography>
              </div>
            </div>
          </div>

          {product.productOffering && (
            <div className="flex flex-col gap-1">
              <Typography variant="small" className="mb-1 font-semibold text-gray-700">
                Oferta vinculada
              </Typography>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <Typography variant="small" className="break-all font-mono text-xs text-gray-500">
                  {product.productOffering.name ?? product.productOffering.id}
                </Typography>
              </div>
            </div>
          )}

          {agreementId && (
            <div className="flex flex-col gap-1">
              <Typography variant="small" className="mb-1 font-semibold text-gray-700">
                Términos del acuerdo
              </Typography>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
                <Typography variant="small" className="break-all font-mono text-xs text-gray-500">
                  {agreementId}
                </Typography>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onClose();
                    router.push(`/dashboard/acuerdos?id=${encodeURIComponent(agreementId)}`);
                  }}
                >
                  Ver
                </Button>
              </div>
            </div>
          )}

          {orderId && (
            <div className="flex flex-col gap-1">
              <Typography variant="small" className="mb-1 font-semibold text-gray-700">
                Orden de origen
              </Typography>
              <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-4">
                <Typography variant="small" className="break-all font-mono text-xs text-gray-500">
                  {orderId}
                </Typography>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    onClose();
                    router.push(`/dashboard/ordenes-producto?id=${encodeURIComponent(orderId)}`);
                  }}
                >
                  Ver
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Icon name="Hash" size={12} />
            <span className="break-all font-mono">{product.id}</span>
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── TokenConsumptionCell ─────────────────────────────────────────────────────

/** Consumption bars of a token, if the `Product` has `tokenLimits`. */
function TokenConsumptionCell({ product }: Readonly<{ product: ProductInventory }>) {
  const limits = extractTokenLimits(product);
  const { data: usages, isError } = useUsagesByProduct(product.id ?? '');

  if (!limits) {
    return (
      <Typography variant="small" color="gray">
        —
      </Typography>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-0.5 text-left">
        <Typography variant="small" color="gray">
          Límite: {limits.maxRequests.toLocaleString('es-ES')} peticiones /{' '}
          {limits.maxTransferTB.toLocaleString('es-ES')} TB
        </Typography>
        <Typography variant="small" color="gray" className="italic">
          Consumo no disponible
        </Typography>
      </div>
    );
  }

  const consumption = deriveTokenConsumption(usages ?? []);

  return (
    <div className="flex w-40 flex-col gap-2">
      <Meter used={consumption.usedRequests} total={limits.maxRequests} label="Peticiones" />
      <Meter
        used={consumption.usedTransferTB}
        total={limits.maxTransferTB}
        label="Transferencia"
        unit="TB"
      />
    </div>
  );
}

// ─── SellerProductActions ─────────────────────────────────────────────────────

interface SellerProductActionsProps {
  product: ProductInventory;
  onUpdate: (id: string, status: ProductStatus) => void;
  isLoading: boolean;
}

function SellerProductActions({
  product,
  onUpdate,
  isLoading,
}: Readonly<SellerProductActionsProps>) {
  const [confirmTerminate, setConfirmTerminate] = useState(false);
  const { id, status } = product;

  if (!id) return null;

  if (confirmTerminate) {
    return (
      <div className="flex items-center justify-end gap-2">
        <Typography variant="small" color="gray">
          ¿Terminar acceso?
        </Typography>
        <Button
          size="sm"
          variant="primary"
          disabled={isLoading}
          onClick={() => {
            onUpdate(id, 'terminated');
            setConfirmTerminate(false);
          }}
        >
          Confirmar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={isLoading}
          onClick={() => setConfirmTerminate(false)}
        >
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {status === 'active' && (
        <Button
          size="sm"
          variant="outline"
          disabled={isLoading}
          onClick={() => onUpdate(id, 'suspended')}
        >
          Suspender
        </Button>
      )}
      {status === 'suspended' && (
        <Button
          size="sm"
          variant="outline"
          disabled={isLoading}
          onClick={() => onUpdate(id, 'active')}
        >
          Reactivar
        </Button>
      )}
      {(status === 'active' || status === 'suspended') && (
        <Button
          size="sm"
          variant="ghost"
          disabled={isLoading}
          onClick={() => setConfirmTerminate(true)}
        >
          Terminar
        </Button>
      )}
    </div>
  );
}

// ─── MisProductosClient ───────────────────────────────────────────────────────

interface MisProductosClientProps {
  /** Business roles of the session. */
  businessRoles?: readonly BusinessRole[];
}

export default function MisProductosClient({ businessRoles }: Readonly<MisProductosClientProps>) {
  const router = useRouter();
  const tabs = getVisibleRoleTabs(TABS, businessRoles);
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [selectedProduct, setSelectedProduct] = useState<ProductInventory | null>(null);

  // Only the list of the active tab is queried.
  const {
    data: buyerProducts = [],
    isLoading: loadingBuyer,
    isError: errorBuyer,
  } = useProductInventoriesAsBuyer({ enabled: activeTab === 'buyer' });
  const {
    data: sellerProducts = [],
    isLoading: loadingSeller,
    isError: errorSeller,
  } = useProductInventoriesAsSeller({ enabled: activeTab === 'seller' });

  const { mutate: updateStatus, isPending: updatingStatus } = useUpdateProductStatus();

  const products = activeTab === 'buyer' ? buyerProducts : sellerProducts;
  const isLoading = activeTab === 'buyer' ? loadingBuyer : loadingSeller;
  const isError = activeTab === 'buyer' ? errorBuyer : errorSeller;
  const columns = activeTab === 'buyer' ? BUYER_COLUMNS : SELLER_COLUMNS;

  const handleUpdateStatus = (id: string, status: ProductStatus) => {
    updateStatus({ id, status });
  };

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-muted py-12">
        <SectionHeader
          title="Mis productos"
          subtitle="Datasets y servicios con acceso activo"
          className="px-4"
        />
      </section>

      <Container className="py-10">
        {tabs.length > 1 && (
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            className="mb-6"
          />
        )}

        <div className="mb-6">
          <Typography as="h2" variant="subtitle" color="primary">
            {activeTab === 'buyer' ? 'Accesos como consumidor' : 'Accesos como proveedor'}
          </Typography>
        </div>

        <Table
          columns={columns}
          data={products}
          loading={isLoading}
          variant="plain"
          size="md"
          keyExtractor={(p, i) => p.id ?? i}
          emptyState={
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Icon name="Package" size={40} className="text-gray-200" />
              {isError ? (
                <Typography variant="body" className="text-danger" role="alert">
                  No se pudieron cargar tus productos. Inténtalo de nuevo más tarde.
                </Typography>
              ) : (
                <Typography variant="body" color="gray">
                  {activeTab === 'buyer'
                    ? 'No tienes productos activos como consumidor todavía.'
                    : 'No has activado accesos como proveedor todavía.'}
                </Typography>
              )}
            </div>
          }
          renderRow={(product) => (
            <>
              <td className="px-4 py-3 text-left">
                <Typography variant="body" className="font-medium">
                  {product.name ?? '—'}
                </Typography>
              </td>
              <td className="px-4 py-3 text-left">
                <Typography variant="small" color="gray">
                  {getParty(product, activeTab === 'buyer' ? 'seller' : 'buyer')}
                </Typography>
              </td>
              <td className="px-4 py-3 text-center">
                <Typography variant="small" color="gray">
                  {formatDate(product.startDate)}
                </Typography>
              </td>
              <td className="px-4 py-3 text-center">
                <Typography variant="small" color="gray">
                  {product.terminationDate ? formatDate(product.terminationDate) : 'Sin expiración'}
                </Typography>
              </td>
              <td className="px-4 py-3 text-center">
                <ProductStatusBadge status={product.status} />
              </td>
              {activeTab === 'buyer' && (
                <td className="px-4 py-3 text-center">
                  <TokenConsumptionCell product={product} />
                </td>
              )}
              {activeTab === 'buyer' && (
                <td className="px-4 py-3 text-center">
                  {product.agreement?.[0]?.id ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        router.push(
                          `/dashboard/acuerdos?id=${encodeURIComponent(product.agreement?.[0]?.id ?? '')}`,
                        )
                      }
                    >
                      Ver acuerdo
                    </Button>
                  ) : (
                    <Typography variant="small" color="gray">
                      —
                    </Typography>
                  )}
                </td>
              )}
              {activeTab === 'seller' ? (
                <td className="px-4 py-3 text-right">
                  <SellerProductActions
                    product={product}
                    onUpdate={handleUpdateStatus}
                    isLoading={updatingStatus}
                  />
                </td>
              ) : (
                <td className="px-4 py-3 text-right">
                  <Button size="sm" variant="ghost" onClick={() => setSelectedProduct(product)}>
                    Ver detalle
                  </Button>
                </td>
              )}
            </>
          )}
        />
      </Container>

      <ProductDetailDrawer product={selectedProduct} onClose={() => setSelectedProduct(null)} />
    </div>
  );
}
