import { and, blocks, eq, friendships, inArray, or, profiles, type DbOrTx } from '@bilardogo/db';
import type { GameType, Level } from '@bilardogo/domain';
import { resolveMediaUrl } from './storage';

export const userSummaryColumns = {
  id: profiles.id,
  username: profiles.username,
  fullName: profiles.fullName,
  avatarPath: profiles.avatarPath,
  level: profiles.level,
  cityPlate: profiles.cityPlate,
  gameTypes: profiles.gameTypes,
};

export type UserSummaryRow = {
  id: string;
  username: string | null;
  fullName: string;
  avatarPath: string | null;
  level: Level;
  cityPlate: number | null;
  gameTypes: GameType[];
};

export type UserSummary = Omit<UserSummaryRow, 'avatarPath'> & { avatarUrl: string | null; displayName: string };

export function toUserSummary(row: UserSummaryRow, publicUrl: (p: string) => string): UserSummary {
  const { avatarPath, ...rest } = row;
  return {
    ...rest,
    avatarUrl: resolveMediaUrl(publicUrl, avatarPath),
    displayName: row.fullName || (row.username ? `@${row.username}` : 'Oyuncu'),
  };
}

export async function getUserSummaries(
  db: DbOrTx,
  ids: string[],
  publicUrl: (p: string) => string,
): Promise<Map<string, UserSummary>> {
  const unique = [...new Set(ids)].filter(Boolean);
  if (unique.length === 0) return new Map();
  const rows = await db.select(userSummaryColumns).from(profiles).where(inArray(profiles.id, unique));
  return new Map(rows.map((r) => [r.id, toUserSummary(r, publicUrl)]));
}

/** Benim engellediklerim + beni engelleyenler. */
export async function blockedRelations(db: DbOrTx, userId: string): Promise<Set<string>> {
  const rows = await db
    .select({ blocker: blocks.blockerId, blocked: blocks.blockedId })
    .from(blocks)
    .where(or(eq(blocks.blockerId, userId), eq(blocks.blockedId, userId)));
  return new Set(rows.map((r) => (r.blocker === userId ? r.blocked : r.blocker)));
}

export async function isBlockedBetween(db: DbOrTx, a: string, b: string): Promise<boolean> {
  const rows = await db
    .select({ x: blocks.blockerId })
    .from(blocks)
    .where(
      or(and(eq(blocks.blockerId, a), eq(blocks.blockedId, b)), and(eq(blocks.blockerId, b), eq(blocks.blockedId, a))),
    )
    .limit(1);
  return rows.length > 0;
}

export async function friendIds(db: DbOrTx, userId: string): Promise<string[]> {
  const rows = await db
    .select({ r: friendships.requesterId, a: friendships.addresseeId })
    .from(friendships)
    .where(
      and(eq(friendships.status, 'accepted'), or(eq(friendships.requesterId, userId), eq(friendships.addresseeId, userId))),
    );
  return rows.map((row) => (row.r === userId ? row.a : row.r));
}
