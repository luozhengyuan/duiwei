import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './shared/schema';

const connectionString = process.env.DATABASE_URL || process.env.COZE_DATABASE_URL || '';

function isPooledConnectionString(databaseUrl: string): boolean {
  try {
    const { hostname } = new URL(databaseUrl);
    return hostname.includes('pooler.');
  } catch {
    return false;
  }
}

const client = postgres(connectionString, {
  max: 1,
  ssl: 'require',
  prepare: !isPooledConnectionString(connectionString),
});
export const db = drizzle(client, { schema });
export const rawDb = client;

export * from './shared/schema';
