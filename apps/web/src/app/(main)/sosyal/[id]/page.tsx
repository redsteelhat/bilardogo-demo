'use client';
import { Avatar, Button, EmptyState, Menu, MenuContent, MenuItem, MenuTrigger, Notice, Spinner, toast } from '@bilardogo/ui';
import { Ban, Flag, Globe2, MapPin, MessageCircle, MoreHorizontal, Store, UserRound } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { PageBody, PageHeader } from '@/components/common/page-header';
import { PageLoading, QueryError } from '@/components/common/states';
import { Composer } from '@/components/social/composer';
import { MessageBubble, type ChatMessage } from '@/components/social/message-bubble';
import { ReportDialog } from '@/components/social/report-dialog';
import { formatDate } from '@/lib/format';
import { useRealtime } from '@/lib/realtime';
import { useSession } from '@/lib/session';
import { errorMessage, trpc } from '@/lib/trpc/client';

function dayKey(d: Date | string) {
  return formatDate(d, { year: 'numeric', month: '2-digit', day: '2-digit' });
}
function dayLabel(d: Date | string) {
  const k = dayKey(d);
  if (k === dayKey(new Date())) return 'Bugün';
  if (k === dayKey(new Date(Date.now() - 86400_000))) return 'Dün';
  const x = new Date(d);
  const sameYear = x.getFullYear() === new Date().getFullYear();
  return formatDate(x, sameYear ? { day: 'numeric', month: 'long', weekday: 'long' } : { day: 'numeric', month: 'long', year: 'numeric' });
}

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session, loading } = useSession();
  const utils = trpc.useUtils();
  const conv = trpc.social.conversation.useQuery({ conversationId: id }, { enabled: !!session });
  const msgs = trpc.social.messages.useInfiniteQuery(
    { conversationId: id, limit: 40 },
    { enabled: !!session && !!conv.data, getNextPageParam: (l) => l.nextCursor ?? undefined, refetchInterval: 5_000 },
  );
  const current = trpc.matches.current.useQuery(undefined, { enabled: !!session?.onboarded, staleTime: 60_000 });
  const markRead = trpc.social.markRead.useMutation({
    onSuccess: () => {
      void utils.social.conversations.invalidate();
      void utils.social.unreadTotal.invalidate();
    },
  });
  const del = trpc.social.deleteMessage.useMutation({
    onSuccess: () => void utils.social.messages.invalidate({ conversationId: id }),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [reportMsg, setReportMsg] = useState<ChatMessage | null>(null);
  const [reportUser, setReportUser] = useState(false);

  useRealtime(
    session ? `conv:${id}` : null,
    ['message'],
    () => {
      void utils.social.messages.invalidate({ conversationId: id });
      void utils.social.conversations.invalidate();
    },
    { private: true },
  );

  // En eski → en yeni sıralı liste
  const messages = useMemo(() => {
    const all = msgs.data?.pages.flatMap((p) => p.items) ?? [];
    const seen = new Set<string>();
    return all.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true))).reverse();
  }, [msgs.data]);
  const newest = messages[messages.length - 1];

  // Açılışta ve yeni mesajda okundu işaretle
  const lastMarked = useRef<string | null>(null);
  useEffect(() => {
    if (!conv.data || !newest) {
      if (conv.data && !newest && lastMarked.current === null) {
        lastMarked.current = 'empty';
        markRead.mutate({ conversationId: id });
      }
      return;
    }
    if (lastMarked.current === newest.id) return;
    lastMarked.current = newest.id;
    markRead.mutate({ conversationId: id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conv.data, newest?.id, id]);

  // Kaydırma: ilk yüklemede ve yeni mesaj geldiğinde en alta; eski mesaj yüklenince konumu koru
  const prevNewest = useRef<string | null>(null);
  const restore = useRef<{ height: number; y: number } | null>(null);
  useLayoutEffect(() => {
    if (restore.current) {
      const { height, y } = restore.current;
      restore.current = null;
      window.scrollTo({ top: y + (document.documentElement.scrollHeight - height) });
      return;
    }
    if (!newest) return;
    if (prevNewest.current !== newest.id) {
      const first = prevNewest.current === null;
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 320;
      prevNewest.current = newest.id;
      if (first || nearBottom || newest.isMine) {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: first ? 'auto' : 'smooth' });
      }
    }
  }, [messages, newest]);

  const loadOlder = () => {
    restore.current = { height: document.documentElement.scrollHeight, y: window.scrollY };
    void msgs.fetchNextPage();
  };

  if (loading || (session && conv.isLoading)) return <PageLoading />;
  if (!session) {
    return (
      <>
        <PageHeader title="Sohbet" backHref="/sosyal" />
        <PageBody>
          <EmptyState
            icon={<MessageCircle />}
            title="Sohbeti görmek için giriş yap"
            action={
              <Link href={`/giris?next=${encodeURIComponent(`/sosyal/${id}`)}`}>
                <Button>Giriş yap</Button>
              </Link>
            }
          />
        </PageBody>
      </>
    );
  }
  if (conv.error || !conv.data) {
    return (
      <>
        <PageHeader title="Sohbet" backHref="/sosyal" />
        <PageBody>
          <QueryError error={conv.error ?? new Error('Sohbet bulunamadı.')} retry={() => conv.refetch()} />
        </PageBody>
      </>
    );
  }
  const c = conv.data;
  const other = c.otherUser;
  const isGroup = c.type !== 'dm';
  const hasActiveBar = !!current.data?.length;

  const title =
    c.type === 'dm' && other ? (
      <span className="inline-flex max-w-full items-center justify-center gap-2">
        <Avatar name={other.displayName} src={other.avatarUrl} size="xs" />
        <span className="truncate">{other.displayName}</span>
      </span>
    ) : (
      <span className="inline-flex max-w-full items-center justify-center gap-2">
        {c.type === 'venue' ? <Store className="h-4 w-4 text-brand" /> : c.type === 'city' ? <MapPin className="h-4 w-4 text-brand" /> : <Globe2 className="h-4 w-4 text-brand" />}
        <span className="truncate">{c.title}</span>
      </span>
    );
  const subtitle =
    c.type === 'dm' ? (
      other?.username ? (
        <Link href={`/profil/${other.username}`} className="text-brand">
          Profili görüntüle
        </Link>
      ) : (
        'Özel mesaj'
      )
    ) : c.type === 'venue' && 'venueSlug' in c && c.venueSlug ? (
      <Link href={`/salon/${c.venueSlug}`} className="text-brand">
        Salona git
      </Link>
    ) : (
      c.subtitle
    );

  return (
    <>
      <PageHeader
        title={title}
        subtitle={subtitle}
        backHref="/sosyal"
        actions={
          c.type === 'dm' && other ? (
            <Menu>
              <MenuTrigger asChild>
                <button type="button" aria-label="Sohbet seçenekleri" className="flex h-9 w-9 items-center justify-center rounded-full text-fg hover:bg-surface-2">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </MenuTrigger>
              <MenuContent>
                {other.username ? (
                  <MenuItem icon={<UserRound />} onSelect={() => router.push(`/profil/${other.username}`)}>
                    Profili görüntüle
                  </MenuItem>
                ) : null}
                <MenuItem icon={<Flag />} danger onSelect={() => setReportUser(true)}>
                  Kullanıcıyı şikâyet et
                </MenuItem>
              </MenuContent>
            </Menu>
          ) : undefined
        }
      />
      <main className={`mx-auto w-full max-w-2xl px-3 pt-3 ${hasActiveBar ? 'pb-72' : 'pb-52'}`}>
        {msgs.isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-7 w-7" />
          </div>
        ) : msgs.error ? (
          <QueryError error={msgs.error} retry={() => msgs.refetch()} />
        ) : (
          <>
            {msgs.hasNextPage ? (
              <div className="mb-3 flex justify-center">
                <Button size="sm" variant="secondary" loading={msgs.isFetchingNextPage} onClick={loadOlder}>
                  Daha eski mesajlar
                </Button>
              </div>
            ) : messages.length ? (
              <p className="mb-3 text-center text-[11px] text-subtle">Sohbetin başı</p>
            ) : null}
            {messages.length === 0 ? (
              <EmptyState
                icon={<MessageCircle />}
                title="Henüz mesaj yok"
                description={c.type === 'dm' ? 'İlk mesajı sen gönder.' : 'Sohbeti başlatan sen ol.'}
                className="mt-10"
              />
            ) : (
              <div className="space-y-2">
                {messages.map((m, i) => {
                  const prev = messages[i - 1];
                  const newDay = !prev || dayKey(prev.createdAt) !== dayKey(m.createdAt);
                  const sameSender = !newDay && prev && prev.sender?.id === m.sender?.id && !!prev.asVenue === !!m.asVenue;
                  return (
                    <Fragment key={m.id}>
                      {newDay ? (
                        <div className="flex justify-center py-2">
                          <span className="rounded-full border border-border bg-surface px-3 py-1 text-[11px] font-semibold text-muted">{dayLabel(m.createdAt)}</span>
                        </div>
                      ) : null}
                      <div className={sameSender ? '' : 'pt-1.5'}>
                        <MessageBubble
                          m={m}
                          showSender={isGroup}
                          onReply={() => setReplyTo(m)}
                          onCopy={() => {
                            void navigator.clipboard
                              ?.writeText(m.body)
                              .then(() => toast('Mesaj kopyalandı'))
                              .catch(() => toast.error('Kopyalanamadı'));
                          }}
                          onDelete={() => {
                            if (window.confirm('Mesaj herkes için silinsin mi?')) del.mutate({ messageId: m.id });
                          }}
                          onReport={() => setReportMsg(m)}
                          onProfile={() => m.sender?.username && router.push(`/profil/${m.sender.username}`)}
                        />
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
      <div className={`fixed inset-x-0 z-30 ${hasActiveBar ? 'bottom-[calc(8.5rem+env(safe-area-inset-bottom))]' : 'bottom-[calc(4rem+env(safe-area-inset-bottom))]'}`}>
        {c.isBlocked ? (
          <div className="border-t border-border bg-bg/95 backdrop-blur-lg">
            <div className="mx-auto max-w-2xl px-3 py-3">
              <Notice tone="danger" icon={<Ban />} title="Bu kişiyle mesajlaşamazsın">
                Aranızda engelleme olduğu için mesaj gönderilemez. Engellediysen Ayarlar → Engellenenler’den kaldırabilirsin.
              </Notice>
            </div>
          </div>
        ) : (
          <Composer
            conversationId={id}
            replyTo={replyTo}
            onCancelReply={() => setReplyTo(null)}
            onSent={() => {
              void utils.social.messages.invalidate({ conversationId: id });
              void utils.social.conversations.invalidate();
            }}
            canPostAsVenue={c.canPostAsVenue}
            venueName={c.type === 'venue' ? c.title : undefined}
          />
        )}
      </div>
      {reportMsg ? (
        <ReportDialog
          open={!!reportMsg}
          onOpenChange={(v) => !v && setReportMsg(null)}
          targetType="message"
          targetId={reportMsg.id}
          subject={`${reportMsg.asVenue?.name ?? reportMsg.sender?.displayName ?? 'Oyuncu'}: ${reportMsg.body || (reportMsg.mediaType === 'video' ? 'Video' : 'Fotoğraf')}`.slice(0, 140)}
        />
      ) : null}
      {other ? (
        <ReportDialog open={reportUser} onOpenChange={setReportUser} targetType="user" targetId={other.id} subject={other.displayName} />
      ) : null}
    </>
  );
}
