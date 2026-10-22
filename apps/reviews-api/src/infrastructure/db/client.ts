import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.js';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('No se ha definido DATABASE_URL');
}

/** Shared Postgres connection pool. */
export const pool = new Pool({ connectionString: DATABASE_URL });

/** Drizzle instance used by the repository. */
export const db = drizzle(pool, { schema });
