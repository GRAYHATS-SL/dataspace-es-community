/** Migration script (`pnpm migrate`). */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  throw new Error('No se ha definido DATABASE_URL');
}

const pool = new Pool({ connectionString: DATABASE_URL });
const db = drizzle(pool);

await migrate(db, { migrationsFolder: new URL('../../../migrations', import.meta.url).pathname });
await pool.end();
