'use client';
import { MEDIA_LIMITS } from '@bilardogo/domain';
import { Button, cn, toast } from '@bilardogo/ui';
import { ImagePlus, Trash2, Video } from 'lucide-react';
import { useRef, useState } from 'react';
import { errorMessage } from '@/lib/trpc/client';
import { compressImage, uploadFile } from '@/lib/upload';

type Signed = { path: string; token: string; mediaType?: 'image' | 'video' | null };
export type MediaValue = { path: string | null; type: 'image' | 'video' | null; url: string | null };

/**
 * Görsel / video yükleme alanı. Dosya imzalı bağlantıyla doğrudan 'public-media' kovasına yüklenir;
 * dönen yol kayıt sırasında ilgili mutasyona iletilir.
 */
export function MediaField({
  value,
  onChange,
  request,
  allowVideo = true,
  label = 'Görsel / video yükle',
  className,
  compact,
}: {
  value: MediaValue;
  onChange: (v: MediaValue) => void;
  request: (info: { fileName: string; contentType: string; size: number }) => Promise<Signed>;
  allowVideo?: boolean;
  label?: string;
  className?: string;
  compact?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const accept = [...MEDIA_LIMITS.imageTypes, ...(allowVideo ? MEDIA_LIMITS.videoTypes : [])].join(',');

  async function onFile(file: File) {
    const isVideo = file.type.startsWith('video/');
    if (isVideo && !allowVideo) return toast.error('Bu alana yalnız görsel yüklenebilir.');
    if (isVideo && file.size > MEDIA_LIMITS.videoBytes) return toast.error('Video en fazla 50 MB olabilir.');
    setBusy(true);
    try {
      const f = isVideo ? file : await compressImage(file);
      if (!isVideo && f.size > MEDIA_LIMITS.imageBytes) throw new Error('Görsel en fazla 10 MB olabilir.');
      const signed = await uploadFile('public-media', f, request);
      onChange({ path: signed.path, type: signed.mediaType ?? (isVideo ? 'video' : 'image'), url: URL.createObjectURL(f) });
      toast.success('Dosya yüklendi. Kaydetmeyi unutmayın.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  return (
    <div className={cn('space-y-2', className)}>
      {value.url ? (
        <div className={cn('relative overflow-hidden rounded-xl border border-border bg-surface-2', compact ? 'h-24 w-24' : 'aspect-video w-full max-w-md')}>
          {value.type === 'video' ? (
            <video src={value.url} controls className="h-full w-full object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.url} alt="" className={cn('h-full w-full', compact ? 'object-contain p-1' : 'object-cover')} />
          )}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" loading={busy} onClick={() => input.current?.click()}>
          {allowVideo ? <Video className="h-4 w-4" /> : <ImagePlus className="h-4 w-4" />}
          {value.path ? 'Değiştir' : label}
        </Button>
        {value.path ? (
          <Button size="sm" variant="ghost" onClick={() => onChange({ path: null, type: null, url: null })}>
            <Trash2 className="h-4 w-4" /> Kaldır
          </Button>
        ) : null}
      </div>
      <input
        ref={input}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onFile(f);
        }}
      />
      <p className="text-xs text-subtle">
        {allowVideo ? 'JPG, PNG, WEBP (en fazla 10 MB) veya MP4, MOV, WEBM (en fazla 50 MB).' : 'JPG, PNG veya WEBP, en fazla 10 MB.'}
      </p>
    </div>
  );
}
