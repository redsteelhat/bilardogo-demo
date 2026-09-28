'use client';
import { MEDIA_LIMITS } from '@bilardogo/domain';
import { Avatar, Button, toast } from '@bilardogo/ui';
import { Camera, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { compressImage, uploadFile } from '@/lib/upload';
import { errorMessage, trpc } from '@/lib/trpc/client';

/** Profil fotoğrafı yükleme / kaldırma. */
export function AvatarEditor({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const utils = trpc.useUtils();
  const requestUpload = trpc.me.avatarUpload.useMutation();
  const setAvatar = trpc.me.setAvatar.useMutation();

  const refresh = () => Promise.all([utils.me.session.invalidate(), utils.players.profile.invalidate()]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!(MEDIA_LIMITS.imageTypes as readonly string[]).includes(file.type)) {
      toast.error('Yalnız JPG, PNG, WEBP veya HEIC fotoğraf yükleyebilirsin.');
      return;
    }
    setBusy(true);
    const local = URL.createObjectURL(file);
    setPreview(local);
    try {
      const compressed = await compressImage(file, 800, 0.85);
      if (compressed.size > MEDIA_LIMITS.imageBytes) throw new Error('Fotoğraf en fazla 10 MB olabilir.');
      const signed = await uploadFile('public-media', compressed, (info) => requestUpload.mutateAsync(info));
      await setAvatar.mutateAsync({ path: signed.path });
      await refresh();
      toast.success('Profil fotoğrafın güncellendi');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
      setPreview(null);
      URL.revokeObjectURL(local);
      if (input.current) input.current.value = '';
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await setAvatar.mutateAsync({ path: null });
      await refresh();
      toast('Profil fotoğrafı kaldırıldı');
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4 rounded-[var(--radius-card)] border border-border bg-surface p-4">
      <div className="relative">
        <Avatar name={name || 'Oyuncu'} src={preview ?? avatarUrl} size="xl" />
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border-4 border-surface bg-brand text-brand-fg disabled:opacity-60"
          aria-label="Fotoğraf seç"
        >
          <Camera className="h-4 w-4" />
        </button>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        <div className="text-sm font-semibold">Profil fotoğrafı</div>
        <p className="text-xs text-muted">JPG, PNG, WEBP veya HEIC · en fazla 10 MB</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="soft" loading={busy} onClick={() => input.current?.click()}>
            <Camera className="h-4 w-4" /> {avatarUrl ? 'Değiştir' : 'Fotoğraf yükle'}
          </Button>
          {avatarUrl ? (
            <Button size="sm" variant="ghost" disabled={busy} onClick={remove}>
              <Trash2 className="h-4 w-4" /> Kaldır
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={input}
        type="file"
        accept={MEDIA_LIMITS.imageTypes.join(',')}
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
    </div>
  );
}
