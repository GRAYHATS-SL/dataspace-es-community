import { describe, expect, it, vi } from 'vitest';

import { updateCommentUseCase } from '@application/updateComment.js';
import { err } from '@domain/Result.js';

import { createInMemoryCommentRepository, makeComment } from './inMemoryCommentRepository.js';

const comment = makeComment();
const target = { offeringId: comment.offeringId, commentId: comment.id };

describe('updateCommentUseCase', () => {
  it('rejects an invalid rating without calling the repository', async () => {
    const repository = createInMemoryCommentRepository([comment]);
    const update = vi.spyOn(repository, 'update');
    const updateComment = updateCommentUseCase(repository);

    const result = await updateComment({ ...target, rating: 9 });

    expect(result).toEqual(err('invalid_rating'));
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a body longer than 1000 characters', async () => {
    const updateComment = updateCommentUseCase(createInMemoryCommentRepository([comment]));

    const result = await updateComment({ ...target, body: 'a'.repeat(1001) });

    expect(result).toEqual(err('body_too_long'));
  });

  it('updates only the provided fields and refreshes updatedAt', async () => {
    const updateComment = updateCommentUseCase(createInMemoryCommentRepository([comment]));

    const result = await updateComment({ ...target, rating: 2 });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.rating).toBe(2);
    expect(result.value.body).toBe(comment.body);
    expect(result.value.updatedAt).not.toBe(comment.updatedAt);
  });

  it('allows clearing the body with null', async () => {
    const updateComment = updateCommentUseCase(createInMemoryCommentRepository([comment]));

    const result = await updateComment({ ...target, body: null });

    expect(result.ok && result.value.body).toBeNull();
  });

  it('returns not_found when the comment does not exist', async () => {
    const updateComment = updateCommentUseCase(createInMemoryCommentRepository());

    const result = await updateComment({ ...target, rating: 3 });

    expect(result).toEqual(err('not_found'));
  });
});
