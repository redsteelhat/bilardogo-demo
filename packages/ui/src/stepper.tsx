'use client';
import { Minus, Plus } from 'lucide-react';
import * as React from 'react';
import { cn } from './cn';

/** Sayı seçici (Hedef Sayı − 30 +). */
export function Stepper({
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  className,
  'aria-label': ariaLabel,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  'aria-label'?: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <button
        type="button"
        aria-label="Azalt"
        onClick={() => onChange(clamp(value - step))}
        disabled={value <= min}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg disabled:opacity-40"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        inputMode="numeric"
        aria-label={ariaLabel}
        value={Number.isFinite(value) ? value : ''}
        onChange={(e) => {
          const n = parseInt(e.target.value.replace(/\D/g, ''), 10);
          onChange(Number.isFinite(n) ? clamp(n) : min);
        }}
        className="h-8 w-12 rounded-lg border border-transparent bg-transparent text-center font-bold tabular-nums focus:border-brand focus:outline-none"
      />
      <button
        type="button"
        aria-label="Artır"
        onClick={() => onChange(clamp(value + step))}
        disabled={value >= max}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-surface-2 text-fg disabled:opacity-40"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}

/** Etiket solda, kontrol sağda bir form satırı (maç isteği formundaki gibi). */
export function FormRow({ label, children, hint, className }: { label: React.ReactNode; children: React.ReactNode; hint?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-3 border-b border-border py-3 last:border-b-0', className)}>
      <div className="min-w-0">
        <div className="text-sm text-muted">{label}</div>
        {hint ? <div className="text-[11px] text-subtle">{hint}</div> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
