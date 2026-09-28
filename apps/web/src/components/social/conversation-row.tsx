import type { RouterOutputs } from '@bilardogo/api';
import { Avatar, cn } from '@bilardogo/ui';
import { Ban, ChevronRight, Globe2, MapPin, Store } from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatTime } from '@/lib/format';

export type ConversationItem = RouterOutputs['social']['conversations'][number];

export function shortTime(d: Date | string) {
  const x = new Date(d);
  const now = new Date();
  const sameDay = x.toDateString() === now.toDateString();
  if (sameDay) return formatTime(x);
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (x.toDateString() === y.toDateString()) return 'Dün';
  return formatDate(x, { day: 'numeric', month: 'short' });
}

/** Sohbet listesi satırı: ikon/avatar, başlık, son mesaj, saat, okunmamış rozeti. */
export function ConversationRow({ c }: { c: ConversationItem }) {
  const icon =
    c.type === 'dm' && c.otherUser ? (
      <Avatar name={c.otherUser.displayName} src={c.otherUser.avatarUrl} size="md" />
    ) : (
      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-brand/30 bg-brand-soft text-brand">
        {c.type === 'country' ? <Globe2 className="h-5 w-5" /> : c.type === 'city' ? <MapPin className="h-5 w-5" /> : <Store className="h-5 w-5" />}
      </span>
    );
  const subtitle = c.isBlocked
    ? 'Engellendi'
    : c.lastMessage
      ? `${c.type !== 'dm' || c.lastMessage.senderName === 'Sen' ? `${c.lastMessage.senderName}: ` : ''}${c.lastMessage.body}`
      : c.type === 'country'
        ? 'Tüm oyuncuların ortak alanı'
        : c.type === 'city'
          ? 'Şehrindeki oyuncularla sohbet'
          : c.type === 'venue'
            ? 'Salon sohbeti'
            : 'Henüz mesaj yok';
  return (
    <Link
      href={`/sosyal/${c.id}`}
      className={cn(
        'flex items-center gap-3 rounded-2xl border bg-surface p-3.5 transition-colors hover:bg-surface-2',
        c.unread ? 'border-brand/40' : 'border-border',
      )}
    >
      <span className="relative">
        {icon}
        {c.unread && c.type !== 'dm' ? <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-brand ring-2 ring-surface" /> : null}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn('truncate font-display text-base font-semibold', c.unread ? 'text-fg' : '')}>{c.title}</span>
          {c.isBlocked ? <Ban className="h-3.5 w-3.5 shrink-0 text-danger" /> : null}
        </div>
        <div className={cn('truncate text-xs', c.unread ? 'font-semibold text-fg/90' : 'text-muted')}>{subtitle}</div>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        {c.lastMessage ? <span className={cn('text-[11px]', c.unread ? 'text-brand' : 'text-subtle')}>{shortTime(c.lastMessage.at)}</span> : null}
        {c.unread ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-brand-fg">
            {c.unread > 99 ? '99+' : c.unread}
          </span>
        ) : (
          <ChevronRight className="h-4 w-4 text-subtle" />
        )}
      </div>
    </Link>
  );
}
