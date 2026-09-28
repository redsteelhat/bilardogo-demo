'use client';
import { Button, Notice } from '@bilardogo/ui';
import { Ban, CalendarPlus, CreditCard, Receipt, Zap } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { AdminPage } from '@/components/admin-ui';
import { EventsList, PaymentsTable } from '@/components/admin/billing';
import { BackLink, KV, PageSkeleton, Panel, QueryError, ToneBadge } from '@/components/admin/common';
import { SUB_STATUS } from '@/components/admin/labels';
import { SubscriptionDialogs, type SubDialog } from '@/components/admin/subscription-dialogs';
import { formatDate, formatMoney } from '@/lib/format';
import { trpc } from '@/lib/trpc/client';

const d = (x: Date | string | null | undefined) => (x ? formatDate(x, { day: 'numeric', month: 'long', year: 'numeric' }) : null);

export default function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const q = trpc.admin.subscription.useQuery({ subscriptionId: id });
  const userId = q.data?.subscription.userId ?? null;
  // Abone adını göstermek için (kullanıcı aboneliği)
  const user = trpc.admin.user.useQuery({ userId: userId! }, { enabled: !!userId });
  const [dialog, setDialog] = useState<SubDialog>(null);

  if (q.isLoading) return <PageSkeleton />;
  if (q.error || !q.data)
    return (
      <AdminPage title="Abonelik">
        <BackLink href="/abonelikler">Abonelikler</BackLink>
        <QueryError error={q.error} onRetry={() => q.refetch()} />
      </AdminPage>
    );

  const { subscription: s, plan, payments, events } = q.data;
  const subjectHref = s.userId ? `/kullanicilar/${s.userId}` : s.businessId ? `/isletmeler/${s.businessId}` : null;
  const subjectName = s.userId ? (user.data ? user.data.profile.fullName || `@${user.data.profile.username}` : 'Kullanıcı') : 'İşletme';
  const paid = payments.filter((p) => p.status === 'paid');
  const lastPaid = paid[0] ?? null;
  const total = paid.reduce((a, p) => a + p.amount, 0) - payments.filter((p) => p.status === 'refunded').reduce((a, p) => a + p.amount, 0);
  const endsAt = s.status === 'trialing' ? s.trialEndsAt : s.currentPeriodEnd;

  return (
    <AdminPage
      title={`${s.subjectType === 'user' ? 'Kullanıcı' : 'İşletme'} aboneliği`}
      description={
        <span className="flex flex-wrap items-center gap-2">
          <ToneBadge value={SUB_STATUS[s.status]} />
          {subjectHref ? (
            <Link href={subjectHref} className="font-semibold text-fg hover:text-brand">
              {subjectName} →
            </Link>
          ) : null}
        </span>
      }
      actions={
        <>
          <Button size="sm" onClick={() => setDialog('activate')}>
            <Zap className="h-4 w-4" /> Manuel aktive et
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setDialog('extend')}>
            <CalendarPlus className="h-4 w-4" /> Deneme uzat
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setDialog('payment')}>
            <Receipt className="h-4 w-4" /> Ödeme kaydet
          </Button>
          {s.status !== 'canceled' ? (
            <Button size="sm" variant="danger" onClick={() => setDialog('cancel')}>
              <Ban className="h-4 w-4" /> İptal et
            </Button>
          ) : null}
        </>
      }
    >
      <BackLink href="/abonelikler">Abonelikler</BackLink>
      <Notice tone="info" icon={<CreditCard />} className="mb-4">
        Ödemeler bu sürümde manueldir; kart ile tahsilat yapılmaz. Havale/EFT veya nakit ödeme alındıktan sonra “Manuel aktive et” ile dönem başlatın.
      </Notice>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Özet">
            <KV
              cols={3}
              items={[
                { label: 'Plan', value: plan ? `${plan.name} · ${formatMoney(Number(plan.price))} / ${plan.intervalMonths} ay` : s.status === 'trialing' ? 'Ücretsiz deneme' : null },
                { label: 'Durum', value: <ToneBadge value={SUB_STATUS[s.status]} /> },
                { label: 'Sağlayıcı', value: s.provider === 'manual' ? 'Manuel' : s.provider },
                { label: 'Deneme başlangıcı', value: d(s.trialStartedAt) },
                { label: 'Deneme bitişi', value: d(s.trialEndsAt) },
                { label: 'Abonelik başlangıcı', value: d(s.currentPeriodStart) },
                { label: 'Dönem sonu', value: d(s.currentPeriodEnd) },
                { label: 'Son ödeme', value: lastPaid ? `${formatMoney(lastPaid.amount)} · ${d(lastPaid.paidAt)}` : null },
                { label: 'Sonraki ödeme', value: s.status === 'canceled' || s.status === 'expired' ? null : d(endsAt) },
                ...(s.canceledAt ? [{ label: 'İptal', value: d(s.canceledAt) }] : []),
                { label: 'Toplam tahsilat', value: formatMoney(total) },
                ...(s.notes ? [{ label: 'Notlar', value: s.notes, wide: true }] : []),
              ]}
            />
          </Panel>
          <Panel title={`Ödemeler (${payments.length})`}>
            <PaymentsTable payments={payments} />
          </Panel>
        </div>
        <Panel title="Abonelik geçmişi">
          <EventsList events={events} />
        </Panel>
      </div>

      <SubscriptionDialogs open={dialog} onClose={() => setDialog(null)} subscriptionId={id} subjectType={s.subjectType} currentPlanId={s.planId} />
    </AdminPage>
  );
}
