'use client';
import { GAME_SHORT_LABELS, MATCH_STATUS_LABELS } from '@bilardogo/domain';
import { ChevronRight, Swords } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/lib/session';
import { trpc } from '@/lib/trpc/client';

/** Aktif / sonuç bekleyen maç varsa alt menünün üstünde kısa bir şerit gösterir. */
export function ActiveMatchBar() {
  const { session } = useSession();
  const pathname = usePathname();
  const q = trpc.matches.current.useQuery(undefined, { enabled: !!session?.onboarded, refetchInterval: 60_000 });
  const m = q.data?.[0];
  if (!m || pathname.startsWith('/maclarim/') || pathname.startsWith('/sosyal/') || pathname.startsWith('/q/') || pathname.startsWith('/qr')) return null;
  const opp = m.players.find((p) => p.slot !== m.mySlot)?.user;
  const label =
    m.status === 'awaiting_result'
      ? 'Sonucu gir'
      : m.status === 'pending_confirmation'
        ? m.result?.submittedBy === session?.id
          ? 'Rakip onayı bekleniyor'
          : 'Sonucu onayla'
        : MATCH_STATUS_LABELS[m.status];
  return (
    <Link
      href={`/maclarim/${m.id}`}
      className="no-print fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-brand/40 bg-surface-2/95 px-3.5 py-2.5 shadow-2xl backdrop-blur"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-brand-fg">
        <Swords className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">
          {GAME_SHORT_LABELS[m.gameType]}
          {opp ? ` · ${opp.displayName}` : ''}
        </span>
        <span className="block truncate text-xs text-brand">{label}</span>
      </span>
      <ChevronRight className="h-4 w-4 text-muted" />
    </Link>
  );
}
