import type { CommentRepository, CommentsWithAverage } from '@domain/CommentRepository.js';

/**
 * Use case: lists an offering's comments with their average rating.
 *
 * @param repository - Comment persistence port.
 * @returns The `listCommentsByOffering` function.
 */
export const listCommentsByOfferingUseCase =
  (repository: CommentRepository) =>
  (offeringId: string): Promise<CommentsWithAverage> =>
    repository.listWithAverage(offeringId);
