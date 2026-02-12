
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

if (!process.env.POSTGRES_URL) {
  console.error('POSTGRES_URL is not defined');
}

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export const db = drizzle(pool, { schema });
