import { and, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type { Comment, Rating } from '@domain/Comment.js';
import type { CommentPatch, CommentRepository, NewCommentInput } from '@domain/CommentRepository.js';
import { err, ok } from '@domain/Result.js';
import type { Result } from '@domain/Result.js';

import { comments } from './db/schema.js';

/** UUID format — ids that do not match cannot exist in the `uuid` column (and would make Postgres throw). */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Maps a row of the `comments` table to the {@link Comment} domain entity.
 *
 * @param row - Row returned by Drizzle (`comments.$inferSelect`).
 * @returns The equivalent domain entity (`rating` narrowed to {@link Rating}, timestamps in ISO 8601).
 */
const toDomain = (row: typeof comments.$inferSelect): Comment => ({
  id: row.id,
  offeringId: row.offeringId,
  rating: row.rating as Rating,
  body: row.body,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

/**
 * Builds the `WHERE` clause that scopes a comment to its offering.
 *
 * @param offeringId - `ProductOffering` id.
 * @param commentId - Comment id (must be a valid UUID).
 * @returns Drizzle SQL condition.
 */
const byOfferingAndId = (offeringId: string, commentId: string) =>
  and(eq(comments.offeringId, offeringId), eq(comments.id, commentId));

/**
 * {@link CommentRepository} implementation on top of Postgres (via `drizzle-orm` + `pg`).
 *
 * @param db - Drizzle instance connected to the `reviews-api` database.
 * @returns A {@link CommentRepository} ready to be injected into the use cases.
 */
export const createPgCommentRepository = <TSchema extends Record<string, unknown>>(
  db: NodePgDatabase<TSchema>,
): CommentRepository => ({
  create: async (input: NewCommentInput): Promise<Comment> => {
    const [row] = await db.insert(comments).values(input).returning();
    if (!row) throw new Error('INSERT returned no rows');
    return toDomain(row);
  },

  listByOffering: async (offeringId: string): Promise<Comment[]> => {
    const rows = await db.select().from(comments).where(eq(comments.offeringId, offeringId));
    return rows.map(toDomain);
  },

  findById: async (offeringId: string, commentId: string): Promise<Result<Comment, 'not_found'>> => {
    if (!UUID_PATTERN.test(commentId)) return err('not_found');
    const [row] = await db.select().from(comments).where(byOfferingAndId(offeringId, commentId));
    return row ? ok(toDomain(row)) : err('not_found');
  },

  update: async (
    offeringId: string,
    commentId: string,
    patch: CommentPatch,
  ): Promise<Result<Comment, 'not_found'>> => {
    if (!UUID_PATTERN.test(commentId)) return err('not_found');
    const [row] = await db
      .update(comments)
      .set({ ...patch, updatedAt: new Date() })
      .where(byOfferingAndId(offeringId, commentId))
      .returning();
    return row ? ok(toDomain(row)) : err('not_found');
  },

  delete: async (offeringId: string, commentId: string): Promise<Result<void, 'not_found'>> => {
    if (!UUID_PATTERN.test(commentId)) return err('not_found');
    const rows = await db
      .delete(comments)
      .where(byOfferingAndId(offeringId, commentId))
      .returning({ id: comments.id });
    return rows.length > 0 ? ok(undefined) : err('not_found');
  },
});
