'use client';
import { Button, EmptyState, Segmented } from '@bilardogo/ui';
import { ChevronRight, ScrollText } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useState } from 'react';
import { AdminPage, DataTable, Td } from '@/components/admin-ui';
import { QueryError, TableSkeleton, UserCell } from '@/components/admin/common';
import { AUDIT_ACTION_LABELS, AUDIT_ACTION_PREFIXES } from '@/components/admin/labels';
import { formatDateTime } from '@/lib/format';
import { trpc } from '@/lib/trpc/client';

/** Denetim hedefinden ilgili admin sayfasına bağlantı. */
function targetHref(type: string | null, id: string | null): string | null {
  if (!type || !id) return null;
  switch (type) {
    case 'user':
      return `/kullanicilar/${id}`;
    case 'business':
      return `/isletmeler/${id}`;
    case 'venue':
      return `/salonlar/${id}`;
    case 'report':
      return `/moderasyon/${id}`;
    case 'subscription':
      return `/abonelikler/${id}`;
    case 'bulletin':
      return '/bulten';
    case 'ad':
      return '/reklamlar';
    case 'template':
      return '/bildirim-sablonlari';
    case 'setting':
      return '/ayarlar';
    case 'legal':
      return '/sozlesmeler';
    default:
      return null;
  }
}

const TARGET_LABELS: Record<string, string> = {
  user: 'Kullanıcı',
  business: 'İşletme',
  venue: 'Salon',
  match: 'Maç',
  message: 'Mesaj',
  report: 'Şikâyet',
  subscription: 'Abonelik',
  bulletin: 'Bülten',
  ad: 'Reklam',
  template: 'Şablon',
  setting: 'Ayar',
  legal: 'Sözleşme',
  table: 'Masa',
};

export default function AuditPage() {
  const [prefix, setPrefix] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const q = trpc.admin.auditLog.useInfiniteQuery({ action: prefix || undefined }, { getNextPageParam: (last) => last.nextCursor ?? undefined });
  const items = q.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <AdminPage title="Denetim kaydı" description="Admin ve sistem işlemlerinin değiştirilemez kaydı (şikâyet bağlamı açılışları dahil)">
      <Segmented wrap size="sm" className="mb-4" value={prefix} onChange={(v) => { setPrefix(v); setOpen(null); }} options={AUDIT_ACTION_PREFIXES.map((p) => ({ value: p.value, label: p.label }))} />
      {q.isLoading ? (
        <TableSkeleton rows={10} />
      ) : q.error ? (
        <QueryError error={q.error} onRetry={() => q.refetch()} />
      ) : !items.length ? (
        <EmptyState icon={<ScrollText />} title="Kayıt yok" description="Bu filtreye uyan işlem bulunmuyor." />
      ) : (
        <>
          <DataTable columns={['Zaman', 'Yapan', 'İşlem', 'Hedef', 'Ayrıntı']}>
            {items.map((r) => {
              const href = targetHref(r.targetType, r.targetId);
              const hasMeta = !!r.meta && Object.keys(r.meta).length > 0;
              const expanded = open === r.id;
              return (
                <Fragment key={r.id}>
                  <tr className="hover:bg-surface-2">
                    <Td className="whitespace-nowrap text-sm text-muted">{formatDateTime(r.createdAt)}</Td>
                    <Td>{r.actor ? <UserCell user={r.actor} size="xs" /> : <span className="text-sm text-subtle">Sistem</span>}</Td>
                    <Td>
                      <div className="text-sm font-medium">{AUDIT_ACTION_LABELS[r.action] ?? r.action}</div>
                      <code className="text-[11px] text-subtle">{r.action}</code>
                    </Td>
                    <Td className="text-sm">
                      {r.targetType ? (
                        <>
                          <span className="text-muted">{TARGET_LABELS[r.targetType] ?? r.targetType}</span>
                          {r.targetId ? (
                            <div className="font-mono text-[11px]">
                              {href ? (
                                <Link href={href} className="text-brand hover:underline">
                                  {r.targetId.length > 13 ? `${r.targetId.slice(0, 8)}…` : r.targetId}
                                </Link>
                              ) : (
                                <span className="text-subtle">{r.targetId.length > 13 ? `${r.targetId.slice(0, 8)}…` : r.targetId}</span>
                              )}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </Td>
                    <Td>
                      {hasMeta ? (
                        <button type="button" onClick={() => setOpen(expanded ? null : r.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-fg">
                          <ChevronRight className={expanded ? 'h-3.5 w-3.5 rotate-90 transition-transform' : 'h-3.5 w-3.5 transition-transform'} />
                          {expanded ? 'Gizle' : 'Göster'}
                        </button>
                      ) : (
                        <span className="text-subtle">—</span>
                      )}
                    </Td>
                  </tr>
                  {expanded ? (
                    <tr>
                      <td colSpan={5} className="bg-surface-2/60 px-4 py-3">
                        <pre className="max-h-72 overflow-auto rounded-xl bg-bg p-3 font-mono text-xs text-fg/90">{JSON.stringify(r.meta, null, 2)}</pre>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}
          </DataTable>
          <div className="mt-4 flex items-center justify-between text-sm text-muted">
            <span>{items.length} kayıt gösteriliyor</span>
            {q.hasNextPage ? (
              <Button variant="secondary" size="sm" loading={q.isFetchingNextPage} onClick={() => q.fetchNextPage()}>
                Daha eski kayıtlar
              </Button>
            ) : (
              <span>Tüm kayıtlar yüklendi.</span>
            )}
          </div>
        </>
      )}
    </AdminPage>
  );
}
