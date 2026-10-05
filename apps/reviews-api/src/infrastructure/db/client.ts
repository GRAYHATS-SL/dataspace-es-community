import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

/** Postgres connection pool, shared by the whole app. */
export const pool = new Pool({ connectionString: DATABASE_URL });

/** Drizzle instance (with the typed schema) used by {@link "@infrastructure/PgCommentRepository"}. */
export const db = drizzle(pool, { schema });
