'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { MEDIA_LIMITS } from '@bilardogo/domain';
import { Button, Dialog, DialogContent, DialogFooter, Field, Input, Segmented, SwitchRow, Textarea, toast } from '@bilardogo/ui';
import { ImagePlus, X } from 'lucide-react';
import { useRef, useState } from 'react';
import { fromLocalInputValue, toLocalInputValue } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';
import { compressImage, uploadFile } from '@/lib/upload';

export type VenuePost = RouterOutputs['business']['posts'][number];
type Kind = 'announcement' | 'campaign';

export const POST_KIND_LABELS: Record<Kind, string> = { announcement: 'Duyuru', campaign: 'Kampanya' };

export function PostDialog({
  open,
  onOpenChange,
  venueId,
  post,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  venueId: string;
  post?: VenuePost | null;
}) {
  const utils = trpc.useUtils();
  const [kind, setKind] = useState<Kind>(post?.kind ?? 'campaign');
  const [title, setTitle] = useState(post?.title ?? '');
  const [body, setBody] = useState(post?.body ?? '');
  const [validFrom, setValidFrom] = useState(post?.validFrom ? toLocalInputValue(new Date(post.validFrom)) : '');
  const [validTo, setValidTo] = useState(post?.validTo ? toLocalInputValue(new Date(post.validTo)) : '');
  const [image, setImage] = useState<{ path: string; preview: string } | null>(
    post?.imagePath && post.imageUrl ? { path: post.imagePath, preview: post.imageUrl } : null,
  );
  const [notify, setNotify] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<{ title?: string; body?: string; validTo?: string }>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const requestUpload = trpc.business.postImageUpload.useMutation();

  const done = (msg: string) => {
    toast.success(msg);
    onOpenChange(false);
    void utils.business.posts.invalidate({ venueId });
  };
  const create = trpc.business.createPost.useMutation({
    onSuccess: () => done(notify ? 'Yayınlandı ve takipçilere bildirim gönderildi.' : 'Yayınlandı.'),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const update = trpc.business.updatePost.useMutation({ onSuccess: () => done('Güncellendi.'), onError: (e) => toast.error(errorMessage(e)) });
  const pending = create.isPending || update.isPending;

  const onFile = async (raw: File | undefined) => {
    if (!raw) return;
    if (!(MEDIA_LIMITS.imageTypes as readonly string[]).includes(raw.type)) {
      toast.error('Yalnız JPG, PNG, WEBP veya HEIC görsel ekleyebilirsin.');
      return;
    }
    setUploading(true);
    try {
      const file = await compressImage(raw);
      const signed = await uploadFile('public-media', file, (info) => requestUpload.mutateAsync({ ...info, venueId }));
      setImage({ path: signed.path, preview: URL.createObjectURL(file) });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const save = () => {
    const e: typeof errors = {};
    if (title.trim().length < 3) e.title = 'Başlık en az 3 karakter olmalı.';
    else if (title.trim().length > 100) e.title = 'Başlık en fazla 100 karakter olabilir.';
    if (body.trim().length < 3) e.body = 'Açıklama en az 3 karakter olmalı.';
    else if (body.trim().length > 2000) e.body = 'Açıklama en fazla 2000 karakter olabilir.';
    if (validFrom && validTo && validTo <= validFrom) e.validTo = 'Bitiş, başlangıçtan sonra olmalı.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const data = {
      kind,
      title: title.trim(),
      body: body.trim(),
      imagePath: image?.path ?? null,
      validFrom: validFrom ? fromLocalInputValue(validFrom) : null,
      validTo: validTo ? fromLocalInputValue(validTo) : null,
    };
    if (post) update.mutate({ postId: post.id, data });
    else create.mutate({ venueId, data, notifyFollowers: notify });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={post ? 'Duyuruyu düzenle' : 'Yeni duyuru / kampanya'} description="Salon sayfanda ve takipçilerinin akışında görünür.">
        <div className="space-y-4">
          <Segmented
            value={kind}
            onChange={setKind}
            options={[
              { value: 'campaign', label: 'Kampanya' },
              { value: 'announcement', label: 'Duyuru' },
            ]}
          />
          <Field label="Başlık" required error={errors.title}>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder={kind === 'campaign' ? '17.00–19.00 arasında masalarda %10 indirim' : 'Çuhalarımız yenilenmiştir'}
            />
          </Field>
          <Field label="Açıklama" required error={errors.body} hint={`${body.length}/2000`}>
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={2000}
              placeholder={kind === 'campaign' ? 'Hafta içi her gün 17.00–19.00 arasında tüm masalarda %10 indirim.' : 'Tüm 3 bant masalarımızın çuhaları yenilendi. Herkesi bekleriz!'}
            />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Başlangıç" hint="İsteğe bağlı">
              <Input type="datetime-local" value={validFrom} onChange={(e) => setValidFrom(e.target.value)} />
            </Field>
            <Field label="Bitiş" error={errors.validTo} hint="İsteğe bağlı">
              <Input type="datetime-local" value={validTo} onChange={(e) => setValidTo(e.target.value)} />
            </Field>
          </div>
          <Field label="Görsel" hint="İsteğe bağlı">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => void onFile(e.target.files?.[0])} />
            {image ? (
              <div className="relative overflow-hidden rounded-2xl border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.preview} alt="" className="max-h-48 w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setImage(null)}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white"
                  aria-label="Görseli kaldır"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} loading={uploading}>
                <ImagePlus className="h-4 w-4" />
                Görsel ekle
              </Button>
            )}
          </Field>
          {!post ? (
            <div className="rounded-2xl border border-border px-3">
              <SwitchRow label="Takipçilere bildirim gönder" description="Salonu takip eden oyunculara bildirim gider." checked={notify} onCheckedChange={setNotify} />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Vazgeç
          </Button>
          <Button onClick={save} loading={pending} disabled={uploading}>
            {post ? 'Kaydet' : 'Yayınla'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
