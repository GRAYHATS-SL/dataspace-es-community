'use client';

import { memo, useState } from 'react';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import StatusBadge from '@/components/molecules/StatusBadge';
import { formatDate } from '@/lib/utils/formatDate';
import type { ServiceSpecification } from '@/types/api';

import DeletePanel, { type RefGroup } from './DeletePanel';

interface AffectedProductSpec {
  id: string;
  name?: string;
  currentRefs: { id?: string; href?: string; name?: string }[];
}

interface DeleteMutateOptions {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

interface ServiceSpecTableRowProps {
  serviceSpec: ServiceSpecification;
  affectedProductSpecs: AffectedProductSpec[];
  colCount?: number;
  onEdit: (spec: ServiceSpecification) => void;
  onPublish: (id: string) => void;
  onCleanRefs: (
    serviceSpecId: string,
    affectedProductSpecs: AffectedProductSpec[],
  ) => Promise<void>;
  onDelete: (id: string, options?: DeleteMutateOptions) => void;
  isPending?: boolean;
  isDeleting?: boolean;
}

/**
 * ServiceSpecTableRow - Table row for a `ServiceSpecification` with publish and delete actions
 *
 * @param {ServiceSpecification} serviceSpec - ServiceSpecification to display.
 * @param {AffectedProductSpec[]} affectedProductSpecs - Entities referencing this item.
 * @param {number} [colCount=4] - Number of table columns.
 * @param {(spec: ServiceSpecification) => void} onEdit - Edit callback.
 * @param {(id: string) => void} onPublish - Publish callback.
 * @param {(serviceSpecId: string, affectedProductSpecs: AffectedProductSpec[]) => Promise<void>} onCleanRefs - Cleans references before deletion.
 * @param {(id: string, options?: DeleteMutateOptions) => void} onDelete - Delete callback.
 * @param {boolean} [isPending=false] - Whether a mutation is in progress.
 * @param {boolean} [isDeleting=false] - Whether deletion is in progress.
 */
const ServiceSpecTableRow = ({
  serviceSpec,
  affectedProductSpecs,
  colCount = 4,
  onEdit,
  onPublish,
  onCleanRefs,
  onDelete,
  isPending = false,
  isDeleting = false,
}: Readonly<ServiceSpecTableRowProps>) => {
  const [mode, setMode] = useState<'view' | 'confirm-delete'>('view');
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanError, setCleanError] = useState<string | null>(null);

  if (!serviceSpec.id) return null;

  const id = serviceSpec.id;
  const isLaunched = serviceSpec.lifecycleStatus === 'Launched';

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
        entityLabel="La especificación de servicio"
        entityName={serviceSpec.name}
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
        <span className="font-medium text-primary">{serviceSpec.name ?? '-'}</span>
      </td>
      <td className="py-4 text-center">{formatDate(serviceSpec.lastUpdate)}</td>
      <td className="py-4 text-center">
        <StatusBadge status={serviceSpec.lifecycleStatus} />
      </td>
      <td className="py-4 text-right pr-1.5">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="icon-default"
            title="Editar"
            disabled={isPending}
            onClick={() => onEdit(serviceSpec)}
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

export default memo(ServiceSpecTableRow);
