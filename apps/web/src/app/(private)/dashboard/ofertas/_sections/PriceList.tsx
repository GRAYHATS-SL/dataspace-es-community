'use client';

import { type UseQueryResult } from '@tanstack/react-query';

import EmptyState from '@/components/atoms/EmptyState';
import TabFeedback from '@/components/atoms/TabFeedback';
import { type PriceAffectedOffering, PriceTableRow } from '@/components/molecules/TableRow';
import Table from '@/components/organisms/Table';
import { useDeleteProductOfferingPrice } from '@/hooks/queries/useProductOfferingPriceQueries';
import { removeOfferingPriceRef } from '@/lib/services/queries/productOffering';
import type { ProductOfferingPrice } from '@/types/api';

interface PriceListProps {
  query: UseQueryResult<ProductOfferingPrice[]>;
  prices: ProductOfferingPrice[];
  priceOfferingRefs: Map<string, PriceAffectedOffering[]>;
  onEdit: (price: ProductOfferingPrice) => void;
}

/** Removes references to a price from offerings before deletion. */
async function cleanPriceRefs(
  priceId: string,
  affectedOfferings: PriceAffectedOffering[],
): Promise<void> {
  for (const offering of affectedOfferings) {
    await removeOfferingPriceRef(offering.id, priceId, offering.currentPrices);
  }
}

/**
 * PriceList - Prices table that owns the delete mutation
 *
 * @param {UseQueryResult<ProductOfferingPrice[]>} query - Query result.
 * @param {ProductOfferingPrice[]} prices - Prices to show.
 * @param {Map<string, PriceAffectedOffering[]>} priceOfferingRefs - Offerings referencing each price.
 * @param {(price: ProductOfferingPrice) => void} onEdit - Called on edit.
 */
export default function PriceList({
  query,
  prices,
  priceOfferingRefs,
  onEdit,
}: Readonly<PriceListProps>) {
  const deleteMutation = useDeleteProductOfferingPrice();

  if (query.isLoading || query.isError)
    return <TabFeedback loading={query.isLoading} error={query.isError} />;
  if (!prices.length) return <EmptyState label="precios" />;

  return (
    <Table
      columns={[
        { key: 'name', label: 'Nombre del Precio', align: 'left' },
        { key: 'amount', label: 'Importe', align: 'center' },
        { key: 'offerings', label: 'Ofertas', align: 'center' },
        { key: 'actions', label: 'Acciones', align: 'right' },
      ]}
      data={prices}
      keyExtractor={(item) => item.id ?? ''}
      renderRow={(item) => (
        <PriceTableRow
          price={item}
          affectedOfferings={item.id ? (priceOfferingRefs.get(item.id) ?? []) : []}
          colCount={4}
          onEdit={onEdit}
          onCleanRefs={cleanPriceRefs}
          onDelete={(id, options) => deleteMutation.mutate(id, options)}
          isDeleting={deleteMutation.isPending && deleteMutation.variables === item.id}
        />
      )}
      variant="plain"
      size="md"
    />
  );
}
