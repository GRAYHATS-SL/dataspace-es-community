import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/queries/party', () => ({
  fetchOrganizations: vi.fn(),
  fetchOrganizationById: vi.fn(),
  patchOrganization: vi.fn(),
}));
vi.mock('@/lib/services/payments/stripe', () => ({
  saveStripeConnectAccountId: vi.fn(),
}));

import { queryKeys } from '@/hooks/queries/queryKeys';
import {
  useOrganizationById,
  useOrganizations,
  usePatchOrganization,
  useSaveStripeConnectAccountId,
} from '@/hooks/queries/usePartyQueries';
import { saveStripeConnectAccountId } from '@/lib/services/payments/stripe';
import * as partyApi from '@/lib/services/queries/party';
import type { Organization } from '@/types/api';

import { createTestQueryClient, wrapperFor } from './testQueryClient';

const ORG_ID = 'urn:ngsi-ld:organization:org-1';
const organization = { id: ORG_ID } as Organization;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useOrganizations', () => {
  it('fetches organizations when enabled', async () => {
    vi.mocked(partyApi.fetchOrganizations).mockResolvedValue([organization]);
    const { result } = renderHook(() => useOrganizations({ enabled: true }), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(partyApi.fetchOrganizations).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([organization]);
  });

  it('stays disabled and never fetches when enabled is false', () => {
    const { result } = renderHook(() => useOrganizations({ enabled: false }), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    expect(partyApi.fetchOrganizations).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useOrganizationById', () => {
  it('fetches a single organization by id', async () => {
    vi.mocked(partyApi.fetchOrganizationById).mockResolvedValue(organization);
    const { result } = renderHook(() => useOrganizationById(ORG_ID), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(partyApi.fetchOrganizationById).toHaveBeenCalledWith(ORG_ID);
  });

  it('stays disabled and never calls fetchOrganizationById when id is falsy', () => {
    const { result } = renderHook(() => useOrganizationById(''), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    expect(partyApi.fetchOrganizationById).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('usePatchOrganization', () => {
  it('calls patchOrganization with (id, data) and invalidates organizations.all()', async () => {
    vi.mocked(partyApi.patchOrganization).mockResolvedValue(organization);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePatchOrganization(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ id: ORG_ID, data: { tradingName: 'Acme' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(partyApi.patchOrganization).toHaveBeenCalledWith(ORG_ID, { tradingName: 'Acme' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.organizations.all() });
  });
});

describe('useSaveStripeConnectAccountId', () => {
  it('invalidates organizations.all() when the account was saved (ok:true)', async () => {
    vi.mocked(saveStripeConnectAccountId).mockResolvedValue({ ok: true });
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSaveStripeConnectAccountId(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ stripeAccountId: 'acct_123' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(saveStripeConnectAccountId).toHaveBeenCalledWith('acct_123');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.organizations.all() });
  });

  it('does NOT invalidate organizations.all() when the account was rejected (ok:false)', async () => {
    vi.mocked(saveStripeConnectAccountId).mockResolvedValue({
      ok: false,
      message: 'account not ready',
    });
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useSaveStripeConnectAccountId(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ stripeAccountId: 'acct_bad' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ ok: false, message: 'account not ready' });
    expect(invalidateSpy).not.toHaveBeenCalled();
  });
});
