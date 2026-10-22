import { isValidBody, isValidRating } from '@domain/Comment.js';
import type { Comment, Rating } from '@domain/Comment.js';
import type { CommentRepository } from '@domain/CommentRepository.js';
import { err, ok } from '@domain/Result.js';
import type { Result } from '@domain/Result.js';

/** Input data to publish a comment. */
export interface CreateCommentInput {
  offeringId: string;
  individualId: string;
  organizationId: string;
  rating: number;
  body: string | null;
}

/** Business errors of the `createComment` use case. */
export type CreateCommentError = 'invalid_rating' | 'body_too_long' | 'duplicate';

/**
 * Use case: publishes a comment on an offering.
 *
 * @param repository - Comment persistence port.
 * @returns The `createComment` function.
 */
export const createCommentUseCase =
  (repository: CommentRepository) =>
  async (input: CreateCommentInput): Promise<Result<Comment, CreateCommentError>> => {
    if (!isValidRating(input.rating)) return err('invalid_rating');
    if (!isValidBody(input.body)) return err('body_too_long');

    const rating: Rating = input.rating;
    const result = await repository.create({
      offeringId: input.offeringId,
      individualId: input.individualId,
      organizationId: input.organizationId,
      rating,
      body: input.body,
    });

    return result.ok ? ok(result.value) : err('duplicate');
  };
