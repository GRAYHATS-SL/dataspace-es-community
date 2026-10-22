'use client';

import { useState } from 'react';

import Button from '@/components/atoms/Button';
import Container from '@/components/atoms/Container';
import Link from '@/components/atoms/Link';
import Typography from '@/components/atoms/Typography';
import ConsumoPanelState from '@/components/molecules/ConsumoPanelState';
import SectionHeader from '@/components/molecules/SectionHeader';
import TabNavigation from '@/components/molecules/TabNavigation';
import QuotaEntryCard from '@/components/organisms/QuotaEntryCard';
import { useMyQuotas, useProviderQuotas } from '@/hooks/queries';
import type { BusinessRole } from '@/lib/session';
import { getVisibleRoleTabs } from '@/lib/utils/roleTabs';

const TABS = [
  { id: 'buyer', label: 'Como consumidor', icon: 'ShoppingCart' },
  { id: 'seller', label: 'Como proveedor', icon: 'Package' },
];

interface PanelProps {
  title: string;
  count: number;
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
}

const Panel = ({ title, count, refreshing, onRefresh, children }: Readonly<PanelProps>) => (
  <section aria-label={title}>
    <div className="mb-3 flex items-center justify-between gap-3">
      <div role="status" aria-live="polite" aria-atomic="true">
        <Typography variant="small" color="gray">
          {title} · {count} oferta{count === 1 ? '' : 's'}
        </Typography>
      </div>
      <Button size="sm" variant="outline" disabled={refreshing} onClick={onRefresh}>
        Actualizar
      </Button>
    </div>
    {children}
  </section>
);

const BuyerPanel = () => {
  const { data = [], isLoading, error, refetch, isFetching } = useMyQuotas();
  const retry = () => void refetch();
  return (
    <Panel
      title="Consumo de mis compras"
      count={data.length}
      refreshing={isFetching}
      onRefresh={retry}
    >
      <ConsumoPanelState
        isLoading={isLoading}
        isError={!!error}
        errorMessage={error?.message}
        isEmpty={data.length === 0}
        emptyMessage="No tienes compras con consumo medido. Las ofertas ilimitadas no se miden."
        onRetry={retry}
      />
      <ul className="flex flex-col gap-4">
        {data.map((entry) => (
          <li key={entry.offeringId}>
            <QuotaEntryCard
              title={entry.offeringName}
              party={entry.providerName}
              detail={`${entry.completedOrders} completado(s), ${entry.cancelledOrders} cancelado(s)`}
              view={'error' in entry.outcome ? undefined : entry.outcome.view}
              error={'error' in entry.outcome ? entry.outcome.error : undefined}
              cancelledOnly={entry.completedOrders === 0}
            />
          </li>
        ))}
      </ul>
      <Typography variant="small" color="gray" className="mt-6 pb-6">
        Los bytes incluyen cuerpo y cabeceras de cada respuesta servida (los 403 no cuentan).{' '}
        <Link href="/dashboard/ordenes-producto" variant="primary" underline="always">
          Ver órdenes de producto
        </Link>
      </Typography>
    </Panel>
  );
};

const ProviderPanel = () => {
  const { data, isLoading, error, refetch, isFetching } = useProviderQuotas();
  const retry = () => void refetch();
  const errorMessage = error?.message ?? data?.errors[0];
  const entries = data?.entries ?? [];
  return (
    <Panel
      title="Consumo de mis ofertas"
      count={entries.length}
      refreshing={isFetching}
      onRefresh={retry}
    >
      <ConsumoPanelState
        isLoading={isLoading}
        isError={!!errorMessage}
        errorMessage={errorMessage}
        isEmpty={!!data && entries.length === 0}
        emptyMessage="No se detecta consumo en tus ofertas medidas."
        onRetry={retry}
      />
      <ul className="flex flex-col gap-4">
        {entries.map((entry) => (
          <li key={`${entry.offeringId}:${entry.consumerDid}`}>
            <QuotaEntryCard
              title={entry.offeringName}
              party={entry.consumerName}
              view={entry.view}
            />
          </li>
        ))}
      </ul>
      {data && (
        <Typography variant="small" color="gray" className="mt-6 pb-6">
          Vista provisional: sondea {data.scanned} combinación(es) consumer × oferta medida
          {data.truncated && ' (recortado)'}. Solo detecta ofertas con límites de bytes o
          peticiones.
        </Typography>
      )}
    </Panel>
  );
};

interface ConsumoClientProps {
  /** Business roles of the session. */
  businessRoles?: readonly BusinessRole[];
}

export default function ConsumoClient({ businessRoles }: Readonly<ConsumoClientProps>) {
  const tabs = getVisibleRoleTabs(TABS, businessRoles);
  const [activeTab, setActiveTab] = useState(tabs[0].id);

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-muted py-12">
        <SectionHeader
          title="Consumo"
          subtitle="Bytes y peticiones consumidos en las ofertas medidas de los providers."
          additionalContent={
            tabs.length > 1 ? (
              <TabNavigation
                tabs={tabs}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                aria-label="Rol"
              />
            ) : undefined
          }
          className="px-4"
        />
      </section>
      <section className="py-8">
        <Container>
          {activeTab === 'buyer' && <BuyerPanel />}
          {activeTab === 'seller' && <ProviderPanel />}
        </Container>
      </section>
    </div>
  );
}
