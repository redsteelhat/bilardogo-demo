'use client';
import { CITIES } from '@bilardogo/domain';
import { Avatar, Badge, Button, Card, cn, ErrorState, Select, Skeleton } from '@bilardogo/ui';
import { ArrowLeft, Check, ChevronDown, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { errorMessage } from '@/lib/trpc/client';
import type { LabelTone } from './labels';

export function ToneBadge({ value, dot = true, className }: { value: LabelTone | undefined; dot?: boolean; className?: string }) {
  if (!value) return null;
  return (
    <Badge tone={value.tone} dot={dot} className={className}>
      {value.label}
    </Badge>
  );
}

/** Tablo yüklenirken gösterilen iskelet. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 rounded-2xl border border-border bg-surface p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-4 p-4 lg:p-8">
      <Skeleton className="h-9 w-64" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-64 lg:col-span-2" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

export function QueryError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return <ErrorState message={errorMessage(error)} onRetry={onRetry} />;
}

type UserLike = { id: string; displayName: string; username: string | null; avatarUrl: string | null };

/** Avatar + ad + @kullanıcı adı; kullanıcı detayına bağlanır. */
export function UserCell({ user, sub, link = true, size = 'sm' }: { user: UserLike | null | undefined; sub?: React.ReactNode; link?: boolean; size?: 'xs' | 'sm' | 'md' }) {
  if (!user) return <span className="text-subtle">Silinmiş kullanıcı</span>;
  const body = (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={user.displayName} src={user.avatarUrl} size={size} />
      <span className="min-w-0">
        <span className="block truncate font-medium">{user.displayName}</span>
        <span className="block truncate text-xs text-muted">{sub ?? (user.username ? `@${user.username}` : '—')}</span>
      </span>
    </span>
  );
  return link ? (
    <Link href={`/kullanicilar/${user.id}`} className="block min-w-0 hover:text-brand" onClick={(e) => e.stopPropagation()}>
      {body}
    </Link>
  ) : (
    body
  );
}

/** Kart başlıklı bölüm. */
export function Panel({ title, action, children, className, bodyClassName }: { title: React.ReactNode; action?: React.ReactNode; children: React.ReactNode; className?: string; bodyClassName?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="flex items-center gap-3 border-b border-border px-5 py-3.5">
        <h2 className="min-w-0 flex-1 font-display text-lg font-semibold">{title}</h2>
        {action}
      </div>
      <div className={cn('p-5', bodyClassName)}>{children}</div>
    </Card>
  );
}

/** Anahtar / değer listesi. */
export function KV({ items, cols = 2 }: { items: { label: React.ReactNode; value: React.ReactNode; wide?: boolean }[]; cols?: 1 | 2 | 3 }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', cols === 1 ? 'grid-cols-1' : cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3')}>
      {items.map((it, i) => (
        <div key={i} className={cn('min-w-0', it.wide && 'sm:col-span-full')}>
          <dt className="text-[11px] font-semibold uppercase tracking-wide text-subtle">{it.label}</dt>
          <dd className="mt-0.5 break-words text-sm">{it.value === null || it.value === undefined || it.value === '' ? <span className="text-subtle">—</span> : it.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function BackLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
      <ArrowLeft className="h-4 w-4" /> {children}
    </Link>
  );
}

/** Filtre çubuğu. */
export function Toolbar({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mb-4 flex flex-wrap items-center gap-2', className)}>{children}</div>;
}

/** Filtre olarak kullanılan küçük select. */
export function FilterSelect({ value, onChange, children, className, 'aria-label': ariaLabel }: { value: string; onChange: (v: string) => void; children: React.ReactNode; className?: string; 'aria-label'?: string }) {
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)} className={cn('h-10 w-auto min-w-36 text-sm', className)} aria-label={ariaLabel}>
      {children}
    </Select>
  );
}

export function CityOptions({ allLabel = 'Tüm iller' }: { allLabel?: string }) {
  return (
    <>
      <option value="">{allLabel}</option>
      {CITIES.map((c) => (
        <option key={c.plate} value={c.plate}>
          {c.name}
        </option>
      ))}
    </>
  );
}

/** Aranabilir çoklu il seçici (boş = Türkiye geneli). */
export function CityMultiSelect({ value, onChange, emptyLabel = 'Türkiye geneli' }: { value: number[]; onChange: (v: number[]) => void; emptyLabel?: string }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);
  const filtered = useMemo(() => {
    const s = q.trim().toLocaleLowerCase('tr-TR');
    return s ? CITIES.filter((c) => c.name.toLocaleLowerCase('tr-TR').includes(s) || String(c.plate) === s) : CITIES;
  }, [q]);
  const toggle = (plate: number) => onChange(value.includes(plate) ? value.filter((p) => p !== plate) : [...value, plate].sort((a, b) => a - b));
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-11 w-full flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-2 text-left text-sm"
      >
        {value.length === 0 ? <span className="text-muted">{emptyLabel}</span> : null}
        {value.map((p) => (
          <span key={p} className="inline-flex items-center gap-1 rounded-lg bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
            {CITIES.find((c) => c.plate === p)?.name ?? p}
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                toggle(p);
              }}
            />
          </span>
        ))}
        <ChevronDown className="ml-auto h-4 w-4 text-subtle" />
      </button>
      {open ? (
        <div className="absolute z-40 mt-1 w-full rounded-2xl border border-border bg-surface-2 p-2 shadow-2xl">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="İl ara…"
            className="mb-2 h-9 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-brand focus:outline-none"
          />
          <div className="max-h-60 overflow-y-auto">
            {filtered.map((c) => {
              const on = value.includes(c.plate);
              return (
                <button
                  key={c.plate}
                  type="button"
                  onClick={() => toggle(c.plate)}
                  className={cn('flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm hover:bg-surface-3', on && 'text-brand')}
                >
                  <span className="w-6 text-xs text-subtle">{String(c.plate).padStart(2, '0')}</span>
                  <span className="flex-1">{c.name}</span>
                  {on ? <Check className="h-4 w-4" /> : null}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2">
            <Button size="sm" variant="ghost" onClick={() => onChange([])}>
              Temizle
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>
              Tamam
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function cityList(plates: number[], empty = 'Türkiye geneli') {
  if (!plates.length) return empty;
  const names = plates.map((p) => CITIES.find((c) => c.plate === p)?.name ?? String(p));
  return names.length > 3 ? `${names.slice(0, 3).join(', ')} +${names.length - 3}` : names.join(', ');
}

/** Tablo satırını tıklanabilir yapan yardımcı sınıf. */
export const clickableRow = 'cursor-pointer transition-colors hover:bg-surface-2';
