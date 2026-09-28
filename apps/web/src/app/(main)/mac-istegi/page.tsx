'use client';
import { describeFormat, GAME_LABELS, isGameType, LEVEL_LABELS } from '@bilardogo/domain';
import { Avatar, Button, Card, CardBody, EmptyState, Field, Input, Notice, Segmented, Skeleton, Spinner, Textarea, toast } from '@bilardogo/ui';
import { Info, Search, Send, Swords, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { PageBody, PageHeader } from '@/components/common/page-header';
import { PageLoading } from '@/components/common/states';
import type { UserSummary } from '@/components/common/user-chip';
import { FormatEditor, initialGameAndFormat, type GameAndFormat } from '@/components/match/format-editor';
import { useSelectedCity } from '@/lib/city';
import { cityName, formatDateTime, fromLocalInputValue, toLocalInputValue } from '@/lib/format';
import { useSession } from '@/lib/session';
import { errorMessage, trpc } from '@/lib/trpc/client';

type Opponent = { user: UserSummary; subtitle?: string | null };

export default function MatchRequestPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <MatchRequest />
    </Suspense>
  );
}

function MatchRequest() {
  const params = useSearchParams();
  const router = useRouter();
  const { session, loading } = useSession();
  const rakipId = params.get('rakip');
  const username = params.get('kullanici');
  const salonParam = params.get('salon');
  const oyun = params.get('oyun');

  const [opponent, setOpponent] = useState<Opponent | null>(null);
  const [cleared, setCleared] = useState(false);
  const [gf, setGf] = useState<GameAndFormat>(() => initialGameAndFormat(isGameType(oyun) ? oyun : 'three_cushion'));
  const [gameTouched, setGameTouched] = useState(isGameType(oyun));
  const [venueId, setVenueId] = useState<string | null>(salonParam);
  const [when, setWhen] = useState<'now' | 'scheduled'>('now');
  const [at, setAt] = useState(() => toLocalInputValue(new Date(Date.now() + 60 * 60_000)));
  const [note, setNote] = useState('');
  const [tried, setTried] = useState(false);

  // Rakibi URL'den çöz: kullanıcı adı varsa profil, yoksa salonun canlı listesinden id ile
  const profile = trpc.players.profile.useQuery({ username: username ?? '' }, { enabled: !!username && !!session && !cleared });
  const liveForId = trpc.venues.live.useQuery({ venueId: salonParam ?? '' }, { enabled: !username && !!rakipId && !!salonParam && !!session });
  useEffect(() => {
    if (opponent || cleared) return;
    if (profile.data && !profile.data.isMe) {
      const p = profile.data.presence;
      setOpponent({ user: profile.data.user, subtitle: p ? `${p.venueName ?? ''} · ${p.status === 'at_venue' ? 'Salonda' : 'Gelecek'}` : null });
    } else if (liveForId.data && rakipId) {
      const person = [...liveForId.data.atVenue, ...liveForId.data.coming].find((x) => x.user.id === rakipId);
      if (person) setOpponent({ user: person.user, subtitle: person.status === 'at_venue' ? 'Salonda' : 'Gelecek' });
    }
  }, [profile.data, liveForId.data, rakipId, opponent, cleared]);

  // Rakibin oynadığı ilk türü varsayılan yap
  useEffect(() => {
    if (!gameTouched && opponent?.user.gameTypes[0]) setGf(initialGameAndFormat(opponent.user.gameTypes[0]));
  }, [opponent, gameTouched]);

  const [city] = useSelectedCity(session?.cityPlate);
  const venues = trpc.venues.list.useQuery({ cityPlate: city }, { enabled: !!session });
  const presence = trpc.presence.me.useQuery(undefined, { enabled: !!session });
  useEffect(() => {
    if (venueId) return;
    if (presence.data?.venueId) setVenueId(presence.data.venueId);
    else if (venues.data?.[0]) setVenueId(venues.data[0].id);
  }, [venueId, presence.data, venues.data]);

  const request = trpc.matches.request.useMutation({
    onSuccess: async (r) => {
      toast.success('Maç isteği gönderildi', { description: `${opponent?.user.displayName ?? 'Rakibin'} yanıtladığında bildirim alacaksın.` });
      router.replace(`/maclarim/${r.id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const scheduledIso = when === 'scheduled' && at ? fromLocalInputValue(at) : null;
  const errors = useMemo(() => {
    const e: Partial<Record<'opponent' | 'venue' | 'time', string>> = {};
    if (!opponent) e.opponent = 'Rakip seç.';
    if (!venueId) e.venue = 'Salon seç.';
    if (when === 'scheduled') {
      const t = scheduledIso ? new Date(scheduledIso).getTime() : NaN;
      if (!scheduledIso || Number.isNaN(t)) e.time = 'Maç saatini seç.';
      else if (t < Date.now() - 5 * 60_000) e.time = 'Geçmiş bir saat seçilemez.';
      else if (t > Date.now() + 14 * 86400_000) e.time = 'En fazla 14 gün sonrası için maç ayarlanabilir.';
    }
    return e;
  }, [opponent, venueId, when, scheduledIso]);

  if (loading) return <PageLoading />;
  if (!session) {
    return (
      <>
        <PageHeader title="Maç İsteği Gönder" />
        <PageBody>
          <EmptyState
            icon={<Swords />}
            title="Maç isteği göndermek için giriş yap"
            action={
              <Link href={`/giris?next=${encodeURIComponent(`/mac-istegi?${params.toString()}`)}`}>
                <Button>Giriş yap</Button>
              </Link>
            }
          />
        </PageBody>
      </>
    );
  }

  const resolving = !cleared && !opponent && ((!!username && profile.isLoading) || (!username && !!rakipId && liveForId.isLoading));
  const venueList = venues.data ?? [];
  const selectedVenue = venueList.find((v) => v.id === venueId);
  const oppFirst = opponent?.user.displayName.split(' ')[0];

  const submit = () => {
    setTried(true);
    if (Object.keys(errors).length || !opponent || !venueId) return;
    request.mutate({
      opponentId: opponent.user.id,
      venueId,
      gameType: gf.gameType,
      format: gf.format,
      when,
      scheduledAt: when === 'scheduled' ? scheduledIso : null,
      note: note.trim() || null,
    });
  };

  return (
    <>
      <PageHeader title="Maç İsteği Gönder" />
      <PageBody className="space-y-5">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">Rakip</h2>
          {resolving ? (
            <Skeleton className="h-[72px] w-full rounded-2xl" />
          ) : opponent ? (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5">
              <Avatar name={opponent.user.displayName} src={opponent.user.avatarUrl} size="md" />
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{opponent.user.displayName}</div>
                <div className="truncate text-xs text-muted">
                  {LEVEL_LABELS[opponent.user.level]}
                  {opponent.subtitle ? <span className="text-brand"> · {opponent.subtitle}</span> : null}
                </div>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                aria-label="Rakibi değiştir"
                onClick={() => {
                  setOpponent(null);
                  setCleared(true);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <OpponentSearch cityPlate={session.cityPlate} onPick={(u) => setOpponent({ user: u })} error={tried ? errors.opponent : undefined} />
          )}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">Oyun Bilgileri</h2>
          <Card>
            <CardBody className="pt-4">
              <FormatEditor
                value={gf}
                onChange={(v) => {
                  setGf(v);
                  setGameTouched(true);
                }}
                opponentName={opponent?.user.displayName}
              />
            </CardBody>
          </Card>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">Salon</h2>
          {venues.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : venueList.length ? (
            <Segmented
              wrap
              size="sm"
              value={venueId}
              onChange={setVenueId}
              options={venueList.map((v) => ({ value: v.id, label: v.name }))}
            />
          ) : (
            <Notice tone="info">{cityName(city)} için salon bulunamadı.</Notice>
          )}
          {venueId && venueList.length && !selectedVenue ? (
            <p className="mt-1.5 text-xs text-muted">Seçili salon başka bir şehirde; istersen listeden değiştir.</p>
          ) : null}
          {tried && errors.venue ? <p className="mt-1 text-xs text-danger">{errors.venue}</p> : null}
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted">Zaman</h2>
          <Segmented
            value={when}
            onChange={setWhen}
            options={[
              { value: 'now', label: 'Hemen' },
              { value: 'scheduled', label: 'Belirli saat' },
            ]}
          />
          {when === 'scheduled' ? (
            <Field className="mt-3" error={tried || at ? errors.time : undefined} hint={scheduledIso ? formatDateTime(scheduledIso) : undefined}>
              <Input
                type="datetime-local"
                value={at}
                min={toLocalInputValue(new Date())}
                max={toLocalInputValue(new Date(Date.now() + 14 * 86400_000))}
                onChange={(e) => setAt(e.target.value)}
              />
            </Field>
          ) : null}
        </section>

        <Field label="Not (opsiyonel)">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} placeholder="Mesajınızı yazın..." />
        </Field>

        <Notice tone="brand" icon={<Info />} title="Özet">
          {GAME_LABELS[gf.gameType]} · {describeFormat(gf.format)}
          {selectedVenue ? ` · ${selectedVenue.name}` : ''} · {when === 'now' ? 'Hemen' : scheduledIso ? formatDateTime(scheduledIso) : 'Saat seçilmedi'}
          {oppFirst ? ` · Rakip: ${oppFirst}` : ''}
        </Notice>

        <Button size="lg" block loading={request.isPending} onClick={submit}>
          <Send className="h-4 w-4" /> İsteği gönder
        </Button>
        <p className="text-center text-xs text-subtle">Kabul edilen maç “Maç Yapacak” olur; masadaki QR okutulunca başlar.</p>
      </PageBody>
    </>
  );
}

function OpponentSearch({ cityPlate, onPick, error }: { cityPlate: number | null; onPick: (u: UserSummary) => void; error?: string }) {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const search = trpc.players.search.useQuery({ q: debounced, cityPlate: cityPlate ?? undefined }, { enabled: debounced.length >= 2 });
  return (
    <div className="rounded-2xl border border-border bg-surface p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <Input autoFocus placeholder="Oyuncu ara (ad veya @kullanıcı adı)" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
      </div>
      {error ? <p className="mt-1.5 text-xs text-danger">{error}</p> : null}
      <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
        {debounced.length < 2 ? (
          <p className="px-1 py-2 text-xs text-subtle">En az 2 harf yaz.</p>
        ) : search.isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner />
          </div>
        ) : search.data?.length ? (
          search.data.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => onPick(u)}
              className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-surface-2"
            >
              <Avatar name={u.displayName} src={u.avatarUrl} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{u.displayName}</span>
                <span className="block truncate text-xs text-muted">
                  @{u.username} · {LEVEL_LABELS[u.level]}
                  {u.cityPlate ? ` · ${cityName(u.cityPlate)}` : ''}
                </span>
              </span>
            </button>
          ))
        ) : (
          <p className="px-1 py-2 text-xs text-subtle">Oyuncu bulunamadı.</p>
        )}
      </div>
    </div>
  );
}
