'use client';
import { Badge, EmptyState } from '@bilardogo/ui';
import { Store } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { AdminPage, DataTable, Pagination, SearchInput, Td } from '@/components/admin-ui';
import { CityOptions, clickableRow, FilterSelect, QueryError, TableSkeleton, ToneBadge, Toolbar } from '@/components/admin/common';
import { BUSINESS_STATUS, VENUE_STATE } from '@/components/admin/labels';
import { cityName } from '@/lib/format';
import { trpc } from '@/lib/trpc/client';

export default function VenuesPage() {
  const router = useRouter();
  const [q, setQ] = useState('');
  const [city, setCity] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const onSearch = useCallback((v: string) => {
    setQ(v);
    setPage(1);
  }, []);
  const query = trpc.admin.venues.useQuery(
    { page, pageSize, q: q || undefined, cityPlate: city ? Number(city) : undefined },
    { placeholderData: (prev) => prev, refetchInterval: 30_000 },
  );

  return (
    <AdminPage title="Salonlar & Masalar" description="Salonların anlık doluluk durumu; masalar ve kimin oynadığı salon detayında">
      <Toolbar>
        <SearchInput value={q} onChange={onSearch} placeholder="Salon adı ara…" />
        <FilterSelect value={city} onChange={(v) => { setCity(v); setPage(1); }} aria-label="İl">
          <CityOptions />
        </FilterSelect>
      </Toolbar>
      {query.isLoading ? (
        <TableSkeleton />
      ) : query.error ? (
        <QueryError error={query.error} onRetry={() => query.refetch()} />
      ) : query.data && query.data.items.length === 0 ? (
        <EmptyState icon={<Store />} title="Salon bulunamadı" description="Arama veya il filtresini değiştirmeyi deneyin." />
      ) : (
        <>
          <DataTable columns={['Salon', 'Konum', 'İşletme', 'Masa', 'Dolu masa', 'Salonda', 'Durum']}>
            {query.data?.items.map((v) => (
              <tr key={v.id} className={clickableRow} onClick={() => router.push(`/salonlar/${v.id}`)}>
                <Td className="font-semibold">{v.name}</Td>
                <Td className="text-muted">{[v.district, cityName(v.cityPlate)].filter(Boolean).join(', ')}</Td>
                <Td>
                  <div className="text-sm">{v.legalName}</div>
                  <div className="mt-0.5 flex gap-1">
                    {v.businessStatus !== 'approved' ? <ToneBadge value={BUSINESS_STATUS[v.businessStatus]} /> : null}
                    {!v.businessActive ? <Badge tone="danger">İşletme pasif</Badge> : null}
                  </div>
                </Td>
                <Td>{v.tables}</Td>
                <Td>
                  <span className={v.busyTables ? 'font-semibold text-danger' : 'text-muted'}>
                    {v.busyTables}/{v.tables}
                  </span>
                </Td>
                <Td>{v.atVenue ? <Badge tone="success" dot>{v.atVenue} kişi</Badge> : <span className="text-muted">0</span>}</Td>
                <Td>
                  <ToneBadge value={VENUE_STATE[v.state]} />
                </Td>
              </tr>
            ))}
          </DataTable>
          <Pagination page={page} pageSize={pageSize} total={query.data?.total ?? 0} onChange={setPage} />
        </>
      )}
    </AdminPage>
  );
}
