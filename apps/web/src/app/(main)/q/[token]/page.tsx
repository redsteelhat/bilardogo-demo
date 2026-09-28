'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { defaultFormat, describeFormat, GAME_LABELS, GAME_SHORT_LABELS, GAME_TYPES, type GameType } from '@bilardogo/domain';
import { Avatar, Button, Card, CardBody, CardHeader, EmptyState, Notice, Segmented, toast } from '@bilardogo/ui';
import { AlertTriangle, ArrowRight, LayoutGrid, LogIn, Play, QrCode, ShoppingBag, SlidersHorizontal, Swords, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { GameBadge } from '@/components/common/badges';
import { PageBody, PageHeader } from '@/components/common/page-header';
import { PageLoading, QueryError } from '@/components/common/states';
import { FormatEditor, type GameAndFormat } from '@/components/match/format-editor';
import { sides, type Match } from '@/components/match/helpers';
import { MatchActions } from '@/components/match/match-actions';
import { useSession } from '@/lib/session';
import { errorMessage, trpc } from '@/lib/trpc/client';

type Scan = RouterOutputs['matches']['scanTable'];

export default function TableLandingPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <TableLanding />
    </Suspense>
  );
}

function TableLanding() {
  const { token } = useParams<{ token: string }>();
  const params = useSearchParams();
  const macId = params.get('mac');
  const { session, loading } = useSession();
  const scan = trpc.matches.scanTable.useQuery(
    { token },
    {
      enabled: !!session,
      refetchInterval: (q) => {
        const k = q.state.data?.option.kind;
        return k === 'waiting_joiner' || k === 'join_walkin' ? 4_000 : 15_000;
      },
    },
  );

  if (loading || (session && scan.isLoading)) return <PageLoading />;
  const self = `/q/${token}${macId ? `?mac=${macId}` : ''}`;
  if (!session) {
    return (
      <>
        <PageHeader title="Masa QR" backHref="/" />
        <PageBody>
          <EmptyState
            icon={<QrCode />}
            title="Masayı kullanmak için giriş yap"
            description="Maçını bu masada başlatmak ya da masa oturumu açmak için BilardoGo hesabınla giriş yapmalısın."
            action={
              <Link href={`/giris?next=${encodeURIComponent(self)}`}>
                <Button>
                  <LogIn className="h-4 w-4" /> Giriş yap
                </Button>
              </Link>
            }
          />
        </PageBody>
      </>
    );
  }
  if (scan.error || !scan.data) {
    return (
      <>
        <PageHeader title="Masa QR" backHref="/qr" />
        <PageBody className="space-y-3">
          <QueryError error={scan.error ?? new Error('Masa bulunamadı.')} retry={() => scan.refetch()} />
          <Link href="/qr">
            <Button variant="secondary" block>
              <QrCode className="h-4 w-4" /> Tekrar okut
            </Button>
          </Link>
        </PageBody>
      </>
    );
  }
  const d = scan.data;
  return (
    <>
      <PageHeader title={`Masa ${d.table.number}`} subtitle={d.venue.name} backHref="/qr" />
      <PageBody className="space-y-4">
        <TableHeader data={d} />
        {macId && !(d.option.kind === 'start_matched' && d.option.matchId === macId) && d.option.kind !== 'in_match_here' ? (
          <Notice tone="warning" icon={<AlertTriangle />}>
            Başlatmak istediğin maç bu masada başlatılamıyor. Aşağıdaki duruma göz at.
          </Notice>
        ) : null}
        <OptionView data={d} token={token} meId={session.id} emphasize={!!macId} />
      </PageBody>
    </>
  );
}

function TableHeader({ data }: { data: Scan }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-brand/15 blur-3xl" />
      <div className="relative flex items-center gap-4 p-4">
        <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border border-brand/40 bg-brand-soft text-brand">
          <span className="text-[10px] font-bold uppercase">Masa</span>
          <span className="font-display text-2xl font-bold leading-none">{data.table.number}</span>
        </div>
        <div className="min-w-0 flex-1">
          <Link href={`/salon/${data.venue.slug}`} className="block truncate font-display text-xl font-semibold hover:text-brand">
            {data.venue.name}
          </Link>
          {data.table.label ? <div className="truncate text-xs text-muted">{data.table.label}</div> : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {data.table.allowedGameTypes.map((g) => (
              <GameBadge key={g} game={g} />
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function OptionView({ data, token, meId, emphasize }: { data: Scan; token: string; meId: string; emphasize: boolean }) {
  const o = data.option;
  switch (o.kind) {
    case 'start_matched':
      return <StartMatched data={data} token={token} gameAllowed={o.gameAllowed} emphasize={emphasize} />;
    case 'open_walkin':
      return <OpenWalkIn data={data} token={token} />;
    case 'join_walkin':
      return <JoinWalkIn data={data} matchId={o.matchId} />;
    case 'waiting_joiner':
      return data.myMatch ? (
        <>
          <MatchActions match={data.myMatch} meId={meId} />
          <Link href={`/maclarim/${data.myMatch.id}`} className="block text-center text-sm font-semibold text-brand">
            Maç detayına git
          </Link>
        </>
      ) : null;
    case 'in_match_here':
      return (
        <Card className="border-danger/30">
          <CardHeader icon={<Swords className="h-5 w-5" />} title="Bu masada maçtasın" description={data.myMatch ? matchLine(data.myMatch) : undefined} />
          <CardBody className="space-y-2">
            <Link href={`/maclarim/${o.matchId}`}>
              <Button size="lg" block>
                Maça git <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href={`/salon/${data.venue.slug}/siparis?mac=${o.matchId}`}>
              <Button variant="secondary" block className="mt-2">
                <ShoppingBag className="h-4 w-4" /> Sipariş ver
              </Button>
            </Link>
          </CardBody>
        </Card>
      );
    case 'busy_elsewhere':
      return (
        <Card>
          <CardHeader
            icon={<AlertTriangle className="h-5 w-5" />}
            title="Başka bir masada aktif maçın var"
            description="Aynı anda yalnız 1 aktif maçta olabilirsin. Önce mevcut maçını bitir ya da oturumunu kapat."
          />
          <CardBody>
            {data.myMatch ? <p className="mb-3 text-sm text-muted">{matchLine(data.myMatch)}</p> : null}
            <Link href={`/maclarim/${o.matchId}`}>
              <Button block>Aktif maçıma git</Button>
            </Link>
          </CardBody>
        </Card>
      );
    case 'occupied': {
      const tm = data.tableMatch;
      return (
        <Card>
          <CardHeader icon={<LayoutGrid className="h-5 w-5" />} title="Masa dolu" description="Bu masada şu an bir maç oynanıyor." />
          <CardBody className="space-y-3">
            {tm ? (
              <div className="flex items-center gap-2 rounded-2xl bg-surface-2 p-3">
                <div className="flex -space-x-2">
                  {tm.players.map((p) => (
                    <Avatar key={p.slot} name={p.user.displayName} src={p.user.avatarUrl} size="sm" />
                  ))}
                </div>
                <div className="min-w-0 flex-1 truncate text-sm font-semibold">{tm.players.map((p) => p.user.displayName).join(' – ')}</div>
                <GameBadge game={tm.gameType} />
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <Link href={`/salon/${data.venue.slug}/kimler-var`}>
                <Button variant="secondary" block>
                  Boş masalar
                </Button>
              </Link>
              <Link href={`/salon/${data.venue.slug}/siparis`}>
                <Button variant="secondary" block>
                  <ShoppingBag className="h-4 w-4" /> Sipariş ver
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      );
    }
  }
}

function matchLine(m: Match) {
  const { opponent } = sides(m);
  return [GAME_SHORT_LABELS[m.gameType], opponent?.displayName, m.venue?.name, m.table ? `Masa ${m.table.number}` : null].filter(Boolean).join(' · ');
}

function StartMatched({ data, token, gameAllowed, emphasize }: { data: Scan; token: string; gameAllowed: boolean; emphasize: boolean }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const m = data.myMatch!;
  const start = trpc.matches.startMatched.useMutation({
    onSuccess: async (r) => {
      await Promise.all([utils.matches.invalidate(), utils.venues.live.invalidate()]);
      toast.success('Maç başladı. İyi oyunlar!', { description: `Masa ${data.table.number} artık dolu görünüyor.` });
      router.replace(`/maclarim/${r.matchId}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const wrongVenue = m.venue && m.venue.id !== data.venue.id;
  return (
    <Card className={emphasize && gameAllowed ? 'border-brand/60 ring-2 ring-brand/20' : undefined}>
      <CardHeader icon={<Swords className="h-5 w-5" />} title="Eşleştiğin maç" description={matchLine(m)} />
      <CardBody className="space-y-3">
        {gameAllowed ? (
          <>
            <p className="text-sm text-muted">
              Maç bu masaya bağlanacak ve masa <span className="font-semibold text-fg">Dolu</span> görünecek. Rakibinin de masada olduğundan emin ol.
            </p>
            <Button size="lg" block loading={start.isPending} onClick={() => start.mutate({ matchId: m.id, token })}>
              <Play className="h-5 w-5" fill="currentColor" /> Maçı bu masada başlat
            </Button>
          </>
        ) : (
          <Notice tone="danger" icon={<AlertTriangle />} title="Bu masada başlatılamaz">
            {wrongVenue
              ? `Bu maç ${m.venue!.name} için ayarlandı. Doğru salondaki masanın QR kodunu okut.`
              : `Masa ${data.table.number}’de yalnız ${data.table.allowedGameTypes.map((g) => GAME_SHORT_LABELS[g]).join(' / ')} oynanabilir; ${GAME_LABELS[m.gameType]} için uygun bir masa seç.`}
          </Notice>
        )}
        <Link href={`/maclarim/${m.id}`} className="block text-center text-sm font-semibold text-brand">
          Maç detayı
        </Link>
      </CardBody>
    </Card>
  );
}

function OpenWalkIn({ data, token }: { data: Scan; token: string }) {
  const utils = trpc.useUtils();
  const allowed = data.table.allowedGameTypes;
  const first = allowed[0] ?? 'three_cushion';
  const [gf, setGf] = useState<GameAndFormat>({ gameType: first, format: defaultFormat(first) });
  const [custom, setCustom] = useState(false);
  const open = trpc.matches.openWalkIn.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.matches.invalidate(), utils.venues.live.invalidate()]);
      toast.success('Masa oturumu açıldı', { description: 'Rakibin aynı QR kodunu okutsun.' });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const blocked = GAME_TYPES.filter((g) => !allowed.includes(g));
  return (
    <Card>
      <CardHeader
        icon={<UserPlus className="h-5 w-5" />}
        title="Masada oyna"
        description="Eşleşmiş bir maçın yok. Masa oturumu aç; rakibin aynı QR’ı okutunca onaylayıp başlatırsın."
      />
      <CardBody className="space-y-4">
        <div>
          <div className="mb-2 text-sm text-muted">Oyun türü</div>
          <Segmented<GameType>
            wrap
            size="sm"
            value={gf.gameType}
            onChange={(g) => setGf({ gameType: g, format: defaultFormat(g) })}
            options={GAME_TYPES.map((g) => ({ value: g, label: GAME_SHORT_LABELS[g], disabled: !allowed.includes(g) }))}
          />
          {blocked.length ? (
            <p className="mt-1.5 text-[11px] text-subtle">
              Masa {data.table.number} yalnız {allowed.map((g) => GAME_SHORT_LABELS[g]).join(' / ')} için; {blocked.map((g) => GAME_SHORT_LABELS[g]).join(', ')} seçilemez.
            </p>
          ) : null}
        </div>
        <div className="rounded-2xl border border-border bg-surface-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-sm">
              <span className="text-muted">Format: </span>
              <span className="font-semibold">{describeFormat(gf.format)}</span>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setCustom((c) => !c)}>
              <SlidersHorizontal className="h-3.5 w-3.5" /> {custom ? 'Kapat' : 'Düzenle'}
            </Button>
          </div>
          {custom ? <FormatEditor className="mt-2" value={gf} onChange={setGf} hideGamePicker allowedGames={allowed} /> : null}
        </div>
        <Button size="lg" block loading={open.isPending} onClick={() => open.mutate({ token, gameType: gf.gameType, format: gf.format })}>
          <Play className="h-5 w-5" fill="currentColor" /> Masa oturumu aç
        </Button>
        <p className="text-center text-[11px] text-subtle">Rakibin 5 dakika içinde katılmazsa oturum kapanır.</p>
      </CardBody>
    </Card>
  );
}

function JoinWalkIn({ data, matchId }: { data: Scan; matchId: string }) {
  const utils = trpc.useUtils();
  const tm = data.tableMatch;
  const host = tm?.players.find((p) => p.slot === 1)?.user;
  const join = trpc.matches.joinWalkIn.useMutation({
    onSuccess: async () => {
      await utils.matches.invalidate();
      toast.success('Oturuma katıldın', { description: 'Masa sahibinin onayı bekleniyor.' });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Card className="border-brand/40">
      <CardHeader icon={<UserPlus className="h-5 w-5" />} title="Açık masa oturumu" description="Bu masada rakip bekleyen bir oyuncu var." />
      <CardBody className="space-y-3">
        {host ? (
          <div className="flex items-center gap-3 rounded-2xl bg-surface-2 p-3">
            <Avatar name={host.displayName} src={host.avatarUrl} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{host.displayName}</div>
              <div className="truncate text-xs text-muted">{tm ? `${GAME_LABELS[tm.gameType]} · ${describeFormat(tm.format)}` : ''}</div>
            </div>
          </div>
        ) : null}
        <Button size="lg" block loading={join.isPending} onClick={() => join.mutate({ matchId })}>
          <UserPlus className="h-5 w-5" /> Oturuma katıl
        </Button>
        <p className="text-center text-[11px] text-subtle">Katıldıktan sonra {host?.displayName.split(' ')[0] ?? 'masa sahibi'} seni onaylayınca maç başlar.</p>
      </CardBody>
    </Card>
  );
}
