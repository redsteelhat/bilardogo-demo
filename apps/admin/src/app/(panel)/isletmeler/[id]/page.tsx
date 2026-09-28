'use client';
import { formatTrPhone, STAFF_PERMISSION_LABELS, type STAFF_PERMISSIONS } from '@bilardogo/domain';
import { Badge, Button, Dialog, DialogContent, Notice, toast } from '@bilardogo/ui';
import { Check, ExternalLink, Eye, FileText, FileWarning, Power, X } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { AdminPage, ConfirmDialog } from '@/components/admin-ui';
import { EventsList, PaymentsTable, SubscriptionSummary } from '@/components/admin/billing';
import { BackLink, KV, PageSkeleton, Panel, QueryError, ToneBadge, UserCell } from '@/components/admin/common';
import { BUSINESS_STATUS, DOC_KIND_LABELS, VENUE_STATE } from '@/components/admin/labels';
import { cityName, formatDate, formatDateTime } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';

type Review = 'approve' | 'needs_docs' | 'reject';
type Perm = (typeof STAFF_PERMISSIONS)[number];

function formatBytes(n: number) {
  return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

export default function BusinessDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  const q = trpc.admin.business.useQuery({ businessId: id }, { staleTime: 5 * 60_000 });
  const [review, setReview] = useState<Review | null>(null);
  const [activeOpen, setActiveOpen] = useState(false);
  const [preview, setPreview] = useState<{ url: string; mime: string; name: string } | null>(null);

  const invalidate = () =>
    Promise.all([utils.admin.business.invalidate({ businessId: id }), utils.admin.businesses.invalidate(), utils.admin.dashboard.invalidate(), utils.admin.venues.invalidate()]);

  const reviewM = trpc.admin.reviewBusiness.useMutation({
    onSuccess: async (_d, v) => {
      toast.success(v.action === 'approve' ? 'İşletme onaylandı. İşletme sahibine bildirim gönderildi.' : v.action === 'needs_docs' ? 'Ek belge talebi iletildi.' : 'Başvuru reddedildi.');
      setReview(null);
      await invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const activeM = trpc.admin.setBusinessActive.useMutation({
    onSuccess: async (_d, v) => {
      toast.success(v.isActive ? 'İşletme hesabı aktif.' : 'İşletme hesabı pasife alındı.');
      setActiveOpen(false);
      await invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (q.isLoading) return <PageSkeleton />;
  if (q.error || !q.data)
    return (
      <AdminPage title="İşletme">
        <BackLink href="/isletmeler">İşletmeler</BackLink>
        <QueryError error={q.error} onRetry={() => q.refetch()} />
      </AdminPage>
    );

  const { business: b, ownerEmail, documents, venues, members, subscription, entitlement, payments, events } = q.data;
  const owner = members.find((m) => m.role === 'owner');
  const lastPaid = payments.find((p) => p.status === 'paid')?.paidAt ?? null;
  const reviewCfg: Record<Review, { title: string; desc: string; label: string; tone: 'primary' | 'danger'; note: boolean; placeholder?: string }> = {
    approve: {
      title: 'Başvuru onaylansın mı?',
      desc: `${b.legalName} onaylanınca salonları uygulamada görünür ve deneme süresi başlar. İşletme sahibine bildirim ve e-posta gider.`,
      label: 'Onayla',
      tone: 'primary',
      note: false,
    },
    needs_docs: {
      title: 'Ek belge iste',
      desc: 'İşletme sahibine hangi belgenin neden gerektiğini yazın. Bu not bildirimde gösterilir.',
      label: 'Ek belge iste',
      tone: 'primary',
      note: true,
      placeholder: 'Ör. Vergi levhasının güncel ve okunaklı bir kopyasını yükleyin.',
    },
    reject: {
      title: 'Başvuru reddedilsin mi?',
      desc: 'Ret sebebi işletme sahibine bildirilir.',
      label: 'Reddet',
      tone: 'danger',
      note: true,
      placeholder: 'Ret sebebi',
    },
  };

  return (
    <AdminPage
      title={b.legalName}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <ToneBadge value={BUSINESS_STATUS[b.status]} />
          {!b.isActive ? <Badge tone="danger">Hesap pasif</Badge> : <Badge tone="success">Hesap aktif</Badge>}
          <span>Başvuru: {formatDateTime(b.createdAt)}</span>
        </span>
      }
      actions={
        <>
          {b.status !== 'approved' ? (
            <Button variant="primary" size="sm" onClick={() => setReview('approve')}>
              <Check className="h-4 w-4" /> Onayla
            </Button>
          ) : null}
          {b.status !== 'needs_docs' ? (
            <Button variant="secondary" size="sm" onClick={() => setReview('needs_docs')}>
              <FileWarning className="h-4 w-4" /> Ek belge iste
            </Button>
          ) : null}
          {b.status !== 'rejected' ? (
            <Button variant="danger" size="sm" onClick={() => setReview('reject')}>
              <X className="h-4 w-4" /> Reddet
            </Button>
          ) : null}
          <Button variant={b.isActive ? 'ghost' : 'success'} size="sm" onClick={() => setActiveOpen(true)}>
            <Power className="h-4 w-4" /> {b.isActive ? 'Pasife al' : 'Aktif yap'}
          </Button>
        </>
      }
    >
      <BackLink href="/isletmeler">İşletmeler</BackLink>

      {b.reviewNote ? (
        <Notice tone={b.status === 'rejected' ? 'danger' : 'info'} title="Son inceleme notu" className="mb-4">
          {b.reviewNote}
          {b.reviewedAt ? <span className="text-xs text-subtle"> · {formatDateTime(b.reviewedAt)}</span> : null}
        </Notice>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Firma bilgileri">
            <KV
              items={[
                { label: 'Ticari unvan', value: b.legalName, wide: true },
                { label: b.taxId.length === 11 ? 'TCKN' : 'VKN', value: <span className="font-mono">{b.taxId}</span> },
                { label: 'Vergi dairesi', value: b.taxOffice },
                { label: 'İletişim telefonu', value: b.contactPhone ? <a className="hover:text-brand" href={`tel:${b.contactPhone}`}>{formatTrPhone(b.contactPhone) || b.contactPhone}</a> : null },
                { label: 'Sahip e-posta', value: ownerEmail ? <a className="hover:text-brand" href={`mailto:${ownerEmail}`}>{ownerEmail}</a> : null },
                { label: 'Sahip', value: owner ? <UserCell user={owner.user} /> : null },
                { label: 'Son inceleme', value: b.reviewedAt ? formatDateTime(b.reviewedAt) : 'İncelenmedi' },
              ]}
            />
          </Panel>

          <Panel title={`Belgeler (${documents.length})`}>
            {documents.length === 0 ? (
              <p className="text-sm text-muted">Yüklenmiş belge yok.</p>
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2">
                {documents.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{DOC_KIND_LABELS[d.kind] ?? d.kind}</div>
                      <div className="truncate text-xs text-muted">
                        {d.fileName} · {formatBytes(d.sizeBytes)} · {formatDate(d.createdAt, { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    {d.url ? (
                      <div className="flex gap-1">
                        <Button size="icon-sm" variant="ghost" aria-label="Önizle" onClick={() => setPreview({ url: d.url!, mime: d.mimeType, name: d.fileName })}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label="Yeni sekmede aç" onClick={() => window.open(d.url!, '_blank', 'noopener')}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-xs text-subtle">Bağlantı yok</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-subtle">Belge bağlantıları 15 dakika geçerlidir; süre dolarsa sayfayı yenileyin.</p>
          </Panel>

          <Panel title="Abonelik ve ödemeler">
            <SubscriptionSummary subscription={subscription} entitlement={entitlement} lastPaymentAt={lastPaid} />
            <h3 className="mb-2 mt-6 text-sm font-semibold text-muted">Ödeme geçmişi</h3>
            <PaymentsTable payments={payments} />
            <h3 className="mb-3 mt-6 text-sm font-semibold text-muted">Abonelik geçmişi</h3>
            <EventsList events={events} />
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel title="Salonlar">
            {venues.length === 0 ? (
              <p className="text-sm text-muted">Salon yok.</p>
            ) : (
              <ul className="space-y-2">
                {venues.map((v) => (
                  <li key={v.id}>
                    <Link href={`/salonlar/${v.id}`} className="block rounded-xl border border-border bg-surface-2 p-3 hover:border-brand/50">
                      <div className="flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">{v.name}</span>
                        <ToneBadge value={VENUE_STATE[v.state]} />
                      </div>
                      <div className="mt-0.5 text-xs text-muted">
                        {[v.district, cityName(v.cityPlate)].filter(Boolean).join(', ')}
                      </div>
                      <div className="mt-0.5 line-clamp-2 text-xs text-subtle">{v.address}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Üyeler ve yetkiler">
            <ul className="space-y-3">
              {members.map((m) => (
                <li key={m.user.id} className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <UserCell user={m.user} />
                    </div>
                    <Badge tone={m.role === 'owner' ? 'brand' : 'neutral'}>{m.role === 'owner' ? 'Sahip' : 'Çalışan'}</Badge>
                  </div>
                  {m.role === 'staff' ? (
                    m.permissions.length ? (
                      <ul className="ml-10 list-disc space-y-0.5 pl-4 text-xs text-muted">
                        {m.permissions.map((p) => (
                          <li key={p}>{STAFF_PERMISSION_LABELS[p as Perm] ?? p}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="ml-10 text-xs text-subtle">Yetki tanımlı değil.</p>
                    )
                  ) : null}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {review ? (
        <ConfirmDialog
          key={review}
          open
          onOpenChange={(o) => !o && setReview(null)}
          title={reviewCfg[review].title}
          description={reviewCfg[review].desc}
          confirmLabel={reviewCfg[review].label}
          tone={reviewCfg[review].tone}
          withNote={reviewCfg[review].note}
          noteRequired={reviewCfg[review].note}
          notePlaceholder={reviewCfg[review].placeholder}
          loading={reviewM.isPending}
          onConfirm={(note) => reviewM.mutate({ businessId: id, action: review, note: note || null })}
        />
      ) : null}
      <ConfirmDialog
        open={activeOpen}
        onOpenChange={setActiveOpen}
        title={b.isActive ? 'İşletme pasife alınsın mı?' : 'İşletme aktif yapılsın mı?'}
        description={b.isActive ? 'Pasif işletmenin salonları uygulamada listelenmez ve panele erişimi kısıtlanır.' : 'İşletme ve salonları yeniden kullanıma açılır.'}
        confirmLabel={b.isActive ? 'Pasife al' : 'Aktif yap'}
        tone={b.isActive ? 'danger' : 'primary'}
        loading={activeM.isPending}
        onConfirm={() => activeM.mutate({ businessId: id, isActive: !b.isActive })}
      />
      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        {preview ? (
          <DialogContent title={preview.name} className="sm:max-w-4xl">
            {preview.mime === 'application/pdf' ? (
              <iframe src={preview.url} title={preview.name} className="h-[70dvh] w-full rounded-xl border border-border bg-white" />
            ) : preview.mime.startsWith('image/') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.url} alt={preview.name} className="mx-auto max-h-[70dvh] rounded-xl object-contain" />
            ) : (
              <p className="text-sm text-muted">Bu dosya türü önizlenemiyor.</p>
            )}
            <div className="mt-3 text-right">
              <Button size="sm" variant="secondary" onClick={() => window.open(preview.url, '_blank', 'noopener')}>
                <ExternalLink className="h-4 w-4" /> Yeni sekmede aç
              </Button>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </AdminPage>
  );
}
