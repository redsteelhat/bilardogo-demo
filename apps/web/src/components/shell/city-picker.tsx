'use client';
import { CITIES, FEATURED_CITY_PLATES, slugify } from '@bilardogo/domain';
import { Dialog, DialogContent, Input, cn } from '@bilardogo/ui';
import { Check, MapPin, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc/client';

export function CityPickerDialog({
  open,
  onOpenChange,
  value,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: number;
  onSelect: (plate: number) => void;
}) {
  const [q, setQ] = useState('');
  const cities = trpc.meta.cities.useQuery(undefined, { enabled: open, staleTime: 5 * 60_000 });
  const counts = useMemo(() => new Map((cities.data ?? []).map((c) => [c.plate, c.venueCount])), [cities.data]);
  const list = useMemo(() => {
    const s = slugify(q);
    const filtered = CITIES.filter((c) => !s || c.slug.includes(s));
    return [...filtered].sort((a, b) => {
      const fa = (FEATURED_CITY_PLATES as readonly number[]).indexOf(a.plate);
      const fb = (FEATURED_CITY_PLATES as readonly number[]).indexOf(b.plate);
      const ca = counts.get(a.plate) ?? 0;
      const cb = counts.get(b.plate) ?? 0;
      if (ca !== cb) return cb - ca;
      if (fa !== fb) return (fa === -1 ? 99 : fa) - (fb === -1 ? 99 : fb);
      return a.name.localeCompare(b.name, 'tr');
    });
  }, [q, counts]);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Şehir seç" description="Salonlar seçtiğin şehre göre listelenir.">
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
          <Input autoFocus placeholder="İl ara" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
        </div>
        <div className="-mx-2 max-h-[55dvh] overflow-y-auto">
          {list.map((c) => (
            <button
              key={c.plate}
              type="button"
              onClick={() => {
                onSelect(c.plate);
                onOpenChange(false);
              }}
              className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-2', c.plate === value && 'bg-brand-soft')}
            >
              <MapPin className={cn('h-4 w-4', c.plate === value ? 'text-brand' : 'text-subtle')} />
              <span className="flex-1 font-medium">{c.name}</span>
              {counts.get(c.plate) ? <span className="text-xs text-muted">{counts.get(c.plate)} salon</span> : null}
              {c.plate === value ? <Check className="h-4 w-4 text-brand" /> : null}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
