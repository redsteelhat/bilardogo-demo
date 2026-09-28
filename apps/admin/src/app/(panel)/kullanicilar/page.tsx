'use client';
import { Badge, EmptyState } from '@bilardogo/ui';
import { Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { AdminPage, DataTable, Pagination, SearchInput, Td } from '@/components/admin-ui';
import { CityOptions, clickableRow, FilterSelect, QueryError, TableSkeleton, ToneBadge, Toolbar, UserCell } from '@/components/admin/common';
import { ACCOUNT_STATUS, ROLE_LABELS, SUB_STATUS } from '@/components/admin/labels';
import { cityName, formatDate } from '@/lib/format';
import { trpc } from '@/lib/trpc/client';

type Status = 'active' | 'passive' | 'banned';
type Role = 'user' | 'admin';

export default function UsersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Status | ''>('');
  const [role, setRole] = useState<Role | ''>('');
  const [city, setCity] = useState('');
  const pageSize = 25;
  const onSearch = useCallback((v: string) => {
    setQ(v);
    setPage(1);
  }, []);
  const query = trpc.admin.users.useQuery(
    { page, pageSize, q: q || undefined, status: status || undefined, role: role || undefined, cityPlate: city ? Number(city) : undefined },
    { placeholderData: (prev) => prev },
  );

  return (
    <AdminPage title="Kullanıcılar" description="Tüm kullanıcılar, hesap durumları ve abonelikleri">
      <Toolbar>
        <SearchInput value={q} onChange={onSearch} placeholder="Ad veya kullanıcı adı ara…" />
        <FilterSelect value={status} onChange={(v) => { setStatus(v as Status | ''); setPage(1); }} aria-label="Durum">
          <option value="">Tüm durumlar</option>
          <option value="active">Aktif</option>
          <option value="passive">Pasif</option>
          <option value="banned">Banlı</option>
        </FilterSelect>
        <FilterSelect value={role} onChange={(v) => { setRole(v as Role | ''); setPage(1); }} aria-label="Rol">
          <option value="">Tüm roller</option>
          <option value="user">Kullanıcı</option>
          <option value="admin">Admin</option>
        </FilterSelect>
        <FilterSelect value={city} onChange={(v) => { setCity(v); setPage(1); }} aria-label="İl">
          <CityOptions />
        </FilterSelect>
      </Toolbar>

      {query.isLoading ? (
        <TableSkeleton />
      ) : query.error ? (
        <QueryError error={query.error} onRetry={() => query.refetch()} />
      ) : query.data && query.data.items.length === 0 ? (
        <EmptyState icon={<Users />} title="Kullanıcı bulunamadı" description="Arama veya filtreleri değiştirmeyi deneyin." />
      ) : (
        <>
          <DataTable columns={['Kullanıcı', 'Şehir', 'Durum', 'Rol', 'Abonelik', 'Kayıt']}>
            {query.data?.items.map((it) => (
              <tr key={it.user.id} className={clickableRow} onClick={() => router.push(`/kullanicilar/${it.user.id}`)}>
                <Td>
                  <UserCell user={it.user} />
                </Td>
                <Td className="text-muted">{cityName(it.user.cityPlate) || '—'}</Td>
                <Td>
                  <ToneBadge value={ACCOUNT_STATUS[it.status]} />
                </Td>
                <Td>{it.role === 'admin' ? <Badge tone="brand">{ROLE_LABELS.admin}</Badge> : <span className="text-muted">{ROLE_LABELS.user}</span>}</Td>
                <Td>
                  {it.subscription ? (
                    <div className="space-y-0.5">
                      <ToneBadge value={SUB_STATUS[it.subscription.status]} />
                      {it.subscription.endsAt ? <div className="text-xs text-muted">Bitiş: {formatDate(it.subscription.endsAt, { day: 'numeric', month: 'short', year: 'numeric' })}</div> : null}
                    </div>
                  ) : (
                    <span className="text-subtle">—</span>
                  )}
                </Td>
                <Td className="whitespace-nowrap text-muted">{formatDate(it.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}</Td>
              </tr>
            ))}
          </DataTable>
          <Pagination page={page} pageSize={pageSize} total={query.data?.total ?? 0} onChange={setPage} />
        </>
      )}
    </AdminPage>
  );
}
