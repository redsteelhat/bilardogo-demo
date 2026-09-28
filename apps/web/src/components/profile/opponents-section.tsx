'use client';
import { Avatar, Card, CardBody, CardHeader, Skeleton } from '@bilardogo/ui';
import { ChevronRight, History } from 'lucide-react';
import { useState } from 'react';
import { QueryError } from '@/components/common/states';
import { trpc } from '@/lib/trpc/client';
import { HeadToHeadDialog } from './head-to-head';
import type { Opponent, Profile } from './types';

/** Rakip geçmişi: profil sahibinin onaylanmış maç yaptığı rakipler; dokununca karşılıklı geçmiş açılır. */
export function OpponentsSection({ profile, loggedIn }: { profile: Profile; loggedIn: boolean }) {
  const q = trpc.players.opponents.useQuery({ userId: profile.user.id }, { enabled: loggedIn });
  const [selected, setSelected] = useState<Opponent | null>(null);
  const [showAll, setShowAll] = useState(false);
  if (!loggedIn) return null;
  const list = q.data ?? [];
  const visible = showAll ? list : list.slice(0, 6);
  return (
    <Card>
      <CardHeader icon={<History className="h-5 w-5" />} title="Rakip geçmişi" description="Rakibe dokun, karşılıklı maçları gör" />
      <CardBody>
        {q.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-12 w-full rounded-2xl" />
          </div>
        ) : q.error ? (
          <QueryError error={q.error} retry={() => q.refetch()} />
        ) : list.length ? (
          <ul className="space-y-1.5">
            {visible.map((o) => (
              <li key={o.user.id}>
                <button
                  type="button"
                  onClick={() => setSelected(o)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-border bg-surface-2 p-2.5 text-left transition-colors hover:bg-surface-3"
                >
                  <Avatar name={o.user.displayName} src={o.user.avatarUrl} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{o.user.displayName}</div>
                    <div className="text-[11px] text-muted">{o.matches} maç</div>
                  </div>
                  <span className="text-sm font-bold tabular-nums">
                    <span className="text-success">{o.wins}G</span>
                    <span className="mx-1 text-subtle">·</span>
                    <span className="text-danger">{o.losses}M</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-subtle" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted">Henüz onaylanmış maç yok.</p>
        )}
        {list.length > 6 ? (
          <button type="button" onClick={() => setShowAll((s) => !s)} className="mt-2 w-full py-1.5 text-xs font-semibold text-brand">
            {showAll ? 'Daha az göster' : `Tüm rakipler (${list.length})`}
          </button>
        ) : null}
      </CardBody>
      {selected ? (
        <HeadToHeadDialog
          open={!!selected}
          onOpenChange={(v) => !v && setSelected(null)}
          subjectId={profile.user.id}
          otherId={selected.user.id}
          title={`${profile.isMe ? 'Sen' : profile.user.displayName} – ${selected.user.displayName}`}
          perspective={profile.isMe ? 'me' : 'them'}
        />
      ) : null}
    </Card>
  );
}
