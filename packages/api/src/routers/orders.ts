import {
  and,
  businesses,
  catalogProducts,
  desc,
  eq,
  gte,
  inArray,
  lt,
  matchPlayers,
  matches,
  ne,
  orderItems,
  orderParticipants,
  orders,
  sql,
  venueProducts,
  venueTables,
  venues,
  type DbOrTx,
} from '@bilardogo/db';
import { generateJoinCode, normalizeJoinCode, orderCreateSchema, orderItemsSchema } from '@bilardogo/domain';
import { z } from 'zod';
import { getVenueAccess, requireVenueAccess } from '../lib/access';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors';
import { rateLimit } from '../lib/rate-limit';
import { getUserSummaries } from '../lib/users';
import { visibleVenueWhere } from '../lib/venue-queries';
import { notify } from '../services/notify';
import { entitledProcedure, protectedProcedure, router } from '../trpc';

const uid = z.string().uuid();

type OrderRow = typeof orders.$inferSelect;

async function hydrateOrders(ctx: { db: DbOrTx; services: { storage: { publicUrl: (p: string) => string } } }, rows: OrderRow[]) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [items, parts, tables, venueRows] = await Promise.all([
    ctx.db.select().from(orderItems).where(inArray(orderItems.orderId, ids)).orderBy(orderItems.createdAt),
    ctx.db.select().from(orderParticipants).where(inArray(orderParticipants.orderId, ids)).orderBy(orderParticipants.joinedAt),
    ctx.db
      .select({ id: venueTables.id, number: venueTables.number })
      .from(venueTables)
      .where(inArray(venueTables.id, rows.map((r) => r.tableId).filter((x): x is string => !!x).concat([]))),
    ctx.db.select({ id: venues.id, name: venues.name, slug: venues.slug }).from(venues).where(inArray(venues.id, [...new Set(rows.map((r) => r.venueId))])),
  ]);
  const users = await getUserSummaries(
    ctx.db,
    [...parts.map((p) => p.userId), ...items.map((i) => i.userId)],
    ctx.services.storage.publicUrl,
  );
  return rows.map((o) => {
    const its = items.filter((i) => i.orderId === o.id);
    const live = its.filter((i) => i.status !== 'cancelled');
    return {
      id: o.id,
      kind: o.kind,
      status: o.status,
      joinCode: o.joinCode,
      locationText: o.locationText,
      note: o.note,
      matchId: o.matchId,
      table: tables.find((t) => t.id === o.tableId) ?? null,
      venue: venueRows.find((v) => v.id === o.venueId)!,
      createdBy: o.createdBy,
      createdAt: o.createdAt,
      closedAt: o.closedAt,
      total: o.total !== null ? Number(o.total) : live.reduce((a, i) => a + Number(i.unitPrice) * i.qty, 0),
      participants: parts
        .filter((p) => p.orderId === o.id)
        .map((p) => ({ user: users.get(p.userId)!, isSpectator: p.isSpectator, joinedAt: p.joinedAt })),
      items: its.map((i) => ({
        id: i.id,
        user: users.get(i.userId)!,
        productName: i.productName,
        unitPrice: Number(i.unitPrice),
        qty: i.qty,
        note: i.note,
        status: i.status,
        createdAt: i.createdAt,
      })),
    };
  });
}

export type HydratedOrder = Awaited<ReturnType<typeof hydrateOrders>>[number];

async function insertOrderWithCode(tx: DbOrTx, values: Omit<typeof orders.$inferInsert, 'joinCode'>) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateJoinCode();
    const clash = await tx.select({ id: orders.id }).from(orders).where(and(eq(orders.joinCode, code), eq(orders.status, 'open')));
    if (clash.length) continue;
    const [row] = await tx.insert(orders).values({ ...values, joinCode: code }).returning();
    return row!;
  }
  throw new Error('Katılım kodu üretilemedi');
}

async function requireParticipant(db: DbOrTx, orderId: string, userId: string) {
  const [o] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!o) notFound('Sipariş');
  const [p] = await db
    .select()
    .from(orderParticipants)
    .where(and(eq(orderParticipants.orderId, orderId), eq(orderParticipants.userId, userId)));
  if (!p) notFound('Sipariş');
  return o;
}

export const ordersRouter = router({
  // ───────────────────────────────────────────── Kullanıcı
  /** Açık siparişlerim (katıldığım oturumlar dahil). */
  myOpen: protectedProcedure.input(z.object({ venueId: uid.optional() }).optional()).query(async ({ ctx, input }) => {
    const rows = await ctx.db
      .select({ o: orders })
      .from(orderParticipants)
      .innerJoin(orders, eq(orders.id, orderParticipants.orderId))
      .where(
        and(
          eq(orderParticipants.userId, ctx.profile.id),
          eq(orders.status, 'open'),
          input?.venueId ? eq(orders.venueId, input.venueId) : undefined,
        ),
      )
      .orderBy(desc(orders.createdAt));
    return hydrateOrders(ctx, rows.map((r) => r.o));
  }),

  myHistory: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ o: orders })
      .from(orderParticipants)
      .innerJoin(orders, eq(orders.id, orderParticipants.orderId))
      .where(and(eq(orderParticipants.userId, ctx.profile.id), ne(orders.status, 'open')))
      .orderBy(desc(orders.createdAt))
      .limit(20);
    return hydrateOrders(ctx, rows.map((r) => r.o));
  }),

  get: protectedProcedure.input(z.object({ orderId: uid })).query(async ({ ctx, input }) => {
    const [o] = await ctx.db.select().from(orders).where(eq(orders.id, input.orderId));
    if (!o) notFound('Sipariş');
    const [p] = await ctx.db
      .select()
      .from(orderParticipants)
      .where(and(eq(orderParticipants.orderId, o.id), eq(orderParticipants.userId, ctx.profile.id)));
    if (!p && !(await getVenueAccess(ctx.db, ctx.profile.id, o.venueId))) notFound('Sipariş');
    const [h] = await hydrateOrders(ctx, [o]);
    return h!;
  }),

  /**
   * Üç kullanım şekli: maç oturumu (masadaki oyuncular; konum sorulmaz, yalnız not), bireysel sipariş ve
   * kodla katılınan grup sipariş oturumu. BilardoGo ödeme almaz; ödeme kasada yapılır.
   */
  create: entitledProcedure.input(orderCreateSchema).mutation(async ({ ctx, input }) => {
    const me = ctx.profile.id;
    await rateLimit(ctx.db, `order_create:${me}`, 20, 3600);
    const [venue] = await ctx.db
      .select({ id: venues.id })
      .from(venues)
      .innerJoin(businesses, eq(businesses.id, venues.businessId))
      .where(and(eq(venues.id, input.venueId), visibleVenueWhere));
    if (!venue) notFound('Salon');

    if (input.kind === 'match') {
      if (!input.matchId) badRequest('Maç seçilmedi.');
      const [m] = await ctx.db.select().from(matches).where(eq(matches.id, input.matchId));
      if (!m || m.venueId !== venue.id) notFound('Maç');
      if (!['in_progress', 'accepted', 'waiting_opponent'].includes(m.status)) badRequest('Maç oturumu yalnız devam eden maçlar için açılır.');
      const players = await ctx.db.select().from(matchPlayers).where(eq(matchPlayers.matchId, m.id));
      if (!players.some((p) => p.userId === me)) forbidden('Bu maçın oyuncusu değilsin.');
      const [existing] = await ctx.db.select().from(orders).where(and(eq(orders.matchId, m.id), eq(orders.status, 'open')));
      if (existing) {
        if (input.note) await ctx.db.update(orders).set({ note: input.note }).where(eq(orders.id, existing.id));
        return { id: existing.id, joinCode: existing.joinCode };
      }
      const o = await ctx.db.transaction(async (tx) => {
        const row = await insertOrderWithCode(tx, {
          venueId: venue.id,
          kind: 'match',
          matchId: m.id,
          tableId: m.tableId,
          note: input.note ?? null,
          createdBy: me,
        });
        await tx
          .insert(orderParticipants)
          .values(players.map((p) => ({ orderId: row.id, userId: p.userId, isSpectator: false })))
          .onConflictDoNothing();
        return row;
      });
      return { id: o.id, joinCode: o.joinCode };
    }

    const o = await ctx.db.transaction(async (tx) => {
      const row = await insertOrderWithCode(tx, {
        venueId: venue.id,
        kind: input.kind,
        locationText: input.locationText ?? null,
        note: input.note ?? null,
        createdBy: me,
      });
      await tx.insert(orderParticipants).values({ orderId: row.id, userId: me, isSpectator: false });
      return row;
    });
    return { id: o.id, joinCode: o.joinCode };
  }),

  /** Kodla sipariş oturumuna katıl. Maçı izleyen kişi masa oturumuna katılırsa "İzleyici" olarak işaretlenir. */
  join: entitledProcedure.input(z.object({ code: z.string().min(4).max(12) })).mutation(async ({ ctx, input }) => {
    const code = normalizeJoinCode(input.code);
    await rateLimit(ctx.db, `order_join:${ctx.profile.id}`, 30, 3600);
    const [o] = await ctx.db.select().from(orders).where(and(eq(orders.joinCode, code), eq(orders.status, 'open')));
    if (!o) notFound('Açık sipariş oturumu');
    if (o.kind === 'individual') badRequest('Bireysel siparişe katılınamaz.');
    let isSpectator = false;
    if (o.kind === 'match' && o.matchId) {
      const players = await ctx.db.select().from(matchPlayers).where(eq(matchPlayers.matchId, o.matchId));
      isSpectator = !players.some((p) => p.userId === ctx.profile.id);
    }
    await ctx.db
      .insert(orderParticipants)
      .values({ orderId: o.id, userId: ctx.profile.id, isSpectator })
      .onConflictDoNothing();
    return { id: o.id };
  }),

  leave: protectedProcedure.input(z.object({ orderId: uid })).mutation(async ({ ctx, input }) => {
    const o = await requireParticipant(ctx.db, input.orderId, ctx.profile.id);
    const mine = await ctx.db
      .select({ id: orderItems.id })
      .from(orderItems)
      .where(and(eq(orderItems.orderId, o.id), eq(orderItems.userId, ctx.profile.id), ne(orderItems.status, 'cancelled')));
    if (mine.length) badRequest('Siparişin olan bir oturumdan ayrılamazsın; ödeme kasada kapatılınca oturum biter.');
    await ctx.db
      .delete(orderParticipants)
      .where(and(eq(orderParticipants.orderId, o.id), eq(orderParticipants.userId, ctx.profile.id)));
    return { ok: true };
  }),

  /** Sipariş listesi "Ahmet – Çay x2" gibi kişi bazında görünür; fiyat sipariş anında kopyalanır. */
  addItems: entitledProcedure.input(orderItemsSchema).mutation(async ({ ctx, input }) => {
    const me = ctx.profile.id;
    await rateLimit(ctx.db, `order_items:${me}`, 60, 3600);
    const o = await requireParticipant(ctx.db, input.orderId, me);
    if (o.status !== 'open') badRequest('Bu sipariş oturumu kapandı.');
    await ctx.db.transaction(async (tx) => {
      const ids = input.items.map((i) => i.venueProductId);
      const products = await tx
        .select({ vp: venueProducts, name: catalogProducts.name, active: catalogProducts.isActive })
        .from(venueProducts)
        .innerJoin(catalogProducts, eq(catalogProducts.id, venueProducts.productId))
        .where(and(inArray(venueProducts.id, ids), eq(venueProducts.venueId, o.venueId)))
        .for('update', { of: venueProducts });
      for (const item of input.items) {
        const p = products.find((x) => x.vp.id === item.venueProductId);
        if (!p || !p.vp.isAvailable || !p.active) badRequest('Seçilen ürün şu an mevcut değil.');
        if (p.vp.stock !== null) {
          if (p.vp.stock < item.qty) badRequest(`${p.name} için yeterli stok yok (kalan ${p.vp.stock}).`);
          await tx
            .update(venueProducts)
            .set({ stock: sql`${venueProducts.stock} - ${item.qty}` })
            .where(eq(venueProducts.id, p.vp.id));
          p.vp.stock -= item.qty;
        }
        await tx.insert(orderItems).values({
          orderId: o.id,
          userId: me,
          venueProductId: p.vp.id,
          productName: p.name,
          unitPrice: p.vp.price,
          qty: item.qty,
          note: item.note ?? null,
        });
      }
    });
    return { ok: true };
  }),

  /** Hazırlanmaya başlanmamış kendi kalemini iptal eder. */
  cancelItem: protectedProcedure.input(z.object({ itemId: uid })).mutation(async ({ ctx, input }) => {
    await ctx.db.transaction(async (tx) => {
      const [i] = await tx.select().from(orderItems).where(eq(orderItems.id, input.itemId)).for('update');
      if (!i || i.userId !== ctx.profile.id) notFound('Ürün');
      if (i.status !== 'pending') badRequest('Hazırlanmaya başlanan ürün iptal edilemez; salona danış.');
      await tx.update(orderItems).set({ status: 'cancelled' }).where(eq(orderItems.id, i.id));
      if (i.venueProductId) {
        await tx
          .update(venueProducts)
          .set({ stock: sql`case when ${venueProducts.stock} is null then null else ${venueProducts.stock} + ${i.qty} end` })
          .where(eq(venueProducts.id, i.venueProductId));
      }
    });
    return { ok: true };
  }),

  /** Aktif maçım için açık bir maç sipariş oturumu var mı? */
  forMatch: protectedProcedure.input(z.object({ matchId: uid })).query(async ({ ctx, input }) => {
    const [o] = await ctx.db.select().from(orders).where(and(eq(orders.matchId, input.matchId), eq(orders.status, 'open')));
    return o ? { id: o.id, joinCode: o.joinCode } : null;
  }),

  // ───────────────────────────────────────────── İşletme (sipariş yetkili çalışan)
  board: protectedProcedure.input(z.object({ venueId: uid })).query(async ({ ctx, input }) => {
    await requireVenueAccess(ctx.db, ctx.profile.id, input.venueId, 'orders');
    const open = await ctx.db
      .select()
      .from(orders)
      .where(and(eq(orders.venueId, input.venueId), eq(orders.status, 'open')))
      .orderBy(desc(orders.createdAt));
    const since = new Date(Date.now() - 12 * 3600_000);
    const closed = await ctx.db
      .select()
      .from(orders)
      .where(and(eq(orders.venueId, input.venueId), ne(orders.status, 'open'), gte(orders.updatedAt, since)))
      .orderBy(desc(orders.closedAt))
      .limit(30);
    const [openH, closedH] = await Promise.all([hydrateOrders(ctx, open), hydrateOrders(ctx, closed)]);
    return { open: openH, recentlyClosed: closedH };
  }),

  setItemStatus: protectedProcedure
    .input(z.object({ itemId: uid, status: z.enum(['preparing', 'delivered', 'cancelled']) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db
        .select({ item: orderItems, order: orders })
        .from(orderItems)
        .innerJoin(orders, eq(orders.id, orderItems.orderId))
        .where(eq(orderItems.id, input.itemId));
      if (!row) notFound('Ürün');
      await requireVenueAccess(ctx.db, ctx.profile.id, row.order.venueId, 'orders');
      if (row.order.status !== 'open') badRequest('Sipariş kapanmış.');
      if (row.item.status === 'cancelled' || row.item.status === 'delivered') {
        if (input.status !== row.item.status) badRequest('Bu ürünün durumu artık değiştirilemez.');
        return { ok: true };
      }
      await ctx.db.transaction(async (tx) => {
        await tx
          .update(orderItems)
          .set({ status: input.status, handledBy: ctx.profile.id })
          .where(eq(orderItems.id, row.item.id));
        if (input.status === 'cancelled' && row.item.venueProductId) {
          await tx
            .update(venueProducts)
            .set({ stock: sql`case when ${venueProducts.stock} is null then null else ${venueProducts.stock} + ${row.item.qty} end` })
            .where(eq(venueProducts.id, row.item.venueProductId));
        }
      });
      if (input.status === 'delivered') {
        const [v] = await ctx.db.select({ name: venues.name }).from(venues).where(eq(venues.id, row.order.venueId));
        await notify(ctx, 'order_ready', [row.item.userId], { salon: v?.name ?? '' }, { link: '/siparis' });
      }
      return { ok: true };
    }),

  /** Ödeme kasada tamamlanınca işletme siparişi kapatır ve geçmişe kaydeder. */
  close: protectedProcedure.input(z.object({ orderId: uid })).mutation(async ({ ctx, input }) => {
    const [o] = await ctx.db.select().from(orders).where(eq(orders.id, input.orderId));
    if (!o) notFound('Sipariş');
    await requireVenueAccess(ctx.db, ctx.profile.id, o.venueId, 'orders');
    if (o.status !== 'open') conflict('Sipariş zaten kapatılmış.');
    const [sum] = await ctx.db.execute<{ total: string }>(sql`
      select coalesce(sum(unit_price * qty), 0)::text as total from order_items
       where order_id = ${o.id} and status <> 'cancelled'
    `);
    await ctx.db
      .update(orders)
      .set({ status: 'closed', closedBy: ctx.profile.id, closedAt: new Date(), total: sum?.total ?? '0' })
      .where(eq(orders.id, o.id));
    await ctx.db
      .update(orderItems)
      .set({ status: 'delivered' })
      .where(and(eq(orderItems.orderId, o.id), inArray(orderItems.status, ['pending', 'preparing'])));
    return { ok: true, total: Number(sum?.total ?? 0) };
  }),

  cancel: protectedProcedure.input(z.object({ orderId: uid })).mutation(async ({ ctx, input }) => {
    const [o] = await ctx.db.select().from(orders).where(eq(orders.id, input.orderId));
    if (!o) notFound('Sipariş');
    const access = await getVenueAccess(ctx.db, ctx.profile.id, o.venueId);
    const isCreator = o.createdBy === ctx.profile.id;
    if (!access && !isCreator) forbidden();
    if (o.status !== 'open') conflict('Sipariş zaten kapatılmış.');
    if (!access) {
      const started = await ctx.db
        .select({ id: orderItems.id })
        .from(orderItems)
        .where(and(eq(orderItems.orderId, o.id), inArray(orderItems.status, ['preparing', 'delivered'])));
      if (started.length) badRequest('Hazırlanan ürün olan sipariş iptal edilemez; salona danış.');
    }
    await ctx.db.transaction(async (tx) => {
      const items = await tx
        .select()
        .from(orderItems)
        .where(and(eq(orderItems.orderId, o.id), inArray(orderItems.status, ['pending', 'preparing'])));
      for (const i of items) {
        if (i.venueProductId) {
          await tx
            .update(venueProducts)
            .set({ stock: sql`case when ${venueProducts.stock} is null then null else ${venueProducts.stock} + ${i.qty} end` })
            .where(eq(venueProducts.id, i.venueProductId));
        }
      }
      await tx
        .update(orderItems)
        .set({ status: 'cancelled' })
        .where(and(eq(orderItems.orderId, o.id), inArray(orderItems.status, ['pending', 'preparing'])));
      await tx
        .update(orders)
        .set({ status: 'cancelled', closedBy: ctx.profile.id, closedAt: new Date(), total: '0' })
        .where(eq(orders.id, o.id));
    });
    return { ok: true };
  }),

  history: protectedProcedure
    .input(z.object({ venueId: uid, cursor: z.string().datetime({ offset: true }).optional() }))
    .query(async ({ ctx, input }) => {
      await requireVenueAccess(ctx.db, ctx.profile.id, input.venueId, 'orders');
      const rows = await ctx.db
        .select()
        .from(orders)
        .where(
          and(
            eq(orders.venueId, input.venueId),
            ne(orders.status, 'open'),
            input.cursor ? lt(orders.closedAt, new Date(input.cursor)) : undefined,
          ),
        )
        .orderBy(desc(orders.closedAt))
        .limit(31);
      const items = await hydrateOrders(ctx, rows.slice(0, 30));
      const [totals] = await ctx.db.execute<{ today: string; month: string }>(sql`
        select
          coalesce(sum(total) filter (where closed_at >= date_trunc('day', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'), 0)::text as today,
          coalesce(sum(total) filter (where closed_at >= date_trunc('month', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'), 0)::text as month
          from orders where venue_id = ${input.venueId} and status = 'closed'
      `);
      return {
        items,
        nextCursor: rows.length > 30 ? items[items.length - 1]?.closedAt?.toISOString() ?? null : null,
        totals: { today: Number(totals?.today ?? 0), month: Number(totals?.month ?? 0) },
      };
    }),
});
