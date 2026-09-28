'use client';
import { EmptyState, Input } from '@bilardogo/ui';
import { MapPin, Search, Store } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AdSlot } from '@/components/feed/ad-slot';
import { MyStatusCard } from '@/components/home/my-status-card';
import { VenueCard } from '@/components/home/venue-card';
import { PageBody } from '@/components/common/page-header';
import { ListSkeleton, QueryError } from '@/components/common/states';
import { TopBar } from '@/components/shell/top-bar';
import { useSelectedCity } from '@/lib/city';
import { cityName } from '@/lib/format';
import { useRealtime } from '@/lib/realtime';
import { useSession } from '@/lib/session';
import { trpc } from '@/lib/trpc/client';

export default function HomePage() {
  const { session } = useSession();
  const [city, setCity] = useSelectedCity(session?.cityPlate);
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  const venues = trpc.venues.list.useQuery({ cityPlate: city, q: debounced || undefined }, { refetchInterval: 90_000 });
  const utils = trpc.useUtils();
  useRealtime(`city:${city}`, ['presence'], () => void utils.venues.list.invalidate({ cityPlate: city }));

  return (
    <>
      <TopBar city={city} onCityChange={setCity} />
      <PageBody className="space-y-4">
        <MyStatusCard />
        <div id="salonlar" className="flex items-center gap-2 pt-2">
          <MapPin className="h-5 w-5 text-brand" />
          <h1 className="font-display text-2xl font-semibold">Şehrindeki Salonlar</h1>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <Input placeholder="Salon ara" value={q} onChange={(e) => setQ(e.target.value)} className="pl-10" />
        </div>
        {venues.isLoading ? (
          <ListSkeleton rows={3} />
        ) : venues.error ? (
          <QueryError error={venues.error} retry={() => venues.refetch()} />
        ) : venues.data?.length ? (
          <div className="space-y-4">
            {venues.data.map((v, i) => (
              <div key={v.id} className="space-y-4">
                <VenueCard venue={v} />
                {i === 1 ? <AdSlot placement="home" cityPlate={city} /> : null}
              </div>
            ))}
            {venues.data.length < 2 ? <AdSlot placement="home" cityPlate={city} /> : null}
          </div>
        ) : (
          <EmptyState
            icon={<Store />}
            title={debounced ? 'Aramana uygun salon yok' : `${cityName(city)} için henüz salon yok`}
            description="Salon sahibiysen işletme hesabı oluşturup salonunu BilardoGo’ya ekleyebilirsin."
          />
        )}
      </PageBody>
    </>
  );
}
