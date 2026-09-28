'use client';
import { Button, EmptyState, Tabs, toast } from '@bilardogo/ui';
import { ClipboardList, Package, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ListSkeleton, QueryError } from '@/components/common/states';
import { OrderCard, orderPlace, type BoardOrder } from '@/components/business/order-card';
import { OrderHistory } from '@/components/business/order-history';
import { BizPage, Gate, PaymentNotice } from '@/components/business/ui';
import { trpc } from '@/lib/trpc/client';

/** Kısa uyarı sesi (tarayıcı otomatik oynatmayı engellerse sessizce geçer). */
function beep() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1320, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.36);
    setTimeout(() => void ctx.close().catch(() => undefined), 600);
  } catch {
    /* otomatik oynatma engellenmiş olabilir */
  }
}

/** Yeni "bekleyen" ürün geldiğinde ses + titreşim + bildirim. İlk yüklemede uyarmaz. */
function useNewItemAlert(orders: BoardOrder[] | undefined) {
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!orders) return;
    const pending = orders.flatMap((o) => o.items.filter((i) => i.status === 'pending').map((i) => ({ o, i })));
    if (seen.current === null) {
      seen.current = new Set(pending.map((p) => p.i.id));
      return;
    }
    const fresh = pending.filter((p) => !seen.current!.has(p.i.id));
    for (const p of pending) seen.current.add(p.i.id);
    if (!fresh.length) return;
    const first = fresh[0]!;
    toast.info(`Yeni sipariş · ${orderPlace(first.o)}`, {
      description: fresh.map((f) => `${f.i.user?.displayName ?? ''} – ${f.i.productName} x${f.i.qty}`).join(', '),
    });
    beep();
    try {
      navigator.vibrate?.([120, 60, 120]);
    } catch {
      /* desteklenmiyor */
    }
  }, [orders]);
}

function Board({ venueId }: { venueId: string }) {
  const [tab, setTab] = useState<'open' | 'history'>('open');
  const q = trpc.orders.board.useQuery({ venueId }, { refetchInterval: 10_000 });
  useNewItemAlert(q.data?.open);
  const open = q.data?.open ?? [];
  const pendingTotal = open.reduce((a, o) => a + o.items.filter((i) => i.status === 'pending').length, 0);
  return (
    <div className="space-y-3">
      <PaymentNotice />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'open', label: `Açık siparişler`, count: open.length },
          { value: 'history', label: 'Geçmiş' },
        ]}
      />
      {tab === 'open' ? (
        q.isLoading ? (
          <ListSkeleton rows={3} />
        ) : q.error ? (
          <QueryError error={q.error} retry={() => q.refetch()} />
        ) : open.length ? (
          <>
            {pendingTotal ? (
              <p className="text-sm text-warning">
                <span className="font-bold">{pendingTotal}</span> ürün hazırlanmayı bekliyor.
              </p>
            ) : null}
            <div className="grid gap-3 lg:grid-cols-2">
              {open.map((o) => (
                <OrderCard key={o.id} order={o} venueId={venueId} />
              ))}
            </div>
          </>
        ) : (
          <EmptyState
            icon={<ClipboardList />}
            title="Açık sipariş yok"
            description="Oyuncular masadan veya salondan sipariş verdiğinde burada anında görünür."
          />
        )
      ) : (
        <OrderHistory venueId={venueId} />
      )}
    </div>
  );
}

export default function OrdersPage() {
  const utils = trpc.useUtils();
  return (
    <BizPage
      title="Siparişler"
      subtitle="Canlı sipariş panosu"
      wide
      actions={
        <>
          <Link href="/isletme/urunler">
            <Button variant="secondary" size="sm">
              <Package className="h-4 w-4" />
              Stok
            </Button>
          </Link>
          <Button variant="ghost" size="icon-sm" aria-label="Yenile" onClick={() => void utils.orders.board.invalidate()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </>
      }
    >
      <Gate perm="orders" needsApproval>
        {({ venueId }) => <Board venueId={venueId} />}
      </Gate>
    </BizPage>
  );
}
