'use client';
import { GAME_SHORT_LABELS, MATCH_STATUS_LABELS } from '@bilardogo/domain';
import { Avatar, Badge, Button, Card, EmptyState, Skeleton, StatTile, toast } from '@bilardogo/ui';
import { ExternalLink, Power, RefreshCw, Table2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { AdminPage, ConfirmDialog } from '@/components/admin-ui';
import { BackLink, QueryError, ToneBadge } from '@/components/admin/common';
import { BUSINESS_STATUS, VENUE_STATE } from '@/components/admin/labels';
import { cityName, formatMinutes, formatTime } from '@/lib/format';
import { errorMessage, trpc } from '@/lib/trpc/client';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? '';

export default function VenueDetailPage() {
  const { id } = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  // Salon özet bilgisi için ayrı bir uç yok; liste sorgusundan bulunur.
  const list = trpc.admin.venues.useQuery({ page: 1, pageSize: 100 }, { refetchInterval: 30_000 });
  const venue = list.data?.items.find((v) => v.id === id);
  const tables = trpc.admin.venueTables.useQuery({ venueId: id }, { refetchInterval: 15_000 });
  const [stateOpen, setStateOpen] = useState(false);
  const setState = trpc.admin.setVenueState.useMutation({
    onSuccess: async (_d, v) => {
      toast.success(v.state === 'active' ? 'Salon aktif.' : 'Salon pasife alındı.');
      setStateOpen(false);
      await Promise.all([utils.admin.venues.invalidate(), utils.admin.dashboard.invalidate()]);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const busy = tables.data?.filter((t) => t.match).length ?? 0;
  const active = tables.data?.filter((t) => t.isActive).length ?? 0;

  return (
    <AdminPage
      title={venue?.name ?? (list.isLoading ? <Skeleton className="h-9 w-64" /> : 'Salon')}
      description={
        venue ? (
          <span className="flex flex-wrap items-center gap-2">
            <ToneBadge value={VENUE_STATE[venue.state]} />
            {venue.businessStatus !== 'approved' ? <ToneBadge value={BUSINESS_STATUS[venue.businessStatus]} /> : null}
            {!venue.businessActive ? <Badge tone="danger">İşletme pasif</Badge> : null}
            <span>
              {[venue.district, cityName(venue.cityPlate)].filter(Boolean).join(', ')} · {venue.legalName}
            </span>
          </span>
        ) : undefined
      }
      actions={
        venue ? (
          <>
            <Button variant="ghost" size="sm" onClick={() => tables.refetch()} loading={tables.isFetching}>
              <RefreshCw className="h-4 w-4" /> Yenile
            </Button>
            <Button variant="secondary" size="sm" onClick={() => window.open(`${APP_URL}/salon/${venue.slug}`, '_blank', 'noopener')}>
              <ExternalLink className="h-4 w-4" /> Genel sayfa
            </Button>
            <Button variant={venue.state === 'active' ? 'danger' : 'success'} size="sm" onClick={() => setStateOpen(true)}>
              <Power className="h-4 w-4" /> {venue.state === 'active' ? 'Pasife al' : 'Aktif yap'}
            </Button>
          </>
        ) : null
      }
    >
      <BackLink href="/salonlar">Salonlar</BackLink>
      {list.error ? <QueryError error={list.error} onRetry={() => list.refetch()} /> : null}

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Aktif masa" value={tables.isLoading ? '…' : active} />
        <StatTile label="Dolu masa" value={tables.isLoading ? '…' : busy} />
        <StatTile label="Boş masa" value={tables.isLoading ? '…' : Math.max(0, active - busy)} />
        <StatTile label="Şu an salonda" value={venue ? venue.atVenue : '…'} hint="Salondayım diyen oyuncu" />
      </div>

      <h2 className="mb-3 font-display text-xl font-semibold">Canlı masa durumu</h2>
      {tables.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-36" />
          ))}
        </div>
      ) : tables.error ? (
        <QueryError error={tables.error} onRetry={() => tables.refetch()} />
      ) : !tables.data?.length ? (
        <EmptyState icon={<Table2 />} title="Masa tanımlı değil" description="İşletme panelinden masa eklendiğinde burada görünür." />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tables.data.map((t) => {
            const m = t.match;
            const mins = m ? Math.max(0, Math.round((Date.now() - new Date(m.startedAt).getTime()) / 60000)) : 0;
            return (
              <Card key={t.id} className={m ? 'border-danger/40 p-4' : t.isActive ? 'p-4' : 'p-4 opacity-60'}>
                <div className="flex items-center gap-2">
                  <span className="font-display text-2xl font-semibold">Masa {t.number}</span>
                  {t.label ? <span className="text-sm text-muted">· {t.label}</span> : null}
                  <span className="ml-auto">
                    {!t.isActive ? <Badge>Kapalı</Badge> : m ? <Badge tone="danger" dot>Dolu</Badge> : <Badge tone="success" dot>Boş</Badge>}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {t.allowedGameTypes.map((g) => (
                    <span key={g} className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                      {GAME_SHORT_LABELS[g]}
                    </span>
                  ))}
                </div>
                {m ? (
                  <div className="mt-3 rounded-xl bg-surface-2 p-3">
                    <div className="flex items-center justify-between text-xs text-muted">
                      <span>
                        {GAME_SHORT_LABELS[m.gameType]} · {MATCH_STATUS_LABELS[m.status]}
                      </span>
                      <span>
                        Başlangıç {formatTime(m.startedAt)} · {formatMinutes(mins)}
                      </span>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {m.players.map((p) =>
                        p ? (
                          <Link key={p.id} href={`/kullanicilar/${p.id}`} className="flex items-center gap-2 text-sm hover:text-brand">
                            <Avatar name={p.displayName} src={p.avatarUrl} size="xs" />
                            {p.displayName}
                          </Link>
                        ) : null,
                      )}
                      {m.status === 'waiting_opponent' ? <div className="text-xs text-subtle">Rakibin QR okutması bekleniyor…</div> : null}
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
      <p className="mt-3 text-xs text-subtle">Masa durumu 15 saniyede bir yenilenir.</p>

      {venue ? (
        <ConfirmDialog
          open={stateOpen}
          onOpenChange={setStateOpen}
          title={venue.state === 'active' ? 'Salon pasife alınsın mı?' : 'Salon aktif yapılsın mı?'}
          description={
            venue.state === 'active'
              ? 'Pasif salon uygulamada listelenmez, yeni maç ve sipariş alınamaz.'
              : 'Salon yeniden uygulamada listelenir.'
          }
          confirmLabel={venue.state === 'active' ? 'Pasife al' : 'Aktif yap'}
          tone={venue.state === 'active' ? 'danger' : 'primary'}
          loading={setState.isPending}
          onConfirm={() => setState.mutate({ venueId: id, state: venue.state === 'active' ? 'passive' : 'active' })}
        />
      ) : null}
    </AdminPage>
  );
}
