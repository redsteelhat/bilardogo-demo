'use client';
import { Button, EmptyState, SectionTitle } from '@bilardogo/ui';
import { Swords, Trophy } from 'lucide-react';
import { ListSkeleton, QueryError } from '@/components/common/states';
import { trpc } from '@/lib/trpc/client';
import { MatchRow } from './match-row';

/** Son maçlar (onaylanmış), sayfalı. */
export function RecentMatches({ userId, isMe }: { userId: string; isMe: boolean }) {
  const q = trpc.matches.history.useInfiniteQuery({ userId, limit: 10 }, { getNextPageParam: (last) => last.nextCursor ?? undefined });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <section>
      <SectionTitle icon={<Trophy />}>Son maçlar</SectionTitle>
      {q.isLoading ? (
        <ListSkeleton rows={3} />
      ) : q.error ? (
        <QueryError error={q.error} retry={() => q.refetch()} />
      ) : items.length ? (
        <div className="space-y-2">
          {items.map((m) => (
            <MatchRow key={m.id} match={m} perspective={isMe ? 'me' : 'them'} />
          ))}
          {q.hasNextPage ? (
            <Button variant="secondary" block loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
              Daha fazla
            </Button>
          ) : null}
        </div>
      ) : (
        <EmptyState icon={<Swords />} title="Henüz onaylanmış maç yok" className="py-8" />
      )}
    </section>
  );
}
