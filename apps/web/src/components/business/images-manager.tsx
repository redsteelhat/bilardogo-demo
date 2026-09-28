'use client';
import { MEDIA_LIMITS } from '@bilardogo/domain';
import { Button, Card, CardBody, CardHeader, Menu, MenuContent, MenuItem, MenuTrigger, toast } from '@bilardogo/ui';
import { ImagePlus, Images, MoreVertical, Star, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { errorMessage, trpc } from '@/lib/trpc/client';
import { compressImage, uploadFile } from '@/lib/upload';
import { ConfirmDialog } from './ui';

type Img = { id: string; path: string; url: string };

export function ImagesManager({ venueId, images, coverPath }: { venueId: string; images: Img[]; coverPath: string | null }) {
  const utils = trpc.useUtils();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Img | null>(null);
  const refresh = () => void utils.business.venue.invalidate({ venueId });
  const requestUpload = trpc.business.imageUpload.useMutation();
  const add = trpc.business.addImage.useMutation();
  const setCover = trpc.business.setCover.useMutation({
    onSuccess: () => {
      toast.success('Kapak fotoğrafı güncellendi.');
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = trpc.business.removeImage.useMutation({
    onSuccess: () => {
      toast.success('Fotoğraf silindi.');
      setRemoving(null);
      refresh();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const effectiveCover = coverPath ?? images[0]?.path ?? null;

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, Math.max(0, 20 - images.length));
    if (!list.length) {
      toast.error('En fazla 20 görsel eklenebilir.');
      return;
    }
    let ok = 0;
    for (const [i, raw] of list.entries()) {
      if (!(MEDIA_LIMITS.imageTypes as readonly string[]).includes(raw.type)) {
        toast.error(`${raw.name}: yalnız JPG, PNG, WEBP veya HEIC yükleyebilirsin.`);
        continue;
      }
      setUploading(`${i + 1}/${list.length}`);
      try {
        const file = await compressImage(raw);
        if (file.size > MEDIA_LIMITS.imageBytes) throw new Error('Görsel en fazla 10 MB olabilir.');
        const signed = await uploadFile('public-media', file, (info) => requestUpload.mutateAsync({ ...info, venueId }));
        await add.mutateAsync({ venueId, path: signed.path });
        ok++;
      } catch (e) {
        toast.error(errorMessage(e));
      }
    }
    setUploading(null);
    if (fileRef.current) fileRef.current.value = '';
    if (ok) toast.success(`${ok} fotoğraf eklendi.`);
    refresh();
  };

  return (
    <Card>
      <CardHeader
        icon={<Images className="h-5 w-5" />}
        title="Fotoğraflar"
        description={`Salon sayfanda gösterilir (${images.length}/20). Kapak fotoğrafı listelerde öne çıkar.`}
        action={
          <Button size="sm" variant="soft" onClick={() => fileRef.current?.click()} loading={!!uploading} disabled={images.length >= 20}>
            {!uploading ? <ImagePlus className="h-4 w-4" /> : null}
            {uploading ? `Yükleniyor ${uploading}` : 'Ekle'}
          </Button>
        }
      />
      <CardBody>
        <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => void onFiles(e.target.files)} />
        {images.length ? (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {images.map((img) => {
              const isCover = img.path === effectiveCover;
              return (
                <li key={img.id} className="group relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-surface-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                  {isCover ? (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold text-brand-fg">
                      <Star className="h-3 w-3" /> Kapak
                    </span>
                  ) : null}
                  <Menu>
                    <MenuTrigger
                      className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white"
                      aria-label="Fotoğraf işlemleri"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </MenuTrigger>
                    <MenuContent>
                      {!isCover ? (
                        <MenuItem icon={<Star />} onSelect={() => setCover.mutate({ imageId: img.id })}>
                          Kapak yap
                        </MenuItem>
                      ) : null}
                      <MenuItem icon={<Trash2 />} danger onSelect={() => setRemoving(img)}>
                        Sil
                      </MenuItem>
                    </MenuContent>
                  </Menu>
                </li>
              );
            })}
          </ul>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-border py-8 text-sm text-muted hover:border-brand/40"
          >
            <ImagePlus className="mb-2 h-7 w-7 text-subtle" />
            Salonunun fotoğraflarını ekle
          </button>
        )}
      </CardBody>
      <ConfirmDialog
        open={!!removing}
        onOpenChange={(v) => !v && setRemoving(null)}
        title="Fotoğraf silinsin mi?"
        description="Fotoğraf salon sayfandan kaldırılır."
        confirmLabel="Sil"
        tone="danger"
        loading={remove.isPending}
        onConfirm={() => removing && remove.mutate({ imageId: removing.id })}
      />
    </Card>
  );
}
