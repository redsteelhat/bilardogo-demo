import { Badge } from '@bilardogo/ui';
import {
  DISPLAY_MATCH_STATE_LABELS,
  GAME_SHORT_LABELS,
  LEVEL_LABELS,
  MATCH_STATUS_LABELS,
  VENUE_STATUS_LABELS,
  type DisplayMatchState,
  type GameType,
  type Level,
  type MatchStatus,
  type VenueStatus,
} from '@bilardogo/domain';

const GAME_DOT: Record<GameType, string> = {
  three_cushion: 'bg-red-400',
  carom: 'bg-amber-300',
  eight_ball: 'bg-sky-400',
  nine_ball: 'bg-yellow-300',
  snooker: 'bg-emerald-400',
};

export function GameBadge({ game }: { game: GameType }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-muted">
      <span className={`h-2 w-2 rounded-full ${GAME_DOT[game]}`} />
      {GAME_SHORT_LABELS[game]}
    </span>
  );
}

export function LevelBadge({ level }: { level: Level }) {
  return <span className="text-xs text-muted">{LEVEL_LABELS[level]}</span>;
}

export function PresenceBadge({ status }: { status: VenueStatus }) {
  if (status === 'offline') return <Badge tone="neutral">{VENUE_STATUS_LABELS.offline}</Badge>;
  return (
    <Badge tone={status === 'at_venue' ? 'brand' : 'warning'} dot>
      {status === 'at_venue' ? 'Salonda' : 'Gelecek'}
    </Badge>
  );
}

export function MatchStateBadge({ state }: { state: DisplayMatchState }) {
  if (!state) return null;
  const tone = state === 'wants' ? 'brand' : state === 'in_match' ? 'danger' : state === 'will_play' ? 'info' : 'neutral';
  return (
    <Badge tone={tone} dot>
      {DISPLAY_MATCH_STATE_LABELS[state]}
    </Badge>
  );
}

export function MatchStatusBadge({ status }: { status: MatchStatus }) {
  const tone =
    status === 'in_progress'
      ? 'danger'
      : status === 'accepted' || status === 'waiting_opponent'
        ? 'info'
        : status === 'completed'
          ? 'success'
          : status === 'requested' || status === 'awaiting_result' || status === 'pending_confirmation'
            ? 'warning'
            : 'neutral';
  return <Badge tone={tone}>{MATCH_STATUS_LABELS[status]}</Badge>;
}
