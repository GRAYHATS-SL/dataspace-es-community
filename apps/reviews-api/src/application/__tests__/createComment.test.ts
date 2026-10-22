import { describe, expect, it, vi } from 'vitest';

import { createCommentUseCase } from '@application/createComment.js';
import type { Comment } from '@domain/Comment.js';
import type { CommentRepository, NewCommentInput } from '@domain/CommentRepository.js';
import { err, ok } from '@domain/Result.js';

const makeComment = (input: NewCommentInput): Comment => ({
  id: 'comment-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...input,
});

const makeRepository = (overrides?: Partial<CommentRepository>): CommentRepository => ({
  create: vi.fn(async (input: NewCommentInput) => ok(makeComment(input))),
  listWithAverage: vi.fn(async () => ({ comments: [], average: 0, count: 0 })),
  ...overrides,
});

const validInput = {
  offeringId: 'urn:ngsi-ld:product-offering:1',
  individualId: 'urn:ngsi-ld:individual:1',
  organizationId: 'urn:ngsi-ld:organization:1',
  rating: 5,
  body: 'Excelente producto',
};

describe('createCommentUseCase', () => {
  it.each([0, 6, 1.5, -1])('rechaza rating fuera de rango (%s) sin llamar al repositorio', async (rating) => {
    const repository = makeRepository();
    const createComment = createCommentUseCase(repository);

    const result = await createComment({ ...validInput, rating });

    expect(result).toEqual(err('invalid_rating'));
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rechaza body de más de 1000 caracteres sin llamar al repositorio', async () => {
    const repository = makeRepository();
    const createComment = createCommentUseCase(repository);

    const result = await createComment({ ...validInput, body: 'a'.repeat(1001) });

    expect(result).toEqual(err('body_too_long'));
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('acepta body nulo (opcional)', async () => {
    const repository = makeRepository();
    const createComment = createCommentUseCase(repository);

    const result = await createComment({ ...validInput, body: null });

    expect(result.ok).toBe(true);
  });

  it('propaga el error de duplicado devuelto por el repositorio', async () => {
    const repository = makeRepository({ create: vi.fn(async () => err('duplicate' as const)) });
    const createComment = createCommentUseCase(repository);

    const result = await createComment(validInput);

    expect(result).toEqual(err('duplicate'));
  });

  it('crea el comentario cuando rating y body son válidos', async () => {
    const repository = makeRepository();
    const createComment = createCommentUseCase(repository);

    const result = await createComment(validInput);

    expect(result).toEqual(ok(makeComment({ ...validInput, rating: 5 })));
    expect(repository.create).toHaveBeenCalledWith({ ...validInput, rating: 5 });
  });
});
