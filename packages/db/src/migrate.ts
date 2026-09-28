import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

/**
 * Migration'ları uygular. Supabase'de DOĞRUDAN bağlantı (port 5432) kullanın: DIRECT_URL.
 * Transaction pooler (6543) DDL için uygun değildir.
 */
export async function runMigrations(url: string) {
  const client = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const db = drizzle(client);
    const here = path.dirname(fileURLToPath(import.meta.url));
    await migrate(db, { migrationsFolder: path.resolve(here, '../migrations') });
  } finally {
    await client.end();
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error('DIRECT_URL (veya DATABASE_URL) tanımlı değil.');
    process.exit(1);
  }
  runMigrations(url)
    .then(() => {
      console.log('✓ Migration tamamlandı');
    })
    .catch((err) => {
      console.error('✗ Migration hatası:', err);
      process.exit(1);
    });
}
