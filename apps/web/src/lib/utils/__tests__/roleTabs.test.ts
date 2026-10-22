import { describe, expect, it } from 'vitest';

import { getVisibleRoleTabs } from '@/lib/utils/roleTabs';

const TABS = [
  { id: 'buyer', label: 'Como consumidor', icon: 'ShoppingCart' },
  { id: 'seller', label: 'Como proveedor', icon: 'Package' },
];

describe('getVisibleRoleTabs', () => {
  it('BUYER (consumidor) solo ve la pestaña de consumidor', () => {
    expect(getVisibleRoleTabs(TABS, ['consumidor']).map((t) => t.id)).toEqual(['buyer']);
  });

  it('SELLER (proveedor) solo ve la pestaña de proveedor', () => {
    expect(getVisibleRoleTabs(TABS, ['proveedor']).map((t) => t.id)).toEqual(['seller']);
  });

  it('ADMIN (ambos roles) ve las dos pestañas', () => {
    expect(getVisibleRoleTabs(TABS, ['proveedor', 'consumidor'])).toEqual(TABS);
  });

  it('sesiones antiguas sin businessRoles ven todas', () => {
    expect(getVisibleRoleTabs(TABS, undefined)).toEqual(TABS);
  });

  it('sin roles reconocidos no deja la página sin pestañas', () => {
    expect(getVisibleRoleTabs(TABS, [])).toEqual(TABS);
  });

  it('no filtra pestañas ajenas a buyer/seller', () => {
    const extra = [...TABS, { id: 'otra', label: 'Otra', icon: 'Info' }];
    expect(getVisibleRoleTabs(extra, ['consumidor']).map((t) => t.id)).toEqual(['buyer', 'otra']);
  });
});
