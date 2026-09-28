import { readFileSync } from 'node:fs';
import path from 'node:path';
import postgres from 'postgres';
import { runMigrations } from '../../db/src/migrate';
import { seedBase } from '../../db/src/seed';
import { createDb } from '../../db/src/client';

/**
 * Yerel Postgres'te şablon veritabanı hazırlar: Supabase taklidi + migration'lar + temel seed.
 * Her test dosyası bu şablondan kendi veritabanını kopyalar (hızlı ve yalıtılmış).
 * TEST_DATABASE_URL: yönetici bağlantısı (varsayılan postgres://postgres@localhost:54322/postgres)
 */
export default async function setup() {
  const adminUrl = process.env.TEST_DATABASE_URL ?? 'postgres://postgres@localhost:54322/postgres';
  const admin = postgres(adminUrl, { max: 1, onnotice: () => {} });
  const template = 'bg_test_template';
  await admin.unsafe(`DROP DATABASE IF EXISTS ${template} WITH (FORCE)`);
  await admin.unsafe(`CREATE DATABASE ${template}`);
  const templateUrl = adminUrl.replace(/\/[^/]*$/, `/${template}`);
  const t = postgres(templateUrl, { max: 1, onnotice: () => {} });
  await t.unsafe(readFileSync(path.resolve(__dirname, '../../db/test-support/supabase-stub.sql'), 'utf8'));
  // realtime.send taklidi: yayınlar bir tabloya yazılır ki testlerde doğrulanabilsin
  await t.unsafe(`
    CREATE SCHEMA IF NOT EXISTS realtime;
    CREATE TABLE IF NOT EXISTS realtime.sent (topic text, event text, payload jsonb, private boolean, at timestamptz default now());
    CREATE OR REPLACE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean) RETURNS void
      LANGUAGE sql AS $$ INSERT INTO realtime.sent (topic, event, payload, private) VALUES (topic, event, payload, private) $$;
  `);
  await t.end();
  await runMigrations(templateUrl);
  const db = createDb(templateUrl, { max: 1 });
  await seedBase(db);
  await (db.$client as unknown as { end: () => Promise<void> }).end();
  process.env.BG_TEST_TEMPLATE = template;
  process.env.BG_TEST_ADMIN_URL = adminUrl;
  await admin.end();
}
