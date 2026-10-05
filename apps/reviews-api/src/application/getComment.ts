import type { Comment } from '@domain/Comment.js';
import type { CommentRepository } from '@domain/CommentRepository.js';
import type { Result } from '@domain/Result.js';

/** Errors of the `getComment` use case: `not_found` if the comment does not exist in that offering. */
export type GetCommentError = 'not_found';

/**
 * Use case: get a single comment of an offering. Public read.
 *
 * @param repository - Comment persistence port.
 * @returns `getComment` function, ready to be invoked with the route ids.
 */
export const getCommentUseCase =
  (repository: CommentRepository) =>
  (offeringId: string, commentId: string): Promise<Result<Comment, GetCommentError>> =>
    repository.findById(offeringId, commentId);
