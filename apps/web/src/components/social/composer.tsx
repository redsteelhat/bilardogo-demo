'use client';
import { MEDIA_LIMITS } from '@bilardogo/domain';
import { cn, Switch, toast } from '@bilardogo/ui';
import { ArrowUp, Film, ImageIcon, Loader2, Reply, Store, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { compressImage, uploadFile } from '@/lib/upload';
import { errorMessage, trpc } from '@/lib/trpc/client';
import type { ChatMessage } from './message-bubble';

type Pending = { file: File; kind: 'image' | 'video'; url: string };

/** Dosyayı istemci tarafında doğrular; hata varsa Türkçe mesaj döndürür. */
export function validateMedia(file: File, kind: 'image' | 'video'): string | null {
  if (kind === 'image') {
    if (!(MEDIA_LIMITS.imageTypes as readonly string[]).includes(file.type)) return 'Yalnız JPG, PNG, WEBP veya HEIC fotoğraf gönderebilirsin.';
    if (file.size > MEDIA_LIMITS.imageBytes) return 'Fotoğraf en fazla 10 MB olabilir.';
  } else {
    if (!(MEDIA_LIMITS.videoTypes as readonly string[]).includes(file.type)) return 'Yalnız MP4, MOV veya WEBM video gönderebilirsin.';
    if (file.size > MEDIA_LIMITS.videoBytes) return 'Video en fazla 50 MB olabilir.';
  }
  return null;
}

export function Composer({
  conversationId,
  replyTo,
  onCancelReply,
  onSent,
  canPostAsVenue,
  venueName,
}: {
  conversationId: string;
  replyTo: ChatMessage | null;
  onCancelReply: () => void;
  onSent: () => void;
  canPostAsVenue: boolean;
  venueName?: string;
}) {
  const [text, setText] = useState('');
  const [pending, setPending] = useState<Pending | null>(null);
  const [asVenue, setAsVenue] = useState(false);
  const [uploading, setUploading] = useState(false);
  const imageInput = useRef<HTMLInputElement>(null);
  const videoInput = useRef<HTMLInputElement>(null);
  const area = useRef<HTMLTextAreaElement>(null);
  const requestUpload = trpc.social.mediaUpload.useMutation();
  const send = trpc.social.send.useMutation();

  useEffect(() => {
    if (replyTo) area.current?.focus();
  }, [replyTo]);
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);
  useEffect(() => () => void (pending && URL.revokeObjectURL(pending.url)), [pending]);

  const pick = (kind: 'image' | 'video', file: File | undefined) => {
    if (!file) return;
    const err = validateMedia(file, kind);
    if (err) {
      toast.error(err);
      return;
    }
    setPending({ file, kind, url: URL.createObjectURL(file) });
  };

  const busy = uploading || send.isPending;
  const body = text.trim();
  const canSend = !busy && (body.length > 0 || !!pending) && body.length <= 2000;

  const submit = async () => {
    if (!canSend) return;
    try {
      let media: { path: string; mediaType: 'image' | 'video' } | null = null;
      if (pending) {
        setUploading(true);
        const file = pending.kind === 'image' ? await compressImage(pending.file) : pending.file;
        const err = validateMedia(file, pending.kind);
        if (err) throw new Error(err);
        const signed = await uploadFile('chat-media', file, (info) => requestUpload.mutateAsync({ ...info, conversationId }));
        media = { path: signed.path, mediaType: signed.mediaType };
      }
      await send.mutateAsync({
        conversationId,
        body,
        mediaPath: media?.path ?? null,
        mediaType: media?.mediaType ?? null,
        replyToId: replyTo?.id ?? null,
        asVenue: canPostAsVenue && asVenue ? true : undefined,
      });
      setText('');
      setPending(null);
      onCancelReply();
      onSent();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="border-t border-border bg-bg/95 backdrop-blur-lg">
      <div className="mx-auto max-w-2xl space-y-2 px-3 py-2.5">
        {replyTo ? (
          <div className="flex items-center gap-2 rounded-xl border-l-2 border-brand bg-surface-2 px-3 py-1.5 text-xs">
            <Reply className="h-3.5 w-3.5 shrink-0 text-brand" />
            <div className="min-w-0 flex-1">
              <span className="font-semibold">{replyTo.isMine ? 'Kendine' : (replyTo.asVenue?.name ?? replyTo.sender?.displayName ?? 'Oyuncu')}</span>
              <span className="ml-1 text-muted">yanıt veriyorsun</span>
              <div className="truncate text-muted">{replyTo.body || (replyTo.mediaType === 'video' ? '🎬 Video' : '📷 Fotoğraf')}</div>
            </div>
            <button type="button" onClick={onCancelReply} className="rounded-full p-1 text-muted hover:text-fg" aria-label="Yanıtı iptal et">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        {pending ? (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 p-2">
            {pending.kind === 'image' ? (
               
              <img src={pending.url} alt="" className="h-14 w-14 rounded-lg object-cover" />
            ) : (
              <video src={pending.url} className="h-14 w-14 rounded-lg bg-black object-cover" muted />
            )}
            <div className="min-w-0 flex-1 text-xs">
              <div className="truncate font-semibold">{pending.file.name}</div>
              <div className="text-muted">
                {pending.kind === 'image' ? 'Fotoğraf' : 'Video'} · {(pending.file.size / 1024 / 1024).toFixed(1)} MB
              </div>
            </div>
            <button type="button" onClick={() => setPending(null)} disabled={busy} className="rounded-full p-1 text-muted hover:text-fg" aria-label="Eki kaldır">
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : null}
        {canPostAsVenue ? (
          <label className="flex items-center gap-2 px-1 text-xs text-muted">
            <Switch checked={asVenue} onCheckedChange={setAsVenue} aria-label="Salon adına yaz" />
            <Store className="h-3.5 w-3.5 text-brand" />
            Salon adına yaz{venueName ? ` (${venueName})` : ''}
          </label>
        ) : null}
        <div className="flex items-end gap-2">
          <IconButton label="Fotoğraf ekle" onClick={() => imageInput.current?.click()} disabled={busy}>
            <ImageIcon className="h-5 w-5" />
          </IconButton>
          <IconButton label="Video ekle" onClick={() => videoInput.current?.click()} disabled={busy}>
            <Film className="h-5 w-5" />
          </IconButton>
          <textarea
            ref={area}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia('(pointer: fine)').matches) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder="Mesaj yaz…"
            aria-label="Mesaj"
            className="max-h-36 min-h-10 flex-1 resize-none rounded-2xl border border-border bg-surface-2 px-3.5 py-2.5 text-sm text-fg placeholder:text-subtle focus:border-brand focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!canSend}
            aria-label="Gönder"
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-brand-fg transition-opacity',
              !canSend && 'opacity-40',
            )}
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowUp className="h-5 w-5" strokeWidth={2.6} />}
          </button>
        </div>
        {uploading ? <p className="px-1 text-[11px] text-muted">Dosya yükleniyor…</p> : null}
      </div>
      <input ref={imageInput} type="file" accept={MEDIA_LIMITS.imageTypes.join(',')} className="hidden" onChange={(e) => { pick('image', e.target.files?.[0]); e.target.value = ''; }} />
      <input ref={videoInput} type="file" accept={MEDIA_LIMITS.videoTypes.join(',')} className="hidden" onChange={(e) => { pick('video', e.target.files?.[0]); e.target.value = ''; }} />
    </div>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:text-fg disabled:opacity-40"
    >
      {children}
    </button>
  );
}
