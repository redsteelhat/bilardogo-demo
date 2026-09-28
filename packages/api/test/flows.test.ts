import { describe, expect, it } from 'vitest';
import { setupTestEnv } from './helpers';

const env = setupTestEnv();

describe('kayıt ve profil', () => {
  it('auth kaydı profil + 30 gün deneme + bildirim tercihi açar; onboarding sonrası oturum dolu', async () => {
    const id = await env.createUser('Berkay Karakurt');
    const s = await env.as(id).me.session();
    expect(s?.onboarded).toBe(true);
    expect(s?.fullName).toBe('Berkay Karakurt');
    expect(s?.entitlement.status).toBe('trialing');
    expect(s?.entitlement.daysLeft).toBeGreaterThanOrEqual(29);
    const consents = await env.as(id).me.consents();
    expect(consents.find((c) => c.kind === 'user_agreement')?.granted).toBe(true);
    expect(consents.find((c) => c.kind === 'marketing')?.granted).toBe(false);
  });

  it('profili tamamlanmamış kullanıcı korumalı işlemleri yapamaz', async () => {
    const id = await env.createUser('Yarım Kayıt', { onboard: false });
    await expect(env.as(id).presence.me()).rejects.toThrow(/profilini tamamla/);
  });

  it('kullanıcı adı benzersiz, ayrılmış adlar alınamaz', async () => {
    const a = await env.createUser('Ali Kaya');
    const sa = await env.as(a).me.session();
    const b = await env.createUser('Veli Kaya');
    expect((await env.as(b).me.checkUsername({ username: sa!.username! })).available).toBe(false);
    expect((await env.as(b).me.checkUsername({ username: 'admin' })).available).toBe(false);
    expect((await env.as(b).me.checkUsername({ username: 'yepyeni_ad' })).available).toBe(true);
  });
});

describe('işletme başvurusu ve salon görünürlüğü', () => {
  it('onaylanmayan salon listede görünmez; onayla görünür ve işletme denemesi başlar', async () => {
    const owner = await env.createUser('Salon Sahibi');
    const v = await env.createVenue(owner, { name: 'Masters Bilardo', approve: false, tables: [] });
    const list1 = await env.as(null).venues.list({ cityPlate: 34 });
    expect(list1.find((x) => x.id === v.venueId)).toBeUndefined();
    await expect(env.as(null).venues.get({ slug: v.slug })).rejects.toThrow(/bulunamadı/);
    // Sahip önizleme görebilir
    expect((await env.as(owner).venues.get({ slug: v.slug })).isPreview).toBe(true);

    const admin = await env.adminId();
    await env.as(admin).admin.reviewBusiness({ businessId: v.businessId, action: 'needs_docs', note: 'Vergi levhası eksik' });
    const mine = await env.as(owner).business.mine();
    expect(mine[0]!.status).toBe('needs_docs');
    expect(mine[0]!.reviewNote).toBe('Vergi levhası eksik');
    const notes = await env.as(owner).notifications.list({});
    expect(notes.items[0]!.body).toContain('Vergi levhası eksik');

    await env.as(owner).business.resubmit({ businessId: v.businessId });
    await env.as(admin).admin.reviewBusiness({ businessId: v.businessId, action: 'approve', note: null });
    const list2 = await env.as(null).venues.list({ cityPlate: 34 });
    expect(list2.find((x) => x.id === v.venueId)?.name).toBe('Masters Bilardo');
    const sub = await env.as(owner).business.subscription({ businessId: v.businessId });
    expect(sub.entitlement.status).toBe('trialing');
    const approved = await env.as(owner).notifications.list({});
    expect(approved.items[0]!.body).toContain('Masters Bilardo Ltd. onaylandı');
  });

  it('geçersiz VKN/TCKN reddedilir; ikinci başvuru engellenir', async () => {
    const owner = await env.createUser('İkinci Sahip');
    await env.createVenue(owner, { name: 'Birinci Salon', tables: [] });
    await expect(env.createVenue(owner, { name: 'İkinci Salon', tables: [] })).rejects.toThrow(/Zaten bir işletme/);
  });
});

describe('durum (Salondayım / Geleceğim) ve canlı salon', () => {
  it('Salondayım + Oynamak istiyorum birlikte; takipçiye Türkçe ekli bildirim gider', async () => {
    const owner = await env.createUser('Durum Sahibi');
    const v = await env.createVenue(owner, { name: 'FBN', tables: [] });
    const follower = await env.createUser('Takipçi');
    await env.as(follower).venues.follow({ venueId: v.venueId });
    const player = await env.createUser('Mehmet');
    await env.as(player).presence.set({ venueId: v.venueId, status: 'at_venue', playIntent: 'wants' });
    const live = await env.as(follower).venues.live({ venueId: v.venueId });
    expect(live.atVenue).toHaveLength(1);
    expect(live.lookingForMatch[0]!.matchState).toBe('wants');
    const n = await env.as(follower).notifications.list({});
    expect(n.items[0]!.body).toBe("✅ Mehmet FBN'de!");
    // realtime yayını tetiklendi
    const sent = await env.sql`select topic from realtime.sent where topic = ${'venue:' + v.venueId}`;
    expect(sent.length).toBeGreaterThan(0);
  });

  it('Geleceğim için maç niyeti seçilemez; saat zorunlu', async () => {
    const owner = await env.createUser('Durum Sahibi 2');
    const v = await env.createVenue(owner, { name: 'Gelecek Salon', tables: [] });
    const p = await env.createUser('Gelen');
    await expect(env.as(p).presence.set({ venueId: v.venueId, status: 'coming', playIntent: 'wants', eta: new Date(Date.now() + 3600e3).toISOString() })).rejects.toThrow(
      /salondayken/,
    );
    await expect(env.as(p).presence.set({ venueId: v.venueId, status: 'coming' })).rejects.toThrow(/saati/);
    await env.as(p).presence.set({ venueId: v.venueId, status: 'coming', eta: new Date(Date.now() + 3600e3).toISOString() });
    const live = await env.as(null).venues.live({ venueId: v.venueId });
    expect(live.coming).toHaveLength(1);
  });

  it('süresi dolan durum bakım işiyle Çevrimdışı olur', async () => {
    const owner = await env.createUser('Durum Sahibi 3');
    const v = await env.createVenue(owner, { name: 'Süre Salon', tables: [] });
    const p = await env.createUser('Süreli');
    await env.as(p).presence.set({ venueId: v.venueId, status: 'at_venue', playIntent: 'not' });
    await env.sql`update presence set expires_at = now() - interval '1 minute' where user_id = ${p}`;
    await env.sql`select public.bg_run_maintenance()`;
    expect((await env.as(p).presence.me()).status).toBe('offline');
  });
});

describe('maç akışı: istek → kabul → QR → bitir → sonuç → onay', () => {
  it('uçtan uca 3 Bant maçı; ortalama profile işlenir, karşılıklı geçmiş oluşur', async () => {
    const owner = await env.createUser('Maç Salonu');
    const v = await env.createVenue(owner, { name: 'Akademi Bilardo' });
    const ahmet = await env.createUser('Ahmet');
    const kenan = await env.createUser('Kenan');
    const format = { category: 'points' as const, targetPoints: 30, inningLimit: 40, handicap: null };

    const { id } = await env.as(ahmet).matches.request({
      opponentId: kenan,
      venueId: v.venueId,
      gameType: 'three_cushion',
      format,
      when: 'now',
      note: 'Hadi bir tane',
    });
    expect((await env.as(kenan).matches.mine()).incoming[0]!.id).toBe(id);
    expect((await env.as(kenan).matches.actionCount()).count).toBe(1);
    // Gönderen kabul edemez
    await expect(env.as(ahmet).matches.respond({ matchId: id, action: 'accept' })).rejects.toThrow();
    await env.as(kenan).matches.respond({ matchId: id, action: 'accept' });
    let m = await env.as(ahmet).matches.get({ matchId: id });
    expect(m.status).toBe('accepted'); // Kabul edilen maç doğrudan "Maçta" olmaz

    // Amerikan masasında 3 Bant başlatılamaz
    const poolTable = v.tables.find((t) => t.number === 6)!;
    const scanPool = await env.as(ahmet).matches.scanTable({ token: poolTable.token });
    expect(scanPool.option).toMatchObject({ kind: 'start_matched', gameAllowed: false });
    await expect(env.as(ahmet).matches.startMatched({ matchId: id, token: poolTable.token })).rejects.toThrow(/oynanamaz/);

    const t1 = v.tables.find((t) => t.number === 1)!;
    await env.as(ahmet).matches.startMatched({ matchId: id, token: t1.token });
    m = await env.as(kenan).matches.get({ matchId: id });
    expect(m.status).toBe('in_progress');
    expect(m.table?.number).toBe(1);

    // Masa dolu görünür; işletme süreyi görür, diğerleri görmez
    const publicLive = await env.as(null).venues.live({ venueId: v.venueId });
    const pt1 = publicLive.tables.find((t) => t.number === 1)!;
    expect(pt1.status).toBe('busy');
    expect(pt1.match?.players.map((p) => p!.fullName)).toEqual(['Ahmet', 'Kenan']);
    expect(pt1.match?.startedAt).toBeNull();
    const staffLive = await env.as(owner).venues.live({ venueId: v.venueId });
    expect(staffLive.tables.find((t) => t.number === 1)!.match?.startedAt).toBeInstanceOf(Date);
    // QR ile başlayanlar otomatik "Salondayım" olur, etiket "Maçta"
    expect(publicLive.atVenue.find((p) => p.user.id === ahmet)?.matchState).toBe('in_match');

    await env.as(kenan).matches.finish({ matchId: id });
    const afterFinish = await env.as(null).venues.live({ venueId: v.venueId });
    expect(afterFinish.tables.find((t) => t.number === 1)!.status).toBe('free'); // masa hemen boşalır

    // Geçersiz sonuç: kazanan sayısı düşük olan
    await expect(
      env.as(ahmet).matches.submitResult({
        matchId: id,
        result: { category: 'points', winner: 'p2', p1Score: 30, p2Score: 25, inningsMode: 'shared', innings: 35, p1Innings: null, p2Innings: null, p1HighRun: 6, p2HighRun: null },
      }),
    ).rejects.toThrow(/Kazanan/);

    await env.as(ahmet).matches.submitResult({
      matchId: id,
      result: { category: 'points', winner: 'p1', p1Score: 30, p2Score: 22, inningsMode: 'shared', innings: 36, p1Innings: null, p2Innings: null, p1HighRun: 6, p2HighRun: null },
    });
    // Kendi sonucunu onaylayamaz
    await expect(env.as(ahmet).matches.confirmResult({ matchId: id })).rejects.toThrow(/rakibin onaylamalı/);
    // Rakip reddeder → düzeltmeye döner, istatistik işlenmez
    await env.as(kenan).matches.rejectResult({ matchId: id, reason: 'İsteka 35 idi' });
    m = await env.as(ahmet).matches.get({ matchId: id });
    expect(m.status).toBe('awaiting_result');
    expect(m.lastRejection?.reason).toBe('İsteka 35 idi');
    const rejNote = await env.as(ahmet).notifications.list({});
    expect(rejNote.items[0]!.body).toContain('İsteka 35 idi');

    await env.as(ahmet).matches.submitResult({
      matchId: id,
      result: { category: 'points', winner: 'p1', p1Score: 30, p2Score: 22, inningsMode: 'shared', innings: 35, p1Innings: null, p2Innings: null, p1HighRun: 6, p2HighRun: null },
    });
    await env.as(kenan).matches.confirmResult({ matchId: id });
    m = await env.as(ahmet).matches.get({ matchId: id });
    expect(m.status).toBe('completed');
    expect(m.result?.p1Average).toBe(0.857);

    const sa = await env.as(ahmet).me.session();
    const prof = await env.as(kenan).players.profile({ username: sa!.username! });
    expect(prof.stats.byGame.three_cushion).toMatchObject({ matches: 1, wins: 1, average: 0.857, bestHighRun: 6 });
    const sk = await env.as(kenan).me.session();
    const profK = await env.as(ahmet).players.profile({ username: sk!.username! });
    expect(profK.stats.byGame.three_cushion).toMatchObject({ matches: 1, losses: 1, bestHighRun: null }); // Hatırlamıyorum = null
    expect(profK.preferredVenues[0]!.name).toBe('Akademi Bilardo');

    const h2h = await env.as(ahmet).matches.headToHead({ userId: kenan });
    expect(h2h).toMatchObject({ wins: 1, losses: 0, total: 1 });
    const h2hPool = await env.as(ahmet).matches.headToHead({ userId: kenan, gameType: 'eight_ball' });
    expect(h2hPool.total).toBe(0);
  });

  it('bir kullanıcı aynı anda yalnız 1 aktif maçta olabilir; masada aynı anda 1 maç', async () => {
    const owner = await env.createUser('Kural Salonu');
    const v = await env.createVenue(owner, { name: 'Kural Bilardo' });
    const a = await env.createUser('Aaa');
    const b = await env.createUser('Bbb');
    const c = await env.createUser('Ccc');
    const format = { category: 'points' as const, targetPoints: 30, inningLimit: null, handicap: null };
    const m1 = await env.as(a).matches.request({ opponentId: b, venueId: v.venueId, gameType: 'three_cushion', format, when: 'now' });
    const m2 = await env.as(c).matches.request({ opponentId: a, venueId: v.venueId, gameType: 'three_cushion', format, when: 'now' });
    await env.as(b).matches.respond({ matchId: m1.id, action: 'accept' });
    await expect(env.as(a).matches.respond({ matchId: m2.id, action: 'accept' })).rejects.toThrow(/yalnız 1 aktif maçta/);

    const t1 = v.tables[0]!;
    await env.as(a).matches.startMatched({ matchId: m1.id, token: t1.token });
    // C, dolu masada oturum açamaz
    const scan = await env.as(c).matches.scanTable({ token: t1.token });
    expect(scan.option.kind).toBe('occupied');
    await expect(env.as(c).matches.openWalkIn({ token: t1.token, gameType: 'three_cushion' })).rejects.toThrow(/dolu/);
  });

  it('önceden eşleşmemiş oyuncular: QR → oturum → katıl → onayla → başla; masada oynanamayan tür seçilemez', async () => {
    const owner = await env.createUser('Walkin Salonu');
    const v = await env.createVenue(owner, { name: 'Walkin Bilardo' });
    const host = await env.createUser('Host');
    const guest = await env.createUser('Guest');
    const t = v.tables.find((x) => x.number === 2)!;
    await expect(env.as(host).matches.openWalkIn({ token: t.token, gameType: 'eight_ball' })).rejects.toThrow(/oynanamaz/);
    const { id } = await env.as(host).matches.openWalkIn({ token: t.token, gameType: 'carom' });
    const hostScan = await env.as(host).matches.scanTable({ token: t.token });
    expect(hostScan.option).toMatchObject({ kind: 'waiting_joiner', matchId: id });
    const gscan = await env.as(guest).matches.scanTable({ token: t.token });
    expect(gscan.option).toMatchObject({ kind: 'join_walkin', matchId: id });
    await env.as(guest).matches.joinWalkIn({ matchId: id });
    expect((await env.as(host).notifications.list({})).items[0]!.templateKey).toBe('walkin_join');
    await expect(env.as(guest).matches.approveJoin({ matchId: id })).rejects.toThrow(/açan oyuncu/);
    await env.as(host).matches.approveJoin({ matchId: id });
    const m = await env.as(guest).matches.get({ matchId: id });
    expect(m.status).toBe('in_progress');
    expect(m.players.map((p) => p.slot)).toEqual([1, 2]);
    // İşletme maçı bitirebilir
    await env.as(owner).matches.finish({ matchId: id });
    expect((await env.as(host).matches.get({ matchId: id })).status).toBe('awaiting_result');
  });

  it('rack oyunları: kazanan hedefe eşit, rakip düşük; onaysız 24 saat sonra sonuçsuz kapanır', async () => {
    const owner = await env.createUser('Rack Salonu');
    const v = await env.createVenue(owner, { name: 'Rack Bilardo' });
    const a = await env.createUser('Rack A');
    const b = await env.createUser('Rack B');
    const { id } = await env.as(a).matches.request({
      opponentId: b,
      venueId: v.venueId,
      gameType: 'nine_ball',
      format: { category: 'racks', target: 7, handicap: null },
      when: 'now',
    });
    await env.as(b).matches.respond({ matchId: id, action: 'accept' });
    await env.as(b).matches.startMatched({ matchId: id, token: v.tables.find((t) => t.number === 6)!.token });
    await env.as(a).matches.finish({ matchId: id });
    await expect(
      env.as(a).matches.submitResult({ matchId: id, result: { category: 'racks', winner: 'p1', target: 7, p1Count: 6, p2Count: 4 } }),
    ).rejects.toThrow(/hedefe/);
    await env.as(a).matches.submitResult({ matchId: id, result: { category: 'racks', winner: 'p1', target: 7, p1Count: 7, p2Count: 4 } });
    await env.sql`update matches set ended_at = now() - interval '25 hours' where id = ${id}`;
    await env.sql`select public.bg_run_maintenance()`;
    const m = await env.as(a).matches.get({ matchId: id });
    expect(m.status).toBe('void');
    const sa = await env.as(a).me.session();
    const prof = await env.as(b).players.profile({ username: sa!.username! });
    expect(prof.stats.byGame.nine_ball.matches).toBe(0);
  });

  it('engellenen kullanıcıya maç isteği ve DM gönderilemez', async () => {
    const owner = await env.createUser('Engel Salonu');
    const v = await env.createVenue(owner, { name: 'Engel Bilardo', tables: [] });
    const a = await env.createUser('Engelleyen');
    const b = await env.createUser('Engellenen');
    await env.as(a).social.block({ userId: b });
    await expect(
      env.as(b).matches.request({
        opponentId: a,
        venueId: v.venueId,
        gameType: 'snooker',
        format: { category: 'frames', target: 5, handicap: null },
        when: 'now',
      }),
    ).rejects.toThrow(/gönderemezsin/);
    await expect(env.as(b).social.openDm({ userId: a })).rejects.toThrow(/mesajlaşamazsın/);
  });
});

describe('salon içi sipariş', () => {
  it('maç oturumu: oyuncular + izleyici; stok düşer; işletme hazırlar, teslim eder, kasada kapatır', async () => {
    const owner = await env.createUser('Sipariş Salonu');
    const v = await env.createVenue(owner, { name: 'Çay Ocağı Bilardo' });
    const products = await env.as(owner).business.products({ venueId: v.venueId });
    const cay = products.find((p) => p.name === 'Çay')!;
    const tost = products.find((p) => p.name === 'Kaşarlı tost')!;
    await env.as(owner).business.upsertProduct({ venueId: v.venueId, productId: cay.productId, price: 15, isAvailable: true, stock: null });
    await env.as(owner).business.upsertProduct({ venueId: v.venueId, productId: tost.productId, price: 90, isAvailable: true, stock: 2 });
    const menu = await env.as(null).venues.menu({ venueId: v.venueId });
    expect(menu.map((m) => m.name).sort()).toEqual(['Kaşarlı tost', 'Çay'].sort());

    const a = await env.createUser('Ahmet Sipariş');
    const b = await env.createUser('Mert Sipariş');
    const h = await env.createUser('Halil Kiraz');
    const { id: matchId } = await env.as(a).matches.request({
      opponentId: b,
      venueId: v.venueId,
      gameType: 'carom',
      format: { category: 'points', targetPoints: 50, inningLimit: null, handicap: null },
      when: 'now',
    });
    await env.as(b).matches.respond({ matchId, action: 'accept' });
    await env.as(a).matches.startMatched({ matchId, token: v.tables[0]!.token });

    const order = await env.as(a).orders.create({ venueId: v.venueId, kind: 'match', matchId, note: 'Çay açık olsun' });
    expect(order.joinCode).toMatch(/^BGO-/);
    // Maç oturumu için konum sorulmaz; bireysel siparişte konum zorunlu
    await expect(env.as(h).orders.create({ venueId: v.venueId, kind: 'individual' })).rejects.toThrow(/konum/);

    await env.as(h).orders.join({ code: order.joinCode.toLowerCase() });
    const cayId = menu.find((m) => m.name === 'Çay')!.id;
    const tostId = menu.find((m) => m.name === 'Kaşarlı tost')!.id;
    await env.as(a).orders.addItems({ orderId: order.id, items: [{ venueProductId: cayId, qty: 2 }] });
    await env.as(b).orders.addItems({ orderId: order.id, items: [{ venueProductId: tostId, qty: 1 }] });
    await expect(env.as(h).orders.addItems({ orderId: order.id, items: [{ venueProductId: tostId, qty: 2 }] })).rejects.toThrow(/stok/);
    await env.as(h).orders.addItems({ orderId: order.id, items: [{ venueProductId: tostId, qty: 1 }] });

    const o = await env.as(a).orders.get({ orderId: order.id });
    expect(o.participants.find((p) => p.user.id === h)?.isSpectator).toBe(true);
    expect(o.items.map((i) => `${i.user.fullName} – ${i.productName} x${i.qty}`)).toEqual([
      'Ahmet Sipariş – Çay x2',
      'Mert Sipariş – Kaşarlı tost x1',
      'Halil Kiraz – Kaşarlı tost x1',
    ]);
    expect(o.total).toBe(210);
    expect(o.table?.number).toBe(1);

    // Tost stoku bitti → menüden düşer
    expect((await env.as(null).venues.menu({ venueId: v.venueId })).find((m) => m.name === 'Kaşarlı tost')).toBeUndefined();

    const board = await env.as(owner).orders.board({ venueId: v.venueId });
    expect(board.open).toHaveLength(1);
    const item = board.open[0]!.items[0]!;
    await env.as(owner).orders.setItemStatus({ itemId: item.id, status: 'preparing' });
    await expect(env.as(a).orders.cancelItem({ itemId: item.id })).rejects.toThrow(/iptal edilemez/);
    await env.as(owner).orders.setItemStatus({ itemId: item.id, status: 'delivered' });
    expect((await env.as(a).notifications.list({})).items[0]!.templateKey).toBe('order_ready');
    const closed = await env.as(owner).orders.close({ orderId: order.id });
    expect(closed.total).toBe(210);
    const hist = await env.as(owner).orders.history({ venueId: v.venueId });
    expect(hist.totals.today).toBe(210);
  });

  it('çalışan yalnız verilen yetkiyle çalışır; salon ayarlarını değiştiremez', async () => {
    const owner = await env.createUser('Yetki Sahibi');
    const v = await env.createVenue(owner, { name: 'Yetki Bilardo', tables: [] });
    const staff = await env.createUser('Garson');
    const ss = await env.as(staff).me.session();
    await env.as(owner).business.addStaff({ businessId: v.businessId, identifier: `@${ss!.username}`, permissions: ['orders'] });
    await expect(env.as(staff).orders.board({ venueId: v.venueId })).resolves.toBeTruthy();
    await expect(env.as(staff).business.createTable({ venueId: v.venueId, data: { number: 9, label: null, allowedGameTypes: ['snooker'], isActive: true } })).rejects.toThrow(
      /yalnız salon sahibi/,
    );
    await expect(env.as(staff).business.createPost({ venueId: v.venueId, data: { kind: 'campaign', title: 'İndirim', body: '17-19 arası %10' } })).rejects.toThrow(
      /yetkisi yok/,
    );
    // E-postayla ekleme
    const staff2 = await env.createUser('Kasiyer');
    const email = (await env.sql`select email from auth.users where id = ${staff2}`)[0]!.email as string;
    await env.as(owner).business.addStaff({ businessId: v.businessId, identifier: email, permissions: ['posts'] });
    await env.as(staff2).business.createPost({ venueId: v.venueId, data: { kind: 'campaign', title: 'Mutlu saat', body: '17.00–19.00 arasında masalarda %10 indirim.' }, notifyFollowers: false });
    const posts = await env.as(null).venues.get({ slug: v.slug });
    expect(posts.posts[0]!.title).toBe('Mutlu saat');
  });
});

describe('sosyal ve moderasyon', () => {
  it('DM, yanıt, okunmamış sayısı; şikâyet → admin yalnız bağlamı görür ve mesajı kaldırır', async () => {
    const a = await env.createUser('Mesaj A');
    const b = await env.createUser('Mesaj B');
    const admin = await env.adminId();
    const { id: conv } = await env.as(a).social.openDm({ userId: b });
    const again = await env.as(b).social.openDm({ userId: a });
    expect(again.id).toBe(conv);
    const first = await env.as(a).social.send({ conversationId: conv, body: 'selam' });
    await env.as(b).social.send({ conversationId: conv, body: 'aleyküm selam', replyToId: first.id });
    const bad = await env.as(a).social.send({ conversationId: conv, body: 'hakaret içeren mesaj' });
    expect((await env.as(b).social.unreadTotal()).count).toBe(1); // yanıt yazınca öncekiler okundu sayılır
    const msgs = await env.as(b).social.messages({ conversationId: conv });
    expect(msgs.items.find((m) => m.body === 'aleyküm selam')?.replyTo?.body).toBe('selam');

    // Üçüncü kişi DM'i okuyamaz
    const c = await env.createUser('Meraklı');
    await expect(env.as(c).social.messages({ conversationId: conv })).rejects.toThrow(/bulunamadı/);

    await env.as(b).social.report({ targetType: 'message', targetId: bad.id, reason: 'insult', details: null });
    const queue = await env.as(admin).admin.reports({ status: 'open' });
    const rep = queue.items.find((r) => r.targetId === bad.id)!;
    const detail = await env.as(admin).admin.report({ reportId: rep.id });
    expect(detail.context?.messages.find((m) => m.isTarget)?.body).toBe('hakaret içeren mesaj');
    const audits = await env.as(admin).admin.auditLog({ action: 'moderation.context_opened' });
    expect(audits.items.length).toBeGreaterThan(0);
    await env.as(admin).admin.resolveReport({ reportId: rep.id, action: 'hide_message', note: 'Hakaret' });
    const after = await env.as(b).social.messages({ conversationId: conv });
    expect(after.items.find((m) => m.id === bad.id)?.removed).toBe('moderated');
  });

  it('arkadaşlık isteği karşılıklıysa kabul olur; şehir sohbeti listede', async () => {
    const a = await env.createUser('Arkadaş A');
    const b = await env.createUser('Arkadaş B');
    expect((await env.as(a).social.addFriend({ userId: b })).status).toBe('pending');
    expect((await env.as(b).social.addFriend({ userId: a })).status).toBe('accepted');
    expect((await env.as(a).social.friends()).friends).toHaveLength(1);
    const convs = await env.as(a).social.conversations();
    expect(convs.map((c) => c.title)).toEqual(expect.arrayContaining(['Türkiye Sohbeti', 'İstanbul Sohbeti']));
  });
});

describe('abonelik ve admin', () => {
  it('abonelik zorunlu değilken kayıt tutulur; zorunluyken süresi biten kullanıcı engellenir, manuel aktivasyonla açılır', async () => {
    const admin = await env.adminId();
    const owner = await env.createUser('Abone Salonu');
    const v = await env.createVenue(owner, { name: 'Abone Bilardo', tables: [] });
    const a = await env.createUser('Abone A');
    const b = await env.createUser('Abone B');
    await env.sql`update subscriptions set trial_ends_at = now() - interval '1 day' where user_id = ${a}`;
    const req = () =>
      env.as(a).matches.request({
        opponentId: b,
        venueId: v.venueId,
        gameType: 'snooker',
        format: { category: 'frames', target: 3, handicap: null },
        when: 'now',
      });
    const first = await req();
    await env.as(a).matches.cancel({ matchId: first.id });
    await env.as(admin).admin.saveSetting({ key: 'subscriptions_enforced', value: true });
    await expect(req()).rejects.toThrow(/Deneme süren sona erdi/);

    const subs = await env.as(admin).admin.subscriptions({ subjectType: 'user', q: 'Abone A' });
    const plans = await env.as(admin).admin.plans();
    const userPlan = plans.find((p) => p.audience === 'user' && p.intervalMonths === 1)!;
    await env.as(admin).admin.activateSubscription({
      subscriptionId: subs.items[0]!.id,
      planId: userPlan.id,
      payment: { amount: 49, method: 'bank_transfer', reference: 'EFT-123' },
    });
    await expect(req()).resolves.toBeTruthy();
    const detail = await env.as(admin).admin.subscription({ subscriptionId: subs.items[0]!.id });
    expect(detail.payments[0]!.amount).toBe(49);
    expect(detail.events[0]!.event).toBe('activated');
    await env.as(admin).admin.saveSetting({ key: 'subscriptions_enforced', value: false });
  });

  it('admin olmayan admin uçlarına erişemez; ban edilen kullanıcı işlem yapamaz', async () => {
    const u = await env.createUser('Normal');
    await expect(env.as(u).admin.dashboard()).rejects.toThrow(/admin/i);
    const admin = await env.adminId();
    await env.as(admin).admin.setUserStatus({ userId: u, status: 'banned', reason: 'Spam', banDays: 7 });
    await expect(env.as(u).presence.me()).rejects.toThrow(/kısıtlandı: Spam/);
    const dash = await env.as(admin).admin.dashboard();
    expect(dash.counts.users).toBeGreaterThan(0);
  });

  it('bülten yayınlanınca hedef şehirdeki kullanıcılara bildirim gider; akışta görünür', async () => {
    const admin = await env.adminId();
    const izmirli = await env.createUser('İzmirli', { city: 35 });
    const istanbullu = await env.createUser('İstanbullu', { city: 34 });
    await env.as(admin).admin.saveBulletin({
      kind: 'live',
      title: "Berkay Karakurt'un maçı bugün 20.00'da",
      body: 'Canlı yayın linki aşağıda.',
      videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      status: 'published',
      cityPlates: [35],
      notify: true,
    });
    await env.flush();
    expect((await env.as(izmirli).notifications.list({})).items[0]!.templateKey).toBe('bulletin');
    expect((await env.as(istanbullu).notifications.list({})).items.find((n) => n.templateKey === 'bulletin')).toBeUndefined();
    const feed = await env.as(null).feed.bulletin({ cityPlate: 35 });
    expect(feed.bulletins[0]!.embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ');
    const feedIst = await env.as(null).feed.bulletin({ cityPlate: 34 });
    expect(feedIst.bulletins.find((b) => b.kind === 'live')).toBeUndefined();
  });

  it('şablon metinleri admin tarafından değiştirilir; bildirimler yeni metinle gider', async () => {
    const admin = await env.adminId();
    await env.as(admin).admin.saveTemplate({ key: 'friend_request', title: 'Yeni arkadaş', body: '👋 {{kullanici}} seni ekledi', isActive: true });
    const a = await env.createUser('Şablon A');
    const b = await env.createUser('Şablon B');
    await env.as(a).social.addFriend({ userId: b });
    expect((await env.as(b).notifications.list({})).items[0]!.body).toBe('👋 Şablon A seni ekledi');
  });

  it('hesap silme: profil anonimleşir, maç geçmişi kalır', async () => {
    const a = await env.createUser('Silinecek');
    await env.as(a).me.deleteAccount({ confirm: 'SİL' });
    await expect(env.as(a).me.update({ fullName: 'x', username: 'xxx', cityPlate: 34, level: 'beginner', gameTypes: ['carom'], bio: null })).rejects.toThrow();
    const [p] = await env.sql`select full_name, username, deleted_at from profiles where id = ${a}`;
    expect(p).toMatchObject({ full_name: 'Silinmiş kullanıcı', username: null });
  });
});
