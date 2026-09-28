import {
  and,
  businesses,
  conversations,
  count,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  matchPlayers,
  matches,
  or,
  presence,
  sql,
  venueFollows,
  venueImages,
  venuePosts,
  venueProducts,
  catalogProducts,
  venueTables,
  venues,
} from '@bilardogo/db';
import {
  deriveMatchState,
  GAME_TYPES,
  isOpenAt,
  todayHoursLabel,
  type GameType,
  type MatchStatus,
} from '@bilardogo/domain';
import { z } from 'zod';
import { getVenueAccess } from '../lib/access';
import { notFound } from '../lib/errors';
import { resolveMediaUrl } from '../lib/storage';
import { blockedRelations, getUserSummaries } from '../lib/users';
import {
  activeMatchStatusByUser,
  activePresenceCounts,
  averagesByUser,
  coverImages,
  tableCounts,
  visibleVenueWhere,
} from '../lib/venue-queries';
import { protectedProcedure, publicProcedure, router } from '../trpc';

const venueIdInput = z.object({ venueId: z.string().uuid() });

export const venuesRouter = router({
  /** Şehirdeki salon kartları: ad, görsel, adres, yol tarifi, açık/kapalı, aktif oyuncu sayısı. */
  list: publicProcedure
    .input(z.object({ cityPlate: z.number().int().min(1).max(81), q: z.string().trim().max(60).optional() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({
          id: venues.id,
          slug: venues.slug,
          name: venues.name,
          district: venues.district,
          address: venues.address,
          lat: venues.lat,
          lng: venues.lng,
          coverPath: venues.coverPath,
          openingHours: venues.openingHours,
        })
        .from(venues)
        .innerJoin(businesses, eq(businesses.id, venues.businessId))
        .where(
          and(
            visibleVenueWhere,
            eq(venues.cityPlate, input.cityPlate),
            input.q ? or(ilike(venues.name, `%${input.q}%`), ilike(venues.district, `%${input.q}%`)) : undefined,
          ),
        );
      const ids = rows.map((r) => r.id);
      const [counts, tables, covers, follows] = await Promise.all([
        activePresenceCounts(ctx.db, ids),
        tableCounts(ctx.db, ids),
        coverImages(ctx.db, ids),
        ctx.user && ids.length
          ? ctx.db
              .select({ venueId: venueFollows.venueId })
              .from(venueFollows)
              .where(and(eq(venueFollows.userId, ctx.user.id), inArray(venueFollows.venueId, ids)))
          : Promise.resolve([]),
      ]);
      const followed = new Set(follows.map((f) => f.venueId));
      const now = new Date();
      return rows
        .map((v) => ({
          id: v.id,
          slug: v.slug,
          name: v.name,
          district: v.district,
          address: v.address,
          lat: v.lat,
          lng: v.lng,
          imageUrl: resolveMediaUrl(ctx.services.storage.publicUrl, v.coverPath ?? covers.get(v.id)),
          isOpen: isOpenAt(v.openingHours, now),
          todayHours: todayHoursLabel(v.openingHours, now),
          activeCount: counts.get(v.id)?.atVenue ?? 0,
          comingCount: counts.get(v.id)?.coming ?? 0,
          wantsCount: counts.get(v.id)?.wants ?? 0,
          tables: tables.get(v.id) ?? { total: 0, busy: 0 },
          isFollowing: followed.has(v.id),
        }))
        .sort((a, b) => Number(b.isFollowing) - Number(a.isFollowing) || b.activeCount - a.activeCount || a.name.localeCompare(b.name, 'tr'));
    }),

  /** Salon sayfası: bilgiler, görseller, harita, telefon, saatler, masa türleri, duyurular. */
  get: publicProcedure.input(z.object({ slug: z.string().min(1).max(100) })).query(async ({ ctx, input }) => {
    const [v] = await ctx.db
      .select({ venue: venues, businessStatus: businesses.status, businessActive: businesses.isActive })
      .from(venues)
      .innerJoin(businesses, eq(businesses.id, venues.businessId))
      .where(eq(venues.slug, input.slug));
    if (!v) notFound('Salon');
    const access = ctx.user ? await getVenueAccess(ctx.db, ctx.user.id, v.venue.id) : null;
    const visible = v.venue.state === 'active' && v.businessStatus === 'approved' && v.businessActive;
    if (!visible && !access) notFound('Salon');
    const venue = v.venue;

    const [images, tables, followers, following, posts, conv, counts] = await Promise.all([
      ctx.db.select().from(venueImages).where(eq(venueImages.venueId, venue.id)).orderBy(venueImages.sort, venueImages.createdAt),
      ctx.db
        .select({ allowed: venueTables.allowedGameTypes })
        .from(venueTables)
        .where(and(eq(venueTables.venueId, venue.id), eq(venueTables.isActive, true))),
      ctx.db.select({ n: count() }).from(venueFollows).where(eq(venueFollows.venueId, venue.id)),
      ctx.user
        ? ctx.db
            .select({ v: venueFollows.venueId })
            .from(venueFollows)
            .where(and(eq(venueFollows.venueId, venue.id), eq(venueFollows.userId, ctx.user.id)))
        : Promise.resolve([]),
      ctx.db
        .select()
        .from(venuePosts)
        .where(
          and(
            eq(venuePosts.venueId, venue.id),
            isNull(venuePosts.deletedAt),
            or(isNull(venuePosts.validTo), gt(venuePosts.validTo, new Date())),
          ),
        )
        .orderBy(desc(venuePosts.createdAt))
        .limit(20),
      ctx.db
        .select({ id: conversations.id })
        .from(conversations)
        .where(and(eq(conversations.type, 'venue'), eq(conversations.venueId, venue.id))),
      activePresenceCounts(ctx.db, [venue.id]),
    ]);

    const tableTypeCounts = Object.fromEntries(GAME_TYPES.map((g) => [g, 0])) as Record<GameType, number>;
    for (const t of tables) for (const g of t.allowed) tableTypeCounts[g] += 1;

    return {
      id: venue.id,
      slug: venue.slug,
      name: venue.name,
      cityPlate: venue.cityPlate,
      district: venue.district,
      address: venue.address,
      lat: venue.lat,
      lng: venue.lng,
      phone: venue.phone,
      description: venue.description,
      openingHours: venue.openingHours,
      isOpen: isOpenAt(venue.openingHours, new Date()),
      todayHours: todayHoursLabel(venue.openingHours),
      coverUrl: resolveMediaUrl(ctx.services.storage.publicUrl, venue.coverPath ?? images[0]?.path),
      images: images.map((i) => ({ id: i.id, url: ctx.services.storage.publicUrl(i.path) })),
      tableCount: tables.length,
      tableTypeCounts,
      followerCount: followers[0]?.n ?? 0,
      isFollowing: following.length > 0,
      posts: posts.map((p) => ({
        id: p.id,
        kind: p.kind,
        title: p.title,
        body: p.body,
        imageUrl: resolveMediaUrl(ctx.services.storage.publicUrl, p.imagePath),
        validFrom: p.validFrom,
        validTo: p.validTo,
        createdAt: p.createdAt,
      })),
      conversationId: conv[0]?.id ?? null,
      activeCount: counts.get(venue.id)?.atVenue ?? 0,
      staffRole: access?.role ?? null,
      isPreview: !visible,
    };
  }),

  /**
   * Canlı salon durumu: masalar (boş/dolu, kim oynuyor), salondakiler, birazdan gelecekler, maç arayanlar.
   * Maç süresi yalnız işletmeye gösterilir.
   */
  live: publicProcedure.input(venueIdInput).query(async ({ ctx, input }) => {
    const now = new Date();
    const access = ctx.user ? await getVenueAccess(ctx.db, ctx.user.id, input.venueId) : null;
    const tables = await ctx.db
      .select()
      .from(venueTables)
      .where(and(eq(venueTables.venueId, input.venueId), eq(venueTables.isActive, true)))
      .orderBy(venueTables.number);
    const activeMatches = await ctx.db
      .select({
        id: matches.id,
        tableId: matches.tableId,
        status: matches.status,
        gameType: matches.gameType,
        startedAt: matches.startedAt,
        createdAt: matches.createdAt,
      })
      .from(matches)
      .where(and(eq(matches.venueId, input.venueId), inArray(matches.status, ['waiting_opponent', 'in_progress'])));
    const players = activeMatches.length
      ? await ctx.db
          .select()
          .from(matchPlayers)
          .where(inArray(matchPlayers.matchId, activeMatches.map((m) => m.id)))
      : [];

    const presRows = await ctx.db
      .select()
      .from(presence)
      .where(
        and(
          eq(presence.venueId, input.venueId),
          or(eq(presence.status, 'at_venue'), eq(presence.status, 'coming')),
          gt(presence.expiresAt, now),
        ),
      );
    const blocked = ctx.user ? await blockedRelations(ctx.db, ctx.user.id) : new Set<string>();
    const visiblePres = presRows.filter((p) => !blocked.has(p.userId));
    const userIds = [...visiblePres.map((p) => p.userId), ...players.map((p) => p.userId)];
    const [users, matchStates, avgs] = await Promise.all([
      getUserSummaries(ctx.db, userIds, ctx.services.storage.publicUrl),
      activeMatchStatusByUser(ctx.db, visiblePres.map((p) => p.userId)),
      averagesByUser(ctx.db, visiblePres.map((p) => p.userId)),
    ]);

    const tableView = tables.map((t) => {
      const m = activeMatches.find((am) => am.tableId === t.id);
      const ps = m ? players.filter((p) => p.matchId === m.id).sort((a, b) => a.slot - b.slot) : [];
      return {
        id: t.id,
        number: t.number,
        label: t.label,
        allowedGameTypes: t.allowedGameTypes,
        status: m ? (m.status === 'in_progress' ? ('busy' as const) : ('reserved' as const)) : ('free' as const),
        match: m
          ? {
              id: m.id,
              gameType: m.gameType,
              players: ps.map((p) => users.get(p.userId)).filter(Boolean),
              // İşletme kim ne süredir oynuyor görebilir
              startedAt: access ? (m.startedAt ?? m.createdAt) : null,
            }
          : null,
      };
    });

    const person = (p: (typeof visiblePres)[number]) => {
      const ms = matchStates.get(p.userId);
      return {
        user: users.get(p.userId)!,
        status: p.status,
        eta: p.eta,
        playIntent: p.playIntent,
        matchState: deriveMatchState(p.playIntent, (ms?.status as MatchStatus) ?? null),
        averages: avgs.get(p.userId) ?? {},
        updatedAt: p.updatedAt,
      };
    };
    const atVenue = visiblePres.filter((p) => p.status === 'at_venue' && users.get(p.userId)).map(person);
    const coming = visiblePres
      .filter((p) => p.status === 'coming' && users.get(p.userId))
      .map(person)
      .sort((a, b) => (a.eta?.getTime() ?? 0) - (b.eta?.getTime() ?? 0));
    return {
      tables: tableView,
      atVenue,
      coming,
      lookingForMatch: atVenue.filter((p) => p.matchState === 'wants'),
      isStaff: !!access,
      serverTime: now,
    };
  }),

  follow: protectedProcedure.input(venueIdInput).mutation(async ({ ctx, input }) => {
    await ctx.db.insert(venueFollows).values({ userId: ctx.profile.id, venueId: input.venueId }).onConflictDoNothing();
    return { ok: true };
  }),
  unfollow: protectedProcedure.input(venueIdInput).mutation(async ({ ctx, input }) => {
    await ctx.db
      .delete(venueFollows)
      .where(and(eq(venueFollows.userId, ctx.profile.id), eq(venueFollows.venueId, input.venueId)));
    return { ok: true };
  }),
  following: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ id: venues.id, slug: venues.slug, name: venues.name, cityPlate: venues.cityPlate })
      .from(venueFollows)
      .innerJoin(venues, eq(venues.id, venueFollows.venueId))
      .where(eq(venueFollows.userId, ctx.profile.id));
    return rows;
  }),

  /** Sipariş için salonun "bende var" dediği ürünler. */
  menu: publicProcedure.input(venueIdInput).query(async ({ ctx, input }) => {
    const rows = await ctx.db
      .select({
        id: venueProducts.id,
        price: venueProducts.price,
        stock: venueProducts.stock,
        isAvailable: venueProducts.isAvailable,
        name: catalogProducts.name,
        category: catalogProducts.category,
        imagePath: catalogProducts.imagePath,
        sort: catalogProducts.sort,
      })
      .from(venueProducts)
      .innerJoin(catalogProducts, eq(catalogProducts.id, venueProducts.productId))
      .where(and(eq(venueProducts.venueId, input.venueId), eq(catalogProducts.isActive, true)))
      .orderBy(catalogProducts.category, catalogProducts.sort);
    return rows
      .filter((r) => r.isAvailable && (r.stock === null || r.stock > 0))
      .map((r) => ({
        id: r.id,
        name: r.name,
        category: r.category,
        price: Number(r.price),
        stock: r.stock,
        imageUrl: resolveMediaUrl(ctx.services.storage.publicUrl, r.imagePath),
      }));
  }),

  /** Salonun konum ve adresine göre arama (şehir bağımsız). */
  search: publicProcedure.input(z.object({ q: z.string().trim().min(2).max(60) })).query(async ({ ctx, input }) => {
    return ctx.db
      .select({ id: venues.id, slug: venues.slug, name: venues.name, cityPlate: venues.cityPlate, district: venues.district })
      .from(venues)
      .innerJoin(businesses, eq(businesses.id, venues.businessId))
      .where(and(visibleVenueWhere, sql`${venues.name} ilike ${'%' + input.q + '%'}`))
      .limit(20);
  }),
});
