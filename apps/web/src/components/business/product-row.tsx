'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { Button, Switch, cn, toast } from '@bilardogo/ui';
import { Save, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { formatMoney } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';

export type VenueProduct = RouterOutputs['business']['products'][number];

function parsePrice(s: string): number | null {
  const t = s.trim().replace(',', '.');
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
}

function parseStock(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isInteger(n) ? n : NaN;
}

function Thumb({ p }: { p: VenueProduct }) {
  return p.imageUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-xl object-cover" />
  ) : (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-sm font-bold text-muted">{p.name.slice(0, 1)}</div>
  );
}

const inputCls =
  'h-9 w-full rounded-lg border border-border bg-surface-2 px-2.5 text-sm tabular-nums placeholder:text-subtle focus:border-brand focus:outline-none';

/** Sahip: "Bende var", fiyat, stok, kaydet / kaldır. */
export function OwnerProductRow({ p, venueId }: { p: VenueProduct; venueId: string }) {
  const utils = trpc.useUtils();
  const [available, setAvailable] = useState(p.isAvailable);
  const [price, setPrice] = useState(p.price != null ? String(p.price) : '');
  const [stock, setStock] = useState(p.stock != null ? String(p.stock) : '');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setAvailable(p.isAvailable);
    setPrice(p.price != null ? String(p.price) : '');
    setStock(p.stock != null ? String(p.stock) : '');
  }, [p.isAvailable, p.price, p.stock]);

  const refresh = () => void utils.business.products.invalidate({ venueId });
  const upsert = trpc.business.upsertProduct.useMutation({
    onSuccess: (_d, v) => {
      toast.success(`${p.name}: ${v.isAvailable ? 'menüde' : 'şu an yok olarak işaretlendi'}.`);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = trpc.business.removeProduct.useMutation({
    onSuccess: () => {
      toast.success(`${p.name} menüden kaldırıldı.`);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const saved = !!p.venueProductId;
  const dirty =
    available !== p.isAvailable || price !== (p.price != null ? String(p.price) : '') || stock !== (p.stock != null ? String(p.stock) : '');

  const submit = (isAvailable: boolean) => {
    const pr = parsePrice(price);
    const st = parseStock(stock);
    if (pr === null) return setError('Fiyat girin.');
    if (Number.isNaN(pr) || pr < 0 || pr > 100000) return setError('Geçerli bir fiyat girin.');
    if (Number.isNaN(st) || (st !== null && (st < 0 || st > 100000))) return setError('Stok 0 veya daha büyük tam sayı olmalı.');
    setError(null);
    upsert.mutate({ venueId, productId: p.productId, price: pr, isAvailable, stock: st });
  };

  const onToggle = (v: boolean) => {
    setAvailable(v);
    // Kayıtlı ürünü tek dokunuşla aç/kapat
    if (saved && !dirty) submit(v);
    else if (v && !price) setError('Menüye eklemek için fiyat girip kaydet.');
  };

  return (
    <li className={cn('p-3', !available && !saved && 'opacity-80')}>
      <div className="flex items-center gap-3">
        <Thumb p={p} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{p.name}</div>
          <div className="text-[11px] text-muted">
            {saved ? (
              <>
                {p.isAvailable ? <span className="text-success">Menüde</span> : <span className="text-warning">Şu an yok</span>}
                {p.price != null ? ` · ${formatMoney(p.price)}` : ''}
                {p.stock != null ? ` · ${p.stock} stok` : ''}
              </>
            ) : (
              'Menünde değil'
            )}
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted">
          <span className="hidden sm:inline">Bende var</span>
          <Switch checked={available} onCheckedChange={onToggle} disabled={upsert.isPending} aria-label={`${p.name} bende var`} />
        </label>
      </div>
      <div className="mt-2 flex items-center gap-2 pl-[3.25rem]">
        <div className="relative w-28">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-subtle">₺</span>
          <input
            inputMode="decimal"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value.replace(/[^\d.,]/g, ''));
              setError(null);
            }}
            placeholder="Fiyat"
            className={cn(inputCls, 'pl-6')}
            aria-label={`${p.name} fiyatı`}
          />
        </div>
        <input
          inputMode="numeric"
          value={stock}
          onChange={(e) => {
            setStock(e.target.value.replace(/\D/g, ''));
            setError(null);
          }}
          placeholder="Stok"
          className={cn(inputCls, 'min-w-0 flex-1')}
          aria-label={`${p.name} stok`}
        />
        {dirty || (!saved && available) ? (
          <Button size="sm" onClick={() => submit(available)} loading={upsert.isPending}>
            <Save className="h-3.5 w-3.5" />
            Kaydet
          </Button>
        ) : saved ? (
          <Button size="icon-sm" variant="ghost" aria-label={`${p.name} menüden kaldır`} onClick={() => remove.mutate({ venueProductId: p.venueProductId! })} loading={remove.isPending}>
            {!remove.isPending ? <Trash2 className="h-4 w-4" /> : null}
          </Button>
        ) : null}
      </div>
      {error ? <p className="mt-1 pl-[3.25rem] text-xs text-danger">{error}</p> : null}
    </li>
  );
}

/** Çalışan (sipariş yetkili): yalnız mevcut/yok ve stok. */
export function StaffProductRow({ p, venueId }: { p: VenueProduct; venueId: string }) {
  const utils = trpc.useUtils();
  const [stock, setStock] = useState(p.stock != null ? String(p.stock) : '');
  useEffect(() => setStock(p.stock != null ? String(p.stock) : ''), [p.stock]);
  const set = trpc.business.setProductAvailability.useMutation({
    onSuccess: () => {
      toast.success(`${p.name} güncellendi.`);
      void utils.business.products.invalidate({ venueId });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const dirty = stock !== (p.stock != null ? String(p.stock) : '');
  return (
    <li className="p-3">
      <div className="flex items-center gap-3">
        <Thumb p={p} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{p.name}</div>
          <div className="text-[11px] text-muted">
            {p.price != null ? formatMoney(p.price) : ''} · {p.isAvailable ? <span className="text-success">Var</span> : <span className="text-warning">Şu an yok</span>}
          </div>
        </div>
        <Switch
          checked={p.isAvailable}
          disabled={set.isPending}
          onCheckedChange={(v) => set.mutate({ venueProductId: p.venueProductId!, isAvailable: v })}
          aria-label={`${p.name} mevcut`}
        />
      </div>
      <div className="mt-2 flex items-center gap-2 pl-[3.25rem]">
        <input
          inputMode="numeric"
          value={stock}
          onChange={(e) => setStock(e.target.value.replace(/\D/g, ''))}
          placeholder="Stok"
          className={cn(inputCls, 'min-w-0 flex-1')}
          aria-label={`${p.name} stok`}
        />
        {dirty ? (
          <Button
            size="sm"
            loading={set.isPending}
            onClick={() => set.mutate({ venueProductId: p.venueProductId!, isAvailable: p.isAvailable, stock: stock ? Number(stock) : null })}
          >
            <Save className="h-3.5 w-3.5" />
            Kaydet
          </Button>
        ) : null}
      </div>
    </li>
  );
}
