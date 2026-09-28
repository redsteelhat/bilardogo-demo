import { playerStats, sql, type DbOrTx } from '@bilardogo/db';
import type { GameType } from '@bilardogo/domain';

/**
 * Oyuncunun bir oyun türündeki istatistiklerini onaylanmış sonuçlardan yeniden hesaplar.
 * Artımlı güncelleme yerine yeniden hesaplama: düzeltme ve admin müdahalelerinde tutarlılık bozulmaz.
 */
export async function recomputeStats(db: DbOrTx, userId: string, gameType: GameType): Promise<void> {
  const rows = await db.execute<{
    matches: number;
    wins: number;
    losses: number;
    draws: number;
    total_score: number;
    total_conceded: number;
    total_innings: number;
    best_high_run: number | null;
    best_match_average: string | null;
    table_minutes: number;
    last_played_at: string | null;
  }>(sql`
    with mine as (
      select
        mp.slot,
        r.winner_slot,
        case when mp.slot = 1 then r.p1_score else r.p2_score end as my_score,
        case when mp.slot = 1 then r.p2_score else r.p1_score end as their_score,
        case when mp.slot = 1 then r.p1_innings else r.p2_innings end as my_innings,
        case when mp.slot = 1 then r.p1_high_run else r.p2_high_run end as my_high_run,
        m.started_at, m.ended_at, m.completed_at
      from match_players mp
      join matches m on m.id = mp.match_id and m.status = 'completed' and m.game_type = ${gameType}
      join match_results r on r.match_id = m.id and r.status = 'confirmed'
      where mp.user_id = ${userId}
    )
    select
      count(*)::int as matches,
      count(*) filter (where winner_slot = slot)::int as wins,
      count(*) filter (where winner_slot is not null and winner_slot <> slot)::int as losses,
      count(*) filter (where winner_slot is null)::int as draws,
      coalesce(sum(my_score), 0)::int as total_score,
      coalesce(sum(their_score), 0)::int as total_conceded,
      coalesce(sum(my_innings), 0)::int as total_innings,
      max(my_high_run)::int as best_high_run,
      max(round(my_score::numeric / nullif(my_innings, 0), 3))::text as best_match_average,
      coalesce(sum(greatest(0, extract(epoch from (ended_at - started_at)) / 60)), 0)::int as table_minutes,
      max(completed_at)::text as last_played_at
    from mine
  `);
  const s = rows[0];
  if (!s) return;
  const values = {
    userId,
    gameType,
    matches: s.matches,
    wins: s.wins,
    losses: s.losses,
    draws: s.draws,
    totalScore: s.total_score,
    totalConceded: s.total_conceded,
    totalInnings: s.total_innings,
    bestHighRun: s.best_high_run,
    bestMatchAverage: s.best_match_average,
    tableMinutes: s.table_minutes,
    lastPlayedAt: s.last_played_at ? new Date(s.last_played_at) : null,
  };
  await db
    .insert(playerStats)
    .values(values)
    .onConflictDoUpdate({
      target: [playerStats.userId, playerStats.gameType],
      set: { ...values, updatedAt: new Date() },
    });
}
