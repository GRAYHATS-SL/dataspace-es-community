import {
  useMutation,
  type UseMutationResult,
  useQuery,
  type UseQueryResult,
} from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants/queryConfig';
import { createOfferingComment, fetchOfferingComments } from '@/lib/services/queries/reviewComments';
import type { NewReviewComment, ReviewComment } from '@/types/api';

import { queryKeys } from './queryKeys';
import { useInvalidate } from './useInvalidate';

/** Fetches the review comments of a product offering. Disabled when `offeringId` is empty. */
export const useOfferingComments = (offeringId: string): UseQueryResult<ReviewComment[], Error> =>
  useQuery<ReviewComment[], Error>({
    queryKey: queryKeys.reviewComments.list({ offeringId }),
    queryFn: () => fetchOfferingComments(offeringId),
    enabled: !!offeringId,
    staleTime: STALE_TIME.TRANSACTIONAL,
  });

/** Creates a review comment on a product offering. */
export const useCreateOfferingComment = (
  offeringId: string,
): UseMutationResult<ReviewComment, Error, NewReviewComment> => {
  const invalidate = useInvalidate();
  return useMutation<ReviewComment, Error, NewReviewComment>({
    mutationFn: (payload) => createOfferingComment(offeringId, payload),
    onSuccess: () => {
      // Here you define your cache/side-effect logic.
      invalidate(queryKeys.reviewComments.list({ offeringId }));
    },
  });
};
