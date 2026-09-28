import { formatAverage } from '@bilardogo/domain';
import { Avatar, cn } from '@bilardogo/ui';
import { ChevronRight, MapPin } from 'lucide-react';
import Link from 'next/link';
import { GameBadge } from '@/components/common/badges';
import { formatDateTime } from '@/lib/format';
import type { HistoryMatch } from './types';

/** Tamamlanmış maç satırı; kazanma/kaybetme `mySlot` (profil sahibi) açısından gösterilir. */
export function MatchRow({ match, perspective }: { match: HistoryMatch; perspective: 'me' | 'them' }) {
  const opp = match.players.find((p) => p.slot !== match.mySlot)?.user ?? null;
  const r = match.result;
  const outcome = !r || !match.mySlot ? null : r.winnerSlot === null ? 'draw' : r.winnerSlot === match.mySlot ? 'win' : 'loss';
  const label =
    outcome === 'draw' ? 'Berabere' : outcome === 'win' ? (perspective === 'me' ? 'Kazandın' : 'Kazandı') : outcome === 'loss' ? (perspective === 'me' ? 'Kaybettin' : 'Kaybetti') : null;
  const myScore = r && match.mySlot ? (match.mySlot === 1 ? r.p1Score : r.p2Score) : null;
  const oppScore = r && match.mySlot ? (match.mySlot === 1 ? r.p2Score : r.p1Score) : null;
  const myAvg = r && match.mySlot ? (match.mySlot === 1 ? r.p1Average : r.p2Average) : null;
  return (
    <Link href={`/maclarim/${match.id}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3 transition-colors hover:bg-surface-2">
      <span
        className={cn(
          'flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-xl text-[10px] font-bold uppercase',
          outcome === 'win' ? 'bg-success-soft text-success' : outcome === 'loss' ? 'bg-danger-soft text-danger' : 'bg-surface-3 text-muted',
        )}
      >
        {outcome === 'win' ? 'G' : outcome === 'loss' ? 'M' : 'B'}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {opp ? <Avatar name={opp.displayName} src={opp.avatarUrl} size="xs" /> : null}
          <span className="truncate text-sm font-semibold">{opp?.displayName ?? 'Rakip'}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
          <GameBadge game={match.gameType} />
          {match.venue ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {match.venue.name}
            </span>
          ) : null}
          <span>{formatDateTime(match.completedAt ?? match.createdAt)}</span>
          {myAvg != null ? <span className="tabular-nums">ort. {formatAverage(myAvg)}</span> : null}
        </div>
      </div>
      <div className="text-right">
        {myScore != null ? (
          <div className="font-display text-lg font-semibold tabular-nums">
            {myScore}–{oppScore}
          </div>
        ) : null}
        {label ? (
          <div className={cn('text-[11px] font-semibold', outcome === 'win' ? 'text-success' : outcome === 'loss' ? 'text-danger' : 'text-muted')}>
            {label}
          </div>
        ) : null}
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-subtle" />
    </Link>
  );
}
