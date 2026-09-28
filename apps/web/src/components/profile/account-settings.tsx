'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { formatTrPhone } from '@bilardogo/domain';
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  DialogContent,
  DialogFooter,
  Field,
  Input,
  ListRow,
  Notice,
  Skeleton,
  SwitchRow,
  toast,
} from '@bilardogo/ui';
import { Ban, Briefcase, ChevronRight, CreditCard, FileText, LogOut, Mail, MessageCircle, ShieldCheck, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { QueryError } from '@/components/common/states';
import { formatDate } from '@/lib/format';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { errorMessage, trpc } from '@/lib/trpc/client';

type Session = NonNullable<RouterOutputs['me']['session']>;

const ENT_LABEL: Record<Session['entitlement']['status'], { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' | 'brand' }> = {
  trialing: { label: 'Deneme', tone: 'brand' },
  active: { label: 'Aktif', tone: 'success' },
  past_due: { label: 'Ödeme bekleniyor', tone: 'warning' },
  canceled: { label: 'İptal edildi', tone: 'danger' },
  expired: { label: 'Süresi doldu', tone: 'danger' },
  none: { label: 'Abonelik yok', tone: 'neutral' },
};

export function SubscriptionCard({ session }: { session: Session }) {
  const meta = trpc.meta.settings.useQuery(undefined, { staleTime: 5 * 60_000 });
  const e = session.entitlement;
  const s = ENT_LABEL[e.status];
  const support = meta.data?.support;
  return (
    <Card>
      <CardHeader
        icon={<CreditCard className="h-5 w-5" />}
        title="Abonelik"
        action={<Badge tone={s.tone}>{s.label}</Badge>}
        description={
          e.endsAt
            ? `${e.status === 'trialing' ? 'Deneme bitişi' : 'Dönem bitişi'}: ${formatDate(e.endsAt)}${e.daysLeft != null ? ` · ${e.daysLeft} gün kaldı` : ''}`
            : e.status === 'none'
              ? 'Henüz tanımlı bir aboneliğin yok'
              : undefined
        }
      />
      <CardBody className="space-y-3">
        {e.status === 'trialing' && e.daysLeft != null ? (
          <div className="h-2 overflow-hidden rounded-full bg-surface-3">
            <div
              className="h-full rounded-full bg-brand"
              style={{ width: `${Math.max(4, Math.min(100, (e.daysLeft / (meta.data?.trialDays ?? 30)) * 100))}%` }}
            />
          </div>
        ) : null}
        <p className="text-sm text-muted">
          Abonelik ödemeleri şimdilik BilardoGo ekibi tarafından elle alınır; uygulama içinden ödeme yapılmaz. Uzatmak ya da abone olmak için
          destek ekibimize yaz.
        </p>
        {meta.isLoading ? (
          <Skeleton className="h-10 w-full" />
        ) : support?.email || support?.whatsapp ? (
          <div className="flex flex-wrap gap-2">
            {support.whatsapp ? (
              <a href={`https://wa.me/${support.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" variant="soft">
                  <MessageCircle className="h-4 w-4" /> WhatsApp {formatTrPhone(support.whatsapp) || support.whatsapp}
                </Button>
              </a>
            ) : null}
            {support.email ? (
              <a href={`mailto:${support.email}?subject=${encodeURIComponent('BilardoGo abonelik')}`}>
                <Button size="sm" variant="secondary">
                  <Mail className="h-4 w-4" /> {support.email}
                </Button>
              </a>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-subtle">Destek iletişim bilgisi yakında eklenecek.</p>
        )}
      </CardBody>
    </Card>
  );
}

const LEGAL_LINKS = [
  { kind: 'user_agreement', label: 'Kullanıcı sözleşmesi' },
  { kind: 'kvkk_notice', label: 'KVKK aydınlatma metni' },
  { kind: 'explicit_consent', label: 'Açık rıza metni' },
  { kind: 'marketing', label: 'Ticari ileti izni' },
] as const;

export function ConsentSettings() {
  const q = trpc.me.consents.useQuery();
  const utils = trpc.useUtils();
  const set = trpc.me.setConsent.useMutation({
    onSuccess: async () => {
      await utils.me.consents.invalidate();
      toast.success('İzin tercihin kaydedildi');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const granted = (k: string) => q.data?.find((c) => c.kind === k)?.granted ?? false;
  const at = (k: string) => q.data?.find((c) => c.kind === k)?.at ?? null;
  return (
    <Card>
      <CardHeader icon={<ShieldCheck className="h-5 w-5" />} title="İzinler" description="KVKK kapsamındaki tercihlerin" />
      <CardBody>
        {q.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : q.error ? (
          <QueryError error={q.error} retry={() => q.refetch()} />
        ) : (
          <>
            <div className="divide-y divide-border">
              <SwitchRow
                label="Açık rıza"
                description={`Konum/salon hareketlerinin arkadaşlarla paylaşımı ve kişiselleştirme${at('explicit_consent') ? ` · ${formatDate(at('explicit_consent'))}` : ''}`}
                checked={granted('explicit_consent')}
                disabled={set.isPending}
                onCheckedChange={(v) => set.mutate({ kind: 'explicit_consent', granted: v })}
              />
              <SwitchRow
                label="Ticari elektronik ileti"
                description={`Kampanya ve duyuruların e-posta / bildirimle gönderilmesi${at('marketing') ? ` · ${formatDate(at('marketing'))}` : ''}`}
                checked={granted('marketing')}
                disabled={set.isPending}
                onCheckedChange={(v) => set.mutate({ kind: 'marketing', granted: v })}
              />
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {LEGAL_LINKS.map((l) => (
                <Link
                  key={l.kind}
                  href={`/yasal/${l.kind}`}
                  className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-semibold text-muted hover:text-fg"
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-brand" />
                  <span className="truncate">{l.label}</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </CardBody>
    </Card>
  );
}

export function BusinessLink({ session }: { session: Session }) {
  const has = session.memberships.length > 0;
  return (
    <Link href="/isletme" className="block">
      <ListRow
        icon={<Briefcase className="h-5 w-5" />}
        title={has ? 'İşletme paneli' : 'İşletme hesabı oluştur'}
        subtitle={has ? session.memberships.map((m) => m.legalName).join(', ') : 'Salon sahibiysen salonunu BilardoGo’ya ekle'}
        right={<ChevronRight className="h-4 w-4 text-muted" />}
      />
    </Link>
  );
}

export function BlockedUsers() {
  const q = trpc.social.blocked.useQuery();
  const utils = trpc.useUtils();
  const unblock = trpc.social.unblock.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.social.invalidate(), utils.players.invalidate()]);
      toast('Engel kaldırıldı');
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <Card>
      <CardHeader icon={<Ban className="h-5 w-5" />} title="Engellenenler" description="Engellediğin kişiler sana mesaj ve maç isteği gönderemez" />
      <CardBody>
        {q.isLoading ? (
          <Skeleton className="h-12 w-full" />
        ) : q.error ? (
          <QueryError error={q.error} retry={() => q.refetch()} />
        ) : q.data?.length ? (
          <ul className="space-y-2">
            {q.data.map(({ user, at }) => (
              <li key={user.id} className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 p-2.5">
                <Avatar name={user.displayName} src={user.avatarUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{user.displayName}</div>
                  <div className="truncate text-[11px] text-muted">
                    {user.username ? `@${user.username} · ` : ''}
                    {formatDate(at)} tarihinde engellendi
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={unblock.isPending && unblock.variables?.userId === user.id}
                  onClick={() => unblock.mutate({ userId: user.id })}
                >
                  Engeli kaldır
                </Button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted">Engellediğin kimse yok.</p>
        )}
      </CardBody>
    </Card>
  );
}

/** Oturumu kapatır (Supabase + geliştirme oturumu) ve giriş sayfasına döner. */
export async function signOutEverywhere() {
  try {
    await getSupabaseBrowser().auth.signOut();
  } catch {
    // Supabase erişilemese de yerel oturum temizlenir.
  }
  if (process.env.NODE_ENV === 'development') {
    await fetch('/dev/login?next=/giris', { redirect: 'manual', credentials: 'same-origin' }).catch(() => null);
  }
}

export function AccountActions() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState(false);
  const finish = async () => {
    await signOutEverywhere();
    utils.invalidate();
    router.replace('/giris');
    router.refresh();
  };
  const del = trpc.me.deleteAccount.useMutation({
    onSuccess: async () => {
      toast.success('Hesabın silindi', { description: 'BilardoGo’yu kullandığın için teşekkürler.' });
      await finish();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        size="lg"
        block
        loading={loggingOut}
        onClick={async () => {
          setLoggingOut(true);
          await finish();
        }}
      >
        <LogOut className="h-4 w-4" /> Çıkış yap
      </Button>
      <Button variant="ghost" block className="text-danger hover:text-danger" onClick={() => setDeleteOpen(true)}>
        <Trash2 className="h-4 w-4" /> Hesabı sil
      </Button>
      <Dialog
        open={deleteOpen}
        onOpenChange={(v) => {
          setDeleteOpen(v);
          if (!v) {
            setConfirm('');
            setTouched(false);
          }
        }}
      >
        <DialogContent title="Hesabını sil" description="Bu işlem geri alınamaz.">
          <div className="space-y-3">
            <Notice tone="danger" icon={<Trash2 />}>
              Profilin anonimleştirilir; arkadaşlıkların, takip ettiğin salonlar ve özel mesaj üyeliklerin silinir. Rakiplerinin maç
              geçmişi bozulmasın diye maç kayıtları “Silinmiş kullanıcı” olarak kalır.
            </Notice>
            <Field
              label={
                <>
                  Onaylamak için <b className="text-fg">SİL</b> yaz
                </>
              }
              error={touched && confirm.trim().toLocaleUpperCase('tr-TR') !== 'SİL' ? 'Onay için büyük harflerle “SİL” yazmalısın.' : undefined}
            >
              <Input value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="SİL" autoCapitalize="characters" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Vazgeç
            </Button>
            <Button
              variant="danger"
              loading={del.isPending}
              onClick={() => {
                setTouched(true);
                if (confirm.trim().toLocaleUpperCase('tr-TR') !== 'SİL') return;
                del.mutate({ confirm: 'SİL' });
              }}
            >
              Hesabı kalıcı olarak sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
