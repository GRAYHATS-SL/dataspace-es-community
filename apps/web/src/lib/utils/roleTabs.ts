import type { BusinessRole } from '@/lib/session';

const TAB_BUSINESS_ROLE: Readonly<Record<string, BusinessRole>> = {
  buyer: 'consumidor',
  seller: 'proveedor',
};

/**
 * @summary Filters the consumer / provider tabs by business role.
 *
 * @param  {T[]}  tabs - Tabs with `id` `buyer` or `seller`.
 * @param  {BusinessRole[]}  [businessRoles] - Session business roles.
 * @returns {T[]} Visible tabs.
 */
export function getVisibleRoleTabs<T extends { id: string }>(
  tabs: readonly T[],
  businessRoles?: readonly BusinessRole[],
): T[] {
  if (!businessRoles) return [...tabs];
  const visible = tabs.filter((tab) => {
    const required = TAB_BUSINESS_ROLE[tab.id];
    return !required || businessRoles.includes(required);
  });
  return visible.length > 0 ? visible : [...tabs];
}
