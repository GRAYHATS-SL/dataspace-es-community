import type { Characteristic } from '@/types/api';

/**
 * @summary Reads the latest value of a `partyCharacteristic` by name.
 *
 * @param  {Characteristic[] | undefined}  characteristics - Organization `partyCharacteristic`.
 * @param  {string}                        name            - Characteristic name.
 * @returns {Characteristic['value'] | undefined} Latest value, or `undefined`.
 *
 * @example
 * const accountId = getLatestCharacteristicValue(org.partyCharacteristic, 'stripeConnectAccountId');
 */
export function getLatestCharacteristicValue(
  characteristics: Characteristic[] | undefined,
  name: string,
): Characteristic['value'] | undefined {
  return [...(characteristics ?? [])].reverse().find((c) => c.name === name)?.value;
}
