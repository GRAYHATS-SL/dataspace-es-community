import crypto from 'node:crypto';

import type { Comment } from '@domain/Comment.js';
import type { CommentPatch, CommentRepository, NewCommentInput } from '@domain/CommentRepository.js';
import { err, ok } from '@domain/Result.js';
import type { Result } from '@domain/Result.js';

/** In-memory {@link CommentRepository} for use case tests — no Postgres involved. */
export const createInMemoryCommentRepository = (seed: Comment[] = []): CommentRepository => {
  const store = new Map<string, Comment>(seed.map((comment) => [comment.id, comment]));

  const find = (offeringId: string, commentId: string): Comment | undefined => {
    const comment = store.get(commentId);
    return comment?.offeringId === offeringId ? comment : undefined;
  };

  return {
    create: async (input: NewCommentInput): Promise<Comment> => {
      const now = new Date().toISOString();
      const comment: Comment = { id: crypto.randomUUID(), ...input, createdAt: now, updatedAt: now };
      store.set(comment.id, comment);
      return comment;
    },

    listByOffering: async (offeringId: string): Promise<Comment[]> =>
      [...store.values()].filter((comment) => comment.offeringId === offeringId),

    findById: async (offeringId: string, commentId: string): Promise<Result<Comment, 'not_found'>> => {
      const comment = find(offeringId, commentId);
      return comment ? ok(comment) : err('not_found');
    },

    update: async (
      offeringId: string,
      commentId: string,
      patch: CommentPatch,
    ): Promise<Result<Comment, 'not_found'>> => {
      const comment = find(offeringId, commentId);
      if (!comment) return err('not_found');
      const updated: Comment = { ...comment, ...patch, updatedAt: new Date().toISOString() };
      store.set(commentId, updated);
      return ok(updated);
    },

    delete: async (offeringId: string, commentId: string): Promise<Result<void, 'not_found'>> => {
      if (!find(offeringId, commentId)) return err('not_found');
      store.delete(commentId);
      return ok(undefined);
    },
  };
};

/** Builds a sample comment, overridable per test. */
export const makeComment = (overrides?: Partial<Comment>): Comment => ({
  id: '00000000-0000-4000-8000-000000000001',
  offeringId: 'offering-1',
  rating: 4,
  body: 'Great experience',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});
