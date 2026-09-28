'use client';
import { ORDER_KIND_LABELS } from '@bilardogo/domain';
import { Badge, Button, EmptyState, StatTile } from '@bilardogo/ui';
import { ChevronDown, History } from 'lucide-react';
import { useState } from 'react';
import { ListSkeleton, QueryError } from '@/components/common/states';
import { formatDateTime, formatMoney } from '@/lib/format';
import { trpc } from '@/lib/trpc/client';
import { groupByPerson, orderPlace, type BoardOrder } from './order-card';

function HistoryRow({ order }: { order: BoardOrder }) {
  const [open, setOpen] = useState(false);
  const groups = groupByPerson(order);
  return (
    <li className="rounded-2xl border border-border bg-surface">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 p-3 text-left" aria-expanded={open}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold">{orderPlace(order)}</span>
            <span className="text-xs text-muted">{ORDER_KIND_LABELS[order.kind]}</span>
          </div>
          <div className="text-[11px] text-muted">
            {formatDateTime(order.closedAt ?? order.createdAt)} · {groups.map((g) => g.user?.displayName).filter(Boolean).join(', ') || 'Ürün yok'}
          </div>
        </div>
        <div className="text-right">
          <div className="font-semibold tabular-nums">{formatMoney(order.total)}</div>
          {order.status === 'cancelled' ? <Badge tone="neutral">İptal</Badge> : <Badge tone="success">Ödendi</Badge>}
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-subtle transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open ? (
        <div className="border-t border-border px-3 py-2 text-sm">
          {order.note ? <p className="mb-1 text-xs text-muted">Not: {order.note}</p> : null}
          {groups.length ? (
            groups.map((g) => (
              <div key={g.user?.id ?? 'x'} className="py-1">
                <span className="font-semibold">
                  {g.user?.displayName}
                  {g.isSpectator ? ' (İzleyici)' : ''}
                </span>{' '}
                <span className="text-muted">
                  – {g.items.map((i) => `${i.productName} x${i.qty}${i.status === 'cancelled' ? ' (iptal)' : ''}`).join(', ')}
                </span>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted">Bu oturumda ürün siparişi verilmedi.</p>
          )}
        </div>
      ) : null}
    </li>
  );
}

export function OrderHistory({ venueId }: { venueId: string }) {
  const q = trpc.orders.history.useInfiniteQuery({ venueId }, { getNextPageParam: (last) => last.nextCursor ?? undefined });
  if (q.isLoading) return <ListSkeleton rows={4} />;
  if (q.error) return <QueryError error={q.error} retry={() => q.refetch()} />;
  const pages = q.data?.pages ?? [];
  const totals = pages[0]?.totals ?? { today: 0, month: 0 };
  const items = pages.flatMap((p) => p.items);
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Bugün" value={formatMoney(totals.today)} hint="Kapanan siparişler" />
        <StatTile label="Bu ay" value={formatMoney(totals.month)} hint="Kapanan siparişler" />
      </div>
      {items.length ? (
        <ul className="space-y-2">
          {items.map((o) => (
            <HistoryRow key={o.id} order={o} />
          ))}
        </ul>
      ) : (
        <EmptyState icon={<History />} title="Henüz kapanmış sipariş yok" description="Ödemesi alınıp kapatılan siparişler burada listelenir." />
      )}
      {q.hasNextPage ? (
        <Button variant="secondary" block onClick={() => q.fetchNextPage()} loading={q.isFetchingNextPage}>
          Daha fazla göster
        </Button>
      ) : null}
    </div>
  );
}
