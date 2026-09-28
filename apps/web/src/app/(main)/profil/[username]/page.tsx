'use client';
import { Card, CardBody, CardHeader, EmptyState } from '@bilardogo/ui';
import { ChevronRight, MapPin, Store, UserX } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PageBody, PageHeader } from '@/components/common/page-header';
import { PageLoading, QueryError } from '@/components/common/states';
import { OpponentsSection } from '@/components/profile/opponents-section';
import { OtherProfileActions, OwnProfileActions } from '@/components/profile/profile-actions';
import { ProfileHero } from '@/components/profile/profile-hero';
import { ProfileGameStats, ProfileTotals } from '@/components/profile/profile-stats';
import { PracticeSection } from '@/components/profile/practice-section';
import { RecentMatches } from '@/components/profile/recent-matches';
import type { Profile } from '@/components/profile/types';
import { TopBar } from '@/components/shell/top-bar';
import { formatMinutes } from '@/lib/format';
import { useSession } from '@/lib/session';
import { trpc } from '@/lib/trpc/client';

export default function ProfilePage() {
  const params = useParams<{ username: string }>();
  const username = decodeURIComponent(params.username).replace(/^@/, '').toLowerCase();
  const { session, loading } = useSession();
  const q = trpc.players.profile.useQuery({ username }, { refetchInterval: 60_000 });

  const isMe = !!session && session.username === username;
  const header = isMe ? <TopBar /> : <PageHeader title={q.data?.user.displayName ?? 'Profil'} subtitle={`@${username}`} />;

  if (q.isLoading || loading) {
    return (
      <>
        {header}
        <PageLoading />
      </>
    );
  }
  if (q.error || !q.data) {
    const notFound = q.error?.data?.code === 'NOT_FOUND';
    return (
      <>
        {header}
        <PageBody>
          {notFound ? (
            <EmptyState icon={<UserX />} title="Oyuncu bulunamadı" description="Kullanıcı adı değişmiş ya da hesap kapatılmış olabilir." />
          ) : (
            <QueryError error={q.error} retry={() => q.refetch()} />
          )}
        </PageBody>
      </>
    );
  }
  const p = q.data;
  return (
    <>
      {header}
      <PageBody className="space-y-4">
        <ProfileHero profile={p} />
        {p.isMe && session ? <OwnProfileActions session={session} /> : <OtherProfileActions profile={p} loggedIn={!!session} />}
        <ProfileTotals profile={p} />
        <ProfileGameStats profile={p} />
        <PracticeSection profile={p} />
        <OpponentsSection profile={p} loggedIn={!!session} />
        <RecentMatches userId={p.user.id} isMe={p.isMe} />
        <PreferredVenues venues={p.preferredVenues} />
      </PageBody>
    </>
  );
}

function PreferredVenues({ venues }: { venues: Profile['preferredVenues'] }) {
  return (
    <Card>
      <CardHeader icon={<Store className="h-5 w-5" />} title="Tercih edilen salonlar" description="En çok maç yapılan salonlar" />
      <CardBody>
        {venues.length ? (
          <ul className="space-y-1.5">
            {venues.map((v, i) => (
              <li key={v.id}>
                <Link href={`/salon/${v.slug}`} className="flex items-center gap-3 rounded-2xl border border-border bg-surface-2 p-2.5 hover:bg-surface-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft font-display text-sm font-bold text-brand">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{v.name}</div>
                    <div className="text-[11px] text-muted">
                      {v.matches} maç · {formatMinutes(v.minutes)} masa
                    </div>
                  </div>
                  <MapPin className="h-4 w-4 text-subtle" />
                  <ChevronRight className="h-4 w-4 text-subtle" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-border px-4 py-5 text-center text-sm text-muted">Henüz salonda maç kaydı yok.</p>
        )}
      </CardBody>
    </Card>
  );
}
