import type { RouterOutputs } from '@bilardogo/api';
import { Badge } from '@bilardogo/ui';
import { ArrowRight, MapPin, Navigation } from 'lucide-react';
import Link from 'next/link';
import { directionsUrl } from '@/lib/format';

type Venue = RouterOutputs['venues']['list'][number];

/** Salon kartı: ad, görsel, adres, yol tarifi, açık/kapalı, aktif oyuncu sayısı, Salona Gir. */
export function VenueCard({ venue }: { venue: Venue }) {
  return (
    <article className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
      <Link href={`/salon/${venue.slug}`} className="relative block aspect-[16/8] bg-surface-2">
        {venue.imageUrl ? (
          <img src={venue.imageUrl} alt={venue.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_30%_30%,#1f5c3f,#0e2a1d)]">
            <span className="line-clamp-2 px-6 text-center font-display text-3xl font-bold text-white/15">{venue.name}</span>
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <span className="flex items-center gap-1.5 rounded-full bg-black/70 px-2.5 py-1 text-xs font-bold backdrop-blur">
            <span className={`h-2 w-2 rounded-full ${venue.activeCount > 0 ? 'bg-success' : 'bg-subtle'}`} />
            {venue.activeCount} Aktif Kişi
          </span>
          <span className="flex flex-col items-end gap-1.5">
            <Badge tone={venue.isOpen ? 'success' : 'neutral'} className="bg-black/70 backdrop-blur">
              {venue.isOpen ? 'Açık' : 'Kapalı'}
            </Badge>
          </span>
        </div>
      </Link>
      <div className="flex items-end gap-3 p-4">
        <div className="min-w-0 flex-1">
          <Link href={`/salon/${venue.slug}`}>
            <h3 className="truncate font-display text-xl font-semibold">{venue.name}</h3>
          </Link>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            {[venue.district, venue.address].filter(Boolean).join(' · ')}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-muted">
            <span>{venue.todayHours}</span>
            {venue.tables.total > 0 ? (
              <span>
                · {venue.tables.total - venue.tables.busy}/{venue.tables.total} masa boş
              </span>
            ) : null}
            {venue.wantsCount > 0 ? <span className="text-brand">· {venue.wantsCount} kişi maç arıyor</span> : null}
            {venue.comingCount > 0 ? <span>· {venue.comingCount} kişi gelecek</span> : null}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <a
            href={directionsUrl(venue)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-8 items-center gap-1 rounded-full border border-border bg-surface-2 px-3 text-xs font-semibold"
          >
            <Navigation className="h-3.5 w-3.5" /> Yol Tarifi
          </a>
          <Link
            href={`/salon/${venue.slug}`}
            className="flex h-9 items-center gap-1 rounded-xl border border-brand/50 bg-brand-soft px-3.5 text-sm font-bold text-brand"
          >
            Salona Gir <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
