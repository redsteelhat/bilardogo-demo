'use client';
import { LEVEL_LABELS } from '@bilardogo/domain';
import { Avatar, Button, EmptyState, Input, Segmented } from '@bilardogo/ui';
import { ChevronDown, MapPin, Search, Users, Zap } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { GameBadge, MatchStateBadge, PresenceBadge } from '@/components/common/badges';
import { PageBody, PageHeader } from '@/components/common/page-header';
import { ListSkeleton, QueryError } from '@/components/common/states';
import { CityPickerDialog } from '@/components/shell/city-picker';
import { useDebounced } from '@/components/social/user-search';
import { useSelectedCity } from '@/lib/city';
import { cityName } from '@/lib/format';
import { useSession } from '@/lib/session';
import { trpc } from '@/lib/trpc/client';
import type { RouterOutputs } from '@bilardogo/api';

type CityPlayer = RouterOutputs['players']['inCity'][number];
type Filter = 'all' | 'at_venue' | 'wants';

export default function PlayersPage() {
  const { session, loading } = useSession();
  const [city, setCity] = useSelectedCity(session?.cityPlate);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const term = useDebounced(q.trim(), 300);
  const searching = term.replace(/^@/, '').length >= 2;
  const list = trpc.players.inCity.useQuery({ cityPlate: city }, { enabled: !!session && !searching, refetchInterval: 60_000 });
  const search = trpc.players.search.useQuery({ q: term, cityPlate: city }, { enabled: !!session && searching });

  if (!loading && !session) {
    return (
      <>
        <PageHeader title="Oyuncular" />
        <PageBody>
          <EmptyState
            icon={<Users />}
            title="Oyuncuları görmek için giriş yap"
            action={
              <Link href="/giris?next=/oyuncular">
                <Button>Giriş yap</Button>
              </Link>
            }
          />
        </PageBody>
      </>
    );
  }

  const all = list.data ?? [];
  const filtered = all.filter((p) =>
    filter === 'all' ? true : filter === 'at_venue' ? p.presence?.status === 'at_venue' : p.matchState === 'wants',
  );

  return (
    <>
      <PageHeader
        title="Oyuncular"
        subtitle={`${cityName(city)} · ${searching ? 'arama' : `${all.length} oyuncu`}`}
        actions={
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="flex h-9 items-center gap-1 rounded-full border border-border bg-surface px-2.5 text-xs font-semibold"
            aria-label="Şehir seç"
          >
            <MapPin className="h-3.5 w-3.5 text-brand" />
            <ChevronDown className="h-3 w-3 text-muted" />
          </button>
        }
      />
      <CityPickerDialog open={pickerOpen} onOpenChange={setPickerOpen} value={city} onSelect={setCity} />
      <PageBody className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ad veya @kullanıcıadı ara (tüm Türkiye)" className="pl-10" autoCapitalize="none" />
        </div>
        {searching ? (
          search.isLoading ? (
            <ListSkeleton rows={3} />
          ) : search.error ? (
            <QueryError error={search.error} retry={() => search.refetch()} />
          ) : search.data?.length ? (
            <ul className="space-y-2">
              {search.data.map((u) => (
                <PlayerRow key={u.id} p={{ user: u, presence: null, matchState: null }} />
              ))}
            </ul>
          ) : (
            <EmptyState icon={<Search />} title={`“${term}” ile eşleşen oyuncu yok`} className="py-8" />
          )
        ) : (
          <>
            <Segmented<Filter>
              size="sm"
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'Tümü' },
                { value: 'at_venue', label: `Salonda (${all.filter((p) => p.presence?.status === 'at_venue').length})` },
                { value: 'wants', label: `Oynamak istiyor (${all.filter((p) => p.matchState === 'wants').length})` },
              ]}
            />
            {list.isLoading || loading ? (
              <ListSkeleton rows={4} />
            ) : list.error ? (
              <QueryError error={list.error} retry={() => list.refetch()} />
            ) : filtered.length ? (
              <ul className="space-y-2">
                {filtered.map((p) => (
                  <PlayerRow key={p.user.id} p={p} />
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<Users />}
                title={filter === 'all' ? `${cityName(city)} için henüz oyuncu yok` : 'Bu filtreye uyan oyuncu yok'}
                description={filter === 'all' ? 'Başka bir şehir seçebilir ya da isimle arayabilirsin.' : undefined}
                className="py-8"
              />
            )}
          </>
        )}
      </PageBody>
    </>
  );
}

function PlayerRow({ p }: { p: CityPlayer }) {
  const u = p.user;
  const busy = p.matchState === 'in_match' || p.matchState === 'will_play';
  const params = new URLSearchParams({ rakip: u.id });
  if (u.username) params.set('kullanici', u.username);
  const href = u.username ? `/profil/${u.username}` : '#';
  return (
    <li className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-3">
      <Link href={href} className="shrink-0">
        <Avatar name={u.displayName} src={u.avatarUrl} size="lg" status={p.matchState === 'in_match' ? 'in_match' : (p.presence?.status ?? null)} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={href} className="block">
          <div className="truncate font-semibold">{u.displayName}</div>
          <div className="truncate text-xs text-muted">
            {u.username ? `@${u.username} · ` : ''}
            {LEVEL_LABELS[u.level]}
            {p.presence?.venueName ? ` · ${p.presence.venueName}` : ''}
          </div>
        </Link>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {p.presence ? <PresenceBadge status={p.presence.status} /> : null}
          <MatchStateBadge state={p.matchState} />
          {u.gameTypes.slice(0, 3).map((g) => (
            <GameBadge key={g} game={g} />
          ))}
        </div>
      </div>
      {busy ? null : (
        <Link
          href={`/mac-istegi?${params.toString()}`}
          aria-label={`${u.displayName} oyuncusuna maç isteği gönder`}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand/50 bg-brand-soft text-brand transition-colors hover:bg-brand hover:text-brand-fg"
        >
          <Zap className="h-4 w-4" fill="currentColor" />
        </Link>
      )}
    </li>
  );
}
