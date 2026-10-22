import crypto from 'node:crypto';

import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Comment } from '@domain/Comment.js';
import { err, ok } from '@domain/Result.js';
import { createApp } from '@infrastructure/http/app.js';
import type { CommentsControllerDeps } from '@infrastructure/http/commentsController.js';

const SECRET = 'a-very-long-shared-secret-used-only-in-tests';
const OFFERING_ID = 'urn:ngsi-ld:product-offering:1';

const signToken = (payload: Record<string, unknown>, secret = SECRET): string => {
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
  return `${payloadB64}.${signature}`;
};

const validToken = (overrides?: Record<string, unknown>): string =>
  signToken({
    offeringId: OFFERING_ID,
    organizationId: 'urn:ngsi-ld:organization:1',
    individualId: 'urn:ngsi-ld:individual:1',
    iat: Date.now(),
    ...overrides,
  });

const sampleComment: Comment = {
  id: 'comment-1',
  offeringId: OFFERING_ID,
  individualId: 'urn:ngsi-ld:individual:1',
  organizationId: 'urn:ngsi-ld:organization:1',
  rating: 5,
  body: 'Excelente',
  createdAt: '2026-01-01T00:00:00.000Z',
};

const makeDeps = (overrides?: Partial<CommentsControllerDeps>): CommentsControllerDeps => ({
  createComment: vi.fn(async () => ok(sampleComment)),
  listCommentsByOffering: vi.fn(async () => ({ comments: [sampleComment], average: 5, count: 1 })),
  ...overrides,
});

describe('Contrato HTTP: POST/GET /offerings/:offeringId/comments', () => {
  beforeEach(() => {
    process.env.TOKEN_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.TOKEN_SECRET;
  });

  describe('POST', () => {
    it('devuelve 403 si falta la cabecera Authorization', async () => {
      const deps = makeDeps();
      const app = createApp(deps);

      const res = await request(app)
        .post(`/offerings/${OFFERING_ID}/comments`)
        .send({ rating: 5 });

      expect(res.status).toBe(403);
      expect(deps.createComment).not.toHaveBeenCalled();
    });

    it('devuelve 403 si el esquema de autorización no es Bearer', async () => {
      const deps = makeDeps();
      const app = createApp(deps);

      const res = await request(app)
        .post(`/offerings/${OFFERING_ID}/comments`)
        .set('Authorization', `Basic ${validToken()}`)
        .send({ rating: 5 });

      expect(res.status).toBe(403);
    });

    it('devuelve 403 si el token está expirado', async () => {
      const deps = makeDeps();
      const app = createApp(deps);
      const expiredToken = validToken({ iat: Date.now() - 61_000 });

      const res = await request(app)
        .post(`/offerings/${OFFERING_ID}/comments`)
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ rating: 5 });

      expect(res.status).toBe(403);
      expect(deps.createComment).not.toHaveBeenCalled();
    });

    it('devuelve 403 si el offeringId del token no coincide con el de la ruta', async () => {
      const deps = makeDeps();
      const app = createApp(deps);
      const mismatchedToken = validToken({ offeringId: 'urn:ngsi-ld:product-offering:otro' });

      const res = await request(app)
        .post(`/offerings/${OFFERING_ID}/comments`)
        .set('Authorization', `Bearer ${mismatchedToken}`)
        .send({ rating: 5 });

      expect(res.status).toBe(403);
      expect(deps.createComment).not.toHaveBeenCalled();
    });

    it('devuelve 403 si la firma del token es inválida', async () => {
      const deps = makeDeps();
      const app = createApp(deps);
      const tamperedToken = `${validToken()}x`;

      const res = await request(app)
        .post(`/offerings/${OFFERING_ID}/comments`)
        .set('Authorization', `Bearer ${tamperedToken}`)
        .send({ rating: 5 });

      expect(res.status).toBe(403);
    });

    it('devuelve 201 con el comentario creado cuando el token y el body son válidos', async () => {
      const deps = makeDeps();
      const app = createApp(deps);

      const res = await request(app)
        .post(`/offerings/${OFFERING_ID}/comments`)
        .set('Authorization', `Bearer ${validToken()}`)
        .send({ rating: 5, body: 'Excelente' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(sampleComment);
      expect(deps.createComment).toHaveBeenCalledWith({
        offeringId: OFFERING_ID,
        organizationId: 'urn:ngsi-ld:organization:1',
        individualId: 'urn:ngsi-ld:individual:1',
        rating: 5,
        body: 'Excelente',
      });
    });

    it('devuelve 400 cuando el caso de uso rechaza el rating', async () => {
      const deps = makeDeps({ createComment: vi.fn(async () => err('invalid_rating' as const)) });
      const app = createApp(deps);

      const res = await request(app)
        .post(`/offerings/${OFFERING_ID}/comments`)
        .set('Authorization', `Bearer ${validToken()}`)
        .send({ rating: 9 });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe(400);
    });

    it('devuelve 400 cuando el caso de uso rechaza el body por longitud', async () => {
      const deps = makeDeps({ createComment: vi.fn(async () => err('body_too_long' as const)) });
      const app = createApp(deps);

      const res = await request(app)
        .post(`/offerings/${OFFERING_ID}/comments`)
        .set('Authorization', `Bearer ${validToken()}`)
        .send({ rating: 5, body: 'a'.repeat(1001) });

      expect(res.status).toBe(400);
    });

    it('devuelve 409 cuando el caso de uso detecta un comentario duplicado', async () => {
      const deps = makeDeps({ createComment: vi.fn(async () => err('duplicate' as const)) });
      const app = createApp(deps);

      const res = await request(app)
        .post(`/offerings/${OFFERING_ID}/comments`)
        .set('Authorization', `Bearer ${validToken()}`)
        .send({ rating: 5 });

      expect(res.status).toBe(409);
    });
  });

  describe('GET', () => {
    it('devuelve 200 con comentarios y media sin requerir autenticación', async () => {
      const deps = makeDeps();
      const app = createApp(deps);

      const res = await request(app).get(`/offerings/${OFFERING_ID}/comments`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ comments: [sampleComment], average: 5, count: 1 });
      expect(deps.listCommentsByOffering).toHaveBeenCalledWith(OFFERING_ID);
    });
  });
});
