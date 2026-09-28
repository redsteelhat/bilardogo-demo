'use client';
import { Button, Dialog, DialogContent, EmptyState, ListRow, Tabs, toast } from '@bilardogo/ui';
import { ChevronRight, Loader2, MessageCircle, MessageSquarePlus, SquarePen, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PageBody } from '@/components/common/page-header';
import { ListSkeleton, QueryError } from '@/components/common/states';
import { TopBar } from '@/components/shell/top-bar';
import { ConversationRow, type ConversationItem } from '@/components/social/conversation-row';
import { UserSearch } from '@/components/social/user-search';
import { useSession } from '@/lib/session';
import { errorMessage, trpc } from '@/lib/trpc/client';

type Tab = 'all' | 'general' | 'venue' | 'dm';
const inTab = (c: ConversationItem, t: Tab) =>
  t === 'all' ? true : t === 'general' ? c.type === 'country' || c.type === 'city' : t === 'venue' ? c.type === 'venue' : c.type === 'dm';

export default function SocialPage() {
  const { session, loading } = useSession();
  const [tab, setTab] = useState<Tab>('all');
  const [compose, setCompose] = useState(false);
  const convs = trpc.social.conversations.useQuery(undefined, { enabled: !!session, refetchInterval: 15_000 });
  const friends = trpc.social.friends.useQuery(undefined, { enabled: !!session, staleTime: 30_000 });
  // Aktif maç şeridi varsa yeni mesaj düğmesi onun üstünde durur
  const current = trpc.matches.current.useQuery(undefined, { enabled: !!session?.onboarded, staleTime: 60_000 });
  const hasBar = !!current.data?.length;

  if (!loading && !session) {
    return (
      <>
        <TopBar />
        <PageBody>
          <Heading />
          <EmptyState
            icon={<MessageCircle />}
            title="Sohbet için giriş yap"
            description="Şehir ve salon sohbetlerine katıl, arkadaşlarınla mesajlaş."
            action={
              <Link href="/giris?next=/sosyal">
                <Button>Giriş yap</Button>
              </Link>
            }
          />
        </PageBody>
      </>
    );
  }

  const list = convs.data ?? [];
  const unreadIn = (t: Tab) => list.filter((c) => inTab(c, t)).reduce((a, c) => a + (c.unread ? 1 : 0), 0);
  const visible = list.filter((c) => inTab(c, tab));
  const incoming = friends.data?.incoming.length ?? 0;

  return (
    <>
      <TopBar />
      <PageBody className="space-y-4">
        <Heading />
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { value: 'all', label: 'Tümü' },
            { value: 'general', label: 'Genel', count: unreadIn('general') },
            { value: 'venue', label: 'Salon', count: unreadIn('venue') },
            { value: 'dm', label: 'Özel', count: unreadIn('dm') },
          ]}
        />
        <Link href="/sosyal/arkadaslar" className="block">
          <ListRow
            icon={<Users className="h-5 w-5" />}
            title="Arkadaşlar"
            subtitle={
              incoming
                ? `${incoming} yeni arkadaşlık isteği`
                : friends.data
                  ? `${friends.data.friends.length} arkadaş`
                  : 'Arkadaşların ve istekler'
            }
            right={
              <span className="flex items-center gap-2">
                {incoming ? (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-brand-fg">{incoming}</span>
                ) : null}
                <ChevronRight className="h-4 w-4 text-muted" />
              </span>
            }
          />
        </Link>
        {convs.isLoading || loading ? (
          <ListSkeleton rows={4} />
        ) : convs.error ? (
          <QueryError error={convs.error} retry={() => convs.refetch()} />
        ) : visible.length ? (
          <div className="space-y-2">
            {visible.map((c) => (
              <ConversationRow key={c.id} c={c} />
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<MessageCircle />}
            title={tab === 'dm' ? 'Henüz özel mesajın yok' : tab === 'venue' ? 'Salon sohbetin yok' : 'Sohbet yok'}
            description={
              tab === 'dm'
                ? 'Sağ alttaki düğmeyle bir oyuncu bulup mesaj gönderebilirsin.'
                : tab === 'venue'
                  ? 'Bir salonu takip ettiğinde salon sohbeti burada görünür.'
                  : undefined
            }
            action={
              tab === 'venue' ? (
                <Link href="/">
                  <Button variant="secondary">Salonlara göz at</Button>
                </Link>
              ) : undefined
            }
          />
        )}
      </PageBody>
      {session ? (
        <button
          type="button"
          onClick={() => setCompose(true)}
          className={`fixed ${hasBar ? 'bottom-[calc(9.5rem+env(safe-area-inset-bottom))]' : 'bottom-24'} right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-brand-fg shadow-[var(--shadow-brand)] transition-transform active:scale-95 sm:right-[max(1rem,calc(50%-21rem))]`}
          aria-label="Yeni mesaj"
        >
          <SquarePen className="h-6 w-6" />
        </button>
      ) : null}
      <ComposeDialog open={compose} onOpenChange={setCompose} cityPlate={session?.cityPlate ?? null} />
    </>
  );
}

function Heading() {
  return (
    <div className="pt-2">
      <h1 className="font-display text-3xl font-bold">Sohbet</h1>
      <p className="mt-1 text-sm text-muted">Arkadaşların, salonların ve genel bilardo akışı tek yerde.</p>
    </div>
  );
}

function ComposeDialog({ open, onOpenChange, cityPlate }: { open: boolean; onOpenChange: (v: boolean) => void; cityPlate: number | null }) {
  const router = useRouter();
  const [target, setTarget] = useState<string | null>(null);
  const openDm = trpc.social.openDm.useMutation({
    onSuccess: (r) => {
      onOpenChange(false);
      router.push(`/sosyal/${r.id}`);
    },
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: () => setTarget(null),
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Yeni mesaj" description="Mesaj göndermek istediğin oyuncuyu bul.">
        <UserSearch
          cityPlate={cityPlate}
          autoFocus
          onSelect={(u) => {
            setTarget(u.id);
            openDm.mutate({ userId: u.id });
          }}
          action={(u) =>
            openDm.isPending && target === u.id ? (
              <Loader2 className="h-5 w-5 animate-spin text-brand" />
            ) : (
              <Button
                size="icon-sm"
                variant="soft"
                aria-label={`${u.displayName} ile mesajlaş`}
                disabled={openDm.isPending}
                onClick={() => {
                  setTarget(u.id);
                  openDm.mutate({ userId: u.id });
                }}
              >
                <MessageSquarePlus className="h-4 w-4" />
              </Button>
            )
          }
        />
      </DialogContent>
    </Dialog>
  );
}
