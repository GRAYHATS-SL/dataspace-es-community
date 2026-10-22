import type { Comment, Rating } from './Comment.js';
import type { Result } from './Result.js';

/** Data needed to persist a new comment. */
export interface NewCommentInput {
  offeringId: string;
  individualId: string;
  organizationId: string;
  rating: Rating;
  body: string | null;
}

/** An offering's comments with their average rating and count. */
export interface CommentsWithAverage {
  comments: Comment[];
  average: number;
  count: number;
}

/** Domain port for comment persistence. */
export interface CommentRepository {
  /**
   * Persists a new comment.
   *
   * @param input - Comment data.
   * @returns `ok` with the created comment, or `err('duplicate')`.
   */
  create(input: NewCommentInput): Promise<Result<Comment, 'duplicate'>>;

  /**
   * Lists an offering's comments with their average rating and count.
   *
   * @param offeringId - `ProductOffering` ID.
   * @returns Comments, average and count.
   */
  listWithAverage(offeringId: string): Promise<CommentsWithAverage>;
}
