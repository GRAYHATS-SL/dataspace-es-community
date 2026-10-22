/**
 * Safe `record[key]` read that returns only own properties.
 *
 * @returns The value, or `undefined` if not an own property.
 */
export function getOwn<T>(record: Readonly<Record<string, T>>, key: string): T | undefined {
  return Object.hasOwn(record, key) ? (Reflect.get(record, key) as T) : undefined;
}
