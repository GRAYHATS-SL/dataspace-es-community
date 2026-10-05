/**
 * Migration script (`pnpm migrate`) — applies the SQL migrations in `migrations/`
 * against `DATABASE_URL`. Meant to run once per deployment, before starting the server.
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is not defined');
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

await migrate(db, { migrationsFolder: new URL('../../../migrations', import.meta.url).pathname });
await pool.end();
