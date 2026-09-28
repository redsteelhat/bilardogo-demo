'use client';
import { VENUE_STATUS_LABELS } from '@bilardogo/domain';
import { Avatar } from '@bilardogo/ui';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { formatTime } from '@/lib/format';
import { useSession } from '@/lib/session';
import { trpc } from '@/lib/trpc/client';

/** "Merhaba, …" kartı: mevcut salon durumu ve hızlı geçiş. */
export function MyStatusCard() {
  const { session } = useSession();
  const presence = trpc.presence.me.useQuery(undefined, { enabled: !!session?.onboarded });
  if (!session?.onboarded) return null;
  const p = presence.data;
  const status = p?.status ?? 'offline';
  const first = session.fullName.split(' ')[0] || session.username;
  return (
    <Link
      href={p?.venueSlug ? `/salon/${p.venueSlug}/kimler-var` : '#salonlar'}
      className="relative flex items-center gap-3 overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-4"
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-brand/10 blur-2xl" />
      <Avatar name={session.fullName || session.username || ''} src={session.avatarUrl} size="lg" status={status} />
      <div className="min-w-0 flex-1">
        <div className="font-display text-xl font-semibold">Merhaba, {first}</div>
        <div className="truncate text-xs text-muted">
          {status === 'offline'
            ? 'Bugün oynayacak kimse var mı? Bir salon seç.'
            : status === 'at_venue'
              ? `${VENUE_STATUS_LABELS.at_venue} · ${p?.venueName}${p?.playIntent === 'wants' ? ' · Oynamak istiyorum' : ''}`
              : `${VENUE_STATUS_LABELS.coming} · ${p?.venueName} · ${formatTime(p?.eta)}`}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-muted" />
    </Link>
  );
}
