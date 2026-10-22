// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/session', () => ({ getSession: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

import { redirect } from 'next/navigation';

import { getSession } from '@/lib/session';
import { redirectUnlessProvider } from '@/lib/utils/providerGuard';

function mockProfile(userProfile: unknown) {
  vi.mocked(getSession).mockResolvedValue({ userProfile } as Awaited<ReturnType<typeof getSession>>);
}

beforeEach(() => vi.mocked(redirect).mockReset());

describe('redirectUnlessProvider', () => {
  it('redirige al BUYER (solo consumidor) a /dashboard', async () => {
    mockProfile({ businessRoles: ['consumidor'] });
    await redirectUnlessProvider();
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });

  it('no redirige al SELLER ni al ADMIN', async () => {
    mockProfile({ businessRoles: ['proveedor'] });
    await redirectUnlessProvider();
    mockProfile({ businessRoles: ['proveedor', 'consumidor'] });
    await redirectUnlessProvider();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('sesiones antiguas sin businessRoles se tratan como ambos roles', async () => {
    mockProfile({});
    await redirectUnlessProvider();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('sin sesión tampoco redirige aquí (lo gestiona el middleware)', async () => {
    mockProfile(undefined);
    await redirectUnlessProvider();
    expect(redirect).not.toHaveBeenCalled();
  });
});
