'use client';
import type { RouterOutputs } from '@bilardogo/api';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  ListRow,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  toast,
} from '@bilardogo/ui';
import {
  Ban,
  Briefcase,
  Check,
  ChevronRight,
  Clock,
  Flag,
  History,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Settings,
  ShoppingBag,
  Swords,
  UserMinus,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ReportDialog } from '@/components/social/report-dialog';
import { errorMessage, trpc } from '@/lib/trpc/client';
import { HeadToHeadDialog } from './head-to-head';
import type { Profile } from './types';

type Session = NonNullable<RouterOutputs['me']['session']>;

/** Kendi profilim: düzenle, ayarlar, maçlarım, işletme paneli ve kısayollar. */
export function OwnProfileActions({ session }: { session: Session }) {
  const actions = trpc.matches.actionCount.useQuery(undefined, { refetchInterval: 60_000 });
  const friends = trpc.social.friends.useQuery(undefined, { staleTime: 60_000 });
  const count = actions.data?.count ?? 0;
  const incoming = friends.data?.incoming.length ?? 0;
  const hasBusiness = session.memberships.length > 0;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Link href="/profil/duzenle">
          <Button variant="secondary" block>
            <Pencil className="h-4 w-4" /> Profili düzenle
          </Button>
        </Link>
        <Link href="/ayarlar">
          <Button variant="secondary" block>
            <Settings className="h-4 w-4" /> Ayarlar
          </Button>
        </Link>
      </div>
      <div className="space-y-2">
        <Link href="/maclarim" className="block">
          <ListRow
            icon={<Swords className="h-5 w-5" />}
            title="Maçlarım"
            subtitle={count ? `${count} işlem bekliyor` : 'İstekler, aktif maçlar ve sonuçlar'}
            right={
              <span className="flex items-center gap-2">
                {count ? (
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-2 text-xs font-bold text-brand-fg">{count}</span>
                ) : null}
                <ChevronRight className="h-4 w-4 text-muted" />
              </span>
            }
          />
        </Link>
        <div className="grid grid-cols-3 gap-2">
          <QuickLink href="/sosyal/arkadaslar" icon={<Users />} label="Arkadaşlar" badge={incoming} />
          <QuickLink href="/siparis" icon={<ShoppingBag />} label="Siparişlerim" />
          <QuickLink href="/oyuncular" icon={<Zap />} label="Oyuncular" />
        </div>
        <Link href="/isletme" className="block">
          <ListRow
            icon={<Briefcase className="h-5 w-5" />}
            title={hasBusiness ? 'İşletme paneli' : 'İşletme hesabı oluştur'}
            subtitle={
              hasBusiness
                ? session.memberships.map((m) => m.legalName).join(', ')
                : 'Salonunu BilardoGo’ya ekle, masalarını ve siparişlerini yönet'
            }
            right={<ChevronRight className="h-4 w-4 text-muted" />}
          />
        </Link>
      </div>
    </div>
  );
}

function QuickLink({ href, icon, label, badge }: { href: string; icon: React.ReactNode; label: string; badge?: number }) {
  return (
    <Link
      href={href}
      className="relative flex flex-col items-center gap-1.5 rounded-2xl border border-border bg-surface p-3 text-xs font-semibold transition-colors hover:bg-surface-2 [&_svg]:h-5 [&_svg]:w-5 [&_svg]:text-brand"
    >
      {icon}
      {label}
      {badge ? (
        <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-fg">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}

/** Başka oyuncunun profili: arkadaşlık, mesaj, maç isteği ve menü (karşılıklı geçmiş, engelle, şikâyet). */
export function OtherProfileActions({ profile, loggedIn }: { profile: Profile; loggedIn: boolean }) {
  const router = useRouter();
  const utils = trpc.useUtils();
  const u = profile.user;
  const username = u.username ?? '';
  const [confirmBlock, setConfirmBlock] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [h2hOpen, setH2hOpen] = useState(false);
  const refresh = async () => {
    await Promise.all([utils.players.profile.invalidate({ username }), utils.social.friends.invalidate()]);
  };
  const add = trpc.social.addFriend.useMutation({
    onSuccess: async (r) => {
      await refresh();
      toast.success(r.status === 'accepted' ? 'Artık arkadaşsınız' : 'Arkadaşlık isteği gönderildi');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const respond = trpc.social.respondFriend.useMutation({
    onSuccess: async (_r, v) => {
      await refresh();
      toast(v.accept ? 'Arkadaşlık isteği kabul edildi' : 'İstek reddedildi');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const remove = trpc.social.removeFriend.useMutation({
    onSuccess: async () => {
      await refresh();
      toast('Arkadaşlık kaldırıldı');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const openDm = trpc.social.openDm.useMutation({
    onSuccess: (r) => router.push(`/sosyal/${r.id}`),
    onError: (e) => toast.error(errorMessage(e)),
  });
  const block = trpc.social.block.useMutation({
    onSuccess: async () => {
      setConfirmBlock(false);
      await Promise.all([utils.social.invalidate(), utils.players.invalidate()]);
      toast.success(`${u.displayName} engellendi`, { description: 'Engellenenleri Ayarlar’dan yönetebilirsin.' });
      router.replace('/sosyal');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (!loggedIn) {
    return (
      <Link href={`/giris?next=${encodeURIComponent(`/profil/${username}`)}`}>
        <Button block>Arkadaş eklemek ve mesajlaşmak için giriş yap</Button>
      </Link>
    );
  }

  const f = profile.friendship;
  const busy = profile.presence?.matchState === 'in_match' || profile.presence?.matchState === 'will_play';
  const params = new URLSearchParams({ rakip: u.id });
  if (username) params.set('kullanici', username);

  const friendButton =
    f?.status === 'accepted' ? (
      <Button variant="soft" block disabled>
        <Check className="h-4 w-4" /> Arkadaşsınız
      </Button>
    ) : f?.status === 'pending' && f.direction === 'outgoing' ? (
      <Button variant="secondary" block disabled>
        <Clock className="h-4 w-4" /> İstek gönderildi
      </Button>
    ) : f?.status === 'pending' && f.direction === 'incoming' ? (
      <Button variant="success" block loading={respond.isPending} onClick={() => respond.mutate({ friendshipId: f.id, accept: true })}>
        <Check className="h-4 w-4" /> İsteği kabul et
      </Button>
    ) : (
      <Button variant="outline" block loading={add.isPending} onClick={() => add.mutate({ userId: u.id })}>
        <UserPlus className="h-4 w-4" /> Arkadaş ekle
      </Button>
    );

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="flex-1">{friendButton}</div>
        <Button variant="secondary" className="flex-1" loading={openDm.isPending} onClick={() => openDm.mutate({ userId: u.id })}>
          <MessageCircle className="h-4 w-4" /> Mesaj
        </Button>
        <Menu>
          <MenuTrigger asChild>
            <Button variant="secondary" size="icon" aria-label="Diğer işlemler">
              <MoreHorizontal className="h-5 w-5" />
            </Button>
          </MenuTrigger>
          <MenuContent>
            <MenuItem icon={<History />} onSelect={() => setH2hOpen(true)}>
              Karşılıklı geçmişimiz
            </MenuItem>
            {f?.status === 'accepted' ? (
              <MenuItem icon={<UserMinus />} onSelect={() => remove.mutate({ userId: u.id })}>
                Arkadaşlıktan çıkar
              </MenuItem>
            ) : null}
            {f?.status === 'pending' && f.direction === 'outgoing' ? (
              <MenuItem icon={<UserMinus />} onSelect={() => remove.mutate({ userId: u.id })}>
                İsteği geri çek
              </MenuItem>
            ) : null}
            {f?.status === 'pending' && f.direction === 'incoming' ? (
              <MenuItem icon={<UserMinus />} onSelect={() => respond.mutate({ friendshipId: f.id, accept: false })}>
                İsteği reddet
              </MenuItem>
            ) : null}
            <MenuSeparator />
            <MenuItem icon={<Ban />} danger onSelect={() => setConfirmBlock(true)}>
              Engelle
            </MenuItem>
            <MenuItem icon={<Flag />} danger onSelect={() => setReportOpen(true)}>
              Şikâyet et
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
      {busy ? (
        <Button variant="secondary" block disabled>
          <Swords className="h-4 w-4" /> {profile.presence?.matchState === 'in_match' ? 'Şu an maçta' : 'Başka bir maç yapacak'}
        </Button>
      ) : (
        <Link href={`/mac-istegi?${params.toString()}`} className="block">
          <Button block>
            <Zap className="h-4 w-4" fill="currentColor" /> Maç isteği gönder
          </Button>
        </Link>
      )}

      <Dialog open={confirmBlock} onOpenChange={setConfirmBlock}>
        <DialogContent title={`${u.displayName} engellensin mi?`}>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            <li>Sana mesaj ve maç isteği gönderemez.</li>
            <li>Sohbetlerde mesajlarını görmezsin, profillerinizi göremezsiniz.</li>
            <li>Arkadaşlığınız varsa kaldırılır.</li>
          </ul>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirmBlock(false)}>
              Vazgeç
            </Button>
            <Button variant="danger" loading={block.isPending} onClick={() => block.mutate({ userId: u.id })}>
              <Ban className="h-4 w-4" /> Engelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} targetType="user" targetId={u.id} subject={`${u.displayName}${username ? ` (@${username})` : ''}`} />
      {h2hOpen ? (
        <HeadToHeadDialog
          open={h2hOpen}
          onOpenChange={setH2hOpen}
          otherId={u.id}
          title={`Sen – ${u.displayName}`}
          perspective="me"
        />
      ) : null}
    </div>
  );
}
