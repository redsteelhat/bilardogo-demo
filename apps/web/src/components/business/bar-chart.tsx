'use client';
import { Card, cn } from '@bilardogo/ui';
import { useState } from 'react';

export type BarDatum = { day: string; value: number };

function dayLabel(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

/** Basit sütun grafik (bağımlılıksız). Dokununca/üzerine gelince günün değeri görünür. */
export function BarChart({
  title,
  data,
  format,
  total,
}: {
  title: string;
  data: BarDatum[];
  format: (v: number) => string;
  total: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));
  const shown = active !== null ? data[active] : null;
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-muted">{title}</h3>
          <div className="font-display text-2xl font-semibold">{total}</div>
        </div>
        <div className="text-right text-xs text-muted" aria-live="polite">
          {shown ? (
            <>
              <div className="font-semibold text-fg">{format(shown.value)}</div>
              <div>{dayLabel(shown.day)}</div>
            </>
          ) : (
            <div>Son 30 gün</div>
          )}
        </div>
      </div>
      <div className="relative mt-4">
        <div className="pointer-events-none absolute inset-x-0 top-0 border-t border-dashed border-border" />
        <span className="pointer-events-none absolute -top-2 right-0 bg-surface pl-1 text-[10px] text-subtle">{format(max)}</span>
        <div className="flex h-32 items-end gap-[3px]" onMouseLeave={() => setActive(null)}>
          {data.map((d, i) => {
            const h = (d.value / max) * 100;
            const isLast = i === data.length - 1;
            return (
              <button
                key={d.day}
                type="button"
                className="group flex h-full min-w-0 flex-1 items-end"
                onMouseEnter={() => setActive(i)}
                onFocus={() => setActive(i)}
                onClick={() => setActive(i)}
                aria-label={`${dayLabel(d.day)}: ${format(d.value)}`}
              >
                <span
                  className={cn(
                    'block w-full rounded-t-[3px] transition-colors',
                    d.value === 0 ? 'bg-surface-3' : isLast || active === i ? 'bg-brand' : 'bg-brand/55 group-hover:bg-brand',
                  )}
                  style={{ height: d.value === 0 ? 2 : `${Math.max(4, h)}%` }}
                />
              </button>
            );
          })}
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-subtle">
          {data
            .filter((_, i) => i % 7 === 0 || i === data.length - 1)
            .map((d) => (
              <span key={d.day}>{dayLabel(d.day)}</span>
            ))}
        </div>
      </div>
    </Card>
  );
}
