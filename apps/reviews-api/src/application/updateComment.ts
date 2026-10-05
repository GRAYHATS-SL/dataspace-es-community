import { isValidBody, isValidRating } from '@domain/Comment.js';
import type { Comment } from '@domain/Comment.js';
import type { CommentPatch, CommentRepository } from '@domain/CommentRepository.js';
import { err } from '@domain/Result.js';
import type { Result } from '@domain/Result.js';

/** Input data to update a comment. Omitted (`undefined`) fields are left untouched. */
export interface UpdateCommentInput {
  offeringId: string;
  commentId: string;
  rating?: number;
  body?: string | null;
}

/**
 * Errors of the `updateComment` use case:
 * - `invalid_rating`: `rating` is present but not an integer between 1 and 5.
 * - `body_too_long`: `body` exceeds {@link import("@domain/Comment.js").BODY_MAX_LENGTH} characters.
 * - `not_found`: the comment does not exist in that offering.
 */
export type UpdateCommentError = 'invalid_rating' | 'body_too_long' | 'not_found';

/**
 * Use case: partially update a comment of an offering.
 *
 * @param repository - Comment persistence port.
 * @returns `updateComment` function, ready to be invoked with the request input.
 */
export const updateCommentUseCase =
  (repository: CommentRepository) =>
  async (input: UpdateCommentInput): Promise<Result<Comment, UpdateCommentError>> => {
    const patch: CommentPatch = {};

    if (input.rating !== undefined) {
      if (!isValidRating(input.rating)) return err('invalid_rating');
      patch.rating = input.rating;
    }
    if (input.body !== undefined) {
      if (!isValidBody(input.body)) return err('body_too_long');
      patch.body = input.body;
    }

    // Here you define your business logic.

    return repository.update(input.offeringId, input.commentId, patch);
  };
