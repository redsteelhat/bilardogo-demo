'use client';
import { GAME_SHORT_LABELS, type GameType } from '@bilardogo/domain';
import { Button, EmptyState, Notice, Segmented, Skeleton, Switch } from '@bilardogo/ui';
import { ArrowLeft, Info, LayoutGrid, Printer } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { PageLoading, QueryError } from '@/components/common/states';
import { useBusiness } from '@/components/business/context';
import { Poster, type PosterSize } from '@/components/business/poster';
import { BizPage, Gate } from '@/components/business/ui';
import { trpc } from '@/lib/trpc/client';

const SIZES: Record<PosterSize, { w: number; h: number; label: string }> = {
  a4: { w: 210, h: 297, label: 'A4' },
  a5: { w: 148, h: 210, label: 'A5' },
};

function tableSubtitle(number: number, games: readonly GameType[], label?: string | null) {
  return `Masa ${number}${label ? ` (${label})` : ''} • ${games.map((g) => GAME_SHORT_LABELS[g]).join(' / ')}`;
}

function PrintStyles({ size }: { size: PosterSize }) {
  const s = SIZES[size];
  return (
    <style>{`
      @page { size: ${s.w}mm ${s.h}mm; margin: 0; }
      @media print {
        html, body { background: #fff !important; }
        .poster-page { width: ${s.w}mm; height: ${s.h}mm; margin: 0 !important; padding: 0 !important; display: flex; align-items: center; justify-content: center; break-after: page; page-break-after: always; break-inside: avoid; }
        .poster-page:last-child { break-after: auto; page-break-after: auto; }
        .poster-grid { display: block !important; }
        .bg-poster { width: ${s.w}mm !important; max-width: none !important; box-shadow: none !important; border-radius: 0 !important; }
      }
    `}</style>
  );
}

function SinglePoster({ tableId }: { tableId: string }) {
  const q = trpc.business.tableQr.useQuery({ tableId });
  if (q.isLoading) return <Skeleton className="mx-auto aspect-[210/297] w-full max-w-[560px]" />;
  if (q.error) return <QueryError error={q.error} retry={() => q.refetch()} />;
  const d = q.data!;
  return (
    <div className="poster-page">
      <Poster venueName={d.venueName} subtitle={tableSubtitle(d.number, d.allowedGameTypes, d.label)} svg={d.svg} className="max-w-[560px]" />
    </div>
  );
}

function AllPosters({ venueId }: { venueId: string }) {
  const q = trpc.business.allTableQrs.useQuery({ venueId });
  if (q.isLoading)
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="aspect-[210/297] w-full" />
        <Skeleton className="hidden aspect-[210/297] w-full lg:block" />
      </div>
    );
  if (q.error) return <QueryError error={q.error} retry={() => q.refetch()} />;
  const list = q.data ?? [];
  if (!list.length)
    return (
      <EmptyState
        icon={<LayoutGrid />}
        title="Yazdırılacak aktif masa yok"
        description="Önce masalarını ekle veya pasif masaları aktif yap."
        action={
          <Link href="/isletme/masalar">
            <Button>Masalara git</Button>
          </Link>
        }
      />
    );
  return (
    <div className="poster-grid grid gap-6 lg:grid-cols-2">
      {list.map((d) => (
        <div key={d.id} className="poster-page">
          <Poster venueName={d.venueName} subtitle={tableSubtitle(d.number, d.allowedGameTypes, d.label)} svg={d.svg} className="max-w-[560px]" />
        </div>
      ))}
    </div>
  );
}

function OrderPoster({ venueId }: { venueId: string }) {
  const q = trpc.business.orderQr.useQuery({ venueId });
  if (q.isLoading) return <Skeleton className="mx-auto aspect-[210/297] w-full max-w-[560px]" />;
  if (q.error) return <QueryError error={q.error} retry={() => q.refetch()} />;
  const d = q.data!;
  return (
    <div id="siparis" className="poster-page">
      <Poster venueName={d.venueName} subtitle="Salon içi sipariş" svg={d.svg} variant="order" className="max-w-[560px]" />
    </div>
  );
}

function PosterWorkspace({ venueId }: { venueId: string }) {
  const sp = useSearchParams();
  const tableId = sp.get('masa');
  const onlyOrder = sp.get('tur') === 'siparis';
  const { can } = useBusiness();
  const [size, setSize] = useState<PosterSize>('a4');
  const [withOrder, setWithOrder] = useState(onlyOrder);
  const canTables = can('tables');
  const canOrders = can('orders');
  const showTables = canTables && !onlyOrder;
  const showOrder = canOrders && (withOrder || onlyOrder);

  return (
    <>
      <PrintStyles size={size} />
      <div className="no-print mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/isletme/masalar">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Masalar
            </Button>
          </Link>
          <Segmented
            size="sm"
            value={size}
            onChange={setSize}
            options={(Object.keys(SIZES) as PosterSize[]).map((k) => ({ value: k, label: SIZES[k].label }))}
          />
          <Button size="sm" className="ml-auto" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Yazdır
          </Button>
        </div>
        {canOrders && !onlyOrder ? (
          <label className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2.5 text-sm">
            <Switch checked={withOrder} onCheckedChange={setWithOrder} />
            <span>
              <span className="font-semibold">Sipariş QR afişini de ekle</span>
              <span className="block text-xs text-muted">Salonun sipariş sayfasını açar (“Sipariş vermek için okutun”).</span>
            </span>
          </label>
        ) : null}
        <Notice tone="info" icon={<Info />}>
          Her afiş ayrı sayfaya basılır. Yazdırma penceresinde kenar boşluklarını “Yok”, arka plan grafiklerini “Açık” seç.
        </Notice>
      </div>
      <div className="space-y-6">
        {showTables ? tableId ? <SinglePoster tableId={tableId} /> : <AllPosters venueId={venueId} /> : null}
        {showOrder ? <OrderPoster venueId={venueId} /> : null}
        {!showTables && !showOrder ? <Notice tone="warning">Afiş yazdırmak için masa veya sipariş yetkisi gerekir.</Notice> : null}
      </div>
    </>
  );
}

export default function PostersPage() {
  return (
    <BizPage title="QR afişleri" subtitle="Masalara asılacak afişleri yazdır" wide>
      <Gate>
        {({ venueId }) => (
          <Suspense fallback={<PageLoading />}>
            <PosterWorkspace venueId={venueId} />
          </Suspense>
        )}
      </Gate>
    </BizPage>
  );
}
