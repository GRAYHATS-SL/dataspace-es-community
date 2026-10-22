'use client';

import { type UseQueryResult } from '@tanstack/react-query';

import EmptyState from '@/components/atoms/EmptyState';
import TabFeedback from '@/components/atoms/TabFeedback';
import { type AffectedEntity, CategoryTableRow } from '@/components/molecules/TableRow';
import Table from '@/components/organisms/Table';
import { useDeleteCategory, usePublishCategory } from '@/hooks/queries/useCategoryQueries';
import { removeCatalogCategoryRef } from '@/lib/services/queries/catalog';
import { removeOfferingCategoryRef } from '@/lib/services/queries/productOffering';
import type { Category } from '@/types/api';

interface CategoryListProps {
  query: UseQueryResult<Category[]>;
  categories: Category[];
  categoryCatalogRefs: Map<string, AffectedEntity[]>;
  categoryOfferingRefs: Map<string, AffectedEntity[]>;
  onEdit: (category: Category) => void;
}

/** Removes references to a category from catalogs and offerings before deletion. */
async function cleanCategoryRefs(
  categoryId: string,
  affectedCatalogs: AffectedEntity[],
  affectedOfferings: AffectedEntity[],
): Promise<void> {
  for (const catalog of affectedCatalogs) {
    await removeCatalogCategoryRef(catalog.id, categoryId, catalog.currentCategories);
  }
  for (const offering of affectedOfferings) {
    await removeOfferingCategoryRef(offering.id, categoryId, offering.currentCategories);
  }
}

/**
 * CategoryList - Categories table that owns the mutations
 *
 * @param {UseQueryResult<Category[]>} query - Query result.
 * @param {Category[]} categories - Categories to show.
 * @param {Map<string, AffectedEntity[]>} categoryCatalogRefs - Catalogs referencing each category.
 * @param {Map<string, AffectedEntity[]>} categoryOfferingRefs - Offerings referencing each category.
 * @param {(category: Category) => void} onEdit - Called on edit.
 */
export default function CategoryList({
  query,
  categories,
  categoryCatalogRefs,
  categoryOfferingRefs,
  onEdit,
}: Readonly<CategoryListProps>) {
  const publishMutation = usePublishCategory();
  const deleteMutation = useDeleteCategory();

  if (query.isLoading || query.isError)
    return <TabFeedback loading={query.isLoading} error={query.isError} />;
  if (!categories.length) return <EmptyState label="categorías" />;

  return (
    <Table
      columns={[
        { key: 'name', label: 'Nombre de la Categoría', align: 'left' },
        { key: 'catalogs', label: 'Catálogos', align: 'center' },
        { key: 'offerings', label: 'Ofertas', align: 'center' },
        { key: 'status', label: 'Estado', align: 'center' },
        { key: 'actions', label: 'Acciones', align: 'right' },
      ]}
      data={categories}
      keyExtractor={(item) => item.id ?? ''}
      renderRow={(item) => (
        <CategoryTableRow
          category={item}
          affectedCatalogs={item.id ? (categoryCatalogRefs.get(item.id) ?? []) : []}
          affectedOfferings={item.id ? (categoryOfferingRefs.get(item.id) ?? []) : []}
          colCount={5}
          onEdit={onEdit}
          onPublish={(id) => publishMutation.mutate(id)}
          onCleanRefs={cleanCategoryRefs}
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
