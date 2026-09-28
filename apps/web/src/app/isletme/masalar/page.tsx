'use client';
import { Button, EmptyState, Menu, MenuContent, MenuItem, MenuTrigger, Switch, cn, toast } from '@bilardogo/ui';
import { LayoutGrid, ListPlus, Pencil, Plus, Printer, QrCode, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { GameBadge } from '@/components/common/badges';
import { ListSkeleton, QueryError } from '@/components/common/states';
import { useBusiness } from '@/components/business/context';
import { QrDialog } from '@/components/business/qr-dialog';
import { FinishMatchButton, playerNames, tableStatusBadge } from '@/components/business/table-board';
import { BulkTablesDialog, TableDialog, type VenueTable } from '@/components/business/table-dialogs';
import { BizPage, ConfirmDialog, Gate, minutesSince, useNow } from '@/components/business/ui';
import { formatMinutes } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';

function TablesList({ venueId }: { venueId: string }) {
  const { isOwner, can } = useBusiness();
  const utils = trpc.useUtils();
  const now = useNow(30_000);
  const tables = trpc.business.tables.useQuery({ venueId });
  const overview = trpc.business.overview.useQuery({ venueId }, { refetchInterval: 15_000 });
  const [editing, setEditing] = useState<VenueTable | null>(null);
  const [adding, setAdding] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [qrFor, setQrFor] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<VenueTable | null>(null);

  const invalidate = () => {
    void utils.business.tables.invalidate({ venueId });
    void utils.business.overview.invalidate({ venueId });
    void utils.business.allTableQrs.invalidate({ venueId });
  };
  const toggle = trpc.business.updateTable.useMutation({
    onSuccess: (_d, v) => {
      toast.success(v.data.isActive ? `Masa ${v.data.number} aktif.` : `Masa ${v.data.number} pasife alındı.`);
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const del = trpc.business.deleteTable.useMutation({
    onSuccess: () => {
      toast.success('Masa silindi.');
      setDeleting(null);
      invalidate();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  if (tables.isLoading) return <ListSkeleton rows={5} />;
  if (tables.error) return <QueryError error={tables.error} retry={() => tables.refetch()} />;
  const list = tables.data ?? [];
  const live = new Map((overview.data?.tables ?? []).map((t) => [t.id, t]));
  const busy = overview.data?.tables.filter((t) => t.status === 'busy').length ?? 0;

  return (
    <>
      {isOwner ? (
        <div className="mb-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setAdding(true)}>
            <Plus className="h-4 w-4" />
            Masa ekle
          </Button>
          <Button size="sm" variant="secondary" onClick={() => setBulk(true)}>
            <ListPlus className="h-4 w-4" />
            Toplu ekle
          </Button>
          {list.length ? (
            <Link href="/isletme/masalar/afis">
              <Button size="sm" variant="outline">
                <Printer className="h-4 w-4" />
                Tüm afişleri yazdır
              </Button>
            </Link>
          ) : null}
        </div>
      ) : list.length ? (
        <div className="mb-3">
          <Link href="/isletme/masalar/afis">
            <Button size="sm" variant="outline">
              <Printer className="h-4 w-4" />
              Tüm afişleri yazdır
            </Button>
          </Link>
        </div>
      ) : null}

      {list.length ? (
        <>
          <p className="mb-2 text-xs text-muted">
            {list.length} masa · <span className="text-danger">{busy} dolu</span> · <span className="text-success">{list.filter((t) => t.isActive).length - busy} boş</span>
          </p>
          <ul className="grid gap-2 lg:grid-cols-2">
            {list.map((t) => {
              const l = live.get(t.id);
              return (
                <li key={t.id} className={cn('rounded-2xl border border-border bg-surface p-3', !t.isActive && 'opacity-70')}>
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl font-display text-lg font-bold',
                        l?.status === 'busy' ? 'bg-danger-soft text-danger' : l?.status === 'reserved' ? 'bg-warning-soft text-warning' : 'bg-surface-3 text-fg',
                      )}
                    >
                      {t.number}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">Masa {t.number}</span>
                        {t.label ? <span className="truncate text-xs text-muted">{t.label}</span> : null}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {t.allowedGameTypes.map((g) => (
                          <GameBadge key={g} game={g} />
                        ))}
                      </div>
                      {l?.match ? (
                        <div className="mt-1.5 text-xs text-muted">
                          <span className="text-fg">{playerNames(l) || 'Rakip bekleniyor'}</span>
                          {l.status === 'busy' ? ` · ${formatMinutes(minutesSince(l.match.startedAt, now))}` : ''}
                        </div>
                      ) : null}
                    </div>
                    {tableStatusBadge({ status: l?.status ?? 'free', isActive: t.isActive })}
                  </div>
                  <div className="mt-2.5 flex items-center gap-1.5 border-t border-border pt-2.5">
                    {isOwner ? (
                      <label className="mr-auto flex items-center gap-2 text-xs text-muted">
                        <Switch
                          checked={t.isActive}
                          disabled={toggle.isPending && toggle.variables?.tableId === t.id}
                          onCheckedChange={(v) =>
                            toggle.mutate({ tableId: t.id, data: { number: t.number, label: t.label, allowedGameTypes: t.allowedGameTypes, isActive: v } })
                          }
                          aria-label={`Masa ${t.number} aktif`}
                        />
                        {t.isActive ? 'Aktif' : 'Pasif'}
                      </label>
                    ) : (
                      <span className="mr-auto" />
                    )}
                    {l?.match && can('tables') ? <FinishMatchButton table={l} venueId={venueId} /> : null}
                    <Button size="sm" variant="outline" onClick={() => setQrFor(t.id)}>
                      <QrCode className="h-3.5 w-3.5" />
                      QR al
                    </Button>
                    {isOwner ? (
                      <Menu>
                        <MenuTrigger asChild>
                          <Button size="icon-sm" variant="ghost" aria-label={`Masa ${t.number} işlemleri`}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </MenuTrigger>
                        <MenuContent>
                          <MenuItem icon={<Pencil />} onSelect={() => setEditing(t)}>
                            Düzenle
                          </MenuItem>
                          <MenuItem icon={<Trash2 />} danger onSelect={() => setDeleting(t)}>
                            Sil
                          </MenuItem>
                        </MenuContent>
                      </Menu>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <EmptyState
          icon={<LayoutGrid />}
          title="Henüz masa yok"
          description={isOwner ? 'Masalarını tek tek veya toplu ekle; her masa için QR afişi otomatik oluşur.' : 'İşletme sahibi masaları tanımlayınca burada görünür.'}
          action={
            isOwner ? (
              <Button onClick={() => setBulk(true)}>
                <ListPlus className="h-4 w-4" />
                Toplu masa ekle
              </Button>
            ) : undefined
          }
        />
      )}

      {adding ? <TableDialog open={adding} onOpenChange={setAdding} venueId={venueId} existing={list} /> : null}
      {editing ? <TableDialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)} venueId={venueId} table={editing} existing={list} /> : null}
      {bulk ? <BulkTablesDialog open={bulk} onOpenChange={setBulk} venueId={venueId} existing={list} /> : null}
      <QrDialog tableId={qrFor} venueId={venueId} onOpenChange={(v) => !v && setQrFor(null)} canRegenerate={isOwner} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        title={deleting ? `Masa ${deleting.number} silinsin mi?` : 'Masa silinsin mi?'}
        description="Masanın QR kodu da geçersiz olur. Masada devam eden maç varsa önce maçı bitirin."
        confirmLabel="Sil"
        tone="danger"
        loading={del.isPending}
        onConfirm={() => deleting && del.mutate({ tableId: deleting.id })}
      />
    </>
  );
}

export default function TablesPage() {
  const { venue } = useBusiness();
  return (
    <BizPage title="Masalar" subtitle={venue?.name} wide>
      <Gate perm="tables">{({ venueId }) => <TablesList venueId={venueId} />}</Gate>
    </BizPage>
  );
}
