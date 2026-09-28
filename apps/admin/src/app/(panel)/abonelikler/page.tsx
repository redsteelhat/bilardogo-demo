'use client';
import { EmptyState, Notice, Tabs } from '@bilardogo/ui';
import { Building2, CreditCard, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { AdminPage, DataTable, Pagination, SearchInput, Td } from '@/components/admin-ui';
import { clickableRow, FilterSelect, QueryError, TableSkeleton, ToneBadge, Toolbar } from '@/components/admin/common';
import { SUB_STATUS } from '@/components/admin/labels';
import { formatDate, formatMoney } from '@/lib/format';
import { trpc } from '@/lib/trpc/client';

type Subject = 'user' | 'business';
type Status = 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
const d = (x: Date | string | null | undefined) => (x ? formatDate(x, { day: 'numeric', month: 'short', year: 'numeric' }) : '—');

export default function SubscriptionsPage() {
  const router = useRouter();
  const [subject, setSubject] = useState<Subject | 'all'>('all');
  const [status, setStatus] = useState<Status | ''>('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const onSearch = useCallback((v: string) => {
    setQ(v);
    setPage(1);
  }, []);
  const query = trpc.admin.subscriptions.useQuery(
    { page, pageSize, subjectType: subject === 'all' ? undefined : subject, status: status || undefined, q: q || undefined },
    { placeholderData: (p) => p },
  );

  return (
    <AdminPage title="Abonelikler" description="Kullanıcı ve işletme abonelikleri, deneme süreleri ve ödemeler">
      <Notice tone="info" icon={<CreditCard />} className="mb-4">
        Bu sürümde kartla ödeme alınmaz. Havale/EFT, nakit vb. ödemeler alındıktan sonra abonelik detayından manuel olarak kaydedilir ve abonelik aktive edilir.
      </Notice>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          className="w-full max-w-sm"
          value={subject}
          onChange={(v) => {
            setSubject(v);
            setPage(1);
          }}
          tabs={[
            { value: 'all', label: 'Tümü' },
            { value: 'user', label: 'Kullanıcı' },
            { value: 'business', label: 'İşletme' },
          ]}
        />
        <Toolbar className="mb-0 min-w-0 flex-1">
          <SearchInput value={q} onChange={onSearch} placeholder="Kullanıcı veya işletme ara…" />
          <FilterSelect value={status} onChange={(v) => { setStatus(v as Status | ''); setPage(1); }} aria-label="Durum">
            <option value="">Tüm durumlar</option>
            {(['trialing', 'active', 'past_due', 'canceled', 'expired'] as const).map((s) => (
              <option key={s} value={s}>
                {SUB_STATUS[s].label}
              </option>
            ))}
          </FilterSelect>
        </Toolbar>
      </div>
      {query.isLoading ? (
        <TableSkeleton />
      ) : query.error ? (
        <QueryError error={query.error} onRetry={() => query.refetch()} />
      ) : !query.data?.items.length ? (
        <EmptyState icon={<CreditCard />} title="Abonelik bulunamadı" />
      ) : (
        <>
          <DataTable columns={['Abone', 'Plan', 'Deneme', 'Abonelik başlangıcı', 'Son ödeme', 'Sonraki ödeme', 'Durum']}>
            {query.data.items.map((s) => (
              <tr key={s.id} className={clickableRow} onClick={() => router.push(`/abonelikler/${s.id}`)}>
                <Td>
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-muted">
                      {s.subjectType === 'user' ? <User className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{s.subjectName ?? '—'}</div>
                      <div className="text-xs text-muted">{s.subjectType === 'user' ? 'Kullanıcı' : 'İşletme'}</div>
                    </div>
                  </div>
                </Td>
                <Td className="text-muted">{s.planName ?? (s.status === 'trialing' ? 'Deneme' : '—')}</Td>
                <Td className="whitespace-nowrap text-xs text-muted">
                  {s.trialStartedAt ? (
                    <>
                      {d(s.trialStartedAt)}
                      <br />→ {d(s.trialEndsAt)}
                    </>
                  ) : (
                    '—'
                  )}
                </Td>
                <Td className="whitespace-nowrap text-sm text-muted">{d(s.currentPeriodStart)}</Td>
                <Td className="whitespace-nowrap text-sm">
                  {s.lastPayment ? (
                    <>
                      <div>{formatMoney(s.lastPayment.amount)}</div>
                      <div className="text-xs text-muted">{d(s.lastPayment.at)}</div>
                    </>
                  ) : (
                    <span className="text-subtle">—</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-sm">{s.status === 'canceled' || s.status === 'expired' ? <span className="text-subtle">—</span> : d(s.nextPaymentAt)}</Td>
                <Td>
                  <ToneBadge value={SUB_STATUS[s.status]} />
                </Td>
              </tr>
            ))}
          </DataTable>
          <Pagination page={page} pageSize={pageSize} total={query.data.total} onChange={setPage} />
        </>
      )}
    </AdminPage>
  );
}
