'use client';
import { REPORT_REASON_LABELS } from '@bilardogo/domain';
import { Badge, EmptyState, Tabs } from '@bilardogo/ui';
import { Flag, MessageSquare, Store, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AdminPage, DataTable, Pagination, Td } from '@/components/admin-ui';
import { clickableRow, FilterSelect, QueryError, TableSkeleton, Toolbar, UserCell } from '@/components/admin/common';
import { REPORT_TARGET_LABELS } from '@/components/admin/labels';
import { formatDateTime, timeAgo } from '@/lib/format';
import { trpc } from '@/lib/trpc/client';

type Status = 'open' | 'actioned' | 'dismissed';
type Target = 'user' | 'message' | 'venue';
const TARGET_ICON = { user: User, message: MessageSquare, venue: Store } as const;

/** Şikâyet anındaki içerik özeti (snapshot). */
function snapshotPreview(s: Record<string, unknown> | null): string {
  if (!s) return '';
  const pick = (k: string) => (typeof s[k] === 'string' ? (s[k] as string) : '');
  return pick('body') || pick('text') || pick('name') || pick('fullName') || pick('username') || pick('title');
}

export default function ModerationPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('open');
  const [target, setTarget] = useState<Target | ''>('');
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const q = trpc.admin.reports.useQuery({ page, pageSize, status, targetType: target || undefined }, { placeholderData: (p) => p, refetchInterval: 60_000 });

  return (
    <AdminPage title="Moderasyon" description="Kullanıcı, mesaj ve salon şikâyetleri">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Tabs
          className="w-full max-w-md"
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          tabs={[
            { value: 'open', label: 'Açık', count: status === 'open' ? q.data?.total : undefined },
            { value: 'actioned', label: 'İşlem yapılan' },
            { value: 'dismissed', label: 'Reddedilen' },
          ]}
        />
        <Toolbar className="mb-0 min-w-0 flex-1">
          <FilterSelect value={target} onChange={(v) => { setTarget(v as Target | ''); setPage(1); }} aria-label="Hedef türü">
            <option value="">Tüm hedefler</option>
            <option value="message">Mesaj</option>
            <option value="user">Kullanıcı</option>
            <option value="venue">Salon</option>
          </FilterSelect>
        </Toolbar>
      </div>
      {q.isLoading ? (
        <TableSkeleton />
      ) : q.error ? (
        <QueryError error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.items.length ? (
        <EmptyState icon={<Flag />} title={status === 'open' ? 'Açık şikâyet yok' : 'Kayıt yok'} description={status === 'open' ? 'Yeni şikâyetler burada listelenir.' : undefined} />
      ) : (
        <>
          <DataTable columns={['Hedef', 'Sebep', 'İçerik', 'Şikâyet eden', 'Tarih', status === 'open' ? '' : 'Sonuç']}>
            {q.data.items.map((r) => {
              const Icon = TARGET_ICON[r.targetType];
              const preview = snapshotPreview(r.snapshot ?? null);
              return (
                <tr key={r.id} className={clickableRow} onClick={() => router.push(`/moderasyon/${r.id}`)}>
                  <Td>
                    <span className="inline-flex items-center gap-2 text-sm font-medium">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-3 text-muted">
                        <Icon className="h-4 w-4" />
                      </span>
                      {REPORT_TARGET_LABELS[r.targetType]}
                    </span>
                  </Td>
                  <Td>
                    <Badge tone={r.reason === 'insult' || r.reason === 'inappropriate_media' ? 'danger' : r.reason === 'fake_score' ? 'warning' : 'neutral'}>
                      {REPORT_REASON_LABELS[r.reason]}
                    </Badge>
                  </Td>
                  <Td className="max-w-80">
                    {r.targetType === 'message' && r.snapshot?.conversationType === 'dm' ? (
                      <div className="text-sm italic text-subtle">Özel mesaj · içerik yalnız detayda açılır</div>
                    ) : r.targetType === 'message' ? (
                      <div className="line-clamp-2 text-sm text-muted">{preview ? `“${preview}”` : 'Mesaj içeriği şikâyet detayında'}</div>
                    ) : preview ? (
                      <div className="line-clamp-1 text-sm text-muted">{preview}</div>
                    ) : null}
                    {r.details ? <div className="line-clamp-1 text-xs text-subtle">Not: {r.details}</div> : null}
                  </Td>
                  <Td>
                    <UserCell user={r.reporter} size="xs" />
                  </Td>
                  <Td className="whitespace-nowrap text-sm text-muted" title={formatDateTime(r.createdAt)}>
                    {timeAgo(r.createdAt)}
                  </Td>
                  <Td className="text-xs text-muted">{status === 'open' ? <span className="font-semibold text-brand">İncele →</span> : r.resolutionNote}</Td>
                </tr>
              );
            })}
          </DataTable>
          <Pagination page={page} pageSize={pageSize} total={q.data.total} onChange={setPage} />
        </>
      )}
    </AdminPage>
  );
}
