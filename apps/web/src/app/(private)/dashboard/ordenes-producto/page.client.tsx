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
import { RECONCILABLE_STATES } from '@/components/organisms/OrderDetailDrawer/constants';
import Table from '@/components/organisms/Table';
import {
  useCancelProductOrder,
  useProductOrders,
  useReconcileProductOrderPayment,
  useTransitionProductOrder,
} from '@/hooks/queries';
import { cn } from '@/lib/utils';
import type { ProductOrder, ProductOrderState } from '@/types/api';

type OrderTab = 'buyer' | 'seller';

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
  assessingCancellation: { dotColor: 'bg-yellow-400', textColor: 'text-yellow-700', label: 'Evaluando cancelación' },
  cancelled: { dotColor: 'bg-orange-400', textColor: 'text-orange-700', label: 'Cancelada' },
  completed: { dotColor: 'bg-emerald-500', textColor: 'text-emerald-700', label: 'Completada' },
  failed: { dotColor: 'bg-red-500', textColor: 'text-red-700', label: 'Fallida' },
  held: { dotColor: 'bg-amber-400', textColor: 'text-amber-700', label: 'En espera' },
  inProgress: { dotColor: 'bg-neutral-500', textColor: 'text-neutral-700', label: 'En progreso' },
  partial: { dotColor: 'bg-orange-400', textColor: 'text-orange-700', label: 'Parcial' },
  pending: { dotColor: 'bg-amber-400', textColor: 'text-amber-700', label: 'Pendiente' },
  pendingCancellation: { dotColor: 'bg-yellow-400', textColor: 'text-yellow-700', label: 'Cancelación pendiente' },
  rejected: { dotColor: 'bg-red-500', textColor: 'text-red-700', label: 'Rechazada' },
};

const DEFAULT_STATE: StateConfig = { dotColor: 'bg-gray-400', textColor: 'text-gray-600', label: '—' };

const FILTER_STATES = (Object.keys(STATE_CONFIG) as ProductOrderState[]).map((value) => ({
  value,
  label: STATE_CONFIG[value]?.label ?? value,
}));

type PeriodFilter = '7d' | '30d' | '90d';
type AgreementFilter = 'with' | 'without';

const PERIOD_DAYS: Record<PeriodFilter, number> = { '7d': 7, '30d': 30, '90d': 90 };

const PERIOD_FILTERS: Array<{ value: PeriodFilter; label: string }> = [
  { value: '7d', label: 'Últimos 7 días' },
  { value: '30d', label: 'Último mes' },
  { value: '90d', label: 'Últimos 3 meses' },
];

const AGREEMENT_FILTERS: Array<{ value: AgreementFilter; label: string }> = [
  { value: 'with', label: 'Con acuerdo' },
  { value: 'without', label: 'Sin acuerdo' },
];

const BUYER_COLUMNS = [
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

interface Filters {
  state: ProductOrderState | null;
  period: PeriodFilter | null;
  agreement: AgreementFilter | null;
}

const NO_FILTERS: Filters = { state: null, period: null, agreement: null };

/** Splits the orders into the buyer or seller view. */
function ordersForTab(orders: ProductOrder[], tab: OrderTab): ProductOrder[] {
  // Here you define your business logic (which orders the user sees as buyer / as seller,
  // e.g. matching `tab` against the order's related party roles).
  return tab === 'buyer' || tab === 'seller' ? orders : [];
}

function renderStateBadge(state?: ProductOrderState) {
  const config = (state && STATE_CONFIG[state]) ?? DEFAULT_STATE;
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
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function getOfferingName(order: ProductOrder): string {
  const ref = order.productOrderItem?.[0]?.productOffering;
  return ref?.name ?? ref?.id ?? order.id ?? '—';
}

function getBuyerName(order: ProductOrder): string {
  const buyer = order.relatedParty?.find((p) => p.role?.toLowerCase() === 'buyer');
  return buyer?.name ?? buyer?.id ?? '—';
}

function matchesPeriod(order: ProductOrder, period: PeriodFilter | null): boolean {
  if (!period) return true;
  if (!order.orderDate) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PERIOD_DAYS[period]);
  return new Date(order.orderDate) >= cutoff;
}

function matchesAgreement(order: ProductOrder, agreement: AgreementFilter | null): boolean {
  if (!agreement) return true;
  const hasAgreement = (order.agreement?.length ?? 0) > 0;
  return agreement === 'with' ? hasAgreement : !hasAgreement;
}

function applyFilters(orders: ProductOrder[], filters: Filters): ProductOrder[] {
  return orders.filter(
    (o) =>
      (!filters.state || o.state === filters.state) &&
      matchesPeriod(o, filters.period) &&
      matchesAgreement(o, filters.agreement),
  );
}

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  resultCount: number;
}

function FilterBar({ filters, onChange, resultCount }: Readonly<FilterBarProps>) {
  const [open, setOpen] = useState(false);
  const activeCount = [filters.state, filters.period, filters.agreement].filter(Boolean).length;

  return (
    <div className="mb-6 overflow-hidden rounded-xl border border-gray-100 bg-white">
      <FilterPanelHeader
        activeFilterCount={activeCount}
        onClearAll={() => onChange(NO_FILTERS)}
        mobileOpen={open}
        onMobileToggle={() => setOpen((v) => !v)}
        mobileControlsId="order-filter-panel"
      />

      {activeCount > 0 && (
        <div className="flex items-center border-b border-gray-100 px-4 py-2">
          <div role="status" aria-live="polite" aria-atomic="true">
            <span className="text-xs text-gray tabular-nums">
              {resultCount} resultado{resultCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      )}

      <div id="order-filter-panel" className={cn(open ? 'block' : 'hidden md:block')}>
        <div className="flex flex-wrap gap-x-6 gap-y-4 p-4">
          <FilterGroup id="order-filter-estado" label="Estado">
            {FILTER_STATES.map((opt) => (
              <FilterPill
                key={opt.value}
                label={opt.label}
                selected={filters.state === opt.value}
                onClick={() =>
                  onChange({ ...filters, state: filters.state === opt.value ? null : opt.value })
                }
              />
            ))}
          </FilterGroup>
          <FilterGroup id="order-filter-period" label="Período">
            {PERIOD_FILTERS.map((opt) => (
              <FilterPill
                key={opt.value}
                label={opt.label}
                selected={filters.period === opt.value}
                onClick={() =>
                  onChange({ ...filters, period: filters.period === opt.value ? null : opt.value })
                }
              />
            ))}
          </FilterGroup>
          <FilterGroup id="order-filter-agreement" label="Acuerdo">
            {AGREEMENT_FILTERS.map((opt) => (
              <FilterPill
                key={opt.value}
                label={opt.label}
                selected={filters.agreement === opt.value}
                onClick={() =>
                  onChange({
                    ...filters,
                    agreement: filters.agreement === opt.value ? null : opt.value,
                  })
                }
              />
            ))}
          </FilterGroup>
        </div>
      </div>
    </div>
  );
}

interface SellerAction {
  label: string;
  variant: 'primary' | 'outline' | 'ghost';
  confirm?: string;
  run: () => void;
}

interface SellerActionsProps {
  order: ProductOrder;
  onTransition: (id: string, state: ProductOrderState) => void;
  onCancel: (id: string) => void;
  onCreateAgreement: (order: ProductOrder) => void;
  isLoading: boolean;
}

/** Lists the actions available to the seller for an order. */
function getSellerActions({
  order,
  onTransition,
  onCancel,
  onCreateAgreement,
}: Omit<SellerActionsProps, 'isLoading'>): SellerAction[] {
  const id = order.id;
  if (!id) return [];
  const state = order.state;
  const actions: SellerAction[] = [];
  // Here you define your business logic (allowed seller transitions per state).
  if (state === 'inProgress') {
    actions.push(
      { label: 'Completar', variant: 'primary', run: () => onTransition(id, 'completed') },
      { label: 'Parcial', variant: 'outline', run: () => onTransition(id, 'partial') },
      {
        label: 'Marcar fallida',
        variant: 'ghost',
        confirm: '¿Marcar como fallida?',
        run: () => onTransition(id, 'failed'),
      },
    );
  }
  if (state === 'pending' || state === 'held') {
    actions.push({ label: 'Reactivar', variant: 'outline', run: () => onTransition(id, 'acknowledged') });
  }
  if (state === 'inProgress' || state === 'pending' || state === 'held') {
    actions.push({
      label: 'Solicitar cancelación',
      variant: 'ghost',
      confirm: '¿Solicitar cancelación?',
      run: () => onCancel(id),
    });
  }
  if (state === 'assessingCancellation') {
    actions.push({ label: 'Confirmar cancelación', variant: 'outline', run: () => onTransition(id, 'cancelled') });
  }
  if (state === 'completed' && !order.agreement?.length) {
    actions.push({ label: 'Crear acuerdo', variant: 'primary', run: () => onCreateAgreement(order) });
  }
  return actions;
}

function SellerActions(props: Readonly<SellerActionsProps>) {
  const [pending, setPending] = useState<SellerAction | null>(null);
  const { isLoading } = props;

  if (pending) {
    return (
      <div className="flex items-center justify-end gap-2">
        <Typography variant="small" color="gray">
          {pending.confirm}
        </Typography>
        <Button
          size="sm"
          variant="primary"
          disabled={isLoading}
          onClick={() => {
            pending.run();
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
      {getSellerActions(props).map((action) => (
        <Button
          key={action.label}
          size="sm"
          variant={action.variant}
          disabled={isLoading}
          onClick={() => (action.confirm ? setPending(action) : action.run())}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}

function EmptyOrders({ filtered, tab }: Readonly<{ filtered: boolean; tab: OrderTab }>) {
  let message = 'No tienes órdenes de venta todavía.';
  if (filtered) message = 'No hay órdenes que coincidan con los filtros seleccionados.';
  else if (tab === 'buyer') message = 'No tienes órdenes de compra todavía.';
  return (
    <Typography variant="body" color="gray" className="py-8 text-center">
      {message}
    </Typography>
  );
}

export default function OrdenesProductoClient() {
  const [activeTab, setActiveTab] = useState<OrderTab>('buyer');
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [selectedOrder, setSelectedOrder] = useState<ProductOrder | null>(null);
  const [agreementOrder, setAgreementOrder] = useState<ProductOrder | null>(null);

  const { data: orders = [], isLoading, isError, error } = useProductOrders();
  const { mutate: transition, isPending: transitioning } = useTransitionProductOrder();
  const { mutate: cancelOrder, isPending: cancelling } = useCancelProductOrder();
  const { mutate: reconcilePayment } = useReconcileProductOrderPayment();

  // Passive reconciliation: orphaned paid orders are re-checked once per order and visit.
  const reconciledRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    for (const order of orders) {
      const isCandidate =
        !!order.id && !!order.externalId && !!order.state && RECONCILABLE_STATES.has(order.state);
      if (isCandidate && order.id && !reconciledRef.current.has(order.id)) {
        reconciledRef.current.add(order.id);
        reconcilePayment(order);
      }
    }
  }, [orders, reconcilePayment]);

  const filteredOrders = applyFilters(ordersForTab(orders, activeTab), filters);
  const hasActiveFilters = filters !== NO_FILTERS;
  const isSeller = activeTab === 'seller';

  const handleTabChange = (tab: string) => {
    setActiveTab(tab === 'seller' ? 'seller' : 'buyer');
    setFilters(NO_FILTERS);
  };

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
        <TabNavigation
          tabs={TABS}
          activeTab={activeTab}
          onTabChange={handleTabChange}
          aria-label="Tipo de órdenes"
          className="mb-6"
        />

        <FilterBar filters={filters} onChange={setFilters} resultCount={filteredOrders.length} />

        <div className="mb-6">
          <Typography as="h2" variant="subtitle" color="primary">
            {isSeller ? 'Mis ventas' : 'Mis compras'}
          </Typography>
        </div>

        {isError ? (
          <div role="alert" className="py-8 text-center">
            <Typography variant="small" color="danger">
              No se pudieron cargar las órdenes.
            </Typography>
            <Typography variant="form-hint">{error.message}</Typography>
          </div>
        ) : (
          <Table
            columns={isSeller ? SELLER_COLUMNS : BUYER_COLUMNS}
            data={filteredOrders}
            loading={isLoading}
            variant="plain"
            size="md"
            keyExtractor={(o, i) => o.id ?? i}
            emptyState={<EmptyOrders filtered={hasActiveFilters} tab={activeTab} />}
            renderRow={(order) => (
              <>
                <td className="px-4 py-3 text-left">
                  <Typography variant="body">{getOfferingName(order)}</Typography>
                </td>
                {isSeller && (
                  <td className="px-4 py-3 text-left">
                    <Typography variant="small" color="gray">
                      {getBuyerName(order)}
                    </Typography>
                  </td>
                )}
                <td className="px-4 py-3 text-center">
                  <Typography variant="small" color="gray">
                    {formatDate(order.orderDate)}
                  </Typography>
                </td>
                <td className="px-4 py-3 text-center">{renderStateBadge(order.state)}</td>
                <td className="px-4 py-3 text-right">
                  {isSeller ? (
                    <SellerActions
                      order={order}
                      onTransition={(id, state) => transition({ id, state })}
                      onCancel={(id) => cancelOrder({ id })}
                      onCreateAgreement={setAgreementOrder}
                      isLoading={transitioning || cancelling}
                    />
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(order)}>
                      Ver detalle
                    </Button>
                  )}
                </td>
              </>
            )}
          />
        )}
      </Container>

      <OrderDetailDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      <AgreementDrawer order={agreementOrder} onClose={() => setAgreementOrder(null)} />
    </div>
  );
}
