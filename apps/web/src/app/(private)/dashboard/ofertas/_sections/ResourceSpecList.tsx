'use client';

import { type UseQueryResult } from '@tanstack/react-query';

import EmptyState from '@/components/atoms/EmptyState';
import TabFeedback from '@/components/atoms/TabFeedback';
import { ResourceSpecTableRow } from '@/components/molecules/TableRow';
import Table from '@/components/organisms/Table';
import {
  useDeleteResourceSpecification,
  usePublishResourceSpecification,
} from '@/hooks/queries/useResourceSpecificationQueries';
import { removeProductSpecResourceRef } from '@/lib/services/queries/productSpecification';
import type { ResourceSpecification } from '@/types/api';

type ResourceSpecAffectedProductSpec = {
  id: string;
  name?: string;
  currentRefs: { id?: string; href?: string; name?: string }[];
};

interface ResourceSpecListProps {
  query: UseQueryResult<ResourceSpecification[]>;
  resourceSpecs: ResourceSpecification[];
  resourceSpecProductSpecRefs: Map<string, ResourceSpecAffectedProductSpec[]>;
  onEdit: (spec: ResourceSpecification) => void;
}

/** Removes references to a resource specification from product specifications before deletion. */
async function cleanResourceSpecRefs(
  resourceSpecId: string,
  affectedProductSpecs: ResourceSpecAffectedProductSpec[],
): Promise<void> {
  for (const productSpec of affectedProductSpecs) {
    await removeProductSpecResourceRef(productSpec.id, resourceSpecId, productSpec.currentRefs);
  }
}

/**
 * ResourceSpecList - Resource specifications table that owns the mutations
 *
 * @param {UseQueryResult<ResourceSpecification[]>} query - Query result.
 * @param {ResourceSpecification[]} resourceSpecs - Specifications to show.
 * @param {Map<string, ResourceSpecAffectedProductSpec[]>} resourceSpecProductSpecRefs - Product specs referencing each resource.
 * @param {(spec: ResourceSpecification) => void} onEdit - Called on edit.
 */
export default function ResourceSpecList({
  query,
  resourceSpecs,
  resourceSpecProductSpecRefs,
  onEdit,
}: Readonly<ResourceSpecListProps>) {
  const publishMutation = usePublishResourceSpecification();
  const deleteMutation = useDeleteResourceSpecification();

  if (query.isLoading || query.isError)
    return <TabFeedback loading={query.isLoading} error={query.isError} />;
  if (!resourceSpecs.length) return <EmptyState label="especificaciones de recurso" />;

  return (
    <Table
      columns={[
        { key: 'name', label: 'Nombre de la Especificación', align: 'left' },
        { key: 'date', label: 'Última actualización', align: 'center' },
        { key: 'status', label: 'Estado', align: 'center' },
        { key: 'actions', label: 'Acciones', align: 'right' },
      ]}
      data={resourceSpecs}
      keyExtractor={(item) => item.id ?? ''}
      renderRow={(item) => (
        <ResourceSpecTableRow
          resourceSpec={item}
          affectedProductSpecs={item.id ? (resourceSpecProductSpecRefs.get(item.id) ?? []) : []}
          colCount={4}
          onEdit={onEdit}
          onPublish={(id) => publishMutation.mutate(id)}
          onCleanRefs={cleanResourceSpecRefs}
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
