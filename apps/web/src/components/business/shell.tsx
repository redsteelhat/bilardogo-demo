'use client';
import { Badge, Menu, MenuContent, MenuItem, MenuTrigger, cn } from '@bilardogo/ui';
import {
  ArrowLeft,
  BarChart3,
  Check,
  ChevronDown,
  ClipboardList,
  CreditCard,
  Home,
  LayoutGrid,
  Megaphone,
  Package,
  Printer,
  Store,
  User,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cityName } from '@/lib/format';
import { useRealtime } from '@/lib/realtime';
import { trpc } from '@/lib/trpc/client';
import { useBusiness, type StaffPermission } from './context';
import { BUSINESS_STATUS_LABELS, BUSINESS_STATUS_TONES } from './ui';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  perm?: StaffPermission;
  ownerOnly?: boolean;
  match: (p: string) => boolean;
};

const PROFILE_PATHS = ['/isletme/profil', '/isletme/salon', '/isletme/duyurular', '/isletme/calisanlar', '/isletme/abonelik', '/isletme/rapor'];

const BOTTOM: NavItem[] = [
  { href: '/isletme', label: 'Ana Sayfa', icon: Home, match: (p) => p === '/isletme' || p === '/isletme/basvuru' },
  { href: '/isletme/siparisler', label: 'Siparişler', icon: ClipboardList, perm: 'orders', match: (p) => p.startsWith('/isletme/siparisler') },
  { href: '/isletme/masalar', label: 'Masalar', icon: LayoutGrid, perm: 'tables', match: (p) => p.startsWith('/isletme/masalar') },
  { href: '/isletme/urunler', label: 'Ürünler', icon: Package, perm: 'orders', match: (p) => p.startsWith('/isletme/urunler') },
  { href: '/isletme/profil', label: 'Profil', icon: User, match: (p) => PROFILE_PATHS.some((x) => p.startsWith(x)) },
];

const SIDEBAR: NavItem[] = [
  { href: '/isletme', label: 'Ana Sayfa', icon: Home, match: (p) => p === '/isletme' || p === '/isletme/basvuru' },
  { href: '/isletme/siparisler', label: 'Siparişler', icon: ClipboardList, perm: 'orders', match: (p) => p.startsWith('/isletme/siparisler') },
  { href: '/isletme/masalar', label: 'Masalar', icon: LayoutGrid, perm: 'tables', match: (p) => p === '/isletme/masalar' },
  { href: '/isletme/masalar/afis', label: 'QR afişleri', icon: Printer, perm: 'tables', match: (p) => p.startsWith('/isletme/masalar/afis') },
  { href: '/isletme/urunler', label: 'Ürünler', icon: Package, perm: 'orders', match: (p) => p.startsWith('/isletme/urunler') },
  { href: '/isletme/duyurular', label: 'Duyurular', icon: Megaphone, perm: 'posts', match: (p) => p.startsWith('/isletme/duyurular') },
  { href: '/isletme/salon', label: 'Salon profili', icon: Store, ownerOnly: true, match: (p) => p.startsWith('/isletme/salon') },
  { href: '/isletme/calisanlar', label: 'Çalışanlarım', icon: Users, ownerOnly: true, match: (p) => p.startsWith('/isletme/calisanlar') },
  { href: '/isletme/rapor', label: 'Rapor', icon: BarChart3, ownerOnly: true, match: (p) => p.startsWith('/isletme/rapor') },
  { href: '/isletme/abonelik', label: 'Abonelik', icon: CreditCard, ownerOnly: true, match: (p) => p.startsWith('/isletme/abonelik') },
  { href: '/isletme/profil', label: 'Tüm ayarlar', icon: User, match: (p) => p === '/isletme/profil' },
];

function useVisible(items: NavItem[]) {
  const { can, isOwner } = useBusiness();
  return items.filter((i) => (i.ownerOnly ? isOwner : i.perm ? can(i.perm) : true));
}

function VenueSwitcher() {
  const { options, current, business, select } = useBusiness();
  if (!business) return <span className="truncate text-sm font-semibold">İşletme paneli</span>;
  const label = (
    <span className="min-w-0 text-left">
      <span className="block truncate text-sm font-semibold leading-tight">{current?.venue.name ?? business.legalName}</span>
      <span className="block truncate text-[11px] leading-tight text-muted">
        {current ? cityName(current.venue.cityPlate) : ''}
        {business.role === 'staff' ? ' · Çalışan' : ''}
      </span>
    </span>
  );
  if (options.length < 2) return <div className="flex min-w-0 items-center gap-2">{label}</div>;
  return (
    <Menu>
      <MenuTrigger className="flex min-w-0 items-center gap-1.5 rounded-xl px-2 py-1 hover:bg-surface-2" aria-label="Salon değiştir">
        {label}
        <ChevronDown className="h-4 w-4 shrink-0 text-muted" />
      </MenuTrigger>
      <MenuContent align="start">
        {options.map((o) => (
          <MenuItem key={o.venue.id} onSelect={() => select(o.venue.id)} icon={o.venue.id === current?.venue.id ? <Check /> : <Store />}>
            <span className="min-w-0">
              <span className="block truncate">{o.venue.name}</span>
              <span className="block truncate text-[11px] text-muted">
                {o.business.legalName} · {o.business.role === 'owner' ? 'Sahip' : 'Çalışan'}
              </span>
            </span>
          </MenuItem>
        ))}
      </MenuContent>
    </Menu>
  );
}

function Header() {
  const { business } = useBusiness();
  return (
    <header className="no-print sticky top-0 z-30 border-b border-border bg-bg/90 pt-safe backdrop-blur-lg">
      <div className="flex h-14 items-center gap-3 px-3 lg:px-5">
        <Link href="/isletme" className="hidden shrink-0 font-display text-xl font-bold tracking-tight lg:block">
          Bilardo<span className="text-brand">Go</span>
          <span className="ml-1.5 align-middle text-[11px] font-sans font-semibold uppercase tracking-wider text-muted">İşletme</span>
        </Link>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand lg:hidden">
          <Store className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1 lg:ml-6">
          <VenueSwitcher />
        </div>
        {business && business.status !== 'approved' ? (
          <Badge tone={BUSINESS_STATUS_TONES[business.status]} className="hidden sm:inline-flex">
            {BUSINESS_STATUS_LABELS[business.status]}
          </Badge>
        ) : null}
        <Link
          href="/"
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-border bg-surface px-3 text-xs font-semibold text-muted hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Uygulamaya dön</span>
          <span className="sm:hidden">Uygulama</span>
        </Link>
      </div>
    </header>
  );
}

function Sidebar({ badges }: { badges: Record<string, number> }) {
  const pathname = usePathname();
  const items = useVisible(SIDEBAR);
  return (
    <aside className="no-print fixed bottom-0 left-0 top-14 hidden w-64 overflow-y-auto border-r border-border bg-surface/40 p-3 lg:block">
      <nav className="space-y-1">
        {items.map((i) => {
          const active = i.match(pathname);
          const Icon = i.icon;
          const badge = badges[i.href] ?? 0;
          return (
            <Link
              key={i.href}
              href={i.href}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors',
                active ? 'bg-brand-soft text-brand ring-1 ring-brand/30' : 'text-muted hover:bg-surface-2 hover:text-fg',
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{i.label}</span>
              {badge > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-brand-fg">{badge}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function BottomNav({ badges }: { badges: Record<string, number> }) {
  const pathname = usePathname();
  const items = useVisible(BOTTOM);
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 pb-safe backdrop-blur-lg lg:hidden">
      <div className="mx-auto grid h-16 max-w-2xl items-stretch px-2" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          const badge = badges[item.href] ?? 0;
          return (
            <Link key={item.href} href={item.href} className="relative flex flex-col items-center justify-center gap-1">
              {active ? <span className="absolute top-0 h-0.5 w-8 rounded-full bg-brand" /> : null}
              <span className="relative">
                <Icon className={cn('h-5 w-5', active ? 'text-brand' : 'text-muted')} />
                {badge > 0 ? (
                  <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[9px] font-bold text-brand-fg">
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
              </span>
              <span className={cn('text-[10px]', active ? 'font-bold text-brand' : 'text-muted')}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

/** Canlı sinyaller: sipariş/maç değişince ilgili sorguları yeniler (yerelde realtime yoksa sorgular zaten aralıkla yenilenir). */
function LiveSignals({ venueId }: { venueId: string }) {
  const utils = trpc.useUtils();
  useRealtime(
    `venue:${venueId}:staff`,
    ['order', 'match'],
    (ev) => {
      if (ev === 'order') void utils.orders.board.invalidate({ venueId });
      void utils.business.overview.invalidate({ venueId });
    },
    { private: true },
  );
  useRealtime(`venue:${venueId}`, ['presence', 'match', 'tables'], () => void utils.business.overview.invalidate({ venueId }));
  return null;
}

export function BusinessShell({ children }: { children: React.ReactNode }) {
  const { business, venueId, approved } = useBusiness();
  const hasNav = !!business && !!venueId;
  const overview = trpc.business.overview.useQuery(
    { venueId: venueId ?? '' },
    { enabled: hasNav && approved, refetchInterval: 15_000 },
  );
  const badges: Record<string, number> = { '/isletme/siparisler': overview.data?.openOrders ?? 0 };
  return (
    <div className="min-h-dvh">
      <Header />
      {hasNav ? (
        <>
          <Sidebar badges={badges} />
          <BottomNav badges={badges} />
          <LiveSignals venueId={venueId} />
        </>
      ) : null}
      <main className={cn(hasNav && 'lg:pl-64 print:pl-0')}>{children}</main>
    </div>
  );
}
