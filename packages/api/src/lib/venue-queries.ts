import {
  and,
  businesses,
  eq,
  gt,
  inArray,
  matchPlayers,
  matches,
  or,
  playerStats,
  presence,
  sql,
  venueImages,
  venueTables,
  venues,
  type DbOrTx,
} from '@bilardogo/db';
import { computeAverage, type GameType } from '@bilardogo/domain';

/** Onaylı ve aktif işletmeye ait, aktif salonlar. */
export const visibleVenueWhere = and(
  eq(venues.state, 'active'),
  eq(businesses.status, 'approved'),
  eq(businesses.isActive, true),
);

export async function activePresenceCounts(db: DbOrTx, venueIds: string[]) {
  if (venueIds.length === 0) return new Map<string, { atVenue: number; coming: number; wants: number }>();
  const rows = await db
    .select({
      venueId: presence.venueId,
      atVenue: sql<number>`count(*) filter (where ${presence.status} = 'at_venue')::int`,
      coming: sql<number>`count(*) filter (where ${presence.status} = 'coming')::int`,
      wants: sql<number>`count(*) filter (where ${presence.status} = 'at_venue' and ${presence.playIntent} = 'wants')::int`,
    })
    .from(presence)
    .where(
      and(
        inArray(presence.venueId, venueIds),
        or(eq(presence.status, 'at_venue'), eq(presence.status, 'coming')),
        gt(presence.expiresAt, new Date()),
      ),
    )
    .groupBy(presence.venueId);
  return new Map(rows.map((r) => [r.venueId!, { atVenue: r.atVenue, coming: r.coming, wants: r.wants }]));
}

export async function tableCounts(db: DbOrTx, venueIds: string[]) {
  if (venueIds.length === 0) return new Map<string, { total: number; busy: number }>();
  const rows = await db
    .select({
      venueId: venueTables.venueId,
      total: sql<number>`count(distinct ${venueTables.id})::int`,
      busy: sql<number>`count(distinct ${matches.tableId})::int`,
    })
    .from(venueTables)
    .leftJoin(
      matches,
      and(eq(matches.tableId, venueTables.id), inArray(matches.status, ['waiting_opponent', 'in_progress'])),
    )
    .where(and(inArray(venueTables.venueId, venueIds), eq(venueTables.isActive, true)))
    .groupBy(venueTables.venueId);
  return new Map(rows.map((r) => [r.venueId, { total: r.total, busy: r.busy }]));
}

export async function coverImages(db: DbOrTx, venueIds: string[]) {
  if (venueIds.length === 0) return new Map<string, string>();
  const rows = await db
    .selectDistinctOn([venueImages.venueId], { venueId: venueImages.venueId, path: venueImages.path })
    .from(venueImages)
    .where(inArray(venueImages.venueId, venueIds))
    .orderBy(venueImages.venueId, venueImages.sort, venueImages.createdAt);
  return new Map(rows.map((r) => [r.venueId, r.path]));
}

/** Kullanıcıların aktif maç durumları (Maç yapacak / Maçta etiketleri için). */
export async function activeMatchStatusByUser(db: DbOrTx, userIds: string[]) {
  if (userIds.length === 0) return new Map<string, { status: string; matchId: string }>();
  const rows = await db
    .select({ userId: matchPlayers.userId, status: matches.status, matchId: matches.id })
    .from(matchPlayers)
    .innerJoin(matches, eq(matches.id, matchPlayers.matchId))
    .where(and(inArray(matchPlayers.userId, userIds), eq(matchPlayers.active, true)));
  return new Map(rows.map((r) => [r.userId, { status: r.status, matchId: r.matchId }]));
}

/** 3 Bant ve Karambol genel ortalamaları (kart ve listelerde gösterilir). */
export async function averagesByUser(db: DbOrTx, userIds: string[]) {
  const out = new Map<string, Partial<Record<GameType, number | null>>>();
  if (userIds.length === 0) return out;
  const rows = await db
    .select()
    .from(playerStats)
    .where(and(inArray(playerStats.userId, userIds), inArray(playerStats.gameType, ['three_cushion', 'carom'])));
  for (const r of rows) {
    const m = out.get(r.userId) ?? {};
    m[r.gameType] = computeAverage(r.totalScore, r.totalInnings);
    out.set(r.userId, m);
  }
  return out;
}
