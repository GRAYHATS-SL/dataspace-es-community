import crypto from 'node:crypto';

import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Comment } from '@domain/Comment.js';
import { err, ok } from '@domain/Result.js';
import { createApp } from '@infrastructure/http/app.js';
import type { CommentsControllerDeps } from '@infrastructure/http/commentsController.js';

const SECRET = 'a-very-long-shared-secret-used-only-in-tests';
const OFFERING_ID = 'offering-1';
const COMMENT_ID = '00000000-0000-4000-8000-000000000001';
const COLLECTION = `/offerings/${OFFERING_ID}/comments`;
const ITEM = `${COLLECTION}/${COMMENT_ID}`;

const signToken = (payload: Record<string, unknown>, secret = SECRET): string => {
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payloadB64).digest('hex');
  return `${payloadB64}.${signature}`;
};

const validToken = (overrides?: Record<string, unknown>): string =>
  signToken({ sub: 'user-1', iat: Date.now(), ...overrides });

const sampleComment: Comment = {
  id: COMMENT_ID,
  offeringId: OFFERING_ID,
  rating: 5,
  body: 'Excellent',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const makeDeps = (overrides?: Partial<CommentsControllerDeps>): CommentsControllerDeps => ({
  createComment: vi.fn(async () => ok(sampleComment)),
  listCommentsByOffering: vi.fn(async () => [sampleComment]),
  getComment: vi.fn(async () => ok(sampleComment)),
  updateComment: vi.fn(async () => ok(sampleComment)),
  deleteComment: vi.fn(async () => ok(undefined)),
  ...overrides,
});

describe('HTTP contract: /offerings/:offeringId/comments', () => {
  beforeEach(() => {
    process.env.TOKEN_SECRET = SECRET;
  });

  afterEach(() => {
    delete process.env.TOKEN_SECRET;
  });

  describe('GET collection', () => {
    it('returns 200 with the comments without requiring authentication', async () => {
      const deps = makeDeps();

      const res = await request(createApp(deps)).get(COLLECTION);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([sampleComment]);
      expect(deps.listCommentsByOffering).toHaveBeenCalledWith(OFFERING_ID);
    });
  });

  describe('POST collection', () => {
    it('returns 403 when the Authorization header is missing', async () => {
      const deps = makeDeps();

      const res = await request(createApp(deps)).post(COLLECTION).send({ rating: 5 });

      expect(res.status).toBe(403);
      expect(deps.createComment).not.toHaveBeenCalled();
    });

    it('returns 403 when the scheme is not Bearer', async () => {
      const res = await request(createApp(makeDeps()))
        .post(COLLECTION)
        .set('Authorization', `Basic ${validToken()}`)
        .send({ rating: 5 });

      expect(res.status).toBe(403);
    });

    it('returns 403 when the token is expired', async () => {
      const deps = makeDeps();

      const res = await request(createApp(deps))
        .post(COLLECTION)
        .set('Authorization', `Bearer ${validToken({ iat: Date.now() - 61_000 })}`)
        .send({ rating: 5 });

      expect(res.status).toBe(403);
      expect(deps.createComment).not.toHaveBeenCalled();
    });

    it('returns 403 when the signature is tampered', async () => {
      const res = await request(createApp(makeDeps()))
        .post(COLLECTION)
        .set('Authorization', `Bearer ${validToken()}x`)
        .send({ rating: 5 });

      expect(res.status).toBe(403);
    });

    it('returns 201 with the created comment when token and payload are valid', async () => {
      const deps = makeDeps();

      const res = await request(createApp(deps))
        .post(COLLECTION)
        .set('Authorization', `Bearer ${validToken()}`)
        .send({ rating: 5, body: 'Excellent' });

      expect(res.status).toBe(201);
      expect(res.body).toEqual(sampleComment);
      expect(deps.createComment).toHaveBeenCalledWith({ offeringId: OFFERING_ID, rating: 5, body: 'Excellent' });
    });

    it('maps a non-numeric rating to NaN so the use case rejects it', async () => {
      const deps = makeDeps({ createComment: vi.fn(async () => err('invalid_rating' as const)) });

      const res = await request(createApp(deps))
        .post(COLLECTION)
        .set('Authorization', `Bearer ${validToken()}`)
        .send({ rating: 'five' });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe(400);
      expect(deps.createComment).toHaveBeenCalledWith({ offeringId: OFFERING_ID, rating: Number.NaN, body: null });
    });

    it('returns 400 when the use case rejects the body length', async () => {
      const deps = makeDeps({ createComment: vi.fn(async () => err('body_too_long' as const)) });

      const res = await request(createApp(deps))
        .post(COLLECTION)
        .set('Authorization', `Bearer ${validToken()}`)
        .send({ rating: 5, body: 'a'.repeat(1001) });

      expect(res.status).toBe(400);
    });
  });

  describe('GET item', () => {
    it('returns 200 with the comment without requiring authentication', async () => {
      const deps = makeDeps();

      const res = await request(createApp(deps)).get(ITEM);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(sampleComment);
      expect(deps.getComment).toHaveBeenCalledWith(OFFERING_ID, COMMENT_ID);
    });

    it('returns 404 when the comment does not exist', async () => {
      const deps = makeDeps({ getComment: vi.fn(async () => err('not_found' as const)) });

      const res = await request(createApp(deps)).get(ITEM);

      expect(res.status).toBe(404);
      expect(res.body).toEqual({ error: 'Comment not found', status: 404 });
    });
  });

  describe('PATCH item', () => {
    it('returns 403 without a valid token', async () => {
      const deps = makeDeps();

      const res = await request(createApp(deps)).patch(ITEM).send({ rating: 3 });

      expect(res.status).toBe(403);
      expect(deps.updateComment).not.toHaveBeenCalled();
    });

    it('returns 200 and forwards only the provided fields', async () => {
      const deps = makeDeps();

      const res = await request(createApp(deps))
        .patch(ITEM)
        .set('Authorization', `Bearer ${validToken()}`)
        .send({ rating: 3 });

      expect(res.status).toBe(200);
      expect(res.body).toEqual(sampleComment);
      expect(deps.updateComment).toHaveBeenCalledWith({ offeringId: OFFERING_ID, commentId: COMMENT_ID, rating: 3 });
    });

    it('forwards a null body to clear it', async () => {
      const deps = makeDeps();

      await request(createApp(deps))
        .patch(ITEM)
        .set('Authorization', `Bearer ${validToken()}`)
        .send({ body: null });

      expect(deps.updateComment).toHaveBeenCalledWith({ offeringId: OFFERING_ID, commentId: COMMENT_ID, body: null });
    });

    it('returns 400 on an invalid payload', async () => {
      const deps = makeDeps({ updateComment: vi.fn(async () => err('invalid_rating' as const)) });

      const res = await request(createApp(deps))
        .patch(ITEM)
        .set('Authorization', `Bearer ${validToken()}`)
        .send({ rating: 0 });

      expect(res.status).toBe(400);
    });

    it('returns 404 when the comment does not exist', async () => {
      const deps = makeDeps({ updateComment: vi.fn(async () => err('not_found' as const)) });

      const res = await request(createApp(deps))
        .patch(ITEM)
        .set('Authorization', `Bearer ${validToken()}`)
        .send({ rating: 3 });

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE item', () => {
    it('returns 403 without a valid token', async () => {
      const deps = makeDeps();

      const res = await request(createApp(deps)).delete(ITEM);

      expect(res.status).toBe(403);
      expect(deps.deleteComment).not.toHaveBeenCalled();
    });

    it('returns 204 when the comment is deleted', async () => {
      const deps = makeDeps();

      const res = await request(createApp(deps)).delete(ITEM).set('Authorization', `Bearer ${validToken()}`);

      expect(res.status).toBe(204);
      expect(deps.deleteComment).toHaveBeenCalledWith(OFFERING_ID, COMMENT_ID);
    });

    it('returns 404 when the comment does not exist', async () => {
      const deps = makeDeps({ deleteComment: vi.fn(async () => err('not_found' as const)) });

      const res = await request(createApp(deps)).delete(ITEM).set('Authorization', `Bearer ${validToken()}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Docs', () => {
    it('serves the OpenAPI spec at /openapi.json', async () => {
      const res = await request(createApp(makeDeps())).get('/openapi.json');

      expect(res.status).toBe(200);
      expect(res.body.openapi).toBe('3.0.3');
    });
  });
});
