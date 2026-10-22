'use client';

import { type UseQueryResult } from '@tanstack/react-query';

import EmptyState from '@/components/atoms/EmptyState';
import TabFeedback from '@/components/atoms/TabFeedback';
import { ProductSpecTableRow } from '@/components/molecules/TableRow';
import Table from '@/components/organisms/Table';
import {
  useDeleteProductSpecification,
  usePublishProductSpecification,
} from '@/hooks/queries/useProductSpecificationQueries';
import { removeOfferingProductSpecRef } from '@/lib/services/queries/productOffering';
import type { ProductSpecification } from '@/types/api';

interface ProductSpecListProps {
  query: UseQueryResult<ProductSpecification[]>;
  productSpecs: ProductSpecification[];
  productSpecOfferingRefs: Map<string, { id: string; name?: string }[]>;
  onEdit: (spec: ProductSpecification) => void;
}

/** Removes references to a product specification from offerings before deletion. */
async function cleanProductSpecRefs(
  affectedOfferings: { id: string; name?: string }[],
): Promise<void> {
  for (const offering of affectedOfferings) {
    await removeOfferingProductSpecRef(offering.id);
  }
}

/**
 * ProductSpecList - Product specifications table that owns the mutations
 *
 * @param {UseQueryResult<ProductSpecification[]>} query - Query result.
 * @param {ProductSpecification[]} productSpecs - Specifications to show.
 * @param {Map<string, {id: string, name?: string}[]>} productSpecOfferingRefs - Offerings referencing each specification.
 * @param {(spec: ProductSpecification) => void} onEdit - Called on edit.
 */
export default function ProductSpecList({
  query,
  productSpecs,
  productSpecOfferingRefs,
  onEdit,
}: Readonly<ProductSpecListProps>) {
  const publishMutation = usePublishProductSpecification();
  const deleteMutation = useDeleteProductSpecification();

  if (query.isLoading || query.isError)
    return <TabFeedback loading={query.isLoading} error={query.isError} />;
  if (!productSpecs.length) return <EmptyState label="especificaciones de producto" />;

  return (
    <Table
      columns={[
        { key: 'name', label: 'Nombre de la Especificación', align: 'left' },
        { key: 'date', label: 'Última actualización', align: 'center' },
        { key: 'status', label: 'Estado', align: 'center' },
        { key: 'actions', label: 'Acciones', align: 'right' },
      ]}
      data={productSpecs}
      keyExtractor={(item) => item.id ?? ''}
      renderRow={(item) => (
        <ProductSpecTableRow
          spec={item}
          affectedOfferings={item.id ? (productSpecOfferingRefs.get(item.id) ?? []) : []}
          colCount={4}
          onEdit={onEdit}
          onPublish={(id) => publishMutation.mutate(id)}
          onCleanRefs={cleanProductSpecRefs}
          onDelete={(id, options) => deleteMutation.mutate(id, options)}
          isPending={
            (publishMutation.isPending && publishMutation.variables === item.id) ||
            (deleteMutation.isPending && deleteMutation.variables === item.id)
          }
          isDeleting={deleteMutation.isPending && deleteMutation.variables === item.id}
        />
      )}
      variant="plain"
      size="md"
    />
  );
}
