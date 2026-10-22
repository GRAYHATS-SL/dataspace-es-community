import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserProfile } from '@/lib/session';

import PerfilPageClient from '../page.client';

const saveStripeAccount = vi.fn();
vi.mock('@/hooks/queries/usePartyQueries', () => ({
  useOrganizationById: () => ({ data: { id: 'org-1', partyCharacteristic: [] }, isLoading: false }),
  usePatchOrganization: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSaveStripeConnectAccountId: () => ({ mutateAsync: saveStripeAccount, isPending: false }),
}));

const STRIPE_TITLE = 'Cobros (Stripe Connect)';

function profile(overrides: Partial<UserProfile>): UserProfile {
  return {
    name: 'Test',
    organization: 'Org',
    sub: 'did:key:1',
    roles: [],
    businessRoles: [],
    organizationId: 'org-1',
    ...overrides,
  };
}

function renderOrgTab(userProfile: UserProfile) {
  render(<PerfilPageClient userProfile={userProfile} token={{ exp: 9999999999 }} />);
  fireEvent.click(screen.getByRole('tab', { name: /Organización/ }));
}

describe('PerfilPageClient — tarjeta Cobros (Stripe Connect)', () => {
  beforeEach(() => saveStripeAccount.mockReset());
  afterEach(cleanup);

  it('no se muestra a un BUYER y no se ejecuta ningún guardado de Stripe', () => {
    renderOrgTab(profile({ roles: ['BUYER'], businessRoles: ['consumidor'] }));
    expect(screen.queryByText(STRIPE_TITLE)).toBeNull();
    expect(screen.queryByText('Configurar cobros')).toBeNull();
    expect(saveStripeAccount).not.toHaveBeenCalled();
  });

  it('se muestra a un SELLER', () => {
    renderOrgTab(profile({ roles: ['SELLER'], businessRoles: ['proveedor'] }));
    expect(screen.getByText(STRIPE_TITLE)).toBeTruthy();
  });

  it('se muestra a un ADMIN (proveedor + consumidor)', () => {
    renderOrgTab(profile({ roles: ['ADMIN'], businessRoles: ['proveedor', 'consumidor'] }));
    expect(screen.getByText(STRIPE_TITLE)).toBeTruthy();
  });

  it('sesiones antiguas sin businessRoles se tratan como proveedor (mismo criterio que DropdownMenu)', () => {
    const legacy = profile({}) as Partial<UserProfile>;
    delete legacy.businessRoles;
    renderOrgTab(legacy as UserProfile);
    expect(screen.getByText(STRIPE_TITLE)).toBeTruthy();
  });
});

describe('PerfilPageClient — edición', () => {
  afterEach(cleanup);

  it('la pestaña Perfil es de solo lectura y no ofrece vincular ni editar', () => {
    render(
      <PerfilPageClient
        userProfile={profile({ roles: ['BUYER'], email: 'ana@empresa.com' })}
        token={{ exp: 9999999999 }}
      />,
    );
    expect(screen.queryByText('Vincular mi perfil')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
    expect(screen.getByText('ana@empresa.com')).toBeTruthy();
  });

  it('BUYER no ve ningún botón de edición de la organización', () => {
    renderOrgTab(profile({ roles: ['BUYER'], businessRoles: ['consumidor'] }));
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull();
  });

  it('SELLER edita contract management pero no los datos fiscales', () => {
    renderOrgTab(profile({ roles: ['SELLER'], businessRoles: ['proveedor'] }));
    expect(screen.getAllByRole('button', { name: 'Editar' })).toHaveLength(1);
  });

  it('SELLER conserva el botón para configurar sus cobros (Stripe)', () => {
    renderOrgTab(profile({ roles: ['SELLER'], businessRoles: ['proveedor'] }));
    expect(screen.getByText('Configurar cobros')).toBeTruthy();
  });

  it('ADMIN ve los botones de edición de la organización', () => {
    renderOrgTab(profile({ roles: ['ADMIN'], businessRoles: ['proveedor', 'consumidor'] }));
    expect(screen.getAllByRole('button', { name: 'Editar' }).length).toBeGreaterThan(0);
    expect(screen.getByText('Configurar cobros')).toBeTruthy();
  });
});
