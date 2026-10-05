import type { Comment } from '@domain/Comment.js';
import type { CommentRepository } from '@domain/CommentRepository.js';

/**
 * Use case: list the comments of an offering. Public read.
 *
 * @param repository - Comment persistence port.
 * @returns `listCommentsByOffering` function, ready to be invoked with the request `offeringId`.
 */
export const listCommentsByOfferingUseCase =
  (repository: CommentRepository) =>
  (offeringId: string): Promise<Comment[]> =>
    // Here you define your business logic (e.g. filtering, ordering, pagination).
    repository.listByOffering(offeringId);
