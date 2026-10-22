'use client';

import { type UseQueryResult } from '@tanstack/react-query';

import EmptyState from '@/components/atoms/EmptyState';
import TabFeedback from '@/components/atoms/TabFeedback';
import { OfferingTableRow } from '@/components/molecules/TableRow';
import Table from '@/components/organisms/Table';
import {
  useDeleteProductOffering,
  usePatchProductOffering,
  usePublishProductOffering,
} from '@/hooks/queries/useProductOfferingQueries';
import { usePatchProductSpecification } from '@/hooks/queries/useProductSpecificationQueries';
import { getOwn } from '@/lib/utils/getOwn';
import {
  extractTokenOfferConfig,
  mergeTokenOfferConfigChar,
  type TokenOfferStatus,
} from '@/lib/utils/tokenOfferConfig';
import type { Category, ProductOffering, ProductSpecification } from '@/types/api';

interface OfferingListProps {
  query: UseQueryResult<ProductOffering[]>;
  offerings: ProductOffering[];
  categories: Category[];
  publisherBySpecId?: Map<string, string>;
  specById?: Map<string, ProductSpecification>;
  onEdit: (offering: ProductOffering) => void;
}

/** Maps tokenOfferStatus to the offering's lifecycleStatus/isSellable. */
const TOKEN_STATUS_TO_OFFERING: Record<
  TokenOfferStatus,
  { lifecycleStatus: ProductOffering['lifecycleStatus']; isSellable: boolean }
> = {
  draft: { lifecycleStatus: 'In design', isSellable: false },
  published: { lifecycleStatus: 'Launched', isSellable: true },
  paused: { lifecycleStatus: 'Launched', isSellable: false },
  exhausted: { lifecycleStatus: 'Launched', isSellable: false },
  retired: { lifecycleStatus: 'Retired', isSellable: false },
};

/**
 * OfferingList - Offerings table that owns the mutations
 *
 * @param {UseQueryResult<ProductOffering[]>} query - Offerings query result.
 * @param {ProductOffering[]} offerings - Offerings to show.
 * @param {Category[]} categories - Available categories.
 * @param {Map<string, string>} [publisherBySpecId] - Spec id to publisher name.
 * @param {Map<string, ProductSpecification>} [specById] - Spec id to specification.
 * @param {(offering: ProductOffering) => void} onEdit - Called on edit.
 */
export default function OfferingList({
  query,
  offerings,
  categories,
  publisherBySpecId = new Map(),
  specById = new Map(),
  onEdit,
}: Readonly<OfferingListProps>) {
  const publishMutation = usePublishProductOffering();
  const deleteMutation = useDeleteProductOffering();
  const patchOfferingMutation = usePatchProductOffering();
  const patchSpecMutation = usePatchProductSpecification();

  const handleSetTokenStatus = (offering: ProductOffering, status: TokenOfferStatus) => {
    const specId = offering.productSpecification?.id;
    if (!specId || !offering.id) return;
    const spec = specById.get(specId);
    const config = extractTokenOfferConfig(spec);
    const offeringPayload = getOwn(TOKEN_STATUS_TO_OFFERING, status);
    if (!config || !offeringPayload) return;

    patchSpecMutation.mutate({
      id: specId,
      payload: {
        productSpecCharacteristic: mergeTokenOfferConfigChar(spec, {
          ...config,
          tokenOfferStatus: status,
        }),
      },
    });
    patchOfferingMutation.mutate({ id: offering.id, payload: offeringPayload });
  };

  if (query.isLoading || query.isError)
    return <TabFeedback loading={query.isLoading} error={query.isError} />;
  if (!offerings.length) return <EmptyState label="ofertas" />;

  return (
    <Table
      columns={[
        { key: 'name', label: 'Nombre de la Oferta', align: 'left' },
        { key: 'spec', label: 'Especificación', align: 'center' },
        { key: 'publisher', label: 'Publicado por', align: 'center' },
        { key: 'category', label: 'Categoría', align: 'center' },
        { key: 'date', label: 'Última actualización', align: 'center' },
        { key: 'status', label: 'Estado', align: 'center' },
        { key: 'actions', label: 'Acciones', align: 'right' },
      ]}
      data={offerings}
      keyExtractor={(item) => item.id ?? ''}
      renderRow={(item) => (
        <OfferingTableRow
          offering={item}
          categories={categories}
          publisherBySpecId={publisherBySpecId}
          tokenConfig={extractTokenOfferConfig(
            item.productSpecification?.id ? specById.get(item.productSpecification.id) : undefined,
          )}
          colCount={7}
          onEdit={onEdit}
          onPublish={(id) => publishMutation.mutate(id)}
          onSetTokenStatus={handleSetTokenStatus}
          onDelete={(id, options) => deleteMutation.mutate(id, options)}
          isPending={
            (publishMutation.isPending && publishMutation.variables === item.id) ||
            (deleteMutation.isPending && deleteMutation.variables === item.id) ||
            (patchOfferingMutation.isPending && patchOfferingMutation.variables?.id === item.id) ||
            (patchSpecMutation.isPending &&
              patchSpecMutation.variables?.id === item.productSpecification?.id)
          }
          isDeleting={deleteMutation.isPending && deleteMutation.variables === item.id}
        />
      )}
      variant="plain"
      size="md"
    />
  );
}
