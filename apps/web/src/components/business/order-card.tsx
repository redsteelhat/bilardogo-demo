'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { ORDER_KIND_LABELS } from '@bilardogo/domain';
import { Badge, Button, Card, cn, toast } from '@bilardogo/ui';
import { Ban, CheckCheck, ChefHat, CircleDollarSign, Hash, MapPin, StickyNote, X } from 'lucide-react';
import { useState } from 'react';
import { formatMoney, formatTime, timeAgo } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';
import { ConfirmDialog, ITEM_STATUS_LABELS } from './ui';

export type BoardOrder = RouterOutputs['orders']['board']['open'][number];
type Item = BoardOrder['items'][number];

const ITEM_TONE = { pending: 'warning', preparing: 'info', delivered: 'success', cancelled: 'neutral' } as const;

export function orderPlace(o: Pick<BoardOrder, 'table' | 'locationText'>) {
  return o.table ? `Masa ${o.table.number}` : o.locationText || 'Konum belirtilmedi';
}

/** Kalemleri kişiye göre gruplar: "Ahmet – Çay x2". */
export function groupByPerson(o: BoardOrder) {
  const groups = new Map<string, { user: Item['user']; items: Item[]; total: number; isSpectator: boolean }>();
  for (const i of o.items) {
    const key = i.user?.id ?? 'unknown';
    const g = groups.get(key) ?? {
      user: i.user,
      items: [],
      total: 0,
      isSpectator: o.participants.find((p) => p.user?.id === key)?.isSpectator ?? false,
    };
    g.items.push(i);
    if (i.status !== 'cancelled') g.total += i.unitPrice * i.qty;
    groups.set(key, g);
  }
  return [...groups.values()];
}

function ItemRow({ item, venueId }: { item: Item; venueId: string }) {
  const utils = trpc.useUtils();
  const set = trpc.orders.setItemStatus.useMutation({
    onSuccess: (_d, v) => {
      if (v.status === 'delivered') toast.success(`${item.productName} teslim edildi.`);
      void utils.orders.board.invalidate({ venueId });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const busy = (s: 'preparing' | 'delivered' | 'cancelled') => set.isPending && set.variables?.status === s;
  const done = item.status === 'delivered' || item.status === 'cancelled';
  return (
    <li className={cn('py-2', item.status === 'cancelled' && 'opacity-50')}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className={cn('text-sm font-semibold', item.status === 'cancelled' && 'line-through')}>
            {item.productName} <span className="text-brand">x{item.qty}</span>
          </div>
          <div className="text-[11px] text-muted">
            {formatMoney(item.unitPrice * item.qty)} · {formatTime(item.createdAt)}
            {item.note ? <span className="text-fg/80"> · “{item.note}”</span> : null}
          </div>
        </div>
        <Badge tone={ITEM_TONE[item.status]}>{ITEM_STATUS_LABELS[item.status]}</Badge>
      </div>
      {!done ? (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {item.status === 'pending' ? (
            <Button size="sm" variant="soft" onClick={() => set.mutate({ itemId: item.id, status: 'preparing' })} loading={busy('preparing')} disabled={set.isPending}>
              <ChefHat className="h-3.5 w-3.5" />
              Hazırlanıyor
            </Button>
          ) : null}
          <Button size="sm" variant="success" onClick={() => set.mutate({ itemId: item.id, status: 'delivered' })} loading={busy('delivered')} disabled={set.isPending}>
            <CheckCheck className="h-3.5 w-3.5" />
            Teslim edildi
          </Button>
          <Button size="sm" variant="ghost" className="text-danger" onClick={() => set.mutate({ itemId: item.id, status: 'cancelled' })} loading={busy('cancelled')} disabled={set.isPending}>
            <X className="h-3.5 w-3.5" />
            İptal
          </Button>
        </div>
      ) : null}
    </li>
  );
}

export function OrderCard({ order, venueId }: { order: BoardOrder; venueId: string }) {
  const utils = trpc.useUtils();
  const [closing, setClosing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const refresh = () => {
    void utils.orders.board.invalidate({ venueId });
    void utils.orders.history.invalidate({ venueId });
    void utils.business.overview.invalidate({ venueId });
  };
  const close = trpc.orders.close.useMutation({
    onSuccess: (r) => {
      toast.success(`Sipariş kapatıldı · ${formatMoney(r.total)}`);
      setClosing(false);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const cancel = trpc.orders.cancel.useMutation({
    onSuccess: () => {
      toast.success('Sipariş iptal edildi.');
      setCancelling(false);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const groups = groupByPerson(order);
  const pendingCount = order.items.filter((i) => i.status === 'pending').length;
  const listeners = order.participants.filter((p) => p.user && !order.items.some((i) => i.user?.id === p.user.id));

  return (
    <Card className={cn('overflow-hidden', pendingCount > 0 && 'border-warning/40')}>
      <div className="flex items-start gap-3 border-b border-border p-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft font-display text-lg font-bold text-brand">
          {order.table ? order.table.number : <MapPin className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold">{orderPlace(order)}</span>
            <Badge tone={order.kind === 'match' ? 'danger' : order.kind === 'group' ? 'info' : 'neutral'}>{ORDER_KIND_LABELS[order.kind]}</Badge>
            {pendingCount ? <Badge tone="warning" dot>{pendingCount} yeni</Badge> : null}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted">
            <span>{timeAgo(order.createdAt)} açıldı</span>
            {order.kind !== 'individual' ? (
              <span className="inline-flex items-center gap-0.5 font-mono font-semibold text-fg/80">
                <Hash className="h-3 w-3" />
                {order.joinCode}
              </span>
            ) : null}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[11px] text-subtle">Toplam</div>
          <div className="font-display text-lg font-bold">{formatMoney(order.total)}</div>
        </div>
      </div>

      {order.note ? (
        <div className="flex items-start gap-2 border-b border-border bg-surface-2/60 px-3.5 py-2 text-sm">
          <StickyNote className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <span className="text-fg/90">{order.note}</span>
        </div>
      ) : null}

      <div className="px-3.5 py-1">
        {groups.length ? (
          groups.map((g) => (
            <div key={g.user?.id ?? 'x'} className="border-b border-border py-2 last:border-b-0">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-fg">
                  {g.user?.displayName ?? 'Kullanıcı'}
                  {g.isSpectator ? <span className="font-normal text-muted"> (İzleyici)</span> : null}
                </span>
                <span className="text-muted">{formatMoney(g.total)}</span>
              </div>
              <ul className="divide-y divide-border/60">
                {g.items.map((i) => (
                  <ItemRow key={i.id} item={i} venueId={venueId} />
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="py-3 text-center text-sm text-muted">Oturum açıldı, henüz ürün eklenmedi.</p>
        )}
        {listeners.length ? (
          <p className="pb-2 text-[11px] text-subtle">
            Oturumda: {listeners.map((p) => `${p.user.displayName}${p.isSpectator ? ' (İzleyici)' : ''}`).join(', ')}
          </p>
        ) : null}
      </div>

      <div className="flex gap-2 border-t border-border p-3">
        <Button variant="ghost" size="sm" className="text-danger" onClick={() => setCancelling(true)}>
          <Ban className="h-4 w-4" />
          İptal
        </Button>
        <Button className="flex-1" onClick={() => setClosing(true)}>
          <CircleDollarSign className="h-4 w-4" />
          Ödeme alındı — Kapat
        </Button>
      </div>

      <ConfirmDialog
        open={closing}
        onOpenChange={setClosing}
        title="Ödeme alındı mı?"
        description={`${orderPlace(order)} · ${ORDER_KIND_LABELS[order.kind]}`}
        confirmLabel="Ödeme alındı — Kapat"
        loading={close.isPending}
        onConfirm={() => close.mutate({ orderId: order.id })}
      >
        <div className="space-y-1.5 rounded-2xl border border-border bg-surface-2 p-3 text-sm">
          {groups.map((g) => (
            <div key={g.user?.id ?? 'x'} className="flex justify-between">
              <span>
                {g.user?.displayName ?? 'Kullanıcı'}
                {g.isSpectator ? <span className="text-muted"> (İzleyici)</span> : null}
              </span>
              <span className="tabular-nums">{formatMoney(g.total)}</span>
            </div>
          ))}
          <div className="flex justify-between border-t border-border pt-1.5 text-base font-bold">
            <span>Toplam</span>
            <span className="text-brand">{formatMoney(order.total)}</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-muted">
          Sipariş kapatılınca geçmişe kaydedilir; hazırlanmakta olan ürünler teslim edildi sayılır. Ödeme kasada alınır; BilardoGo sipariş ücreti tahsil etmez.
        </p>
      </ConfirmDialog>

      <ConfirmDialog
        open={cancelling}
        onOpenChange={setCancelling}
        title="Sipariş iptal edilsin mi?"
        description="Teslim edilmemiş tüm ürünler iptal edilir ve stoklar geri eklenir."
        confirmLabel="Siparişi iptal et"
        tone="danger"
        loading={cancel.isPending}
        onConfirm={() => cancel.mutate({ orderId: order.id })}
      />
    </Card>
  );
}
