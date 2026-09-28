'use client';
import { Avatar, Badge, Card, ListRow } from '@bilardogo/ui';
import { BarChart3, ChevronRight, CreditCard, FileText, Home, Megaphone, MessageCircle, Printer, QrCode, Store, Users } from 'lucide-react';
import Link from 'next/link';
import { ApplicationInfoCard } from '@/components/business/application-status';
import { useBusiness, type StaffPermission } from '@/components/business/context';
import { EntitlementBanner } from '@/components/business/dashboard';
import { DocumentsCard } from '@/components/business/documents-card';
import { BizPage, BUSINESS_STATUS_LABELS, BUSINESS_STATUS_TONES, Gate } from '@/components/business/ui';
import { useSession } from '@/lib/session';
import { trpc } from '@/lib/trpc/client';

type Hub = { href: string; icon: React.ReactNode; title: string; sub: string; ownerOnly?: boolean; perm?: StaffPermission; external?: boolean };

function Hub({ venueId }: { venueId: string }) {
  const { business, isOwner, can } = useBusiness();
  const { session } = useSession();
  const venue = trpc.business.venue.useQuery({ venueId });
  const conv = venue.data?.conversationId;
  const items: Hub[] = [
    { href: '/isletme/salon', icon: <Store className="h-5 w-5" />, title: 'Salon profili', sub: 'Bilgiler, fotoğraflar, çalışma saatleri', ownerOnly: true },
    { href: '/isletme/duyurular', icon: <Megaphone className="h-5 w-5" />, title: 'Duyurular ve kampanyalar', sub: 'Takipçilerine duyuru gönder', perm: 'posts' },
    { href: '/isletme/calisanlar', icon: <Users className="h-5 w-5" />, title: 'Çalışanlarım', sub: 'Sınırlı yetkili çalışan hesapları', ownerOnly: true },
    { href: '/isletme/abonelik', icon: <CreditCard className="h-5 w-5" />, title: 'Abonelik', sub: 'Plan, deneme süresi, ödeme geçmişi', ownerOnly: true },
    { href: '/isletme/rapor', icon: <BarChart3 className="h-5 w-5" />, title: 'Rapor', sub: 'Son 30 gün: maç, masa süresi, ciro', ownerOnly: true },
    ...(conv
      ? [{ href: `/sosyal/${conv}`, icon: <MessageCircle className="h-5 w-5" />, title: 'Salon sohbeti', sub: 'Salon adına mesajlaş', perm: 'chat' as const }]
      : []),
    { href: '/isletme/masalar/afis?tur=siparis', icon: <QrCode className="h-5 w-5" />, title: 'Sipariş QR', sub: 'Sipariş sayfasını açan QR afişi', perm: 'orders' },
    { href: '/isletme/masalar/afis', icon: <Printer className="h-5 w-5" />, title: 'Masa QR afişleri', sub: 'Tüm masaların afişlerini yazdır', perm: 'tables' },
  ];
  const visible = items.filter((i) => (i.ownerOnly ? isOwner : i.perm ? can(i.perm) : true));

  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-3 p-4">
        <Avatar name={session?.fullName ?? session?.username ?? '?'} src={session?.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{session?.fullName ?? `@${session?.username ?? ''}`}</div>
          <div className="truncate text-xs text-muted">{business?.legalName}</div>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge tone="brand">{isOwner ? 'İşletme sahibi' : 'Çalışan'}</Badge>
            {business ? <Badge tone={BUSINESS_STATUS_TONES[business.status]}>{BUSINESS_STATUS_LABELS[business.status]}</Badge> : null}
          </div>
        </div>
      </Card>

      {isOwner && business ? <EntitlementBanner entitlement={business.entitlement} /> : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {visible.map((i) => (
          <Link key={i.href} href={i.href} className="block">
            <ListRow icon={i.icon} title={i.title} subtitle={i.sub} right={<ChevronRight className="h-4 w-4 text-subtle" />} className="h-full hover:border-brand/40" />
          </Link>
        ))}
        {isOwner ? (
          <a href="#basvuru" className="block">
            <ListRow
              icon={<FileText className="h-5 w-5" />}
              title="Başvuru bilgileri ve belgeler"
              subtitle="Ticari bilgiler, VKN/TCKN, belgeler"
              right={<ChevronRight className="h-4 w-4 text-subtle" />}
              className="h-full hover:border-brand/40"
            />
          </a>
        ) : null}
        <Link href="/" className="block">
          <ListRow icon={<Home className="h-5 w-5" />} title="Uygulamaya dön" subtitle="Oyuncu uygulaması" right={<ChevronRight className="h-4 w-4 text-subtle" />} className="h-full" />
        </Link>
      </div>

      {!isOwner ? (
        <p className="text-center text-xs text-muted">Çalışan hesabı salonla ilgili ayarları değiştiremez. Yetkin yalnız verilen bölümleri kapsar.</p>
      ) : null}

      {isOwner && business ? (
        <section id="basvuru" className="scroll-mt-20 space-y-3 pt-4">
          <h2 className="font-display text-lg font-semibold">Başvuru bilgileri</h2>
          <ApplicationInfoCard business={business} />
          <DocumentsCard business={business} />
        </section>
      ) : null}
    </div>
  );
}

export default function BusinessProfilePage() {
  return (
    <BizPage title="Profil" subtitle="Salon ve hesap ayarları">
      <Gate>{({ venueId }) => <Hub venueId={venueId} />}</Gate>
    </BizPage>
  );
}
