'use client';
import { StatTile } from '@bilardogo/ui';
import { BarChart } from '@/components/business/bar-chart';
import { BizPage, Gate } from '@/components/business/ui';
import { ListSkeleton, QueryError } from '@/components/common/states';
import { formatMinutes, formatMoney } from '@/lib/format';
import { trpc } from '@/lib/trpc/client';

function Report({ venueId }: { venueId: string }) {
  const q = trpc.business.report.useQuery({ venueId });
  if (q.isLoading) return <ListSkeleton rows={3} />;
  if (q.error) return <QueryError error={q.error} retry={() => q.refetch()} />;
  const rows = q.data ?? [];
  const matches = rows.reduce((a, r) => a + r.matches, 0);
  const minutes = rows.reduce((a, r) => a + r.minutes, 0);
  const revenue = rows.reduce((a, r) => a + r.revenue, 0);
  const activeDays = rows.filter((r) => r.matches > 0).length;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Maç" value={matches} hint="Son 30 gün" />
        <StatTile label="Masa süresi" value={formatMinutes(minutes)} hint={matches ? `Maç başına ort. ${formatMinutes(Math.round(minutes / matches))}` : '—'} />
        <StatTile label="Sipariş cirosu" value={formatMoney(revenue)} hint="Kapanan siparişler" />
        <StatTile label="Aktif gün" value={`${activeDays}/30`} hint="Maç oynanan gün" />
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        <BarChart title="Günlük maç" data={rows.map((r) => ({ day: r.day, value: r.matches }))} format={(v) => `${v} maç`} total={`${matches} maç`} />
        <BarChart title="Masa süresi" data={rows.map((r) => ({ day: r.day, value: r.minutes }))} format={(v) => formatMinutes(v)} total={formatMinutes(minutes)} />
        <BarChart title="Sipariş cirosu" data={rows.map((r) => ({ day: r.day, value: r.revenue }))} format={(v) => formatMoney(v)} total={formatMoney(revenue)} />
      </div>
      <p className="text-center text-xs text-subtle">Ciro yalnız panelden “Ödeme alındı” ile kapatılan siparişleri içerir. BilardoGo ödeme tahsil etmez.</p>
    </div>
  );
}

export default function ReportPage() {
  return (
    <BizPage title="Rapor" subtitle="Son 30 günün özeti" wide>
      <Gate ownerOnly needsApproval>
        {({ venueId }) => <Report venueId={venueId} />}
      </Gate>
    </BizPage>
  );
}
