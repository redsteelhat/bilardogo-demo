'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { GAME_SHORT_LABELS } from '@bilardogo/domain';
import { Badge, Button, cn, toast } from '@bilardogo/ui';
import { Flag } from 'lucide-react';
import { useState } from 'react';
import { GameBadge } from '@/components/common/badges';
import { formatMinutes, formatTime } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';
import { ConfirmDialog, minutesSince, useNow } from './ui';

export type Overview = RouterOutputs['business']['overview'];
export type OverviewTable = Overview['tables'][number];

export function tableStatusBadge(t: Pick<OverviewTable, 'status' | 'isActive'>) {
  if (!t.isActive) return <Badge tone="neutral">Pasif</Badge>;
  if (t.status === 'busy') return <Badge tone="danger" dot>Dolu</Badge>;
  if (t.status === 'reserved') return <Badge tone="warning" dot>Rakip bekleniyor</Badge>;
  return <Badge tone="success" dot>Boş</Badge>;
}

export function playerNames(t: OverviewTable) {
  return t.match?.players.filter(Boolean).map((p) => p.displayName).join(' – ') ?? '';
}

export function FinishMatchButton({ table, venueId, size = 'sm' }: { table: OverviewTable; venueId: string; size?: 'sm' | 'md' }) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const finish = trpc.matches.finish.useMutation({
    onSuccess: () => {
      toast.success(`Masa ${table.number} boşaltıldı. Sonucu oyuncular girecek.`);
      setOpen(false);
      void utils.business.overview.invalidate({ venueId });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  if (!table.match) return null;
  return (
    <>
      <Button size={size} variant="danger" onClick={() => setOpen(true)}>
        <Flag className="h-3.5 w-3.5" />
        Maçı bitir
      </Button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title={`Masa ${table.number} — maç bitirilsin mi?`}
        description="Masa hemen boşalır. Maç sonucunu oyunculardan biri girer, diğeri onaylar."
        confirmLabel="Maçı bitir"
        tone="danger"
        loading={finish.isPending}
        onConfirm={() => finish.mutate({ matchId: table.match!.id })}
      >
        <div className="rounded-2xl border border-border bg-surface-2 p-3 text-sm">
          <div className="font-semibold">{playerNames(table) || 'Oyuncular'}</div>
          <div className="text-xs text-muted">
            {GAME_SHORT_LABELS[table.match.gameType]} · Başlangıç {formatTime(table.match.startedAt)}
          </div>
        </div>
      </ConfirmDialog>
    </>
  );
}

/** Canlı masa panosu: "Masa 1 – Dolu (Ahmet – Kenan) · 38 dk" / "Masa 2 – Boş". */
export function TableBoard({ overview, venueId, canFinish }: { overview: Overview; venueId: string; canFinish: boolean }) {
  const now = useNow(30_000);
  const tables = overview.tables;
  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {tables.map((t) => {
        const mins = t.match ? minutesSince(t.match.startedAt, now) : 0;
        return (
          <li
            key={t.id}
            className={cn(
              'rounded-2xl border bg-surface p-3',
              t.status === 'busy' ? 'border-danger/30' : t.status === 'reserved' ? 'border-warning/30' : 'border-border',
              !t.isActive && 'opacity-60',
            )}
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold',
                  t.status === 'busy' ? 'bg-danger-soft text-danger' : t.status === 'reserved' ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success',
                )}
              >
                {t.number}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    Masa {t.number}
                    {t.label ? <span className="font-normal text-muted"> · {t.label}</span> : null}
                  </span>
                </div>
                <div className="truncate text-xs text-muted">
                  {t.match ? (
                    <>
                      <span className="text-fg">{playerNames(t) || 'Oyuncu bekleniyor'}</span>
                      {t.status === 'busy' ? ` · ${formatMinutes(mins)}` : ''}
                    </>
                  ) : (
                    t.allowedGameTypes.map((g) => GAME_SHORT_LABELS[g]).join(' / ')
                  )}
                </div>
              </div>
              {tableStatusBadge(t)}
            </div>
            {t.match ? (
              <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
                <GameBadge game={t.match.gameType} />
                <span className="text-[11px] text-subtle">Başlangıç {formatTime(t.match.startedAt)}</span>
                <div className="ml-auto">{canFinish ? <FinishMatchButton table={t} venueId={venueId} /> : null}</div>
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
