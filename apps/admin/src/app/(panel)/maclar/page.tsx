'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { GAME_LABELS, MATCH_STATUS_LABELS } from '@bilardogo/domain';
import { Badge, Button, EmptyState, Tabs, toast } from '@bilardogo/ui';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Swords, Trophy } from 'lucide-react';
import { Fragment, useState } from 'react';
import { AdminPage, ConfirmDialog, DataTable, Td } from '@/components/admin-ui';
import { QueryError, TableSkeleton, UserCell } from '@/components/admin/common';
import { formatDateTime } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';

type Status = 'in_progress' | 'awaiting_result' | 'pending_confirmation' | 'completed' | 'void';
type Match = RouterOutputs['admin']['matches'][number];

const STATUS_TONE: Record<string, 'danger' | 'warning' | 'info' | 'success' | 'neutral'> = {
  in_progress: 'danger',
  waiting_opponent: 'warning',
  awaiting_result: 'warning',
  pending_confirmation: 'info',
  completed: 'success',
};
const CLOSED = ['declined', 'cancelled', 'expired', 'void'];

export default function MatchesPage() {
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const [voiding, setVoiding] = useState<Match | null>(null);
  const pageSize = 25;
  const utils = trpc.useUtils();
  const q = trpc.admin.matches.useQuery({ page, pageSize, status: status === 'all' ? undefined : status }, { placeholderData: (p) => p, refetchInterval: 30_000 });
  const voidM = trpc.admin.voidMatch.useMutation({
    onSuccess: async () => {
      toast.success('Maç sonuçsuz kapatıldı; oyuncu istatistikleri yeniden hesaplandı.');
      setVoiding(null);
      await Promise.all([utils.admin.matches.invalidate(), utils.admin.dashboard.invalidate(), utils.admin.venueTables.invalidate()]);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  return (
    <AdminPage title="Maçlar" description="Tüm maçlar; yanıltıcı skor şikâyetlerinde maçı sonuçsuz kapatabilirsiniz">
      <Tabs
        className="mb-4 max-w-3xl"
        value={status}
        onChange={(v) => {
          setStatus(v);
          setPage(1);
          setOpen(null);
        }}
        tabs={[
          { value: 'all', label: 'Tümü' },
          { value: 'in_progress', label: 'Maçta' },
          { value: 'awaiting_result', label: 'Sonuç bekleyen' },
          { value: 'pending_confirmation', label: 'Onay bekleyen' },
          { value: 'completed', label: 'Tamamlanan' },
          { value: 'void', label: 'Sonuçsuz' },
        ]}
      />
      {q.isLoading ? (
        <TableSkeleton />
      ) : q.error ? (
        <QueryError error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState icon={<Swords />} title="Maç yok" description="Bu durumda maç bulunmuyor." />
      ) : (
        <>
          <DataTable columns={['Oyuncular', 'Oyun', 'Salon', 'Durum', 'Skor', 'Güncelleme', '']}>
            {q.data.map((m) => {
              const expanded = open === m.id;
              return (
                <Fragment key={m.id}>
                  <tr className="cursor-pointer hover:bg-surface-2" onClick={() => setOpen(expanded ? null : m.id)}>
                    <Td>
                      <div className="space-y-1">
                        {m.players.map((p, i) => (
                          <div key={p?.id ?? i} className="flex items-center gap-1.5 text-sm">
                            {m.result?.winnerSlot === i + 1 ? <Trophy className="h-3.5 w-3.5 text-brand" /> : <span className="w-3.5" />}
                            {p?.displayName ?? '—'}
                          </div>
                        ))}
                        {m.players.length < 2 ? <div className="pl-5 text-xs text-subtle">Rakip bekleniyor</div> : null}
                      </div>
                    </Td>
                    <Td className="text-muted">{GAME_LABELS[m.gameType]}</Td>
                    <Td className="text-muted">{m.venueName}</Td>
                    <Td>
                      <Badge tone={STATUS_TONE[m.status] ?? 'neutral'} dot>
                        {MATCH_STATUS_LABELS[m.status]}
                      </Badge>
                    </Td>
                    <Td className="whitespace-nowrap font-semibold">
                      {m.result ? (
                        <>
                          {m.result.p1Score} – {m.result.p2Score}
                          <span className="ml-1.5 text-xs font-normal text-muted">{m.result.status === 'confirmed' ? 'onaylı' : 'onay bekliyor'}</span>
                        </>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-muted">{formatDateTime(m.updatedAt)}</Td>
                    <Td>{expanded ? <ChevronUp className="h-4 w-4 text-muted" /> : <ChevronDown className="h-4 w-4 text-muted" />}</Td>
                  </tr>
                  {expanded ? (
                    <tr className="bg-surface-2/60">
                      <td colSpan={7} className="px-4 py-4">
                        <MatchDetail m={m} onVoid={() => setVoiding(m)} />
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </DataTable>
          <div className="mt-3 flex items-center justify-between text-sm text-muted">
            <span>Sayfa {page}</span>
            <div className="flex gap-1">
              <Button size="icon-sm" variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Önceki">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button size="icon-sm" variant="secondary" disabled={(q.data?.length ?? 0) < pageSize} onClick={() => setPage(page + 1)} aria-label="Sonraki">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}
      <ConfirmDialog
        key={voiding?.id ?? 'none'}
        open={!!voiding}
        onOpenChange={(o) => !o && setVoiding(null)}
        title="Maç sonuçsuz kapatılsın mı?"
        description="Girilen / onaylanan sonuç geçersiz sayılır ve iki oyuncunun istatistikleri yeniden hesaplanır. Bu işlem denetim kaydına yazılır."
        confirmLabel="Sonuçsuz kapat"
        tone="danger"
        withNote
        noteRequired
        notePlaceholder="Sebep (en az 3 karakter), ör. yanıltıcı skor şikâyeti"
        loading={voidM.isPending}
        onConfirm={(reason) => {
          if (reason.length < 3) return toast.error('Sebep en az 3 karakter olmalı.');
          if (voiding) voidM.mutate({ matchId: voiding.id, reason });
        }}
      />
    </AdminPage>
  );
}

function MatchDetail({ m, onVoid }: { m: Match; onVoid: () => void }) {
  const r = m.result;
  const rows: { label: string; a: React.ReactNode; b: React.ReactNode }[] = r
    ? [
        { label: 'Skor', a: r.p1Score, b: r.p2Score },
        ...(r.p1Innings !== null || r.p2Innings !== null
          ? [{ label: 'Istaka sayısı', a: r.p1Innings ?? 'Hatırlamıyor', b: r.p2Innings ?? 'Hatırlamıyor' }]
          : []),
        ...(r.p1HighRun !== null || r.p2HighRun !== null
          ? [{ label: 'En yüksek seri', a: r.p1HighRun ?? 'Hatırlamıyor', b: r.p2HighRun ?? 'Hatırlamıyor' }]
          : []),
      ]
    : [];
  return (
    <div className="flex flex-wrap items-start gap-6">
      <div className="min-w-64 flex-1">
        <div className="mb-2 grid grid-cols-[120px_1fr_1fr] items-center gap-2">
          <span />
          {[0, 1].map((i) => (
            <span key={i}>{m.players[i] ? <UserCell user={m.players[i]} size="xs" /> : 'Oyuncu ' + (i + 1)}</span>
          ))}
        </div>
        {r ? (
          <div className="space-y-1 text-sm">
            {rows.map((row) => (
              <div key={row.label} className="grid grid-cols-[120px_1fr_1fr] gap-2">
                <span className="text-muted">{row.label}</span>
                <span className="font-semibold">{row.a}</span>
                <span className="font-semibold">{row.b}</span>
              </div>
            ))}
            {r.target ? <div className="pt-1 text-xs text-muted">Hedef: {r.target}</div> : null}
            <div className="pt-1 text-xs text-muted">
              Sonuç {r.status === 'confirmed' ? 'onaylandı' : 'rakip onayı bekliyor'} · girildi {formatDateTime(r.createdAt)}
              {r.winnerSlot ? ` · kazanan: ${m.players[r.winnerSlot - 1]?.displayName ?? 'Oyuncu ' + r.winnerSlot}` : ' · berabere / kazanan yok'}
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted">Sonuç girilmemiş.</p>
        )}
        <div className="mt-2 font-mono text-[11px] text-subtle">Maç no: {m.id}</div>
      </div>
      {!CLOSED.includes(m.status) ? (
        <Button variant="danger" size="sm" onClick={onVoid}>
          Sonuçsuz kapat
        </Button>
      ) : (
        <span className="text-xs text-subtle">Bu maç kapanmış.</span>
      )}
    </div>
  );
}
