'use client';
import { cn } from '@bilardogo/ui';
import {
  BadgeCheck,
  Building2,
  CreditCard,
  FileText,
  Flag,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Newspaper,
  Package,
  ScrollText,
  Settings,
  Swords,
  Tags,
  Users,
  X,
  Bell,
  Store,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { trpc } from '@/lib/trpc/client';

export const NAV = [
  { href: '/', label: 'Panel', icon: LayoutDashboard },
  { href: '/kullanicilar', label: 'Kullanıcılar', icon: Users },
  { href: '/isletmeler', label: 'İşletmeler', icon: Building2, badge: 'businesses' as const },
  { href: '/salonlar', label: 'Salonlar & Masalar', icon: Store },
  { href: '/maclar', label: 'Maçlar', icon: Swords },
  { href: '/bulten', label: 'Bülten / Duyurular', icon: Newspaper },
  { href: '/reklamlar', label: 'Reklam / Sponsor', icon: Megaphone },
  { href: '/moderasyon', label: 'Moderasyon', icon: Flag, badge: 'reports' as const },
  { href: '/bildirim-sablonlari', label: 'Bildirim şablonları', icon: Bell },
  { href: '/katalog', label: 'Ürün kataloğu', icon: Package },
  { href: '/abonelikler', label: 'Abonelikler', icon: CreditCard },
  { href: '/planlar', label: 'Planlar', icon: Tags },
  { href: '/sozlesmeler', label: 'Sözleşmeler / KVKK', icon: FileText },
  { href: '/ayarlar', label: 'Ayarlar', icon: Settings },
  { href: '/denetim', label: 'Denetim kaydı', icon: ScrollText },
];

export function Sidebar({ adminName }: { adminName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const dash = trpc.admin.dashboard.useQuery(undefined, { refetchInterval: 60_000 });
  const badges = {
    businesses: dash.data?.counts.businesses_pending ?? 0,
    reports: dash.data?.counts.reports_open ?? 0,
  };
  const nav = (
    <nav className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 px-5">
        <BadgeCheck className="h-5 w-5 text-brand" />
        <span className="font-display text-xl font-bold">
          Bilardo<span className="text-brand">Go</span>
        </span>
        <span className="rounded-md bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold text-brand">ADMIN</span>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {NAV.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          const badge = item.badge ? badges[item.badge] : 0;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium',
                active ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-2 hover:text-fg',
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {badge > 0 ? <span className="rounded-full bg-brand px-1.5 text-[10px] font-bold text-brand-fg">{badge}</span> : null}
            </Link>
          );
        })}
      </div>
      <div className="border-t border-border p-3">
        <div className="px-3 pb-2 text-xs text-muted">{adminName}</div>
        <button
          type="button"
          onClick={async () => {
            await getSupabaseBrowser().auth.signOut();
            router.replace('/giris');
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted hover:bg-surface-2 hover:text-fg"
        >
          <LogOut className="h-4 w-4" /> Çıkış
        </button>
      </div>
    </nav>
  );
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-border bg-surface lg:block">{nav}</aside>
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-bg/90 px-4 backdrop-blur lg:hidden">
        <button type="button" onClick={() => setOpen(true)} aria-label="Menü">
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-display text-lg font-bold">
          Bilardo<span className="text-brand">Go</span> Admin
        </span>
      </div>
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 border-r border-border bg-surface">
            <button type="button" className="absolute right-3 top-4" onClick={() => setOpen(false)} aria-label="Kapat">
              <X className="h-5 w-5" />
            </button>
            {nav}
          </aside>
        </div>
      ) : null}
    </>
  );
}
