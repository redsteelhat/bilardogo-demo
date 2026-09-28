'use client';
import { Badge } from '@bilardogo/ui';
import { ExternalLink } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc/client';

type Placement = 'home' | 'bulletin' | 'venue';

/** Reklam/sponsor alanı: Türkiye geneli veya il bazlı. Görünme ve tıklama sayılır. */
export function AdSlot({ placement, cityPlate }: { placement: Placement; cityPlate: number | null }) {
  const q = trpc.feed.ads.useQuery({ placement, cityPlate }, { staleTime: 5 * 60_000 });
  const ad = q.data?.[0];
  return ad ? <AdCard ad={ad} /> : null;
}

export function AdCard({
  ad,
}: {
  ad: { id: string; brand: string; logoUrl: string | null; product: string | null; priceText: string | null; body: string | null; mediaUrl: string | null; mediaType: 'image' | 'video' | null; link: string | null; contact: string | null };
}) {
  const event = trpc.feed.adEvent.useMutation();
  const seen = useRef(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e?.isIntersecting && !seen.current) {
          seen.current = true;
          event.mutate({ adId: ad.id, kind: 'impression' });
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ad.id]);
  return (
    <div ref={ref} className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
      {ad.mediaUrl ? (
        ad.mediaType === 'video' ? (
          <video src={ad.mediaUrl} className="aspect-[16/7] w-full object-cover" autoPlay muted loop playsInline />
        ) : (
          <img src={ad.mediaUrl} alt={ad.brand} className="aspect-[16/7] w-full object-cover" loading="lazy" />
        )
      ) : null}
      <div className="flex items-center gap-3 p-3.5">
        {ad.logoUrl ? <img src={ad.logoUrl} alt="" className="h-10 w-10 rounded-xl bg-white object-contain p-1" /> : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{ad.brand}</span>
            <Badge tone="neutral">Sponsor</Badge>
          </div>
          <div className="truncate text-xs text-muted">{[ad.product, ad.priceText].filter(Boolean).join(' · ') || ad.body}</div>
        </div>
        {ad.link ? (
          <a
            href={ad.link}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={() => event.mutate({ adId: ad.id, kind: 'click' })}
            className="flex h-9 items-center gap-1 rounded-xl bg-brand-soft px-3 text-xs font-bold text-brand"
          >
            İncele <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
    </div>
  );
}
