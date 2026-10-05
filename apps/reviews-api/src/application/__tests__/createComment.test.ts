import { describe, expect, it, vi } from 'vitest';

import { createCommentUseCase } from '@application/createComment.js';
import { err } from '@domain/Result.js';

import { createInMemoryCommentRepository } from './inMemoryCommentRepository.js';

const validInput = {
  offeringId: 'offering-1',
  rating: 5,
  body: 'Excellent product',
};

describe('createCommentUseCase', () => {
  it.each([0, 6, 1.5, -1, Number.NaN])('rejects an out-of-range rating (%s) without calling the repository', async (rating) => {
    const repository = createInMemoryCommentRepository();
    const create = vi.spyOn(repository, 'create');
    const createComment = createCommentUseCase(repository);

    const result = await createComment({ ...validInput, rating });

    expect(result).toEqual(err('invalid_rating'));
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a body longer than 1000 characters without calling the repository', async () => {
    const repository = createInMemoryCommentRepository();
    const create = vi.spyOn(repository, 'create');
    const createComment = createCommentUseCase(repository);

    const result = await createComment({ ...validInput, body: 'a'.repeat(1001) });

    expect(result).toEqual(err('body_too_long'));
    expect(create).not.toHaveBeenCalled();
  });

  it('accepts a null body (optional)', async () => {
    const createComment = createCommentUseCase(createInMemoryCommentRepository());

    const result = await createComment({ ...validInput, body: null });

    expect(result.ok).toBe(true);
  });

  it('creates and persists the comment when rating and body are valid', async () => {
    const repository = createInMemoryCommentRepository();
    const createComment = createCommentUseCase(repository);

    const result = await createComment(validInput);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toMatchObject(validInput);
    expect(result.value.id).toEqual(expect.any(String));
    expect(await repository.listByOffering(validInput.offeringId)).toEqual([result.value]);
  });
});
