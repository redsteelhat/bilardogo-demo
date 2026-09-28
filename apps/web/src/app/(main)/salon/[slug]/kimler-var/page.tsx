'use client';
import { EmptyState, ListRow, Menu, MenuContent, MenuItem, MenuTrigger, SectionTitle } from '@bilardogo/ui';
import { ChevronRight, Clock, LayoutGrid, MoreHorizontal, Navigation, ShoppingBag, Store, Swords, UserRound, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { PageBody, PageHeader } from '@/components/common/page-header';
import { ListSkeleton, PageLoading, QueryError } from '@/components/common/states';
import { PlayerCard, type LivePerson } from '@/components/venue/player-card';
import { PresenceControls } from '@/components/venue/presence-controls';
import { TableGrid } from '@/components/venue/table-grid';
import { directionsUrl } from '@/lib/format';
import { useRealtime } from '@/lib/realtime';
import { useSession } from '@/lib/session';
import { trpc } from '@/lib/trpc/client';

export default function WhoIsHerePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const loggedIn = !!session;
  const venue = trpc.venues.get.useQuery({ slug });
  const venueId = venue.data?.id;
  const live = trpc.venues.live.useQuery({ venueId: venueId ?? '' }, { enabled: !!venueId, refetchInterval: 20_000 });
  const me = trpc.presence.me.useQuery(undefined, { enabled: loggedIn, refetchInterval: 60_000 });
  const mine = trpc.matches.mine.useQuery(undefined, { enabled: loggedIn, refetchInterval: 60_000 });
  const utils = trpc.useUtils();
  useRealtime(venueId ? `venue:${venueId}` : null, ['presence', 'match', 'tables'], () => {
    if (!venueId) return;
    void utils.venues.live.invalidate({ venueId });
    if (loggedIn) void utils.presence.me.invalidate();
  });

  if (venue.isLoading || sessionLoading) return <PageLoading />;
  if (venue.error || !venue.data) {
    return (
      <>
        <PageHeader title="Salonda Kimler Var?" backHref="/" />
        <PageBody>
          <QueryError error={venue.error ?? new Error('Salon bulunamadı.')} retry={() => venue.refetch()} />
        </PageBody>
      </>
    );
  }
  const v = venue.data;
  const data = live.data;
  const atCount = data?.atVenue.length ?? v.activeCount;
  const first = session ? (session.fullName.split(' ')[0] || session.username) : null;
  const incoming = mine.data?.incoming.length ?? 0;
  const isMe = (p: LivePerson) => p.user.id === session?.id;
  const freeTables = data?.tables.filter((t) => t.status === 'free').length ?? 0;
  const sortPeople = (list: LivePerson[]) =>
    [...list].sort((a, b) => Number(isMe(b)) - Number(isMe(a)) || Number(b.matchState === 'wants') - Number(a.matchState === 'wants'));

  const renderList = (list: LivePerson[] | undefined, empty: string) =>
    live.isLoading ? (
      <ListSkeleton rows={2} />
    ) : live.error ? (
      <QueryError error={live.error} retry={() => live.refetch()} />
    ) : list && list.length ? (
      <div className="space-y-2.5">
        {sortPeople(list).map((p) => (
          <PlayerCard key={p.user.id} person={p} venueId={v.id} venueName={v.name} isMe={isMe(p)} loggedIn={loggedIn} />
        ))}
      </div>
    ) : (
      <EmptyState icon={<UserRound />} title={empty} className="py-8" />
    );

  return (
    <>
      <PageHeader
        title="Salonda Kimler Var?"
        subtitle={`${v.name} · ${atCount} oyuncu salonda`}
        backHref={`/salon/${v.slug}`}
        actions={
          <Menu>
            <MenuTrigger className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface" aria-label="Diğer">
              <MoreHorizontal className="h-4 w-4" />
            </MenuTrigger>
            <MenuContent>
              <MenuItem icon={<Store />} onSelect={() => router.push(`/salon/${v.slug}`)}>
                Salon sayfası
              </MenuItem>
              <MenuItem icon={<ShoppingBag />} onSelect={() => router.push(`/salon/${v.slug}/siparis`)}>
                Sipariş oluştur
              </MenuItem>
              <MenuItem icon={<Navigation />} onSelect={() => window.open(directionsUrl(v), '_blank', 'noopener')}>
                Yol tarifi
              </MenuItem>
            </MenuContent>
          </Menu>
        }
      />
      <PageBody>
        <section className="relative pt-2">
          <div className="pointer-events-none absolute -left-10 -top-6 h-40 w-40 rounded-full bg-brand/10 blur-3xl" />
          <h2 className="font-display text-3xl font-bold leading-tight">{first ? `Merhaba, ${first}` : 'Merhaba'}</h2>
          <p className="mt-1 text-sm text-muted">Bugün oynayacak kimse var mı?</p>
        </section>

        <div className="mt-4">
          <PresenceControls venue={v} me={me.data} loggedIn={loggedIn} />
          {!loggedIn ? (
            <p className="mt-2 text-xs text-subtle">
              Durumunu paylaşmak ve maç isteği göndermek için{' '}
              <Link href={`/giris?next=${encodeURIComponent(`/salon/${v.slug}/kimler-var`)}`} className="font-semibold text-brand">
                giriş yap
              </Link>
              .
            </p>
          ) : null}
        </div>

        <div className="mt-4 space-y-2.5">
          <Link href={`/salon/${v.slug}`} className="block">
            <ListRow icon={<Store className="h-5 w-5" />} title={v.name} subtitle="Salonu takip et ve mesajlaş" right={<ChevronRight className="h-4 w-4 text-muted" />} />
          </Link>
          <Link href={loggedIn ? '/maclarim' : `/giris?next=${encodeURIComponent('/maclarim')}`} className="block">
            <ListRow
              icon={<Swords className="h-5 w-5" />}
              title="Maçlarım"
              subtitle={
                <span className={incoming ? 'font-semibold text-brand' : undefined}>Gelen teklifler: {incoming} adet</span>
              }
              right={<ChevronRight className="h-4 w-4 text-muted" />}
            />
          </Link>
          <Link href={`/salon/${v.slug}/siparis`} className="block">
            <ListRow
              icon={<ShoppingBag className="h-5 w-5" />}
              title="Sipariş Oluştur"
              subtitle="Masana içecek / yiyecek iste · Ödeme kasada"
              right={<ChevronRight className="h-4 w-4 text-muted" />}
            />
          </Link>
        </div>

        <SectionTitle icon={<Users />} count={data?.atVenue.length ?? 0}>
          Salonda
        </SectionTitle>
        {renderList(data?.atVenue, 'Şu an kimse yok.')}

        <SectionTitle icon={<Clock />} count={data?.coming.length ?? 0}>
          Birazdan gelecek
        </SectionTitle>
        {renderList(data?.coming, 'Şu an gelecek kimse yok.')}

        <SectionTitle icon={<Zap />} count={data?.lookingForMatch.length ?? 0}>
          Maç arayanlar
        </SectionTitle>
        {renderList(data?.lookingForMatch, 'Şu an maç arayan yok.')}

        <SectionTitle
          icon={<LayoutGrid />}
          count={data?.tables.length ?? 0}
          action={data?.tables.length ? <span className="mr-1 text-xs text-success">{freeTables} boş</span> : undefined}
        >
          Masalar
        </SectionTitle>
        {live.isLoading ? (
          <ListSkeleton rows={2} />
        ) : data?.tables.length ? (
          <TableGrid tables={data.tables} />
        ) : (
          <EmptyState icon={<LayoutGrid />} title="Masa bilgisi yok." className="py-8" />
        )}
      </PageBody>
    </>
  );
}
