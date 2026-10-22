'use client';

import { useEffect, useRef, useState } from 'react';

import Button from '@/components/atoms/Button';
import Container from '@/components/atoms/Container';
import Typography from '@/components/atoms/Typography';
import { FilterGroup, FilterPanelHeader, FilterPill } from '@/components/molecules/FilterControls';
import SectionHeader from '@/components/molecules/SectionHeader';
import TabNavigation from '@/components/molecules/TabNavigation';
import AgreementDrawer from '@/components/organisms/AgreementDrawer';
import OrderDetailDrawer from '@/components/organisms/OrderDetailDrawer';
import { isReconcilableState } from '@/components/organisms/OrderDetailDrawer/constants';
import Table from '@/components/organisms/Table';
import {
  useCancelProductOrder,
  useProductOrdersAsBuyer,
  useProductOrdersAsSeller,
  useReconcileProductOrderPayment,
  useTransitionProductOrder,
} from '@/hooks/queries';
import { useNotifications } from '@/lib/providers/NotificationsProvider';
import type { BusinessRole } from '@/lib/session';
import { cn } from '@/lib/utils';
import { getVisibleRoleTabs } from '@/lib/utils/roleTabs';
import type { ProductOrder, ProductOrderState } from '@/types/api';

// Constants

const TABS = [
  { id: 'buyer', label: 'Como consumidor', icon: 'ShoppingCart' },
  { id: 'seller', label: 'Como vendedor', icon: 'Package' },
];

interface StateConfig {
  dotColor: string;
  textColor: string;
  label: string;
}

const STATE_CONFIG: Partial<Record<ProductOrderState, StateConfig>> = {
  acknowledged: { dotColor: 'bg-gray-400', textColor: 'text-gray-700', label: 'Recibida' },
  assessingCancellation: {
    dotColor: 'bg-yellow-400',
    textColor: 'text-yellow-700',
    label: 'Evaluando cancelación',
  },
  cancelled: { dotColor: 'bg-orange-400', textColor: 'text-orange-700', label: 'Cancelada' },
  completed: { dotColor: 'bg-emerald-500', textColor: 'text-emerald-700', label: 'Completada' },
  failed: { dotColor: 'bg-red-500', textColor: 'text-red-700', label: 'Fallida' },
  held: { dotColor: 'bg-amber-400', textColor: 'text-amber-700', label: 'En espera' },
  inProgress: { dotColor: 'bg-blue-500', textColor: 'text-blue-700', label: 'En progreso' },
  partial: { dotColor: 'bg-orange-400', textColor: 'text-orange-700', label: 'Parcial' },
  pending: { dotColor: 'bg-amber-400', textColor: 'text-amber-700', label: 'Pendiente' },
  pendingCancellation: {
    dotColor: 'bg-yellow-400',
    textColor: 'text-yellow-700',
    label: 'Cancelación pendiente',
  },
  rejected: { dotColor: 'bg-red-500', textColor: 'text-red-700', label: 'Rechazada' },
};

const DEFAULT_STATE: StateConfig = {
  dotColor: 'bg-gray-400',
  textColor: 'text-gray-600',
  label: '—',
};

const FILTER_STATES: Array<{ value: ProductOrderState; label: string }> = [
  { value: 'pending', label: 'Pendiente' },
  { value: 'acknowledged', label: 'Recibida' },
  { value: 'inProgress', label: 'En progreso' },
  { value: 'partial', label: 'Parcial' },
  { value: 'held', label: 'En espera' },
  { value: 'completed', label: 'Completada' },
  { value: 'cancelled', label: 'Cancelada' },
  { value: 'assessingCancellation', label: 'Evaluando cancelación' },
  { value: 'pendingCancellation', label: 'Cancelación pendiente' },
  { value: 'failed', label: 'Fallida' },
  { value: 'rejected', label: 'Rechazada' },
];

type PeriodFilter = '7d' | '30d' | '90d';
type AgreementFilter = 'with' | 'without';

const PERIOD_DAYS = new Map<PeriodFilter, number>([
  ['7d', 7],
  ['30d', 30],
  ['90d', 90],
]);

const PERIOD_FILTERS: Array<{ value: PeriodFilter; label: string }> = [
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Último mes' },
  { value: '90d', label: 'Últimos 3 meses' },
];

const AGREEMENT_FILTERS: Array<{ value: AgreementFilter; label: string }> = [
  { value: 'with', label: 'Con acuerdo' },
  { value: 'without', label: 'Sin acuerdo' },
];

const ORDER_COLUMNS = [
  { key: 'offering', label: 'Oferta de producto', align: 'left' as const },
  { key: 'date', label: 'Fecha de orden', align: 'center' as const },
  { key: 'state', label: 'Estado', align: 'center' as const },
  { key: 'detail', label: '', align: 'right' as const },
];

const SELLER_COLUMNS = [
  { key: 'offering', label: 'Oferta de producto', align: 'left' as const },
  { key: 'buyer', label: 'Comprador', align: 'left' as const },
  { key: 'date', label: 'Fecha de orden', align: 'center' as const },
  { key: 'state', label: 'Estado', align: 'center' as const },
  { key: 'actions', label: 'Acciones', align: 'right' as const },
];

// Helpers

// v2: the order is created without `state` (pending payment).
const PENDING_PAYMENT_STATE: StateConfig = {
  dotColor: 'bg-gray-400',
  textColor: 'text-gray-700',
  label: 'Pendiente de pago',
};

const STATE_CONFIG_BY_STATE = new Map<string, StateConfig>(Object.entries(STATE_CONFIG));

const renderStateBadge = (state?: ProductOrderState) => {
  const config = state ? (STATE_CONFIG_BY_STATE.get(state) ?? DEFAULT_STATE) : PENDING_PAYMENT_STATE;
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className={cn('size-2 rounded-full', config.dotColor)} aria-hidden="true" />
      <Typography variant="small" className={cn('font-mono font-medium', config.textColor)}>
        {config.label}
      </Typography>
    </div>
  );
};

const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const getOfferingName = (order: ProductOrder) =>
  order.productOrderItem?.[0]?.productOffering?.name ??
  order.productOrderItem?.[0]?.productOffering?.id ??
  order.id ??
  '—';

const getBuyerName = (order: ProductOrder) => {
  const buyer = order.relatedParty?.find((p) => p.role?.toLowerCase() === 'buyer');
  return buyer?.name ?? buyer?.id ?? '—';
};

const applyFilters = (
  orders: ProductOrder[],
  stateFilter: ProductOrderState | null,
  periodFilter: PeriodFilter | null,
  agreementFilter: AgreementFilter | null,
) => {
  let result = orders;
  if (stateFilter) result = result.filter((o) => o.state === stateFilter);
  if (periodFilter) {
    const days = PERIOD_DAYS.get(periodFilter) ?? 0;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    result = result.filter((o) => !!o.orderDate && new Date(o.orderDate) >= cutoff);
  }
  if (agreementFilter === 'with') result = result.filter((o) => (o.agreement?.length ?? 0) > 0);
  if (agreementFilter === 'without') result = result.filter((o) => !o.agreement?.length);
  return result;
};

// FilterBar

interface FilterBarProps {
  stateFilter: ProductOrderState | null;
  periodFilter: PeriodFilter | null;
  agreementFilter: AgreementFilter | null;
  onStateChange: (value: ProductOrderState | null) => void;
  onPeriodChange: (value: PeriodFilter | null) => void;
  onAgreementChange: (value: AgreementFilter | null) => void;
  resultCount: number;
  hasActiveFilters: boolean;
}

const FilterBar = ({
  stateFilter,
  periodFilter,
  agreementFilter,
  onStateChange,
  onPeriodChange,
  onAgreementChange,
  resultCount,
  hasActiveFilters,
}: Readonly<FilterBarProps>) => {
  const [open, setOpen] = useState(false);

  const activeCount = [stateFilter, periodFilter, agreementFilter].filter(Boolean).length;

  return (
    <div className="mb-6 rounded-xl border border-gray-100 bg-white overflow-hidden">
      <FilterPanelHeader
        activeFilterCount={activeCount}
        onClearAll={() => {
          onStateChange(null);
          onPeriodChange(null);
          onAgreementChange(null);
        }}
        mobileOpen={open}
        onMobileToggle={() => setOpen((v) => !v)}
        mobileControlsId="order-filter-panel"
      />

      {hasActiveFilters && (
        <div className="flex items-center px-4 py-2 border-b border-gray-100">
          <div role="status" aria-live="polite" aria-atomic="true">
            <span className="tabular-nums text-xs text-gray">
              {resultCount} resultado{resultCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      )}

      {/* Panel plegable — en desktop siempre visible */}
      <div id="order-filter-panel" className={cn(open ? 'block md:block' : 'hidden md:block')}>
        <div className="flex flex-wrap gap-x-6 gap-y-4 p-4">
          <FilterGroup id="order-filter-estado" label="Estado">
            {FILTER_STATES.map((opt) => (
              <FilterPill
                key={opt.value}
                label={opt.label}
                selected={stateFilter === opt.value}
                onClick={() => onStateChange(stateFilter === opt.value ? null : opt.value)}
              />
            ))}
          </FilterGroup>

          <FilterGroup id="order-filter-period" label="Período">
            {PERIOD_FILTERS.map((opt) => (
              <FilterPill
                key={opt.value}
                label={opt.label}
                selected={periodFilter === opt.value}
                onClick={() => onPeriodChange(periodFilter === opt.value ? null : opt.value)}
              />
            ))}
          </FilterGroup>

          <FilterGroup id="order-filter-agreement" label="Acuerdo">
            {AGREEMENT_FILTERS.map((opt) => (
              <FilterPill
                key={opt.value}
                label={opt.label}
                selected={agreementFilter === opt.value}
                onClick={() => onAgreementChange(agreementFilter === opt.value ? null : opt.value)}
              />
            ))}
          </FilterGroup>
        </div>
      </div>
    </div>
  );
};

// SellerActions

interface SellerActionsProps {
  order: ProductOrder;
  onTransition: (id: string, state: ProductOrderState) => void;
  onCancel: (id: string) => void;
  onCreateAgreement: (order: ProductOrder) => void;
  isLoading: boolean;
}

const SellerActions = ({
  order,
  onTransition,
  onCancel,
  onCreateAgreement,
  isLoading,
}: Readonly<SellerActionsProps>) => {
  const [pending, setPending] = useState<{ label: string; confirm: () => void } | null>(null);

  const { state } = order;
  const id = order.id!;

  const requestConfirm = (label: string, action: () => void) => {
    setPending({ label, confirm: action });
  };

  if (pending) {
    return (
      <div className="flex items-center justify-end gap-2">
        <Typography variant="small" color="gray">
          {pending.label}
        </Typography>
        <Button
          size="sm"
          variant="primary"
          disabled={isLoading}
          onClick={() => {
            pending.confirm();
            setPending(null);
          }}
        >
          Confirmar
        </Button>
        <Button size="sm" variant="ghost" disabled={isLoading} onClick={() => setPending(null)}>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {state === 'inProgress' && (
        <>
          <Button
            size="sm"
            variant="primary"
            disabled={isLoading}
            onClick={() => onTransition(id, 'completed')}
          >
            Completar
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={isLoading}
            onClick={() => onTransition(id, 'partial')}
          >
            Parcial
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={isLoading}
            onClick={() =>
              requestConfirm('¿Marcar como fallida?', () => onTransition(id, 'failed'))
            }
          >
            Marcar fallida
          </Button>
        </>
      )}

      {(state === 'pending' || state === 'held') && (
        <Button
          size="sm"
          variant="outline"
          disabled={isLoading}
          onClick={() => onTransition(id, 'acknowledged')}
        >
          Reactivar
        </Button>
      )}

      {(state === 'inProgress' || state === 'pending' || state === 'held') && (
        <Button
          size="sm"
          variant="ghost"
          disabled={isLoading}
          onClick={() => requestConfirm('¿Solicitar cancelación?', () => onCancel(id))}
        >
          Solicitar cancelación
        </Button>
      )}

      {state === 'assessingCancellation' && (
        <Button
          size="sm"
          variant="outline"
          disabled={isLoading}
          onClick={() => onTransition(id, 'cancelled')}
        >
          Confirmar cancelación
        </Button>
      )}

      {state === 'completed' && !order.agreement?.length && (
        <Button
          size="sm"
          variant="primary"
          disabled={isLoading}
          onClick={() => onCreateAgreement(order)}
        >
          Crear acuerdo
        </Button>
      )}
    </div>
  );
};

// Component

interface OrdenesProductoClientProps {
  /** Business roles of the session. */
  businessRoles?: readonly BusinessRole[];
}

const OrdenesProductoClient = ({ businessRoles }: Readonly<OrdenesProductoClientProps>) => {
  const { clearAll } = useNotifications();

  useEffect(() => {
    clearAll();
  }, [clearAll]);

  const tabs = getVisibleRoleTabs(TABS, businessRoles);
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [stateFilter, setStateFilter] = useState<ProductOrderState | null>(null);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter | null>(null);
  const [agreementFilter, setAgreementFilter] = useState<AgreementFilter | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<ProductOrder | null>(null);
  const [agreementOrder, setAgreementOrder] = useState<ProductOrder | null>(null);

  // Queries
  const { data: buyerOrders = [], isLoading: loadingBuyer } = useProductOrdersAsBuyer();
  const { data: sellerOrders = [], isLoading: loadingSeller } = useProductOrdersAsSeller();

  // Mutations
  const { mutate: transition, isPending: transitioning } = useTransitionProductOrder();
  const { mutate: cancelOrder, isPending: cancelling } = useCancelProductOrder();
  const { mutate: reconcilePayment } = useReconcileProductOrderPayment();

  // Passive reconciliation: orphaned orders (the browser never returned from checkout) are re-verified against Stripe when the list loads, once per order and visit.
  const reconciledRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const order of [...buyerOrders, ...sellerOrders]) {
      if (
        order.id &&
        order.externalId &&
        isReconcilableState(order.state) &&
        !reconciledRef.current.has(order.id)
      ) {
        reconciledRef.current.add(order.id);
        reconcilePayment(order);
      }
    }
  }, [buyerOrders, sellerOrders, reconcilePayment]);

  // Filtered data
  const rawOrders = activeTab === 'buyer' ? buyerOrders : sellerOrders;
  const filteredOrders = applyFilters(rawOrders, stateFilter, periodFilter, agreementFilter);
  const hasActiveFilters =
    stateFilter !== null || periodFilter !== null || agreementFilter !== null;

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setStateFilter(null);
    setPeriodFilter(null);
    setAgreementFilter(null);
  };

  // Handlers

  const handleTransition = (id: string, state: ProductOrderState) => {
    transition({ id, state });
  };

  const handleCancel = (id: string) => {
    cancelOrder({ id });
  };

  // Render

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-muted py-12">
        <SectionHeader
          title="Mis órdenes de producto"
          subtitle="Gestiona las órdenes de compra y venta de tus productos"
          className="px-4"
        />
      </section>

      <Container className="py-10">
        {tabs.length > 1 && (
          <TabNavigation
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={handleTabChange}
            className="mb-6"
          />
        )}

        {/* ── Filters ──────────────────────────────────────────────────── */}
        <FilterBar
          stateFilter={stateFilter}
          periodFilter={periodFilter}
          agreementFilter={agreementFilter}
          onStateChange={setStateFilter}
          onPeriodChange={setPeriodFilter}
          onAgreementChange={setAgreementFilter}
          resultCount={filteredOrders.length}
          hasActiveFilters={hasActiveFilters}
        />

        {/* ── CONSUMER TAB ─────────────────────────────────────────────── */}
        {activeTab === 'buyer' && (
          <div>
            <div className="mb-6">
              <Typography as="h2" variant="subtitle" color="primary">
                Mis compras
              </Typography>
            </div>

            <Table
              columns={ORDER_COLUMNS}
              data={filteredOrders}
              loading={loadingBuyer}
              variant="plain"
              size="md"
              keyExtractor={(o, i) => o.id ?? i}
              emptyState={
                <Typography variant="body" color="gray" className="py-8 text-center">
                  {hasActiveFilters
                    ? 'No hay órdenes que coincidan con los filtros seleccionados.'
                    : 'No tienes órdenes de compra todavía.'}
                </Typography>
              }
              renderRow={(order) => (
                <>
                  <td className="px-4 py-3 text-left">
                    <Typography variant="body">{getOfferingName(order)}</Typography>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Typography variant="small" color="gray">
                      {formatDate(order.orderDate)}
                    </Typography>
                  </td>
                  <td className="px-4 py-3 text-center">{renderStateBadge(order.state)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order)}>
                      Ver detalle
                    </Button>
                  </td>
                </>
              )}
            />
          </div>
        )}

        {/* ── SELLER TAB ───────────────────────────────────────────────── */}
        {activeTab === 'seller' && (
          <div>
            <div className="mb-6">
              <Typography as="h2" variant="subtitle" color="primary">
                Mis ventas
              </Typography>
            </div>

            <Table
              columns={SELLER_COLUMNS}
              data={filteredOrders}
              loading={loadingSeller}
              variant="plain"
              size="md"
              keyExtractor={(o, i) => o.id ?? i}
              emptyState={
                <Typography variant="body" color="gray" className="py-8 text-center">
                  {hasActiveFilters
                    ? 'No hay órdenes que coincidan con los filtros seleccionados.'
                    : 'No tienes órdenes de venta todavía.'}
                </Typography>
              }
              renderRow={(order) => (
                <>
                  <td className="px-4 py-3 text-left">
                    <Typography variant="body">{getOfferingName(order)}</Typography>
                  </td>
                  <td className="px-4 py-3 text-left">
                    <Typography variant="small" color="gray">
                      {getBuyerName(order)}
                    </Typography>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Typography variant="small" color="gray">
                      {formatDate(order.orderDate)}
                    </Typography>
                  </td>
                  <td className="px-4 py-3 text-center">{renderStateBadge(order.state)}</td>
                  <td className="px-4 py-3 text-right">
                    <SellerActions
                      order={order}
                      onTransition={handleTransition}
                      onCancel={handleCancel}
                      onCreateAgreement={setAgreementOrder}
                      isLoading={transitioning || cancelling}
                    />
                  </td>
                </>
              )}
            />
          </div>
        )}
      </Container>

      <OrderDetailDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      <AgreementDrawer order={agreementOrder} onClose={() => setAgreementOrder(null)} />
    </div>
  );
};

export default OrdenesProductoClient;
