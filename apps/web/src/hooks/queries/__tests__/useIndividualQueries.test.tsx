import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/queries/individual', () => ({
  fetchIndividuals: vi.fn(),
  fetchIndividualById: vi.fn(),
  createIndividual: vi.fn(),
  patchIndividual: vi.fn(),
}));

import { queryKeys } from '@/hooks/queries/queryKeys';
import {
  useCreateIndividual,
  useIndividual,
  useIndividuals,
  usePatchIndividual,
} from '@/hooks/queries/useIndividualQueries';
import * as individualApi from '@/lib/services/queries/individual';
import type { Individual, NewIndividual } from '@/types/api';

import { createTestQueryClient, wrapperFor } from './testQueryClient';

const IND_ID = 'urn:ngsi-ld:individual:ind-1';
const individual = { id: IND_ID } as Individual;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useIndividuals', () => {
  it('fetches the list via fetchIndividuals', async () => {
    vi.mocked(individualApi.fetchIndividuals).mockResolvedValue([individual]);
    const { result } = renderHook(() => useIndividuals(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(individualApi.fetchIndividuals).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual([individual]);
  });

  it('surfaces isError without throwing when it rejects', async () => {
    vi.mocked(individualApi.fetchIndividuals).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useIndividuals(), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useIndividual', () => {
  it('fetches a single individual by id', async () => {
    vi.mocked(individualApi.fetchIndividualById).mockResolvedValue(individual);
    const { result } = renderHook(() => useIndividual(IND_ID), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(individualApi.fetchIndividualById).toHaveBeenCalledWith(IND_ID);
  });

  it('stays disabled and never calls fetchIndividualById when id is falsy', () => {
    const { result } = renderHook(() => useIndividual(''), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    expect(individualApi.fetchIndividualById).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateIndividual', () => {
  it('calls createIndividual and invalidates individuals.all()', async () => {
    vi.mocked(individualApi.createIndividual).mockResolvedValue(individual);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateIndividual(), {
      wrapper: wrapperFor(queryClient),
    });

    const payload = { givenName: 'Ada' } as NewIndividual;
    result.current.mutate(payload);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(individualApi.createIndividual).toHaveBeenCalledWith(payload);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.individuals.all() });
  });
});

describe('usePatchIndividual', () => {
  it('calls patchIndividual with (id, data) and invalidates individuals.all()', async () => {
    vi.mocked(individualApi.patchIndividual).mockResolvedValue(individual);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => usePatchIndividual(), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ id: IND_ID, data: { givenName: 'Grace' } });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(individualApi.patchIndividual).toHaveBeenCalledWith(IND_ID, { givenName: 'Grace' });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.individuals.all() });
  });
});
