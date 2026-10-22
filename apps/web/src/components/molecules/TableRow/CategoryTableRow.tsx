'use client';

import { memo, useState } from 'react';

import Badge from '@/components/atoms/Badge';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import StatusBadge from '@/components/molecules/StatusBadge';
import type { Category } from '@/types/api';

import DeletePanel, { type RefGroup } from './DeletePanel';

export interface AffectedEntity {
  id: string;
  name?: string;
  currentCategories: { id?: string; href?: string; name?: string }[];
}

interface DeleteMutateOptions {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

interface CategoryTableRowProps {
  category: Category;
  affectedCatalogs: AffectedEntity[];
  affectedOfferings: AffectedEntity[];
  colCount?: number;
  onEdit?: (category: Category) => void;
  onPublish: (id: string) => void;
  onCleanRefs: (
    categoryId: string,
    affectedCatalogs: AffectedEntity[],
    affectedOfferings: AffectedEntity[],
  ) => Promise<void>;
  onDelete: (id: string, options?: DeleteMutateOptions) => void;
  isPending?: boolean;
  isDeleting?: boolean;
}

/**
 * CategoryTableRow - Table row for a `Category` with edit, publish and delete actions
 *
 * @param {Category} category - Category to display.
 * @param {AffectedEntity[]} affectedCatalogs - Catalogs referencing this category.
 * @param {AffectedEntity[]} affectedOfferings - Offerings referencing this category.
 * @param {number} [colCount=5] - Number of table columns.
 * @param {(category: Category) => void} [onEdit] - Edit callback.
 * @param {(id: string) => void} onPublish - Publish callback.
 * @param {(categoryId: string, affectedCatalogs: AffectedEntity[], affectedOfferings: AffectedEntity[]) => Promise<void>} onCleanRefs - Cleans references before deletion.
 * @param {(id: string, options?: DeleteMutateOptions) => void} onDelete - Delete callback.
 * @param {boolean} [isPending=false] - Whether a mutation is in progress.
 * @param {boolean} [isDeleting=false] - Whether deletion is in progress.
 */
const CategoryTableRow = ({
  category,
  affectedCatalogs,
  affectedOfferings,
  colCount = 5,
  onEdit,
  onPublish,
  onCleanRefs,
  onDelete,
  isPending = false,
  isDeleting = false,
}: Readonly<CategoryTableRowProps>) => {
  const [mode, setMode] = useState<'view' | 'confirm-delete'>('view');
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanError, setCleanError] = useState<string | null>(null);

  if (!category.id) return null;

  const id = category.id;
  const isLaunched = category.lifecycleStatus === 'Launched';

  const handleCleanAndDelete = async () => {
    setIsCleaning(true);
    setCleanError(null);
    try {
      await onCleanRefs(id, affectedCatalogs, affectedOfferings);
      setIsCleaning(false);
      onDelete(id, {
        onSuccess: () => setMode('view'),
        onError: (err) => setCleanError(err instanceof Error ? err.message : 'Error al eliminar'),
      });
    } catch (err) {
      setIsCleaning(false);
      setCleanError(err instanceof Error ? err.message : 'Error al limpiar referencias');
    }
  };

  const refs: RefGroup[] = [
    { label: 'catálogo(s)', items: affectedCatalogs },
    { label: 'oferta(s)', items: affectedOfferings },
  ];

  if (mode === 'confirm-delete') {
    return (
      <DeletePanel
        entityLabel="La categoría"
        entityName={category.name}
        refs={refs}
        onCleanAndDelete={handleCleanAndDelete}
        onCancel={() => {
          setMode('view');
          setCleanError(null);
        }}
        isCleaning={isCleaning}
        isDeleting={isDeleting}
        cleanError={cleanError}
        colCount={colCount}
      />
    );
  }

  return (
    <>
      <td className="pl-2 py-4 text-left">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-primary">{category.name ?? '-'}</span>
          {category.description && (
            <span className="text-xs text-gray">{category.description}</span>
          )}
        </div>
      </td>
      <td className="py-4 text-center">
        <Badge
          variant="count"
          size="sm"
          title={affectedCatalogs.map((c) => c.name ?? c.id).join(', ')}
          className={affectedCatalogs.length > 0 ? 'bg-secondary/10 text-secondary' : ''}
        >
          {affectedCatalogs.length}
        </Badge>
      </td>
      <td className="py-4 text-center">
        <Badge
          variant="count"
          size="sm"
          title={affectedOfferings.map((o) => o.name ?? o.id).join(', ')}
          className={affectedOfferings.length > 0 ? 'bg-secondary/10 text-secondary' : ''}
        >
          {affectedOfferings.length}
        </Badge>
      </td>
      <td className="py-4 text-center">
        <StatusBadge status={category.lifecycleStatus} />
      </td>
      <td className="py-4 text-right pr-1.5">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="icon-default"
            title="Editar"
            disabled={isPending}
            onClick={() => onEdit?.(category)}
          >
            <Icon name="Pencil" size={15} />
          </Button>
          <Button
            variant="icon-secondary"
            title={isLaunched ? 'Ya publicada' : 'Publicar'}
            disabled={isLaunched || isPending}
            onClick={() => onPublish(id)}
          >
            <Icon name="Rocket" size={15} />
          </Button>
          <Button
            variant="icon-danger"
            title="Eliminar"
            disabled={isPending}
            onClick={() => setMode('confirm-delete')}
          >
            <Icon name="Trash2" size={15} />
          </Button>
        </div>
      </td>
    </>
  );
};

export default memo(CategoryTableRow);
