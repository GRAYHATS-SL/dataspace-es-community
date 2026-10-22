'use client';

import { memo, useState } from 'react';

import Button from '@/components/atoms/Button';
import Icon from '@/components/atoms/Icon';
import StatusBadge from '@/components/molecules/StatusBadge';
import { formatDate } from '@/lib/utils/formatDate';
import { getOwn } from '@/lib/utils/getOwn';
import type { TokenOfferConfig, TokenOfferStatus } from '@/lib/utils/tokenOfferConfig';
import type { Category, ProductOffering } from '@/types/api';

import DeletePanel from './DeletePanel';

interface MutateOptions {
  onSuccess?: () => void;
}

export const TOKEN_OFFER_STATUS_LABELS: Record<TokenOfferStatus, string> = {
  draft: 'Borrador',
  published: 'Publicada',
  paused: 'Pausada',
  exhausted: 'Agotada',
  retired: 'Retirada',
};

interface TokenStatusActionsProps {
  offering: ProductOffering;
  tokenStatus: TokenOfferStatus | undefined;
  isPending: boolean;
  onSetTokenStatus: (offering: ProductOffering, status: TokenOfferStatus) => void;
}

/** Management buttons for a tokenized offering status. */
const TokenStatusActions = ({
  offering,
  tokenStatus,
  isPending,
  onSetTokenStatus,
}: Readonly<TokenStatusActionsProps>) => (
  <>
    {(tokenStatus === 'draft' || tokenStatus === 'paused') && (
      <Button
        variant="icon-secondary"
        title={tokenStatus === 'draft' ? 'Publicar' : 'Reanudar'}
        disabled={isPending}
        onClick={() => onSetTokenStatus(offering, 'published')}
      >
        <Icon name={tokenStatus === 'draft' ? 'Rocket' : 'Play'} size={15} />
      </Button>
    )}
    {tokenStatus === 'published' && (
      <Button
        variant="icon-secondary"
        title="Pausar"
        disabled={isPending}
        onClick={() => onSetTokenStatus(offering, 'paused')}
      >
        <Icon name="Pause" size={15} />
      </Button>
    )}
    {(tokenStatus === 'published' || tokenStatus === 'paused') && (
      <Button
        variant="icon-danger"
        title="Retirar"
        disabled={isPending}
        onClick={() => onSetTokenStatus(offering, 'retired')}
      >
        <Icon name="XCircle" size={15} />
      </Button>
    )}
  </>
);

interface OfferingTableRowProps {
  offering: ProductOffering;
  categories?: Category[];
  publisherBySpecId?: Map<string, string>;
  tokenConfig?: TokenOfferConfig;
  colCount?: number;
  onEdit: (offering: ProductOffering) => void;
  onPublish: (id: string) => void;
  onSetTokenStatus?: (offering: ProductOffering, status: TokenOfferStatus) => void;
  onDelete: (id: string, options?: MutateOptions) => void;
  isPending?: boolean;
  isDeleting?: boolean;
}

/**
 * OfferingTableRow - Table row for a `ProductOffering` with edit, publish and delete actions
 *
 * @param {ProductOffering} offering - Offering to display.
 * @param {Category[]} [categories=[]] - Available categories.
 * @param {Map<string, string>} [publisherBySpecId] - Specification id to publisher name map.
 * @param {number} [colCount=8] - Number of table columns.
 * @param {(offering: ProductOffering) => void} onEdit - Edit callback.
 * @param {(id: string) => void} onPublish - Publish callback.
 * @param {(id: string, options?: MutateOptions) => void} onDelete - Delete callback.
 * @param {boolean} [isPending=false] - Whether a mutation is in progress.
 * @param {boolean} [isDeleting=false] - Whether deletion is in progress.
 */
const OfferingTableRow = ({
  offering,
  categories = [],
  publisherBySpecId = new Map(),
  tokenConfig,
  colCount = 8,
  onEdit,
  onPublish,
  onSetTokenStatus,
  onDelete,
  isPending = false,
  isDeleting = false,
}: Readonly<OfferingTableRowProps>) => {
  const [mode, setMode] = useState<'view' | 'confirm-delete'>('view');

  if (!offering.id) return null;

  const id = offering.id;
  const isLaunched = offering.lifecycleStatus === 'Launched';
  const tokenStatus = tokenConfig?.tokenOfferStatus;

  if (mode === 'confirm-delete') {
    return (
      <DeletePanel
        entityLabel="La oferta"
        entityName={offering.name}
        refs={[]}
        onCleanAndDelete={() => onDelete(id, { onSuccess: () => setMode('view') })}
        onCancel={() => setMode('view')}
        isCleaning={false}
        isDeleting={isDeleting}
        cleanError={null}
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
        {offering.productSpecification?.name ?? '-'}
      </td>
      <td className="py-4 text-center text-xs text-gray">
        {offering.productSpecification?.id
          ? (publisherBySpecId.get(offering.productSpecification.id) ?? '-')
          : '-'}
      </td>
      <td className="py-4 text-center text-xs text-gray">
        {(() => {
          const ref = offering.category?.[0];
          if (!ref) return '-';
          return ref.name ?? categories.find((c) => c.id === ref.id)?.name ?? '-';
        })()}
      </td>
      <td className="py-4 text-center">{formatDate(offering.lastUpdate)}</td>
      <td className="py-4 text-center">
        <div className="flex flex-col items-center gap-0.5">
          <StatusBadge status={offering.lifecycleStatus} />
          {tokenStatus && (
            <span className="text-xs text-gray">{getOwn(TOKEN_OFFER_STATUS_LABELS, tokenStatus)}</span>
          )}
        </div>
      </td>
      <td className="py-4 text-right pr-1.5">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="icon-default"
            title="Editar"
            disabled={isPending}
            onClick={() => onEdit(offering)}
          >
            <Icon name="Pencil" size={15} />
          </Button>
          {tokenConfig && onSetTokenStatus ? (
            <TokenStatusActions
              offering={offering}
              tokenStatus={tokenStatus}
              isPending={isPending}
              onSetTokenStatus={onSetTokenStatus}
            />
          ) : (
            <Button
              variant="icon-secondary"
              title={isLaunched ? 'Ya publicada' : 'Publicar'}
              disabled={isLaunched || isPending}
              onClick={() => onPublish(id)}
            >
              <Icon name="Rocket" size={15} />
            </Button>
          )}
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

export default memo(OfferingTableRow);
