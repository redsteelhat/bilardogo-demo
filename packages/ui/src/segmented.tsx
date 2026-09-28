'use client';
import * as React from 'react';
import { cn } from './cn';

/** Seçenek düğmeleri (ör. oyun türü: 3 Bant / Karambol / Amerikan / 9 Top / Snooker; Handikap: Yok / Var). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
  wrap,
}: {
  value: T | null;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode; disabled?: boolean; icon?: React.ReactNode }[];
  className?: string;
  size?: 'sm' | 'md';
  wrap?: boolean;
}) {
  return (
    <div role="radiogroup" className={cn('flex gap-1.5', wrap ? 'flex-wrap' : 'overflow-x-auto scrollbar-none', className)}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={o.disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-xl border font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-35',
              size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-3.5 text-sm',
              active ? 'border-brand/60 bg-brand-soft text-brand' : 'border-border bg-surface-2 text-muted hover:text-fg',
            )}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Çoklu seçim (ör. masada oynanabilen türler). */
export function MultiToggle<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T[];
  onChange: (v: T[]) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {options.map((o) => {
        const active = value.includes(o.value);
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? value.filter((v) => v !== o.value) : [...value, o.value])}
            className={cn(
              'h-9 rounded-xl border px-3 text-xs font-semibold transition-colors',
              active ? 'border-brand/60 bg-brand-soft text-brand' : 'border-border bg-surface-2 text-muted hover:text-fg',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Sekmeler (Tümü / Genel / Salon / Özel). */
export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  tabs: { value: T; label: React.ReactNode; count?: number }[];
  className?: string;
}) {
  return (
    <div className={cn('flex rounded-2xl border border-border bg-surface p-1', className)} role="tablist">
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn(
              'relative flex-1 rounded-xl px-2 py-2 text-xs font-semibold transition-colors',
              active ? 'bg-brand-soft text-brand ring-1 ring-brand/40' : 'text-muted hover:text-fg',
            )}
          >
            {t.label}
            {t.count ? (
              <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] text-brand-fg">
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
