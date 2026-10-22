import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

import type { Comment, Rating } from '@domain/Comment.js';
import type { CommentRepository, CommentsWithAverage, NewCommentInput } from '@domain/CommentRepository.js';
import { err, ok } from '@domain/Result.js';
import type { Result } from '@domain/Result.js';

import { comments } from './db/schema.js';

/** Postgres error code for a `UNIQUE` constraint violation. */
const POSTGRES_UNIQUE_VIOLATION = '23505';

/**
 * Maps a `comments` row to the {@link Comment} domain entity.
 *
 * @param row - Row returned by Drizzle.
 * @returns The equivalent domain entity.
 */
const toDomain = (row: typeof comments.$inferSelect): Comment => ({
  id: row.id,
  offeringId: row.offeringId,
  individualId: row.individualId,
  organizationId: row.organizationId,
  rating: row.rating as Rating,
  body: row.body,
  createdAt: row.createdAt.toISOString(),
});

/**
 * Extracts the Postgres error code from an exception.
 *
 * @param error - Caught exception.
 * @returns The error code, or `undefined` if not found.
 */
const errorCode = (error: unknown): unknown => {
  if (typeof error !== 'object' || error === null) return undefined;
  if ('code' in error) return (error as { code?: unknown }).code;
  if ('cause' in error) return errorCode((error as { cause?: unknown }).cause);
  return undefined;
};

/**
 * Checks whether an exception is a `UNIQUE` constraint violation.
 *
 * @param error - Caught exception.
 * @returns `true` if the error code is `23505`.
 */
const isUniqueViolation = (error: unknown): boolean => errorCode(error) === POSTGRES_UNIQUE_VIOLATION;

/**
 * Postgres implementation of {@link CommentRepository}.
 *
 * @param db - Drizzle instance.
 * @returns A {@link CommentRepository}.
 */
export const createPgCommentRepository = <TSchema extends Record<string, unknown>>(
  db: NodePgDatabase<TSchema>,
): CommentRepository => ({
  create: async (input: NewCommentInput): Promise<Result<Comment, 'duplicate'>> => {
    try {
      const [row] = await db.insert(comments).values(input).returning();
      if (!row) throw new Error('INSERT no devolvió ninguna fila');
      return ok(toDomain(row));
    } catch (error) {
      if (isUniqueViolation(error)) return err('duplicate');
      throw error;
    }
  },

  listWithAverage: async (offeringId: string): Promise<CommentsWithAverage> => {
    const rows = await db.select().from(comments).where(eq(comments.offeringId, offeringId));
    const list = rows.map(toDomain);
    const average =
      list.length === 0 ? 0 : list.reduce((sum, comment) => sum + comment.rating, 0) / list.length;
    return { comments: list, average, count: list.length };
  },
});
