'use client';
import { Badge, Button, Dialog, DialogContent, EmptyState, Skeleton, StatTile, toast } from '@bilardogo/ui';
import { BarChart3, Megaphone, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { AdminPage, ConfirmDialog, DataTable, Td } from '@/components/admin-ui';
import { AdEditor, type Ad } from '@/components/admin/ad-editor';
import { cityList, QueryError, TableSkeleton } from '@/components/admin/common';
import { AD_PLACEMENT_LABELS } from '@/components/admin/labels';
import { formatDate } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';

const ctr = (i: number, c: number) => (i ? `%${((c / i) * 100).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}` : '—');
const nf = (n: number) => n.toLocaleString('tr-TR');
const dshort = (d: Date | string) => formatDate(d, { day: 'numeric', month: 'short', year: '2-digit' });

export default function AdsPage() {
  const utils = trpc.useUtils();
  const q = trpc.admin.ads.useQuery();
  const [editing, setEditing] = useState<Ad | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Ad | null>(null);
  const [stats, setStats] = useState<Ad | null>(null);
  const del = trpc.admin.deleteAd.useMutation({
    onSuccess: async () => {
      toast.success('Reklam silindi.');
      setDeleting(null);
      await utils.admin.ads.invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const now = Date.now();

  return (
    <AdminPage
      title="Reklam / Sponsor"
      description="Reklamları Türkiye geneli veya il bazlı yayınlayın; gösterim ve tıklamaları izleyin"
      actions={
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Yeni reklam
        </Button>
      }
    >
      {q.isLoading ? (
        <TableSkeleton />
      ) : q.error ? (
        <QueryError error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data?.length ? (
        <EmptyState icon={<Megaphone />} title="Henüz reklam yok" action={<Button size="sm" onClick={() => setCreating(true)}>Yeni reklam</Button>} />
      ) : (
        <DataTable columns={['Marka', 'Kapsam', 'Yerleşim', 'Tarih aralığı', 'Durum', 'Gösterim', 'Tıklama', 'CTR', '']}>
          {q.data.map((a) => {
            const upcoming = new Date(a.startsAt).getTime() > now;
            const ended = new Date(a.endsAt).getTime() <= now;
            return (
              <tr key={a.id} className="hover:bg-surface-2">
                <Td>
                  <button type="button" className="flex items-center gap-3 text-left" onClick={() => setEditing(a)}>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-3 text-subtle">
                      {a.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={a.logoUrl} alt="" className="h-full w-full object-contain" />
                      ) : (
                        <Megaphone className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold hover:text-brand">{a.brand}</div>
                      <div className="line-clamp-1 max-w-56 text-xs text-muted">{a.product || a.priceText || '—'}</div>
                    </div>
                  </button>
                </Td>
                <Td className="max-w-40 text-sm">{a.scope === 'country' ? 'Türkiye geneli' : <span className="text-muted">{cityList(a.cityPlates)}</span>}</Td>
                <Td>
                  <div className="flex flex-wrap gap-1">
                    {a.placements.map((p) => (
                      <Badge key={p}>{AD_PLACEMENT_LABELS[p]}</Badge>
                    ))}
                  </div>
                </Td>
                <Td className="whitespace-nowrap text-sm text-muted">
                  {dshort(a.startsAt)} – {dshort(a.endsAt)}
                </Td>
                <Td>
                  {a.live ? (
                    <Badge tone="success" dot>
                      Canlı
                    </Badge>
                  ) : !a.isActive ? (
                    <Badge>Kapalı</Badge>
                  ) : upcoming ? (
                    <Badge tone="info">Başlamadı</Badge>
                  ) : ended ? (
                    <Badge tone="warning">Bitti</Badge>
                  ) : (
                    <Badge>Yayında değil</Badge>
                  )}
                </Td>
                <Td>{nf(a.impressions)}</Td>
                <Td>{nf(a.clicks)}</Td>
                <Td className="font-semibold">{ctr(a.impressions, a.clicks)}</Td>
                <Td className="whitespace-nowrap text-right">
                  <Button size="icon-sm" variant="ghost" aria-label="Günlük istatistik" onClick={() => setStats(a)}>
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Düzenle" onClick={() => setEditing(a)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label="Sil" onClick={() => setDeleting(a)}>
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </Td>
              </tr>
            );
          })}
        </DataTable>
      )}

      <AdEditor ad={editing} open={creating || !!editing} onClose={() => { setCreating(false); setEditing(null); }} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Reklam silinsin mi?"
        description={`${deleting?.brand ?? ''} reklamı ve istatistikleri kalıcı olarak silinir. Yayından kaldırmak için “Aktif” anahtarını kapatabilirsiniz.`}
        confirmLabel="Sil"
        tone="danger"
        loading={del.isPending}
        onConfirm={() => deleting && del.mutate({ id: deleting.id })}
      />
      <Dialog open={!!stats} onOpenChange={(o) => !o && setStats(null)}>
        {stats ? (
          <DialogContent title={`${stats.brand} · günlük istatistik`} className="sm:max-w-2xl">
            <AdDaily ad={stats} />
          </DialogContent>
        ) : null}
      </Dialog>
    </AdminPage>
  );
}

function AdDaily({ ad }: { ad: Ad }) {
  const q = trpc.admin.adDaily.useQuery({ adId: ad.id });
  if (q.isLoading) return <Skeleton className="h-48" />;
  if (q.error) return <QueryError error={q.error} onRetry={() => q.refetch()} />;
  const rows = (q.data ?? []).slice(-30);
  const max = Math.max(1, ...rows.map((r) => r.impressions));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <StatTile label="Gösterim" value={nf(ad.impressions)} />
        <StatTile label="Tıklama" value={nf(ad.clicks)} />
        <StatTile label="CTR" value={ctr(ad.impressions, ad.clicks)} />
      </div>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Henüz gösterim yok.</p>
      ) : (
        <>
          <div className="flex h-44 items-end gap-1">
            {rows.map((r) => (
              <div key={r.day} className="group relative flex h-full flex-1 flex-col justify-end" title={`${r.day}: ${r.impressions} gösterim, ${r.clicks} tıklama`}>
                <div className="relative w-full rounded-t bg-brand/30" style={{ height: `${(r.impressions / max) * 100}%`, minHeight: 2 }}>
                  <div className="absolute inset-x-0 bottom-0 rounded-t bg-brand" style={{ height: `${r.impressions ? (r.clicks / r.impressions) * 100 : 0}%`, minHeight: r.clicks ? 2 : 0 }} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-[11px] text-subtle">
            <span>{formatDate(rows[0]!.day, { day: 'numeric', month: 'short' })}</span>
            <span className="flex items-center gap-3">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-brand/30" /> Gösterim</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-brand" /> Tıklama</span>
            </span>
            <span>{formatDate(rows[rows.length - 1]!.day, { day: 'numeric', month: 'short' })}</span>
          </div>
          <div className="max-h-48 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-surface-2 text-xs text-subtle">
                <tr>
                  <th className="px-3 py-2 text-left">Gün</th>
                  <th className="px-3 py-2 text-right">Gösterim</th>
                  <th className="px-3 py-2 text-right">Tıklama</th>
                  <th className="px-3 py-2 text-right">CTR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...rows].reverse().map((r) => (
                  <tr key={r.day}>
                    <td className="px-3 py-1.5">{formatDate(r.day, { day: 'numeric', month: 'long', weekday: 'short' })}</td>
                    <td className="px-3 py-1.5 text-right">{nf(r.impressions)}</td>
                    <td className="px-3 py-1.5 text-right">{nf(r.clicks)}</td>
                    <td className="px-3 py-1.5 text-right text-muted">{ctr(r.impressions, r.clicks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
