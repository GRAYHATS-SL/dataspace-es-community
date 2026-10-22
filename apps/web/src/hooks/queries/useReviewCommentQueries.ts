import { useMutation, useQuery } from '@tanstack/react-query';

import { STALE_TIME } from '@/lib/constants/queryConfig';
import {
  createOfferingComment,
  fetchOfferingComments,
  type NewReviewComment,
  type ReviewComment,
  type ReviewCommentsResult,
} from '@/lib/services/queries/reviewComments';

import { queryKeys } from './queryKeys';
import { useInvalidate } from './useInvalidate';

/**
 * React Query hook — public comments and average rating of an offering.
 *
 * @param offeringId - `ProductOffering` id. Disabled when empty.
 */
export const useOfferingComments = (offeringId: string) =>
  useQuery<ReviewCommentsResult, Error>({
    queryKey: queryKeys.reviewComments.list({ offeringId }),
    queryFn: () => fetchOfferingComments(offeringId),
    enabled: !!offeringId,
    staleTime: STALE_TIME.TRANSACTIONAL,
  });

/**
 * Mutation hook — posts a comment on an offering.
 *
 * @param offeringId - `ProductOffering` id.
 */
export const useCreateOfferingComment = (offeringId: string) => {
  const invalidate = useInvalidate();
  return useMutation<ReviewComment, Error, NewReviewComment>({
    mutationFn: (payload) => createOfferingComment(offeringId, payload),
    onSuccess: () => invalidate(queryKeys.reviewComments.list({ offeringId })),
  });
};
