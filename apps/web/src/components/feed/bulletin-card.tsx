import type { RouterOutputs } from '@bilardogo/api';
import { Badge, cn } from '@bilardogo/ui';
import { ChevronRight, Clock, Megaphone, PlayCircle, Radio, Sparkles, Tag, Newspaper, GraduationCap, Info, Store } from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatDateTime, timeAgo } from '@/lib/format';

export type BulletinItem = RouterOutputs['feed']['bulletin']['bulletins'][number];
export type VenuePostItem = RouterOutputs['feed']['bulletin']['venuePosts'][number];
type Kind = BulletinItem['kind'];

const KIND_ICON: Record<Kind, React.ReactNode> = {
  news: <Newspaper className="h-3 w-3" />,
  live: <Radio className="h-3 w-3" />,
  video: <PlayCircle className="h-3 w-3" />,
  training: <GraduationCap className="h-3 w-3" />,
  feature: <Sparkles className="h-3 w-3" />,
  system: <Info className="h-3 w-3" />,
};

export function KindBadge({ kind, label }: { kind: Kind; label: string }) {
  return (
    <Badge tone={kind === 'live' ? 'danger' : kind === 'feature' ? 'brand' : kind === 'system' ? 'warning' : 'info'}>
      {kind === 'live' ? <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" /> : KIND_ICON[kind]}
      {label}
    </Badge>
  );
}

/** Bülten medyası: YouTube gömme, video ya da görsel. */
export function BulletinMedia({
  item,
  className,
  autoPlay,
}: {
  item: Pick<BulletinItem, 'embedUrl' | 'mediaUrl' | 'mediaType' | 'title' | 'videoUrl'>;
  className?: string;
  autoPlay?: boolean;
}) {
  if (item.embedUrl) {
    return (
      <div className={cn('relative aspect-video w-full bg-black', className)}>
        <iframe
          src={item.embedUrl}
          title={item.title}
          className="absolute inset-0 h-full w-full border-0"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    );
  }
  if (item.mediaUrl && item.mediaType === 'video') {
    return <video src={item.mediaUrl} controls playsInline muted={autoPlay} autoPlay={autoPlay} preload="metadata" className={cn('aspect-video w-full bg-black object-contain', className)} />;
  }
  if (item.mediaUrl) {
     
    return <img src={item.mediaUrl} alt={item.title} className={cn('aspect-[16/9] w-full object-cover', className)} loading="lazy" />;
  }
  return null;
}

/** BilardoGo Bülteni kartı (listede). */
export function BulletinCard({ item }: { item: BulletinItem }) {
  const live = item.kind === 'live';
  const excerpt = item.body.replace(/\s+/g, ' ').trim();
  return (
    <article
      className={cn(
        'overflow-hidden rounded-[var(--radius-card)] border bg-surface',
        live ? 'border-danger/40 shadow-[0_0_0_1px_rgba(239,68,68,0.15),0_8px_30px_-10px_rgba(239,68,68,0.35)]' : 'border-border',
      )}
    >
      {live ? (
        <div className="flex items-center gap-2 bg-danger px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
          <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> Canlı yayın
        </div>
      ) : null}
      <BulletinMedia item={item} />
      <Link href={`/bulten/${item.id}`} className="block p-4">
        <div className="flex items-center gap-2">
          <KindBadge kind={item.kind} label={item.kindLabel} />
          <span className="text-[11px] text-subtle">{item.publishedAt ? timeAgo(item.publishedAt) : ''}</span>
        </div>
        <h3 className="mt-2 font-display text-lg font-semibold leading-snug">{item.title}</h3>
        {excerpt ? <p className="mt-1 line-clamp-3 text-sm text-muted">{excerpt}</p> : null}
        <span className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand">
          Devamını oku <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    </article>
  );
}

/** Salon duyurusu / kampanyası. */
export function VenuePostCard({ post }: { post: VenuePostItem }) {
  const campaign = post.kind === 'campaign';
  return (
    <article className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
      {post.imageUrl ? (
         
        <img src={post.imageUrl} alt="" className="aspect-[16/8] w-full object-cover" loading="lazy" />
      ) : null}
      <div className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={campaign ? 'brand' : 'info'}>
            {campaign ? <Tag className="h-3 w-3" /> : <Megaphone className="h-3 w-3" />}
            {campaign ? 'Kampanya' : 'Duyuru'}
          </Badge>
          <Link href={`/salon/${post.venue.slug}`} className="inline-flex min-w-0 items-center gap-1 text-xs font-semibold text-fg hover:text-brand">
            <Store className="h-3.5 w-3.5 shrink-0 text-brand" />
            <span className="truncate">{post.venue.name}</span>
          </Link>
          <span className="ml-auto text-[11px] text-subtle">{formatDate(post.createdAt)}</span>
        </div>
        <h3 className="mt-2 font-display text-lg font-semibold leading-snug">{post.title}</h3>
        {post.body ? <p className="mt-1 whitespace-pre-line text-sm text-muted">{post.body}</p> : null}
        {post.validFrom || post.validTo ? (
          <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-warning">
            <Clock className="h-3 w-3" />
            {post.validTo
              ? `${post.validFrom ? `${formatDate(post.validFrom)} – ` : ''}${formatDateTime(post.validTo)} tarihine kadar geçerli`
              : `${formatDate(post.validFrom)} tarihinden itibaren`}
          </p>
        ) : null}
      </div>
    </article>
  );
}
