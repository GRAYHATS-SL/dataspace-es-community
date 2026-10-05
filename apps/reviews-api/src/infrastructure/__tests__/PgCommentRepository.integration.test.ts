import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { CommentRepository } from '@domain/CommentRepository.js';
import { createPgCommentRepository } from '@infrastructure/PgCommentRepository.js';
import * as schema from '@infrastructure/db/schema.js';

const MIGRATION_PATH = fileURLToPath(new URL('../../../migrations/0000_create_comments.sql', import.meta.url));
const MISSING_ID = '00000000-0000-4000-8000-000000000000';

describe('createPgCommentRepository (integration with a real Postgres)', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;
  let repository: CommentRepository;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    await pool.query(readFileSync(MIGRATION_PATH, 'utf8'));
    repository = createPgCommentRepository(drizzle(pool, { schema }));
  }, 120_000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  it('creates a comment and returns it with generated id and timestamps', async () => {
    const comment = await repository.create({ offeringId: 'offering-1', rating: 5, body: 'Very good' });

    expect(comment.id).toEqual(expect.any(String));
    expect(comment.createdAt).toEqual(expect.any(String));
    expect(comment.updatedAt).toEqual(expect.any(String));
    expect(comment.rating).toBe(5);
  });

  it('lists only the comments of the offering', async () => {
    const created = await repository.create({ offeringId: 'offering-2', rating: 3, body: null });
    await repository.create({ offeringId: 'offering-3', rating: 4, body: null });

    expect(await repository.listByOffering('offering-2')).toEqual([created]);
  });

  it('finds, updates and deletes a comment scoped to its offering', async () => {
    const created = await repository.create({ offeringId: 'offering-4', rating: 2, body: 'Meh' });

    expect(await repository.findById('offering-4', created.id)).toEqual({ ok: true, value: created });
    expect(await repository.findById('another-offering', created.id)).toEqual({ ok: false, error: 'not_found' });

    const updated = await repository.update('offering-4', created.id, { rating: 4 });
    expect(updated.ok && updated.value.rating).toBe(4);
    expect(updated.ok && updated.value.body).toBe('Meh');

    expect(await repository.delete('offering-4', created.id)).toEqual({ ok: true, value: undefined });
    expect(await repository.delete('offering-4', created.id)).toEqual({ ok: false, error: 'not_found' });
  });

  it('returns not_found for unknown or non-UUID ids', async () => {
    expect(await repository.findById('offering-1', MISSING_ID)).toEqual({ ok: false, error: 'not_found' });
    expect(await repository.update('offering-1', 'not-a-uuid', { rating: 1 })).toEqual({ ok: false, error: 'not_found' });
  });

  it('rejects at DB level a rating outside 1-5 (CHECK constraint), even bypassing the domain layer', async () => {
    await expect(
      pool.query(`INSERT INTO comments (offering_id, rating) VALUES ($1, $2)`, ['offering-5', 7]),
    ).rejects.toThrow(/rating_range/);
  });

  it('rejects at DB level a body longer than 1000 characters (CHECK constraint)', async () => {
    await expect(
      pool.query(`INSERT INTO comments (offering_id, rating, body) VALUES ($1, $2, $3)`, [
        'offering-6',
        3,
        'a'.repeat(1001),
      ]),
    ).rejects.toThrow(/body_max_length/);
  });
});
