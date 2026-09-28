import 'dotenv/config';
import { CITIES, DEFAULT_TEMPLATES, PRESENCE_DEFAULTS } from '@bilardogo/domain';
import { and, eq, sql } from 'drizzle-orm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb, type Database } from './client';
import {
  appSettings,
  catalogProducts,
  cities,
  conversations,
  legalDocuments,
  notificationTemplates,
  plans,
} from './schema';
import { CATALOG_SEED } from './seed-data/catalog';
import { LEGAL_SEED } from './seed-data/legal';

/** Temel veriler. Tekrar çalıştırılabilir (idempotent); admin düzenlemelerini ezmez. */
export async function seedBase(db: Database) {
  await db
    .insert(cities)
    .values(CITIES.map((c) => ({ plate: c.plate, name: c.name, slug: c.slug })))
    .onConflictDoUpdate({ target: cities.plate, set: { name: sql`excluded.name`, slug: sql`excluded.slug` } });

  await db.insert(conversations).values({ type: 'country' }).onConflictDoNothing();
  for (const c of CITIES) {
    const existing = await db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.type, 'city'), eq(conversations.cityPlate, c.plate)));
    if (existing.length === 0) await db.insert(conversations).values({ type: 'city', cityPlate: c.plate });
  }

  await db
    .insert(notificationTemplates)
    .values(
      Object.entries(DEFAULT_TEMPLATES).map(([key, t]) => ({
        key,
        title: t.title,
        body: t.body,
        category: t.category,
        description: t.description,
      })),
    )
    .onConflictDoNothing();

  for (const doc of LEGAL_SEED) {
    const current = await db
      .select({ id: legalDocuments.id })
      .from(legalDocuments)
      .where(and(eq(legalDocuments.kind, doc.kind), eq(legalDocuments.isCurrent, true)));
    if (current.length === 0) {
      await db.insert(legalDocuments).values({ ...doc, version: 1, isCurrent: true }).onConflictDoNothing();
    }
  }

  const settings: Record<string, unknown> = {
    trial_days: 30,
    presence: PRESENCE_DEFAULTS,
    subscriptions_enforced: false,
    support: { email: 'destek@bilardogo.com', whatsapp: null },
    chat: { maxImageMb: 10, maxVideoMb: 50 },
  };
  await db
    .insert(appSettings)
    .values(Object.entries(settings).map(([key, value]) => ({ key, value })))
    .onConflictDoNothing();

  const existingProducts = await db.select({ name: catalogProducts.name }).from(catalogProducts);
  const names = new Set(existingProducts.map((p) => p.name));
  const missing = CATALOG_SEED.filter((p) => !names.has(p.name));
  if (missing.length) {
    await db.insert(catalogProducts).values(missing.map((p, i) => ({ ...p, sort: existingProducts.length + i })));
  }

  const existingPlans = await db.select({ id: plans.id }).from(plans);
  if (existingPlans.length === 0) {
    await db.insert(plans).values([
      {
        audience: 'user',
        name: 'Oyuncu Aylık',
        description: 'Tüm oyuncu özellikleri. Fiyatı admin panelinden güncelleyin.',
        price: '49.00',
        intervalMonths: 1,
      },
      {
        audience: 'user',
        name: 'Oyuncu Yıllık',
        description: 'Tüm oyuncu özellikleri, yıllık. Fiyatı admin panelinden güncelleyin.',
        price: '490.00',
        intervalMonths: 12,
      },
      {
        audience: 'business',
        name: 'İşletme Aylık',
        description: 'Salon profili, masa takibi, sipariş, duyuru. Fiyatı admin panelinden güncelleyin.',
        price: '499.00',
        intervalMonths: 1,
      },
    ]);
  }
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isMain) {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error('DIRECT_URL (veya DATABASE_URL) tanımlı değil.');
    process.exit(1);
  }
  const db = createDb(url, { max: 1 });
  seedBase(db)
    .then(() => {
      console.log('✓ Temel veriler yüklendi (iller, sohbet kanalları, şablonlar, sözleşmeler, katalog, planlar)');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
