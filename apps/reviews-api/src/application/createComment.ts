import { isValidBody, isValidRating } from '@domain/Comment.js';
import type { Comment, Rating } from '@domain/Comment.js';
import type { CommentRepository } from '@domain/CommentRepository.js';
import { err, ok } from '@domain/Result.js';
import type { Result } from '@domain/Result.js';

/** Input data to create a comment. `rating` is validated before being treated as a {@link Rating}. */
export interface CreateCommentInput {
  offeringId: string;
  rating: number;
  body: string | null;
}

/**
 * Errors of the `createComment` use case:
 * - `invalid_rating`: `rating` is not an integer between 1 and 5.
 * - `body_too_long`: `body` exceeds {@link import("@domain/Comment.js").BODY_MAX_LENGTH} characters.
 */
export type CreateCommentError = 'invalid_rating' | 'body_too_long';

/**
 * Use case: create a comment on an offering.
 * Validates `rating` and `body` before delegating persistence to the injected {@link CommentRepository}.
 *
 * @param repository - Comment persistence port.
 * @returns `createComment` function, ready to be invoked with the request input.
 */
export const createCommentUseCase =
  (repository: CommentRepository) =>
  async (input: CreateCommentInput): Promise<Result<Comment, CreateCommentError>> => {
    if (!isValidRating(input.rating)) return err('invalid_rating');
    if (!isValidBody(input.body)) return err('body_too_long');

    // Here you define your business logic.

    const rating: Rating = input.rating;
    const comment = await repository.create({
      offeringId: input.offeringId,
      rating,
      body: input.body,
    });

    return ok(comment);
  };
