import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ok } from '@domain/Result.js';
import { createApp } from '@infrastructure/http/app.js';
import type { CommentsControllerDeps } from '@infrastructure/http/commentsController.js';

const OFFERING_ID = 'urn:ngsi-ld:product-offering:1';

const makeDeps = (): CommentsControllerDeps => ({
  createComment: vi.fn(async () => ok({} as never)),
  listCommentsByOffering: vi.fn(async () => ({ comments: [], average: 0, count: 0 })),
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('API docs exposure', () => {
  it('does not serve /docs nor /openapi.json by default', async () => {
    const app = createApp(makeDeps());
    expect((await request(app).get('/openapi.json')).status).toBe(404);
    expect((await request(app).get('/docs/')).status).toBe(404);
  });

  it('serves them when ENABLE_API_DOCS=true', async () => {
    vi.stubEnv('ENABLE_API_DOCS', 'true');
    const app = createApp(makeDeps());
    expect((await request(app).get('/openapi.json')).status).toBe(200);
  });
});

describe('rate limiting', () => {
  it('returns 429 with Retry-After once the write limit is exceeded', async () => {
    const app = createApp(makeDeps());
    let last = await request(app).post(`/offerings/${OFFERING_ID}/comments`).send({});
    for (let i = 0; i < 20; i++) {
      last = await request(app).post(`/offerings/${OFFERING_ID}/comments`).send({});
    }
    expect(last.status).toBe(429);
    expect(Number(last.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('returns 429 once the read limit is exceeded', async () => {
    const app = createApp(makeDeps());
    let last = await request(app).get(`/offerings/${OFFERING_ID}/comments`);
    for (let i = 0; i < 120; i++) {
      last = await request(app).get(`/offerings/${OFFERING_ID}/comments`);
    }
    expect(last.status).toBe(429);
  });

  it('honours TRUST_PROXY to key the limiter on the forwarded client IP', async () => {
    vi.stubEnv('TRUST_PROXY', '1');
    const app = createApp(makeDeps());
    for (let i = 0; i < 21; i++) {
      await request(app)
        .post(`/offerings/${OFFERING_ID}/comments`)
        .set('X-Forwarded-For', '203.0.113.1')
        .send({});
    }
    const other = await request(app)
      .post(`/offerings/${OFFERING_ID}/comments`)
      .set('X-Forwarded-For', '203.0.113.2')
      .send({});
    expect(other.status).not.toBe(429);
  });
});

describe('audit log', () => {
  it('logs one JSON line per request without token, body or IP', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const app = createApp(makeDeps());
    const res = await request(app)
      .post(`/offerings/${OFFERING_ID}/comments`)
      .set('Authorization', 'Bearer secret-token-value')
      .send({ rating: 5, body: 'texto privado' });

    expect(res.headers['x-request-id']).toEqual(expect.any(String));
    const line = String(log.mock.calls.at(-1)?.[0]);
    const entry = JSON.parse(line) as Record<string, unknown>;
    expect(entry).toMatchObject({
      event: 'http_access',
      method: 'POST',
      status: 403,
      offeringId: OFFERING_ID,
    });
    expect(line).not.toContain('secret-token-value');
    expect(line).not.toContain('texto privado');
    expect(line).not.toContain('127.0.0.1');
  });
});
