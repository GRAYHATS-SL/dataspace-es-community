import { describe, expect, it } from 'vitest';

import { getCommentUseCase } from '@application/getComment.js';
import { err, ok } from '@domain/Result.js';

import { createInMemoryCommentRepository, makeComment } from './inMemoryCommentRepository.js';

describe('getCommentUseCase', () => {
  it('returns the comment when it exists in the offering', async () => {
    const comment = makeComment();
    const getComment = getCommentUseCase(createInMemoryCommentRepository([comment]));

    const result = await getComment(comment.offeringId, comment.id);

    expect(result).toEqual(ok(comment));
  });

  it('returns not_found when the comment does not exist', async () => {
    const getComment = getCommentUseCase(createInMemoryCommentRepository());

    const result = await getComment('offering-1', 'missing');

    expect(result).toEqual(err('not_found'));
  });

  it('returns not_found when the comment belongs to another offering', async () => {
    const comment = makeComment();
    const getComment = getCommentUseCase(createInMemoryCommentRepository([comment]));

    const result = await getComment('offering-2', comment.id);

    expect(result).toEqual(err('not_found'));
  });
});
