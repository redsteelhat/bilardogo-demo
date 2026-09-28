import {
  adStats,
  ads,
  and,
  appSettings,
  auditLog,
  bulletins,
  businessDocuments,
  businessMembers,
  businesses,
  catalogProducts,
  conversations,
  count,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  legalDocuments,
  lt,
  matchPlayers,
  matchResults,
  matches,
  messages,
  notificationTemplates,
  or,
  payments,
  plans,
  presence,
  profiles,
  reports,
  sql,
  subscriptionEvents,
  subscriptions,
  venueTables,
  venues,
  type Database,
  type DbOrTx,
} from '@bilardogo/db';
import {
  adSchema,
  bulletinSchema,
  consentKinds,
  DEFAULT_TEMPLATES,
  maskTaxId,
  PRESENCE_DEFAULTS,
  renderTemplate,
  templateVariables,
  type NotificationTemplateKey,
} from '@bilardogo/domain';
import { z } from 'zod';
import { audit } from '../lib/audit';
import { getEntitlement, getSetting } from '../lib/entitlements';
import { badRequest, notFound } from '../lib/errors';
import { recomputeStats } from '../lib/stats';
import { assertOwnedPath, buildUploadPath, resolveMediaUrl, uploadRequestSchema } from '../lib/storage';
import { getUserSummaries, toUserSummary, userSummaryColumns } from '../lib/users';
import { notify } from '../services/notify';
import type { Services } from '../services/types';
import { adminProcedure, router } from '../trpc';

const uid = z.string().uuid();
const page = z.object({ page: z.number().int().min(1).default(1), pageSize: z.number().int().min(5).max(100).default(25) });

/** Bülten bildirimini hedef şehirlerdeki (ya da tüm) kullanıcılara parça parça gönderir. */
export async function dispatchBulletinNotification(ctx: { db: Database | DbOrTx; services: Services }, bulletinId: string) {
  const [b] = await ctx.db.select().from(bulletins).where(eq(bulletins.id, bulletinId));
  if (!b || b.status !== 'published' || !b.notify || b.notifiedAt) return 0;
  await ctx.db.update(bulletins).set({ notifiedAt: new Date() }).where(eq(bulletins.id, b.id));
  let sent = 0;
  let cursor = '00000000-0000-0000-0000-000000000000';
  for (;;) {
    const rows = await ctx.db
      .select({ id: profiles.id })
      .from(profiles)
      .where(
        and(
          isNull(profiles.deletedAt),
          eq(profiles.status, 'active'),
          sql`${profiles.id} > ${cursor}`,
          b.cityPlates.length ? inArray(profiles.cityPlate, b.cityPlates) : undefined,
        ),
      )
      .orderBy(profiles.id)
      .limit(1000);
    if (rows.length === 0) break;
    sent += await notify(ctx, 'bulletin', rows.map((r) => r.id), { baslik: b.title }, { link: `/bulten/${b.id}` });
    cursor = rows[rows.length - 1]!.id;
  }
  return sent;
}

/** Planlanan ve yayına girmiş, bildirimi bekleyen bültenler (cron). */
export async function dispatchPendingBulletins(ctx: { db: Database; services: Services }) {
  const pending = await ctx.db
    .select({ id: bulletins.id })
    .from(bulletins)
    .where(and(eq(bulletins.status, 'published'), eq(bulletins.notify, true), isNull(bulletins.notifiedAt)));
  let total = 0;
  for (const p of pending) total += await dispatchBulletinNotification(ctx, p.id);
  return total;
}

async function subscriptionEvent(
  db: DbOrTx,
  subscriptionId: string,
  event: string,
  actorId: string,
  from: typeof subscriptions.$inferSelect['status'] | null,
  to: typeof subscriptions.$inferSelect['status'] | null,
  periodEnd: Date | null,
  note?: string | null,
) {
  await db.insert(subscriptionEvents).values({ subscriptionId, event, actorId, fromStatus: from, toStatus: to, periodEnd, note: note ?? null });
}

function addMonths(d: Date, months: number) {
  const x = new Date(d);
  x.setMonth(x.getMonth() + months);
  return x;
}

const SETTINGS_SCHEMAS = {
  trial_days: z.number().int().min(0).max(365),
  subscriptions_enforced: z.boolean(),
  presence: z.object({
    atVenueHours: z.number().min(1).max(24),
    comingGraceHours: z.number().min(0).max(6),
    maxComingAheadHours: z.number().min(1).max(48),
  }),
  support: z.object({ email: z.string().email().nullable(), whatsapp: z.string().max(30).nullable() }),
  chat: z.object({ maxImageMb: z.number().min(1).max(10), maxVideoMb: z.number().min(1).max(50) }),
} as const;

export const adminRouter = router({
  dashboard: adminProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db.execute<Record<string, number>>(sql`
      select
        (select count(*)::int from profiles where deleted_at is null) as users,
        (select count(*)::int from profiles where created_at > now() - interval '7 days') as new_users_7d,
        (select count(*)::int from presence where status = 'at_venue' and expires_at > now()) as at_venue_now,
        (select count(*)::int from businesses where status in ('pending')) as businesses_pending,
        (select count(*)::int from businesses where status = 'needs_docs') as businesses_needs_docs,
        (select count(*)::int from venues v join businesses b on b.id = v.business_id where b.status = 'approved' and v.state = 'active') as venues_active,
        (select count(*)::int from matches where status = 'in_progress') as matches_live,
        (select count(*)::int from matches where status = 'completed' and completed_at > now() - interval '24 hours') as matches_completed_24h,
        (select count(*)::int from reports where status = 'open') as reports_open,
        (select count(*)::int from subscriptions where status = 'trialing') as subs_trialing,
        (select count(*)::int from subscriptions where status = 'active') as subs_active,
        (select count(*)::int from subscriptions where status in ('past_due', 'expired')) as subs_lapsed,
        (select count(*)::int from orders where status = 'open') as orders_open
    `);
    const signups = await ctx.db.execute<{ day: string; n: number }>(sql`
      select d::date::text as day, (select count(*)::int from profiles p where p.created_at::date = d::date) as n
        from generate_series(now()::date - 13, now()::date, '1 day') d order by d
    `);
    return { counts: row ?? {}, signups: [...signups] };
  }),

  // ───────────────────────────────────────────── Kullanıcılar
  users: adminProcedure
    .input(
      page.extend({
        q: z.string().trim().max(80).optional(),
        status: z.enum(['active', 'passive', 'banned']).optional(),
        role: z.enum(['user', 'admin']).optional(),
        cityPlate: z.number().int().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = and(
        isNull(profiles.deletedAt),
        input.status ? eq(profiles.status, input.status) : undefined,
        input.role ? eq(profiles.role, input.role) : undefined,
        input.cityPlate ? eq(profiles.cityPlate, input.cityPlate) : undefined,
        input.q ? or(ilike(profiles.username, `%${input.q}%`), ilike(profiles.fullName, `%${input.q}%`)) : undefined,
      );
      const [total] = await ctx.db.select({ n: count() }).from(profiles).where(where);
      const rows = await ctx.db
        .select({ ...userSummaryColumns, status: profiles.status, role: profiles.role, createdAt: profiles.createdAt, subStatus: subscriptions.status, trialEndsAt: subscriptions.trialEndsAt, periodEnd: subscriptions.currentPeriodEnd })
        .from(profiles)
        .leftJoin(subscriptions, eq(subscriptions.userId, profiles.id))
        .where(where)
        .orderBy(desc(profiles.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);
      return {
        total: total?.n ?? 0,
        items: rows.map((r) => ({
          user: toUserSummary(r, ctx.services.storage.publicUrl),
          status: r.status,
          role: r.role,
          createdAt: r.createdAt,
          subscription: r.subStatus ? { status: r.subStatus, endsAt: r.subStatus === 'trialing' ? r.trialEndsAt : r.periodEnd } : null,
        })),
      };
    }),

  user: adminProcedure.input(z.object({ userId: uid })).query(async ({ ctx, input }) => {
    const [p] = await ctx.db.select().from(profiles).where(eq(profiles.id, input.userId));
    if (!p) notFound('Kullanıcı');
    const [email, sub, reportCount, memberships, stats] = await Promise.all([
      ctx.services.authAdmin.getEmail(p.id),
      ctx.db.select().from(subscriptions).where(eq(subscriptions.userId, p.id)),
      ctx.db.select({ n: count() }).from(reports).where(and(eq(reports.targetType, 'user'), eq(reports.targetId, p.id))),
      ctx.db
        .select({ id: businesses.id, legalName: businesses.legalName, status: businesses.status, role: businessMembers.role })
        .from(businessMembers)
        .innerJoin(businesses, eq(businesses.id, businessMembers.businessId))
        .where(eq(businessMembers.userId, p.id)),
      ctx.db.execute<{ matches: number; wins: number }>(sql`
        select coalesce(sum(matches), 0)::int as matches, coalesce(sum(wins), 0)::int as wins from player_stats where user_id = ${p.id}
      `),
    ]);
    const subRow = sub[0];
    const subPayments = subRow ? await ctx.db.select().from(payments).where(eq(payments.subscriptionId, subRow.id)).orderBy(desc(payments.paidAt)) : [];
    return {
      profile: { ...p, avatarUrl: resolveMediaUrl(ctx.services.storage.publicUrl, p.avatarPath) },
      email,
      subscription: subRow ?? null,
      entitlement: await getEntitlement(ctx.db, { userId: p.id }),
      payments: subPayments.map((x) => ({ ...x, amount: Number(x.amount) })),
      reportsAgainst: reportCount[0]?.n ?? 0,
      businesses: memberships,
      stats: stats[0] ?? { matches: 0, wins: 0 },
    };
  }),

  /** Aktif / pasif / ban (kısıtlama). */
  setUserStatus: adminProcedure
    .input(
      z.object({
        userId: uid,
        status: z.enum(['active', 'passive', 'banned']),
        reason: z.string().trim().max(300).nullable().optional(),
        banDays: z.number().int().min(1).max(3650).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.profile.id) badRequest('Kendi hesabının durumunu değiştiremezsin.');
      const bannedUntil = input.status === 'banned' && input.banDays ? new Date(Date.now() + input.banDays * 86400_000) : null;
      await ctx.db
        .update(profiles)
        .set({ status: input.status, statusReason: input.reason ?? null, bannedUntil })
        .where(eq(profiles.id, input.userId));
      if (input.status !== 'active') {
        await ctx.db
          .update(presence)
          .set({ status: 'offline', venueId: null, playIntent: null, expiresAt: null, eta: null })
          .where(eq(presence.userId, input.userId));
      }
      await audit(ctx.db, ctx.profile.id, `user.status.${input.status}`, { type: 'user', id: input.userId }, { reason: input.reason, banDays: input.banDays });
      return { ok: true };
    }),

  setUserRole: adminProcedure.input(z.object({ userId: uid, role: z.enum(['user', 'admin']) })).mutation(async ({ ctx, input }) => {
    if (input.userId === ctx.profile.id) badRequest('Kendi rolünü değiştiremezsin.');
    await ctx.db.update(profiles).set({ role: input.role }).where(eq(profiles.id, input.userId));
    await audit(ctx.db, ctx.profile.id, 'user.role', { type: 'user', id: input.userId }, { role: input.role });
    return { ok: true };
  }),

  // ───────────────────────────────────────────── İşletmeler
  businesses: adminProcedure
    .input(page.extend({ status: z.enum(['pending', 'needs_docs', 'approved', 'rejected']).optional(), q: z.string().trim().max(80).optional() }))
    .query(async ({ ctx, input }) => {
      const where = and(
        input.status ? eq(businesses.status, input.status) : undefined,
        input.q ? or(ilike(businesses.legalName, `%${input.q}%`), ilike(businesses.taxId, `%${input.q}%`)) : undefined,
      );
      const [total] = await ctx.db.select({ n: count() }).from(businesses).where(where);
      const rows = await ctx.db
        .select({ b: businesses, ownerName: profiles.fullName, ownerUsername: profiles.username })
        .from(businesses)
        .innerJoin(profiles, eq(profiles.id, businesses.ownerId))
        .where(where)
        .orderBy(sql`case ${businesses.status} when 'pending' then 0 when 'needs_docs' then 1 else 2 end`, desc(businesses.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);
      const ids = rows.map((r) => r.b.id);
      const venueRows = ids.length
        ? await ctx.db.select({ id: venues.id, name: venues.name, businessId: venues.businessId, cityPlate: venues.cityPlate }).from(venues).where(inArray(venues.businessId, ids))
        : [];
      const subs = ids.length ? await ctx.db.select().from(subscriptions).where(inArray(subscriptions.businessId, ids)) : [];
      return {
        total: total?.n ?? 0,
        items: rows.map((r) => ({
          id: r.b.id,
          legalName: r.b.legalName,
          taxIdMasked: maskTaxId(r.b.taxId),
          status: r.b.status,
          isActive: r.b.isActive,
          createdAt: r.b.createdAt,
          owner: { name: r.ownerName, username: r.ownerUsername },
          venues: venueRows.filter((v) => v.businessId === r.b.id),
          subscriptionStatus: subs.find((s) => s.businessId === r.b.id)?.status ?? null,
        })),
      };
    }),

  /** İşletme detayı: belgeler (imzalı bağlantı), VKN/TCKN, salonlar, üyeler, abonelik ve ödeme geçmişi. */
  business: adminProcedure.input(z.object({ businessId: uid })).query(async ({ ctx, input }) => {
    const [b] = await ctx.db.select().from(businesses).where(eq(businesses.id, input.businessId));
    if (!b) notFound('İşletme');
    const [docs, venueRows, members, sub] = await Promise.all([
      ctx.db.select().from(businessDocuments).where(eq(businessDocuments.businessId, b.id)).orderBy(desc(businessDocuments.createdAt)),
      ctx.db.select().from(venues).where(eq(venues.businessId, b.id)),
      ctx.db
        .select({ ...userSummaryColumns, role: businessMembers.role, permissions: businessMembers.permissions })
        .from(businessMembers)
        .innerJoin(profiles, eq(profiles.id, businessMembers.userId))
        .where(eq(businessMembers.businessId, b.id)),
      ctx.db.select().from(subscriptions).where(eq(subscriptions.businessId, b.id)),
    ]);
    const signed = docs.length ? await ctx.services.storage.createSignedReads('business-docs', docs.map((d) => d.storagePath), 900) : {};
    const subRow = sub[0];
    const [pays, events] = subRow
      ? await Promise.all([
          ctx.db.select().from(payments).where(eq(payments.subscriptionId, subRow.id)).orderBy(desc(payments.paidAt)),
          ctx.db.select().from(subscriptionEvents).where(eq(subscriptionEvents.subscriptionId, subRow.id)).orderBy(desc(subscriptionEvents.createdAt)),
        ])
      : [[], []];
    const ownerEmail = await ctx.services.authAdmin.getEmail(b.ownerId);
    await audit(ctx.db, ctx.profile.id, 'business.viewed', { type: 'business', id: b.id });
    return {
      business: b,
      ownerEmail,
      documents: docs.map((d) => ({ ...d, url: signed[d.storagePath] ?? null })),
      venues: venueRows,
      members: members.map((m) => ({ user: toUserSummary(m, ctx.services.storage.publicUrl), role: m.role, permissions: m.permissions })),
      subscription: subRow ?? null,
      entitlement: await getEntitlement(ctx.db, { businessId: b.id }),
      payments: pays.map((p) => ({ ...p, amount: Number(p.amount) })),
      events,
    };
  }),

  /** Başvuruyu onaylar, ek belge ister veya reddeder. Onayda 30 günlük işletme denemesi başlar. */
  reviewBusiness: adminProcedure
    .input(z.object({ businessId: uid, action: z.enum(['approve', 'needs_docs', 'reject']), note: z.string().trim().max(500).nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (input.action !== 'approve' && !input.note) badRequest('Ek belge / ret için açıklama yazın.');
      const status = input.action === 'approve' ? 'approved' : input.action === 'needs_docs' ? 'needs_docs' : 'rejected';
      const b = await ctx.db.transaction(async (tx) => {
        const [b] = await tx
          .update(businesses)
          .set({ status, reviewNote: input.note ?? null, reviewedBy: ctx.profile.id, reviewedAt: new Date() })
          .where(eq(businesses.id, input.businessId))
          .returning();
        if (!b) notFound('İşletme');
        if (status === 'approved') {
          const trialDays = await getSetting<number>(tx, 'trial_days', 30);
          const [existing] = await tx.select().from(subscriptions).where(eq(subscriptions.businessId, b.id));
          if (!existing) {
            const [s] = await tx
              .insert(subscriptions)
              .values({
                subjectType: 'business',
                businessId: b.id,
                status: 'trialing',
                trialStartedAt: new Date(),
                trialEndsAt: new Date(Date.now() + trialDays * 86400_000),
              })
              .returning();
            await subscriptionEvent(tx, s!.id, 'trial_started', ctx.profile.id, null, 'trialing', s!.trialEndsAt, `${trialDays} gün ücretsiz deneme`);
          }
          const vs = await tx.select({ id: venues.id }).from(venues).where(eq(venues.businessId, b.id));
          for (const v of vs) await tx.insert(conversations).values({ type: 'venue', venueId: v.id }).onConflictDoNothing();
        }
        await audit(tx, ctx.profile.id, `business.${input.action}`, { type: 'business', id: b.id }, { note: input.note });
        return b;
      });
      const key: NotificationTemplateKey =
        status === 'approved' ? 'business_approved' : status === 'needs_docs' ? 'business_needs_docs' : 'business_rejected';
      await notify(ctx, key, [b.ownerId], { isletme: b.legalName, not: input.note ?? '' }, { link: '/isletme' });
      const email = await ctx.services.authAdmin.getEmail(b.ownerId);
      if (email && ctx.services.email.enabled) {
        const [tpl] = await ctx.db.select().from(notificationTemplates).where(eq(notificationTemplates.key, key));
        if (tpl) {
          const vars = { isletme: b.legalName, not: input.note ?? '' };
          ctx.services.defer(() =>
            ctx.services.email.send(
              email,
              renderTemplate(tpl.title, vars),
              `<p>${renderTemplate(tpl.body, vars)}</p><p><a href="${ctx.services.appUrl}/isletme">İşletme paneline git</a></p>`,
            ),
          );
        }
      }
      return { ok: true };
    }),

  setBusinessActive: adminProcedure.input(z.object({ businessId: uid, isActive: z.boolean() })).mutation(async ({ ctx, input }) => {
    await ctx.db.update(businesses).set({ isActive: input.isActive }).where(eq(businesses.id, input.businessId));
    await audit(ctx.db, ctx.profile.id, input.isActive ? 'business.activated' : 'business.deactivated', { type: 'business', id: input.businessId });
    return { ok: true };
  }),

  // ───────────────────────────────────────────── Salonlar / masalar
  venues: adminProcedure
    .input(page.extend({ cityPlate: z.number().int().optional(), q: z.string().trim().max(80).optional() }))
    .query(async ({ ctx, input }) => {
      const where = and(
        input.cityPlate ? eq(venues.cityPlate, input.cityPlate) : undefined,
        input.q ? ilike(venues.name, `%${input.q}%`) : undefined,
      );
      const [total] = await ctx.db.select({ n: count() }).from(venues).where(where);
      const rows = await ctx.db
        .select({ v: venues, bstatus: businesses.status, bactive: businesses.isActive, legalName: businesses.legalName })
        .from(venues)
        .innerJoin(businesses, eq(businesses.id, venues.businessId))
        .where(where)
        .orderBy(venues.name)
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);
      const ids = rows.map((r) => r.v.id);
      const live = ids.length
        ? await ctx.db.execute<{ venue_id: string; tables: number; busy: number; at_venue: number }>(sql`
            select v.id as venue_id,
              (select count(*)::int from venue_tables t where t.venue_id = v.id and t.is_active) as tables,
              (select count(*)::int from matches m where m.venue_id = v.id and m.status in ('waiting_opponent', 'in_progress')) as busy,
              (select count(*)::int from presence p where p.venue_id = v.id and p.status = 'at_venue' and p.expires_at > now()) as at_venue
            from venues v where v.id in ${ids}
          `)
        : [];
      return {
        total: total?.n ?? 0,
        items: rows.map((r) => {
          const l = live.find((x) => x.venue_id === r.v.id);
          return {
            id: r.v.id,
            name: r.v.name,
            slug: r.v.slug,
            cityPlate: r.v.cityPlate,
            district: r.v.district,
            state: r.v.state,
            businessStatus: r.bstatus,
            businessActive: r.bactive,
            legalName: r.legalName,
            tables: l?.tables ?? 0,
            busyTables: l?.busy ?? 0,
            atVenue: l?.at_venue ?? 0,
          };
        }),
      };
    }),

  venueTables: adminProcedure.input(z.object({ venueId: uid })).query(async ({ ctx, input }) => {
    const tables = await ctx.db.select().from(venueTables).where(eq(venueTables.venueId, input.venueId)).orderBy(venueTables.number);
    const active = await ctx.db
      .select()
      .from(matches)
      .where(and(eq(matches.venueId, input.venueId), inArray(matches.status, ['waiting_opponent', 'in_progress'])));
    const players = active.length ? await ctx.db.select().from(matchPlayers).where(inArray(matchPlayers.matchId, active.map((m) => m.id))) : [];
    const users = await getUserSummaries(ctx.db, players.map((p) => p.userId), ctx.services.storage.publicUrl);
    return tables.map((t) => {
      const m = active.find((a) => a.tableId === t.id);
      return {
        ...t,
        match: m
          ? {
              id: m.id,
              gameType: m.gameType,
              status: m.status,
              startedAt: m.startedAt ?? m.createdAt,
              players: players.filter((p) => p.matchId === m.id).map((p) => users.get(p.userId)!),
            }
          : null,
      };
    });
  }),

  setVenueState: adminProcedure.input(z.object({ venueId: uid, state: z.enum(['active', 'passive']) })).mutation(async ({ ctx, input }) => {
    await ctx.db.update(venues).set({ state: input.state }).where(eq(venues.id, input.venueId));
    await audit(ctx.db, ctx.profile.id, `venue.${input.state}`, { type: 'venue', id: input.venueId });
    return { ok: true };
  }),

  // ───────────────────────────────────────────── Maç moderasyonu
  matches: adminProcedure
    .input(page.extend({ status: z.enum(['in_progress', 'awaiting_result', 'pending_confirmation', 'completed', 'void']).optional() }))
    .query(async ({ ctx, input }) => {
      const where = input.status ? eq(matches.status, input.status) : undefined;
      const rows = await ctx.db
        .select({ m: matches, venueName: venues.name })
        .from(matches)
        .innerJoin(venues, eq(venues.id, matches.venueId))
        .where(where)
        .orderBy(desc(matches.updatedAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);
      const ids = rows.map((r) => r.m.id);
      const players = ids.length ? await ctx.db.select().from(matchPlayers).where(inArray(matchPlayers.matchId, ids)) : [];
      const results = ids.length
        ? await ctx.db.select().from(matchResults).where(and(inArray(matchResults.matchId, ids), inArray(matchResults.status, ['submitted', 'confirmed'])))
        : [];
      const users = await getUserSummaries(ctx.db, players.map((p) => p.userId), ctx.services.storage.publicUrl);
      return rows.map((r) => ({
        id: r.m.id,
        status: r.m.status,
        gameType: r.m.gameType,
        venueName: r.venueName,
        updatedAt: r.m.updatedAt,
        players: players.filter((p) => p.matchId === r.m.id).sort((a, b) => a.slot - b.slot).map((p) => users.get(p.userId)!),
        result: results.find((x) => x.matchId === r.m.id) ?? null,
      }));
    }),

  /** Yanıltıcı skor vb. durumlarda maçı sonuçsuz kapatır; istatistikler yeniden hesaplanır. */
  voidMatch: adminProcedure.input(z.object({ matchId: uid, reason: z.string().trim().min(3).max(300) })).mutation(async ({ ctx, input }) => {
    await ctx.db.transaction(async (tx) => {
      const [m] = await tx.select().from(matches).where(eq(matches.id, input.matchId)).for('update');
      if (!m) notFound('Maç');
      if (['declined', 'cancelled', 'expired', 'void'].includes(m.status)) badRequest('Maç zaten kapanmış.');
      await tx.update(matches).set({ status: 'void', statusReason: `admin:${input.reason}`, endedAt: m.endedAt ?? new Date() }).where(eq(matches.id, m.id));
      await tx
        .update(matchResults)
        .set({ status: 'voided' })
        .where(and(eq(matchResults.matchId, m.id), inArray(matchResults.status, ['submitted', 'confirmed'])));
      const players = await tx.select().from(matchPlayers).where(eq(matchPlayers.matchId, m.id));
      for (const p of players) await recomputeStats(tx, p.userId, m.gameType);
      await audit(tx, ctx.profile.id, 'match.voided', { type: 'match', id: m.id }, { reason: input.reason });
    });
    return { ok: true };
  }),

  // ───────────────────────────────────────────── Bülten / duyurular (yalnız admin)
  bulletins: adminProcedure.input(z.object({ status: z.enum(['draft', 'scheduled', 'published', 'archived']).optional() })).query(async ({ ctx, input }) => {
    const rows = await ctx.db
      .select()
      .from(bulletins)
      .where(input.status ? eq(bulletins.status, input.status) : undefined)
      .orderBy(desc(bulletins.updatedAt))
      .limit(200);
    return rows.map((b) => ({ ...b, mediaUrl: resolveMediaUrl(ctx.services.storage.publicUrl, b.mediaPath) }));
  }),

  bulletinMediaUpload: adminProcedure.input(uploadRequestSchema).mutation(async ({ ctx, input }) => {
    const { path, mediaType } = buildUploadPath('bulletins', input, 'image_or_video');
    return { ...(await ctx.services.storage.createSignedUpload('public-media', path)), mediaType };
  }),

  saveBulletin: adminProcedure.input(bulletinSchema.and(z.object({ id: uid.optional() }))).mutation(async ({ ctx, input }) => {
    assertOwnedPath(input.mediaPath, 'bulletins');
    if (input.status === 'scheduled' && !input.publishAt) badRequest('Planlanan içerik için yayın tarihi seçin.');
    const values = {
      kind: input.kind,
      title: input.title,
      body: input.body,
      mediaPath: input.mediaPath ?? null,
      mediaType: input.mediaPath ? (input.mediaType ?? 'image') : null,
      videoUrl: input.videoUrl ?? null,
      status: input.status,
      publishAt: input.publishAt ? new Date(input.publishAt) : null,
      cityPlates: input.cityPlates,
      notify: input.notify,
    };
    let id = input.id;
    if (id) {
      const [cur] = await ctx.db.select().from(bulletins).where(eq(bulletins.id, id));
      if (!cur) notFound('İçerik');
      await ctx.db
        .update(bulletins)
        .set({ ...values, publishedAt: input.status === 'published' ? (cur.publishedAt ?? new Date()) : cur.publishedAt })
        .where(eq(bulletins.id, id));
    } else {
      const [row] = await ctx.db
        .insert(bulletins)
        .values({ ...values, createdBy: ctx.profile.id, publishedAt: input.status === 'published' ? new Date() : null })
        .returning({ id: bulletins.id });
      id = row!.id;
    }
    await audit(ctx.db, ctx.profile.id, 'bulletin.saved', { type: 'bulletin', id }, { status: input.status });
    if (input.status === 'published' && input.notify) {
      const bid = id;
      ctx.services.defer(() => dispatchBulletinNotification(ctx, bid));
    }
    return { id };
  }),

  setBulletinStatus: adminProcedure
    .input(z.object({ id: uid, status: z.enum(['draft', 'published', 'archived']) }))
    .mutation(async ({ ctx, input }) => {
      const [b] = await ctx.db
        .update(bulletins)
        .set({ status: input.status, publishedAt: input.status === 'published' ? sql`coalesce(${bulletins.publishedAt}, now())` : undefined })
        .where(eq(bulletins.id, input.id))
        .returning();
      if (!b) notFound('İçerik');
      if (input.status === 'published' && b.notify && !b.notifiedAt) ctx.services.defer(() => dispatchBulletinNotification(ctx, b.id));
      return { ok: true };
    }),

  deleteBulletin: adminProcedure.input(z.object({ id: uid })).mutation(async ({ ctx, input }) => {
    const [b] = await ctx.db.delete(bulletins).where(eq(bulletins.id, input.id)).returning();
    if (b?.mediaPath) ctx.services.defer(() => ctx.services.storage.remove('public-media', [b.mediaPath!]));
    await audit(ctx.db, ctx.profile.id, 'bulletin.deleted', { type: 'bulletin', id: input.id });
    return { ok: true };
  }),

  // ───────────────────────────────────────────── Reklam / sponsor
  ads: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.select().from(ads).orderBy(desc(ads.createdAt));
    const stats = await ctx.db
      .select({ adId: adStats.adId, impressions: sql<number>`sum(${adStats.impressions})::int`, clicks: sql<number>`sum(${adStats.clicks})::int` })
      .from(adStats)
      .groupBy(adStats.adId);
    const now = new Date();
    return rows.map((a) => ({
      ...a,
      logoUrl: resolveMediaUrl(ctx.services.storage.publicUrl, a.logoPath),
      mediaUrl: resolveMediaUrl(ctx.services.storage.publicUrl, a.mediaPath),
      impressions: stats.find((s) => s.adId === a.id)?.impressions ?? 0,
      clicks: stats.find((s) => s.adId === a.id)?.clicks ?? 0,
      live: a.isActive && a.startsAt <= now && a.endsAt > now,
    }));
  }),

  adMediaUpload: adminProcedure.input(uploadRequestSchema).mutation(async ({ ctx, input }) => {
    const { path, mediaType } = buildUploadPath('ads', input, 'image_or_video');
    return { ...(await ctx.services.storage.createSignedUpload('public-media', path)), mediaType };
  }),

  saveAd: adminProcedure.input(adSchema.and(z.object({ id: uid.optional() }))).mutation(async ({ ctx, input }) => {
    assertOwnedPath(input.mediaPath, 'ads');
    assertOwnedPath(input.logoPath, 'ads');
    if (input.scope === 'city' && input.cityPlates.length === 0) badRequest('İl bazlı reklam için en az bir il seçin.');
    if (new Date(input.endsAt) <= new Date(input.startsAt)) badRequest('Bitiş tarihi başlangıçtan sonra olmalı.');
    const values = {
      brand: input.brand,
      logoPath: input.logoPath ?? null,
      product: input.product ?? null,
      priceText: input.priceText ?? null,
      body: input.body ?? null,
      mediaPath: input.mediaPath ?? null,
      mediaType: input.mediaPath ? (input.mediaType ?? 'image') : null,
      link: input.link ?? null,
      contact: input.contact ?? null,
      scope: input.scope,
      cityPlates: input.scope === 'city' ? input.cityPlates : [],
      placements: input.placements,
      startsAt: new Date(input.startsAt),
      endsAt: new Date(input.endsAt),
      isActive: input.isActive,
    };
    if (input.id) {
      await ctx.db.update(ads).set(values).where(eq(ads.id, input.id));
      await audit(ctx.db, ctx.profile.id, 'ad.updated', { type: 'ad', id: input.id });
      return { id: input.id };
    }
    const [row] = await ctx.db.insert(ads).values({ ...values, createdBy: ctx.profile.id }).returning({ id: ads.id });
    await audit(ctx.db, ctx.profile.id, 'ad.created', { type: 'ad', id: row!.id });
    return { id: row!.id };
  }),

  deleteAd: adminProcedure.input(z.object({ id: uid })).mutation(async ({ ctx, input }) => {
    await ctx.db.delete(ads).where(eq(ads.id, input.id));
    await audit(ctx.db, ctx.profile.id, 'ad.deleted', { type: 'ad', id: input.id });
    return { ok: true };
  }),

  adDaily: adminProcedure.input(z.object({ adId: uid })).query(async ({ ctx, input }) => {
    return ctx.db.select().from(adStats).where(eq(adStats.adId, input.adId)).orderBy(adStats.day);
  }),

  // ───────────────────────────────────────────── Moderasyon
  reports: adminProcedure
    .input(page.extend({ status: z.enum(['open', 'actioned', 'dismissed']).default('open'), targetType: z.enum(['user', 'message', 'venue']).optional() }))
    .query(async ({ ctx, input }) => {
      const where = and(eq(reports.status, input.status), input.targetType ? eq(reports.targetType, input.targetType) : undefined);
      const [total] = await ctx.db.select({ n: count() }).from(reports).where(where);
      const rows = await ctx.db
        .select()
        .from(reports)
        .where(where)
        .orderBy(desc(reports.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);
      const users = await getUserSummaries(ctx.db, rows.map((r) => r.reporterId), ctx.services.storage.publicUrl);
      return { total: total?.n ?? 0, items: rows.map((r) => ({ ...r, reporter: users.get(r.reporterId) ?? null })) };
    }),

  /**
   * Şikâyet detayı. Admin normal şartlarda özel mesajları okuyamaz; yalnız şikâyet edilen mesajın
   * çevresindeki gerekli bağlam (±10 mesaj) açılır ve her açılış denetim kaydına yazılır.
   */
  report: adminProcedure.input(z.object({ reportId: uid })).query(async ({ ctx, input }) => {
    const [r] = await ctx.db.select().from(reports).where(eq(reports.id, input.reportId));
    if (!r) notFound('Şikâyet');
    const reporter = (await getUserSummaries(ctx.db, [r.reporterId], ctx.services.storage.publicUrl)).get(r.reporterId) ?? null;
    let context: {
      conversationType: string | null;
      messages: { id: string; sender: ReturnType<typeof toUserSummary> | null; body: string; mediaUrl: string | null; mediaType: string | null; createdAt: Date; isTarget: boolean; hidden: boolean; deleted: boolean }[];
    } | null = null;
    let targetUser: ReturnType<typeof toUserSummary> | null = null;
    let targetVenue: { id: string; name: string; slug: string } | null = null;
    if (r.targetType === 'message') {
      const [m] = await ctx.db.select().from(messages).where(eq(messages.id, r.targetId));
      if (m) {
        const [c] = await ctx.db.select().from(conversations).where(eq(conversations.id, m.conversationId));
        const before = await ctx.db
          .select()
          .from(messages)
          .where(and(eq(messages.conversationId, m.conversationId), lt(messages.createdAt, m.createdAt)))
          .orderBy(desc(messages.createdAt))
          .limit(10);
        const after = await ctx.db
          .select()
          .from(messages)
          .where(and(eq(messages.conversationId, m.conversationId), gte(messages.createdAt, m.createdAt)))
          .orderBy(messages.createdAt)
          .limit(11);
        const list = [...before.reverse(), ...after];
        const users = await getUserSummaries(ctx.db, list.map((x) => x.senderId), ctx.services.storage.publicUrl);
        const media = list.filter((x) => x.mediaPath).map((x) => x.mediaPath!);
        const signed = media.length ? await ctx.services.storage.createSignedReads('chat-media', media, 600) : {};
        context = {
          conversationType: c?.type ?? null,
          messages: list.map((x) => ({
            id: x.id,
            sender: users.get(x.senderId) ?? null,
            body: x.body,
            mediaUrl: x.mediaPath ? (signed[x.mediaPath] ?? null) : null,
            mediaType: x.mediaType,
            createdAt: x.createdAt,
            isTarget: x.id === m.id,
            hidden: x.hiddenByModeration,
            deleted: !!x.deletedAt,
          })),
        };
        targetUser = users.get(m.senderId) ?? null;
        await audit(ctx.db, ctx.profile.id, 'moderation.context_opened', { type: 'report', id: r.id }, { conversationId: m.conversationId, conversationType: c?.type });
      }
    } else if (r.targetType === 'user') {
      targetUser = (await getUserSummaries(ctx.db, [r.targetId], ctx.services.storage.publicUrl)).get(r.targetId) ?? null;
    } else {
      const [v] = await ctx.db.select({ id: venues.id, name: venues.name, slug: venues.slug }).from(venues).where(eq(venues.id, r.targetId));
      targetVenue = v ?? null;
    }
    const [others] = targetUser
      ? await ctx.db.execute<{ n: number }>(sql`
          select count(*)::int as n from reports
           where (target_type = 'user' and target_id = ${targetUser.id})
              or (target_type = 'message' and snapshot ->> 'senderId' = ${targetUser.id}::text)
        `)
      : [{ n: 0 }];
    return { report: r, reporter, context, targetUser, targetVenue, reportsAgainstTarget: others?.n ?? 0 };
  }),

  /** Şikâyeti sonuçlandır: içerik kaldırma, kullanıcıyı kısıtlama / banlama veya reddetme. */
  resolveReport: adminProcedure
    .input(
      z.object({
        reportId: uid,
        action: z.enum(['dismiss', 'hide_message', 'ban_user', 'passive_venue', 'warn']),
        note: z.string().trim().max(500).nullable().optional(),
        banDays: z.number().int().min(1).max(3650).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const [r] = await tx.select().from(reports).where(eq(reports.id, input.reportId)).for('update');
        if (!r) notFound('Şikâyet');
        let targetUserId: string | null = r.targetType === 'user' ? r.targetId : null;
        if (r.targetType === 'message') {
          const [m] = await tx.select().from(messages).where(eq(messages.id, r.targetId));
          targetUserId = m?.senderId ?? null;
          if (input.action === 'hide_message' || input.action === 'ban_user') {
            await tx.update(messages).set({ hiddenByModeration: true }).where(eq(messages.id, r.targetId));
          }
        }
        if (input.action === 'ban_user') {
          if (!targetUserId) badRequest('Banlanacak kullanıcı bulunamadı.');
          await tx
            .update(profiles)
            .set({
              status: 'banned',
              statusReason: input.note ?? 'Topluluk kuralları ihlali',
              bannedUntil: input.banDays ? new Date(Date.now() + input.banDays * 86400_000) : null,
            })
            .where(eq(profiles.id, targetUserId));
        }
        if (input.action === 'passive_venue' && r.targetType === 'venue') {
          await tx.update(venues).set({ state: 'passive' }).where(eq(venues.id, r.targetId));
        }
        const status = input.action === 'dismiss' ? 'dismissed' : 'actioned';
        // Aynı hedefe ait açık şikâyetleri birlikte kapat
        await tx
          .update(reports)
          .set({ status, handledBy: ctx.profile.id, handledAt: new Date(), resolutionNote: input.note ?? input.action })
          .where(and(eq(reports.targetType, r.targetType), eq(reports.targetId, r.targetId), eq(reports.status, 'open')));
        await audit(tx, ctx.profile.id, `moderation.${input.action}`, { type: r.targetType, id: r.targetId }, { reportId: r.id, note: input.note, banDays: input.banDays });
      });
      return { ok: true };
    }),

  // ───────────────────────────────────────────── Bildirim şablonları
  templates: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.select().from(notificationTemplates).orderBy(notificationTemplates.key);
    return rows.map((t) => ({
      ...t,
      variables: templateVariables(`${t.title} ${DEFAULT_TEMPLATES[t.key as NotificationTemplateKey]?.body ?? t.body}`),
      defaultTitle: DEFAULT_TEMPLATES[t.key as NotificationTemplateKey]?.title ?? null,
      defaultBody: DEFAULT_TEMPLATES[t.key as NotificationTemplateKey]?.body ?? null,
    }));
  }),

  saveTemplate: adminProcedure
    .input(z.object({ key: z.string().max(60), title: z.string().trim().min(1).max(120), body: z.string().trim().min(1).max(500), isActive: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [t] = await ctx.db
        .update(notificationTemplates)
        .set({ title: input.title, body: input.body, isActive: input.isActive, updatedBy: ctx.profile.id })
        .where(eq(notificationTemplates.key, input.key))
        .returning();
      if (!t) notFound('Şablon');
      await audit(ctx.db, ctx.profile.id, 'template.updated', { type: 'template', id: input.key });
      return { ok: true };
    }),

  previewTemplate: adminProcedure
    .input(z.object({ title: z.string().max(120), body: z.string().max(500), vars: z.record(z.string(), z.string()) }))
    .query(({ input }) => ({ title: renderTemplate(input.title, input.vars), body: renderTemplate(input.body, input.vars) })),

  testTemplate: adminProcedure.input(z.object({ key: z.string().max(60), vars: z.record(z.string(), z.string()) })).mutation(async ({ ctx, input }) => {
    const n = await notify(ctx, input.key as NotificationTemplateKey, [ctx.profile.id], input.vars, { link: '/bildirimler' });
    return { sent: n };
  }),

  // ───────────────────────────────────────────── Ürün kataloğu
  catalog: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.select().from(catalogProducts).orderBy(catalogProducts.category, catalogProducts.sort);
    const usage = await ctx.db.execute<{ product_id: string; n: number }>(sql`select product_id, count(*)::int as n from venue_products group by product_id`);
    return rows.map((r) => ({
      ...r,
      imageUrl: resolveMediaUrl(ctx.services.storage.publicUrl, r.imagePath),
      venueCount: usage.find((u) => u.product_id === r.id)?.n ?? 0,
    }));
  }),

  catalogImageUpload: adminProcedure.input(uploadRequestSchema).mutation(async ({ ctx, input }) => {
    const { path } = buildUploadPath('catalog', input, 'image');
    return ctx.services.storage.createSignedUpload('public-media', path);
  }),

  saveCatalogProduct: adminProcedure
    .input(
      z.object({
        id: uid.optional(),
        name: z.string().trim().min(2).max(80),
        category: z.enum(['hot_drink', 'cold_drink', 'food', 'snack', 'other']),
        imagePath: z.string().max(300).nullable(),
        isActive: z.boolean(),
        sort: z.number().int().min(0).max(10000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertOwnedPath(input.imagePath, 'catalog');
      const { id, ...values } = input;
      if (id) {
        await ctx.db.update(catalogProducts).set(values).where(eq(catalogProducts.id, id));
        return { id };
      }
      const [row] = await ctx.db.insert(catalogProducts).values(values).returning({ id: catalogProducts.id });
      return { id: row!.id };
    }),

  // ───────────────────────────────────────────── Abonelik (manuel)
  plans: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.select().from(plans).orderBy(plans.audience, plans.price);
    return rows.map((p) => ({ ...p, price: Number(p.price) }));
  }),

  savePlan: adminProcedure
    .input(
      z.object({
        id: uid.optional(),
        audience: z.enum(['user', 'business']),
        name: z.string().trim().min(2).max(80),
        description: z.string().trim().max(300).nullable(),
        price: z.number().min(0).max(1_000_000),
        intervalMonths: z.number().int().min(1).max(36),
        isActive: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, price, ...rest } = input;
      const values = { ...rest, price: price.toFixed(2) };
      if (id) {
        await ctx.db.update(plans).set(values).where(eq(plans.id, id));
        return { id };
      }
      const [row] = await ctx.db.insert(plans).values(values).returning({ id: plans.id });
      return { id: row!.id };
    }),

  subscriptions: adminProcedure
    .input(
      page.extend({
        subjectType: z.enum(['user', 'business']).optional(),
        status: z.enum(['trialing', 'active', 'past_due', 'canceled', 'expired']).optional(),
        q: z.string().trim().max(80).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where = and(
        input.subjectType ? eq(subscriptions.subjectType, input.subjectType) : undefined,
        input.status ? eq(subscriptions.status, input.status) : undefined,
        input.q
          ? or(ilike(profiles.username, `%${input.q}%`), ilike(profiles.fullName, `%${input.q}%`), ilike(businesses.legalName, `%${input.q}%`))
          : undefined,
      );
      const base = ctx.db
        .select({
          s: subscriptions,
          planName: plans.name,
          username: profiles.username,
          fullName: profiles.fullName,
          legalName: businesses.legalName,
        })
        .from(subscriptions)
        .leftJoin(plans, eq(plans.id, subscriptions.planId))
        .leftJoin(profiles, eq(profiles.id, subscriptions.userId))
        .leftJoin(businesses, eq(businesses.id, subscriptions.businessId))
        .where(where);
      const [total] = await ctx.db
        .select({ n: count() })
        .from(subscriptions)
        .leftJoin(profiles, eq(profiles.id, subscriptions.userId))
        .leftJoin(businesses, eq(businesses.id, subscriptions.businessId))
        .where(where);
      const rows = await base.orderBy(desc(subscriptions.updatedAt)).limit(input.pageSize).offset((input.page - 1) * input.pageSize);
      const ids = rows.map((r) => r.s.id);
      const lastPayments = ids.length
        ? await ctx.db.execute<{ subscription_id: string; paid_at: string; amount: string }>(sql`
            select distinct on (subscription_id) subscription_id, paid_at::text, amount::text from payments
             where subscription_id in ${ids} and status = 'paid' order by subscription_id, paid_at desc
          `)
        : [];
      return {
        total: total?.n ?? 0,
        items: rows.map((r) => {
          const lp = lastPayments.find((p) => p.subscription_id === r.s.id);
          return {
            ...r.s,
            planName: r.planName,
            subjectName: r.s.subjectType === 'user' ? (r.fullName || `@${r.username}`) : r.legalName,
            lastPayment: lp ? { at: new Date(lp.paid_at), amount: Number(lp.amount) } : null,
            nextPaymentAt: r.s.status === 'trialing' ? r.s.trialEndsAt : r.s.currentPeriodEnd,
          };
        }),
      };
    }),

  subscription: adminProcedure.input(z.object({ subscriptionId: uid })).query(async ({ ctx, input }) => {
    const [s] = await ctx.db.select().from(subscriptions).where(eq(subscriptions.id, input.subscriptionId));
    if (!s) notFound('Abonelik');
    const [pays, events, plan] = await Promise.all([
      ctx.db.select().from(payments).where(eq(payments.subscriptionId, s.id)).orderBy(desc(payments.paidAt)),
      ctx.db.select().from(subscriptionEvents).where(eq(subscriptionEvents.subscriptionId, s.id)).orderBy(desc(subscriptionEvents.createdAt)),
      s.planId ? ctx.db.select().from(plans).where(eq(plans.id, s.planId)) : Promise.resolve([]),
    ]);
    return { subscription: s, plan: plan[0] ?? null, payments: pays.map((p) => ({ ...p, amount: Number(p.amount) })), events };
  }),

  /** Manuel aktivasyon: ödeme alındığında plan ve dönem belirlenir. */
  activateSubscription: adminProcedure
    .input(
      z.object({
        subscriptionId: uid,
        planId: uid,
        periodStart: z.string().datetime({ offset: true }).optional(),
        months: z.number().int().min(1).max(36).optional(),
        payment: z
          .object({
            amount: z.number().min(0),
            method: z.enum(['bank_transfer', 'cash', 'card', 'manual', 'other']),
            reference: z.string().max(120).nullable().optional(),
          })
          .nullable()
          .optional(),
        note: z.string().max(300).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const [s] = await tx.select().from(subscriptions).where(eq(subscriptions.id, input.subscriptionId)).for('update');
        if (!s) notFound('Abonelik');
        const [plan] = await tx.select().from(plans).where(eq(plans.id, input.planId));
        if (!plan) notFound('Plan');
        if (plan.audience !== s.subjectType) badRequest('Plan bu abonelik türüne uygun değil.');
        const months = input.months ?? plan.intervalMonths;
        // Süresi bitmemiş aktif abonelik uzatılır; yoksa verilen tarihten / bugünden başlar
        const now = new Date();
        const start = input.periodStart
          ? new Date(input.periodStart)
          : s.status === 'active' && s.currentPeriodEnd && s.currentPeriodEnd > now
            ? s.currentPeriodEnd
            : now;
        const end = addMonths(start, months);
        await tx
          .update(subscriptions)
          .set({ status: 'active', planId: plan.id, currentPeriodStart: start, currentPeriodEnd: end, canceledAt: null, provider: 'manual' })
          .where(eq(subscriptions.id, s.id));
        if (input.payment) {
          await tx.insert(payments).values({
            subscriptionId: s.id,
            amount: input.payment.amount.toFixed(2),
            method: input.payment.method,
            reference: input.payment.reference ?? null,
            paidAt: now,
            periodStart: start,
            periodEnd: end,
            note: input.note ?? null,
            recordedBy: ctx.profile.id,
          });
        }
        await subscriptionEvent(tx, s.id, 'activated', ctx.profile.id, s.status, 'active', end, input.note ?? `${plan.name}, ${months} ay`);
        await audit(tx, ctx.profile.id, 'subscription.activated', { type: 'subscription', id: s.id }, { planId: plan.id, months });
      });
      return { ok: true };
    }),

  extendTrial: adminProcedure
    .input(z.object({ subscriptionId: uid, days: z.number().int().min(1).max(365), note: z.string().max(300).nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const [s] = await tx.select().from(subscriptions).where(eq(subscriptions.id, input.subscriptionId)).for('update');
        if (!s) notFound('Abonelik');
        const base = s.trialEndsAt && s.trialEndsAt > new Date() ? s.trialEndsAt : new Date();
        const end = new Date(base.getTime() + input.days * 86400_000);
        await tx.update(subscriptions).set({ status: 'trialing', trialEndsAt: end }).where(eq(subscriptions.id, s.id));
        await subscriptionEvent(tx, s.id, 'trial_extended', ctx.profile.id, s.status, 'trialing', end, input.note ?? `+${input.days} gün`);
      });
      return { ok: true };
    }),

  cancelSubscription: adminProcedure
    .input(z.object({ subscriptionId: uid, note: z.string().max(300).nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.transaction(async (tx) => {
        const [s] = await tx.select().from(subscriptions).where(eq(subscriptions.id, input.subscriptionId)).for('update');
        if (!s) notFound('Abonelik');
        await tx.update(subscriptions).set({ status: 'canceled', canceledAt: new Date() }).where(eq(subscriptions.id, s.id));
        await subscriptionEvent(tx, s.id, 'canceled', ctx.profile.id, s.status, 'canceled', null, input.note);
      });
      return { ok: true };
    }),

  recordPayment: adminProcedure
    .input(
      z.object({
        subscriptionId: uid,
        amount: z.number().min(0),
        status: z.enum(['paid', 'refunded', 'failed']).default('paid'),
        method: z.enum(['bank_transfer', 'cash', 'card', 'manual', 'other']),
        paidAt: z.string().datetime({ offset: true }),
        reference: z.string().max(120).nullable().optional(),
        note: z.string().max(300).nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [s] = await ctx.db.select().from(subscriptions).where(eq(subscriptions.id, input.subscriptionId));
      if (!s) notFound('Abonelik');
      await ctx.db.insert(payments).values({
        subscriptionId: s.id,
        amount: input.amount.toFixed(2),
        status: input.status,
        method: input.method,
        paidAt: new Date(input.paidAt),
        reference: input.reference ?? null,
        note: input.note ?? null,
        recordedBy: ctx.profile.id,
      });
      await subscriptionEvent(ctx.db, s.id, `payment_${input.status}`, ctx.profile.id, s.status, s.status, s.currentPeriodEnd, input.note);
      return { ok: true };
    }),

  // ───────────────────────────────────────────── Ayarlar, sözleşmeler, denetim
  settings: adminProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db.select().from(appSettings);
    const get = <T,>(k: string, d: T) => (rows.find((r) => r.key === k)?.value as T | undefined) ?? d;
    return {
      trial_days: get('trial_days', 30),
      subscriptions_enforced: get('subscriptions_enforced', false),
      presence: get('presence', PRESENCE_DEFAULTS),
      support: get<{ email: string | null; whatsapp: string | null }>('support', { email: null, whatsapp: null }),
      chat: get('chat', { maxImageMb: 10, maxVideoMb: 50 }),
    };
  }),

  saveSetting: adminProcedure
    .input(z.object({ key: z.enum(['trial_days', 'subscriptions_enforced', 'presence', 'support', 'chat']), value: z.unknown() }))
    .mutation(async ({ ctx, input }) => {
      const value = SETTINGS_SCHEMAS[input.key].parse(input.value);
      await ctx.db
        .insert(appSettings)
        .values({ key: input.key, value, updatedBy: ctx.profile.id })
        .onConflictDoUpdate({ target: appSettings.key, set: { value, updatedBy: ctx.profile.id } });
      await audit(ctx.db, ctx.profile.id, 'settings.updated', { type: 'setting', id: input.key }, { value });
      return { ok: true };
    }),

  legalDocuments: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.select().from(legalDocuments).orderBy(legalDocuments.kind, desc(legalDocuments.version));
  }),

  /** Sözleşme / KVKK metninin yeni sürümünü yayınlar; önceki sürüm arşivde kalır. */
  publishLegal: adminProcedure
    .input(z.object({ kind: z.enum(consentKinds), title: z.string().trim().min(3).max(160), body: z.string().trim().min(20).max(50000) }))
    .mutation(async ({ ctx, input }) => {
      const version = await ctx.db.transaction(async (tx) => {
        const [last] = await tx
          .select({ v: legalDocuments.version })
          .from(legalDocuments)
          .where(eq(legalDocuments.kind, input.kind))
          .orderBy(desc(legalDocuments.version))
          .limit(1);
        await tx.update(legalDocuments).set({ isCurrent: false }).where(eq(legalDocuments.kind, input.kind));
        const v = (last?.v ?? 0) + 1;
        await tx.insert(legalDocuments).values({ kind: input.kind, version: v, title: input.title, body: input.body, isCurrent: true });
        await audit(tx, ctx.profile.id, 'legal.published', { type: 'legal', id: input.kind }, { version: v });
        return v;
      });
      return { version };
    }),

  auditLog: adminProcedure
    .input(z.object({ action: z.string().max(60).optional(), cursor: z.string().datetime({ offset: true }).optional() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(auditLog)
        .where(
          and(
            input.action ? ilike(auditLog.action, `${input.action}%`) : undefined,
            input.cursor ? lt(auditLog.createdAt, new Date(input.cursor)) : undefined,
          ),
        )
        .orderBy(desc(auditLog.createdAt))
        .limit(51);
      const actors = await getUserSummaries(ctx.db, rows.map((r) => r.actorId).filter((x): x is string => !!x), ctx.services.storage.publicUrl);
      const items = rows.slice(0, 50).map((r) => ({ ...r, actor: r.actorId ? (actors.get(r.actorId) ?? null) : null }));
      return { items, nextCursor: rows.length > 50 ? items[items.length - 1]!.createdAt.toISOString() : null };
    }),
});
