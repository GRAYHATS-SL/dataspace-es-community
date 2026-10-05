import { describe, expect, it } from 'vitest';

import { deleteCommentUseCase } from '@application/deleteComment.js';
import { err, ok } from '@domain/Result.js';

import { createInMemoryCommentRepository, makeComment } from './inMemoryCommentRepository.js';

describe('deleteCommentUseCase', () => {
  it('deletes an existing comment', async () => {
    const comment = makeComment();
    const repository = createInMemoryCommentRepository([comment]);
    const deleteComment = deleteCommentUseCase(repository);

    const result = await deleteComment(comment.offeringId, comment.id);

    expect(result).toEqual(ok(undefined));
    expect(await repository.listByOffering(comment.offeringId)).toEqual([]);
  });

  it('returns not_found when the comment does not exist', async () => {
    const deleteComment = deleteCommentUseCase(createInMemoryCommentRepository());

    const result = await deleteComment('offering-1', 'missing');

    expect(result).toEqual(err('not_found'));
  });
});
