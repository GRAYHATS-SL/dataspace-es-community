'use client';

import { useState } from 'react';

import Button from '@/components/atoms/Button';
import Container from '@/components/atoms/Container';
import Icon from '@/components/atoms/Icon';
import Typography from '@/components/atoms/Typography';
import SectionHeader from '@/components/molecules/SectionHeader';
import TabNavigation from '@/components/molecules/TabNavigation';
import ProductActivationDrawer from '@/components/organisms/ProductActivationDrawer';
import Table from '@/components/organisms/Table';
import {
  useAgreementsAsBuyer,
  useAgreementsAsSeller,
  useProductInventoriesAsSeller,
  useProductOrdersAsSeller,
} from '@/hooks/queries';
import type { BusinessRole } from '@/lib/session';
import { cn } from '@/lib/utils';
import { getOwn } from '@/lib/utils/getOwn';
import { getVisibleRoleTabs } from '@/lib/utils/roleTabs';
import type { Agreement, ProductOrder } from '@/types/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'buyer', label: 'Como consumidor', icon: 'ShoppingCart' },
  { id: 'seller', label: 'Como proveedor', icon: 'Package' },
];

interface StatusConfig {
  dotColor: string;
  textColor: string;
  label: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  approved: { dotColor: 'bg-emerald-500', textColor: 'text-emerald-700', label: 'Activo' },
  'in process': { dotColor: 'bg-amber-400', textColor: 'text-amber-700', label: 'En proceso' },
  rejected: { dotColor: 'bg-red-500', textColor: 'text-red-700', label: 'Rechazado' },
};

const DEFAULT_STATUS: StatusConfig = {
  dotColor: 'bg-gray-400',
  textColor: 'text-gray-600',
  label: '—',
};

const BUYER_COLUMNS = [
  { key: 'offering', label: 'Oferta', align: 'left' as const },
  { key: 'seller', label: 'Proveedor', align: 'left' as const },
  { key: 'date', label: 'Fecha', align: 'center' as const },
  { key: 'status', label: 'Estado', align: 'center' as const },
  { key: 'detail', label: '', align: 'right' as const },
];

const SELLER_COLUMNS = [
  { key: 'offering', label: 'Oferta', align: 'left' as const },
  { key: 'buyer', label: 'Comprador', align: 'left' as const },
  { key: 'date', label: 'Fecha', align: 'center' as const },
  { key: 'status', label: 'Estado', align: 'center' as const },
  { key: 'action', label: 'Acceso', align: 'center' as const },
  { key: 'detail', label: '', align: 'right' as const },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderStatusBadge(status?: string) {
  const config = (status ? getOwn(STATUS_CONFIG, status) : undefined) ?? DEFAULT_STATUS;
  return (
    <div className="flex items-center justify-center gap-1.5">
      <span className={cn('size-2 rounded-full', config.dotColor)} aria-hidden="true" />
      <Typography variant="small" className={cn('font-mono font-medium', config.textColor)}>
        {config.label}
      </Typography>
    </div>
  );
}

function formatDate(dateStr?: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getOfferingName(agreement: Agreement) {
  return (
    agreement.agreementItem?.[0]?.productOffering?.[0]?.name ??
    agreement.agreementItem?.[0]?.productOffering?.[0]?.id ??
    agreement.name ??
    '—'
  );
}

function getPartyName(agreement: Agreement, role: 'buyer' | 'seller') {
  const party = agreement.engagedParty?.find((p) => p.role?.toLowerCase() === role);
  return party?.name ?? party?.id ?? '—';
}

function getVigencia(agreement: Agreement) {
  const start = agreement.characteristic?.find((c) => c.name === 'agreementStartDate')?.value;
  const end = agreement.characteristic?.find((c) => c.name === 'agreementEndDate')?.value;
  if (!start && !end) return null;
  return `${start ?? '—'} → ${end ?? '—'}`;
}

// ─── DetailDrawer ─────────────────────────────────────────────────────────────

function DetailDrawer({
  agreement,
  onClose,
}: Readonly<{ agreement: Agreement | null; onClose: () => void }>) {
  if (!agreement) return null;

  const vigencia = getVigencia(agreement);
  const terms = agreement.agreementItem?.[0]?.termOrCondition ?? [];
  const buyer = agreement.engagedParty?.find((p) => p.role?.toLowerCase() === 'buyer');
  const seller = agreement.engagedParty?.find((p) => p.role?.toLowerCase() === 'seller');
  const offering = agreement.agreementItem?.[0]?.productOffering?.[0];
  const statusConfig =
    (agreement.status ? STATUS_CONFIG[agreement.status] : undefined) ?? DEFAULT_STATUS;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30" onClick={onClose} aria-hidden="true" />
      <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <Typography as="h2" variant="subtitle">
              Detalle del acuerdo
            </Typography>
            {offering?.name && (
              <Typography variant="small" color="gray">
                {offering.name}
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
              'inline-flex w-fit rounded-full px-3 py-1 text-sm font-medium',
              statusConfig.dotColor
                .replace('bg-', 'bg-')
                .replace('-500', '-100')
                .replace('-400', '-100'),
              statusConfig.textColor,
            )}
          >
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

          {terms.length > 0 && (
            <div className="flex flex-col gap-1">
              <Typography variant="small" className="mb-1 font-semibold text-gray-700">
                Condiciones acordadas
              </Typography>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                {terms.map((t, i) => (
                  <div
                    key={t.id ?? i}
                    className="flex items-start gap-2 border-b border-gray-100 py-1.5 last:border-0"
                  >
                    <Icon name="Check" size={13} className="mt-0.5 shrink-0 text-emerald-500" />
                    <Typography variant="small">{t.description}</Typography>
                  </div>
                ))}
                {vigencia && (
                  <div className="flex items-start gap-2 border-b border-gray-100 py-1.5 last:border-0">
                    <Icon name="Check" size={13} className="mt-0.5 shrink-0 text-emerald-500" />
                    <Typography variant="small">Vigencia: {vigencia}</Typography>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Icon name="Hash" size={12} />
            <span className="break-all font-mono">{agreement.id}</span>
          </div>
        </div>
      </aside>
    </>
  );
}

// ─── AcuerdosClient ───────────────────────────────────────────────────────────

interface AcuerdosClientProps {
  /** Business roles of the session. */
  businessRoles?: readonly BusinessRole[];
}

export default function AcuerdosClient({ businessRoles }: Readonly<AcuerdosClientProps>) {
  const tabs = getVisibleRoleTabs(TABS, businessRoles);
  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [selectedAgreement, setSelectedAgreement] = useState<Agreement | null>(null);
  const [activationAgreement, setActivationAgreement] = useState<Agreement | null>(null);
  const [activationOrder, setActivationOrder] = useState<ProductOrder | null>(null);

  const isSeller = activeTab === 'seller';
  const { data: buyerAgreements = [], isLoading: loadingBuyer } = useAgreementsAsBuyer({
    enabled: !isSeller,
  });
  const { data: sellerAgreements = [], isLoading: loadingSeller } = useAgreementsAsSeller({
    enabled: isSeller,
  });
  const { data: sellerProducts = [] } = useProductInventoriesAsSeller({ enabled: isSeller });
  const { data: sellerOrders = [] } = useProductOrdersAsSeller({ enabled: isSeller });

  const agreements = activeTab === 'buyer' ? buyerAgreements : sellerAgreements;
  const isLoading = activeTab === 'buyer' ? loadingBuyer : loadingSeller;
  const columns = activeTab === 'buyer' ? BUYER_COLUMNS : SELLER_COLUMNS;
  const counterRole = activeTab === 'buyer' ? 'seller' : 'buyer';

  function hasLinkedProduct(agreementId?: string) {
    if (!agreementId) return false;
    return sellerProducts.some((p) => p.agreement?.some((a) => a.id === agreementId));
  }

  function openActivationDrawer(agreement: Agreement) {
    const linked = sellerOrders.find((o) => o.agreement?.some((a) => a.id === agreement.id));
    setActivationOrder(linked ?? null);
    setActivationAgreement(agreement);
  }

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-muted py-12">
        <SectionHeader
          title="Mis acuerdos"
          subtitle="Contratos de acceso a datos formalizados entre proveedores y consumidores"
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
            {activeTab === 'buyer' ? 'Acuerdos como consumidor' : 'Acuerdos como proveedor'}
          </Typography>
        </div>

        <Table
          columns={columns}
          data={agreements}
          loading={isLoading}
          variant="plain"
          size="md"
          keyExtractor={(a, i) => a.id ?? i}
          emptyState={
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Icon name="FileCheck" size={40} className="text-gray-200" />
              <Typography variant="body" color="gray">
                {activeTab === 'buyer'
                  ? 'No tienes acuerdos como consumidor todavía.'
                  : 'No has creado acuerdos como proveedor todavía.'}
              </Typography>
            </div>
          }
          renderRow={(agreement) => (
            <>
              <td className="px-4 py-3 text-left">
                <Typography variant="body" className="font-medium">
                  {getOfferingName(agreement)}
                </Typography>
              </td>
              <td className="px-4 py-3 text-left">
                <Typography variant="small" color="gray">
                  {getPartyName(agreement, counterRole)}
                </Typography>
              </td>
              <td className="px-4 py-3 text-center">
                <Typography variant="small" color="gray">
                  {formatDate(agreement.initialDate)}
                </Typography>
              </td>
              <td className="px-4 py-3 text-center">{renderStatusBadge(agreement.status)}</td>
              {activeTab === 'seller' && (
                <td className="px-4 py-3 text-center">
                  {agreement.status === 'approved' && (
                    <Button
                      size="sm"
                      variant={hasLinkedProduct(agreement.id) ? 'ghost' : 'primary'}
                      disabled={hasLinkedProduct(agreement.id)}
                      onClick={() => openActivationDrawer(agreement)}
                    >
                      {hasLinkedProduct(agreement.id) ? 'Acceso activo' : 'Activar acceso'}
                    </Button>
                  )}
                </td>
              )}
              <td className="px-4 py-3 text-right">
                <Button size="sm" variant="ghost" onClick={() => setSelectedAgreement(agreement)}>
                  Ver detalle
                </Button>
              </td>
            </>
          )}
        />
      </Container>

      <DetailDrawer agreement={selectedAgreement} onClose={() => setSelectedAgreement(null)} />

      <ProductActivationDrawer
        agreement={activationAgreement}
        order={activationOrder}
        onClose={() => {
          setActivationAgreement(null);
          setActivationOrder(null);
        }}
      />
    </div>
  );
}
