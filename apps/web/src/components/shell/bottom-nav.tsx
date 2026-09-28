'use client';
import { cn } from '@bilardogo/ui';
import { Home, MessageCircle, Megaphone, QrCode, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession } from '@/lib/session';
import { trpc } from '@/lib/trpc/client';

const ITEMS = [
  { href: '/', label: 'Ana Sayfa', icon: Home, match: (p: string) => p === '/' || p.startsWith('/salon') },
  { href: '/bulten', label: 'Bülten', icon: Megaphone, match: (p: string) => p.startsWith('/bulten') },
  { href: '/qr', label: 'QR', icon: QrCode, match: (p: string) => p.startsWith('/qr') || p.startsWith('/q/'), center: true },
  { href: '/sosyal', label: 'Sosyal', icon: MessageCircle, match: (p: string) => p.startsWith('/sosyal') },
  { href: '/profil', label: 'Profil', icon: User, match: (p: string) => p.startsWith('/profil') || p.startsWith('/maclarim') || p.startsWith('/ayarlar') },
];

export function BottomNav() {
  const pathname = usePathname();
  const { session } = useSession();
  const dm = trpc.social.unreadTotal.useQuery(undefined, { enabled: !!session?.onboarded, refetchInterval: 60_000 });
  const actions = trpc.matches.actionCount.useQuery(undefined, { enabled: !!session?.onboarded, refetchInterval: 60_000 });
  const badges: Record<string, number> = { '/sosyal': dm.data?.count ?? 0, '/profil': actions.data?.count ?? 0 };
  return (
    <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg/95 pb-safe backdrop-blur-lg">
      <div className="mx-auto grid h-16 max-w-2xl grid-cols-5 items-end px-2">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          if (item.center) {
            return (
              <Link key={item.href} href={item.href} className="flex flex-col items-center" aria-label="Masa QR kodunu okut">
                <span className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full border-4 border-bg bg-brand text-brand-fg shadow-[var(--shadow-brand)]">
                  <Icon className="h-6 w-6" strokeWidth={2.4} />
                </span>
                <span className={cn('mb-1.5 mt-0.5 text-[10px] font-bold', active ? 'text-brand' : 'text-brand/80')}>{item.label}</span>
              </Link>
            );
          }
          const badge = badges[item.href] ?? 0;
          return (
            <Link key={item.href} href={item.href} className="relative flex flex-col items-center gap-1 pb-2 pt-2">
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
