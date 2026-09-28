'use client';
import { PLAY_INTENT_LABELS } from '@bilardogo/domain';
import { Badge, Card, EmptyState, Notice, SectionTitle, StatTile } from '@bilardogo/ui';
import { CalendarClock, ChevronRight, ClipboardList, Clock, CreditCard, LayoutGrid, MapPin, Users } from 'lucide-react';
import Link from 'next/link';
import { ListSkeleton, QueryError } from '@/components/common/states';
import { UserChip } from '@/components/common/user-chip';
import { formatDate, formatMinutes, formatMoney, formatTime, timeAgo } from '@/lib/format';
import { trpc } from '@/lib/trpc/client';
import type { MyBusiness } from './context';
import { useBusiness } from './context';
import { TableBoard } from './table-board';

export function EntitlementBanner({ entitlement }: { entitlement: MyBusiness['entitlement'] }) {
  if (!entitlement) return null;
  const { status, active, daysLeft, endsAt } = entitlement;
  const link = (
    <Link href="/isletme/abonelik" className="font-semibold text-brand underline">
      Abonelik
    </Link>
  );
  if (status === 'trialing' && active) {
    return (
      <Notice tone={(daysLeft ?? 0) <= 7 ? 'warning' : 'info'} icon={<CreditCard />} title={`Ücretsiz deneme: ${daysLeft ?? 0} gün kaldı`}>
        Deneme süren {formatDate(endsAt)} tarihinde bitiyor. Ayrıntılar için {link}.
      </Notice>
    );
  }
  if (status === 'past_due' && active) {
    return (
      <Notice tone="warning" icon={<CreditCard />} title="Ödemen gecikti">
        Hizmetin kesintiye uğramaması için ödemeni yap. {link}
      </Notice>
    );
  }
  if (!active) {
    return (
      <Notice tone="danger" icon={<CreditCard />} title={status === 'none' ? 'Aktif abonelik yok' : 'Aboneliğinin süresi doldu'}>
        Salonunun BilardoGo’da görünmeye devam etmesi için aboneliğini yenile. {link}
      </Notice>
    );
  }
  return null;
}

export function Dashboard({ venueId }: { venueId: string }) {
  const { business, can } = useBusiness();
  const q = trpc.business.overview.useQuery({ venueId }, { refetchInterval: 15_000 });
  const o = q.data;
  const busy = o?.tables.filter((t) => t.status === 'busy').length ?? 0;
  const free = o?.tables.filter((t) => t.status === 'free' && t.isActive).length ?? 0;

  return (
    <div className="space-y-4">
      {business ? <EntitlementBanner entitlement={business.entitlement} /> : null}

      {q.isLoading ? (
        <ListSkeleton rows={4} />
      ) : q.error ? (
        <QueryError error={q.error} retry={() => q.refetch()} />
      ) : o ? (
        <>
          <div className="grid grid-cols-3 gap-2">
            <StatTile label="Başlayan maç" value={o.today.matchesStarted} hint="Bugün" />
            <StatTile label="Masa süresi" value={formatMinutes(o.today.tableMinutes)} hint="Bugün toplam" />
            <StatTile label="Ciro" value={formatMoney(o.today.revenue)} hint="Kapanan siparişler" />
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {can('orders') ? (
              <Link href="/isletme/siparisler">
                <Card className="flex items-center gap-3 p-3.5 transition-colors hover:border-brand/40">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-soft text-brand">
                    <ClipboardList className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">Açık siparişler</div>
                    <div className="text-xs text-muted">{o.openOrders ? 'Hazırlanacak ve kapatılacak siparişler' : 'Şu an açık sipariş yok'}</div>
                  </div>
                  <span className="font-display text-2xl font-bold text-brand">{o.openOrders}</span>
                  <ChevronRight className="h-4 w-4 text-subtle" />
                </Card>
              </Link>
            ) : null}
            <Card className="flex items-center gap-3 p-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-info-soft text-info">
                <CalendarClock className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">Maç yapacak</div>
                <div className="text-xs text-muted">Salonunda eşleşmiş, masaya geçmemiş maçlar</div>
              </div>
              <span className="font-display text-2xl font-bold">{o.upcomingMatches}</span>
            </Card>
          </div>

          <SectionTitle
            icon={<LayoutGrid />}
            action={
              <span className="text-xs text-muted">
                <span className="font-semibold text-danger">{busy} dolu</span> · <span className="font-semibold text-success">{free} boş</span>
              </span>
            }
          >
            Masalar
          </SectionTitle>
          {o.tables.length ? (
            <TableBoard overview={o} venueId={venueId} canFinish={can('tables')} />
          ) : (
            <EmptyState
              icon={<LayoutGrid />}
              title="Henüz masa tanımlanmadı"
              description={business?.role === 'owner' ? 'Masalarını ekleyip QR afişlerini yazdır.' : 'İşletme sahibi masaları tanımlayınca burada görünür.'}
              action={
                business?.role === 'owner' ? (
                  <Link href="/isletme/masalar" className="text-sm font-semibold text-brand underline">
                    Masa ekle
                  </Link>
                ) : undefined
              }
            />
          )}

          <SectionTitle icon={<MapPin />} count={o.atVenue.length}>
            Salonda
          </SectionTitle>
          {o.atVenue.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {o.atVenue.map((p) => (
                <li key={p.user.id} className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-3">
                  <UserChip user={p.user} status="at_venue" subtitle={`${timeAgo(p.since)} geldi`} className="flex-1" />
                  {p.playIntent ? (
                    <Badge tone={p.playIntent === 'wants' ? 'brand' : 'neutral'}>{PLAY_INTENT_LABELS[p.playIntent]}</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted">Şu an salonda görünen oyuncu yok.</p>
          )}

          <SectionTitle icon={<Clock />} count={o.coming.length}>
            Birazdan gelecek
          </SectionTitle>
          {o.coming.length ? (
            <ul className="grid gap-2 sm:grid-cols-2">
              {o.coming.map((p) => (
                <li key={p.user.id} className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-3">
                  <UserChip user={p.user} status="coming" subtitle={p.eta ? `Tahmini varış ${formatTime(p.eta)}` : 'Geleceğim dedi'} className="flex-1" />
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted">Gelmekte olan oyuncu yok.</p>
          )}

          <p className="flex items-center justify-center gap-1.5 pt-2 text-[11px] text-subtle">
            <Users className="h-3 w-3" /> Pano her 15 saniyede bir güncellenir.
          </p>
        </>
      ) : null}
    </div>
  );
}
