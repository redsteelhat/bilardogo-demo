'use client';
import { ORDER_KIND_LABELS } from '@bilardogo/domain';
import { Button, Card, CardBody, CardHeader, EmptyState, Field, Notice, SectionTitle, Segmented, Textarea, toast } from '@bilardogo/ui';
import { AlertTriangle, ClipboardList, LogIn, MapPin, Plus, ShoppingBag, StickyNote, Swords, Users } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import { PageBody, PageHeader } from '@/components/common/page-header';
import { PageLoading, QueryError } from '@/components/common/states';
import { CreateOrderForm } from '@/components/orders/create-order-form';
import { JoinOrderDialog } from '@/components/orders/join-dialog';
import { JoinCodeBox, OrderPeople, type Order } from '@/components/orders/order-session';
import { ProductPicker } from '@/components/orders/product-picker';
import { formatMoney } from '@/lib/format';
import { useRealtime } from '@/lib/realtime';
import { useSession } from '@/lib/session';
import { errorMessage, trpc } from '@/lib/trpc/client';

export default function VenueOrderPage() {
  return (
    <Suspense fallback={<PageLoading />}>
      <VenueOrder />
    </Suspense>
  );
}

function VenueOrder() {
  const { slug } = useParams<{ slug: string }>();
  const search = useSearchParams();
  const router = useRouter();
  const matchId = search.get('mac');
  const code = search.get('kod');
  const { session, loading } = useSession();
  const utils = trpc.useUtils();
  const venue = trpc.venues.get.useQuery({ slug });
  const venueId = venue.data?.id;
  const open = trpc.orders.myOpen.useQuery({ venueId: venueId ?? undefined }, { enabled: !!session && !!venueId, refetchInterval: 10_000 });
  const forMatch = trpc.orders.forMatch.useQuery({ matchId: matchId ?? '' }, { enabled: !!session && !!matchId, refetchInterval: 10_000 });
  const [joinOpen, setJoinOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // ?kod= ile otomatik katılım (bir kez)
  const autoJoined = useRef(false);
  const join = trpc.orders.join.useMutation({
    onSuccess: async (r) => {
      await utils.orders.invalidate();
      setSelectedId(r.id);
      toast.success('Sipariş oturumuna katıldın');
    },
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: () => router.replace(`/salon/${slug}/siparis${matchId ? `?mac=${matchId}` : ''}`),
  });
  useEffect(() => {
    if (!code || !session || autoJoined.current) return;
    autoJoined.current = true;
    join.mutate({ code });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, session]);

  const orders = open.data ?? [];
  const matchOrder = matchId ? orders.find((o) => o.matchId === matchId) : undefined;
  const active: Order | undefined = matchId
    ? matchOrder
    : (orders.find((o) => o.id === selectedId) ?? (creating ? undefined : orders[0]));

  useRealtime(active ? `order:${active.id}` : null, ['order'], () => void utils.orders.myOpen.invalidate(), { private: true });

  const joinButton = session ? (
    <Button size="sm" variant="outline" onClick={() => setJoinOpen(true)}>
      <LogIn className="h-4 w-4" /> Oturuma Katıl
    </Button>
  ) : undefined;

  if (venue.isLoading || loading) return <PageLoading />;
  if (venue.error || !venue.data) {
    return (
      <>
        <PageHeader title="Sipariş" backHref={`/salon/${slug}`} />
        <PageBody>
          <QueryError error={venue.error ?? new Error('Salon bulunamadı.')} retry={() => venue.refetch()} />
        </PageBody>
      </>
    );
  }
  const v = venue.data;
  const next = `/salon/${slug}/siparis${search.toString() ? `?${search.toString()}` : ''}`;

  return (
    <>
      <PageHeader title="Sipariş" subtitle={v.name} backHref={`/salon/${slug}`} actions={joinButton} />
      <PageBody className="space-y-4">
        <Notice tone="warning" icon={<AlertTriangle />} title="BilardoGo ödeme almaz.">
          Ödemeyi kasada salona yaparsın. Sipariş doğrudan salona iletilir.
        </Notice>

        {!session ? (
          <EmptyState
            icon={<ShoppingBag />}
            title="Sipariş vermek için giriş yap"
            action={
              <Link href={`/giris?next=${encodeURIComponent(next)}`}>
                <Button>Giriş yap</Button>
              </Link>
            }
          />
        ) : open.isLoading || join.isPending ? (
          <PageLoading />
        ) : open.error ? (
          <QueryError error={open.error} retry={() => open.refetch()} />
        ) : matchId && !matchOrder ? (
          <MatchSessionStart
            venueId={v.id}
            matchId={matchId}
            existingCode={forMatch.data?.joinCode ?? null}
            onCreated={() => void utils.orders.invalidate()}
          />
        ) : active ? (
          <>
            {!matchId && orders.length > 1 ? (
              <Segmented
                size="sm"
                value={active.id}
                onChange={(id) => {
                  setCreating(false);
                  setSelectedId(id);
                }}
                options={orders.map((o) => ({
                  value: o.id,
                  label: `${ORDER_KIND_LABELS[o.kind]}${o.table ? ` · Masa ${o.table.number}` : o.locationText ? ` · ${o.locationText}` : ''}`,
                }))}
              />
            ) : null}
            <ActiveOrder order={active} meId={session.id} venueId={v.id} />
            {!matchId ? (
              <Button
                variant="ghost"
                block
                onClick={() => {
                  setSelectedId(null);
                  setCreating(true);
                }}
              >
                <Plus className="h-4 w-4" /> Yeni sipariş / oturum başlat
              </Button>
            ) : null}
          </>
        ) : (
          <>
            {creating && orders.length ? (
              <Button variant="ghost" size="sm" onClick={() => setCreating(false)}>
                ← Açık siparişime dön
              </Button>
            ) : null}
            <CreateOrderForm
              venueId={v.id}
              onCreated={(id) => {
                setCreating(false);
                setSelectedId(id);
              }}
            />
            <p className="text-center text-xs text-muted">
              Arkadaşının oturumuna mı katılacaksın?{' '}
              <button type="button" className="font-semibold text-brand" onClick={() => setJoinOpen(true)}>
                Kodla katıl
              </button>
            </p>
          </>
        )}
      </PageBody>
      <JoinOrderDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onJoined={(id) => {
          setCreating(false);
          setSelectedId(id);
        }}
      />
    </>
  );
}

function ActiveOrder({ order, meId, venueId }: { order: Order; meId: string; venueId: string }) {
  const live = order.items.filter((i) => i.status !== 'cancelled');
  return (
    <>
      <Card>
        <CardHeader
          icon={order.kind === 'match' ? <Swords className="h-5 w-5" /> : order.kind === 'group' ? <Users className="h-5 w-5" /> : <ClipboardList className="h-5 w-5" />}
          title={ORDER_KIND_LABELS[order.kind]}
          description={
            <span className="inline-flex flex-wrap items-center gap-x-2">
              {order.table ? <span>Masa {order.table.number}</span> : null}
              {order.locationText ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {order.locationText}
                </span>
              ) : null}
              {order.note ? (
                <span className="inline-flex items-center gap-1">
                  <StickyNote className="h-3 w-3" /> {order.note}
                </span>
              ) : null}
              <span>{order.kind === 'individual' ? 'Kişisel hesap · Açık' : `${order.participants.length} kişi · Açık`}</span>
            </span>
          }
        />
        <CardBody className="space-y-3">
          <JoinCodeBox order={order} />
          <OrderPeople order={order} meId={meId} cancellable />
          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm text-muted">Toplam · {live.length} ürün · kasada ödenir</span>
            <span className="font-display text-xl font-semibold tabular-nums">{formatMoney(order.total)}</span>
          </div>
        </CardBody>
      </Card>
      <SectionTitle icon={<ShoppingBag />}>Ürünler</SectionTitle>
      <ProductPicker venueId={venueId} orderId={order.id} />
    </>
  );
}

/** Maç oturumu: konum sorulmaz, yalnız sipariş notu. */
function MatchSessionStart({
  venueId,
  matchId,
  existingCode,
  onCreated,
}: {
  venueId: string;
  matchId: string;
  existingCode: string | null;
  onCreated: () => void;
}) {
  const [note, setNote] = useState('');
  const create = trpc.orders.create.useMutation({
    onSuccess: () => {
      toast.success('Maç sipariş oturumu hazır');
      onCreated();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Card>
      <CardHeader
        icon={<Swords className="h-5 w-5" />}
        title="Maç oturumu"
        description={
          existingCode
            ? `Bu maç için açık bir oturum var (kod ${existingCode}). Oyuncuysan devam et; izleyiciysen “Oturuma Katıl”ı kullan.`
            : 'Maçtaki oyuncular aynı oturumdan sipariş verir. Masa bilgisi maçtan alınır.'
        }
      />
      <CardBody className="space-y-3">
        <Field label="Sipariş notu" hint="Opsiyonel">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} rows={2} placeholder="Örn. Buzsuz, açık çay, az şekerli…" />
        </Field>
        <Button block size="lg" loading={create.isPending} onClick={() => create.mutate({ venueId, kind: 'match', matchId, note: note.trim() || null })}>
          <ClipboardList className="h-5 w-5" /> {existingCode ? 'Maç oturumuna devam et' : 'Maç oturumunu başlat'}
        </Button>
      </CardBody>
    </Card>
  );
}
