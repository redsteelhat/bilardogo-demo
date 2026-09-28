'use client';
import { cn } from '@bilardogo/ui';
import { Bell, ChevronDown, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@/components/common/logo';
import { cityName } from '@/lib/format';
import { useSession } from '@/lib/session';
import { trpc } from '@/lib/trpc/client';
import { CityPickerDialog } from './city-picker';

/** Sekme kök sayfalarının üst çubuğu: logo, (opsiyonel) şehir seçici, bildirim zili. */
export function TopBar({
  city,
  onCityChange,
  className,
}: {
  city?: number;
  onCityChange?: (plate: number) => void;
  className?: string;
}) {
  const { session } = useSession();
  const [open, setOpen] = useState(false);
  const unread = trpc.notifications.unreadCount.useQuery(undefined, { enabled: !!session, refetchInterval: 60_000 });
  const setCity = trpc.me.setCity.useMutation();
  const count = unread.data?.count ?? session?.unreadNotifications ?? 0;
  return (
    <header className={cn('sticky top-0 z-30 border-b border-border/60 bg-bg/90 pt-safe backdrop-blur-lg', className)}>
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-3 px-4">
        <Logo />
        <div className="flex-1" />
        {city && onCityChange ? (
          <>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex h-9 items-center gap-1.5 rounded-full border border-border bg-surface px-3 text-sm font-semibold"
            >
              <MapPin className="h-4 w-4 text-brand" />
              {cityName(city)}
              <ChevronDown className="h-3.5 w-3.5 text-muted" />
            </button>
            <CityPickerDialog
              open={open}
              onOpenChange={setOpen}
              value={city}
              onSelect={(p) => {
                onCityChange(p);
                if (session?.onboarded) setCity.mutate({ cityPlate: p });
              }}
            />
          </>
        ) : null}
        {session ? (
          <Link href="/bildirimler" className="relative flex h-9 w-9 items-center justify-center rounded-full text-fg" aria-label="Bildirimler">
            <Bell className="h-5 w-5" />
            {count > 0 ? (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-brand-fg">
                {count > 9 ? '9+' : count}
              </span>
            ) : null}
          </Link>
        ) : (
          <Link href="/giris" className="rounded-full bg-brand px-4 py-1.5 text-sm font-bold text-brand-fg">
            Giriş
          </Link>
        )}
      </div>
    </header>
  );
}
