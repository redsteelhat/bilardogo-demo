'use client';
import { Button, EmptyState, Notice, SectionTitle } from '@bilardogo/ui';
import { AlertTriangle, History, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { PageBody, PageHeader } from '@/components/common/page-header';
import { ListSkeleton, QueryError } from '@/components/common/states';
import { OrderSummaryCard } from '@/components/orders/order-session';
import { useRealtime } from '@/lib/realtime';
import { useSession } from '@/lib/session';
import { trpc } from '@/lib/trpc/client';

export default function MyOrdersPage() {
  const { session, loading } = useSession();
  const utils = trpc.useUtils();
  const open = trpc.orders.myOpen.useQuery(undefined, { enabled: !!session, refetchInterval: 10_000 });
  const history = trpc.orders.myHistory.useQuery(undefined, { enabled: !!session });
  const first = open.data?.[0];
  useRealtime(first ? `order:${first.id}` : null, ['order'], () => void utils.orders.invalidate(), { private: true });

  if (!loading && !session) {
    return (
      <>
        <PageHeader title="Siparişlerim" />
        <PageBody>
          <EmptyState
            icon={<ShoppingBag />}
            title="Siparişlerini görmek için giriş yap"
            action={
              <Link href="/giris?next=/siparis">
                <Button>Giriş yap</Button>
              </Link>
            }
          />
        </PageBody>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Siparişlerim" subtitle="Salon içi siparişler · ödeme kasada" />
      <PageBody className="space-y-3">
        <Notice tone="warning" icon={<AlertTriangle />}>
          BilardoGo ödeme almaz. Ödemeyi kasada salona yaparsın; salon ödemeyi alınca siparişi kapatır.
        </Notice>
        <SectionTitle icon={<ShoppingBag />} count={open.data?.length} className="mt-4">
          Açık siparişler
        </SectionTitle>
        {open.isLoading || loading ? (
          <ListSkeleton rows={2} />
        ) : open.error ? (
          <QueryError error={open.error} retry={() => open.refetch()} />
        ) : open.data?.length ? (
          <div className="space-y-3">
            {open.data.map((o) => (
              <OrderSummaryCard key={o.id} order={o} meId={session?.id ?? null} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<ShoppingBag />}
            title="Açık siparişin yok"
            description="Salon sayfasındaki “Sipariş ver” ile masana sipariş verebilir ya da arkadaşının oturumuna kodla katılabilirsin."
            action={
              <Link href="/">
                <Button variant="secondary">Salonlara göz at</Button>
              </Link>
            }
            className="py-8"
          />
        )}
        <SectionTitle icon={<History />} count={history.data?.length}>
          Geçmiş
        </SectionTitle>
        {history.isLoading || loading ? (
          <ListSkeleton rows={2} />
        ) : history.error ? (
          <QueryError error={history.error} retry={() => history.refetch()} />
        ) : history.data?.length ? (
          <div className="space-y-3">
            {history.data.map((o) => (
              <OrderSummaryCard key={o.id} order={o} meId={session?.id ?? null} showVenueLink={false} />
            ))}
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted">Kapanmış siparişin yok.</p>
        )}
      </PageBody>
    </>
  );
}
