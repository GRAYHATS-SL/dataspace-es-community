'use client';

import { type UseQueryResult } from '@tanstack/react-query';

import EmptyState from '@/components/atoms/EmptyState';
import TabFeedback from '@/components/atoms/TabFeedback';
import { CatalogTableRow } from '@/components/molecules/TableRow';
import Table from '@/components/organisms/Table';
import {
  useDeleteCatalog,
  usePatchCatalog,
  usePublishCatalog,
} from '@/hooks/queries/useCatalogQueries';
import type { Catalog, Category } from '@/types/api';

interface CatalogListProps {
  query: UseQueryResult<Catalog[]>;
  catalogs: Catalog[];
  categories: Category[];
  onEdit: (catalog: Catalog) => void;
}

/**
 * CatalogList - Catalogs table that owns the mutations
 *
 * @param {UseQueryResult<Catalog[]>} query - Query result.
 * @param {Catalog[]} catalogs - Catalogs to show.
 * @param {Category[]} categories - Available categories.
 * @param {(catalog: Catalog) => void} onEdit - Called on edit.
 */
export default function CatalogList({
  query,
  catalogs,
  categories,
  onEdit,
}: Readonly<CatalogListProps>) {
  const publishMutation = usePublishCatalog();
  const patchMutation = usePatchCatalog();
  const deleteMutation = useDeleteCatalog();

  if (query.isLoading || query.isError)
    return <TabFeedback loading={query.isLoading} error={query.isError} />;
  if (!catalogs.length) return <EmptyState label="catálogos" />;

  return (
    <Table
      columns={[
        { key: 'name', label: 'Nombre del Catálogo', align: 'left' },
        { key: 'version', label: 'Versión', align: 'center' },
        { key: 'category', label: 'Categoría', align: 'center' },
        { key: 'date', label: 'Última actualización', align: 'center' },
        { key: 'status', label: 'Estado', align: 'center' },
        { key: 'actions', label: 'Acciones', align: 'right' },
      ]}
      data={catalogs}
      keyExtractor={(item) => item.id ?? ''}
      renderRow={(item) => (
        <CatalogTableRow
          catalog={item}
          categories={categories}
          onEdit={onEdit}
          onPublish={(id) => publishMutation.mutate(id)}
          onRetire={(id) => patchMutation.mutate({ id, payload: { lifecycleStatus: 'Retired' } })}
          onMarkObsolete={(id) =>
            patchMutation.mutate({ id, payload: { lifecycleStatus: 'Obsolete' } })
          }
          onDelete={(id) => deleteMutation.mutate(id)}
          isPending={
            (publishMutation.isPending && publishMutation.variables === item.id) ||
            (patchMutation.isPending && patchMutation.variables?.id === item.id) ||
            (deleteMutation.isPending && deleteMutation.variables === item.id)
          }
        />
      )}
      variant="plain"
      size="md"
    />
  );
}
