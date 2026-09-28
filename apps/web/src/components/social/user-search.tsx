'use client';
import { Input, Skeleton } from '@bilardogo/ui';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { UserChip, type UserSummary } from '@/components/common/user-chip';
import { QueryError } from '@/components/common/states';
import { LEVEL_LABELS } from '@bilardogo/domain';
import { cityName } from '@/lib/format';
import { trpc } from '@/lib/trpc/client';

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Oyuncu arama kutusu + sonuç listesi. Her satırın sağına `action` ile düğme eklenir. */
export function UserSearch({
  cityPlate,
  placeholder = 'Ad veya @kullanıcıadı ara',
  action,
  onSelect,
  autoFocus,
  hideWhenEmpty,
}: {
  cityPlate?: number | null;
  placeholder?: string;
  action?: (u: UserSummary) => React.ReactNode;
  onSelect?: (u: UserSummary) => void;
  autoFocus?: boolean;
  hideWhenEmpty?: boolean;
}) {
  const [q, setQ] = useState('');
  const term = useDebounced(q.trim(), 300);
  const enabled = term.replace(/^@/, '').length >= 2;
  const res = trpc.players.search.useQuery({ q: term, cityPlate: cityPlate ?? undefined }, { enabled });
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder}
          className="pl-10"
          autoFocus={autoFocus}
          autoCapitalize="none"
          autoCorrect="off"
          aria-label="Oyuncu ara"
        />
      </div>
      {!enabled ? (
        hideWhenEmpty ? null : <p className="px-1 text-xs text-subtle">Aramak için en az 2 karakter yaz.</p>
      ) : res.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 w-full rounded-2xl" />
          <Skeleton className="h-14 w-full rounded-2xl" />
        </div>
      ) : res.error ? (
        <QueryError error={res.error} retry={() => res.refetch()} />
      ) : res.data && res.data.length ? (
        <ul className="space-y-2">
          {res.data.map((u) => (
            <li key={u.id} className="flex items-center gap-2 rounded-2xl border border-border bg-surface p-2.5">
              {onSelect ? (
                <button type="button" onClick={() => onSelect(u)} className="min-w-0 flex-1 text-left">
                  <UserChip user={u} link={false} subtitle={subtitleFor(u)} />
                </button>
              ) : (
                <UserChip user={u} className="flex-1" subtitle={subtitleFor(u)} />
              )}
              {action ? <div className="shrink-0">{action(u)}</div> : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="px-1 py-3 text-center text-sm text-muted">“{term}” ile eşleşen oyuncu bulunamadı.</p>
      )}
    </div>
  );
}

function subtitleFor(u: UserSummary) {
  return [u.username ? `@${u.username}` : null, LEVEL_LABELS[u.level], cityName(u.cityPlate)].filter(Boolean).join(' · ');
}
