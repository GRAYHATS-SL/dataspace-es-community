import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import type { NewCommentInput } from '@domain/CommentRepository.js';
import { createPgCommentRepository } from '@infrastructure/PgCommentRepository.js';
import * as schema from '@infrastructure/db/schema.js';

const MIGRATION_PATH = fileURLToPath(new URL('../../../migrations/0000_create_comments.sql', import.meta.url));

describe('createPgCommentRepository (integración con Postgres real)', () => {
  let container: StartedPostgreSqlContainer;
  let pool: Pool;

  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    pool = new Pool({ connectionString: container.getConnectionUri() });
    const migrationSql = readFileSync(MIGRATION_PATH, 'utf8');
    await pool.query(migrationSql);
  }, 120_000);

  afterAll(async () => {
    await pool.end();
    await container.stop();
  });

  it('crea un comentario y lo devuelve con id y createdAt generados', async () => {
    const db = drizzle(pool, { schema });
    const repository = createPgCommentRepository(db);

    const result = await repository.create({
      offeringId: 'urn:ngsi-ld:product-offering:1',
      individualId: 'urn:ngsi-ld:individual:1',
      organizationId: 'urn:ngsi-ld:organization:1',
      rating: 5,
      body: 'Muy buen producto',
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.id).toEqual(expect.any(String));
      expect(result.value.createdAt).toEqual(expect.any(String));
      expect(result.value.rating).toBe(5);
    }
  });

  it('rechaza un segundo comentario de la misma organización para la misma oferta (constraint UNIQUE)', async () => {
    const db = drizzle(pool, { schema });
    const repository = createPgCommentRepository(db);
    const input: NewCommentInput = {
      offeringId: 'urn:ngsi-ld:product-offering:2',
      individualId: 'urn:ngsi-ld:individual:2',
      organizationId: 'urn:ngsi-ld:organization:2',
      rating: 4,
      body: null,
    };

    const first = await repository.create(input);
    const second = await repository.create(input);

    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, error: 'duplicate' });
  });

  it('rechaza a nivel de BD un rating fuera de 1-5 (CHECK constraint), incluso saltándose la capa de dominio', async () => {
    await expect(
      pool.query(
        `INSERT INTO comments (offering_id, individual_id, organization_id, rating) VALUES ($1, $2, $3, $4)`,
        ['urn:ngsi-ld:product-offering:3', 'urn:ngsi-ld:individual:3', 'urn:ngsi-ld:organization:3', 7],
      ),
    ).rejects.toThrow(/rating_range/);
  });

  it('rechaza a nivel de BD un body de más de 1000 caracteres (CHECK constraint)', async () => {
    await expect(
      pool.query(
        `INSERT INTO comments (offering_id, individual_id, organization_id, rating, body) VALUES ($1, $2, $3, $4, $5)`,
        ['urn:ngsi-ld:product-offering:4', 'urn:ngsi-ld:individual:4', 'urn:ngsi-ld:organization:4', 3, 'a'.repeat(1001)],
      ),
    ).rejects.toThrow(/body_max_length/);
  });

  it('calcula correctamente la media y el conteo para una oferta con varios comentarios', async () => {
    const db = drizzle(pool, { schema });
    const repository = createPgCommentRepository(db);
    const offeringId = 'urn:ngsi-ld:product-offering:5';
    await repository.create({
      offeringId,
      individualId: 'urn:ngsi-ld:individual:5a',
      organizationId: 'urn:ngsi-ld:organization:5a',
      rating: 5,
      body: null,
    });
    await repository.create({
      offeringId,
      individualId: 'urn:ngsi-ld:individual:5b',
      organizationId: 'urn:ngsi-ld:organization:5b',
      rating: 3,
      body: null,
    });

    const result = await repository.listWithAverage(offeringId);

    expect(result.count).toBe(2);
    expect(result.average).toBe(4);
  });

  it('devuelve lista vacía y media 0 para una oferta sin comentarios', async () => {
    const db = drizzle(pool, { schema });
    const repository = createPgCommentRepository(db);

    const result = await repository.listWithAverage('urn:ngsi-ld:product-offering:sin-comentarios');

    expect(result).toEqual({ comments: [], average: 0, count: 0 });
  });
});
