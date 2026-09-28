'use client';
import { Badge, EmptyState, Tabs } from '@bilardogo/ui';
import { Building2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { AdminPage, DataTable, Pagination, SearchInput, Td } from '@/components/admin-ui';
import { clickableRow, QueryError, TableSkeleton, ToneBadge, Toolbar } from '@/components/admin/common';
import { BUSINESS_STATUS, SUB_STATUS } from '@/components/admin/labels';
import { cityName, formatDate } from '@/lib/format';
import { trpc } from '@/lib/trpc/client';

type Tab = 'pending' | 'needs_docs' | 'approved' | 'rejected' | 'all';

export default function BusinessesPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('pending');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const onSearch = useCallback((v: string) => {
    setQ(v);
    setPage(1);
  }, []);
  const dash = trpc.admin.dashboard.useQuery();
  const query = trpc.admin.businesses.useQuery(
    { page, pageSize, status: tab === 'all' ? undefined : tab, q: q || undefined },
    { placeholderData: (prev) => prev },
  );

  return (
    <AdminPage title="İşletmeler" description="Başvuruları inceleyin, belgeleri kontrol edin ve işletme hesaplarını yönetin">
      <Tabs
        className="mb-4 max-w-2xl"
        value={tab}
        onChange={(v) => {
          setTab(v);
          setPage(1);
        }}
        tabs={[
          { value: 'pending', label: 'Bekleyen', count: dash.data?.counts.businesses_pending },
          { value: 'needs_docs', label: 'Ek belge', count: dash.data?.counts.businesses_needs_docs },
          { value: 'approved', label: 'Onaylı' },
          { value: 'rejected', label: 'Reddedilen' },
          { value: 'all', label: 'Tümü' },
        ]}
      />
      <Toolbar>
        <SearchInput value={q} onChange={onSearch} placeholder="Unvan veya VKN/TCKN ara…" />
      </Toolbar>

      {query.isLoading ? (
        <TableSkeleton />
      ) : query.error ? (
        <QueryError error={query.error} onRetry={() => query.refetch()} />
      ) : query.data && query.data.items.length === 0 ? (
        <EmptyState
          icon={<Building2 />}
          title={tab === 'pending' ? 'Onay bekleyen başvuru yok' : 'İşletme bulunamadı'}
          description={tab === 'pending' ? 'Yeni başvurular burada listelenir.' : 'Arama veya sekmeyi değiştirmeyi deneyin.'}
        />
      ) : (
        <>
          <DataTable columns={['İşletme', 'VKN / TCKN', 'Sahip', 'Salonlar', 'Durum', 'Abonelik', 'Başvuru']}>
            {query.data?.items.map((b) => (
              <tr key={b.id} className={clickableRow} onClick={() => router.push(`/isletmeler/${b.id}`)}>
                <Td>
                  <div className="font-semibold">{b.legalName}</div>
                  {!b.isActive ? <Badge tone="danger" className="mt-1">Hesap pasif</Badge> : null}
                </Td>
                <Td className="font-mono text-xs text-muted">{b.taxIdMasked}</Td>
                <Td>
                  <div className="text-sm">{b.owner.name || '—'}</div>
                  <div className="text-xs text-muted">{b.owner.username ? `@${b.owner.username}` : ''}</div>
                </Td>
                <Td>
                  {b.venues.length ? (
                    <ul className="space-y-0.5">
                      {b.venues.map((v) => (
                        <li key={v.id} className="text-sm">
                          <Link href={`/salonlar/${v.id}`} className="hover:text-brand" onClick={(e) => e.stopPropagation()}>
                            {v.name}
                          </Link>{' '}
                          <span className="text-xs text-muted">· {cityName(v.cityPlate)}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-subtle">—</span>
                  )}
                </Td>
                <Td>
                  <ToneBadge value={BUSINESS_STATUS[b.status]} />
                </Td>
                <Td>{b.subscriptionStatus ? <ToneBadge value={SUB_STATUS[b.subscriptionStatus]} /> : <span className="text-subtle">—</span>}</Td>
                <Td className="whitespace-nowrap text-muted">{formatDate(b.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</Td>
              </tr>
            ))}
          </DataTable>
          <Pagination page={page} pageSize={pageSize} total={query.data?.total ?? 0} onChange={setPage} />
        </>
      )}
    </AdminPage>
  );
}
