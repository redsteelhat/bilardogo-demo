'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { Button, Card, EmptyState, toast } from '@bilardogo/ui';
import { Bell, BellRing, CheckCheck, Megaphone, MessageCircle, ShoppingBag, Store, Swords, UserRound, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageBody, PageHeader } from '@/components/common/page-header';
import { ListSkeleton, QueryError } from '@/components/common/states';
import { InstallHint } from '@/components/profile/notification-settings';
import { usePushDevice } from '@/components/profile/use-push';
import { timeAgo } from '@/lib/format';
import { useSession } from '@/lib/session';
import { errorMessage, trpc } from '@/lib/trpc/client';

type Notification = RouterOutputs['notifications']['list']['items'][number];

const ICONS: Record<string, React.ReactNode> = {
  presence: <Users />,
  match: <Swords />,
  social: <MessageCircle />,
  order: <ShoppingBag />,
  venue: <Store />,
  bulletin: <Megaphone />,
  account: <UserRound />,
};

export default function NotificationsPage() {
  const { session, loading } = useSession();
  const router = useRouter();
  const utils = trpc.useUtils();
  const q = trpc.notifications.list.useInfiniteQuery(
    { limit: 20 },
    { enabled: !!session, getNextPageParam: (l) => l.nextCursor ?? undefined, refetchInterval: 60_000 },
  );
  const refresh = () => Promise.all([utils.notifications.invalidate(), utils.me.session.invalidate()]);
  const markRead = trpc.notifications.markRead.useMutation({ onSuccess: refresh });
  const markAll = trpc.notifications.markAllRead.useMutation({
    onSuccess: async () => {
      await refresh();
      toast('Tüm bildirimler okundu olarak işaretlendi');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!loading && !session) {
    return (
      <>
        <PageHeader title="Bildirimler" />
        <PageBody>
          <EmptyState
            icon={<Bell />}
            title="Bildirimlerini görmek için giriş yap"
            action={
              <Link href="/giris?next=/bildirimler">
                <Button>Giriş yap</Button>
              </Link>
            }
          />
        </PageBody>
      </>
    );
  }

  const items = q.data?.pages.flatMap((p) => p.items) ?? [];
  const unread = items.filter((n) => !n.readAt).length;

  const open = (n: Notification) => {
    if (!n.readAt) markRead.mutate({ ids: [n.id] });
    if (n.link) router.push(n.link);
  };

  return (
    <>
      <PageHeader
        title="Bildirimler"
        subtitle={unread ? `${unread} okunmamış` : undefined}
        actions={
          unread ? (
            <Button size="sm" variant="ghost" loading={markAll.isPending} onClick={() => markAll.mutate()} aria-label="Tümünü okundu yap">
              <CheckCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Tümünü okundu yap</span>
            </Button>
          ) : undefined
        }
      />
      <PageBody className="space-y-3">
        <PushPrompt />
        {unread ? (
          <Button variant="secondary" size="sm" block className="sm:hidden" loading={markAll.isPending} onClick={() => markAll.mutate()}>
            <CheckCheck className="h-4 w-4" /> Tümünü okundu yap
          </Button>
        ) : null}
        {q.isLoading || loading ? (
          <ListSkeleton rows={5} />
        ) : q.error ? (
          <QueryError error={q.error} retry={() => q.refetch()} />
        ) : items.length ? (
          <ul className="space-y-2">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => open(n)}
                  className={`flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left transition-colors hover:bg-surface-2 ${
                    n.readAt ? 'border-border bg-surface' : 'border-brand/40 bg-brand-soft/40'
                  }`}
                >
                  <span
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full [&_svg]:h-5 [&_svg]:w-5 ${
                      n.readAt ? 'bg-surface-3 text-muted' : 'bg-brand-soft text-brand'
                    }`}
                  >
                    {ICONS[n.category] ?? <Bell />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start gap-2">
                      <span className={`flex-1 text-sm ${n.readAt ? 'font-medium' : 'font-bold'}`}>{n.title}</span>
                      {!n.readAt ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Okunmadı" /> : null}
                    </span>
                    <span className="mt-0.5 line-clamp-3 block text-xs text-muted">{n.body}</span>
                    <span className="mt-1 block text-[11px] text-subtle">{timeAgo(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
            {q.hasNextPage ? (
              <Button variant="secondary" block loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
                Daha fazla
              </Button>
            ) : null}
          </ul>
        ) : (
          <EmptyState icon={<Bell />} title="Henüz bildirimin yok" description="Maç istekleri, mesajlar ve salon duyuruları burada görünür." />
        )}
      </PageBody>
    </>
  );
}

function PushPrompt() {
  const push = usePushDevice();
  const utils = trpc.useUtils();
  const prefs = trpc.me.prefs.useQuery();
  const update = trpc.me.updatePrefs.useMutation({ onSuccess: () => utils.me.prefs.invalidate() });
  if (push.subscribed !== false || push.support === null || push.support === 'unsupported') return null;
  if (push.support === 'needs_install') return <InstallHint />;
  const enable = async () => {
    try {
      await push.enable();
      if (prefs.data && !prefs.data.pushEnabled) {
        const p = prefs.data;
        update.mutate({
          pushEnabled: true,
          presence: p.presence,
          match: p.match,
          social: p.social,
          order: p.order,
          venue: p.venue,
          bulletin: p.bulletin,
          venueActivity: p.venueActivity,
          gameTypes: p.gameTypes,
        });
      }
      toast.success('Anlık bildirimler açıldı');
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };
  return (
    <Card className="flex items-center gap-3 border-brand/30 p-3.5">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
        <BellRing className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold">Anlık bildirimleri aç</div>
        <div className="text-xs text-muted">
          {push.support === 'denied' ? 'İzin tarayıcı ayarlarından engellenmiş.' : 'Maç isteği ve mesajları uygulama kapalıyken de öğren.'}
        </div>
      </div>
      <Button size="sm" loading={push.busy} disabled={push.support === 'denied'} onClick={() => void enable()}>
        Aç
      </Button>
    </Card>
  );
}
