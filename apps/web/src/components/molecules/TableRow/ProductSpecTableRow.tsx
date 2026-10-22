'use client';

import { memo, useState } from 'react';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import StatusBadge from '@/components/molecules/StatusBadge';
import { formatDate } from '@/lib/utils/formatDate';
import type { ProductSpecification } from '@/types/api';

import DeletePanel, { type RefGroup } from './DeletePanel';

export interface AffectedOffering {
  id: string;
  name?: string;
}

interface DeleteMutateOptions {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

interface ProductSpecTableRowProps {
  spec: ProductSpecification;
  affectedOfferings: AffectedOffering[];
  colCount?: number;
  onEdit: (spec: ProductSpecification) => void;
  onPublish: (id: string) => void;
  onCleanRefs: (affectedOfferings: AffectedOffering[]) => Promise<void>;
  onDelete: (id: string, options?: DeleteMutateOptions) => void;
  isPending?: boolean;
  isDeleting?: boolean;
}

/**
 * ProductSpecTableRow - Table row for a `ProductSpecification` with publish and delete actions
 *
 * @param {ProductSpecification} spec - ProductSpecification to display.
 * @param {AffectedOffering[]} affectedOfferings - Entities referencing this item.
 * @param {number} [colCount=4] - Number of table columns.
 * @param {(spec: ProductSpecification) => void} onEdit - Edit callback.
 * @param {(id: string) => void} onPublish - Publish callback.
 * @param {(affectedOfferings: AffectedOffering[]) => Promise<void>} onCleanRefs - Cleans references before deletion.
 * @param {(id: string, options?: DeleteMutateOptions) => void} onDelete - Delete callback.
 * @param {boolean} [isPending=false] - Whether a mutation is in progress.
 * @param {boolean} [isDeleting=false] - Whether deletion is in progress.
 */
const ProductSpecTableRow = ({
  spec,
  affectedOfferings,
  colCount = 4,
  onEdit,
  onPublish,
  onCleanRefs,
  onDelete,
  isPending = false,
  isDeleting = false,
}: Readonly<ProductSpecTableRowProps>) => {
  const [mode, setMode] = useState<'view' | 'confirm-delete'>('view');
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanError, setCleanError] = useState<string | null>(null);

  if (!spec.id) return null;

  const id = spec.id;
  const isLaunched = spec.lifecycleStatus === 'Launched';

  const handleCleanAndDelete = async () => {
    setIsCleaning(true);
    setCleanError(null);
    try {
      await onCleanRefs(affectedOfferings);
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

  const refs: RefGroup[] = [{ label: 'oferta(s)', items: affectedOfferings }];

  if (mode === 'confirm-delete') {
    return (
      <DeletePanel
        entityLabel="La especificación"
        entityName={spec.name}
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
      <td className="py-4 text-left">
        <div className="flex flex-col gap-0.5">
          <span className="font-medium text-primary">{spec.name ?? '-'}</span>
          {spec.brand && <span className="text-xs text-gray">{spec.brand}</span>}
        </div>
      </td>
      <td className="py-4 text-center">{formatDate(spec.lastUpdate)}</td>
      <td className="py-4 text-center">
        <StatusBadge status={spec.lifecycleStatus} />
      </td>
      <td className="py-4 text-right pr-1.5">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="icon-default"
            title="Editar"
            disabled={isPending}
            onClick={() => onEdit(spec)}
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

export default memo(ProductSpecTableRow);
