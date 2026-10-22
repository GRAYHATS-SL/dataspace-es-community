import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/queries/agreement', () => ({
  createAgreement: vi.fn(),
  fetchAgreementById: vi.fn(),
  fetchAgreementsAsBuyer: vi.fn(),
  fetchAgreementsAsSeller: vi.fn(),
  updateAgreementStatus: vi.fn(),
}));

import { queryKeys } from '@/hooks/queries/queryKeys';
import {
  useAgreement,
  useAgreementsAsBuyer,
  useAgreementsAsSeller,
  useCreateAgreement,
  useUpdateAgreementStatus,
} from '@/hooks/queries/useAgreementQueries';
import {
  createAgreement,
  fetchAgreementById,
  fetchAgreementsAsBuyer,
  fetchAgreementsAsSeller,
  updateAgreementStatus,
} from '@/lib/services/queries/agreement';
import type { Agreement, NewAgreement } from '@/types/api';

import { createTestQueryClient, wrapperFor } from './testQueryClient';

const AGR_ID = 'urn:ngsi-ld:agreement:agr-1';
const agreement = { id: AGR_ID } as Agreement;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAgreementsAsBuyer', () => {
  it('fetches agreements via fetchAgreementsAsBuyer', async () => {
    vi.mocked(fetchAgreementsAsBuyer).mockResolvedValue([agreement]);
    const queryClient = createTestQueryClient();
    const { result } = renderHook(() => useAgreementsAsBuyer(), {
      wrapper: wrapperFor(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchAgreementsAsBuyer).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([agreement]);
    expect(queryClient.getQueryData(queryKeys.agreements.list({ role: 'buyer' }))).toEqual([
      agreement,
    ]);
  });

  it('surfaces isError without throwing when it rejects', async () => {
    vi.mocked(fetchAgreementsAsBuyer).mockRejectedValue(new Error('network down'));
    const { result } = renderHook(() => useAgreementsAsBuyer(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('network down');
  });
});

describe('useAgreementsAsSeller', () => {
  it('fetches agreements via fetchAgreementsAsSeller', async () => {
    vi.mocked(fetchAgreementsAsSeller).mockResolvedValue([agreement]);
    const { result } = renderHook(() => useAgreementsAsSeller(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchAgreementsAsSeller).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([agreement]);
  });
});

describe('useAgreement', () => {
  it('fetches a single agreement by id', async () => {
    vi.mocked(fetchAgreementById).mockResolvedValue(agreement);
    const { result } = renderHook(() => useAgreement(AGR_ID), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchAgreementById).toHaveBeenCalledWith(AGR_ID);
    expect(result.current.data).toEqual(agreement);
  });

  it('stays disabled and never calls fetchAgreementById when id is falsy', () => {
    const { result } = renderHook(() => useAgreement(''), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    expect(fetchAgreementById).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateAgreement', () => {
  it('calls createAgreement and invalidates agreements.all() on success', async () => {
    vi.mocked(createAgreement).mockResolvedValue(agreement);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateAgreement(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ name: 'New agreement' } as NewAgreement);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.agreements.all() });
  });
});

describe('useUpdateAgreementStatus', () => {
  it('calls updateAgreementStatus with (id, status) and invalidates agreements.all()', async () => {
    vi.mocked(updateAgreementStatus).mockResolvedValue(agreement);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useUpdateAgreementStatus(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ id: AGR_ID, status: 'terminated' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(updateAgreementStatus).toHaveBeenCalledWith(AGR_ID, 'terminated');
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.agreements.all() });
  });
});
