'use client';
import { Card, StatTile } from '@bilardogo/ui';
import Link from 'next/link';
import { AdminPage } from '@/components/admin-ui';
import { trpc } from '@/lib/trpc/client';

export default function DashboardPage() {
  const q = trpc.admin.dashboard.useQuery(undefined, { refetchInterval: 30_000 });
  const c = q.data?.counts ?? {};
  const max = Math.max(1, ...(q.data?.signups.map((s) => s.n) ?? [1]));
  const tiles: { label: string; value: number | undefined; href?: string; hint?: string }[] = [
    { label: 'Kullanıcı', value: c.users, href: '/kullanicilar', hint: `+${c.new_users_7d ?? 0} son 7 gün` },
    { label: 'Şu an salonda', value: c.at_venue_now },
    { label: 'Canlı maç', value: c.matches_live, href: '/maclar' },
    { label: 'Son 24 saatte tamamlanan maç', value: c.matches_completed_24h, href: '/maclar' },
    { label: 'Onay bekleyen işletme', value: c.businesses_pending, href: '/isletmeler', hint: `${c.businesses_needs_docs ?? 0} ek belge bekliyor` },
    { label: 'Aktif salon', value: c.venues_active, href: '/salonlar' },
    { label: 'Açık şikâyet', value: c.reports_open, href: '/moderasyon' },
    { label: 'Açık sipariş', value: c.orders_open },
    { label: 'Deneme süresinde', value: c.subs_trialing, href: '/abonelikler' },
    { label: 'Aktif abonelik', value: c.subs_active, href: '/abonelikler' },
    { label: 'Süresi geçmiş / ödeme bekleyen', value: c.subs_lapsed, href: '/abonelikler' },
  ];
  return (
    <AdminPage title="Panel" description="BilardoGo genel durumu">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {tiles.map((t) => {
          const tile = <StatTile label={t.label} value={q.isLoading ? '…' : (t.value ?? 0)} hint={t.hint} className="h-full" />;
          return t.href ? (
            <Link key={t.label} href={t.href} className="block transition-transform hover:-translate-y-0.5">
              {tile}
            </Link>
          ) : (
            <div key={t.label}>{tile}</div>
          );
        })}
      </div>
      <Card className="mt-6 p-5">
        <div className="mb-4 font-display text-lg font-semibold">Son 14 gün yeni kayıt</div>
        <div className="flex h-40 items-end gap-2">
          {(q.data?.signups ?? []).map((s) => (
            <div key={s.day} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] text-muted">{s.n}</span>
              <div className="w-full rounded-t-md bg-brand/80" style={{ height: `${(s.n / max) * 100}%`, minHeight: 2 }} />
              <span className="text-[10px] text-subtle">{s.day.slice(8, 10)}</span>
            </div>
          ))}
        </div>
      </Card>
    </AdminPage>
  );
}
