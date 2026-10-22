'use client';

import { memo } from 'react';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import StatusBadge from '@/components/molecules/StatusBadge';
import { formatDate } from '@/lib/utils/formatDate';
import type { Catalog, Category } from '@/types/api';

interface CatalogTableRowProps {
  catalog: Catalog;
  categories?: Category[];
  onEdit?: (catalog: Catalog) => void;
  onPublish: (id: string) => void;
  onRetire: (id: string) => void;
  onMarkObsolete: (id: string) => void;
  onDelete: (id: string) => void;
  isPending?: boolean;
}

/**
 * CatalogTableRow - Table row for a `Catalog` with management actions
 *
 * @param {Catalog} catalog - Catalog to display.
 * @param {Category[]} [categories=[]] - Available categories.
 * @param {(catalog: Catalog) => void} [onEdit] - Edit callback.
 * @param {(id: string) => void} onPublish - Publish callback.
 * @param {(id: string) => void} onRetire - Retire callback.
 * @param {(id: string) => void} onMarkObsolete - Mark-obsolete callback.
 * @param {(id: string) => void} onDelete - Delete callback.
 * @param {boolean} [isPending=false] - Whether a mutation is in progress.
 */
const CatalogTableRow = ({
  catalog,
  categories = [],
  onEdit,
  onPublish,
  onRetire,
  onMarkObsolete,
  onDelete,
  isPending = false,
}: Readonly<CatalogTableRowProps>) => {
  if (!catalog.id) return null;

  const id = catalog.id;
  const status = catalog.lifecycleStatus;
  const isLaunched = status === 'Launched';
  const isRetired = status === 'Retired';
  const isObsolete = status === 'Obsolete';

  return (
    <>
      <td className="pl-2 py-4 text-left text-primary">{catalog.name ?? '-'}</td>
      <td className="py-4 text-center">
        <span className="font-mono text-sm text-gray">{catalog.version ?? '-'}</span>
      </td>
      <td className="py-4 text-center text-xs text-gray">
        {(() => {
          const ref = catalog.category?.[0];
          if (!ref) return '-';
          return ref.name ?? categories.find((c) => c.id === ref.id)?.name ?? '-';
        })()}
      </td>
      <td className="py-4 text-center">{formatDate(catalog.lastUpdate)}</td>
      <td className="py-4 text-center">
        <StatusBadge status={catalog.lifecycleStatus} />
      </td>
      <td className="py-4 text-right pr-1.5">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="icon-default"
            title="Editar"
            disabled={isPending}
            onClick={() => onEdit?.(catalog)}
          >
            <Icon name="Pencil" size={15} />
          </Button>
          <Button
            variant="icon-secondary"
            title={isLaunched ? 'Ya publicado' : 'Publicar'}
            disabled={isLaunched || isPending}
            onClick={() => onPublish(id)}
          >
            <Icon name="Rocket" size={15} />
          </Button>
          <Button
            variant="icon-warning"
            title={isRetired ? 'Ya retirado' : 'Retirar'}
            disabled={isRetired || isPending}
            onClick={() => onRetire(id)}
          >
            <Icon name="CircleOff" size={15} />
          </Button>
          <Button
            variant="icon-danger"
            title={isObsolete ? 'Ya obsoleto' : 'Marcar como obsoleto'}
            disabled={isObsolete || isPending}
            onClick={() => onMarkObsolete(id)}
          >
            <Icon name="Archive" size={15} />
          </Button>
          <Button
            variant="icon-danger"
            title="Eliminar"
            disabled={isPending}
            onClick={() => onDelete(id)}
          >
            <Icon name="Trash2" size={15} />
          </Button>
        </div>
      </td>
    </>
  );
};

export default memo(CatalogTableRow);
