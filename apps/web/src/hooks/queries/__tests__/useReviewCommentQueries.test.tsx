import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/services/queries/reviewComments', () => ({
  createOfferingComment: vi.fn(),
  fetchOfferingComments: vi.fn(),
}));

import { queryKeys } from '@/hooks/queries/queryKeys';
import {
  useCreateOfferingComment,
  useOfferingComments,
} from '@/hooks/queries/useReviewCommentQueries';
import {
  createOfferingComment,
  fetchOfferingComments,
  type ReviewComment,
  type ReviewCommentsResult,
} from '@/lib/services/queries/reviewComments';

import { createTestQueryClient, wrapperFor } from './testQueryClient';

const OFF_ID = 'urn:ngsi-ld:productOffering:off-1';
const commentsResult: ReviewCommentsResult = { comments: [], average: 0, count: 0 };
const comment = { id: 'c1', offeringId: OFF_ID } as ReviewComment;

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useOfferingComments', () => {
  it('fetches comments for the given offering', async () => {
    vi.mocked(fetchOfferingComments).mockResolvedValue(commentsResult);
    const { result } = renderHook(() => useOfferingComments(OFF_ID), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchOfferingComments).toHaveBeenCalledWith(OFF_ID);
    expect(result.current.data).toEqual(commentsResult);
  });

  it('stays disabled and never fetches when offeringId is falsy', () => {
    const { result } = renderHook(() => useOfferingComments(''), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    expect(fetchOfferingComments).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('surfaces isError without throwing when it rejects', async () => {
    vi.mocked(fetchOfferingComments).mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useOfferingComments(OFF_ID), {
      wrapper: wrapperFor(createTestQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('useCreateOfferingComment', () => {
  it('calls createOfferingComment(offeringId, payload) and invalidates only reviewComments.list({offeringId})', async () => {
    vi.mocked(createOfferingComment).mockResolvedValue(comment);
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    const { result } = renderHook(() => useCreateOfferingComment(OFF_ID), {
      wrapper: wrapperFor(queryClient),
    });

    result.current.mutate({ rating: 5, body: 'Great!' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(createOfferingComment).toHaveBeenCalledWith(OFF_ID, { rating: 5, body: 'Great!' });
    expect(invalidateSpy).toHaveBeenCalledTimes(1);
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.reviewComments.list({ offeringId: OFF_ID }),
    });
    // Must NOT invalidate the broad .all() key — that would refetch unrelated offerings' comments.
    expect(invalidateSpy).not.toHaveBeenCalledWith({ queryKey: queryKeys.reviewComments.all() });
  });
});
