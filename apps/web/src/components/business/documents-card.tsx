'use client';
import { MEDIA_LIMITS } from '@bilardogo/domain';
import { Button, Card, CardBody, CardHeader, EmptyState, Field, Select, toast } from '@bilardogo/ui';
import { ExternalLink, FileText, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { formatDate } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';
import { uploadFile } from '@/lib/upload';
import type { MyBusiness } from './context';
import { ConfirmDialog, DOC_KIND_LABELS, DOC_KINDS, type DocKind } from './ui';

export function DocumentsCard({ business }: { business: MyBusiness }) {
  const utils = trpc.useUtils();
  const [kind, setKind] = useState<DocKind>('tax_certificate');
  const [uploading, setUploading] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const requestUpload = trpc.business.documentUpload.useMutation();
  const add = trpc.business.addDocument.useMutation();
  const remove = trpc.business.removeDocument.useMutation({
    onSuccess: () => {
      toast.success('Belge silindi.');
      setRemoveId(null);
      void utils.business.mine.invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const locked = business.status === 'approved';
  const docs = business.documents;
  const uploadedKinds = new Set(docs.map((d) => d.kind));

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!(MEDIA_LIMITS.documentTypes as readonly string[]).includes(file.type)) {
      toast.error('Belge PDF, JPG veya PNG olmalı.');
      return;
    }
    if (file.size > MEDIA_LIMITS.documentBytes) {
      toast.error('Belge en fazla 15 MB olabilir.');
      return;
    }
    setUploading(true);
    try {
      const signed = await uploadFile('business-docs', file, (info) => requestUpload.mutateAsync({ ...info, businessId: business.id }));
      await add.mutateAsync({ businessId: business.id, kind, path: signed.path, fileName: file.name, mimeType: file.type, size: file.size });
      toast.success(`${DOC_KIND_LABELS[kind]} yüklendi.`);
      void utils.business.mine.invalidate();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <Card>
      <CardHeader
        icon={<FileText className="h-5 w-5" />}
        title="Belgeler"
        description="Vergi levhası, imza sirküleri, ticaret sicil gazetesi ve kimlik fotokopisi. PDF, JPG veya PNG (en fazla 15 MB)."
      />
      <CardBody className="space-y-4">
        {docs.length ? (
          <ul className="divide-y divide-border rounded-2xl border border-border">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center gap-3 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-surface-3 text-muted">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{DOC_KIND_LABELS[d.kind as DocKind] ?? d.kind}</div>
                  <div className="truncate text-xs text-muted">
                    {d.fileName} · {formatDate(d.createdAt)}
                  </div>
                </div>
                {d.url ? (
                  <a href={d.url} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-fg" aria-label="Belgeyi aç">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                ) : null}
                {!locked ? (
                  <button type="button" onClick={() => setRemoveId(d.id)} className="rounded-lg p-2 text-muted hover:bg-danger-soft hover:text-danger" aria-label="Belgeyi sil">
                    <Trash2 className="h-4 w-4" />
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            icon={<FileText />}
            title="Henüz belge yüklenmedi"
            description={locked ? 'Belge güncellemek için destek ekibiyle iletişime geç.' : 'Başvurunun incelenebilmesi için belgelerini yükle.'}
            className="py-6"
          />
        )}

        {!locked ? (
          <div className="space-y-2 rounded-2xl border border-border bg-surface-2/50 p-3">
            <Field label="Belge türü">
              <Select value={kind} onChange={(e) => setKind(e.target.value as DocKind)}>
                {DOC_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {DOC_KIND_LABELS[k]}
                    {uploadedKinds.has(k) ? ' (yüklendi)' : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <input ref={fileRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
            <Button block variant="soft" loading={uploading} onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" />
              Dosya seç ve yükle
            </Button>
          </div>
        ) : null}
      </CardBody>
      <ConfirmDialog
        open={!!removeId}
        onOpenChange={(v) => !v && setRemoveId(null)}
        title="Belge silinsin mi?"
        description="Bu belge başvurundan kaldırılır."
        confirmLabel="Sil"
        tone="danger"
        loading={remove.isPending}
        onConfirm={() => removeId && remove.mutate({ documentId: removeId })}
      />
    </Card>
  );
}
