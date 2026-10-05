import type { CommentRepository } from '@domain/CommentRepository.js';
import type { Result } from '@domain/Result.js';

/** Errors of the `deleteComment` use case: `not_found` if the comment does not exist in that offering. */
export type DeleteCommentError = 'not_found';

/**
 * Use case: delete a comment of an offering.
 *
 * @param repository - Comment persistence port.
 * @returns `deleteComment` function, ready to be invoked with the route ids.
 */
export const deleteCommentUseCase =
  (repository: CommentRepository) =>
  (offeringId: string, commentId: string): Promise<Result<void, DeleteCommentError>> =>
    // Here you define your business logic.
    repository.delete(offeringId, commentId);
