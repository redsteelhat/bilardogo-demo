'use client';
import { Button, EmptyState, Menu, MenuContent, MenuItem, MenuTrigger, SectionTitle, Segmented, toast } from '@bilardogo/ui';
import { Check, Clock, Inbox, MessageCircle, MoreHorizontal, Send, UserMinus, UserPlus, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PageBody, PageHeader } from '@/components/common/page-header';
import { ListSkeleton, QueryError } from '@/components/common/states';
import { UserChip, type UserSummary } from '@/components/common/user-chip';
import { UserSearch } from '@/components/social/user-search';
import { timeAgo } from '@/lib/format';
import { useSession } from '@/lib/session';
import { errorMessage, trpc } from '@/lib/trpc/client';

type View = 'friends' | 'requests' | 'add';

export default function FriendsPage() {
  const { session, loading } = useSession();
  const router = useRouter();
  const utils = trpc.useUtils();
  const q = trpc.social.friends.useQuery(undefined, { enabled: !!session, refetchInterval: 30_000 });
  const [view, setView] = useState<View>('friends');
  const [pendingId, setPendingId] = useState<string | null>(null);
  const done = () => setPendingId(null);
  const refresh = async () => {
    await Promise.all([utils.social.friends.invalidate(), utils.players.profile.invalidate()]);
  };
  const respond = trpc.social.respondFriend.useMutation({
    onSuccess: async (_r, v) => {
      await refresh();
      toast(v.accept ? 'Arkadaşlık isteği kabul edildi' : 'İstek reddedildi');
    },
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: done,
  });
  const remove = trpc.social.removeFriend.useMutation({
    onSuccess: async () => {
      await refresh();
      toast('Kaldırıldı');
    },
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: done,
  });
  const add = trpc.social.addFriend.useMutation({
    onSuccess: async (r) => {
      await refresh();
      toast.success(r.status === 'accepted' ? 'Artık arkadaşsınız' : 'Arkadaşlık isteği gönderildi');
    },
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: done,
  });
  const openDm = trpc.social.openDm.useMutation({
    onSuccess: (r) => router.push(`/sosyal/${r.id}`),
    onError: (e) => toast.error(errorMessage(e)),
    onSettled: done,
  });

  if (!loading && !session) {
    return (
      <>
        <PageHeader title="Arkadaşlar" backHref="/sosyal" />
        <PageBody>
          <EmptyState
            icon={<Users />}
            title="Arkadaşlarını görmek için giriş yap"
            action={
              <Link href="/giris?next=/sosyal/arkadaslar">
                <Button>Giriş yap</Button>
              </Link>
            }
          />
        </PageBody>
      </>
    );
  }

  const d = q.data;
  const incoming = d?.incoming ?? [];
  const outgoing = d?.outgoing ?? [];
  const friends = d?.friends ?? [];
  const relation = (id: string) =>
    friends.some((f) => f.user.id === id)
      ? 'friend'
      : outgoing.some((f) => f.user.id === id)
        ? 'outgoing'
        : incoming.some((f) => f.user.id === id)
          ? 'incoming'
          : null;

  return (
    <>
      <PageHeader title="Arkadaşlar" subtitle={d ? `${friends.length} arkadaş` : undefined} backHref="/sosyal" />
      <PageBody className="space-y-4">
        <Segmented<View>
          value={view}
          onChange={setView}
          options={[
            { value: 'friends', label: `Arkadaşlarım${friends.length ? ` (${friends.length})` : ''}` },
            { value: 'requests', label: `İstekler${incoming.length ? ` (${incoming.length})` : ''}` },
            { value: 'add', label: 'Ekle', icon: <UserPlus className="h-4 w-4" /> },
          ]}
        />
        {q.isLoading || loading ? (
          <ListSkeleton rows={3} />
        ) : q.error ? (
          <QueryError error={q.error} retry={() => q.refetch()} />
        ) : view === 'friends' ? (
          friends.length ? (
            <ul className="space-y-2">
              {friends.map((f) => (
                <Row key={f.id} user={f.user}>
                  <Button
                    size="icon-sm"
                    variant="soft"
                    aria-label="Mesaj gönder"
                    loading={openDm.isPending && pendingId === f.user.id}
                    onClick={() => {
                      setPendingId(f.user.id);
                      openDm.mutate({ userId: f.user.id });
                    }}
                  >
                    <MessageCircle className="h-4 w-4" />
                  </Button>
                  <Menu>
                    <MenuTrigger asChild>
                      <Button size="icon-sm" variant="ghost" aria-label="Diğer">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </MenuTrigger>
                    <MenuContent>
                      <MenuItem
                        icon={<UserMinus />}
                        danger
                        onSelect={() => {
                          setPendingId(f.user.id);
                          remove.mutate({ userId: f.user.id });
                        }}
                      >
                        Arkadaşlıktan çıkar
                      </MenuItem>
                    </MenuContent>
                  </Menu>
                </Row>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<Users />}
              title="Henüz arkadaşın yok"
              description="Oyuncuları arayıp arkadaş ekleyebilir, salondaki oyuncuların profilinden istek gönderebilirsin."
              action={<Button onClick={() => setView('add')}>Arkadaş ekle</Button>}
            />
          )
        ) : view === 'requests' ? (
          <>
            <SectionTitle icon={<Inbox />} count={incoming.length} className="mt-0">
              Gelen istekler
            </SectionTitle>
            {incoming.length ? (
              <ul className="space-y-2">
                {incoming.map((f) => (
                  <Row key={f.id} user={f.user} subtitle={`${f.user.username ? `@${f.user.username} · ` : ''}${timeAgo(f.createdAt)}`}>
                    <Button
                      size="sm"
                      variant="success"
                      loading={respond.isPending && pendingId === f.id && respond.variables?.accept === true}
                      disabled={respond.isPending && pendingId === f.id}
                      onClick={() => {
                        setPendingId(f.id);
                        respond.mutate({ friendshipId: f.id, accept: true });
                      }}
                    >
                      <Check className="h-4 w-4" /> Kabul
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      loading={respond.isPending && pendingId === f.id && respond.variables?.accept === false}
                      disabled={respond.isPending && pendingId === f.id}
                      onClick={() => {
                        setPendingId(f.id);
                        respond.mutate({ friendshipId: f.id, accept: false });
                      }}
                    >
                      <X className="h-4 w-4" /> Reddet
                    </Button>
                  </Row>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted">Bekleyen arkadaşlık isteği yok.</p>
            )}
            <SectionTitle icon={<Send />} count={outgoing.length}>
              Gönderdiğin istekler
            </SectionTitle>
            {outgoing.length ? (
              <ul className="space-y-2">
                {outgoing.map((f) => (
                  <Row key={f.id} user={f.user} subtitle={`Bekliyor · ${timeAgo(f.createdAt)}`}>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={remove.isPending && pendingId === f.user.id}
                      onClick={() => {
                        setPendingId(f.user.id);
                        remove.mutate({ userId: f.user.id });
                      }}
                    >
                      Geri çek
                    </Button>
                  </Row>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted">Bekleyen gönderilmiş istek yok.</p>
            )}
          </>
        ) : (
          <UserSearch
            cityPlate={session?.cityPlate}
            autoFocus
            action={(u) => {
              const r = relation(u.id);
              if (r === 'friend')
                return (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                    <Check className="h-4 w-4" /> Arkadaşsınız
                  </span>
                );
              if (r === 'outgoing')
                return (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted">
                    <Clock className="h-4 w-4" /> İstek gönderildi
                  </span>
                );
              return (
                <Button
                  size="sm"
                  variant={r === 'incoming' ? 'success' : 'outline'}
                  loading={add.isPending && pendingId === u.id}
                  onClick={() => {
                    setPendingId(u.id);
                    add.mutate({ userId: u.id });
                  }}
                >
                  {r === 'incoming' ? (
                    <>
                      <Check className="h-4 w-4" /> Kabul et
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" /> Ekle
                    </>
                  )}
                </Button>
              );
            }}
          />
        )}
      </PageBody>
    </>
  );
}

function Row({ user, subtitle, children }: { user: UserSummary; subtitle?: string; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2.5">
      <UserChip user={user} subtitle={subtitle} className="flex-1" />
      <div className="flex shrink-0 items-center gap-1.5">{children}</div>
    </li>
  );
}
