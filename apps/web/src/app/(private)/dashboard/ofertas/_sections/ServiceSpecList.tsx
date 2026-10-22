'use client';

import { type UseQueryResult } from '@tanstack/react-query';

import EmptyState from '@/components/atoms/EmptyState';
import TabFeedback from '@/components/atoms/TabFeedback';
import { ServiceSpecTableRow } from '@/components/molecules/TableRow';
import Table from '@/components/organisms/Table';
import {
  useDeleteServiceSpecification,
  usePublishServiceSpecification,
} from '@/hooks/queries/useServiceSpecificationQueries';
import { removeProductSpecServiceRef } from '@/lib/services/queries/productSpecification';
import type { ServiceSpecification } from '@/types/api';

type ServiceSpecAffectedProductSpec = {
  id: string;
  name?: string;
  currentRefs: { id?: string; href?: string; name?: string }[];
};

interface ServiceSpecListProps {
  query: UseQueryResult<ServiceSpecification[]>;
  serviceSpecs: ServiceSpecification[];
  serviceSpecProductSpecRefs: Map<string, ServiceSpecAffectedProductSpec[]>;
  onEdit: (spec: ServiceSpecification) => void;
}

/** Removes references to a service specification from product specifications before deletion. */
async function cleanServiceSpecRefs(
  serviceSpecId: string,
  affectedProductSpecs: ServiceSpecAffectedProductSpec[],
): Promise<void> {
  for (const productSpec of affectedProductSpecs) {
    await removeProductSpecServiceRef(productSpec.id, serviceSpecId, productSpec.currentRefs);
  }
}

/**
 * ServiceSpecList - Service specifications table that owns the mutations
 *
 * @param {UseQueryResult<ServiceSpecification[]>} query - Query result.
 * @param {ServiceSpecification[]} serviceSpecs - Specifications to show.
 * @param {Map<string, ServiceSpecAffectedProductSpec[]>} serviceSpecProductSpecRefs - Product specs referencing each service.
 * @param {(spec: ServiceSpecification) => void} onEdit - Called on edit.
 */
export default function ServiceSpecList({
  query,
  serviceSpecs,
  serviceSpecProductSpecRefs,
  onEdit,
}: Readonly<ServiceSpecListProps>) {
  const publishMutation = usePublishServiceSpecification();
  const deleteMutation = useDeleteServiceSpecification();

  if (query.isLoading || query.isError)
    return <TabFeedback loading={query.isLoading} error={query.isError} />;
  if (!serviceSpecs.length) return <EmptyState label="especificaciones de servicio" />;

  return (
    <Table
      columns={[
        { key: 'name', label: 'Nombre de la Especificación', align: 'left' },
        { key: 'date', label: 'Última actualización', align: 'center' },
        { key: 'status', label: 'Estado', align: 'center' },
        { key: 'actions', label: 'Acciones', align: 'right' },
      ]}
      data={serviceSpecs}
      keyExtractor={(item) => item.id ?? ''}
      renderRow={(item) => (
        <ServiceSpecTableRow
          serviceSpec={item}
          affectedProductSpecs={item.id ? (serviceSpecProductSpecRefs.get(item.id) ?? []) : []}
          colCount={4}
          onEdit={onEdit}
          onPublish={(id) => publishMutation.mutate(id)}
          onCleanRefs={cleanServiceSpecRefs}
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
