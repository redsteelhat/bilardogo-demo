import { formatAverage, gameCategory } from '@bilardogo/domain';
import { Avatar, cn } from '@bilardogo/ui';
import { Crown } from 'lucide-react';
import Link from 'next/link';
import type { Match, MatchUser } from './helpers';

type Result = NonNullable<Match['result']>;

/** Sonuç tablosu: iki oyuncu, skor, isteka, ortalama, en yüksek seri/break; kazanan vurgulu. */
export function Scoreboard({ match, result }: { match: Match; result: Result }) {
  const cat = gameCategory(match.gameType);
  const p1 = match.players.find((p) => p.slot === 1)?.user;
  const p2 = match.players.find((p) => p.slot === 2)?.user;
  const draw = result.winnerSlot === null;
  const unit = cat === 'points' ? 'Sayı' : cat === 'racks' ? 'Rack' : 'Frame';
  return (
    <div className="grid grid-cols-2 gap-2.5 pt-2">
      {[1, 2].map((slot) => {
        const u = slot === 1 ? p1 : p2;
        const winner = result.winnerSlot === slot;
        const score = slot === 1 ? result.p1Score : result.p2Score;
        const innings = slot === 1 ? result.p1Innings : result.p2Innings;
        const avg = slot === 1 ? result.p1Average : result.p2Average;
        const high = slot === 1 ? result.p1HighRun : result.p2HighRun;
        return (
          <div
            key={slot}
            className={cn(
              'relative rounded-2xl border p-3 text-center',
              winner ? 'border-brand/60 bg-brand-soft' : 'border-border bg-surface-2',
            )}
          >
            {winner ? (
              <span className="absolute -top-2.5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-brand-fg">
                <Crown className="h-3 w-3" /> Kazanan
              </span>
            ) : null}
            <PlayerHead user={u} />
            <div className={cn('mt-2 font-display text-4xl font-bold tabular-nums', winner ? 'text-brand' : 'text-fg')}>{score}</div>
            <div className="text-[11px] uppercase tracking-wide text-subtle">{unit}</div>
            <dl className="mt-2 space-y-1 text-xs">
              {cat === 'points' ? (
                <>
                  <Row label="İsteka" value={innings ?? '—'} />
                  <Row label="Ortalama" value={formatAverage(avg)} strong />
                  <Stacked label="En yüksek seri" value={high} />
                </>
              ) : cat === 'frames' ? (
                <Stacked label="En yüksek break" value={high} />
              ) : null}
            </dl>
          </div>
        );
      })}
      {draw ? <div className="col-span-2 text-center text-sm font-semibold text-muted">Berabere</div> : null}
      {result.target && cat !== 'points' ? (
        <div className="col-span-2 text-center text-xs text-muted">
          {result.target} {unit.toLowerCase()} kazanana oynandı
        </div>
      ) : null}
    </div>
  );
}

function PlayerHead({ user }: { user: MatchUser | undefined }) {
  if (!user) return <div className="text-sm text-muted">—</div>;
  const inner = (
    <>
      <Avatar name={user.displayName} src={user.avatarUrl} size="md" />
      <div className="mt-1 truncate text-sm font-semibold">{user.displayName}</div>
    </>
  );
  return user.username ? (
    <Link href={`/profil/${user.username}`} className="flex flex-col items-center">
      {inner}
    </Link>
  ) : (
    <div className="flex flex-col items-center">{inner}</div>
  );
}

function Stacked({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="border-t border-white/5 pt-1.5 text-center">
      <dt className="text-[11px] text-muted">{label}</dt>
      <dd className={cn('tabular-nums', value === null ? 'text-subtle' : 'font-semibold text-fg')}>{value ?? 'Bilinmiyor'}</dd>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className={cn('tabular-nums', strong ? 'font-bold text-fg' : 'text-fg/90')}>{value}</dd>
    </div>
  );
}
