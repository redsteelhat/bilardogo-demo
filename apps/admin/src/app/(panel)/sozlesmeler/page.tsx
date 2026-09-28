'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { consentKinds } from '@bilardogo/domain';
import { Badge, Button, Card, Dialog, DialogContent, DialogFooter, EmptyState, Field, Input, Notice, Skeleton, Textarea, toast } from '@bilardogo/ui';
import { AlertTriangle, ExternalLink, FileText, History, Upload } from 'lucide-react';
import { useMemo, useState } from 'react';
import { AdminPage } from '@/components/admin-ui';
import { QueryError } from '@/components/admin/common';
import { CONSENT_KIND_LABELS } from '@/components/admin/labels';
import { formatDateTime } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';

type Doc = RouterOutputs['admin']['legalDocuments'][number];
type Kind = (typeof consentKinds)[number];
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

export default function LegalPage() {
  const q = trpc.admin.legalDocuments.useQuery();
  const [publishing, setPublishing] = useState<{ kind: Kind; base: Doc | null } | null>(null);
  const [viewing, setViewing] = useState<Doc | null>(null);
  const groups = useMemo(
    () => consentKinds.map((k) => ({ kind: k, docs: (q.data ?? []).filter((d) => d.kind === k).sort((a, b) => b.version - a.version) })),
    [q.data],
  );

  return (
    <AdminPage title="Sözleşmeler / KVKK" description="Kullanıcı ve işletme sözleşmeleri, KVKK metinleri ve sürüm geçmişi">
      <Notice tone="warning" icon={<AlertTriangle />} title="Hukuki inceleme gerekli" className="mb-5">
        Bu metinler taslaktır ve yayına almadan önce bir avukat tarafından incelenmelidir. [ŞİRKET UNVANI], [ADRES], [MERSİS NO], [KEP ADRESİ] gibi köşeli parantezli
        yer tutucuların tamamı gerçek bilgilerle doldurulmalıdır. Yeni sürüm yayınlandığında önceki sürüm arşivde kalır.
      </Notice>
      {q.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-56" />
          ))}
        </div>
      ) : q.error ? (
        <QueryError error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {groups.map(({ kind, docs }) => {
            const current = docs.find((d) => d.isCurrent) ?? docs[0] ?? null;
            const placeholders = current ? [...new Set(current.body.match(/\[[A-ZÇĞİÖŞÜ0-9 ./-]{3,}\]/g) ?? [])] : [];
            return (
              <Card key={kind} className="flex flex-col p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-lg font-semibold">{CONSENT_KIND_LABELS[kind] ?? kind}</h2>
                    {current ? (
                      <div className="mt-0.5 text-xs text-muted">
                        Güncel: <span className="font-semibold text-fg">v{current.version}</span> · {formatDateTime(current.publishedAt)}
                      </div>
                    ) : (
                      <div className="mt-0.5 text-xs text-danger">Yayınlanmış sürüm yok</div>
                    )}
                  </div>
                  <a href={`${APP_URL}/yasal/${kind}`} target="_blank" rel="noopener noreferrer" className="text-muted hover:text-fg" aria-label="Uygulamada aç">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
                {current ? (
                  <>
                    <div className="mt-3 text-sm font-semibold">{current.title}</div>
                    <p className="mt-1 line-clamp-4 whitespace-pre-line text-sm text-muted">{current.body}</p>
                    {placeholders.length ? (
                      <div className="mt-3 flex flex-wrap items-center gap-1">
                        <span className="text-xs text-warning">Doldurulmamış yer tutucu:</span>
                        {placeholders.slice(0, 6).map((p) => (
                          <Badge key={p} tone="warning" className="font-mono">
                            {p}
                          </Badge>
                        ))}
                        {placeholders.length > 6 ? <span className="text-xs text-warning">+{placeholders.length - 6}</span> : null}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <EmptyState className="mt-3 py-6" title="Metin yok" description="İlk sürümü yayınlayın." />
                )}
                <div className="mt-auto pt-4">
                  {docs.length > 1 ? (
                    <details className="mb-3 text-sm">
                      <summary className="flex cursor-pointer items-center gap-1.5 text-muted hover:text-fg">
                        <History className="h-4 w-4" /> Sürüm geçmişi ({docs.length})
                      </summary>
                      <ul className="mt-2 space-y-1">
                        {docs.map((d) => (
                          <li key={d.id}>
                            <button type="button" onClick={() => setViewing(d)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-2">
                              <span className="w-8 font-semibold">v{d.version}</span>
                              <span className="flex-1 truncate text-muted">{d.title}</span>
                              <span className="text-xs text-subtle">{formatDateTime(d.publishedAt)}</span>
                              {d.isCurrent ? <Badge tone="success">Güncel</Badge> : null}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    {current ? (
                      <Button size="sm" variant="secondary" onClick={() => setViewing(current)}>
                        Metni görüntüle
                      </Button>
                    ) : null}
                    <Button size="sm" onClick={() => setPublishing({ kind, base: current })}>
                      <Upload className="h-4 w-4" /> Yeni sürüm yayınla
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        {viewing ? (
          <DialogContent title={viewing.title} description={`${CONSENT_KIND_LABELS[viewing.kind] ?? viewing.kind} · v${viewing.version} · ${formatDateTime(viewing.publishedAt)}`} className="sm:max-w-3xl">
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-fg/90">{viewing.body}</div>
          </DialogContent>
        ) : null}
      </Dialog>
      <Dialog open={!!publishing} onOpenChange={(o) => !o && setPublishing(null)}>
        {publishing ? (
          <DialogContent
            title={`Yeni sürüm · ${CONSENT_KIND_LABELS[publishing.kind] ?? publishing.kind}`}
            description={publishing.base ? `Mevcut v${publishing.base.version} metni ile dolduruldu. Yayınlanınca v${publishing.base.version + 1} güncel olur.` : 'İlk sürüm yayınlanacak.'}
            className="sm:max-w-4xl"
          >
            <PublishForm key={publishing.kind} kind={publishing.kind} base={publishing.base} onClose={() => setPublishing(null)} />
          </DialogContent>
        ) : null}
      </Dialog>
    </AdminPage>
  );
}

function PublishForm({ kind, base, onClose }: { kind: Kind; base: Doc | null; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [title, setTitle] = useState(base?.title ?? CONSENT_KIND_LABELS[kind] ?? '');
  const [body, setBody] = useState(base?.body ?? '');
  const [touched, setTouched] = useState(false);
  const m = trpc.admin.publishLegal.useMutation({
    onSuccess: async (r) => {
      toast.success(`v${r.version} yayınlandı.`);
      await utils.admin.legalDocuments.invalidate();
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const errors = {
    title: title.trim().length < 3 ? 'Başlık en az 3 karakter olmalı.' : null,
    body: body.trim().length < 20 ? 'Metin en az 20 karakter olmalı.' : body.length > 50000 ? 'Metin en fazla 50.000 karakter olabilir.' : null,
  };
  const unchanged = !!base && base.title === title.trim() && base.body === body.trim();
  const placeholders = [...new Set(body.match(/\[[A-ZÇĞİÖŞÜ0-9 ./-]{3,}\]/g) ?? [])];
  return (
    <>
      <div className="space-y-4">
        <Field label="Başlık" required error={touched ? errors.title : null}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />
        </Field>
        <Field label="Metin" required error={touched ? errors.body : null} hint={`${body.length.toLocaleString('tr-TR')} / 50.000`}>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={18} className="font-mono text-[13px] leading-relaxed" />
        </Field>
        {placeholders.length ? (
          <Notice tone="warning" icon={<AlertTriangle />}>
            Metinde doldurulmamış yer tutucu var: {placeholders.join(', ')}
          </Notice>
        ) : null}
      </div>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Vazgeç
        </Button>
        <Button
          loading={m.isPending}
          disabled={unchanged}
          title={unchanged ? 'Metinde değişiklik yok' : undefined}
          onClick={() => {
            setTouched(true);
            if (errors.title || errors.body) return;
            m.mutate({ kind, title: title.trim(), body: body.trim() });
          }}
        >
          Yeni sürümü yayınla
        </Button>
      </DialogFooter>
    </>
  );
}
