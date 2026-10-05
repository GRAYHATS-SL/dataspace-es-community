import { describe, expect, it } from 'vitest';

import { listCommentsByOfferingUseCase } from '@application/listCommentsByOffering.js';

import { createInMemoryCommentRepository, makeComment } from './inMemoryCommentRepository.js';

describe('listCommentsByOfferingUseCase', () => {
  it('returns only the comments of the requested offering', async () => {
    const mine = makeComment();
    const other = makeComment({ id: '00000000-0000-4000-8000-000000000002', offeringId: 'offering-2' });
    const listCommentsByOffering = listCommentsByOfferingUseCase(createInMemoryCommentRepository([mine, other]));

    const result = await listCommentsByOffering('offering-1');

    expect(result).toEqual([mine]);
  });

  it('returns an empty list for an offering without comments', async () => {
    const listCommentsByOffering = listCommentsByOfferingUseCase(createInMemoryCommentRepository());

    const result = await listCommentsByOffering('offering-without-comments');

    expect(result).toEqual([]);
  });
});
