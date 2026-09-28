'use client';
import type { RouterOutputs } from '@bilardogo/api';
import type { STAFF_PERMISSIONS } from '@bilardogo/domain';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc/client';

export type MyBusiness = RouterOutputs['business']['mine'][number];
export type MyVenue = MyBusiness['venues'][number];
export type StaffPermission = (typeof STAFF_PERMISSIONS)[number];
export type VenueOption = { venue: MyVenue; business: MyBusiness };

const STORAGE_KEY = 'bg_isletme_venue';

type BusinessContextValue = {
  loading: boolean;
  error: unknown;
  refetch: () => void;
  businesses: MyBusiness[];
  options: VenueOption[];
  current: VenueOption | null;
  business: MyBusiness | null;
  venue: MyVenue | null;
  venueId: string | null;
  isOwner: boolean;
  approved: boolean;
  /** Sahip her şeyi yapar; çalışan yalnız verilen yetkilerle. */
  can: (perm: StaffPermission) => boolean;
  select: (venueId: string) => void;
};

const Ctx = createContext<BusinessContextValue | null>(null);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const mine = trpc.business.mine.useQuery(undefined, { staleTime: 30_000 });
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    try {
      setSelected(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      /* depolama kapalı olabilir */
    }
  }, []);

  const businesses = useMemo(() => mine.data ?? [], [mine.data]);
  const options = useMemo<VenueOption[]>(
    () => businesses.flatMap((b) => b.venues.map((v) => ({ venue: v, business: b }))),
    [businesses],
  );
  const current = options.find((o) => o.venue.id === selected) ?? options[0] ?? null;
  // Salonu olmayan (ör. yalnız reddedilmiş) işletme kaydı da gösterilebilsin
  const business = current?.business ?? businesses[0] ?? null;
  const isOwner = business?.role === 'owner';

  const select = useCallback((id: string) => {
    setSelected(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* yoksay */
    }
  }, []);

  const can = useCallback(
    (perm: StaffPermission) => !!business && (business.role === 'owner' || business.permissions.includes(perm)),
    [business],
  );

  const value: BusinessContextValue = {
    loading: mine.isLoading,
    error: mine.error,
    refetch: () => void mine.refetch(),
    businesses,
    options,
    current,
    business,
    venue: current?.venue ?? null,
    venueId: current?.venue.id ?? null,
    isOwner,
    approved: business?.status === 'approved',
    can,
    select,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useBusiness() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useBusiness BusinessProvider içinde kullanılmalı');
  return v;
}
