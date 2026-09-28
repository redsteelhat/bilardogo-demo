'use client';
import { describeFormat, GAME_LABELS, GAME_SHORT_LABELS } from '@bilardogo/domain';
import { Avatar, Button, Card, CardBody, CardHeader, EmptyState, Notice, StatTile, cn } from '@bilardogo/ui';
import { CalendarClock, Info, LayoutGrid, MapPin, StickyNote, Swords, Trophy } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { GameBadge, MatchStatusBadge } from '@/components/common/badges';
import { PageBody, PageHeader } from '@/components/common/page-header';
import { PageLoading, QueryError } from '@/components/common/states';
import { sides, whenLabel, type Match, type MatchUser } from '@/components/match/helpers';
import { MatchActions } from '@/components/match/match-actions';
import { Scoreboard } from '@/components/match/scoreboard';
import { StatusTimeline } from '@/components/match/status-timeline';
import { useSession } from '@/lib/session';
import { trpc } from '@/lib/trpc/client';

const LIVE = ['requested', 'accepted', 'waiting_opponent', 'in_progress', 'awaiting_result', 'pending_confirmation'];

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { session, loading } = useSession();
  const q = trpc.matches.get.useQuery(
    { matchId: id },
    {
      enabled: !!session,
      refetchInterval: (query) => {
        const s = query.state.data?.status;
        if (s === 'waiting_opponent') return 5_000;
        return s && LIVE.includes(s) ? 15_000 : false;
      },
    },
  );

  if (loading || (session && q.isLoading)) return <PageLoading />;
  if (!session) {
    return (
      <>
        <PageHeader title="Maç" backHref="/maclarim" />
        <PageBody>
          <EmptyState
            icon={<Swords />}
            title="Maçı görmek için giriş yap"
            action={
              <Link href={`/giris?next=${encodeURIComponent(`/maclarim/${id}`)}`}>
                <Button>Giriş yap</Button>
              </Link>
            }
          />
        </PageBody>
      </>
    );
  }
  if (q.error || !q.data) {
    return (
      <>
        <PageHeader title="Maç" backHref="/maclarim" />
        <PageBody className="space-y-3">
          <QueryError error={q.error ?? new Error('Maç bulunamadı.')} retry={() => q.refetch()} />
          <Link href="/maclarim">
            <Button variant="secondary" block>
              Maçlarıma dön
            </Button>
          </Link>
        </PageBody>
      </>
    );
  }
  const m = q.data;
  const failed = ['declined', 'cancelled', 'expired', 'void'].includes(m.status);

  return (
    <>
      <PageHeader title="Maç Detayı" subtitle={GAME_LABELS[m.gameType]} backHref="/maclarim" />
      <PageBody className="space-y-4">
        <Hero match={m} />

        <Card>
          <CardBody className="pt-4">
            <StatusTimeline
              status={m.status}
              source={m.source}
              playerCount={m.players.length}
              timestamps={{ acceptedAt: m.acceptedAt, startedAt: m.startedAt, endedAt: m.endedAt }}
            />
          </CardBody>
        </Card>

        {failed ? (
          <Notice tone={m.status === 'void' ? 'warning' : 'danger'} icon={<Info />} title={m.statusLabel}>
            {m.status === 'declined'
              ? 'Maç isteği reddedildi.'
              : m.status === 'cancelled'
                ? 'Bu maç iptal edildi.'
                : m.status === 'expired'
                  ? 'Zamanında yanıtlanmadığı veya başlatılmadığı için maçın süresi doldu.'
                  : 'Sonuç zamanında girilmediği veya onaylanmadığı için maç sonuçsuz kapandı.'}
          </Notice>
        ) : null}

        {m.mySlot ? <MatchActions match={m} meId={session.id} /> : null}

        {m.status === 'completed' && m.result ? <Completed match={m} /> : null}

        {m.note ? (
          <Card>
            <CardHeader icon={<StickyNote className="h-5 w-5" />} title="Not" />
            <CardBody>
              <p className="whitespace-pre-line text-sm text-muted">{m.note}</p>
            </CardBody>
          </Card>
        ) : null}
      </PageBody>
    </>
  );
}

function Hero({ match }: { match: Match }) {
  const { p1, p2 } = sides(match);
  const r = match.result;
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-64 -translate-x-1/2 rounded-full bg-brand/15 blur-3xl" />
      <div className="relative flex items-center justify-between gap-2 px-4 pt-4">
        <GameBadge game={match.gameType} />
        <MatchStatusBadge status={match.status} />
      </div>
      <div className="relative grid grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-5">
        <Side user={p1} me={match.mySlot === 1} winner={r?.winnerSlot === 1 && match.status === 'completed'} />
        <div className="text-center">
          {r ? (
            <div className="font-display text-3xl font-bold tabular-nums">
              {r.p1Score}
              <span className="mx-1 text-subtle">–</span>
              {r.p2Score}
            </div>
          ) : (
            <div className="font-display text-2xl font-bold text-brand">VS</div>
          )}
          <div className="mt-1 text-[11px] text-muted">{describeFormat(match.format)}</div>
        </div>
        <Side user={p2} me={match.mySlot === 2} winner={r?.winnerSlot === 2 && match.status === 'completed'} />
      </div>
      <div className="relative grid grid-cols-1 gap-1.5 border-t border-border px-4 py-3 text-xs text-muted sm:grid-cols-3">
        {match.venue ? (
          <Link href={`/salon/${match.venue.slug}`} className="flex items-center gap-1.5 hover:text-fg">
            <MapPin className="h-3.5 w-3.5 text-brand" /> {match.venue.name}
          </Link>
        ) : null}
        <span className="flex items-center gap-1.5">
          <LayoutGrid className="h-3.5 w-3.5 text-brand" /> {match.table ? `Masa ${match.table.number}` : 'Masa henüz yok'}
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarClock className="h-3.5 w-3.5 text-brand" /> {whenLabel(match)}
        </span>
      </div>
    </Card>
  );
}

function Side({ user, me, winner }: { user: MatchUser | null; me: boolean; winner: boolean }) {
  if (!user) {
    return (
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-border text-subtle">?</span>
        <div className="mt-1.5 text-sm text-muted">Rakip bekleniyor</div>
      </div>
    );
  }
  const body = (
    <>
      <span className="relative">
        <Avatar name={user.displayName} src={user.avatarUrl} size="lg" className={cn(winner && 'rounded-full ring-2 ring-brand')} />
        {winner ? <Trophy className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-brand p-0.5 text-brand-fg" /> : null}
      </span>
      <div className="mt-1.5 line-clamp-2 text-sm font-semibold leading-tight">{user.displayName}</div>
      {me ? <div className="text-[11px] text-brand">Sen</div> : user.username ? <div className="text-[11px] text-muted">@{user.username}</div> : null}
    </>
  );
  return user.username && !me ? (
    <Link href={`/profil/${user.username}`} className="flex min-w-0 flex-col items-center text-center">
      {body}
    </Link>
  ) : (
    <div className="flex min-w-0 flex-col items-center text-center">{body}</div>
  );
}

function Completed({ match }: { match: Match }) {
  const { opponent } = sides(match);
  const h2h = trpc.matches.headToHead.useQuery({ userId: opponent?.id ?? '', gameType: match.gameType }, { enabled: !!opponent && !!match.mySlot });
  const r = match.result!;
  const won = match.mySlot ? r.winnerSlot === match.mySlot : null;
  return (
    <>
      <Card>
        <CardHeader
          icon={<Trophy className="h-5 w-5" />}
          title={r.winnerSlot === null ? 'Berabere' : won === true ? 'Kazandın!' : won === false ? 'Kaybettin' : 'Sonuç'}
          description={`${r.summary} · onaylandı`}
        />
        <CardBody>
          <Scoreboard match={match} result={r} />
        </CardBody>
      </Card>
      {opponent && h2h.data ? (
        <Card>
          <CardHeader
            title="Karşılıklı geçmiş"
            description={`${GAME_SHORT_LABELS[match.gameType]} · ${opponent.displayName} ile ${h2h.data.total} maç`}
          />
          <CardBody className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <StatTile label="Galibiyet" value={<span className="text-success">{h2h.data.wins}</span>} />
              <StatTile label="Beraberlik" value={h2h.data.draws} />
              <StatTile label="Mağlubiyet" value={<span className="text-danger">{h2h.data.losses}</span>} />
            </div>
            {opponent.username ? (
              <Link href={`/profil/${opponent.username}`}>
                <Button variant="secondary" block>
                  {opponent.displayName} profiline git
                </Button>
              </Link>
            ) : null}
          </CardBody>
        </Card>
      ) : null}
    </>
  );
}
