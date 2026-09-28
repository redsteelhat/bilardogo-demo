import {
  and,
  businesses,
  desc,
  eq,
  inArray,
  lt,
  matchPlayers,
  matchResults,
  matches,
  or,
  presence,
  profiles,
  sql,
  venueTables,
  venues,
  type DbOrTx,
} from '@bilardogo/db';
import {
  assertFormatMatchesGame,
  computeAverage,
  defaultFormat,
  describeResult,
  GAME_LABELS,
  gameTypeSchema,
  matchFormatSchema,
  matchRequestSchema,
  MATCH_STATUS_LABELS,
  nextStatus,
  PRESENCE_DEFAULTS,
  QR_TOKEN_REGEX,
  resultInputSchema,
  validateResult,
  type GameType,
  type MatchActor,
  type MatchFormat,
  type MatchStatus,
  type PresenceSettings,
} from '@bilardogo/domain';
import { z } from 'zod';
import { getVenueAccess, requireVenueAccess } from '../lib/access';
import { getSetting } from '../lib/entitlements';
import { badRequest, conflict, forbidden, notFound } from '../lib/errors';
import { rateLimit } from '../lib/rate-limit';
import { recomputeStats } from '../lib/stats';
import { getUserSummaries, isBlockedBetween, type UserSummary } from '../lib/users';
import { visibleVenueWhere } from '../lib/venue-queries';
import { notify, venueActivityAudience } from '../services/notify';
import { entitledProcedure, protectedProcedure, publicProcedure, router } from '../trpc';

const matchIdInput = z.object({ matchId: z.string().uuid() });
const tokenSchema = z.string().regex(QR_TOKEN_REGEX, 'Geçersiz QR kodu');

type MatchRow = typeof matches.$inferSelect;
type PlayerRow = typeof matchPlayers.$inferSelect;

async function loadMatchForUpdate(tx: DbOrTx, matchId: string) {
  const [m] = await tx.select().from(matches).where(eq(matches.id, matchId)).for('update');
  if (!m) notFound('Maç');
  const players = await tx.select().from(matchPlayers).where(eq(matchPlayers.matchId, matchId)).orderBy(matchPlayers.slot);
  return { match: m, players };
}

function actorFor(players: PlayerRow[], userId: string): { actor: MatchActor; slot: 1 | 2 } | null {
  const p = players.find((x) => x.userId === userId);
  if (!p) return null;
  return { actor: p.slot === 1 ? 'challenger' : 'opponent', slot: p.slot as 1 | 2 };
}

function requirePlayer(players: PlayerRow[], userId: string) {
  const a = actorFor(players, userId);
  if (!a) forbidden('Bu maçın oyuncusu değilsin.');
  return a;
}

function otherPlayer(players: PlayerRow[], userId: string) {
  return players.find((p) => p.userId !== userId) ?? null;
}

async function tableByToken(db: DbOrTx, token: string) {
  const [row] = await db
    .select({
      table: venueTables,
      venue: { id: venues.id, name: venues.name, slug: venues.slug, cityPlate: venues.cityPlate },
    })
    .from(venueTables)
    .innerJoin(venues, eq(venues.id, venueTables.venueId))
    .innerJoin(businesses, eq(businesses.id, venues.businessId))
    .where(and(eq(venueTables.qrToken, token), visibleVenueWhere));
  if (!row) notFound('Masa');
  if (!row.table.isActive) badRequest('Bu masa şu an kullanıma kapalı.');
  return row;
}

/** QR okutan oyuncular o salonda "Salondayım" olarak işaretlenir. */
async function markAtVenue(db: DbOrTx, userIds: string[], venueId: string) {
  const settings = await getSetting<PresenceSettings>(db, 'presence', PRESENCE_DEFAULTS);
  const expiresAt = new Date(Date.now() + settings.atVenueHours * 3600_000);
  for (const userId of userIds) {
    await db
      .insert(presence)
      .values({ userId, venueId, status: 'at_venue', expiresAt, playIntent: 'not' })
      .onConflictDoUpdate({
        target: presence.userId,
        set: {
          venueId,
          status: 'at_venue',
          eta: null,
          expiresAt,
          playIntent: sql`coalesce(${presence.playIntent}, 'not')`,
          updatedAt: new Date(),
        },
      });
  }
}

function displayName(u: UserSummary | undefined) {
  return u?.displayName ?? 'Oyuncu';
}

async function announceStart(
  ctx: Parameters<typeof notify>[0],
  match: MatchRow,
  playerIds: string[],
  venue: { id: string; name: string; slug: string },
) {
  const users = await getUserSummaries(ctx.db, playerIds, ctx.services.storage.publicUrl);
  const audience = await venueActivityAudience(ctx.db, venue.id, playerIds);
  await notify(
    ctx,
    'match_started',
    audience,
    {
      oyuncu1: displayName(users.get(playerIds[0]!)),
      oyuncu2: displayName(users.get(playerIds[1]!)),
      salon: venue.name,
      oyun: GAME_LABELS[match.gameType],
    },
    { gameType: match.gameType, link: `/salon/${venue.slug}` },
  );
}

/** Kullanıcıya gösterilecek maç kartı. */
async function hydrateMatches(ctx: { db: DbOrTx; services: { storage: { publicUrl: (p: string) => string } } }, rows: MatchRow[], viewerId: string | null) {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  const [players, results, venueRows, tables] = await Promise.all([
    ctx.db.select().from(matchPlayers).where(inArray(matchPlayers.matchId, ids)),
    ctx.db
      .select()
      .from(matchResults)
      .where(and(inArray(matchResults.matchId, ids), inArray(matchResults.status, ['submitted', 'confirmed', 'rejected'])))
      .orderBy(desc(matchResults.createdAt)),
    ctx.db
      .select({ id: venues.id, name: venues.name, slug: venues.slug })
      .from(venues)
      .where(inArray(venues.id, [...new Set(rows.map((r) => r.venueId))])),
    ctx.db
      .select({ id: venueTables.id, number: venueTables.number, label: venueTables.label })
      .from(venueTables)
      .where(inArray(venueTables.id, rows.map((r) => r.tableId).filter((x): x is string => !!x))),
  ]);
  const users = await getUserSummaries(ctx.db, players.map((p) => p.userId), ctx.services.storage.publicUrl);
  return rows.map((m) => {
    const ps = players.filter((p) => p.matchId === m.id).sort((a, b) => a.slot - b.slot);
    const res = results.filter((r) => r.matchId === m.id);
    const latest = res[0] ?? null;
    const me = viewerId ? ps.find((p) => p.userId === viewerId) : undefined;
    const current = latest && (latest.status === 'submitted' || latest.status === 'confirmed') ? latest : null;
    return {
      id: m.id,
      status: m.status as MatchStatus,
      statusLabel: MATCH_STATUS_LABELS[m.status as MatchStatus],
      source: m.source,
      gameType: m.gameType,
      format: m.format,
      scheduledAt: m.scheduledAt,
      note: m.note,
      createdAt: m.createdAt,
      acceptedAt: m.acceptedAt,
      startedAt: m.startedAt,
      endedAt: m.endedAt,
      completedAt: m.completedAt,
      statusReason: m.statusReason,
      venue: venueRows.find((v) => v.id === m.venueId) ?? null,
      table: tables.find((t) => t.id === m.tableId) ?? null,
      players: ps.map((p) => ({ slot: p.slot as 1 | 2, user: users.get(p.userId)! })),
      mySlot: (me?.slot as 1 | 2 | undefined) ?? null,
      result: current
        ? {
            id: current.id,
            status: current.status,
            submittedBy: current.submittedBy,
            winnerSlot: current.winnerSlot as 1 | 2 | null,
            p1Score: current.p1Score,
            p2Score: current.p2Score,
            p1Innings: current.p1Innings,
            p2Innings: current.p2Innings,
            p1HighRun: current.p1HighRun,
            p2HighRun: current.p2HighRun,
            target: current.target,
            p1Average: current.p1Innings ? computeAverage(current.p1Score, current.p1Innings) : null,
            p2Average: current.p2Innings ? computeAverage(current.p2Score, current.p2Innings) : null,
            summary: describeResult(m.gameType, {
              winnerSlot: current.winnerSlot as 1 | 2 | null,
              p1Score: current.p1Score,
              p2Score: current.p2Score,
              p1Innings: current.p1Innings,
              p2Innings: current.p2Innings,
            }),
          }
        : null,
      lastRejection:
        latest?.status === 'rejected' ? { reason: latest.rejectReason, by: latest.reviewedBy, at: latest.reviewedAt } : null,
    };
  });
}

export type HydratedMatch = Awaited<ReturnType<typeof hydrateMatches>>[number];

export const matchesRouter = router({
  /** Maç isteği: rakip, salon, oyun türü, hemen / belirli saat, oyuna özel format, handikap, not. */
  request: entitledProcedure.input(matchRequestSchema).mutation(async ({ ctx, input }) => {
    const me = ctx.profile.id;
    if (input.opponentId === me) badRequest('Kendine maç isteği gönderemezsin.');
    await rateLimit(ctx.db, `match_request:${me}`, 30, 3600);
    assertFormatMatchesGame(input.gameType, input.format);

    const [opp] = await ctx.db.select().from(profiles).where(eq(profiles.id, input.opponentId));
    if (!opp || opp.deletedAt || opp.status !== 'active' || !opp.onboardedAt) notFound('Oyuncu');
    if (await isBlockedBetween(ctx.db, me, opp.id)) forbidden('Bu oyuncuya maç isteği gönderemezsin.');

    const [venue] = await ctx.db
      .select({ id: venues.id, name: venues.name })
      .from(venues)
      .innerJoin(businesses, eq(businesses.id, venues.businessId))
      .where(and(eq(venues.id, input.venueId), visibleVenueWhere));
    if (!venue) notFound('Salon');

    let scheduledAt: Date | null = null;
    if (input.when === 'scheduled') {
      scheduledAt = new Date(input.scheduledAt!);
      if (scheduledAt.getTime() < Date.now() - 5 * 60_000) badRequest('Geçmiş bir saat seçilemez.');
      if (scheduledAt.getTime() > Date.now() + 14 * 86400_000) badRequest('En fazla 14 gün sonrası için maç ayarlanabilir.');
    }

    const pending = await ctx.db
      .select({ id: matches.id })
      .from(matches)
      .innerJoin(matchPlayers, eq(matchPlayers.matchId, matches.id))
      .where(
        and(
          eq(matches.status, 'requested'),
          eq(matches.createdBy, me),
          eq(matchPlayers.userId, opp.id),
        ),
      )
      .limit(1);
    if (pending.length) conflict('Bu oyuncuya zaten yanıt bekleyen bir isteğin var.');

    const id = await ctx.db.transaction(async (tx) => {
      const [m] = await tx
        .insert(matches)
        .values({
          venueId: venue.id,
          gameType: input.gameType,
          status: 'requested',
          source: 'request',
          format: input.format,
          scheduledAt,
          note: input.note ?? null,
          createdBy: me,
        })
        .returning({ id: matches.id });
      await tx.insert(matchPlayers).values([
        { matchId: m!.id, slot: 1, userId: me },
        { matchId: m!.id, slot: 2, userId: opp.id },
      ]);
      return m!.id;
    });

    await notify(
      ctx,
      'match_request',
      [opp.id],
      { kullanici: ctx.profile.fullName || `@${ctx.profile.username}`, oyun: GAME_LABELS[input.gameType], salon: venue.name },
      { actorId: me, link: `/maclarim/${id}` },
    );
    return { id };
  }),

  /** Karşı taraf: Kabul Et / Reddet. Kabul edilen maç doğrudan "Maçta" olmaz: "Maç Yapacak" olur. */
  respond: protectedProcedure
    .input(matchIdInput.extend({ action: z.enum(['accept', 'decline']) }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.profile.id;
      const { match, players } = await ctx.db.transaction(async (tx) => {
        const loaded = await loadMatchForUpdate(tx, input.matchId);
        const a = requirePlayer(loaded.players, me);
        const to = nextStatus(loaded.match.status, input.action, a.actor);
        await tx
          .update(matches)
          .set({ status: to, acceptedAt: to === 'accepted' ? new Date() : null, updatedAt: new Date() })
          .where(eq(matches.id, input.matchId));
        return loaded;
      });
      const other = otherPlayer(players, me);
      if (other) {
        await notify(
          ctx,
          input.action === 'accept' ? 'match_accepted' : 'match_declined',
          [other.userId],
          { kullanici: ctx.profile.fullName || `@${ctx.profile.username}`, oyun: GAME_LABELS[match.gameType] },
          { actorId: me, link: `/maclarim/${match.id}` },
        );
      }
      return { ok: true };
    }),

  /** İstek, planlanan maç veya masa oturumu iptali. Masa oturumuna katılan ikinci oyuncu için "ayrıl". */
  cancel: protectedProcedure.input(matchIdInput).mutation(async ({ ctx, input }) => {
    const me = ctx.profile.id;
    await ctx.db.transaction(async (tx) => {
      const { match, players } = await loadMatchForUpdate(tx, input.matchId);
      const a = requirePlayer(players, me);
      if (match.status === 'waiting_opponent' && a.slot === 2) {
        await tx.delete(matchPlayers).where(and(eq(matchPlayers.matchId, match.id), eq(matchPlayers.slot, 2)));
        return;
      }
      const to = nextStatus(match.status, 'cancel', a.actor);
      await tx
        .update(matches)
        .set({ status: to, statusReason: `cancelled_by:${me}`, updatedAt: new Date() })
        .where(eq(matches.id, match.id));
    });
    return { ok: true };
  }),

  /**
   * Masa QR'ı okutulduğunda: QR yalnız salon + masayı tanımlar. Sunucu, okutan kullanıcının
   * durumuna göre ne yapılabileceğini söyler.
   */
  scanTable: protectedProcedure.input(z.object({ token: tokenSchema })).query(async ({ ctx, input }) => {
    const me = ctx.profile.id;
    const { table, venue } = await tableByToken(ctx.db, input.token);
    const [tableMatch] = await ctx.db
      .select()
      .from(matches)
      .where(and(eq(matches.tableId, table.id), inArray(matches.status, ['waiting_opponent', 'in_progress'])));
    const myActive = await ctx.db
      .select({ m: matches })
      .from(matchPlayers)
      .innerJoin(matches, eq(matches.id, matchPlayers.matchId))
      .where(and(eq(matchPlayers.userId, me), eq(matchPlayers.active, true)));
    const myMatch = myActive[0]?.m ?? null;
    const hydrated = await hydrateMatches(ctx, [tableMatch, myMatch].filter((x): x is MatchRow => !!x), me);
    const tableMatchView = tableMatch ? hydrated.find((h) => h.id === tableMatch.id)! : null;
    const myMatchView = myMatch ? hydrated.find((h) => h.id === myMatch.id)! : null;

    type Option =
      | { kind: 'start_matched'; matchId: string; gameAllowed: boolean }
      | { kind: 'open_walkin' }
      | { kind: 'join_walkin'; matchId: string }
      | { kind: 'waiting_joiner'; matchId: string }
      | { kind: 'in_match_here'; matchId: string }
      | { kind: 'busy_elsewhere'; matchId: string }
      | { kind: 'occupied' };
    let option: Option;
    if (myMatch && myMatch.status === 'in_progress') {
      option = myMatch.tableId === table.id ? { kind: 'in_match_here', matchId: myMatch.id } : { kind: 'busy_elsewhere', matchId: myMatch.id };
    } else if (myMatch && myMatch.status === 'waiting_opponent') {
      option = myMatch.tableId === table.id ? { kind: 'waiting_joiner', matchId: myMatch.id } : { kind: 'busy_elsewhere', matchId: myMatch.id };
    } else if (tableMatch) {
      const joinable = tableMatch.status === 'waiting_opponent' && (tableMatchView?.players.length ?? 0) < 2;
      option = joinable ? { kind: 'join_walkin', matchId: tableMatch.id } : { kind: 'occupied' };
    } else if (myMatch && myMatch.status === 'accepted') {
      option = {
        kind: 'start_matched',
        matchId: myMatch.id,
        gameAllowed: myMatch.venueId === venue.id && table.allowedGameTypes.includes(myMatch.gameType),
      };
    } else {
      option = { kind: 'open_walkin' };
    }
    return {
      table: { id: table.id, number: table.number, label: table.label, allowedGameTypes: table.allowedGameTypes },
      venue,
      tableMatch: tableMatchView,
      myMatch: myMatchView,
      option,
    };
  }),

  /** Önceden eşleşmiş oyuncular: "Maç Başladı" → masadaki QR okutulur → maç masaya bağlanır → masa Dolu. */
  startMatched: protectedProcedure
    .input(matchIdInput.extend({ token: tokenSchema }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.profile.id;
      const { table, venue } = await tableByToken(ctx.db, input.token);
      const { match, players } = await ctx.db.transaction(async (tx) => {
        const loaded = await loadMatchForUpdate(tx, input.matchId);
        const a = requirePlayer(loaded.players, me);
        if (loaded.match.venueId !== venue.id) {
          badRequest('Bu maç başka bir salon için ayarlandı. Doğru salondaki masanın QR kodunu okut.');
        }
        if (!table.allowedGameTypes.includes(loaded.match.gameType)) {
          badRequest(`Masa ${table.number}'de ${GAME_LABELS[loaded.match.gameType]} oynanamaz.`);
        }
        const to = nextStatus(loaded.match.status, 'start', a.actor);
        await tx
          .update(matches)
          .set({ status: to, tableId: table.id, startedAt: new Date(), updatedAt: new Date() })
          .where(eq(matches.id, loaded.match.id));
        await markAtVenue(tx, loaded.players.map((p) => p.userId), venue.id);
        return loaded;
      });
      await announceStart(ctx, match, players.map((p) => p.userId), venue);
      return { ok: true, matchId: match.id };
    }),

  /** Önceden eşleşmemiş oyuncular: ilk okutan masa oturumunu açar ve oyun türünü seçer. */
  openWalkIn: entitledProcedure
    .input(z.object({ token: tokenSchema, gameType: gameTypeSchema, format: matchFormatSchema.optional() }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.profile.id;
      const { table, venue } = await tableByToken(ctx.db, input.token);
      if (!table.allowedGameTypes.includes(input.gameType)) {
        badRequest(`Masa ${table.number}'de ${GAME_LABELS[input.gameType]} oynanamaz.`);
      }
      const format: MatchFormat = input.format ?? defaultFormat(input.gameType);
      assertFormatMatchesGame(input.gameType, format);
      const id = await ctx.db.transaction(async (tx) => {
        const [m] = await tx
          .insert(matches)
          .values({
            venueId: venue.id,
            tableId: table.id,
            gameType: input.gameType,
            status: 'waiting_opponent',
            source: 'walk_in',
            format,
            createdBy: me,
          })
          .returning({ id: matches.id });
        await tx.insert(matchPlayers).values({ matchId: m!.id, slot: 1, userId: me });
        await markAtVenue(tx, [me], venue.id);
        return m!.id;
      });
      return { id };
    }),

  /** İkinci oyuncu aynı masanın QR'ını okutup oturuma katılır; oturumu açan oyuncu onaylayınca maç başlar. */
  joinWalkIn: entitledProcedure.input(matchIdInput).mutation(async ({ ctx, input }) => {
    const me = ctx.profile.id;
    const hostId = await ctx.db.transaction(async (tx) => {
      const { match, players } = await loadMatchForUpdate(tx, input.matchId);
      if (match.status !== 'waiting_opponent') badRequest('Bu masa oturumu artık katılıma açık değil.');
      if (players.some((p) => p.userId === me)) return null;
      if (players.length >= 2) conflict('Bu masaya başka bir oyuncu katıldı.');
      const host = players[0]!;
      if (await isBlockedBetween(tx, me, host.userId)) forbidden('Bu oturuma katılamazsın.');
      await tx.insert(matchPlayers).values({ matchId: match.id, slot: 2, userId: me });
      await markAtVenue(tx, [me], match.venueId);
      return host.userId;
    });
    if (hostId) {
      const [t] = await ctx.db
        .select({ number: venueTables.number })
        .from(matches)
        .innerJoin(venueTables, eq(venueTables.id, matches.tableId))
        .where(eq(matches.id, input.matchId));
      await notify(
        ctx,
        'walkin_join',
        [hostId],
        { kullanici: ctx.profile.fullName || `@${ctx.profile.username}`, masa: t?.number ?? '' },
        { actorId: me, link: `/maclarim/${input.matchId}` },
      );
    }
    return { ok: true };
  }),

  /** Oturumu açan oyuncu, katılan oyuncuyu doğrular (onaylar) ve maçı başlatır. Oyun türü/format son kez seçilebilir. */
  approveJoin: protectedProcedure
    .input(matchIdInput.extend({ gameType: gameTypeSchema.optional(), format: matchFormatSchema.optional() }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.profile.id;
      const result = await ctx.db.transaction(async (tx) => {
        const loaded = await loadMatchForUpdate(tx, input.matchId);
        const a = requirePlayer(loaded.players, me);
        if (a.slot !== 1) forbidden('Maçı yalnız masa oturumunu açan oyuncu başlatabilir.');
        if (loaded.players.length < 2) badRequest('Henüz katılan bir rakip yok.');
        const gameType: GameType = input.gameType ?? loaded.match.gameType;
        const format: MatchFormat = input.format ?? (input.gameType ? defaultFormat(gameType) : loaded.match.format);
        assertFormatMatchesGame(gameType, format);
        const to = nextStatus(loaded.match.status, 'start', 'player');
        await tx
          .update(matches)
          .set({ status: to, gameType, format, startedAt: new Date(), updatedAt: new Date() })
          .where(eq(matches.id, loaded.match.id));
        const [v] = await tx.select({ id: venues.id, name: venues.name, slug: venues.slug }).from(venues).where(eq(venues.id, loaded.match.venueId));
        return { ...loaded, match: { ...loaded.match, gameType }, venue: v! };
      });
      await announceStart(ctx, result.match, result.players.map((p) => p.userId), result.venue);
      return { ok: true };
    }),

  rejectJoin: protectedProcedure.input(matchIdInput).mutation(async ({ ctx, input }) => {
    const me = ctx.profile.id;
    await ctx.db.transaction(async (tx) => {
      const { match, players } = await loadMatchForUpdate(tx, input.matchId);
      const a = requirePlayer(players, me);
      if (a.slot !== 1 || match.status !== 'waiting_opponent') forbidden();
      await tx.delete(matchPlayers).where(and(eq(matchPlayers.matchId, match.id), eq(matchPlayers.slot, 2)));
    });
    return { ok: true };
  }),

  /** "Maçı Bitir": masa hemen boşalır; sonuç girişi masadan bağımsız devam eder. İşletme de bitirebilir. */
  finish: protectedProcedure.input(matchIdInput).mutation(async ({ ctx, input }) => {
    const me = ctx.profile.id;
    await ctx.db.transaction(async (tx) => {
      const { match, players } = await loadMatchForUpdate(tx, input.matchId);
      let actor: MatchActor;
      const a = actorFor(players, me);
      if (a) actor = a.actor;
      else {
        await requireVenueAccess(tx, me, match.venueId, 'tables');
        actor = 'venue_staff';
      }
      const to = nextStatus(match.status, 'finish', actor);
      await tx
        .update(matches)
        .set({ status: to, endedAt: new Date(), endedBy: me, updatedAt: new Date() })
        .where(eq(matches.id, match.id));
    });
    return { ok: true };
  }),

  /** Oyun türüne göre sonuç girişi. Rakip onaylamadan istatistiğe işlenmez. */
  submitResult: protectedProcedure
    .input(matchIdInput.extend({ result: resultInputSchema }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.profile.id;
      const { match, players, score } = await ctx.db.transaction(async (tx) => {
        const loaded = await loadMatchForUpdate(tx, input.matchId);
        const a = requirePlayer(loaded.players, me);
        if (loaded.players.length < 2) badRequest('Maçın iki oyuncusu yok.');
        const to = nextStatus(loaded.match.status, 'submit_result', a.actor);
        const r = validateResult(loaded.match.gameType, loaded.match.format, input.result);
        await tx.insert(matchResults).values({
          matchId: loaded.match.id,
          submittedBy: me,
          status: 'submitted',
          winnerSlot: r.winnerSlot,
          p1Score: r.p1Score,
          p2Score: r.p2Score,
          p1Innings: r.p1Innings,
          p2Innings: r.p2Innings,
          p1HighRun: r.p1HighRun,
          p2HighRun: r.p2HighRun,
          target: r.target,
        });
        await tx.update(matches).set({ status: to, updatedAt: new Date() }).where(eq(matches.id, loaded.match.id));
        return { ...loaded, score: describeResult(loaded.match.gameType, r) };
      });
      const other = otherPlayer(players, me);
      if (other) {
        await notify(
          ctx,
          'result_submitted',
          [other.userId],
          { kullanici: ctx.profile.fullName || `@${ctx.profile.username}`, skor: score, oyun: GAME_LABELS[match.gameType] },
          { actorId: me, link: `/maclarim/${match.id}` },
        );
      }
      return { ok: true };
    }),

  /** Rakip onaylar → sonuç ve istatistikler iki oyuncunun profiline işlenir. */
  confirmResult: protectedProcedure.input(matchIdInput).mutation(async ({ ctx, input }) => {
    const me = ctx.profile.id;
    const out = await ctx.db.transaction(async (tx) => {
      const { match, players } = await loadMatchForUpdate(tx, input.matchId);
      const a = requirePlayer(players, me);
      const [res] = await tx
        .select()
        .from(matchResults)
        .where(and(eq(matchResults.matchId, match.id), eq(matchResults.status, 'submitted')));
      if (!res) badRequest('Onay bekleyen bir sonuç yok.');
      if (res.submittedBy === me) forbidden('Kendi girdiğin sonucu onaylayamazsın; rakibin onaylamalı.');
      const to = nextStatus(match.status, 'confirm_result', a.actor);
      const now = new Date();
      await tx
        .update(matchResults)
        .set({ status: 'confirmed', reviewedBy: me, reviewedAt: now })
        .where(eq(matchResults.id, res.id));
      await tx.update(matches).set({ status: to, completedAt: now, updatedAt: now }).where(eq(matches.id, match.id));
      for (const p of players) await recomputeStats(tx, p.userId, match.gameType);
      const [v] = await tx.select({ id: venues.id, name: venues.name, slug: venues.slug }).from(venues).where(eq(venues.id, match.venueId));
      return { match, players, res, venue: v! };
    });
    const users = await getUserSummaries(ctx.db, out.players.map((p) => p.userId), ctx.services.storage.publicUrl);
    await notify(
      ctx,
      'result_confirmed',
      [out.res.submittedBy],
      { kullanici: ctx.profile.fullName || `@${ctx.profile.username}` },
      { actorId: me, link: `/maclarim/${out.match.id}` },
    );
    if (out.res.winnerSlot) {
      const winner = out.players.find((p) => p.slot === out.res.winnerSlot)!;
      const audience = await venueActivityAudience(ctx.db, out.venue.id, out.players.map((p) => p.userId));
      await notify(
        ctx,
        'match_result',
        audience,
        { kazanan: displayName(users.get(winner.userId)), salon: out.venue.name, oyun: GAME_LABELS[out.match.gameType] },
        { gameType: out.match.gameType, link: `/profil/${users.get(winner.userId)?.username ?? ''}` },
      );
    }
    return { ok: true };
  }),

  /** Rakip reddederse sonuç işlenmez ve düzeltmeye gönderilir. Sonucu giren oyuncu da geri çekebilir. */
  rejectResult: protectedProcedure
    .input(matchIdInput.extend({ reason: z.string().trim().min(3, 'Ret sebebini yaz').max(300) }))
    .mutation(async ({ ctx, input }) => {
      const me = ctx.profile.id;
      const out = await ctx.db.transaction(async (tx) => {
        const { match, players } = await loadMatchForUpdate(tx, input.matchId);
        const a = requirePlayer(players, me);
        const [res] = await tx
          .select()
          .from(matchResults)
          .where(and(eq(matchResults.matchId, match.id), eq(matchResults.status, 'submitted')));
        if (!res) badRequest('Onay bekleyen bir sonuç yok.');
        const to = nextStatus(match.status, 'reject_result', a.actor);
        const withdrawing = res.submittedBy === me;
        await tx
          .update(matchResults)
          .set({
            status: withdrawing ? 'withdrawn' : 'rejected',
            reviewedBy: me,
            reviewedAt: new Date(),
            rejectReason: input.reason,
          })
          .where(eq(matchResults.id, res.id));
        await tx.update(matches).set({ status: to, updatedAt: new Date() }).where(eq(matches.id, match.id));
        return { match, res, withdrawing };
      });
      if (!out.withdrawing) {
        await notify(
          ctx,
          'result_rejected',
          [out.res.submittedBy],
          { kullanici: ctx.profile.fullName || `@${ctx.profile.username}`, sebep: input.reason },
          { actorId: me, link: `/maclarim/${out.match.id}` },
        );
      }
      return { ok: true };
    }),

  get: protectedProcedure.input(matchIdInput).query(async ({ ctx, input }) => {
    const [m] = await ctx.db.select().from(matches).where(eq(matches.id, input.matchId));
    if (!m) notFound('Maç');
    const players = await ctx.db.select().from(matchPlayers).where(eq(matchPlayers.matchId, m.id));
    const isPlayer = players.some((p) => p.userId === ctx.profile.id);
    if (!isPlayer && m.status !== 'completed') {
      const access = await getVenueAccess(ctx.db, ctx.profile.id, m.venueId);
      if (!access && ctx.profile.role !== 'admin') notFound('Maç');
    }
    const [h] = await hydrateMatches(ctx, [m], ctx.profile.id);
    return h!;
  }),

  /** Maçlarım: gelen/giden istekler, aktif maç, sonuç bekleyenler, onay bekleyenler, geçmiş. */
  mine: protectedProcedure.query(async ({ ctx }) => {
    const me = ctx.profile.id;
    const open = await ctx.db
      .select({ m: matches })
      .from(matchPlayers)
      .innerJoin(matches, eq(matches.id, matchPlayers.matchId))
      .where(
        and(
          eq(matchPlayers.userId, me),
          inArray(matches.status, ['requested', 'accepted', 'waiting_opponent', 'in_progress', 'awaiting_result', 'pending_confirmation']),
        ),
      )
      .orderBy(desc(matches.updatedAt));
    const recent = await ctx.db
      .select({ m: matches })
      .from(matchPlayers)
      .innerJoin(matches, eq(matches.id, matchPlayers.matchId))
      .where(and(eq(matchPlayers.userId, me), inArray(matches.status, ['completed', 'declined', 'cancelled', 'expired', 'void'])))
      .orderBy(desc(matches.updatedAt))
      .limit(20);
    const all = await hydrateMatches(ctx, [...open, ...recent].map((r) => r.m), me);
    const byStatus = (s: MatchStatus[]) => all.filter((m) => s.includes(m.status));
    const pendingConfirmation = byStatus(['pending_confirmation']);
    return {
      incoming: all.filter((m) => m.status === 'requested' && m.mySlot === 2),
      outgoing: all.filter((m) => m.status === 'requested' && m.mySlot === 1),
      active: byStatus(['accepted', 'waiting_opponent', 'in_progress']),
      needsResult: byStatus(['awaiting_result']),
      toConfirm: pendingConfirmation.filter((m) => m.result && m.result.submittedBy !== me),
      waitingOpponentConfirm: pendingConfirmation.filter((m) => m.result && m.result.submittedBy === me),
      history: all.filter((m) => ['completed', 'declined', 'cancelled', 'expired', 'void'].includes(m.status)),
    };
  }),

  /** Maç sekmesi rozeti için bekleyen iş sayısı. */
  actionCount: protectedProcedure.query(async ({ ctx }) => {
    const me = ctx.profile.id;
    const [row] = await ctx.db.execute<{ n: number }>(sql`
      select count(*)::int as n
        from match_players mp join matches m on m.id = mp.match_id
       where mp.user_id = ${me}
         and ((m.status = 'requested' and mp.slot = 2)
           or m.status = 'awaiting_result'
           or (m.status = 'pending_confirmation' and exists (
                 select 1 from match_results r where r.match_id = m.id and r.status = 'submitted' and r.submitted_by <> ${me})))
    `);
    return { count: row?.n ?? 0 };
  }),

  /** Bir oyuncunun onaylanmış maçları (profil "Son maçlar"). */
  history: publicProcedure
    .input(
      z.object({
        userId: z.string().uuid(),
        gameType: gameTypeSchema.optional(),
        cursor: z.string().datetime({ offset: true }).optional(),
        limit: z.number().int().min(1).max(50).default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select({ m: matches })
        .from(matchPlayers)
        .innerJoin(matches, eq(matches.id, matchPlayers.matchId))
        .where(
          and(
            eq(matchPlayers.userId, input.userId),
            eq(matches.status, 'completed'),
            input.gameType ? eq(matches.gameType, input.gameType) : undefined,
            input.cursor ? lt(matches.completedAt, new Date(input.cursor)) : undefined,
          ),
        )
        .orderBy(desc(matches.completedAt))
        .limit(input.limit + 1);
      const items = await hydrateMatches(ctx, rows.slice(0, input.limit).map((r) => r.m), input.userId);
      const last = items[items.length - 1];
      return {
        items,
        nextCursor: rows.length > input.limit && last?.completedAt ? last.completedAt.toISOString() : null,
      };
    }),

  /** Karşılıklı geçmiş: yalnız iki oyuncu arasındaki onaylanmış maçlar, oyun türüne göre filtrelenebilir. */
  headToHead: protectedProcedure
    .input(z.object({ userId: z.string().uuid(), otherId: z.string().uuid().optional(), gameType: gameTypeSchema.optional() }))
    .query(async ({ ctx, input }) => {
      const a = input.otherId ?? ctx.profile.id;
      const b = input.userId;
      if (a === b) return { wins: 0, losses: 0, draws: 0, total: 0, matches: [] as HydratedMatch[], byGame: {} };
      const rows = await ctx.db.execute<{ id: string }>(sql`
        select m.id from matches m
         where m.status = 'completed'
           ${input.gameType ? sql`and m.game_type = ${input.gameType}` : sql``}
           and exists (select 1 from match_players p where p.match_id = m.id and p.user_id = ${a})
           and exists (select 1 from match_players p where p.match_id = m.id and p.user_id = ${b})
         order by m.completed_at desc
         limit 100
      `);
      const ids = rows.map((r) => r.id);
      const ms = ids.length ? await ctx.db.select().from(matches).where(inArray(matches.id, ids)).orderBy(desc(matches.completedAt)) : [];
      const hydrated = await hydrateMatches(ctx, ms, a);
      let wins = 0;
      let losses = 0;
      let draws = 0;
      const byGame: Partial<Record<GameType, { wins: number; losses: number; draws: number }>> = {};
      for (const m of hydrated) {
        const g = (byGame[m.gameType] ??= { wins: 0, losses: 0, draws: 0 });
        if (!m.result) continue;
        if (m.result.winnerSlot === null) {
          draws++;
          g.draws++;
        } else if (m.result.winnerSlot === m.mySlot) {
          wins++;
          g.wins++;
        } else {
          losses++;
          g.losses++;
        }
      }
      return { wins, losses, draws, total: hydrated.length, matches: hydrated, byGame };
    }),

  /** Canlı aktif maçlarım (üst şerit için). */
  current: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ m: matches })
      .from(matchPlayers)
      .innerJoin(matches, eq(matches.id, matchPlayers.matchId))
      .where(
        and(
          eq(matchPlayers.userId, ctx.profile.id),
          or(eq(matchPlayers.active, true), inArray(matches.status, ['awaiting_result', 'pending_confirmation'])),
        ),
      )
      .orderBy(desc(matches.updatedAt))
      .limit(3);
    return hydrateMatches(ctx, rows.map((r) => r.m), ctx.profile.id);
  }),
});

