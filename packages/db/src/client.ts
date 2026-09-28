import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export type Database = ReturnType<typeof createDb>;
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];
export type DbOrTx = Database | Transaction;

/**
 * Supabase transaction pooler (port 6543) ile çalışır: prepared statement kapalı.
 * Sunucusuz ortamda bağlantı sayısı düşük tutulur.
 */
export function createDb(url: string, opts: { max?: number } = {}) {
  const client = postgres(url, {
    prepare: false,
    max: opts.max ?? 5,
    idle_timeout: 20,
    connect_timeout: 10,
  });
  return drizzle(client, { schema, casing: undefined });
}

const globalForDb = globalThis as unknown as { __bilardogoDb?: Database };

/** Uygulama genelinde tek bağlantı havuzu (Next.js dev'de hot reload'a dayanıklı). */
export function getDb(): Database {
  if (!globalForDb.__bilardogoDb) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error('DATABASE_URL tanımlı değil');
    globalForDb.__bilardogoDb = createDb(url);
  }
  return globalForDb.__bilardogoDb;
}
