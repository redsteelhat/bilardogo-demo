'use client';
import { Button, Card, Notice } from '@bilardogo/ui';
import { Building2, ClipboardList, LayoutGrid, Megaphone, QrCode, ShieldCheck, Store, Users } from 'lucide-react';
import Link from 'next/link';
import { PageLoading, QueryError } from '@/components/common/states';
import { ApplicationStatus } from '@/components/business/application-status';
import { useBusiness } from '@/components/business/context';
import { Dashboard } from '@/components/business/dashboard';
import { BizPage } from '@/components/business/ui';

const FEATURES = [
  { icon: LayoutGrid, title: 'Canlı masa panosu', text: 'Hangi masa dolu, kim oynuyor, ne süredir — anlık gör.' },
  { icon: QrCode, title: 'Masa QR kodları', text: 'Her masaya özel QR afişi; oyuncular okutunca maç masaya bağlanır.' },
  { icon: ClipboardList, title: 'Salon içi sipariş', text: 'Çay, tost, içecek siparişleri masadan panele düşer. Ödeme kasada.' },
  { icon: Megaphone, title: 'Duyuru ve kampanya', text: 'Takipçilerine “17.00–19.00 arası %10 indirim” gibi duyurular gönder.' },
  { icon: Users, title: 'Çalışan hesapları', text: 'Çalışanlarına yalnız gereken yetkileri ver.' },
];

function Intro() {
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-brand/25 via-brand/5 to-transparent p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-brand-fg">
            <Store className="h-6 w-6" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-semibold leading-tight">Salonunu BilardoGo’ya ekle</h2>
          <p className="mt-1.5 text-sm text-muted">
            Şehrindeki oyuncular salonunu görsün, masalarını QR ile yönet, siparişleri tek ekrandan takip et. İlk 30 gün ücretsiz.
          </p>
          <Link href="/isletme/basvuru" className="mt-5 block">
            <Button size="lg" block>
              <Building2 className="h-5 w-5" />
              İşletme hesabı oluştur
            </Button>
          </Link>
        </div>
      </Card>
      <div className="grid gap-2 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="flex gap-3 rounded-2xl border border-border bg-surface p-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
              <f.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="font-semibold">{f.title}</div>
              <p className="text-xs text-muted">{f.text}</p>
            </div>
          </div>
        ))}
      </div>
      <Notice tone="info" icon={<ShieldCheck />} title="Başvuru nasıl işler?">
        Ticari bilgilerini ve salon bilgilerini girersin, belgelerini yüklersin. BilardoGo ekibi inceleyip onayladığında salonun uygulamada
        görünür. Onay beklerken masalarını ve menünü hazırlayabilirsin.
      </Notice>
    </div>
  );
}

export default function BusinessHomePage() {
  const b = useBusiness();
  if (b.loading) return <PageLoading />;
  if (b.error) {
    return (
      <BizPage title="İşletme paneli">
        <QueryError error={b.error} retry={b.refetch} />
      </BizPage>
    );
  }
  if (!b.business) {
    return (
      <BizPage title="İşletme hesabı" subtitle="BilardoGo işletme paneli">
        <Intro />
      </BizPage>
    );
  }
  const allRejected = b.businesses.every((x) => x.status === 'rejected' && x.role === 'owner');
  if (b.business.status !== 'approved') {
    return (
      <BizPage title="İşletme başvurusu" subtitle={b.business.legalName}>
        <ApplicationStatus business={b.business} />
        {allRejected ? (
          <p className="mt-4 text-center text-sm text-muted">
            Farklı bilgilerle yeniden başvurmak istersen{' '}
            <Link href="/isletme/basvuru" className="font-semibold text-brand underline">
              yeni başvuru yap
            </Link>
            .
          </p>
        ) : null}
      </BizPage>
    );
  }
  if (!b.venueId) {
    return (
      <BizPage title="İşletme paneli">
        <Notice tone="warning">Bu işletmeye bağlı salon bulunamadı. Destek ekibiyle iletişime geç.</Notice>
      </BizPage>
    );
  }
  return (
    <BizPage title={b.venue?.name ?? 'Ana Sayfa'} subtitle="Canlı pano" wide>
      <Dashboard venueId={b.venueId} />
    </BizPage>
  );
}
