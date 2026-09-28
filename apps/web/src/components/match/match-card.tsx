import { describeFormat } from '@bilardogo/domain';
import { Avatar, cn } from '@bilardogo/ui';
import { ChevronRight, Clock, MapPin } from 'lucide-react';
import Link from 'next/link';
import { GameBadge, MatchStatusBadge } from '@/components/common/badges';
import { sides, whenLabel, type Match } from './helpers';

/** Maçlarım listesindeki kart: oyun, rakip, salon, zaman, durum, format özeti. */
export function MatchCard({ match, children, className }: { match: Match; children?: React.ReactNode; className?: string }) {
  const { opponent, p1, p2 } = sides(match);
  const other = opponent ?? (match.mySlot ? null : p2 ?? p1);
  const won = match.result && match.status === 'completed' && match.mySlot ? match.result.winnerSlot === match.mySlot : null;
  const draw = match.result && match.status === 'completed' && match.result.winnerSlot === null;
  return (
    <article className={cn('overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface', className)}>
      <Link href={`/maclarim/${match.id}`} className="flex items-center gap-3 p-3.5">
        <Avatar name={other?.displayName ?? '?'} src={other?.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{other ? other.displayName : 'Rakip bekleniyor'}</span>
            <GameBadge game={match.gameType} />
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted">
            {match.venue ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {match.venue.name}
                {match.table ? ` · Masa ${match.table.number}` : ''}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {whenLabel(match)}
            </span>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <MatchStatusBadge status={match.status} />
            <span className="text-[11px] text-subtle">{describeFormat(match.format)}</span>
            {match.result ? (
              <span
                className={cn(
                  'text-[11px] font-bold tabular-nums',
                  won === true ? 'text-success' : won === false && !draw ? 'text-danger' : 'text-fg',
                )}
              >
                {match.result.summary}
                {match.status === 'completed' ? (draw ? ' · Berabere' : won ? ' · Kazandın' : ' · Kaybettin') : ''}
              </span>
            ) : null}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
      </Link>
      {children ? <div className="flex flex-wrap gap-2 border-t border-border px-3.5 py-3">{children}</div> : null}
    </article>
  );
}
