'use client';

import EmptyState from '@/components/atoms/EmptyState';
import TabFeedback from '@/components/atoms/TabFeedback';
import Typography from '@/components/atoms/Typography';
import { OfferingTableRow } from '@/components/molecules/TableRow';
import Table from '@/components/organisms/Table';
import {
  useDeleteProductOffering,
  useProductOfferings,
  usePublishProductOffering,
} from '@/hooks/queries';
import type { ProductOffering } from '@/types/api';

const COLUMNS = [
  { key: 'name', label: 'Nombre de la oferta', align: 'left' as const },
  { key: 'spec', label: 'Especificación', align: 'center' as const },
  { key: 'category', label: 'Categoría', align: 'center' as const },
  { key: 'date', label: 'Última actualización', align: 'center' as const },
  { key: 'status', label: 'Estado', align: 'center' as const },
  { key: 'actions', label: 'Acciones', align: 'right' as const },
];

/** Props of `OfferingList`. */
export interface OfferingListProps {
  onEdit?: (offering: ProductOffering) => void;
}

/**
 * OfferingList - Offerings table; owns the list query and the publish/delete mutations.
 */
export default function OfferingList({ onEdit }: Readonly<OfferingListProps>) {
  const query = useProductOfferings();
  const publishMutation = usePublishProductOffering();
  const deleteMutation = useDeleteProductOffering();

  if (query.isLoading || query.isError) {
    return (
      <div role={query.isError ? 'alert' : 'status'}>
        <TabFeedback loading={query.isLoading} error={query.isError} />
        {query.error && (
          <Typography variant="form-hint" className="text-center">
            {query.error.message}
          </Typography>
        )}
      </div>
    );
  }

  const offerings = query.data ?? [];
  if (offerings.length === 0) return <EmptyState label="ofertas" />;

  return (
    <div className="flex flex-col gap-4">
      {publishMutation.isError && (
        <Typography variant="small" color="danger" role="alert">
          No se pudo publicar la oferta: {publishMutation.error.message}
        </Typography>
      )}
      <Table
        columns={COLUMNS}
        data={offerings}
        keyExtractor={(item) => item.id ?? ''}
        renderRow={(item) => (
          <OfferingTableRow
            offering={item}
            colCount={COLUMNS.length}
            onEdit={onEdit}
            onPublish={(id) => publishMutation.mutate(id)}
            onDelete={(id, options) => deleteMutation.mutate(id, options)}
            isPending={
              (publishMutation.isPending && publishMutation.variables === item.id) ||
              (deleteMutation.isPending && deleteMutation.variables === item.id)
            }
            isDeleting={deleteMutation.isPending && deleteMutation.variables === item.id}
            deleteError={
              deleteMutation.isError && deleteMutation.variables === item.id
                ? deleteMutation.error.message
                : null
            }
          />
        )}
        variant="plain"
        size="md"
      />
    </div>
  );
}
