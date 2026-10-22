// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { deriveReviewsAuthorId } from '@/lib/utils/reviewsAuthorId';

const SECRET = 'a-very-long-shared-secret-used-only-in-tests';

describe('deriveReviewsAuthorId', () => {
  const originalSecret = process.env.TOKEN_SECRET;

  beforeEach(() => {
    process.env.TOKEN_SECRET = SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.TOKEN_SECRET;
    else process.env.TOKEN_SECRET = originalSecret;
  });

  it('devuelve un HMAC-SHA256 hexadecimal que no contiene el email', () => {
    const id = deriveReviewsAuthorId('ana@empresa.com');
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(id).not.toContain('ana');
  });

  it('es estable y no distingue mayúsculas ni espacios', () => {
    expect(deriveReviewsAuthorId('  Ana@Empresa.COM ')).toBe(deriveReviewsAuthorId('ana@empresa.com'));
  });

  it('depende del secreto', () => {
    const a = deriveReviewsAuthorId('ana@empresa.com');
    process.env.TOKEN_SECRET = 'otro-secreto-distinto-de-al-menos-32-caracteres';
    expect(deriveReviewsAuthorId('ana@empresa.com')).not.toBe(a);
  });

  it('lanza si falta TOKEN_SECRET o el email está vacío', () => {
    expect(() => deriveReviewsAuthorId('   ')).toThrow('Email vacío');
    delete process.env.TOKEN_SECRET;
    expect(() => deriveReviewsAuthorId('ana@empresa.com')).toThrow('TOKEN_SECRET');
  });
});
