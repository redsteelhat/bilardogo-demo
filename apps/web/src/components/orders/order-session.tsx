'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { ORDER_KIND_LABELS } from '@bilardogo/domain';
import { Avatar, Badge, Button, cn, toast } from '@bilardogo/ui';
import { Copy, MapPin, Share2, StickyNote, Store, X } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime, formatMoney } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';

export type Order = RouterOutputs['orders']['myOpen'][number];
type OrderItem = Order['items'][number];

export const ITEM_STATUS: Record<OrderItem['status'], { label: string; tone: 'warning' | 'info' | 'success' | 'neutral' }> = {
  pending: { label: 'Bekliyor', tone: 'warning' },
  preparing: { label: 'Hazırlanıyor', tone: 'info' },
  delivered: { label: 'Teslim edildi', tone: 'success' },
  cancelled: { label: 'İptal', tone: 'neutral' },
};

export const ORDER_STATUS: Record<Order['status'], { label: string; tone: 'brand' | 'success' | 'neutral' }> = {
  open: { label: 'Açık', tone: 'brand' },
  closed: { label: 'Kapandı · ödendi', tone: 'success' },
  cancelled: { label: 'İptal edildi', tone: 'neutral' },
};

export async function shareJoinCode(code: string, venueName: string, slug: string) {
  const url = `${window.location.origin}/salon/${slug}/siparis?kod=${encodeURIComponent(code)}`;
  const text = `${venueName} sipariş oturumuma katıl: ${code}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'BilardoGo sipariş oturumu', text, url });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text}\n${url}`);
    toast.success('Katılım bağlantısı kopyalandı');
  } catch {
    toast.error('Kopyalanamadı', { description: url });
  }
}

export function JoinCodeBox({ order }: { order: Order }) {
  if (order.kind === 'individual' || order.status !== 'open') return null;
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-brand/50 bg-brand-soft/40 p-3">
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">Katılım kodu</div>
        <div className="font-display text-2xl font-bold tracking-widest text-brand">{order.joinCode}</div>
        <div className="text-[11px] text-muted">Masadaki arkadaşların bu kodla oturuma katılır.</div>
      </div>
      <Button
        size="icon-sm"
        variant="secondary"
        aria-label="Kodu kopyala"
        onClick={() =>
          navigator.clipboard
            ?.writeText(order.joinCode)
            .then(() => toast('Kod kopyalandı'))
            .catch(() => toast.error('Kopyalanamadı'))
        }
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button size="icon-sm" variant="soft" aria-label="Paylaş" onClick={() => void shareJoinCode(order.joinCode, order.venue.name, order.venue.slug)}>
        <Share2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

/** Sipariş kalemleri kişi bazında: "Ahmet – Çay x2", izleyiciler "(İzleyici)". */
export function OrderPeople({ order, meId, cancellable }: { order: Order; meId: string | null; cancellable?: boolean }) {
  const utils = trpc.useUtils();
  const cancel = trpc.orders.cancelItem.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.orders.invalidate(), utils.venues.menu.invalidate()]);
      toast('Ürün iptal edildi');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const people = order.participants.map((p) => ({ ...p, items: order.items.filter((i) => i.user?.id === p.user?.id) }));
  // Oturumdan ayrılmış ama kalemi olan kişiler
  for (const i of order.items) {
    if (i.user && !people.some((p) => p.user?.id === i.user.id)) {
      people.push({ user: i.user, isSpectator: false, joinedAt: i.createdAt, items: order.items.filter((x) => x.user?.id === i.user.id) });
    }
  }
  return (
    <ul className="space-y-2">
      {people.map((p) => {
        if (!p.user) return null;
        const mine = p.user.id === meId;
        const subtotal = p.items.filter((i) => i.status !== 'cancelled').reduce((a, i) => a + i.unitPrice * i.qty, 0);
        return (
          <li key={p.user.id} className={cn('rounded-2xl border bg-surface-2 p-3', mine ? 'border-brand/40' : 'border-border')}>
            <div className="flex items-center gap-2">
              <Avatar name={p.user.displayName} src={p.user.avatarUrl} size="sm" />
              <div className="min-w-0 flex-1 truncate text-sm font-semibold">
                {p.user.displayName}
                {p.isSpectator ? <span className="font-normal text-muted"> (İzleyici)</span> : null}
                {mine ? <span className="ml-1 text-xs font-normal text-brand">(sen)</span> : null}
              </div>
              {subtotal ? <span className="text-sm font-semibold tabular-nums">{formatMoney(subtotal)}</span> : null}
            </div>
            {p.items.length ? (
              <ul className="mt-2 space-y-1.5 pl-10">
                {p.items.map((i) => (
                  <li key={i.id} className={cn('flex items-center gap-2 text-sm', i.status === 'cancelled' && 'text-subtle line-through')}>
                    <span className="min-w-0 flex-1 truncate">
                      {p.user!.displayName.split(' ')[0]} – {i.productName} x{i.qty}
                      {i.note ? <span className="text-xs text-muted"> · {i.note}</span> : null}
                    </span>
                    <Badge tone={ITEM_STATUS[i.status].tone}>{ITEM_STATUS[i.status].label}</Badge>
                    {cancellable && mine && i.status === 'pending' && order.status === 'open' ? (
                      <button
                        type="button"
                        aria-label={`${i.productName} iptal et`}
                        disabled={cancel.isPending}
                        onClick={() => {
                          if (window.confirm(`${i.productName} x${i.qty} iptal edilsin mi?`)) cancel.mutate({ itemId: i.id });
                        }}
                        className="rounded-full p-1 text-muted hover:bg-danger-soft hover:text-danger disabled:opacity-40"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 pl-10 text-xs text-subtle">Henüz sipariş yok</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Siparişlerim listesindeki özet kart. */
export function OrderSummaryCard({ order, meId, showVenueLink = true }: { order: Order; meId: string | null; showVenueLink?: boolean }) {
  const st = ORDER_STATUS[order.status];
  const liveCount = order.items.filter((i) => i.status !== 'cancelled').length;
  return (
    <article className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
      <div className="flex items-start gap-3 p-4 pb-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
          <Store className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-display text-lg font-semibold">{order.venue.name}</span>
            <Badge tone={st.tone}>{st.label}</Badge>
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
            <span>{ORDER_KIND_LABELS[order.kind]}</span>
            {order.table ? <span>· Masa {order.table.number}</span> : null}
            {order.locationText ? (
              <span className="inline-flex items-center gap-1">
                · <MapPin className="h-3 w-3" /> {order.locationText}
              </span>
            ) : null}
            <span>· {formatDateTime(order.closedAt ?? order.createdAt)}</span>
          </div>
          {order.note ? (
            <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
              <StickyNote className="h-3 w-3" /> {order.note}
            </div>
          ) : null}
        </div>
      </div>
      <div className="space-y-3 px-4 pb-4">
        <JoinCodeBox order={order} />
        <OrderPeople order={order} meId={meId} cancellable={order.status === 'open'} />
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm text-muted">
            Toplam · {liveCount} ürün
          </span>
          <span className="font-display text-xl font-semibold tabular-nums">{formatMoney(order.total)}</span>
        </div>
        {order.status === 'open' && showVenueLink ? (
          <Link
            href={`/salon/${order.venue.slug}/siparis${order.kind === 'match' && order.matchId ? `?mac=${order.matchId}` : ''}`}
            className="block"
          >
            <Button block>Ürün ekle / siparişi görüntüle</Button>
          </Link>
        ) : null}
      </div>
    </article>
  );
}
