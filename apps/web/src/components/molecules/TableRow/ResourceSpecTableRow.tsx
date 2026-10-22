'use client';

import { memo, useState } from 'react';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import StatusBadge from '@/components/molecules/StatusBadge';
import { formatDate } from '@/lib/utils/formatDate';
import type { ResourceSpecification } from '@/types/api';

import DeletePanel, { type RefGroup } from './DeletePanel';

export interface AffectedProductSpec {
  id: string;
  name?: string;
  currentRefs: { id?: string; href?: string; name?: string }[];
}

interface DeleteMutateOptions {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

interface ResourceSpecTableRowProps {
  resourceSpec: ResourceSpecification;
  affectedProductSpecs: AffectedProductSpec[];
  colCount?: number;
  onEdit: (spec: ResourceSpecification) => void;
  onPublish: (id: string) => void;
  onCleanRefs: (
    resourceSpecId: string,
    affectedProductSpecs: AffectedProductSpec[],
  ) => Promise<void>;
  onDelete: (id: string, options?: DeleteMutateOptions) => void;
  isPending?: boolean;
  isDeleting?: boolean;
}

/**
 * ResourceSpecTableRow - Table row for a `ResourceSpecification` with publish and delete actions
 *
 * @param {ResourceSpecification} resourceSpec - ResourceSpecification to display.
 * @param {AffectedProductSpec[]} affectedProductSpecs - Entities referencing this item.
 * @param {number} [colCount=4] - Number of table columns.
 * @param {(spec: ResourceSpecification) => void} onEdit - Edit callback.
 * @param {(id: string) => void} onPublish - Publish callback.
 * @param {(resourceSpecId: string, affectedProductSpecs: AffectedProductSpec[]) => Promise<void>} onCleanRefs - Cleans references before deletion.
 * @param {(id: string, options?: DeleteMutateOptions) => void} onDelete - Delete callback.
 * @param {boolean} [isPending=false] - Whether a mutation is in progress.
 * @param {boolean} [isDeleting=false] - Whether deletion is in progress.
 */
const ResourceSpecTableRow = ({
  resourceSpec,
  affectedProductSpecs,
  colCount = 4,
  onEdit,
  onPublish,
  onCleanRefs,
  onDelete,
  isPending = false,
  isDeleting = false,
}: Readonly<ResourceSpecTableRowProps>) => {
  const [mode, setMode] = useState<'view' | 'confirm-delete'>('view');
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanError, setCleanError] = useState<string | null>(null);

  if (!resourceSpec.id) return null;

  const id = resourceSpec.id;
  const isLaunched = resourceSpec.lifecycleStatus === 'Launched';

  const handleCleanAndDelete = async () => {
    setIsCleaning(true);
    setCleanError(null);
    try {
      await onCleanRefs(id, affectedProductSpecs);
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

  const refs: RefGroup[] = [{ label: 'espec. de producto', items: affectedProductSpecs }];

  if (mode === 'confirm-delete') {
    return (
      <DeletePanel
        entityLabel="La especificación de recurso"
        entityName={resourceSpec.name}
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
          <span className="font-medium text-primary">{resourceSpec.name ?? '-'}</span>
          {resourceSpec.category && (
            <span className="text-xs text-gray">{resourceSpec.category}</span>
          )}
        </div>
      </td>
      <td className="py-4 text-center">{formatDate(resourceSpec.lastUpdate)}</td>
      <td className="py-4 text-center">
        <StatusBadge status={resourceSpec.lifecycleStatus} />
      </td>
      <td className="py-4 text-right pr-1.5">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="icon-default"
            title="Editar"
            disabled={isPending}
            onClick={() => onEdit(resourceSpec)}
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

export default memo(ResourceSpecTableRow);
