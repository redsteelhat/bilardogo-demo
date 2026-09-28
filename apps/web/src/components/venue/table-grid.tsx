'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { GAME_SHORT_LABELS } from '@bilardogo/domain';
import { cn } from '@bilardogo/ui';
import { formatMinutes } from '@/lib/format';
import { useNow } from '@/components/match/use-now';

export type LiveTable = RouterOutputs['venues']['live']['tables'][number];

const STATUS = {
  free: { label: 'Boş', cls: 'border-success/30 bg-success-soft/40', dot: 'bg-success', text: 'text-success' },
  busy: { label: 'Dolu', cls: 'border-danger/30 bg-danger-soft/40', dot: 'bg-danger', text: 'text-danger' },
  reserved: { label: 'Rezerve', cls: 'border-warning/30 bg-warning-soft/40', dot: 'bg-warning', text: 'text-warning' },
} as const;

/** Masa ızgarası: numara, oynanabilen türler, boş / dolu / rezerve, oyuncular (işletmeye süre). */
export function TableGrid({ tables }: { tables: LiveTable[] }) {
  const now = useNow(30_000, tables.some((t) => t.match?.startedAt));
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
      {tables.map((t) => {
        const s = STATUS[t.status];
        const names = t.match?.players.map((p) => p?.displayName.split(' ')[0]).filter(Boolean) ?? [];
        return (
          <div key={t.id} className={cn('rounded-2xl border p-3', s.cls)}>
            <div className="flex items-center justify-between gap-2">
              <div className="font-display text-lg font-bold leading-none">
                Masa {t.number}
              </div>
              <span className={cn('inline-flex items-center gap-1 text-[11px] font-bold', s.text)}>
                <span className={cn('h-2 w-2 rounded-full', s.dot)} />
                {s.label}
              </span>
            </div>
            {t.label && t.label !== t.allowedGameTypes.map((g) => GAME_SHORT_LABELS[g]).join(' / ') ? (
              <div className="mt-0.5 truncate text-[11px] text-muted">{t.label}</div>
            ) : null}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {t.allowedGameTypes.map((g) => (
                <span key={g} className="rounded-md bg-black/30 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                  {GAME_SHORT_LABELS[g]}
                </span>
              ))}
            </div>
            {t.match ? (
              <div className="mt-2 border-t border-white/5 pt-2 text-xs">
                <div className="truncate font-semibold">
                  {names.length ? names.join(' – ') : 'Oyuncu bekleniyor'}
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[11px] text-muted">
                  <span>{GAME_SHORT_LABELS[t.match.gameType]}</span>
                  {t.match.startedAt ? (
                    <span className="tabular-nums">{formatMinutes(Math.max(0, Math.floor((now - new Date(t.match.startedAt).getTime()) / 60_000)))}</span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
