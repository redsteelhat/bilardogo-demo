'use client';
import { EmptyState, Notice, SectionTitle } from '@bilardogo/ui';
import { CalendarClock, Megaphone, Newspaper, Store } from 'lucide-react';
import { Fragment } from 'react';
import { AdCard } from '@/components/feed/ad-slot';
import { BulletinCard, VenuePostCard } from '@/components/feed/bulletin-card';
import { PageBody } from '@/components/common/page-header';
import { ListSkeleton, QueryError } from '@/components/common/states';
import { TopBar } from '@/components/shell/top-bar';
import { useSelectedCity } from '@/lib/city';
import { cityName } from '@/lib/format';
import { useSession } from '@/lib/session';
import { trpc } from '@/lib/trpc/client';

export default function BulletinPage() {
  const { session } = useSession();
  const [city, setCity] = useSelectedCity(session?.cityPlate);
  const q = trpc.feed.bulletin.useQuery({ cityPlate: city, limit: 30 }, { refetchInterval: 120_000 });
  const d = q.data;
  const ads = d?.ads ?? [];
  const bulletins = d?.bulletins ?? [];
  const posts = d?.venuePosts ?? [];
  // Reklamlar: her 2 bülten içeriğinden sonra bir sponsor kartı
  const adAfter = (i: number) => (i % 2 === 1 ? ads[(i - 1) / 2] : undefined);
  const leftoverAds = ads.slice(Math.floor(bulletins.length / 2));

  return (
    <>
      <TopBar city={city} onCityChange={setCity} />
      <PageBody className="space-y-4">
        <div className="pt-2">
          <h1 className="font-display text-3xl font-bold">Etkinlik alanı</h1>
          <p className="mt-1 text-sm text-muted">BilardoGo bülteni, canlı yayınlar ve {cityName(city)} salonlarından duyurular.</p>
        </div>
        {q.isLoading ? (
          <ListSkeleton rows={3} />
        ) : q.error ? (
          <QueryError error={q.error} retry={() => q.refetch()} />
        ) : (
          <>
            <SectionTitle icon={<Newspaper />} count={bulletins.length} className="mt-2">
              BilardoGo Bülteni
            </SectionTitle>
            {bulletins.length ? (
              <div className="space-y-4">
                {bulletins.map((b, i) => {
                  const ad = adAfter(i);
                  return (
                    <Fragment key={b.id}>
                      <BulletinCard item={b} />
                      {ad ? <AdCard ad={ad} /> : null}
                    </Fragment>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={<Megaphone />} title="Henüz bülten içeriği yok" description="Haberler, canlı yayınlar ve yeni özellik duyuruları burada yayınlanır." className="py-8" />
            )}

            <SectionTitle icon={<Store />} count={posts.length}>
              Salon duyuruları & kampanyaları
            </SectionTitle>
            {posts.length ? (
              <div className="space-y-3">
                {posts.map((p) => (
                  <VenuePostCard key={p.id} post={p} />
                ))}
              </div>
            ) : (
              <EmptyState icon={<Store />} title={`${cityName(city)} salonlarından şu an duyuru yok`} className="py-8" />
            )}

            {leftoverAds.length ? (
              <div className="space-y-3 pt-2">
                {leftoverAds.map((a) => (
                  <AdCard key={a.id} ad={a} />
                ))}
              </div>
            ) : null}

            <SectionTitle icon={<CalendarClock />}>Turnuvalar & hafta sonu etkinlikleri</SectionTitle>
            <Notice tone="brand" icon={<CalendarClock />} title="Turnuvalar ve hafta sonu etkinlikleri yakında">
              Salonların düzenleyeceği turnuva ve mini etkinlikler çok yakında burada olacak.
            </Notice>
          </>
        )}
      </PageBody>
    </>
  );
}
