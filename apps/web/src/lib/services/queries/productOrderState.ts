import { type BackendOrderState, backendPatchOrderState } from '@/lib/services/backendCredential';
import type { ProductOrder } from '@/types/api';

import { assertOrderParty } from './ownership';

/**
 * @summary Changes an order's state using the backend token after validating the party.
 *
 * @param {string}            id - Order id.
 * @param {BackendOrderState} state - `completed`, `cancelled` or `rejected`.
 * @returns {Promise<ProductOrder>} The updated order.
 *
 * @throws {Error} `Forbidden` if the organization is not a party; HTTP 4xx/5xx from the backend.
 */
export async function setOrderStateAsBackend(
  id: string,
  state: BackendOrderState,
): Promise<ProductOrder> {
  await assertOrderParty(id);
  return backendPatchOrderState(id, state);
}
