import { LEVEL_LABELS } from '@bilardogo/domain';
import { Avatar } from '@bilardogo/ui';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { GameBadge, MatchStateBadge, PresenceBadge } from '@/components/common/badges';
import { cityName, formatDate } from '@/lib/format';
import type { Profile } from './types';

/** Profil üst bölümü: fotoğraf, ad, @kullanıcıadı, şehir, seviye, türler, hakkında ve anlık salon durumu. */
export function ProfileHero({ profile }: { profile: Profile }) {
  const u = profile.user;
  const p = profile.presence;
  const avatarStatus = p ? (p.matchState === 'in_match' ? 'in_match' : p.status) : null;
  return (
    <section className="relative overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
      <div className="h-20 bg-[radial-gradient(circle_at_20%_20%,rgba(255,122,26,0.35),transparent_60%),radial-gradient(circle_at_80%_0%,#1f5c3f,transparent_70%)]" />
      <div className="-mt-12 px-4 pb-4">
        <div className="flex items-end gap-3">
          <Avatar name={u.displayName} src={u.avatarUrl} size="xl" status={avatarStatus} className="ring-4 ring-surface rounded-full" />
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="truncate font-display text-2xl font-bold leading-tight">{u.displayName}</h1>
            {u.username ? <p className="truncate text-sm text-muted">@{u.username}</p> : null}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          {u.cityPlate ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-brand" /> {cityName(u.cityPlate)}
            </span>
          ) : null}
          <span className="rounded-full border border-brand/30 bg-brand-soft px-2 py-0.5 font-semibold text-brand">{LEVEL_LABELS[u.level]}</span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" /> {profile.friendCount} arkadaş
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" /> Üyelik: {formatDate(profile.memberSince, { month: 'long', year: 'numeric' })}
          </span>
        </div>
        {u.gameTypes.length ? (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {u.gameTypes.map((g) => (
              <GameBadge key={g} game={g} />
            ))}
          </div>
        ) : null}
        {profile.bio ? <p className="mt-3 whitespace-pre-line text-sm text-fg/90">{profile.bio}</p> : null}
        {p ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-surface-2 p-2.5 text-xs">
            <PresenceBadge status={p.status} />
            {p.venueName ? (
              p.venueSlug ? (
                <Link href={`/salon/${p.venueSlug}`} className="font-semibold hover:text-brand">
                  {p.venueName}
                </Link>
              ) : (
                <span className="font-semibold">{p.venueName}</span>
              )
            ) : null}
            <MatchStateBadge state={p.matchState} />
          </div>
        ) : null}
      </div>
    </section>
  );
}
