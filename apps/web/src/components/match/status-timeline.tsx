import type { MatchStatus } from '@bilardogo/domain';
import { cn } from '@bilardogo/ui';
import { Check, X } from 'lucide-react';

const REQUEST_STEPS = ['İstek', 'Kabul', 'Maç Yapacak', 'Maçta', 'Maç Bitti', 'Sonuç Onayı', 'Tamamlandı'] as const;
const WALKIN_STEPS = ['Masa Oturumu', 'Rakip Katıldı', 'Maçta', 'Maç Bitti', 'Sonuç Onayı', 'Tamamlandı'] as const;

/** Aktif adımın indeksi (o adım "şu an"dır; öncekiler tamamlandı). */
function currentIndex(status: MatchStatus, source: string, playerCount: number, reached: number): number {
  const walkIn = source === 'walk_in';
  const map: Partial<Record<MatchStatus, number>> = walkIn
    ? {
        waiting_opponent: playerCount >= 2 ? 1 : 0,
        in_progress: 2,
        awaiting_result: 3,
        pending_confirmation: 4,
        completed: 5,
      }
    : {
        requested: 1,
        accepted: 2,
        in_progress: 3,
        awaiting_result: 4,
        pending_confirmation: 5,
        completed: 6,
      };
  return map[status] ?? reached;
}

/** Maç akışı: İstek → Kabul → Maç Yapacak → Maçta → Maç Bitti → Sonuç Onayı → Tamamlandı. */
export function StatusTimeline({
  status,
  source,
  playerCount,
  timestamps,
}: {
  status: MatchStatus;
  source: string;
  playerCount: number;
  timestamps: { acceptedAt: Date | null; startedAt: Date | null; endedAt: Date | null };
}) {
  const steps = source === 'walk_in' ? WALKIN_STEPS : REQUEST_STEPS;
  const failed = status === 'declined' || status === 'cancelled' || status === 'expired' || status === 'void';
  // Başarısız biten maçta nereye kadar gelindiğini zaman damgalarından çıkar
  const reached = timestamps.endedAt
    ? steps.length - 2
    : timestamps.startedAt
      ? steps.length - 4
      : timestamps.acceptedAt
        ? 2
        : 1;
  const idx = currentIndex(status, source, playerCount, reached);
  const done = status === 'completed';
  const failLabel =
    status === 'declined' ? 'Reddedildi' : status === 'cancelled' ? 'İptal edildi' : status === 'expired' ? 'Süresi doldu' : 'Sonuçsuz kapandı';

  return (
    <ol className="-mx-2 flex items-start overflow-x-auto scrollbar-none pb-1" aria-label="Maç durumu">
      {steps.map((label, i) => {
        const isDone = done || i < idx;
        const isCurrent = !done && !failed && i === idx;
        const isFail = failed && i === idx;
        return (
          <li key={label} className="relative flex min-w-[44px] flex-1 flex-col items-center text-center">
            {i > 0 ? (
              <span
                className={cn('absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2', isDone || isCurrent || isFail ? 'bg-brand/70' : 'bg-border')}
                aria-hidden
              />
            ) : null}
            <span
              className={cn(
                'relative z-10 flex h-6 w-6 items-center justify-center rounded-full border text-[10px] font-bold',
                isDone && 'border-brand bg-brand text-brand-fg',
                isCurrent && 'border-brand bg-bg text-brand ring-4 ring-brand/20',
                isFail && 'border-danger bg-danger-soft text-danger',
                !isDone && !isCurrent && !isFail && 'border-border bg-surface-2 text-subtle',
              )}
            >
              {isDone ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : isFail ? <X className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span
              className={cn(
                'mt-1.5 text-[9px] font-semibold leading-tight tracking-tight sm:text-[11px]',
                isCurrent ? 'text-brand' : isFail ? 'text-danger' : isDone ? 'text-fg' : 'text-subtle',
              )}
            >
              {isFail ? failLabel : label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
