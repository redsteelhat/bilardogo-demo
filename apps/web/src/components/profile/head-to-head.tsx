'use client';
import { GAME_SHORT_LABELS, GAME_TYPES, type GameType } from '@bilardogo/domain';
import { Dialog, DialogContent, Segmented, StatTile } from '@bilardogo/ui';
import { Swords } from 'lucide-react';
import { useState } from 'react';
import { ListSkeleton, QueryError } from '@/components/common/states';
import { trpc } from '@/lib/trpc/client';
import { MatchRow } from './match-row';

/**
 * Karşılıklı geçmiş: iki oyuncu arasındaki yalnız onaylanmış maçlar, oyun türüne göre filtrelenir.
 * `subjectId` açısından kazanma/kaybetme gösterilir; `subjectId` verilmezse giriş yapan kullanıcı.
 */
export function HeadToHeadDialog({
  open,
  onOpenChange,
  subjectId,
  otherId,
  title,
  perspective,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  subjectId?: string;
  otherId: string;
  title: string;
  perspective: 'me' | 'them';
}) {
  const [game, setGame] = useState<GameType | 'all'>('all');
  const q = trpc.matches.headToHead.useQuery(
    { userId: otherId, otherId: subjectId, gameType: game === 'all' ? undefined : game },
    { enabled: open },
  );
  const d = q.data;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={title} description="Yalnız iki oyuncunun da onayladığı maçlar gösterilir.">
        <div className="space-y-4">
          <Segmented
            size="sm"
            value={game}
            onChange={setGame}
            options={[{ value: 'all' as const, label: 'Tümü' }, ...GAME_TYPES.map((g) => ({ value: g, label: GAME_SHORT_LABELS[g] }))]}
          />
          {q.isLoading ? (
            <ListSkeleton rows={2} />
          ) : q.error ? (
            <QueryError error={q.error} retry={() => q.refetch()} />
          ) : d ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <StatTile label={perspective === 'me' ? 'Kazandın' : 'Kazandı'} value={<span className="text-success">{d.wins}</span>} />
                <StatTile label={perspective === 'me' ? 'Kaybettin' : 'Kaybetti'} value={<span className="text-danger">{d.losses}</span>} />
                <StatTile label="Berabere" value={d.draws} />
              </div>
              {d.matches.length ? (
                <div className="space-y-2">
                  {d.matches.map((m) => (
                    <MatchRow key={m.id} match={m} perspective={perspective} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted">
                  <Swords className="h-7 w-7 text-subtle" />
                  {game === 'all' ? 'Aralarında onaylanmış maç yok.' : `${GAME_SHORT_LABELS[game]} türünde onaylanmış maç yok.`}
                </div>
              )}
            </>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
