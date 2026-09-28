'use client';
import type { RouterOutputs } from '@bilardogo/api';
import { GAME_SHORT_LABELS, GAME_TYPES, type GameType } from '@bilardogo/domain';
import { Button, Dialog, DialogContent, DialogFooter, Field, Input, MultiToggle, Notice, SwitchRow, toast } from '@bilardogo/ui';
import { Info } from 'lucide-react';
import { useState } from 'react';
import { errorMessage, trpc } from '@/lib/trpc/client';

export type VenueTable = RouterOutputs['business']['tables'][number];

const GAME_OPTIONS = GAME_TYPES.map((g) => ({ value: g, label: GAME_SHORT_LABELS[g] }));

export function gamesLabel(games: readonly GameType[]) {
  return games.map((g) => GAME_SHORT_LABELS[g]).join(' / ');
}

function toInt(s: string) {
  const n = Number(s);
  return Number.isInteger(n) ? n : NaN;
}

export function TableDialog({
  open,
  onOpenChange,
  venueId,
  table,
  existing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  venueId: string;
  table?: VenueTable | null;
  existing: VenueTable[];
}) {
  const utils = trpc.useUtils();
  const nextNumber = existing.reduce((m, t) => Math.max(m, t.number), 0) + 1;
  const [number, setNumber] = useState(String(table?.number ?? nextNumber));
  const [label, setLabel] = useState(table?.label ?? '');
  const [games, setGames] = useState<GameType[]>(table?.allowedGameTypes ?? ['three_cushion', 'carom']);
  const [isActive, setIsActive] = useState(table?.isActive ?? true);
  const [errors, setErrors] = useState<{ number?: string; label?: string; games?: string }>({});
  const done = (msg: string) => {
    toast.success(msg);
    onOpenChange(false);
    void utils.business.tables.invalidate({ venueId });
    void utils.business.overview.invalidate({ venueId });
    void utils.business.allTableQrs.invalidate({ venueId });
  };
  const create = trpc.business.createTable.useMutation({ onSuccess: (t) => done(`Masa ${t.number} eklendi.`), onError: (e) => toast.error(errorMessage(e)) });
  const update = trpc.business.updateTable.useMutation({ onSuccess: () => done('Masa güncellendi.'), onError: (e) => toast.error(errorMessage(e)) });
  const pending = create.isPending || update.isPending;

  const save = () => {
    const e: typeof errors = {};
    const n = toInt(number);
    if (!Number.isFinite(n) || n < 1 || n > 500) e.number = 'Masa numarası 1 ile 500 arasında olmalı.';
    else if (existing.some((t) => t.number === n && t.id !== table?.id)) e.number = `Masa ${n} zaten tanımlı.`;
    if (label.trim().length > 40) e.label = 'Etiket en fazla 40 karakter olabilir.';
    if (!games.length) e.games = 'Masada en az bir oyun türü oynanabilmeli.';
    setErrors(e);
    if (Object.keys(e).length) return;
    const data = { number: n, label: label.trim() || null, allowedGameTypes: games, isActive };
    if (table) update.mutate({ tableId: table.id, data });
    else create.mutate({ venueId, data });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={table ? `Masa ${table.number} düzenle` : 'Masa ekle'} description="Masa numarası ve bu masada oynanabilecek oyun türleri.">
        <div className="space-y-4">
          <div className="grid grid-cols-[7rem_1fr] gap-3">
            <Field label="Masa no" required error={errors.number}>
              <Input inputMode="numeric" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, '').slice(0, 3))} />
            </Field>
            <Field label="Etiket" error={errors.label} hint="İsteğe bağlı, ör. “VIP”, “Arka salon”">
              <Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} placeholder="—" />
            </Field>
          </div>
          <Field label="Oynanabilir oyun türleri" required error={errors.games} hint="Oyuncular bu masada yalnız seçili türleri başlatabilir.">
            <MultiToggle value={games} onChange={setGames} options={GAME_OPTIONS} />
          </Field>
          <div className="rounded-2xl border border-border px-3">
            <SwitchRow label="Masa aktif" description="Pasif masa QR ile maç başlatmaya kapalıdır." checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={pending}>
            Vazgeç
          </Button>
          <Button onClick={save} loading={pending}>
            {table ? 'Kaydet' : 'Masa ekle'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BulkTablesDialog({
  open,
  onOpenChange,
  venueId,
  existing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  venueId: string;
  existing: VenueTable[];
}) {
  const utils = trpc.useUtils();
  const start = existing.reduce((m, t) => Math.max(m, t.number), 0) + 1;
  const [from, setFrom] = useState(String(start));
  const [to, setTo] = useState(String(start + 4));
  const [games, setGames] = useState<GameType[]>(['three_cushion', 'carom']);
  const [error, setError] = useState<string | null>(null);
  const mutation = trpc.business.createTables.useMutation({
    onSuccess: (r) => {
      toast.success(r.created ? `${r.created} masa eklendi.` : 'Yeni masa eklenmedi.', {
        description: r.skipped ? `${r.skipped} numara zaten tanımlı olduğu için atlandı.` : undefined,
      });
      onOpenChange(false);
      void utils.business.tables.invalidate({ venueId });
      void utils.business.overview.invalidate({ venueId });
      void utils.business.allTableQrs.invalidate({ venueId });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const f = toInt(from);
  const t = toInt(to);
  const valid = Number.isFinite(f) && Number.isFinite(t) && f >= 1 && t <= 500 && t >= f && t - f <= 99;
  const clashes = valid ? existing.filter((x) => x.number >= f && x.number <= t).length : 0;
  const save = () => {
    if (!Number.isFinite(f) || !Number.isFinite(t) || f < 1 || t > 500) return setError('Masa numaraları 1 ile 500 arasında olmalı.');
    if (t < f) return setError('Bitiş numarası başlangıçtan küçük olamaz.');
    if (t - f > 99) return setError('Tek seferde en fazla 100 masa eklenebilir.');
    if (!games.length) return setError('En az bir oyun türü seçin.');
    setError(null);
    mutation.mutate({ venueId, from: f, to: t, allowedGameTypes: games });
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Toplu masa ekle" description="Aynı oyun türlerine sahip masaları tek seferde tanımla.">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="İlk masa no" required>
              <Input inputMode="numeric" value={from} onChange={(e) => setFrom(e.target.value.replace(/\D/g, '').slice(0, 3))} />
            </Field>
            <Field label="Son masa no" required>
              <Input inputMode="numeric" value={to} onChange={(e) => setTo(e.target.value.replace(/\D/g, '').slice(0, 3))} />
            </Field>
          </div>
          <Field label="Oynanabilir oyun türleri" required>
            <MultiToggle value={games} onChange={setGames} options={GAME_OPTIONS} />
          </Field>
          {valid && games.length ? (
            <div className="rounded-2xl border border-brand/30 bg-brand-soft p-3 text-sm font-semibold text-brand">
              Masa {f}–{t} → {gamesLabel(games)}
              <div className="text-xs font-normal text-fg/70">
                {t - f + 1 - clashes} yeni masa eklenecek{clashes ? `, ${clashes} tanesi zaten var (atlanacak)` : ''}.
              </div>
            </div>
          ) : null}
          {error ? <p className="text-xs text-danger">{error}</p> : null}
          <Notice tone="info" icon={<Info />}>
            Örnek: Masa 1–5 → 3 Bant / Karambol, Masa 6–9 → Amerikan / 9 Top, Masa 10 → Snooker.
          </Notice>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            Vazgeç
          </Button>
          <Button onClick={save} loading={mutation.isPending}>
            Masaları ekle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
