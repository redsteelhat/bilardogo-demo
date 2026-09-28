import {
  and,
  asc,
  businessDocuments,
  businessMembers,
  businesses,
  catalogProducts,
  consents,
  conversations,
  count,
  desc,
  eq,
  gte,
  inArray,
  isNull,
  legalDocuments,
  matchPlayers,
  matches,
  orders,
  payments,
  plans,
  presence,
  profiles,
  sql,
  subscriptions,
  venueFollows,
  venueImages,
  venuePosts,
  venueProducts,
  venueTables,
  venues,
  type DbOrTx,
} from '@bilardogo/db';
import {
  businessApplySchema,
  gameTypeSchema,
  generateQrToken,
  normalizeTrPhone,
  slugify,
  STAFF_PERMISSIONS,
  tableSchema,
  taxIdSchema,
  usernameSchema,
  venueInfoSchema,
  venuePostSchema,
} from '@bilardogo/domain';
import QRCode from 'qrcode';
import { z } from 'zod';
import { requireVenueAccess, requireVenueMember } from '../lib/access';
import { audit } from '../lib/audit';
import { getEntitlement } from '../lib/entitlements';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors';
import { rateLimit } from '../lib/rate-limit';
import { assertOwnedPath, buildUploadPath, resolveMediaUrl, uploadRequestSchema } from '../lib/storage';
import { getUserSummaries, toUserSummary, userSummaryColumns } from '../lib/users';
import { notify } from '../services/notify';
import { authedProcedure, protectedProcedure, router } from '../trpc';

const uid = z.string().uuid();
const venueInput = z.object({ venueId: uid });

async function uniqueVenueSlug(db: DbOrTx, name: string, cityPlate: number, exceptId?: string) {
  const base = slugify(name) || 'salon';
  const [city] = await db.execute<{ slug: string }>(sql`select slug from cities where plate = ${cityPlate}`);
  const candidates = [base, `${base}-${city?.slug ?? cityPlate}`];
  for (let i = 2; i < 50; i++) candidates.push(`${base}-${city?.slug ?? cityPlate}-${i}`);
  for (const c of candidates) {
    const rows = await db.select({ id: venues.id }).from(venues).where(eq(venues.slug, c));
    if (rows.length === 0 || rows[0]!.id === exceptId) return c;
  }
  return `${base}-${Date.now().toString(36)}`;
}

async function requireOwnBusiness(db: DbOrTx, userId: string, businessId: string) {
  const [row] = await db
    .select({ b: businesses, role: businessMembers.role })
    .from(businesses)
    .innerJoin(businessMembers, and(eq(businessMembers.businessId, businesses.id), eq(businessMembers.userId, userId)))
    .where(eq(businesses.id, businessId));
  if (!row) notFound('İşletme');
  if (row.role !== 'owner') forbidden('Bu işlemi yalnız işletme sahibi yapabilir.');
  return row.b;
}

function qrSvg(url: string) {
  return QRCode.toString(url, { type: 'svg', errorCorrectionLevel: 'M', margin: 1, color: { dark: '#0a0a0a', light: '#ffffff' } });
}

export const businessRouter = router({
  // ───────────────────────────────────────────── Başvuru ve doğrulama
  /** İşletme kaydı: ticari bilgiler + ilk salon. Admin onaylayana kadar salon uygulamada görünmez. */
  submitApplication: authedProcedure.input(businessApplySchema).mutation(async ({ ctx, input }) => {
    await rateLimit(ctx.db, `business_apply:${ctx.profile.id}`, 5, 86400);
    const phone = normalizeTrPhone(input.contactPhone);
    if (!phone) badRequest('Geçerli bir telefon numarası girin.');
    const owned = await ctx.db
      .select({ id: businesses.id, status: businesses.status })
      .from(businesses)
      .where(eq(businesses.ownerId, ctx.profile.id));
    if (owned.some((b) => b.status !== 'rejected')) conflict('Zaten bir işletme başvurun var.');
    const [agreement] = await ctx.db
      .select({ id: legalDocuments.id })
      .from(legalDocuments)
      .where(and(eq(legalDocuments.kind, 'business_agreement'), eq(legalDocuments.isCurrent, true)));
    const venuePhone = input.venue.phone ? normalizeTrPhone(input.venue.phone) : null;

    const result = await ctx.db.transaction(async (tx) => {
      const [b] = await tx
        .insert(businesses)
        .values({
          ownerId: ctx.profile.id,
          legalName: input.legalName,
          taxId: input.taxId,
          taxOffice: input.taxOffice,
          contactPhone: phone,
          status: 'pending',
        })
        .returning();
      await tx.insert(businessMembers).values({ businessId: b!.id, userId: ctx.profile.id, role: 'owner', permissions: [...STAFF_PERMISSIONS] });
      const slug = await uniqueVenueSlug(tx, input.venue.name, input.venue.cityPlate);
      const [v] = await tx
        .insert(venues)
        .values({
          businessId: b!.id,
          cityPlate: input.venue.cityPlate,
          name: input.venue.name,
          slug,
          district: input.venue.district ?? null,
          address: input.venue.address,
          lat: input.venue.lat,
          lng: input.venue.lng,
          phone: venuePhone,
          description: input.venue.description ?? null,
          openingHours: input.venue.openingHours,
        })
        .returning();
      await tx.insert(conversations).values({ type: 'venue', venueId: v!.id }).onConflictDoNothing();
      await tx.insert(consents).values({
        userId: ctx.profile.id,
        kind: 'business_agreement',
        documentId: agreement?.id ?? null,
        granted: true,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
      });
      await audit(tx, ctx.profile.id, 'business.applied', { type: 'business', id: b!.id });
      return { businessId: b!.id, venueId: v!.id, slug };
    });
    return result;
  }),

  /** İşletme panelinin özeti: başvuru durumu, belgeler, salonlar, abonelik. */
  mine: authedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ b: businesses, role: businessMembers.role, permissions: businessMembers.permissions })
      .from(businessMembers)
      .innerJoin(businesses, eq(businesses.id, businessMembers.businessId))
      .where(eq(businessMembers.userId, ctx.profile.id));
    if (rows.length === 0) return [];
    const ids = rows.map((r) => r.b.id);
    const [docs, venueRows] = await Promise.all([
      ctx.db.select().from(businessDocuments).where(inArray(businessDocuments.businessId, ids)).orderBy(desc(businessDocuments.createdAt)),
      ctx.db.select().from(venues).where(inArray(venues.businessId, ids)).orderBy(asc(venues.createdAt)),
    ]);
    return Promise.all(
      rows.map(async (r) => {
        const isOwner = r.role === 'owner';
        const myDocs = isOwner ? docs.filter((d) => d.businessId === r.b.id) : [];
        const signed = myDocs.length ? await ctx.services.storage.createSignedReads('business-docs', myDocs.map((d) => d.storagePath), 600) : {};
        return {
          id: r.b.id,
          legalName: r.b.legalName,
          status: r.b.status,
          isActive: r.b.isActive,
          reviewNote: r.b.reviewNote,
          role: r.role,
          permissions: r.permissions,
          // Vergi bilgileri yalnız sahibe
          taxId: isOwner ? r.b.taxId : null,
          taxOffice: isOwner ? r.b.taxOffice : null,
          contactPhone: isOwner ? r.b.contactPhone : null,
          documents: myDocs.map((d) => ({ id: d.id, kind: d.kind, fileName: d.fileName, createdAt: d.createdAt, url: signed[d.storagePath] ?? null })),
          venues: venueRows
            .filter((v) => v.businessId === r.b.id)
            .map((v) => ({ id: v.id, name: v.name, slug: v.slug, cityPlate: v.cityPlate, state: v.state })),
          entitlement: isOwner ? await getEntitlement(ctx.db, { businessId: r.b.id }) : null,
        };
      }),
    );
  }),

  updateApplication: authedProcedure
    .input(z.object({ businessId: uid, legalName: z.string().trim().min(2).max(160), taxId: taxIdSchema, taxOffice: z.string().trim().min(2).max(80), contactPhone: z.string().min(10).max(20) }))
    .mutation(async ({ ctx, input }) => {
      const b = await requireOwnBusiness(ctx.db, ctx.profile.id, input.businessId);
      if (b.status === 'approved') badRequest('Onaylanmış işletmenin ticari bilgilerini değiştirmek için destekle iletişime geç.');
      const phone = normalizeTrPhone(input.contactPhone);
      if (!phone) badRequest('Geçerli bir telefon numarası girin.');
      await ctx.db
        .update(businesses)
        .set({ legalName: input.legalName, taxId: input.taxId, taxOffice: input.taxOffice, contactPhone: phone })
        .where(eq(businesses.id, b.id));
      return { ok: true };
    }),

  documentUpload: authedProcedure
    .input(uploadRequestSchema.extend({ businessId: uid }))
    .mutation(async ({ ctx, input }) => {
      await requireOwnBusiness(ctx.db, ctx.profile.id, input.businessId);
      const { path } = buildUploadPath(input.businessId, input, 'document');
      return ctx.services.storage.createSignedUpload('business-docs', path);
    }),

  addDocument: authedProcedure
    .input(
      z.object({
        businessId: uid,
        kind: z.enum(['tax_certificate', 'signature_circular', 'trade_registry', 'id_copy', 'other']),
        path: z.string().max(300),
        fileName: z.string().max(200),
        mimeType: z.string().max(100),
        size: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOwnBusiness(ctx.db, ctx.profile.id, input.businessId);
      assertOwnedPath(input.path, input.businessId);
      await ctx.db.insert(businessDocuments).values({
        businessId: input.businessId,
        kind: input.kind,
        storagePath: input.path,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.size,
        uploadedBy: ctx.profile.id,
      });
      return { ok: true };
    }),

  removeDocument: authedProcedure.input(z.object({ documentId: uid })).mutation(async ({ ctx, input }) => {
    const [d] = await ctx.db.select().from(businessDocuments).where(eq(businessDocuments.id, input.documentId));
    if (!d) notFound('Belge');
    const b = await requireOwnBusiness(ctx.db, ctx.profile.id, d.businessId);
    if (b.status === 'approved') badRequest('Onaylı işletmenin belgeleri silinemez.');
    await ctx.db.delete(businessDocuments).where(eq(businessDocuments.id, d.id));
    ctx.services.defer(() => ctx.services.storage.remove('business-docs', [d.storagePath]));
    return { ok: true };
  }),

  /** Ek belge istendiyse ya da reddedildiyse başvuruyu tekrar incelemeye gönderir. */
  resubmit: authedProcedure.input(z.object({ businessId: uid })).mutation(async ({ ctx, input }) => {
    const b = await requireOwnBusiness(ctx.db, ctx.profile.id, input.businessId);
    if (b.status !== 'needs_docs' && b.status !== 'rejected') badRequest('Başvuru zaten incelemede.');
    await ctx.db.update(businesses).set({ status: 'pending' }).where(eq(businesses.id, b.id));
    await audit(ctx.db, ctx.profile.id, 'business.resubmitted', { type: 'business', id: b.id });
    return { ok: true };
  }),

  // ───────────────────────────────────────────── Salon profili (yalnız sahip)
  venue: protectedProcedure.input(venueInput).query(async ({ ctx, input }) => {
    const access = await requireVenueMember(ctx.db, ctx.profile.id, input.venueId, { allowUnapproved: true });
    const [v] = await ctx.db.select().from(venues).where(eq(venues.id, input.venueId));
    const images = await ctx.db.select().from(venueImages).where(eq(venueImages.venueId, input.venueId)).orderBy(venueImages.sort);
    const [conv] = await ctx.db
      .select({ id: conversations.id })
      .from(conversations)
      .where(and(eq(conversations.type, 'venue'), eq(conversations.venueId, input.venueId)));
    const [followers] = await ctx.db.select({ n: count() }).from(venueFollows).where(eq(venueFollows.venueId, input.venueId));
    return {
      ...v!,
      role: access.role,
      permissions: access.permissions,
      businessStatus: access.businessStatus,
      coverUrl: resolveMediaUrl(ctx.services.storage.publicUrl, v!.coverPath ?? images[0]?.path),
      images: images.map((i) => ({ id: i.id, path: i.path, url: ctx.services.storage.publicUrl(i.path), sort: i.sort })),
      conversationId: conv?.id ?? null,
      followerCount: followers?.n ?? 0,
      orderUrl: `${ctx.services.appUrl}/salon/${v!.slug}/siparis`,
    };
  }),

  updateVenue: protectedProcedure.input(venueInput.extend({ data: venueInfoSchema })).mutation(async ({ ctx, input }) => {
    await requireVenueAccess(ctx.db, ctx.profile.id, input.venueId, undefined, { allowUnapproved: true });
    const [cur] = await ctx.db.select().from(venues).where(eq(venues.id, input.venueId));
    const phone = input.data.phone ? normalizeTrPhone(input.data.phone) : null;
    if (input.data.phone && !phone) badRequest('Geçerli bir telefon numarası girin.');
    const slug =
      cur!.name !== input.data.name || cur!.cityPlate !== input.data.cityPlate
        ? await uniqueVenueSlug(ctx.db, input.data.name, input.data.cityPlate, input.venueId)
        : cur!.slug;
    await ctx.db
      .update(venues)
      .set({
        name: input.data.name,
        slug,
        cityPlate: input.data.cityPlate,
        district: input.data.district ?? null,
        address: input.data.address,
        lat: input.data.lat,
        lng: input.data.lng,
        phone,
        description: input.data.description ?? null,
        openingHours: input.data.openingHours,
      })
      .where(eq(venues.id, input.venueId));
    return { slug };
  }),

  imageUpload: protectedProcedure.input(uploadRequestSchema.extend({ venueId: uid })).mutation(async ({ ctx, input }) => {
    await requireVenueAccess(ctx.db, ctx.profile.id, input.venueId, undefined, { allowUnapproved: true });
    const { path } = buildUploadPath(`venues/${input.venueId}`, input, 'image');
    return ctx.services.storage.createSignedUpload('public-media', path);
  }),

  addImage: protectedProcedure.input(venueInput.extend({ path: z.string().max(300) })).mutation(async ({ ctx, input }) => {
    await requireVenueAccess(ctx.db, ctx.profile.id, input.venueId, undefined, { allowUnapproved: true });
    assertOwnedPath(input.path, `venues/${input.venueId}`);
    const [n] = await ctx.db.select({ n: count() }).from(venueImages).where(eq(venueImages.venueId, input.venueId));
    if ((n?.n ?? 0) >= 20) badRequest('En fazla 20 görsel eklenebilir.');
    await ctx.db.insert(venueImages).values({ venueId: input.venueId, path: input.path, sort: n?.n ?? 0 });
    return { ok: true };
  }),

  removeImage: protectedProcedure.input(z.object({ imageId: uid })).mutation(async ({ ctx, input }) => {
    const [img] = await ctx.db.select().from(venueImages).where(eq(venueImages.id, input.imageId));
    if (!img) notFound('Görsel');
    await requireVenueAccess(ctx.db, ctx.profile.id, img.venueId, undefined, { allowUnapproved: true });
    await ctx.db.delete(venueImages).where(eq(venueImages.id, img.id));
    await ctx.db
      .update(venues)
      .set({ coverPath: null })
      .where(and(eq(venues.id, img.venueId), eq(venues.coverPath, img.path)));
    ctx.services.defer(() => ctx.services.storage.remove('public-media', [img.path]));
    return { ok: true };
  }),

  setCover: protectedProcedure.input(z.object({ imageId: uid })).mutation(async ({ ctx, input }) => {
    const [img] = await ctx.db.select().from(venueImages).where(eq(venueImages.id, input.imageId));
    if (!img) notFound('Görsel');
    await requireVenueAccess(ctx.db, ctx.profile.id, img.venueId, undefined, { allowUnapproved: true });
    await ctx.db.update(venues).set({ coverPath: img.path }).where(eq(venues.id, img.venueId));
    return { ok: true };
  }),

  // ───────────────────────────────────────────── Masalar ve QR
  tables: protectedProcedure.input(venueInput).query(async ({ ctx, input }) => {
    await requireVenueAccess(ctx.db, ctx.profile.id, input.venueId, 'tables', { allowUnapproved: true });
    const rows = await ctx.db.select().from(venueTables).where(eq(venueTables.venueId, input.venueId)).orderBy(venueTables.number);
    return rows.map((t) => ({ ...t, qrUrl: `${ctx.services.appUrl}/q/${t.qrToken}` }));
  }),

  createTable: protectedProcedure.input(venueInput.extend({ data: tableSchema })).mutation(async ({ ctx, input }) => {
    await requireVenueAccess(ctx.db, ctx.profile.id, input.venueId, undefined, { allowUnapproved: true });
    const [t] = await ctx.db
      .insert(venueTables)
      .values({
        venueId: input.venueId,
        number: input.data.number,
        label: input.data.label ?? null,
        allowedGameTypes: [...new Set(input.data.allowedGameTypes)],
        isActive: input.data.isActive,
        qrToken: generateQrToken(),
      })
      .returning();
    return t!;
  }),

  /** Toplu masa tanımı: ör. Masa 1–5 → 3 Bant / Karambol. */
  createTables: protectedProcedure
    .input(venueInput.extend({ from: z.number().int().min(1).max(500), to: z.number().int().min(1).max(500), allowedGameTypes: z.array(gameTypeSchema).min(1) }))
    .mutation(async ({ ctx, input }) => {
      await requireVenueAccess(ctx.db, ctx.profile.id, input.venueId, undefined, { allowUnapproved: true });
      if (input.to < input.from) badRequest('Bitiş numarası başlangıçtan küçük olamaz.');
      if (input.to - input.from > 99) badRequest('Tek seferde en fazla 100 masa eklenebilir.');
      const existing = await ctx.db
        .select({ number: venueTables.number })
        .from(venueTables)
        .where(eq(venueTables.venueId, input.venueId));
      const taken = new Set(existing.map((e) => e.number));
      const values = [];
      for (let n = input.from; n <= input.to; n++) {
        if (taken.has(n)) continue;
        values.push({
          venueId: input.venueId,
          number: n,
          allowedGameTypes: [...new Set(input.allowedGameTypes)],
          qrToken: generateQrToken(),
        });
      }
      if (values.length) await ctx.db.insert(venueTables).values(values);
      return { created: values.length, skipped: input.to - input.from + 1 - values.length };
    }),

  updateTable: protectedProcedure.input(z.object({ tableId: uid, data: tableSchema })).mutation(async ({ ctx, input }) => {
    const [t] = await ctx.db.select().from(venueTables).where(eq(venueTables.id, input.tableId));
    if (!t) notFound('Masa');
    await requireVenueAccess(ctx.db, ctx.profile.id, t.venueId, undefined, { allowUnapproved: true });
    await ctx.db
      .update(venueTables)
      .set({
        number: input.data.number,
        label: input.data.label ?? null,
        allowedGameTypes: [...new Set(input.data.allowedGameTypes)],
        isActive: input.data.isActive,
      })
      .where(eq(venueTables.id, t.id));
    return { ok: true };
  }),

  deleteTable: protectedProcedure.input(z.object({ tableId: uid })).mutation(async ({ ctx, input }) => {
    const [t] = await ctx.db.select().from(venueTables).where(eq(venueTables.id, input.tableId));
    if (!t) notFound('Masa');
    await requireVenueAccess(ctx.db, ctx.profile.id, t.venueId, undefined, { allowUnapproved: true });
    const active = await ctx.db
      .select({ id: matches.id })
      .from(matches)
      .where(and(eq(matches.tableId, t.id), inArray(matches.status, ['waiting_opponent', 'in_progress'])));
    if (active.length) badRequest('Masada devam eden bir maç var; önce maçı bitirin.');
    await ctx.db.delete(venueTables).where(eq(venueTables.id, t.id));
    return { ok: true };
  }),

  /** QR'ı yeniler: eski QR geçersiz olur (ör. afiş çalındı veya kopyalandı). */
  regenerateQr: protectedProcedure.input(z.object({ tableId: uid })).mutation(async ({ ctx, input }) => {
    const [t] = await ctx.db.select().from(venueTables).where(eq(venueTables.id, input.tableId));
    if (!t) notFound('Masa');
    await requireVenueAccess(ctx.db, ctx.profile.id, t.venueId, undefined, { allowUnapproved: true });
    await ctx.db.update(venueTables).set({ qrToken: generateQrToken() }).where(eq(venueTables.id, t.id));
    await audit(ctx.db, ctx.profile.id, 'table.qr_regenerated', { type: 'table', id: t.id });
    return { ok: true };
  }),

  /** Masa afişi için QR (SVG). QR yalnız salon + masayı tanımlar. */
  tableQr: protectedProcedure.input(z.object({ tableId: uid })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .select({ t: venueTables, venueName: venues.name })
      .from(venueTables)
      .innerJoin(venues, eq(venues.id, venueTables.venueId))
      .where(eq(venueTables.id, input.tableId));
    if (!row) notFound('Masa');
    await requireVenueAccess(ctx.db, ctx.profile.id, row.t.venueId, 'tables', { allowUnapproved: true });
    const url = `${ctx.services.appUrl}/q/${row.t.qrToken}`;
    return { url, svg: await qrSvg(url), venueName: row.venueName, number: row.t.number, label: row.t.label, allowedGameTypes: row.t.allowedGameTypes };
  }),

  /** Tüm masaların afişleri (toplu yazdırma). */
  allTableQrs: protectedProcedure.input(venueInput).query(async ({ ctx, input }) => {
    await requireVenueAccess(ctx.db, ctx.profile.id, input.venueId, 'tables', { allowUnapproved: true });
    const [v] = await ctx.db.select({ name: venues.name }).from(venues).where(eq(venues.id, input.venueId));
    const rows = await ctx.db
      .select()
      .from(venueTables)
      .where(and(eq(venueTables.venueId, input.venueId), eq(venueTables.isActive, true)))
      .orderBy(venueTables.number);
    return Promise.all(
      rows.map(async (t) => {
        const url = `${ctx.services.appUrl}/q/${t.qrToken}`;
        return { id: t.id, url, svg: await qrSvg(url), venueName: v?.name ?? '', number: t.number, label: t.label, allowedGameTypes: t.allowedGameTypes };
      }),
    );
  }),

  /** Sipariş QR'ı: salonun sipariş sayfasını açar. */
  orderQr: protectedProcedure.input(venueInput).query(async ({ ctx, input }) => {
    await requireVenueAccess(ctx.db, ctx.profile.id, input.venueId, 'orders', { allowUnapproved: true });
    const [v] = await ctx.db.select({ slug: venues.slug, name: venues.name }).from(venues).where(eq(venues.id, input.venueId));
    const url = `${ctx.services.appUrl}/salon/${v!.slug}/siparis`;
    return { url, svg: await qrSvg(url), venueName: v!.name };
  }),

  // ───────────────────────────────────────────── Canlı panel
  /** Boş/dolu masalar, aktif maçlar (kim, ne süredir), salondaki oyuncular, açık siparişler. */
  overview: protectedProcedure.input(venueInput).query(async ({ ctx, input }) => {
    const access = await requireVenueMember(ctx.db, ctx.profile.id, input.venueId, { allowUnapproved: true });
    const now = new Date();
    const dayStart = sql`date_trunc('day', now() at time zone 'Europe/Istanbul') at time zone 'Europe/Istanbul'`;
    const [tables, active, pres, openOrders, today, awaiting] = await Promise.all([
      ctx.db.select().from(venueTables).where(eq(venueTables.venueId, input.venueId)).orderBy(venueTables.number),
      ctx.db
        .select()
        .from(matches)
        .where(and(eq(matches.venueId, input.venueId), inArray(matches.status, ['waiting_opponent', 'in_progress']))),
      ctx.db
        .select()
        .from(presence)
        .where(and(eq(presence.venueId, input.venueId), sql`${presence.status} <> 'offline'`, sql`${presence.expiresAt} > now()`)),
      ctx.db.select({ n: count() }).from(orders).where(and(eq(orders.venueId, input.venueId), eq(orders.status, 'open'))),
      ctx.db.execute<{ started: number; minutes: number; revenue: string }>(sql`
        select
          (select count(*)::int from matches where venue_id = ${input.venueId} and started_at >= ${dayStart}) as started,
          (select coalesce(sum(extract(epoch from (coalesce(ended_at, now()) - started_at)) / 60), 0)::int
             from matches where venue_id = ${input.venueId} and started_at >= ${dayStart}) as minutes,
          (select coalesce(sum(total), 0)::text from orders where venue_id = ${input.venueId} and status = 'closed' and closed_at >= ${dayStart}) as revenue
      `),
      ctx.db
        .select({ n: count() })
        .from(matches)
        .where(and(eq(matches.venueId, input.venueId), inArray(matches.status, ['accepted']))),
    ]);
    const players = active.length ? await ctx.db.select().from(matchPlayers).where(inArray(matchPlayers.matchId, active.map((m) => m.id))) : [];
    const users = await getUserSummaries(ctx.db, [...players.map((p) => p.userId), ...pres.map((p) => p.userId)], ctx.services.storage.publicUrl);
    return {
      role: access.role,
      permissions: access.permissions,
      tables: tables.map((t) => {
        const m = active.find((a) => a.tableId === t.id);
        return {
          id: t.id,
          number: t.number,
          label: t.label,
          isActive: t.isActive,
          allowedGameTypes: t.allowedGameTypes,
          status: m ? (m.status === 'in_progress' ? ('busy' as const) : ('reserved' as const)) : ('free' as const),
          match: m
            ? {
                id: m.id,
                status: m.status,
                gameType: m.gameType,
                startedAt: m.startedAt ?? m.createdAt,
                minutes: Math.floor((now.getTime() - (m.startedAt ?? m.createdAt).getTime()) / 60000),
                players: players.filter((p) => p.matchId === m.id).sort((a, b) => a.slot - b.slot).map((p) => users.get(p.userId)!),
              }
            : null,
        };
      }),
      atVenue: pres.filter((p) => p.status === 'at_venue').map((p) => ({ user: users.get(p.userId)!, playIntent: p.playIntent, since: p.updatedAt })),
      coming: pres.filter((p) => p.status === 'coming').map((p) => ({ user: users.get(p.userId)!, eta: p.eta })),
      openOrders: openOrders[0]?.n ?? 0,
      upcomingMatches: awaiting[0]?.n ?? 0,
      today: {
        matchesStarted: today[0]?.started ?? 0,
        tableMinutes: today[0]?.minutes ?? 0,
        revenue: Number(today[0]?.revenue ?? 0),
      },
    };
  }),

  // ───────────────────────────────────────────── Menü / ürünler
  /** Global katalog + salonun "bende var / yok" seçimi. */
  products: protectedProcedure.input(venueInput).query(async ({ ctx, input }) => {
    await requireVenueAccess(ctx.db, ctx.profile.id, input.venueId, 'orders', { allowUnapproved: true });
    const catalog = await ctx.db
      .select()
      .from(catalogProducts)
      .where(eq(catalogProducts.isActive, true))
      .orderBy(catalogProducts.category, catalogProducts.sort);
    const mine = await ctx.db.select().from(venueProducts).where(eq(venueProducts.venueId, input.venueId));
    return catalog.map((c) => {
      const vp = mine.find((m) => m.productId === c.id);
      return {
        productId: c.id,
        name: c.name,
        category: c.category,
        imageUrl: resolveMediaUrl(ctx.services.storage.publicUrl, c.imagePath),
        venueProductId: vp?.id ?? null,
        price: vp ? Number(vp.price) : null,
        isAvailable: vp?.isAvailable ?? false,
        stock: vp?.stock ?? null,
      };
    });
  }),

  upsertProduct: protectedProcedure
    .input(
      venueInput.extend({
        productId: uid,
        price: z.number().min(0).max(100000),
        isAvailable: z.boolean(),
        stock: z.number().int().min(0).max(100000).nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireVenueAccess(ctx.db, ctx.profile.id, input.venueId, undefined, { allowUnapproved: true });
      const [c] = await ctx.db.select({ id: catalogProducts.id }).from(catalogProducts).where(eq(catalogProducts.id, input.productId));
      if (!c) notFound('Ürün');
      const values = { price: input.price.toFixed(2), isAvailable: input.isAvailable, stock: input.stock };
      await ctx.db
        .insert(venueProducts)
        .values({ venueId: input.venueId, productId: input.productId, ...values })
        .onConflictDoUpdate({ target: [venueProducts.venueId, venueProducts.productId], set: values });
      return { ok: true };
    }),

  /** Stok/durum hızlı güncelleme (sipariş yetkili çalışan da yapabilir). */
  setProductAvailability: protectedProcedure
    .input(z.object({ venueProductId: uid, isAvailable: z.boolean(), stock: z.number().int().min(0).max(100000).nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      const [vp] = await ctx.db.select().from(venueProducts).where(eq(venueProducts.id, input.venueProductId));
      if (!vp) notFound('Ürün');
      await requireVenueAccess(ctx.db, ctx.profile.id, vp.venueId, 'orders', { allowUnapproved: true });
      await ctx.db
        .update(venueProducts)
        .set({ isAvailable: input.isAvailable, ...(input.stock !== undefined ? { stock: input.stock } : {}) })
        .where(eq(venueProducts.id, vp.id));
      return { ok: true };
    }),

  removeProduct: protectedProcedure.input(z.object({ venueProductId: uid })).mutation(async ({ ctx, input }) => {
    const [vp] = await ctx.db.select().from(venueProducts).where(eq(venueProducts.id, input.venueProductId));
    if (!vp) notFound('Ürün');
    await requireVenueAccess(ctx.db, ctx.profile.id, vp.venueId, undefined, { allowUnapproved: true });
    await ctx.db.delete(venueProducts).where(eq(venueProducts.id, vp.id));
    return { ok: true };
  }),

  // ───────────────────────────────────────────── Çalışanlarım
  staff: protectedProcedure.input(z.object({ businessId: uid })).query(async ({ ctx, input }) => {
    await requireOwnBusiness(ctx.db, ctx.profile.id, input.businessId);
    const rows = await ctx.db
      .select({ ...userSummaryColumns, role: businessMembers.role, permissions: businessMembers.permissions, since: businessMembers.createdAt })
      .from(businessMembers)
      .innerJoin(profiles, eq(profiles.id, businessMembers.userId))
      .where(eq(businessMembers.businessId, input.businessId))
      .orderBy(businessMembers.createdAt);
    return rows.map((r) => ({ user: toUserSummary(r, ctx.services.storage.publicUrl), role: r.role, permissions: r.permissions, since: r.since }));
  }),

  /**
   * Çalışan ekleme: BilardoGo'ya kayıtlı kullanıcı adı veya e-posta ile.
   * Çalışan salon ayarlarını değiştiremez; yalnız verilen yetkilerle çalışır.
   */
  addStaff: protectedProcedure
    .input(
      z.object({
        businessId: uid,
        identifier: z.string().trim().min(3).max(200),
        permissions: z.array(z.enum(STAFF_PERMISSIONS)).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await requireOwnBusiness(ctx.db, ctx.profile.id, input.businessId);
      let userId: string | null = null;
      if (input.identifier.includes('@') && input.identifier.includes('.')) {
        userId = await ctx.services.authAdmin.findUserIdByEmail(input.identifier.toLowerCase());
      } else {
        const username = usernameSchema.safeParse(input.identifier.replace(/^@/, ''));
        if (username.success) {
          const [p] = await ctx.db.select({ id: profiles.id }).from(profiles).where(sql`lower(${profiles.username}) = ${username.data}`);
          userId = p?.id ?? null;
        }
      }
      if (!userId) notFound('Bu bilgiyle kayıtlı kullanıcı. Çalışanın önce BilardoGo’ya üye olması gerekir');
      if (userId === ctx.profile.id) badRequest('Kendini çalışan olarak ekleyemezsin.');
      await ctx.db
        .insert(businessMembers)
        .values({ businessId: input.businessId, userId, role: 'staff', permissions: input.permissions })
        .onConflictDoUpdate({
          target: [businessMembers.businessId, businessMembers.userId],
          set: { permissions: input.permissions },
          setWhere: eq(businessMembers.role, 'staff'),
        });
      await audit(ctx.db, ctx.profile.id, 'business.staff_added', { type: 'business', id: input.businessId }, { userId, permissions: input.permissions });
      return { ok: true };
    }),

  updateStaff: protectedProcedure
    .input(z.object({ businessId: uid, userId: uid, permissions: z.array(z.enum(STAFF_PERMISSIONS)).min(1) }))
    .mutation(async ({ ctx, input }) => {
      await requireOwnBusiness(ctx.db, ctx.profile.id, input.businessId);
      await ctx.db
        .update(businessMembers)
        .set({ permissions: input.permissions })
        .where(and(eq(businessMembers.businessId, input.businessId), eq(businessMembers.userId, input.userId), eq(businessMembers.role, 'staff')));
      return { ok: true };
    }),

  removeStaff: protectedProcedure.input(z.object({ businessId: uid, userId: uid })).mutation(async ({ ctx, input }) => {
    await requireOwnBusiness(ctx.db, ctx.profile.id, input.businessId);
    await ctx.db
      .delete(businessMembers)
      .where(and(eq(businessMembers.businessId, input.businessId), eq(businessMembers.userId, input.userId), eq(businessMembers.role, 'staff')));
    await audit(ctx.db, ctx.profile.id, 'business.staff_removed', { type: 'business', id: input.businessId }, { userId: input.userId });
    return { ok: true };
  }),

  // ───────────────────────────────────────────── Duyurular / kampanyalar
  posts: protectedProcedure.input(venueInput).query(async ({ ctx, input }) => {
    await requireVenueAccess(ctx.db, ctx.profile.id, input.venueId, 'posts', { allowUnapproved: true });
    const rows = await ctx.db
      .select()
      .from(venuePosts)
      .where(and(eq(venuePosts.venueId, input.venueId), isNull(venuePosts.deletedAt)))
      .orderBy(desc(venuePosts.createdAt));
    return rows.map((p) => ({ ...p, imageUrl: resolveMediaUrl(ctx.services.storage.publicUrl, p.imagePath) }));
  }),

  postImageUpload: protectedProcedure.input(uploadRequestSchema.extend({ venueId: uid })).mutation(async ({ ctx, input }) => {
    await requireVenueAccess(ctx.db, ctx.profile.id, input.venueId, 'posts', { allowUnapproved: true });
    const { path } = buildUploadPath(`venues/${input.venueId}/posts`, input, 'image');
    return ctx.services.storage.createSignedUpload('public-media', path);
  }),

  createPost: protectedProcedure
    .input(venueInput.extend({ data: venuePostSchema, notifyFollowers: z.boolean().default(true) }))
    .mutation(async ({ ctx, input }) => {
      await requireVenueAccess(ctx.db, ctx.profile.id, input.venueId, 'posts');
      assertOwnedPath(input.data.imagePath, `venues/${input.venueId}/posts`);
      await rateLimit(ctx.db, `venue_post:${input.venueId}`, 20, 86400);
      const [p] = await ctx.db
        .insert(venuePosts)
        .values({
          venueId: input.venueId,
          kind: input.data.kind,
          title: input.data.title,
          body: input.data.body,
          imagePath: input.data.imagePath ?? null,
          validFrom: input.data.validFrom ? new Date(input.data.validFrom) : null,
          validTo: input.data.validTo ? new Date(input.data.validTo) : null,
          createdBy: ctx.profile.id,
        })
        .returning();
      if (input.notifyFollowers) {
        const [v] = await ctx.db.select({ name: venues.name, slug: venues.slug }).from(venues).where(eq(venues.id, input.venueId));
        const followers = await ctx.db.select({ id: venueFollows.userId }).from(venueFollows).where(eq(venueFollows.venueId, input.venueId));
        await notify(ctx, 'venue_post', followers.map((f) => f.id), { salon: v!.name, baslik: input.data.title }, { link: `/salon/${v!.slug}` });
      }
      return p!;
    }),

  updatePost: protectedProcedure.input(z.object({ postId: uid, data: venuePostSchema })).mutation(async ({ ctx, input }) => {
    const [p] = await ctx.db.select().from(venuePosts).where(eq(venuePosts.id, input.postId));
    if (!p || p.deletedAt) notFound('Duyuru');
    await requireVenueAccess(ctx.db, ctx.profile.id, p.venueId, 'posts');
    assertOwnedPath(input.data.imagePath, `venues/${p.venueId}/posts`);
    await ctx.db
      .update(venuePosts)
      .set({
        kind: input.data.kind,
        title: input.data.title,
        body: input.data.body,
        imagePath: input.data.imagePath ?? null,
        validFrom: input.data.validFrom ? new Date(input.data.validFrom) : null,
        validTo: input.data.validTo ? new Date(input.data.validTo) : null,
      })
      .where(eq(venuePosts.id, p.id));
    return { ok: true };
  }),

  deletePost: protectedProcedure.input(z.object({ postId: uid })).mutation(async ({ ctx, input }) => {
    const [p] = await ctx.db.select().from(venuePosts).where(eq(venuePosts.id, input.postId));
    if (!p) notFound('Duyuru');
    await requireVenueAccess(ctx.db, ctx.profile.id, p.venueId, 'posts');
    await ctx.db.update(venuePosts).set({ deletedAt: new Date() }).where(eq(venuePosts.id, p.id));
    return { ok: true };
  }),

  // ───────────────────────────────────────────── Abonelik
  subscription: protectedProcedure.input(z.object({ businessId: uid })).query(async ({ ctx, input }) => {
    const b = await requireOwnBusiness(ctx.db, ctx.profile.id, input.businessId);
    const [sub] = await ctx.db.select().from(subscriptions).where(eq(subscriptions.businessId, b.id));
    const history = sub
      ? await ctx.db.select().from(payments).where(eq(payments.subscriptionId, sub.id)).orderBy(desc(payments.paidAt))
      : [];
    const [plan] = sub?.planId ? await ctx.db.select().from(plans).where(eq(plans.id, sub.planId)) : [];
    const available = await ctx.db
      .select()
      .from(plans)
      .where(and(eq(plans.audience, 'business'), eq(plans.isActive, true)))
      .orderBy(plans.price);
    return {
      subscription: sub ?? null,
      plan: plan ?? null,
      entitlement: await getEntitlement(ctx.db, { businessId: b.id }),
      payments: history.map((p) => ({ ...p, amount: Number(p.amount) })),
      plans: available.map((p) => ({ ...p, price: Number(p.price) })),
    };
  }),

  /** Maç süreleri raporu (son 30 gün, günlük). */
  report: protectedProcedure.input(venueInput).query(async ({ ctx, input }) => {
    await requireVenueAccess(ctx.db, ctx.profile.id, input.venueId);
    const rows = await ctx.db.execute<{ day: string; matches: number; minutes: number; revenue: string }>(sql`
      with days as (
        select generate_series((now() at time zone 'Europe/Istanbul')::date - 29, (now() at time zone 'Europe/Istanbul')::date, '1 day')::date as day
      )
      select d.day::text,
        (select count(*)::int from matches m where m.venue_id = ${input.venueId} and m.started_at is not null
           and (m.started_at at time zone 'Europe/Istanbul')::date = d.day) as matches,
        (select coalesce(sum(extract(epoch from (coalesce(m.ended_at, now()) - m.started_at)) / 60), 0)::int from matches m
          where m.venue_id = ${input.venueId} and m.started_at is not null
            and (m.started_at at time zone 'Europe/Istanbul')::date = d.day) as minutes,
        (select coalesce(sum(o.total), 0)::text from orders o where o.venue_id = ${input.venueId} and o.status = 'closed'
            and (o.closed_at at time zone 'Europe/Istanbul')::date = d.day) as revenue
      from days d order by d.day
    `);
    return rows.map((r) => ({ day: r.day, matches: r.matches, minutes: r.minutes, revenue: Number(r.revenue) }));
  }),
});
