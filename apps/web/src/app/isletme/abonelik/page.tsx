'use client';
import { Badge, Card, CardBody, CardHeader, EmptyState, Notice, StatTile } from '@bilardogo/ui';
import { CreditCard, Info, Mail, MessageCircle, Receipt, Sparkles } from 'lucide-react';
import { EntitlementBanner } from '@/components/business/dashboard';
import { BizPage, Gate, SUBSCRIPTION_STATUS_LABELS } from '@/components/business/ui';
import { ListSkeleton, QueryError } from '@/components/common/states';
import { formatDate, formatMoney } from '@/lib/format';
import { trpc } from '@/lib/trpc/client';

function intervalLabel(m: number) {
  if (m === 1) return 'aylık';
  if (m === 12) return 'yıllık';
  return `${m} aylık`;
}

const PAYMENT_STATUS = { paid: { label: 'Ödendi', tone: 'success' }, refunded: { label: 'İade', tone: 'warning' }, failed: { label: 'Başarısız', tone: 'danger' } } as const;

function Subscription({ businessId }: { businessId: string }) {
  const q = trpc.business.subscription.useQuery({ businessId });
  const settings = trpc.meta.settings.useQuery();
  if (q.isLoading) return <ListSkeleton rows={4} />;
  if (q.error) return <QueryError error={q.error} retry={() => q.refetch()} />;
  const { subscription: sub, plan, entitlement, payments, plans } = q.data!;
  const support = settings.data?.support;
  const statusTone =
    entitlement.status === 'active' ? 'success' : entitlement.status === 'trialing' ? 'info' : entitlement.status === 'past_due' ? 'warning' : 'danger';

  return (
    <div className="space-y-4">
      <EntitlementBanner entitlement={entitlement} />
      <Card>
        <CardHeader
          icon={<CreditCard className="h-5 w-5" />}
          title={plan?.name ?? (sub?.status === 'trialing' ? 'Ücretsiz deneme' : 'Abonelik')}
          description={plan ? `${formatMoney(plan.price ? Number(plan.price) : 0)} / ${intervalLabel(plan.intervalMonths)}` : 'Henüz bir plan atanmadı'}
          action={<Badge tone={statusTone}>{SUBSCRIPTION_STATUS_LABELS[entitlement.status]}</Badge>}
        />
        <CardBody>
          <div className="grid grid-cols-2 gap-2">
            <StatTile
              label="Deneme"
              value={sub?.trialEndsAt ? formatDate(sub.trialEndsAt, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              hint={sub?.trialStartedAt ? `${formatDate(sub.trialStartedAt, { day: 'numeric', month: 'short' })} başladı` : 'Bitiş tarihi'}
            />
            <StatTile
              label="Dönem sonu"
              value={sub?.currentPeriodEnd ? formatDate(sub.currentPeriodEnd, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
              hint={sub?.currentPeriodStart ? `${formatDate(sub.currentPeriodStart, { day: 'numeric', month: 'short' })} başladı` : 'Sonraki ödeme'}
            />
          </div>
          {entitlement.daysLeft != null && entitlement.active ? (
            <p className="mt-3 text-sm text-muted">
              Kalan süre: <span className="font-semibold text-fg">{entitlement.daysLeft} gün</span>
            </p>
          ) : null}
        </CardBody>
      </Card>

      <Notice tone="info" icon={<Info />} title="Ödemeler nasıl alınıyor?">
        Web/PWA döneminde abonelik ödemeleri BilardoGo ekibi tarafından manuel olarak kaydedilir. Plan seçmek veya ödeme yapmak için bizimle iletişime geç;
        ödemen kaydedildiğinde aboneliğin otomatik olarak uzar.
        {support?.email || support?.whatsapp ? (
          <span className="mt-2 flex flex-wrap gap-3">
            {support.email ? (
              <a href={`mailto:${support.email}`} className="inline-flex items-center gap-1 font-semibold text-brand underline">
                <Mail className="h-3.5 w-3.5" />
                {support.email}
              </a>
            ) : null}
            {support.whatsapp ? (
              <a
                href={`https://wa.me/${support.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-brand underline"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp: {support.whatsapp}
              </a>
            ) : null}
          </span>
        ) : null}
      </Notice>

      <Card>
        <CardHeader icon={<Sparkles className="h-5 w-5" />} title="Planlar" description="İşletmeler için güncel planlar." />
        <CardBody>
          {plans.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {plans.map((p) => (
                <li key={p.id} className={`rounded-2xl border p-3 ${plan?.id === p.id ? 'border-brand/50 bg-brand-soft' : 'border-border bg-surface-2/50'}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{p.name}</span>
                    {plan?.id === p.id ? <Badge tone="brand">Mevcut plan</Badge> : null}
                  </div>
                  <div className="mt-1 font-display text-2xl font-semibold">
                    {formatMoney(p.price)} <span className="text-sm font-normal text-muted">/ {intervalLabel(p.intervalMonths)}</span>
                  </div>
                  {p.description ? <p className="mt-1 text-xs text-muted">{p.description}</p> : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Şu an listelenen plan yok.</p>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader icon={<Receipt className="h-5 w-5" />} title="Ödeme geçmişi" />
        <CardBody>
          {payments.length ? (
            <div className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-subtle">
                    <th className="px-1 py-2 font-medium">Tarih</th>
                    <th className="px-1 py-2 font-medium">Dönem</th>
                    <th className="px-1 py-2 font-medium">Tutar</th>
                    <th className="px-1 py-2 font-medium">Durum</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td className="px-1 py-2">{formatDate(p.paidAt, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="px-1 py-2 text-muted">
                        {p.periodStart && p.periodEnd
                          ? `${formatDate(p.periodStart, { day: 'numeric', month: 'short' })} – ${formatDate(p.periodEnd, { day: 'numeric', month: 'short' })}`
                          : '—'}
                      </td>
                      <td className="px-1 py-2 font-semibold tabular-nums">{formatMoney(p.amount)}</td>
                      <td className="px-1 py-2">
                        <Badge tone={PAYMENT_STATUS[p.status].tone}>{PAYMENT_STATUS[p.status].label}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={<Receipt />} title="Henüz ödeme kaydı yok" className="py-6" />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

export default function SubscriptionPage() {
  return (
    <BizPage title="Abonelik" subtitle="Plan, deneme süresi ve ödemeler">
      <Gate ownerOnly>{({ business }) => <Subscription businessId={business.id} />}</Gate>
    </BizPage>
  );
}
