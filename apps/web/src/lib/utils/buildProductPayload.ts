import type { TokenOfferConfig } from '@/lib/utils/tokenOfferConfig';
import type { Agreement, NewProductInventory, ProductOrder, ProductStatus } from '@/types/api';

/**
 * Builds a `NewProductInventory` payload from a completed Agreement and its Order.
 *
 * @param agreement - The approved Agreement.
 * @param order     - The originating ProductOrder, or `null`.
 * @param status    - Initial inventory status.
 * @param tokenConfig - `tokenOfferConfig` of the tokenized offering, if any.
 * @returns A `NewProductInventory` payload.
 */
export function buildProductPayload(
  agreement: Agreement,
  order: ProductOrder | null,
  status: ProductStatus = 'active',
  tokenConfig?: TokenOfferConfig,
): NewProductInventory {
  const offering = agreement.agreementItem[0]?.productOffering?.[0];
  const orderItem = order?.productOrderItem?.[0];
  const itemPrice = orderItem?.itemPrice?.[0];

  const startDateChar = agreement.characteristic?.find((c) => c.name === 'agreementStartDate');
  const endDateChar = agreement.characteristic?.find((c) => c.name === 'agreementEndDate');

  return {
    status,
    name: offering?.name ?? agreement.name,
    startDate: startDateChar?.value
      ? new Date(startDateChar.value).toISOString()
      : new Date().toISOString(),
    ...(endDateChar?.value && {
      terminationDate: new Date(endDateChar.value).toISOString(),
    }),
    ...(offering && {
      productOffering: { id: offering.id },
    }),
    relatedParty: agreement.engagedParty,
    ...(agreement.id && {
      agreement: [{ id: agreement.id, agreementItemId: '0' }],
    }),
    ...(order?.id &&
      orderItem && {
        productOrderItem: [
          {
            productOrderId: order.id,
            orderItemId: orderItem.id,
            orderItemAction: 'add',
            role: 'subscription',
          },
        ],
      }),
    // Price frozen at purchase time (CA-2), read from the order's `itemPrice`.
    ...(itemPrice?.value != null && {
      productPrice: [{ price: { value: itemPrice.value, unit: itemPrice.unit ?? 'EUR' } }],
    }),
    // Token limits, copied from `tokenOfferConfig` at purchase time.
    ...(tokenConfig && {
      productCharacteristic: [
        {
          id: 'tokenLimits',
          name: 'Límites del token',
          valueType: 'object',
          value: {
            maxRequests: tokenConfig.maxRequests,
            maxTransferTB: tokenConfig.maxTransferTB,
          },
        },
      ],
    }),
  };
}
