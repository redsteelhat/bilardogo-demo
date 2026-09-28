'use client';
import { formatTrPhone, GAME_SHORT_LABELS, GAME_TYPES, type GameType } from '@bilardogo/domain';
import { Avatar, Badge, Button, Card, CardBody, CardHeader, EmptyState, Notice, SectionTitle, StatTile, toast } from '@bilardogo/ui';
import {
  ArrowLeft,
  Check,
  Clock,
  ExternalLink,
  Eye,
  LayoutGrid,
  Megaphone,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Plus,
  ShoppingBag,
  Tag,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { AdSlot } from '@/components/feed/ad-slot';
import { PageBody } from '@/components/common/page-header';
import { PageLoading, QueryError } from '@/components/common/states';
import { HoursList } from '@/components/venue/hours-list';
import { TableGrid } from '@/components/venue/table-grid';
import { VenueGallery } from '@/components/venue/venue-gallery';
import { cityName, directionsUrl, formatDate, mapEmbedUrl } from '@/lib/format';
import { useRealtime } from '@/lib/realtime';
import { useSession } from '@/lib/session';
import { errorMessage, trpc } from '@/lib/trpc/client';

export default function VenuePage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { session } = useSession();
  const venue = trpc.venues.get.useQuery({ slug });
  const venueId = venue.data?.id;
  const live = trpc.venues.live.useQuery({ venueId: venueId ?? '' }, { enabled: !!venueId, refetchInterval: 30_000 });
  const utils = trpc.useUtils();
  useRealtime(venueId ? `venue:${venueId}` : null, ['presence', 'match', 'tables'], () => {
    if (venueId) void utils.venues.live.invalidate({ venueId });
  });
  const [showHours, setShowHours] = useState(false);

  const onFollowChange = async () => {
    await Promise.all([utils.venues.get.invalidate({ slug }), utils.venues.list.invalidate(), utils.venues.following.invalidate()]);
  };
  const follow = trpc.venues.follow.useMutation({
    onSuccess: async () => {
      await onFollowChange();
      toast.success('Salonu takip ediyorsun', { description: 'Duyurular ve salon hareketleri akışında görünecek.' });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const unfollow = trpc.venues.unfollow.useMutation({ onSuccess: onFollowChange, onError: (e) => toast.error(errorMessage(e)) });

  if (venue.isLoading) return <PageLoading />;
  if (venue.error || !venue.data) {
    return (
      <PageBody className="pt-6">
        <BackButton />
        <div className="mt-4">
          <QueryError error={venue.error ?? new Error('Salon bulunamadı.')} retry={() => venue.refetch()} />
        </div>
      </PageBody>
    );
  }
  const v = venue.data;
  const loginHref = `/giris?next=${encodeURIComponent(`/salon/${v.slug}`)}`;
  const tables = live.data?.tables ?? [];
  const busyTables = tables.filter((t) => t.status !== 'free').length;
  const typeEntries = GAME_TYPES.map((g) => [g, v.tableTypeCounts[g]] as [GameType, number]).filter(([, n]) => n > 0);
  const hasCoords = v.lat != null && v.lng != null;
  const atVenue = live.data?.atVenue ?? [];

  return (
    <>
      {/* Kapak */}
      <div className="relative mx-auto max-w-2xl">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-surface-2 sm:rounded-b-[var(--radius-card)]">
          {v.coverUrl ? (
            <img src={v.coverUrl} alt={v.name} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(circle_at_30%_30%,#1f5c3f,#0e2a1d)]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent" />
        </div>
        <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <BackButton />
          <Badge tone={v.isOpen ? 'success' : 'neutral'} className="bg-black/70 backdrop-blur" dot>
            {v.isOpen ? 'Açık' : 'Kapalı'} · {v.todayHours}
          </Badge>
        </div>
        <div className="absolute inset-x-0 bottom-0 px-4 pb-3">
          <h1 className="font-display text-3xl font-bold leading-tight drop-shadow">{v.name}</h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-fg/80">
            <MapPin className="h-4 w-4 shrink-0 text-brand" />
            <span className="truncate">{[v.district, cityName(v.cityPlate)].filter(Boolean).join(' · ')}</span>
          </p>
        </div>
      </div>

      <PageBody className="space-y-4 pt-3">
        {v.isPreview ? (
          <Notice tone="warning" icon={<Eye />} title="Önizleme">
            Bu salon henüz yayında değil; yalnız işletme ekibi görebilir.
          </Notice>
        ) : null}

        <div className="grid grid-cols-3 gap-2">
          <StatTile label="Takipçi" value={v.followerCount} />
          <StatTile label="Salonda" value={<span className="text-brand">{live.data?.atVenue.length ?? v.activeCount}</span>} />
          <StatTile label="Boş masa" value={tables.length ? `${tables.length - busyTables}/${tables.length}` : v.tableCount} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          {v.isFollowing ? (
            <Button variant="soft" loading={unfollow.isPending} onClick={() => unfollow.mutate({ venueId: v.id })}>
              <Check className="h-4 w-4" /> Takiptesin
            </Button>
          ) : (
            <Button
              variant="outline"
              loading={follow.isPending}
              onClick={() => (session ? follow.mutate({ venueId: v.id }) : router.push(loginHref))}
            >
              <Plus className="h-4 w-4" /> Takip et
            </Button>
          )}
          <Button
            variant="secondary"
            disabled={!v.conversationId}
            onClick={() => (session ? router.push(`/sosyal/${v.conversationId}`) : router.push(loginHref))}
          >
            <MessageCircle className="h-4 w-4" /> Mesaj
          </Button>
        </div>

        <Link
          href={`/salon/${v.slug}/kimler-var`}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-brand text-base font-bold text-brand-fg shadow-[var(--shadow-brand)] transition-transform active:scale-[0.98]"
        >
          <Users className="h-5 w-5" /> Salonda Kimler Var?
          {atVenue.length ? (
            <span className="ml-1 flex -space-x-2">
              {atVenue.slice(0, 3).map((p) => (
                <Avatar key={p.user.id} name={p.user.displayName} src={p.user.avatarUrl} size="xs" className="ring-2 ring-brand" />
              ))}
            </span>
          ) : null}
        </Link>
        <Link href={`/salon/${v.slug}/siparis`} className="block">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-soft text-brand">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-semibold">Sipariş ver</span>
              <span className="block text-xs text-muted">Masana sipariş ver · Ödeme kasada salona yapılır</span>
            </span>
          </div>
        </Link>

        <VenueGallery images={v.images} name={v.name} />

        {v.description ? (
          <Card>
            <CardHeader title="Salon hakkında" />
            <CardBody>
              <p className="whitespace-pre-line text-sm text-muted">{v.description}</p>
            </CardBody>
          </Card>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <InfoTile icon={<Navigation />} label="Konum">
            <div className="line-clamp-3 text-sm font-semibold">{v.address}</div>
            <a href={directionsUrl(v)} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-brand">
              Haritada aç <ExternalLink className="h-3 w-3" />
            </a>
          </InfoTile>
          <InfoTile icon={<Phone />} label="Telefon">
            {v.phone ? (
              <a href={`tel:${v.phone.replace(/\s/g, '')}`} className="block break-all text-sm font-semibold hover:text-brand">
                {formatTrPhone(v.phone)}
              </a>
            ) : (
              <div className="text-sm text-subtle">Belirtilmemiş</div>
            )}
          </InfoTile>
        </div>

        <Card>
          <button type="button" className="flex w-full items-center gap-3 p-4 text-left" onClick={() => setShowHours((s) => !s)} aria-expanded={showHours}>
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <Clock className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted">Çalışma saatleri · bugün</span>
              <span className="block font-display text-lg font-semibold">{v.todayHours}</span>
            </span>
            <span className="text-xs font-semibold text-brand">{showHours ? 'Gizle' : 'Tüm hafta'}</span>
          </button>
          {showHours ? (
            <CardBody className="pt-0">
              <HoursList hours={v.openingHours} />
            </CardBody>
          ) : null}
        </Card>

        <Card className="overflow-hidden">
          <iframe
            title={`${v.name} haritası`}
            src={mapEmbedUrl(v)}
            className="h-52 w-full border-0 grayscale-[30%] invert-[90%] hue-rotate-180"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
          <div className="grid grid-cols-2 gap-2 p-3">
            <a href={directionsUrl(v)} target="_blank" rel="noopener noreferrer">
              <Button block>
                <Navigation className="h-4 w-4" /> Yol tarifi
              </Button>
            </a>
            <a
              href={hasCoords ? `https://www.google.com/maps/search/?api=1&query=${v.lat},${v.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${v.name} ${v.address}`)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="secondary" block>
                <MapPin className="h-4 w-4" /> Haritada aç
              </Button>
            </a>
          </div>
        </Card>

        <Card>
          <CardHeader icon={<LayoutGrid className="h-5 w-5" />} title="Masa Bilgileri" description={`${v.tableCount} masa`} />
          <CardBody>
            {typeEntries.length ? (
              <div className="grid grid-cols-3 gap-2">
                {typeEntries.map(([g, n]) => (
                  <StatTile key={g} label={GAME_SHORT_LABELS[g]} value={n} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Masa bilgisi henüz eklenmedi.</p>
            )}
          </CardBody>
        </Card>

        <SectionTitle
          icon={<LayoutGrid />}
          action={
            tables.length ? (
              <span className="text-xs text-muted">
                <span className="text-success">{tables.length - busyTables} boş</span> · <span className="text-danger">{busyTables} dolu</span>
              </span>
            ) : undefined
          }
        >
          Canlı masa durumu
        </SectionTitle>
        {live.error ? (
          <QueryError error={live.error} retry={() => live.refetch()} />
        ) : tables.length ? (
          <TableGrid tables={tables} />
        ) : (
          <EmptyState icon={<LayoutGrid />} title={live.isLoading ? 'Yükleniyor…' : 'Masa bilgisi yok.'} className="py-8" />
        )}

        <SectionTitle icon={<Megaphone />} count={v.posts.length}>
          Duyurular & Kampanyalar
        </SectionTitle>
        {v.posts.length ? (
          <div className="space-y-3">
            {v.posts.map((p) => (
              <Card key={p.id} className="overflow-hidden">
                {p.imageUrl ? <img src={p.imageUrl} alt="" className="aspect-[16/8] w-full object-cover" loading="lazy" /> : null}
                <div className="p-4">
                  <div className="flex items-center gap-2">
                    <Badge tone={p.kind === 'campaign' ? 'brand' : 'info'}>
                      {p.kind === 'campaign' ? <Tag className="h-3 w-3" /> : <Megaphone className="h-3 w-3" />}
                      {p.kind === 'campaign' ? 'Kampanya' : 'Duyuru'}
                    </Badge>
                    <span className="text-[11px] text-subtle">{formatDate(p.createdAt)}</span>
                  </div>
                  <h3 className="mt-2 font-display text-lg font-semibold">{p.title}</h3>
                  {p.body ? <p className="mt-1 whitespace-pre-line text-sm text-muted">{p.body}</p> : null}
                  {p.validTo ? <p className="mt-2 text-[11px] text-warning">{formatDate(p.validTo)} tarihine kadar geçerli</p> : null}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState icon={<Megaphone />} title="Şu an duyuru veya kampanya yok." className="py-8" />
        )}

        <AdSlot placement="venue" cityPlate={v.cityPlate} />
      </PageBody>
    </>
  );
}

function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => (window.history.length > 1 ? router.back() : router.push('/'))}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/60 text-fg backdrop-blur"
      aria-label="Geri"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}

function InfoTile({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-border bg-surface p-3.5">
      <div className="text-brand [&_svg]:h-4 [&_svg]:w-4">{icon}</div>
      <div className="mt-2 text-[11px] text-muted">{label}</div>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}
