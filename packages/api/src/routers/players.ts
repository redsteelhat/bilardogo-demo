import {
  and,
  desc,
  eq,
  friendships,
  inArray,
  isNull,
  matchPlayers,
  matches,
  ne,
  or,
  playerStats,
  practiceSessions,
  presence,
  profiles,
  sql,
  venues,
} from '@bilardogo/db';
import {
  computeAverage,
  deriveMatchState,
  GAME_TYPES,
  practiceSchema,
  usernameSchema,
  winRate,
  type GameType,
  type MatchStatus,
} from '@bilardogo/domain';
import { z } from 'zod';
import { notFound } from '../lib/errors';
import { resolveMediaUrl } from '../lib/storage';
import { blockedRelations, isBlockedBetween, toUserSummary, userSummaryColumns } from '../lib/users';
import { activeMatchStatusByUser } from '../lib/venue-queries';
import { protectedProcedure, publicProcedure, router } from '../trpc';

async function statsFor(db: Parameters<typeof activeMatchStatusByUser>[0], userId: string) {
  const rows = await db.select().from(playerStats).where(eq(playerStats.userId, userId));
  const byGame = Object.fromEntries(
    GAME_TYPES.map((g) => {
      const r = rows.find((x) => x.gameType === g);
      return [
        g,
        {
          matches: r?.matches ?? 0,
          wins: r?.wins ?? 0,
          losses: r?.losses ?? 0,
          draws: r?.draws ?? 0,
          winRate: winRate(r?.wins ?? 0, r?.matches ?? 0),
          average: r ? computeAverage(r.totalScore, r.totalInnings) : null,
          bestMatchAverage: r?.bestMatchAverage ? Number(r.bestMatchAverage) : null,
          bestHighRun: r?.bestHighRun ?? null,
          won: r?.totalScore ?? 0, // rack/frame oyunlarında kazanılan rack/frame
          lost: r?.totalConceded ?? 0,
          tableMinutes: r?.tableMinutes ?? 0,
          lastPlayedAt: r?.lastPlayedAt ?? null,
        },
      ];
    }),
  ) as Record<
    GameType,
    {
      matches: number;
      wins: number;
      losses: number;
      draws: number;
      winRate: number;
      average: number | null;
      bestMatchAverage: number | null;
      bestHighRun: number | null;
      won: number;
      lost: number;
      tableMinutes: number;
      lastPlayedAt: Date | null;
    }
  >;
  const total = rows.reduce(
    (acc, r) => ({
      matches: acc.matches + r.matches,
      wins: acc.wins + r.wins,
      losses: acc.losses + r.losses,
      draws: acc.draws + r.draws,
      tableMinutes: acc.tableMinutes + r.tableMinutes,
    }),
    { matches: 0, wins: 0, losses: 0, draws: 0, tableMinutes: 0 },
  );
  return { byGame, total: { ...total, winRate: winRate(total.wins, total.matches) } };
}

/** Bilardo devamlılığı: son 30 günde oynanan gün sayısı ve üst üste oynanan haftalar. */
async function continuity(db: Parameters<typeof activeMatchStatusByUser>[0], userId: string) {
  const rows = await db.execute<{ day: string }>(sql`
    select distinct day from (
      select (m.completed_at at time zone 'Europe/Istanbul')::date as day
        from match_players mp join matches m on m.id = mp.match_id
       where mp.user_id = ${userId} and m.status = 'completed' and m.completed_at > now() - interval '180 days'
      union
      select played_on as day from practice_sessions
       where user_id = ${userId} and played_on > (now() - interval '180 days')::date
    ) d order by day desc
  `);
  const days = rows.map((r) => new Date(`${r.day}T12:00:00Z`));
  const now = Date.now();
  const last30 = days.filter((d) => now - d.getTime() <= 30 * 86400_000).length;
  const weekKey = (d: Date) => Math.floor((d.getTime() - 4 * 86400_000) / (7 * 86400_000)); // Pazartesi başlangıçlı hafta
  const weeks = new Set(days.map(weekKey));
  let streakWeeks = 0;
  let w = weekKey(new Date());
  if (!weeks.has(w)) w -= 1; // bu hafta henüz oynamadıysa geçen haftadan say
  while (weeks.has(w)) {
    streakWeeks++;
    w--;
  }
  return { activeDaysLast30: last30, streakWeeks, lastActiveDay: days[0] ?? null };
}

export const playersRouter = router({
  /** Profil: fotoğraf, ad, şehir, seviye, oynadığı türler, devamlılık, istatistikler, ortalamalar, tercih edilen salonlar. */
  profile: publicProcedure.input(z.object({ username: usernameSchema })).query(async ({ ctx, input }) => {
    const [p] = await ctx.db
      .select()
      .from(profiles)
      .where(and(sql`lower(${profiles.username}) = ${input.username}`, isNull(profiles.deletedAt)));
    if (!p || p.status === 'banned') notFound('Oyuncu');
    const viewer = ctx.user?.id ?? null;
    if (viewer && viewer !== p.id && (await isBlockedBetween(ctx.db, viewer, p.id))) notFound('Oyuncu');

    const [stats, cont, preferred, practice, pres, friendship, friendCount] = await Promise.all([
      statsFor(ctx.db, p.id),
      continuity(ctx.db, p.id),
      ctx.db.execute<{ id: string; slug: string; name: string; matches: number; minutes: number }>(sql`
        select v.id, v.slug, v.name, count(*)::int as matches,
               coalesce(sum(extract(epoch from (m.ended_at - m.started_at)) / 60), 0)::int as minutes
          from match_players mp
          join matches m on m.id = mp.match_id and m.status = 'completed'
          join venues v on v.id = m.venue_id
         where mp.user_id = ${p.id}
         group by v.id, v.slug, v.name
         order by count(*) desc
         limit 3
      `),
      ctx.db
        .select()
        .from(practiceSessions)
        .where(eq(practiceSessions.userId, p.id))
        .orderBy(desc(practiceSessions.playedOn), desc(practiceSessions.createdAt))
        .limit(30),
      ctx.db
        .select({ status: presence.status, venueName: venues.name, venueSlug: venues.slug, expiresAt: presence.expiresAt, playIntent: presence.playIntent })
        .from(presence)
        .leftJoin(venues, eq(venues.id, presence.venueId))
        .where(eq(presence.userId, p.id)),
      viewer && viewer !== p.id
        ? ctx.db
            .select()
            .from(friendships)
            .where(
              or(
                and(eq(friendships.requesterId, viewer), eq(friendships.addresseeId, p.id)),
                and(eq(friendships.requesterId, p.id), eq(friendships.addresseeId, viewer)),
              ),
            )
        : Promise.resolve([]),
      ctx.db.execute<{ n: number }>(sql`
        select count(*)::int as n from friendships
         where status = 'accepted' and (requester_id = ${p.id} or addressee_id = ${p.id})
      `),
    ]);
    const ms = await activeMatchStatusByUser(ctx.db, [p.id]);
    const presRow = pres[0];
    const presActive = presRow && presRow.status !== 'offline' && presRow.expiresAt && presRow.expiresAt > new Date();
    const practiceByGame = (g: 'three_cushion' | 'carom') => {
      const list = practice.filter((x) => x.gameType === g);
      const score = list.reduce((a, b) => a + b.score, 0);
      const innings = list.reduce((a, b) => a + b.innings, 0);
      return { sessions: list.length, average: computeAverage(score, innings) };
    };
    const f = friendship[0];
    return {
      user: toUserSummary(
        {
          id: p.id,
          username: p.username,
          fullName: p.fullName,
          avatarPath: p.avatarPath,
          level: p.level,
          cityPlate: p.cityPlate,
          gameTypes: p.gameTypes,
        },
        ctx.services.storage.publicUrl,
      ),
      bio: p.bio,
      memberSince: p.createdAt,
      isMe: viewer === p.id,
      presence: presActive
        ? {
            status: presRow.status,
            venueName: presRow.venueName,
            venueSlug: presRow.venueSlug,
            matchState: deriveMatchState(presRow.playIntent, (ms.get(p.id)?.status as MatchStatus) ?? null),
          }
        : null,
      stats,
      continuity: cont,
      preferredVenues: [...preferred],
      practice: practice.map((x) => ({ ...x, average: computeAverage(x.score, x.innings) })),
      practiceAverages: { three_cushion: practiceByGame('three_cushion'), carom: practiceByGame('carom') },
      friendship: f
        ? { id: f.id, status: f.status, direction: f.requesterId === viewer ? ('outgoing' as const) : ('incoming' as const) }
        : null,
      friendCount: friendCount[0]?.n ?? 0,
    };
  }),

  /** Oyuncu arama (maç isteği, arkadaş ekleme). */
  search: protectedProcedure
    .input(z.object({ q: z.string().trim().min(2).max(40), cityPlate: z.number().int().optional() }))
    .query(async ({ ctx, input }) => {
      const blocked = await blockedRelations(ctx.db, ctx.profile.id);
      const term = `%${input.q.replace(/^@/, '')}%`;
      const rows = await ctx.db
        .select(userSummaryColumns)
        .from(profiles)
        .where(
          and(
            ne(profiles.id, ctx.profile.id),
            isNull(profiles.deletedAt),
            eq(profiles.status, 'active'),
            sql`${profiles.onboardedAt} is not null`,
            or(sql`${profiles.username} ilike ${term}`, sql`${profiles.fullName} ilike ${term}`),
          ),
        )
        .orderBy(input.cityPlate ? sql`(${profiles.cityPlate} = ${input.cityPlate}) desc` : sql`1`, profiles.fullName)
        .limit(20);
      return rows.filter((r) => !blocked.has(r.id)).map((r) => toUserSummary(r, ctx.services.storage.publicUrl));
    }),

  /** Manuel antrenman ortalaması: sporcunun kendi antrenmanında yaptığı sayı ve isteka. */
  addPractice: protectedProcedure.input(practiceSchema).mutation(async ({ ctx, input }) => {
    const [row] = await ctx.db
      .insert(practiceSessions)
      .values({
        userId: ctx.profile.id,
        gameType: input.gameType,
        score: input.score,
        innings: input.innings,
        highRun: input.highRun,
        playedOn: input.playedOn,
        note: input.note ?? null,
      })
      .returning();
    return { ...row!, average: computeAverage(row!.score, row!.innings) };
  }),

  deletePractice: protectedProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    await ctx.db
      .delete(practiceSessions)
      .where(and(eq(practiceSessions.id, input.id), eq(practiceSessions.userId, ctx.profile.id)));
    return { ok: true };
  }),

  /** Şehirdeki oyuncular (maç arayanlar öne). */
  inCity: protectedProcedure.input(z.object({ cityPlate: z.number().int().min(1).max(81) })).query(async ({ ctx, input }) => {
    const blocked = await blockedRelations(ctx.db, ctx.profile.id);
    const rows = await ctx.db
      .select({
        ...userSummaryColumns,
        pStatus: presence.status,
        pIntent: presence.playIntent,
        pExpires: presence.expiresAt,
        venueName: venues.name,
        venueSlug: venues.slug,
      })
      .from(profiles)
      .leftJoin(presence, eq(presence.userId, profiles.id))
      .leftJoin(venues, eq(venues.id, presence.venueId))
      .where(
        and(
          eq(profiles.cityPlate, input.cityPlate),
          ne(profiles.id, ctx.profile.id),
          isNull(profiles.deletedAt),
          eq(profiles.status, 'active'),
          sql`${profiles.onboardedAt} is not null`,
        ),
      )
      .orderBy(sql`(${presence.status} = 'at_venue' and ${presence.expiresAt} > now()) desc nulls last`, profiles.fullName)
      .limit(60);
    const ms = await activeMatchStatusByUser(ctx.db, rows.map((r) => r.id));
    return rows
      .filter((r) => !blocked.has(r.id))
      .map((r) => {
        const active = r.pStatus && r.pStatus !== 'offline' && r.pExpires && r.pExpires > new Date();
        return {
          user: toUserSummary(r, ctx.services.storage.publicUrl),
          presence: active ? { status: r.pStatus!, venueName: r.venueName, venueSlug: r.venueSlug } : null,
          matchState: active ? deriveMatchState(r.pIntent, (ms.get(r.id)?.status as MatchStatus) ?? null) : null,
        };
      });
  }),

  /** Kullanıcı özeti (id ile). */
  byId: protectedProcedure.input(z.object({ userId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const [row] = await ctx.db.select(userSummaryColumns).from(profiles).where(and(eq(profiles.id, input.userId), isNull(profiles.deletedAt)));
    if (!row || (await isBlockedBetween(ctx.db, ctx.profile.id, row.id))) notFound('Oyuncu');
    return toUserSummary(row, ctx.services.storage.publicUrl);
  }),

  avatarUrl: publicProcedure.input(z.object({ path: z.string().nullable() })).query(({ ctx, input }) => {
    return resolveMediaUrl(ctx.services.storage.publicUrl, input.path);
  }),

  /** Maç geçmişindeki rakipler (karşılıklı geçmiş listesi). */
  opponents: protectedProcedure.input(z.object({ userId: z.string().uuid() })).query(async ({ ctx, input }) => {
    const rows = await ctx.db.execute<{ id: string; matches: number; wins: number; losses: number }>(sql`
      select o.user_id as id, count(*)::int as matches,
             count(*) filter (where r.winner_slot = me.slot)::int as wins,
             count(*) filter (where r.winner_slot = o.slot)::int as losses
        from match_players me
        join matches m on m.id = me.match_id and m.status = 'completed'
        join match_results r on r.match_id = m.id and r.status = 'confirmed'
        join match_players o on o.match_id = m.id and o.user_id <> me.user_id
       where me.user_id = ${input.userId}
       group by o.user_id
       order by count(*) desc
       limit 30
    `);
    const ids = rows.map((r) => r.id);
    const users = ids.length
      ? await ctx.db.select(userSummaryColumns).from(profiles).where(inArray(profiles.id, ids))
      : [];
    return rows
      .map((r) => {
        const u = users.find((x) => x.id === r.id);
        return u ? { user: toUserSummary(u, ctx.services.storage.publicUrl), matches: r.matches, wins: r.wins, losses: r.losses } : null;
      })
      .filter((x): x is NonNullable<typeof x> => !!x);
  }),
});

