import { createDb, profiles, eq, type Database } from '@bilardogo/db';
import { DEFAULT_OPENING_HOURS } from '@bilardogo/domain';
import postgres from 'postgres';
import { afterAll, beforeAll } from 'vitest';
import { createCaller } from '../src/root';
import type { Services } from '../src/services/types';

export type TestEnv = {
  db: Database;
  services: Services;
  pending: Promise<unknown>[];
  flush: () => Promise<void>;
  as: (userId: string | null) => ReturnType<typeof createCaller>;
  createUser: (name: string, opts?: { admin?: boolean; city?: number; onboard?: boolean }) => Promise<string>;
  createVenue: (ownerId: string, opts?: { name?: string; tables?: { number: number; games: string[] }[]; approve?: boolean }) => Promise<{
    businessId: string;
    venueId: string;
    slug: string;
    tables: { id: string; number: number; token: string }[];
  }>;
  adminId: () => Promise<string>;
  sql: postgres.Sql;
};

/** Her test dosyası şablondan kendi veritabanını kopyalar. */
export function setupTestEnv(): TestEnv {
  const env = {} as TestEnv;
  const name = `bg_test_${Math.random().toString(36).slice(2, 10)}`;
  const adminUrl = process.env.BG_TEST_ADMIN_URL ?? process.env.TEST_DATABASE_URL ?? 'postgres://postgres@localhost:54322/postgres';
  const url = adminUrl.replace(/\/[^/]*$/, `/${name}`);
  let adminSql: postgres.Sql;
  let admin: string | null = null;

  beforeAll(async () => {
    adminSql = postgres(adminUrl, { max: 1, onnotice: () => {} });
    await adminSql.unsafe(`CREATE DATABASE ${name} TEMPLATE ${process.env.BG_TEST_TEMPLATE ?? 'bg_test_template'}`);
    env.db = createDb(url, { max: 4 });
    env.sql = postgres(url, { max: 2, onnotice: () => {} });
    env.pending = [];
    const uploaded: Record<string, true> = {};
    env.services = {
      storage: {
        async createSignedUpload(_bucket, path) {
          uploaded[path] = true;
          return { path, token: 'tok', signedUrl: `https://storage.test/upload/${path}` };
        },
        async createSignedRead(_b, path) {
          return `https://storage.test/signed/${path}`;
        },
        async createSignedReads(_b, paths) {
          return Object.fromEntries(paths.map((p) => [p, `https://storage.test/signed/${p}`]));
        },
        publicUrl: (p) => `https://storage.test/public/${p}`,
        async remove() {},
      },
      authAdmin: {
        async deleteUser() {},
        async findUserIdByEmail(email) {
          const rows = await env.sql`select id from auth.users where lower(email) = lower(${email})`;
          return (rows[0]?.id as string) ?? null;
        },
        async getEmail(userId) {
          const rows = await env.sql`select email from auth.users where id = ${userId}`;
          return (rows[0]?.email as string) ?? null;
        },
      },
      push: { enabled: false, async send() { return 'ok' as const; } },
      email: { enabled: false, async send() {} },
      defer: (task) => {
        env.pending.push(task());
      },
      appUrl: 'https://app.test',
    };
    env.flush = async () => {
      const p = env.pending.splice(0);
      await Promise.all(p);
    };
    env.as = (userId) =>
      createCaller({
        db: env.db,
        services: env.services,
        user: userId ? { id: userId, email: `${userId}@test` } : null,
        ip: '127.0.0.1',
        userAgent: 'vitest',
      });

    let counter = 0;
    env.createUser = async (fullName, opts = {}) => {
      counter++;
      const username = `${fullName.toLowerCase().replace(/[^a-z]/g, '')}${counter}`.slice(0, 20);
      const [u] = await env.sql`
        insert into auth.users (email, raw_user_meta_data)
        values (${`${username}@example.com`}, ${env.sql.json({ full_name: fullName })})
        returning id`;
      const id = u!.id as string;
      if (opts.onboard !== false) {
        await env.as(id).me.completeOnboarding({
          fullName,
          username,
          cityPlate: opts.city ?? 34,
          level: 'intermediate',
          gameTypes: ['three_cushion', 'eight_ball'],
          bio: null,
          acceptUserAgreement: true,
          acknowledgeKvkk: true,
          explicitConsent: true,
          marketingConsent: false,
        });
      }
      if (opts.admin) await env.db.update(profiles).set({ role: 'admin' }).where(eq(profiles.id, id));
      return id;
    };
    env.adminId = async () => {
      if (!admin) admin = await env.createUser('Admin Kişi', { admin: true });
      return admin;
    };
    env.createVenue = async (ownerId, opts = {}) => {
      const venueName = opts.name ?? 'FBN Bilardo';
      const res = await env.as(ownerId).business.submitApplication({
        legalName: `${venueName} Ltd.`,
        taxId: '10000000146',
        taxOffice: 'Kadıköy',
        contactPhone: '0532 123 45 67',
        acceptBusinessAgreement: true,
        venue: {
          name: venueName,
          cityPlate: 34,
          district: 'Kadıköy',
          address: 'Caferağa Mah. Moda Cad. No:1',
          lat: 40.98,
          lng: 29.02,
          phone: '0216 123 45 67',
          description: null,
          openingHours: DEFAULT_OPENING_HOURS,
        },
      });
      if (opts.approve !== false) {
        await env.as(await env.adminId()).admin.reviewBusiness({ businessId: res.businessId, action: 'approve', note: null });
      }
      const tables = [];
      for (const t of opts.tables ?? [
        { number: 1, games: ['three_cushion', 'carom'] },
        { number: 2, games: ['three_cushion', 'carom'] },
        { number: 6, games: ['eight_ball', 'nine_ball'] },
      ]) {
        const row = await env.as(ownerId).business.createTable({
          venueId: res.venueId,
          data: { number: t.number, label: null, allowedGameTypes: t.games as never, isActive: true },
        });
        tables.push({ id: row.id, number: row.number, token: row.qrToken });
      }
      return { businessId: res.businessId, venueId: res.venueId, slug: res.slug, tables };
    };
  });

  afterAll(async () => {
    await env.flush?.();
    await (env.db?.$client as unknown as { end: () => Promise<void> } | undefined)?.end();
    await env.sql?.end();
    await adminSql.unsafe(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await adminSql.end();
  });

  return env;
}
