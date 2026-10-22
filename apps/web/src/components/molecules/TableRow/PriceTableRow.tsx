'use client';

import { memo, useState } from 'react';

import Badge from '@/components/atoms/Badge';
import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import type { ProductOfferingPrice } from '@/types/api';

import DeletePanel, { type RefGroup } from './DeletePanel';

export interface PriceAffectedOffering {
  id: string;
  name?: string;
  currentPrices: { id?: string; href?: string; name?: string }[];
}

export const PRICE_TYPE_LABELS: Record<string, string> = {
  recurring: 'Recurrente',
  'one time': 'Único',
  usage: 'Por uso',
};

interface DeleteMutateOptions {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

interface PriceTableRowProps {
  price: ProductOfferingPrice;
  affectedOfferings: PriceAffectedOffering[];
  colCount?: number;
  onEdit?: (price: ProductOfferingPrice) => void;
  onCleanRefs: (priceId: string, affectedOfferings: PriceAffectedOffering[]) => Promise<void>;
  onDelete: (id: string, options?: DeleteMutateOptions) => void;
  isDeleting?: boolean;
}

/**
 * PriceTableRow - Table row for a `ProductOfferingPrice` with edit and delete actions
 *
 * @param {ProductOfferingPrice} price - Price to display.
 * @param {PriceAffectedOffering[]} affectedOfferings - Offerings referencing this price.
 * @param {number} [colCount=5] - Number of table columns.
 * @param {(price: ProductOfferingPrice) => void} [onEdit] - Edit callback.
 * @param {(priceId: string, affectedOfferings: PriceAffectedOffering[]) => Promise<void>} onCleanRefs - Cleans references before deletion.
 * @param {(id: string, options?: DeleteMutateOptions) => void} onDelete - Delete callback.
 * @param {boolean} [isDeleting=false] - Whether deletion is in progress.
 */
const PriceTableRow = ({
  price,
  affectedOfferings,
  colCount = 5,
  onEdit,
  onCleanRefs,
  onDelete,
  isDeleting = false,
}: Readonly<PriceTableRowProps>) => {
  const [mode, setMode] = useState<'view' | 'confirm-delete'>('view');
  const [isCleaning, setIsCleaning] = useState(false);
  const [cleanError, setCleanError] = useState<string | null>(null);

  if (!price.id) return null;

  const id = price.id;

  const handleCleanAndDelete = async () => {
    setIsCleaning(true);
    setCleanError(null);
    try {
      await onCleanRefs(id, affectedOfferings);
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
        entityLabel="El precio"
        entityName={price.name}
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
          <span className="font-medium text-primary">{price.name ?? '-'}</span>
          {price.priceType && (
            <span className="text-xs text-gray">
              {PRICE_TYPE_LABELS[price.priceType] ?? price.priceType}
            </span>
          )}
        </div>
      </td>
      <td className="py-4 text-center text-xs text-primary">
        {price.price ? `${price.price.value} ${price.price.unit}` : '—'}
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
      <td className="py-4 text-right pr-1.5">
        <div className="flex items-center justify-end gap-1">
          <Button variant="icon-default" title="Editar" onClick={() => onEdit?.(price)}>
            <Icon name="Pencil" size={15} />
          </Button>
          <Button variant="icon-danger" title="Eliminar" onClick={() => setMode('confirm-delete')}>
            <Icon name="Trash2" size={15} />
          </Button>
        </div>
      </td>
    </>
  );
};

export default memo(PriceTableRow);
