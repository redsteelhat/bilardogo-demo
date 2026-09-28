import { consentKinds } from '@bilardogo/domain';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageBody, PageHeader } from '@/components/common/page-header';
import { formatDate } from '@/lib/format';
import { getServerCaller } from '@/lib/trpc/server';

type Kind = (typeof consentKinds)[number];

export async function generateMetadata({ params }: { params: Promise<{ kind: string }> }): Promise<Metadata> {
  const { kind } = await params;
  if (!(consentKinds as readonly string[]).includes(kind)) return {};
  const caller = await getServerCaller();
  const doc = await caller.meta.legal({ kind: kind as Kind }).catch(() => null);
  return { title: doc?.title ?? 'Yasal metin' };
}

export default async function LegalPage({ params }: { params: Promise<{ kind: string }> }) {
  const { kind } = await params;
  if (!(consentKinds as readonly string[]).includes(kind)) notFound();
  const caller = await getServerCaller();
  const doc = await caller.meta.legal({ kind: kind as Kind }).catch(() => null);
  if (!doc) notFound();
  return (
    <>
      <PageHeader title={doc.title} subtitle={`Sürüm ${doc.version} · ${formatDate(doc.publishedAt, { day: 'numeric', month: 'long', year: 'numeric' })}`} />
      <PageBody className="pb-16">
        <article className="whitespace-pre-line text-sm leading-relaxed text-fg/90">{doc.body}</article>
      </PageBody>
    </>
  );
}
