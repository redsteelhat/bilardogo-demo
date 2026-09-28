'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { PLAY_INTENT_LABELS, PRESENCE_DEFAULTS, type PlayIntent } from '@bilardogo/domain';
import { Button, cn, Dialog, DialogContent, DialogFooter, Field, Input, Notice, Segmented, toast } from '@bilardogo/ui';
import { CalendarClock, Info, Power, Timer, Users } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { formatTime, fromLocalInputValue, relative, toLocalInputValue } from '@/lib/format';
import { timeWithSuffix } from '@/components/match/helpers';
import { errorMessage, trpc } from '@/lib/trpc/client';

type PresenceMe = RouterOutputs['presence']['me'];
type Choice = 'at_venue' | 'coming' | 'offline';

/**
 * Salon durumu (Salondayım / Geleceğim / Çevrimdışı Ol) ve maç isteği durumu (Oynamak istiyorum / istemiyorum).
 * İkisi ayrı eksenlerdir. Başka salonda görünen kullanıcı burada durum seçerse buraya taşınır.
 */
export function PresenceControls({
  venue,
  me,
  loggedIn,
}: {
  venue: { id: string; name: string; slug: string };
  me: PresenceMe | undefined;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const utils = trpc.useUtils();
  const [comingOpen, setComingOpen] = useState(false);
  const here = !!me && me.status !== 'offline' && me.venueId === venue.id;
  const elsewhere = !!me && me.status !== 'offline' && me.venueId !== venue.id;
  const current: Choice | null = here ? me!.status : null;

  const refresh = async () => {
    await Promise.all([utils.presence.me.invalidate(), utils.venues.live.invalidate({ venueId: venue.id }), utils.venues.list.invalidate()]);
  };
  const set = trpc.presence.set.useMutation({ onSuccess: refresh, onError: (e) => toast.error(errorMessage(e)) });
  const clear = trpc.presence.clear.useMutation({ onSuccess: refresh, onError: (e) => toast.error(errorMessage(e)) });
  const setIntent = trpc.presence.setIntent.useMutation({ onSuccess: refresh, onError: (e) => toast.error(errorMessage(e)) });
  const extend = trpc.presence.extend.useMutation({
    onSuccess: async (r) => {
      await refresh();
      toast.success(`Durumun ${timeWithSuffix(formatTime(r.expiresAt), 'dat')} kadar uzatıldı`);
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const busy = set.isPending || clear.isPending;

  const requireLogin = () => {
    router.push(`/giris?next=${encodeURIComponent(pathname)}`);
  };

  const choose = (c: Choice) => {
    if (!loggedIn) return requireLogin();
    if (c === 'at_venue') {
      if (current === 'at_venue') return;
      set.mutate(
        { venueId: venue.id, status: 'at_venue', playIntent: here && me?.playIntent ? me.playIntent : 'not' },
        { onSuccess: () => toast.success(`${venue.name}: Salondayım`) },
      );
    } else if (c === 'coming') {
      setComingOpen(true);
    } else {
      if (!me || me.status === 'offline') return;
      clear.mutate(undefined, { onSuccess: () => toast.success('Çevrimdışı oldun') });
    }
  };

  return (
    <div className="space-y-3">
      <Segmented<Choice>
        size="sm"
        value={current}
        onChange={choose}
        options={[
          { value: 'at_venue', label: 'Salondayım', icon: <Users className="h-3.5 w-3.5" />, disabled: busy },
          { value: 'coming', label: 'Geleceğim', icon: <CalendarClock className="h-3.5 w-3.5" />, disabled: busy },
          { value: 'offline', label: 'Çevrimdışı Ol', icon: <Power className="h-3.5 w-3.5" />, disabled: busy || !me || me.status === 'offline' },
        ]}
      />

      {elsewhere ? (
        <Notice tone="warning" icon={<Info />}>
          Şu an <b>{me!.venueName}</b> için “{me!.status === 'at_venue' ? 'Salondayım' : 'Geleceğim'}” görünüyorsun. Burada durum seçersen durumun bu salona taşınır.
        </Notice>
      ) : null}

      {here && me!.status === 'at_venue' ? (
        <div className="rounded-2xl border border-border bg-surface p-3.5">
          <div className="mb-2 text-xs font-semibold text-muted">Maç isteği durumu</div>
          <div role="radiogroup" className="space-y-1">
            {(['wants', 'not'] as PlayIntent[]).map((v) => {
              const active = (me!.playIntent ?? 'not') === v;
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={setIntent.isPending}
                  onClick={() => !active && setIntent.mutate({ playIntent: v })}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl px-2 py-2 text-left text-sm transition-colors',
                    active ? 'text-brand' : 'text-muted hover:text-fg',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-full border-2',
                      active ? 'border-brand' : 'border-border-strong',
                    )}
                  >
                    {active ? <span className="h-2 w-2 rounded-full bg-brand" /> : null}
                  </span>
                  {PLAY_INTENT_LABELS[v]}
                </button>
              );
            })}
          </div>
          {me!.expiresAt ? (
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2.5 text-xs text-muted">
              <span className="inline-flex items-center gap-1.5">
                <Timer className="h-3.5 w-3.5" /> Durumun {timeWithSuffix(formatTime(me!.expiresAt), 'loc')} otomatik kapanır
              </span>
              <Button size="sm" variant="soft" loading={extend.isPending} onClick={() => extend.mutate()}>
                Uzat
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {here && me!.status === 'coming' ? (
        <div className="flex items-center justify-between gap-2 rounded-2xl border border-warning/30 bg-warning-soft/40 p-3.5 text-sm">
          <div>
            <div className="font-semibold">
              {me!.eta ? `${formatTime(me!.eta)} gibi geleceksin` : 'Geleceksin'}
              {me!.eta ? <span className="ml-1 text-xs font-normal text-muted">({relative(me!.eta)})</span> : null}
            </div>
            {me!.expiresAt ? (
              <div className="text-xs text-muted">Durumun {timeWithSuffix(formatTime(me!.expiresAt), 'loc')} otomatik kapanır</div>
            ) : null}
          </div>
          <Button size="sm" variant="secondary" onClick={() => setComingOpen(true)}>
            Saati değiştir
          </Button>
        </div>
      ) : null}

      <ComingDialog
        open={comingOpen}
        onOpenChange={setComingOpen}
        venueName={venue.name}
        initial={here && me?.status === 'coming' && me.eta ? new Date(me.eta) : null}
        pending={set.isPending}
        onConfirm={(eta) =>
          set.mutate(
            { venueId: venue.id, status: 'coming', eta: eta.toISOString(), playIntent: null },
            {
              onSuccess: () => {
                setComingOpen(false);
                toast.success(`${venue.name}: ${formatTime(eta)} gibi geleceksin`);
              },
            },
          )
        }
      />
    </div>
  );
}

const QUICK = [15, 30, 60, 120];

function ComingDialog({
  open,
  onOpenChange,
  venueName,
  initial,
  pending,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  venueName: string;
  initial: Date | null;
  pending: boolean;
  onConfirm: (eta: Date) => void;
}) {
  const [value, setValue] = useState(() => toLocalInputValue(initial ?? new Date(Date.now() + 30 * 60_000)));
  const maxH = PRESENCE_DEFAULTS.maxComingAheadHours;
  const eta = value ? new Date(fromLocalInputValue(value)) : null;
  const error = !eta
    ? 'Saat seç.'
    : eta.getTime() < Date.now() - 5 * 60_000
      ? 'Geçmiş bir saat seçilemez.'
      : eta.getTime() > Date.now() + maxH * 3600_000
        ? `En fazla ${maxH} saat sonrası seçilebilir.`
        : null;
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) setValue(toLocalInputValue(initial ?? new Date(Date.now() + 30 * 60_000)));
        onOpenChange(o);
      }}
    >
      <DialogContent title="Ne zaman geleceksin?" description={`${venueName} için “Geleceğim” durumu`}>
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {QUICK.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setValue(toLocalInputValue(new Date(Date.now() + m * 60_000)))}
                className="h-10 rounded-xl border border-border bg-surface-2 text-sm font-semibold hover:border-brand/50 hover:text-brand"
              >
                +{m >= 60 ? `${m / 60} sa` : `${m} dk`}
              </button>
            ))}
          </div>
          <Field label="Geliş saati" error={error} hint={eta && !error ? `${formatTime(eta)} · ${relative(eta)}` : undefined}>
            <Input
              type="datetime-local"
              value={value}
              min={toLocalInputValue(new Date())}
              max={toLocalInputValue(new Date(Date.now() + maxH * 3600_000))}
              onChange={(e) => setValue(e.target.value)}
            />
          </Field>
          <p className="text-xs text-muted">Geliş saatinden 1 saat sonra durumun otomatik kapanır. Salona gelince “Salondayım”ı seç.</p>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>
            Vazgeç
          </Button>
          <Button loading={pending} disabled={!!error} onClick={() => eta && onConfirm(eta)}>
            Geleceğim
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
