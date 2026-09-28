'use client';
import { GAME_LABELS, LEVEL_LABELS } from '@bilardogo/domain';
import { Avatar, Badge, Button, Dialog, DialogContent, DialogFooter, Field, Input, Notice, Segmented, StatTile, Textarea, toast } from '@bilardogo/ui';
import { Ban, ExternalLink, ShieldCheck, ShieldOff, UserCheck } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { AdminPage, ConfirmDialog } from '@/components/admin-ui';
import { PaymentsTable, SubscriptionSummary } from '@/components/admin/billing';
import { BackLink, KV, PageSkeleton, Panel, QueryError, ToneBadge } from '@/components/admin/common';
import { ACCOUNT_STATUS, BUSINESS_STATUS, ROLE_LABELS } from '@/components/admin/labels';
import { cityName, formatDate, formatDateTime, timeAgo } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';

type Status = 'active' | 'passive' | 'banned';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

export default function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  const q = trpc.admin.user.useQuery({ userId: id });
  const [statusOpen, setStatusOpen] = useState<Status | null>(null);
  const [roleOpen, setRoleOpen] = useState(false);

  const setRole = trpc.admin.setUserRole.useMutation({
    onSuccess: async () => {
      toast.success('Rol güncellendi.');
      setRoleOpen(false);
      await Promise.all([utils.admin.user.invalidate({ userId: id }), utils.admin.users.invalidate()]);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (q.isLoading) return <PageSkeleton />;
  if (q.error || !q.data)
    return (
      <AdminPage title="Kullanıcı">
        <BackLink href="/kullanicilar">Kullanıcılar</BackLink>
        <QueryError error={q.error} onRetry={() => q.refetch()} />
      </AdminPage>
    );

  const { profile: p, email, subscription, entitlement, payments, reportsAgainst, businesses, stats } = q.data;
  const name = p.fullName || (p.username ? `@${p.username}` : 'Kullanıcı');
  const lastPaid = payments.find((x) => x.status === 'paid')?.paidAt ?? null;
  const isAdmin = p.role === 'admin';

  return (
    <AdminPage
      title={
        <span className="flex items-center gap-3">
          <Avatar name={name} src={p.avatarUrl} size="lg" />
          <span className="min-w-0">
            <span className="block">{name}</span>
            <span className="block text-sm font-normal text-muted">{p.username ? `@${p.username}` : 'Kullanıcı adı yok'}</span>
          </span>
        </span>
      }
      actions={
        <>
          {p.username ? (
            <Button variant="ghost" size="sm" onClick={() => window.open(`${APP_URL}/profil/${p.username}`, '_blank')}>
              <ExternalLink className="h-4 w-4" /> Profili aç
            </Button>
          ) : null}
          {p.status !== 'active' ? (
            <Button variant="success" size="sm" onClick={() => setStatusOpen('active')}>
              <UserCheck className="h-4 w-4" /> Aktif yap
            </Button>
          ) : null}
          {p.status !== 'passive' ? (
            <Button variant="secondary" size="sm" onClick={() => setStatusOpen('passive')}>
              Pasife al
            </Button>
          ) : null}
          {p.status !== 'banned' ? (
            <Button variant="danger" size="sm" onClick={() => setStatusOpen('banned')}>
              <Ban className="h-4 w-4" /> Banla
            </Button>
          ) : null}
          <Button variant={isAdmin ? 'secondary' : 'outline'} size="sm" onClick={() => setRoleOpen(true)}>
            {isAdmin ? <ShieldOff className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            {isAdmin ? 'Adminliği kaldır' : 'Admin yap'}
          </Button>
        </>
      }
    >
      <BackLink href="/kullanicilar">Kullanıcılar</BackLink>

      {p.status !== 'active' ? (
        <Notice tone={p.status === 'banned' ? 'danger' : 'warning'} title={p.status === 'banned' ? 'Hesap banlı' : 'Hesap pasif'} className="mb-4">
          {p.statusReason ? `Sebep: ${p.statusReason}. ` : ''}
          {p.status === 'banned' ? (p.bannedUntil ? `Ban bitişi: ${formatDateTime(p.bannedUntil)}.` : 'Süresiz ban.') : null}
        </Notice>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Profil">
            <KV
              items={[
                { label: 'Ad soyad', value: p.fullName },
                { label: 'E-posta', value: email },
                { label: 'Şehir', value: cityName(p.cityPlate) },
                { label: 'Seviye', value: LEVEL_LABELS[p.level] },
                { label: 'Oyun türleri', value: p.gameTypes.map((g) => GAME_LABELS[g]).join(', ') },
                { label: 'Durum', value: <ToneBadge value={ACCOUNT_STATUS[p.status]} /> },
                { label: 'Rol', value: isAdmin ? <Badge tone="brand">Admin</Badge> : ROLE_LABELS.user },
                { label: 'Kayıt', value: formatDate(p.createdAt, { day: 'numeric', month: 'long', year: 'numeric' }) },
                { label: 'Son görülme', value: p.lastSeenAt ? timeAgo(p.lastSeenAt) : null },
                { label: 'Profil tamamlama', value: p.onboardedAt ? formatDate(p.onboardedAt, { day: 'numeric', month: 'short', year: 'numeric' }) : 'Tamamlanmadı' },
                { label: 'Hakkında', value: p.bio, wide: true },
              ]}
            />
          </Panel>

          <Panel title="Abonelik">
            <SubscriptionSummary subscription={subscription} entitlement={entitlement} lastPaymentAt={lastPaid} />
            <h3 className="mb-2 mt-6 text-sm font-semibold text-muted">Ödeme geçmişi</h3>
            <PaymentsTable payments={payments} />
          </Panel>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Maç" value={stats.matches} />
            <StatTile label="Galibiyet" value={stats.wins} />
            <StatTile label="Şikâyet" value={reportsAgainst} hint={reportsAgainst ? 'hakkında' : undefined} />
          </div>
          {reportsAgainst > 0 ? (
            <Link href="/moderasyon" className="block text-sm font-semibold text-brand hover:underline">
              Moderasyon kuyruğuna git →
            </Link>
          ) : null}
          <Panel title="İşletmeler">
            {businesses.length === 0 ? (
              <p className="text-sm text-muted">Bağlı işletme yok.</p>
            ) : (
              <ul className="space-y-2">
                {businesses.map((b) => (
                  <li key={b.id}>
                    <Link href={`/isletmeler/${b.id}`} className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 p-3 hover:border-brand/50">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{b.legalName}</div>
                        <div className="text-xs text-muted">{b.role === 'owner' ? 'Sahip' : 'Çalışan'}</div>
                      </div>
                      <ToneBadge value={BUSINESS_STATUS[b.status]} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <StatusDialog userId={id} status={statusOpen} onClose={() => setStatusOpen(null)} name={name} />
      <ConfirmDialog
        open={roleOpen}
        onOpenChange={setRoleOpen}
        title={isAdmin ? 'Adminlik kaldırılsın mı?' : 'Admin yapılsın mı?'}
        description={
          isAdmin
            ? `${name} admin paneline erişimini kaybedecek.`
            : `${name} admin paneline tam erişim kazanacak: kullanıcıları, işletmeleri, şikâyet bağlamlarını ve abonelikleri yönetebilir.`
        }
        confirmLabel={isAdmin ? 'Adminliği kaldır' : 'Admin yap'}
        tone={isAdmin ? 'danger' : 'primary'}
        loading={setRole.isPending}
        onConfirm={() => setRole.mutate({ userId: id, role: isAdmin ? 'user' : 'admin' })}
      />
    </AdminPage>
  );
}

function StatusDialog({ userId, status, onClose, name }: { userId: string; status: Status | null; onClose: () => void; name: string }) {
  const utils = trpc.useUtils();
  const [reason, setReason] = useState('');
  const [days, setDays] = useState('');
  const [mode, setMode] = useState<'temp' | 'perm'>('temp');
  const m = trpc.admin.setUserStatus.useMutation({
    onSuccess: async () => {
      toast.success('Hesap durumu güncellendi.');
      setReason('');
      setDays('');
      onClose();
      await Promise.all([utils.admin.user.invalidate({ userId }), utils.admin.users.invalidate(), utils.admin.dashboard.invalidate()]);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const daysNum = Number(days);
  const daysInvalid = status === 'banned' && mode === 'temp' && (!Number.isInteger(daysNum) || daysNum < 1 || daysNum > 3650);
  const reasonRequired = status === 'banned' || status === 'passive';
  const titles: Record<Status, string> = { active: 'Hesabı aktif yap', passive: 'Hesabı pasife al', banned: 'Kullanıcıyı banla' };
  const desc: Record<Status, string> = {
    active: `${name} tekrar uygulamayı kullanabilecek.`,
    passive: `${name} giriş yapamaz; salon durumu çevrimdışı yapılır. Geri alınabilir.`,
    banned: `${name} belirtilen süre boyunca uygulamayı kullanamaz; salon durumu çevrimdışı yapılır.`,
  };
  return (
    <Dialog open={status !== null} onOpenChange={(o) => !o && onClose()}>
      {status ? (
        <DialogContent title={titles[status]} description={desc[status]}>
          <div className="space-y-4">
            {status === 'banned' ? (
              <Field label="Süre">
                <Segmented
                  value={mode}
                  onChange={setMode}
                  options={[
                    { value: 'temp', label: 'Belirli süre' },
                    { value: 'perm', label: 'Süresiz' },
                  ]}
                />
                {mode === 'temp' ? (
                  <div className="mt-2 flex items-center gap-2">
                    <Input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(e.target.value)} placeholder="7" className="w-28" />
                    <span className="text-sm text-muted">gün</span>
                  </div>
                ) : null}
                {daysInvalid && days ? <p className="mt-1 text-xs text-danger">1 ile 3650 gün arasında bir süre girin.</p> : null}
              </Field>
            ) : null}
            <Field label="Sebep" required={reasonRequired} hint="Kullanıcı kaydında ve denetim kaydında saklanır.">
              <Textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder={status === 'active' ? 'İsteğe bağlı' : 'Ör. tekrarlayan hakaret içerikli mesajlar'} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Vazgeç
            </Button>
            <Button
              variant={status === 'active' ? 'primary' : 'danger'}
              loading={m.isPending}
              disabled={(reasonRequired && !reason.trim()) || daysInvalid}
              onClick={() =>
                m.mutate({
                  userId,
                  status,
                  reason: reason.trim() || null,
                  banDays: status === 'banned' && mode === 'temp' ? daysNum : null,
                })
              }
            >
              {titles[status]}
            </Button>
          </DialogFooter>
        </DialogContent>
      ) : null}
    </Dialog>
  );
}
