'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { BULLETIN_KIND_LABELS, BULLETIN_KINDS, BULLETIN_STATUS_LABELS } from '@bilardogo/domain';
import { Button, Dialog, DialogContent, DialogFooter, Field, Input, Notice, Segmented, Select, SwitchRow, Textarea, toast } from '@bilardogo/ui';
import { useState } from 'react';
import { fromLocalInputValue, toLocalInputValue } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';
import { CityMultiSelect } from './common';
import { MediaField, type MediaValue } from './media-field';

export type Bulletin = RouterOutputs['admin']['bulletins'][number];
type Kind = (typeof BULLETIN_KINDS)[number];
type Status = 'draft' | 'scheduled' | 'published' | 'archived';

function isUrl(v: string) {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
}

/** Bülten / duyuru oluşturma ve düzenleme penceresi. */
export function BulletinEditor({ bulletin, open, onClose }: { bulletin: Bulletin | null; open: boolean; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      {open ? (
        <DialogContent title={bulletin ? 'İçeriği düzenle' : 'Yeni bülten içeriği'} description="Yalnız admin bülten ve duyuru yayınlayabilir." className="sm:max-w-3xl">
          <EditorForm key={bulletin?.id ?? 'new'} bulletin={bulletin} onClose={onClose} />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}

function EditorForm({ bulletin, onClose }: { bulletin: Bulletin | null; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [kind, setKind] = useState<Kind>(bulletin?.kind ?? 'news');
  const [title, setTitle] = useState(bulletin?.title ?? '');
  const [body, setBody] = useState(bulletin?.body ?? '');
  const [media, setMedia] = useState<MediaValue>({ path: bulletin?.mediaPath ?? null, type: bulletin?.mediaType ?? null, url: bulletin?.mediaUrl ?? null });
  const [videoUrl, setVideoUrl] = useState(bulletin?.videoUrl ?? '');
  const [status, setStatus] = useState<Status>(bulletin?.status ?? 'draft');
  const [publishAt, setPublishAt] = useState(bulletin?.publishAt ? toLocalInputValue(new Date(bulletin.publishAt)) : '');
  const [cities, setCities] = useState<number[]>(bulletin?.cityPlates ?? []);
  const [notify, setNotify] = useState(bulletin?.notify ?? false);
  const [touched, setTouched] = useState(false);
  const upload = trpc.admin.bulletinMediaUpload.useMutation();
  const save = trpc.admin.saveBulletin.useMutation({
    onSuccess: async () => {
      toast.success(status === 'published' ? 'İçerik yayında.' : 'İçerik kaydedildi.');
      await utils.admin.bulletins.invalidate();
      onClose();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const errors = {
    title: title.trim().length < 3 ? 'Başlık en az 3 karakter olmalı.' : title.length > 160 ? 'Başlık en fazla 160 karakter olabilir.' : null,
    videoUrl: videoUrl.trim() && !isUrl(videoUrl.trim()) ? 'Geçerli bir bağlantı girin (https://…).' : null,
    publishAt: status === 'scheduled' && !publishAt ? 'Planlanan içerik için yayın tarihi seçin.' : null,
    body: body.length > 10000 ? 'Metin en fazla 10.000 karakter olabilir.' : null,
  };
  const invalid = Object.values(errors).some(Boolean);
  const alreadyNotified = !!bulletin?.notifiedAt;

  function submit() {
    setTouched(true);
    if (invalid) return;
    save.mutate({
      id: bulletin?.id,
      kind,
      title: title.trim(),
      body: body.trim(),
      mediaPath: media.path,
      mediaType: media.path ? media.type : null,
      videoUrl: videoUrl.trim() || null,
      status,
      publishAt: publishAt ? fromLocalInputValue(publishAt) : null,
      cityPlates: cities,
      notify,
    });
  }

  return (
    <>
      <div className="space-y-4">
        <Field label="Tür" required>
          <Segmented wrap size="sm" value={kind} onChange={setKind} options={BULLETIN_KINDS.map((k) => ({ value: k, label: BULLETIN_KIND_LABELS[k] }))} />
        </Field>
        <Field label="Başlık" required error={touched ? errors.title : null}>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="Ör. İstanbul 3 Bant Ligi başlıyor" />
        </Field>
        <Field label="Metin" error={touched ? errors.body : null} hint={`${body.length} / 10.000`}>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={7} placeholder="İçeriğin ayrıntıları…" />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Fotoğraf / video">
            <MediaField value={media} onChange={setMedia} request={(info) => upload.mutateAsync(info)} />
          </Field>
          <Field label="YouTube / Instagram bağlantısı" error={touched ? errors.videoUrl : null} hint="Video bağlantısı bülten kartında oynatıcı olarak gösterilir.">
            <Input value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" inputMode="url" />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Durum" required>
            <Select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              {(['draft', 'scheduled', 'published', 'archived'] as const).map((s) => (
                <option key={s} value={s}>
                  {BULLETIN_STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          {status === 'scheduled' ? (
            <Field label="Yayın tarihi" required error={touched ? errors.publishAt : null} hint="Bu saatte otomatik yayına girer (Türkiye saati).">
              <Input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} min={toLocalInputValue(new Date())} />
            </Field>
          ) : null}
        </div>
        <Field label="Hedef iller" hint="Boş bırakılırsa Türkiye geneli yayınlanır.">
          <CityMultiSelect value={cities} onChange={setCities} />
        </Field>
        <div className="rounded-xl border border-border bg-surface-2 px-4">
          <SwitchRow
            label="Yayınlanınca bildirim gönder"
            description={
              alreadyNotified
                ? 'Bu içerik için bildirim zaten gönderildi; tekrar gönderilmez.'
                : cities.length
                  ? 'Seçili illerdeki aktif kullanıcılara “Bülten” bildirimi gider.'
                  : 'Tüm aktif kullanıcılara “Bülten” bildirimi gider.'
            }
            checked={notify}
            onCheckedChange={setNotify}
          />
        </div>
        {status === 'published' && notify && !alreadyNotified ? (
          <Notice tone="warning">Kaydettiğinizde içerik hemen yayına girer ve bildirim gönderimi başlar.</Notice>
        ) : null}
      </div>
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Vazgeç
        </Button>
        <Button loading={save.isPending} disabled={upload.isPending} onClick={submit}>
          {status === 'published' ? 'Kaydet ve yayınla' : 'Kaydet'}
        </Button>
      </DialogFooter>
    </>
  );
}
