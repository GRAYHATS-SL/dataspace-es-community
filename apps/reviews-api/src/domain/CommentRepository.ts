import type { Comment, Rating } from './Comment.js';
import type { Result } from './Result.js';

/** Data required to persist a new comment. */
export interface NewCommentInput {
  offeringId: string;
  rating: Rating;
  body: string | null;
}

/** Partial update of a comment. Omitted fields are left untouched. */
export interface CommentPatch {
  rating?: Rating;
  body?: string | null;
}

/**
 * Domain port for comment persistence. Concrete implementations live in the
 * infrastructure layer (e.g. {@link "@infrastructure/PgCommentRepository"}).
 */
export interface CommentRepository {
  /**
   * Persists a new comment.
   *
   * @param input - Data of the comment to create.
   * @returns The created comment, with its generated `id` and timestamps.
   */
  create(input: NewCommentInput): Promise<Comment>;

  /**
   * Lists the comments of an offering.
   *
   * @param offeringId - `ProductOffering` id.
   * @returns The comments of the offering (empty if there are none).
   */
  listByOffering(offeringId: string): Promise<Comment[]>;

  /**
   * Finds a comment of an offering by id.
   *
   * @param offeringId - `ProductOffering` id.
   * @param commentId - Comment id.
   * @returns `ok` with the comment, or `err('not_found')`.
   */
  findById(offeringId: string, commentId: string): Promise<Result<Comment, 'not_found'>>;

  /**
   * Applies a partial update to a comment of an offering.
   *
   * @param offeringId - `ProductOffering` id.
   * @param commentId - Comment id.
   * @param patch - Fields to update.
   * @returns `ok` with the updated comment, or `err('not_found')`.
   */
  update(offeringId: string, commentId: string, patch: CommentPatch): Promise<Result<Comment, 'not_found'>>;

  /**
   * Deletes a comment of an offering.
   *
   * @param offeringId - `ProductOffering` id.
   * @param commentId - Comment id.
   * @returns `ok` if it was deleted, or `err('not_found')`.
   */
  delete(offeringId: string, commentId: string): Promise<Result<void, 'not_found'>>;
}
