/**
 * Demo verisi: salonlar, masalar, oyuncular, maçlar, siparişler, bülten ve reklam.
 * Tüm veriler gerçek iş kuralları üzerinden (tRPC çağrılarıyla) oluşturulur.
 *
 * Yerel:   DATABASE_URL=postgres://... pnpm db:seed:demo       (auth.users'a doğrudan yazar)
 * Staging: DATABASE_URL + NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY ile çalıştırın
 *          (kullanıcılar Supabase Auth'ta şifreyle oluşturulur: Bilardo123!)
 * Üretimde ÇALIŞTIRMAYIN.
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { createDb, eq, profiles, sql, venueProducts } from '@bilardogo/db';
import { DEFAULT_OPENING_HOURS } from '@bilardogo/domain';
import { createCaller } from '../src/root';
import type { Services } from '../src/services/types';

const DEMO_PASSWORD = 'Bilardo123!';

async function main() {
  const url = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL tanımlı değil');
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== '1') {
    throw new Error('Üretimde demo verisi yüklenmez (ALLOW_DEMO_SEED=1 ile zorlayabilirsiniz).');
  }
  const db = createDb(url, { max: 2 });
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) : null;

  const existing = await db.execute<{ n: number }>(sql`select count(*)::int as n from venues`);
  if ((existing[0]?.n ?? 0) > 0) {
    console.log('Veritabanında zaten salon var; demo verisi atlandı.');
    process.exit(0);
  }

  const pending: Promise<unknown>[] = [];
  const services: Services = {
    storage: {
      createSignedUpload: async (_b, path) => ({ path, token: '', signedUrl: '' }),
      createSignedRead: async () => null,
      createSignedReads: async () => ({}),
      publicUrl: (p) => `${supabaseUrl ?? ''}/storage/v1/object/public/public-media/${p}`,
      remove: async () => {},
    },
    authAdmin: {
      deleteUser: async () => {},
      findUserIdByEmail: async (email) => {
        const r = await db.execute<{ id: string }>(sql`select id from auth.users where lower(email) = lower(${email})`);
        return r[0]?.id ?? null;
      },
      getEmail: async () => null,
    },
    push: { enabled: false, send: async () => 'ok' },
    email: { enabled: false, send: async () => {} },
    defer: (t) => void pending.push(t()),
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  };
  const as = (id: string) => createCaller({ db, services, user: { id, email: null }, ip: null, userAgent: 'seed' });

  async function user(fullName: string, username: string, city: number, opts: { admin?: boolean; games?: string[]; level?: string } = {}) {
    const email = `${username}@demo.bilardogo.com`;
    let id: string;
    if (supabase) {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password: DEMO_PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });
      if (error) throw error;
      id = data.user.id;
    } else {
      const r = await db.execute<{ id: string }>(
        sql`insert into auth.users (email, raw_user_meta_data) values (${email}, ${JSON.stringify({ full_name: fullName })}::jsonb) returning id`,
      );
      id = r[0]!.id;
    }
    await as(id).me.completeOnboarding({
      fullName,
      username,
      cityPlate: city,
      level: (opts.level ?? 'intermediate') as never,
      gameTypes: (opts.games ?? ['three_cushion', 'carom']) as never,
      bio: null,
      acceptUserAgreement: true,
      acknowledgeKvkk: true,
      explicitConsent: true,
      marketingConsent: false,
    });
    if (opts.admin) await db.update(profiles).set({ role: 'admin' }).where(eq(profiles.id, id));
    return id;
  }

  console.log('→ Kullanıcılar');
  const admin = await user('BilardoGo Admin', 'admin_demo', 34, { admin: true });
  const berkay = await user('Berkay Karakurt', 'berkay', 34, { level: 'advanced', games: ['three_cushion', 'carom'] });
  const ahmet = await user('Ahmet Yılmaz', 'ahmet', 34, { games: ['three_cushion', 'eight_ball'] });
  const kenan = await user('Kenan Demir', 'kenan', 34, { games: ['three_cushion', 'carom'] });
  const mehmet = await user('Mehmet Kaya', 'mehmet', 34, { level: 'beginner', games: ['eight_ball', 'nine_ball'] });
  const halil = await user('Halil Kiraz', 'halil', 34, { games: ['snooker', 'eight_ball'] });
  const mert = await user('Mert Şahin', 'mert', 34, { games: ['nine_ball', 'eight_ball'] });
  const elif = await user('Elif Arslan', 'elif', 34, { level: 'pro', games: ['three_cushion'] });
  const selin = await user('Selin Aydın', 'selin', 6, { games: ['snooker'] });
  const emre = await user('Emre Çelik', 'emre', 35, { games: ['three_cushion'] });
  const murat = await user('Murat Öz', 'murat_fbn', 34);
  const serkan = await user('Serkan Tunç', 'serkan', 34);
  const kasim = await user('Kasım Garson', 'kasim', 34);
  const ayhan = await user('Ayhan Er', 'ayhan', 6);

  console.log('→ İşletmeler ve salonlar');
  async function venue(
    owner: string,
    legalName: string,
    name: string,
    city: number,
    district: string,
    address: string,
    lat: number,
    lng: number,
    description: string,
  ) {
    const r = await as(owner).business.submitApplication({
      legalName,
      taxId: '10000000146',
      taxOffice: district,
      contactPhone: '0532 000 00 00',
      acceptBusinessAgreement: true,
      venue: { name, cityPlate: city, district, address, lat, lng, phone: '0216 000 00 00', description, openingHours: DEFAULT_OPENING_HOURS },
    });
    await as(admin).admin.reviewBusiness({ businessId: r.businessId, action: 'approve', note: null });
    return r;
  }
  const fbn = await venue(murat, 'FBN Bilardo Spor Ltd. Şti.', 'FBN Bilardo', 34, 'Kadıköy', 'Caferağa Mah. Moda Cad. No:12', 40.9869, 29.0265, 'Kadıköy’ün köklü bilardo kulübü. 3 Bant turnuva masaları, Amerikan ve snooker salonu.');
  const masters = await venue(serkan, 'Masters Bilardo Akademi', 'Masters Bilardo Akademi', 34, 'Beşiktaş', 'Sinanpaşa Mah. Ihlamurdere Cad. No:5', 41.0438, 29.0053, 'Akademi eğitimleri ve haftalık 3 Bant ligleri.');
  const ankara = await venue(ayhan, 'Ankara Bilardo Kulübü', 'Ankara Bilardo Kulübü', 6, 'Çankaya', 'Kızılay, Atatürk Blv. No:100', 39.9208, 32.8541, 'Başkentin snooker merkezi.');

  await as(murat).business.createTables({ venueId: fbn.venueId, from: 1, to: 5, allowedGameTypes: ['three_cushion', 'carom'] });
  await as(murat).business.createTables({ venueId: fbn.venueId, from: 6, to: 9, allowedGameTypes: ['eight_ball', 'nine_ball'] });
  await as(murat).business.createTable({ venueId: fbn.venueId, data: { number: 10, label: 'Snooker', allowedGameTypes: ['snooker'], isActive: true } });
  await as(serkan).business.createTables({ venueId: masters.venueId, from: 1, to: 8, allowedGameTypes: ['three_cushion', 'carom'] });
  await as(ayhan).business.createTables({ venueId: ankara.venueId, from: 1, to: 4, allowedGameTypes: ['snooker'] });
  await as(ayhan).business.createTables({ venueId: ankara.venueId, from: 5, to: 8, allowedGameTypes: ['eight_ball', 'nine_ball'] });

  await as(murat).business.addStaff({ businessId: fbn.businessId, identifier: '@kasim', permissions: ['orders', 'tables'] });

  console.log('→ Menü');
  const catalog = await as(murat).business.products({ venueId: fbn.venueId });
  const prices: Record<string, [number, number | null]> = {
    Çay: [15, null],
    'Türk kahvesi': [60, null],
    Su: [15, null],
    Kola: [45, 48],
    Ayran: [30, 24],
    'Kaşarlı tost': [90, 20],
    'Karışık tost': [110, 20],
    Cips: [40, 30],
    Çekirdek: [35, null],
  };
  for (const p of catalog) {
    const price = prices[p.name];
    if (price) await as(murat).business.upsertProduct({ venueId: fbn.venueId, productId: p.productId, price: price[0], stock: price[1], isAvailable: true });
    if (price && (p.name === 'Çay' || p.name === 'Su' || p.name === 'Türk kahvesi')) {
      await as(serkan).business.upsertProduct({ venueId: masters.venueId, productId: p.productId, price: price[0] + 5, stock: null, isAvailable: true });
    }
  }

  console.log('→ Sosyal');
  for (const [a, b] of [
    [berkay, ahmet],
    [berkay, kenan],
    [ahmet, kenan],
    [mehmet, mert],
    [berkay, elif],
  ] as const) {
    await as(a).social.addFriend({ userId: b });
    await as(b).social.addFriend({ userId: a });
  }
  for (const u of [berkay, ahmet, kenan, mehmet, halil, elif]) await as(u).venues.follow({ venueId: fbn.venueId });
  await as(elif).venues.follow({ venueId: masters.venueId });

  console.log('→ Maç geçmişi');
  const tables = await db.execute<{ id: string; number: number; qr_token: string; venue_id: string }>(
    sql`select id, number, qr_token, venue_id from venue_tables order by number`,
  );
  const tokenOf = (venueId: string, n: number) => tables.find((t) => t.venue_id === venueId && t.number === n)!.qr_token;

  type PtsResult = { p1: number; p2: number; inn: number; hr1: number | null; hr2: number | null };
  async function pointsMatch(a: string, b: string, venueId: string, table: number, game: 'three_cushion' | 'carom', r: PtsResult, daysAgo: number) {
    const target = game === 'three_cushion' ? 30 : 60;
    const { id } = await as(a).matches.request({
      opponentId: b,
      venueId,
      gameType: game,
      format: { category: 'points', targetPoints: target, inningLimit: 50, handicap: null },
      when: 'now',
    });
    await as(b).matches.respond({ matchId: id, action: 'accept' });
    await as(a).matches.startMatched({ matchId: id, token: tokenOf(venueId, table) });
    await as(b).matches.finish({ matchId: id });
    const winner = r.p1 === r.p2 ? 'draw' : r.p1 > r.p2 ? 'p1' : 'p2';
    await as(a).matches.submitResult({
      matchId: id,
      result: { category: 'points', winner, p1Score: r.p1, p2Score: r.p2, inningsMode: 'shared', innings: r.inn, p1Innings: null, p2Innings: null, p1HighRun: r.hr1, p2HighRun: r.hr2 },
    });
    await as(b).matches.confirmResult({ matchId: id });
    await db.execute(sql`
      update matches set
        started_at = now() - make_interval(days => ${daysAgo}, mins => 95),
        ended_at = now() - make_interval(days => ${daysAgo}, mins => 20),
        completed_at = now() - make_interval(days => ${daysAgo}, mins => 15),
        created_at = now() - make_interval(days => ${daysAgo}, mins => 100)
      where id = ${id}`);
    return id;
  }
  async function raceMatch(a: string, b: string, venueId: string, table: number, game: 'eight_ball' | 'nine_ball' | 'snooker', target: number, c1: number, c2: number, daysAgo: number) {
    const { id } = await as(a).matches.request({
      opponentId: b,
      venueId,
      gameType: game,
      format: { category: game === 'snooker' ? 'frames' : 'racks', target, handicap: null },
      when: 'now',
    });
    await as(b).matches.respond({ matchId: id, action: 'accept' });
    await as(a).matches.startMatched({ matchId: id, token: tokenOf(venueId, table) });
    await as(a).matches.finish({ matchId: id });
    await as(b).matches.submitResult({
      matchId: id,
      result: { category: game === 'snooker' ? 'frames' : 'racks', winner: c1 > c2 ? 'p1' : 'p2', target, p1Count: c1, p2Count: c2, p1HighBreak: game === 'snooker' ? 54 : undefined, p2HighBreak: game === 'snooker' ? null : undefined },
    });
    await as(a).matches.confirmResult({ matchId: id });
    await db.execute(sql`
      update matches set started_at = now() - make_interval(days => ${daysAgo}, mins => 80),
        ended_at = now() - make_interval(days => ${daysAgo}, mins => 10), completed_at = now() - make_interval(days => ${daysAgo}, mins => 5)
      where id = ${id}`);
  }
  await pointsMatch(berkay, ahmet, fbn.venueId, 1, 'three_cushion', { p1: 30, p2: 21, inn: 34, hr1: 7, hr2: 4 }, 12);
  await pointsMatch(ahmet, berkay, fbn.venueId, 2, 'three_cushion', { p1: 30, p2: 28, inn: 41, hr1: 5, hr2: null }, 9);
  await pointsMatch(berkay, kenan, masters.venueId, 3, 'three_cushion', { p1: 30, p2: 17, inn: 29, hr1: 9, hr2: 3 }, 6);
  await pointsMatch(kenan, ahmet, fbn.venueId, 1, 'three_cushion', { p1: 25, p2: 30, inn: 45, hr1: 4, hr2: 6 }, 4);
  await pointsMatch(elif, berkay, masters.venueId, 1, 'three_cushion', { p1: 30, p2: 26, inn: 27, hr1: 11, hr2: 6 }, 3);
  await pointsMatch(berkay, kenan, fbn.venueId, 4, 'carom', { p1: 60, p2: 42, inn: 22, hr1: 14, hr2: 8 }, 2);
  await raceMatch(mehmet, mert, fbn.venueId, 6, 'eight_ball', 5, 5, 3, 5);
  await raceMatch(mert, mehmet, fbn.venueId, 7, 'nine_ball', 7, 7, 6, 1);
  await raceMatch(halil, mert, fbn.venueId, 10, 'snooker', 3, 3, 1, 2);
  await as(berkay).players.addPractice({ gameType: 'three_cushion', score: 40, innings: 50, highRun: 6, playedOn: new Date(Date.now() - 86400e3).toISOString().slice(0, 10), note: 'Kısa bantlar' });
  await as(berkay).players.addPractice({ gameType: 'three_cushion', score: 35, innings: 40, highRun: 5, playedOn: new Date().toISOString().slice(0, 10), note: null });

  console.log('→ Canlı durum');
  await as(berkay).presence.set({ venueId: fbn.venueId, status: 'at_venue', playIntent: 'wants' });
  await as(mehmet).presence.set({ venueId: fbn.venueId, status: 'at_venue', playIntent: 'not' });
  await as(halil).presence.set({ venueId: fbn.venueId, status: 'at_venue', playIntent: 'wants' });
  await as(elif).presence.set({ venueId: fbn.venueId, status: 'coming', eta: new Date(Date.now() + 75 * 60e3).toISOString() });
  const live = await as(ahmet).matches.request({
    opponentId: kenan,
    venueId: fbn.venueId,
    gameType: 'three_cushion',
    format: { category: 'points', targetPoints: 30, inningLimit: 50, handicap: null },
    when: 'now',
  });
  await as(kenan).matches.respond({ matchId: live.id, action: 'accept' });
  await as(ahmet).matches.startMatched({ matchId: live.id, token: tokenOf(fbn.venueId, 1) });
  await db.execute(sql`update matches set started_at = now() - interval '38 minutes' where id = ${live.id}`);
  const order = await as(ahmet).orders.create({ venueId: fbn.venueId, kind: 'match', matchId: live.id, note: 'Çaylar açık olsun' });
  const menu = await as(ahmet).venues.menu({ venueId: fbn.venueId });
  await as(ahmet).orders.addItems({ orderId: order.id, items: [{ venueProductId: menu.find((m) => m.name === 'Çay')!.id, qty: 2 }] });
  await as(halil).orders.join({ code: order.joinCode });
  await as(halil).orders.addItems({ orderId: order.id, items: [{ venueProductId: menu.find((m) => m.name === 'Kaşarlı tost')!.id, qty: 1 }] });
  await as(mert).matches.request({
    opponentId: berkay,
    venueId: fbn.venueId,
    gameType: 'three_cushion',
    format: { category: 'points', targetPoints: 30, inningLimit: 40, handicap: { p1: 5, p2: 0 } },
    when: 'now',
    note: 'Handikaplı bir maç?',
  });

  console.log('→ Duyurular, bülten, reklam');
  await as(murat).business.createPost({
    venueId: fbn.venueId,
    data: { kind: 'campaign', title: 'Mutlu saatler: %10 indirim', body: '17.00–19.00 arasında tüm masalarda %10 indirim.' },
    notifyFollowers: false,
  });
  await as(murat).business.createPost({
    venueId: fbn.venueId,
    data: { kind: 'announcement', title: 'Çuhalarımız yenilendi', body: '3 Bant masalarımızın çuhaları yenilendi. İyi oyunlar!' },
    notifyFollowers: false,
  });
  await as(admin).admin.saveBulletin({
    kind: 'live',
    title: "Berkay Karakurt'un maçı bugün 20.00'da",
    body: 'İstanbul 3 Bant Ligi yarı finali canlı yayında.',
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    status: 'published',
    cityPlates: [],
    notify: false,
  });
  await as(admin).admin.saveBulletin({
    kind: 'feature',
    title: 'Yeni: Masadan sipariş ver, ödemeyi kasada yap',
    body: 'Maç oturumuna katılan arkadaşların da siparişini aynı listeden verebilir. İzleyiciler "İzleyici" olarak görünür.',
    status: 'published',
    cityPlates: [],
    notify: false,
  });
  await as(admin).admin.saveBulletin({
    kind: 'news',
    title: '3 Bant Dünya Kupası takvimi açıklandı',
    body: 'Sezonun ilk etabı ekim ayında başlıyor.',
    status: 'published',
    cityPlates: [],
    notify: false,
  });
  await as(admin).admin.saveAd({
    brand: 'Istaka Dünyası',
    product: 'Karbon ıstaka serisi',
    priceText: 'BilardoGo kullanıcılarına %15 indirim',
    body: 'Profesyonel oyuncuların tercihi.',
    link: 'https://example.com',
    contact: 'info@example.com',
    scope: 'country',
    cityPlates: [],
    placements: ['home', 'bulletin'],
    startsAt: new Date(Date.now() - 86400e3).toISOString(),
    endsAt: new Date(Date.now() + 30 * 86400e3).toISOString(),
    isActive: true,
  });

  await Promise.allSettled(pending);
  const vp = await db.select().from(venueProducts);
  console.log(`✓ Demo verisi hazır (${vp.length} ürün). ${supabase ? `Demo kullanıcı şifresi: ${DEMO_PASSWORD}` : 'Yerelde /dev/giris ile giriş yapın.'}`);
  console.log('  Kullanıcılar: @berkay @ahmet @kenan @mehmet @halil @mert @elif · İşletme: @murat_fbn (FBN), @serkan (Masters) · Çalışan: @kasim · Admin: @admin_demo');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
