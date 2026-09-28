'use client';
import { Button, EmptyState, toast } from '@bilardogo/ui';
import { ExternalLink, Newspaper, Share2 } from 'lucide-react';
import { useParams } from 'next/navigation';
import { BulletinMedia, KindBadge } from '@/components/feed/bulletin-card';
import { PageBody, PageHeader } from '@/components/common/page-header';
import { PageLoading, QueryError } from '@/components/common/states';
import { formatDateTime } from '@/lib/format';
import { trpc } from '@/lib/trpc/client';

async function share(title: string) {
  const url = window.location.href;
  if (navigator.share) {
    try {
      await navigator.share({ title, url });
      return;
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    toast.success('Bağlantı kopyalandı');
  } catch {
    toast.error('Bağlantı kopyalanamadı', { description: url });
  }
}

export default function BulletinDetailPage() {
  const { id } = useParams<{ id: string }>();
  const q = trpc.feed.bulletinItem.useQuery({ id });
  const shareBtn = q.data ? (
    <Button size="icon-sm" variant="ghost" aria-label="Paylaş" onClick={() => void share(q.data!.title)}>
      <Share2 className="h-4 w-4" />
    </Button>
  ) : undefined;

  if (q.isLoading) {
    return (
      <>
        <PageHeader title="Bülten" backHref="/bulten" />
        <PageLoading />
      </>
    );
  }
  if (q.error || !q.data) {
    return (
      <>
        <PageHeader title="Bülten" backHref="/bulten" />
        <PageBody>
          {q.error?.data?.code === 'NOT_FOUND' ? (
            <EmptyState icon={<Newspaper />} title="İçerik bulunamadı" description="Yayından kaldırılmış olabilir." />
          ) : (
            <QueryError error={q.error} retry={() => q.refetch()} />
          )}
        </PageBody>
      </>
    );
  }
  const b = q.data;
  return (
    <>
      <PageHeader title={b.kindLabel} subtitle="BilardoGo Bülteni" backHref="/bulten" actions={shareBtn} />
      <PageBody className="space-y-4">
        <article className="overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
          {b.kind === 'live' ? (
            <div className="flex items-center gap-2 bg-danger px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> Canlı yayın
            </div>
          ) : null}
          <BulletinMedia item={b} />
          <div className="space-y-3 p-4">
            <div className="flex items-center gap-2">
              <KindBadge kind={b.kind} label={b.kindLabel} />
              {b.publishedAt ? <span className="text-xs text-subtle">{formatDateTime(b.publishedAt)}</span> : null}
            </div>
            <h1 className="font-display text-2xl font-bold leading-tight">{b.title}</h1>
            {b.body ? <div className="whitespace-pre-line text-[15px] leading-relaxed text-fg/90">{b.body}</div> : null}
            {b.videoUrl && !b.embedUrl ? (
              <a href={b.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
                <Button variant="outline">
                  <ExternalLink className="h-4 w-4" /> Videoyu aç
                </Button>
              </a>
            ) : b.videoUrl ? (
              <a href={b.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-brand">
                YouTube’da aç <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
          </div>
        </article>
        <Button variant="secondary" block onClick={() => void share(b.title)}>
          <Share2 className="h-4 w-4" /> Paylaş
        </Button>
      </PageBody>
    </>
  );
}
