'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { Button, cn, EmptyState, Input, Skeleton, toast } from '@bilardogo/ui';
import { Minus, Package, Plus, ShoppingBag } from 'lucide-react';
import { useMemo, useState } from 'react';
import { QueryError } from '@/components/common/states';
import { formatMoney } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';

type Product = RouterOutputs['venues']['menu'][number];

// Domain paketinde ürün kategorisi etiketi yok; burada tutulur.
const CATEGORY_LABELS: Record<string, string> = {
  hot_drink: 'Sıcak içecekler',
  cold_drink: 'Soğuk içecekler',
  food: 'Yiyecekler',
  snack: 'Atıştırmalıklar',
  other: 'Diğer',
};
const CATEGORY_ORDER = ['hot_drink', 'cold_drink', 'food', 'snack', 'other'];

/** Ürün listesi (kategoriye göre) + sepet + "Sipariş ver". */
export function ProductPicker({ venueId, orderId, onOrdered }: { venueId: string; orderId: string; onOrdered?: () => void }) {
  const menu = trpc.venues.menu.useQuery({ venueId }, { refetchInterval: 60_000 });
  const utils = trpc.useUtils();
  const [cart, setCart] = useState<Record<string, number>>({});
  const [note, setNote] = useState('');
  const add = trpc.orders.addItems.useMutation({
    onSuccess: async () => {
      setCart({});
      setNote('');
      await Promise.all([utils.orders.invalidate(), utils.venues.menu.invalidate({ venueId })]);
      toast.success('Siparişin salona iletildi', { description: 'Ödemeyi kasada salona yaparsın.' });
      onOrdered?.();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const groups = useMemo(() => {
    const map = new Map<string, Product[]>();
    for (const p of menu.data ?? []) {
      const k = p.category || 'other';
      map.set(k, [...(map.get(k) ?? []), p]);
    }
    return [...map.entries()].sort((a, b) => CATEGORY_ORDER.indexOf(a[0]) - CATEGORY_ORDER.indexOf(b[0]));
  }, [menu.data]);
  const products = menu.data ?? [];
  const lines = Object.entries(cart)
    .filter(([, q]) => q > 0)
    .map(([id, qty]) => ({ product: products.find((p) => p.id === id), qty }))
    .filter((l): l is { product: Product; qty: number } => !!l.product);
  const total = lines.reduce((a, l) => a + l.product.price * l.qty, 0);
  const count = lines.reduce((a, l) => a + l.qty, 0);
  const setQty = (p: Product, qty: number) => {
    const max = Math.min(20, p.stock ?? 20);
    setCart((c) => ({ ...c, [p.id]: Math.max(0, Math.min(max, qty)) }));
  };

  if (menu.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-16 w-full rounded-2xl" />
      </div>
    );
  }
  if (menu.error) return <QueryError error={menu.error} retry={() => menu.refetch()} />;
  if (!products.length) {
    return <EmptyState icon={<Package />} title="Salonun şu an sipariş verilebilir ürünü yok" description="Siparişini kasaya veya salon çalışanına iletebilirsin." className="py-8" />;
  }

  return (
    <div className="space-y-4">
      {groups.map(([cat, list]) => (
        <section key={cat}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-subtle">{CATEGORY_LABELS[cat] ?? cat}</h3>
          <ul className="space-y-2">
            {list.map((p) => {
              const qty = cart[p.id] ?? 0;
              const max = Math.min(20, p.stock ?? 20);
              return (
                <li key={p.id} className={cn('flex items-center gap-3 rounded-2xl border bg-surface p-3', qty ? 'border-brand/50' : 'border-border')}>
                  {p.imageUrl ? (
                     
                    <img src={p.imageUrl} alt="" className="h-12 w-12 shrink-0 rounded-xl bg-surface-2 object-cover" loading="lazy" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-subtle">
                      <Package className="h-5 w-5" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{p.name}</div>
                    <div className="text-xs text-muted">
                      <span className="font-semibold text-brand">{formatMoney(p.price)}</span>
                      {p.stock !== null ? <span className={p.stock <= 5 ? 'text-warning' : ''}> · {p.stock} stok</span> : null}
                    </div>
                  </div>
                  {qty ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        aria-label={`${p.name} azalt`}
                        onClick={() => setQty(p, qty - 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-2"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-6 text-center font-bold tabular-nums">{qty}</span>
                      <button
                        type="button"
                        aria-label={`${p.name} artır`}
                        disabled={qty >= max}
                        onClick={() => setQty(p, qty + 1)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-brand-fg disabled:opacity-40"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <Button size="sm" variant="soft" onClick={() => setQty(p, 1)} aria-label={`${p.name} ekle`}>
                      <Plus className="h-4 w-4" /> Ekle
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {count ? (
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-20 space-y-2 rounded-[var(--radius-card)] border border-brand/40 bg-surface-2/95 p-3 shadow-2xl backdrop-blur">
          <ul className="max-h-28 space-y-0.5 overflow-y-auto text-xs text-muted">
            {lines.map((l) => (
              <li key={l.product.id} className="flex justify-between gap-2">
                <span className="truncate">
                  {l.product.name} x{l.qty}
                </span>
                <span className="tabular-nums">{formatMoney(l.product.price * l.qty)}</span>
              </li>
            ))}
          </ul>
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={100} placeholder="Ürün notu (ör. açık çay, az şekerli)"
            aria-label="Ürün notu" className="h-9 text-sm" />
          <Button
            size="lg"
            block
            loading={add.isPending}
            onClick={() =>
              add.mutate({
                orderId,
                items: lines.map((l) => ({ venueProductId: l.product.id, qty: l.qty, note: note.trim() || null })),
              })
            }
          >
            <ShoppingBag className="h-5 w-5" /> Sipariş ver · {count} ürün · {formatMoney(total)}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
