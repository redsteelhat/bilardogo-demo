'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { Avatar, cn, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@bilardogo/ui';
import { Ban, Copy, Flag, MoreHorizontal, Reply, Store, Trash2, UserRound } from 'lucide-react';
import Link from 'next/link';
import { formatTime } from '@/lib/format';

export type ChatMessage = RouterOutputs['social']['messages']['items'][number];

export function MessageBubble({
  m,
  showSender,
  onReply,
  onCopy,
  onDelete,
  onReport,
  onProfile,
}: {
  m: ChatMessage;
  /** Grup sohbetlerinde başkalarının mesajında gönderen adı ve avatarı */
  showSender: boolean;
  onReply: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onReport: () => void;
  onProfile: () => void;
}) {
  const mine = m.isMine;
  const removed = m.removed;
  const senderName = m.asVenue ? m.asVenue.name : (m.sender?.displayName ?? 'Oyuncu');
  const menu = removed ? null : (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          aria-label="Mesaj seçenekleri"
          className="flex h-7 w-7 shrink-0 items-center justify-center self-center rounded-full border border-border bg-surface text-muted opacity-70 transition-opacity hover:opacity-100 focus:opacity-100"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </MenuTrigger>
      <MenuContent align={mine ? 'end' : 'start'}>
        <MenuItem icon={<Reply />} onSelect={onReply}>
          Yanıtla
        </MenuItem>
        {m.body ? (
          <MenuItem icon={<Copy />} onSelect={onCopy}>
            Kopyala
          </MenuItem>
        ) : null}
        {!mine && m.sender?.username ? (
          <MenuItem icon={<UserRound />} onSelect={onProfile}>
            Profili görüntüle
          </MenuItem>
        ) : null}
        {mine ? (
          <>
            <MenuSeparator />
            <MenuItem icon={<Trash2 />} danger onSelect={onDelete}>
              Sil
            </MenuItem>
          </>
        ) : (
          <>
            <MenuSeparator />
            <MenuItem icon={<Flag />} danger onSelect={onReport}>
              Şikâyet et
            </MenuItem>
          </>
        )}
      </MenuContent>
    </Menu>
  );

  return (
    <div id={`msg-${m.id}`} className={cn('flex items-end gap-2', mine ? 'justify-end' : 'justify-start')}>
      {!mine && showSender ? (
        m.sender?.username && !m.asVenue ? (
          <Link href={`/profil/${m.sender.username}`} className="mb-5 shrink-0">
            <Avatar name={senderName} src={m.sender.avatarUrl} size="sm" />
          </Link>
        ) : (
          <span className="mb-5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
            {m.asVenue ? <Store className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
          </span>
        )
      ) : null}
      {mine ? menu : null}
      <div className={cn('flex max-w-[78%] flex-col', mine ? 'items-end' : 'items-start')}>
        {(!mine && showSender) || m.asVenue ? (
          <div className="mb-0.5 flex items-center gap-1.5 px-1 text-[11px]">
            <span className={cn('font-semibold', m.asVenue ? 'text-brand' : 'text-muted')}>{senderName}</span>
            {m.asVenue ? (
              <span className="rounded-full border border-brand/30 bg-brand-soft px-1.5 text-[9px] font-bold uppercase tracking-wide text-brand">Salon</span>
            ) : null}
          </div>
        ) : null}
        <div
          className={cn(
            'overflow-hidden rounded-2xl text-sm',
            removed
              ? 'border border-dashed border-border bg-transparent px-3.5 py-2 italic text-subtle'
              : mine
                ? 'rounded-br-md bg-brand text-brand-fg'
                : m.asVenue
                  ? 'rounded-bl-md border border-brand/30 bg-surface-2 text-fg'
                  : 'rounded-bl-md border border-border bg-surface-2 text-fg',
          )}
        >
          {removed ? (
            <span className="inline-flex items-center gap-1.5">
              <Ban className="h-3.5 w-3.5" />
              {removed === 'deleted' ? 'Mesaj silindi' : 'Moderasyon tarafından kaldırıldı'}
            </span>
          ) : (
            <>
              {m.replyTo ? (
                <a
                  href={`#msg-${m.replyTo.id}`}
                  className={cn(
                    'mx-2 mt-2 block rounded-lg border-l-2 px-2.5 py-1.5 text-xs',
                    mine ? 'border-brand-fg/60 bg-black/15 text-brand-fg/90' : 'border-brand bg-surface-3 text-muted',
                  )}
                >
                  <span className="block font-semibold">{m.replyTo.senderName}</span>
                  <span className="line-clamp-2">{m.replyTo.body}</span>
                </a>
              ) : null}
              {m.mediaUrl ? (
                m.mediaType === 'video' ? (
                  <video src={m.mediaUrl} controls playsInline preload="metadata" className="mt-1 max-h-80 w-full max-w-72 bg-black" />
                ) : (
                  <a href={m.mediaUrl} target="_blank" rel="noopener noreferrer" className="block">
                    { }
                    <img src={m.mediaUrl} alt="Fotoğraf" className="max-h-80 w-full max-w-72 object-cover" loading="lazy" />
                  </a>
                )
              ) : m.mediaType ? (
                <div className="px-3.5 pt-2 text-xs opacity-80">{m.mediaType === 'video' ? '🎬 Video' : '📷 Fotoğraf'} yüklenemedi</div>
              ) : null}
              {m.body ? <p className="whitespace-pre-wrap break-words px-3.5 pb-1 pt-2">{m.body}</p> : null}
              <div className={cn('px-3.5 pb-1.5 text-right text-[10px]', mine ? 'text-brand-fg/70' : 'text-subtle', !m.body && 'pt-1')}>
                {formatTime(m.createdAt)}
              </div>
            </>
          )}
        </div>
      </div>
      {!mine ? menu : null}
    </div>
  );
}
