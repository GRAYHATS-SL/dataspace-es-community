import { describe, expect, it, vi } from 'vitest';

import { listCommentsByOfferingUseCase } from '@application/listCommentsByOffering.js';
import type { Comment } from '@domain/Comment.js';
import type { CommentRepository } from '@domain/CommentRepository.js';

const comment: Comment = {
  id: 'comment-1',
  offeringId: 'urn:ngsi-ld:product-offering:1',
  individualId: 'urn:ngsi-ld:individual:1',
  organizationId: 'urn:ngsi-ld:organization:1',
  rating: 4,
  body: 'Buena experiencia',
  createdAt: '2026-01-01T00:00:00.000Z',
};

describe('listCommentsByOfferingUseCase', () => {
  it('devuelve los comentarios y la media calculados por el repositorio', async () => {
    const repository: CommentRepository = {
      create: vi.fn(),
      listWithAverage: vi.fn(async () => ({ comments: [comment], average: 4, count: 1 })),
    };
    const listCommentsByOffering = listCommentsByOfferingUseCase(repository);

    const result = await listCommentsByOffering(comment.offeringId);

    expect(result).toEqual({ comments: [comment], average: 4, count: 1 });
    expect(repository.listWithAverage).toHaveBeenCalledWith(comment.offeringId);
  });

  it('devuelve una lista vacía y media 0 para una oferta sin comentarios', async () => {
    const repository: CommentRepository = {
      create: vi.fn(),
      listWithAverage: vi.fn(async () => ({ comments: [], average: 0, count: 0 })),
    };
    const listCommentsByOffering = listCommentsByOfferingUseCase(repository);

    const result = await listCommentsByOffering('urn:ngsi-ld:product-offering:without-comments');

    expect(result).toEqual({ comments: [], average: 0, count: 0 });
  });
});
