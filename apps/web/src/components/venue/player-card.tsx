import type { RouterOutputs } from '@bilardogo/api';
import { formatAverage, LEVEL_LABELS } from '@bilardogo/domain';
import { Avatar, cn } from '@bilardogo/ui';
import { Clock, Zap } from 'lucide-react';
import Link from 'next/link';
import { GameBadge, MatchStateBadge, PresenceBadge } from '@/components/common/badges';
import { formatTime, relative } from '@/lib/format';

export type LivePerson = RouterOutputs['venues']['live']['atVenue'][number];

/** "Salonda Kimler Var?" oyuncu kartı: avatar, ad, seviye · salon, durum rozetleri, oyun türleri, maç isteği. */
export function PlayerCard({
  person,
  venueId,
  venueName,
  isMe,
  loggedIn,
}: {
  person: LivePerson;
  venueId: string;
  venueName: string;
  isMe: boolean;
  loggedIn: boolean;
}) {
  const u = person.user;
  const busy = person.matchState === 'in_match' || person.matchState === 'will_play';
  const canChallenge = !isMe && !busy;
  const params = new URLSearchParams({ rakip: u.id, salon: venueId });
  if (u.username) params.set('kullanici', u.username);
  const challengeHref = `/mac-istegi?${params.toString()}`;
  const avg3 = person.averages.three_cushion;
  const coming = person.status === 'coming';

  return (
    <div className={cn('flex gap-3 rounded-2xl border bg-surface p-3.5', isMe ? 'border-brand/40' : 'border-border')}>
      <Link href={u.username ? `/profil/${u.username}` : '#'} className="shrink-0">
        <Avatar
          name={u.displayName}
          src={u.avatarUrl}
          size="lg"
          status={person.matchState === 'in_match' ? 'in_match' : person.status}
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <Link href={u.username ? `/profil/${u.username}` : '#'} className="min-w-0 flex-1">
            <div className="truncate font-semibold">
              {u.displayName}
              {isMe ? <span className="ml-1.5 text-xs font-normal text-brand">(sen)</span> : null}
            </div>
            <div className="truncate text-xs text-muted">
              {LEVEL_LABELS[u.level]} · {venueName}
            </div>
          </Link>
          <PresenceBadge status={person.status} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {coming && person.eta ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-semibold text-warning">
              <Clock className="h-3 w-3" /> {formatTime(person.eta)} · {relative(person.eta)}
            </span>
          ) : (
            <MatchStateBadge state={person.matchState} />
          )}
          {u.gameTypes.slice(0, 3).map((g) => (
            <GameBadge key={g} game={g} />
          ))}
          {avg3 != null ? (
            <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-fg">
              3B ort. <span className="tabular-nums text-brand">{formatAverage(avg3)}</span>
            </span>
          ) : null}
        </div>
      </div>
      {canChallenge ? (
        <Link
          href={loggedIn ? challengeHref : `/giris?next=${encodeURIComponent(challengeHref)}`}
          aria-label={`${u.displayName} oyuncusuna maç isteği gönder`}
          className="flex h-10 w-10 shrink-0 items-center justify-center self-center rounded-full border border-brand/50 bg-brand-soft text-brand transition-colors hover:bg-brand hover:text-brand-fg"
        >
          <Zap className="h-4 w-4" fill="currentColor" />
        </Link>
      ) : null}
    </div>
  );
}
