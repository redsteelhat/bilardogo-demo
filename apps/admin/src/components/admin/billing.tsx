'use client';
import { Badge } from '@bilardogo/ui';
import Link from 'next/link';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { DataTable, Td } from '../admin-ui';
import { KV, ToneBadge } from './common';
import { PAYMENT_METHOD_LABELS, PAYMENT_STATUS, SUB_EVENT_LABELS, SUB_STATUS } from './labels';

const d = (x: Date | string | null | undefined) => (x ? formatDate(x, { day: 'numeric', month: 'short', year: 'numeric' }) : null);

type Payment = {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'refunded' | 'failed';
  method: string;
  paidAt: Date;
  periodStart: Date | null;
  periodEnd: Date | null;
  reference: string | null;
  note: string | null;
};

export function PaymentsTable({ payments }: { payments: Payment[] }) {
  if (!payments.length) return <p className="text-sm text-muted">Kayıtlı ödeme yok.</p>;
  return (
    <DataTable columns={['Tarih', 'Tutar', 'Durum', 'Yöntem', 'Dönem', 'Referans / not']} className="rounded-xl">
      {payments.map((p) => (
        <tr key={p.id}>
          <Td className="whitespace-nowrap">{formatDateTime(p.paidAt)}</Td>
          <Td className="whitespace-nowrap font-semibold">{formatMoney(p.amount)}</Td>
          <Td>
            <ToneBadge value={PAYMENT_STATUS[p.status]} />
          </Td>
          <Td className="text-muted">{PAYMENT_METHOD_LABELS[p.method] ?? p.method}</Td>
          <Td className="whitespace-nowrap text-muted">{p.periodStart && p.periodEnd ? `${d(p.periodStart)} – ${d(p.periodEnd)}` : '—'}</Td>
          <Td className="max-w-64 text-muted">
            {p.reference ? <div className="truncate">{p.reference}</div> : null}
            {p.note ? <div className="truncate text-xs text-subtle">{p.note}</div> : null}
            {!p.reference && !p.note ? '—' : null}
          </Td>
        </tr>
      ))}
    </DataTable>
  );
}

type SubEvent = { id: string; event: string; fromStatus: string | null; toStatus: string | null; periodEnd: Date | null; note: string | null; createdAt: Date };

export function EventsList({ events }: { events: SubEvent[] }) {
  if (!events.length) return <p className="text-sm text-muted">Henüz olay yok.</p>;
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[25px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand ring-4 ring-surface" />
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold">{SUB_EVENT_LABELS[e.event] ?? e.event}</span>
            {e.fromStatus && e.toStatus && e.fromStatus !== e.toStatus ? (
              <span className="text-xs text-muted">
                {SUB_STATUS[e.fromStatus as keyof typeof SUB_STATUS]?.label ?? e.fromStatus} → {SUB_STATUS[e.toStatus as keyof typeof SUB_STATUS]?.label ?? e.toStatus}
              </span>
            ) : null}
          </div>
          <div className="text-xs text-subtle">
            {formatDateTime(e.createdAt)}
            {e.periodEnd ? ` · bitiş ${d(e.periodEnd)}` : ''}
          </div>
          {e.note ? <div className="mt-0.5 text-sm text-muted">{e.note}</div> : null}
        </li>
      ))}
    </ol>
  );
}

type Sub = {
  id: string;
  status: keyof typeof SUB_STATUS;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  canceledAt: Date | null;
};

/** Abonelik özeti (kullanıcı / işletme detayında). */
export function SubscriptionSummary({
  subscription,
  entitlement,
  lastPaymentAt,
}: {
  subscription: Sub | null;
  entitlement?: { active: boolean; daysLeft: number | null };
  lastPaymentAt?: Date | null;
}) {
  if (!subscription) return <p className="text-sm text-muted">Abonelik kaydı yok (deneme süresi henüz başlamamış).</p>;
  const s = subscription;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ToneBadge value={SUB_STATUS[s.status]} />
        {entitlement ? (
          entitlement.active ? (
            <Badge tone="success">Erişim açık{entitlement.daysLeft !== null ? ` · ${entitlement.daysLeft} gün kaldı` : ''}</Badge>
          ) : (
            <Badge tone="danger">Erişim kapalı</Badge>
          )
        ) : null}
        <Link href={`/abonelikler/${s.id}`} className="ml-auto text-sm font-semibold text-brand hover:underline">
          Aboneliği yönet →
        </Link>
      </div>
      <KV
        items={[
          { label: 'Deneme başlangıcı', value: d(s.trialStartedAt) },
          { label: 'Deneme bitişi', value: d(s.trialEndsAt) },
          { label: 'Abonelik başlangıcı', value: d(s.currentPeriodStart) },
          { label: 'Dönem sonu / sonraki ödeme', value: d(s.status === 'trialing' ? s.trialEndsAt : s.currentPeriodEnd) },
          ...(lastPaymentAt !== undefined ? [{ label: 'Son ödeme', value: d(lastPaymentAt) }] : []),
          ...(s.canceledAt ? [{ label: 'İptal tarihi', value: d(s.canceledAt) }] : []),
        ]}
      />
    </div>
  );
}
