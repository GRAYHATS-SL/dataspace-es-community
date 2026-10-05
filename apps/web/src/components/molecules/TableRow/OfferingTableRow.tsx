'use client';

import { memo, useState } from 'react';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import StatusBadge from '@/components/molecules/StatusBadge';
import { formatDate } from '@/lib/utils/formatDate';
import type { ProductOffering } from '@/types/api';

import DeletePanel from './DeletePanel';

interface MutateOptions {
  onSuccess?: () => void;
}

interface OfferingTableRowProps {
  offering: ProductOffering;
  colCount?: number;
  onEdit?: (offering: ProductOffering) => void;
  onPublish: (id: string) => void;
  onDelete: (id: string, options?: MutateOptions) => void;
  isPending?: boolean;
  isDeleting?: boolean;
  deleteError?: string | null;
}

/**
 * OfferingTableRow - Presentational table row for a `ProductOffering` with publish/delete actions.
 */
const OfferingTableRow = ({
  offering,
  colCount = 6,
  onEdit,
  onPublish,
  onDelete,
  isPending = false,
  isDeleting = false,
  deleteError = null,
}: Readonly<OfferingTableRowProps>) => {
  const [mode, setMode] = useState<'view' | 'confirm-delete'>('view');

  if (!offering.id) return null;

  const id = offering.id;
  const isLaunched = offering.lifecycleStatus === 'Launched';
  const category = offering.category?.[0];
  // Here you define an optional secondary status label shown under the lifecycle badge.
  const secondaryStatus = undefined as string | undefined;

  if (mode === 'confirm-delete') {
    return (
      <DeletePanel
        entityName={offering.name}
        onConfirm={() => onDelete(id, { onSuccess: () => setMode('view') })}
        onCancel={() => setMode('view')}
        isDeleting={isDeleting}
        error={deleteError}
        colCount={colCount}
      />
    );
  }

  return (
    <>
      <td className="py-4 text-left">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-primary">{offering.name ?? '-'}</span>
          {offering.description && (
            <span className="text-xs text-gray">{offering.description}</span>
          )}
        </div>
      </td>
      <td className="py-4 text-center text-xs text-gray">
        {offering.productSpecification?.name ?? offering.productSpecification?.id ?? '-'}
      </td>
      <td className="py-4 text-center text-xs text-gray">
        {category ? (category.name ?? category.id) : '-'}
      </td>
      <td className="py-4 text-center">{formatDate(offering.lastUpdate)}</td>
      <td className="py-4 text-center">
        <div className="flex flex-col items-center gap-0.5">
          <StatusBadge status={offering.lifecycleStatus} />
          {secondaryStatus && <span className="text-xs text-gray">{secondaryStatus}</span>}
        </div>
      </td>
      <td className="py-4 text-right pr-1.5">
        <div className="flex items-center justify-end gap-1">
          {onEdit && (
            <Button
              variant="icon-default"
              title="Editar"
              aria-label="Editar"
              disabled={isPending}
              onClick={() => onEdit(offering)}
            >
              <Icon name="Pencil" size={15} />
            </Button>
          )}
          <Button
            variant="icon-secondary"
            title={isLaunched ? 'Ya publicada' : 'Publicar'}
            aria-label={isLaunched ? 'Ya publicada' : 'Publicar'}
            disabled={isLaunched || isPending}
            onClick={() => onPublish(id)}
          >
            <Icon name="Rocket" size={15} />
          </Button>
          <Button
            variant="icon-danger"
            title="Eliminar"
            aria-label="Eliminar"
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

export default memo(OfferingTableRow);
