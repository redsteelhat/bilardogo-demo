'use client';
import {
  computeAverage,
  formatAverage,
  raceTargetFor,
  suggestPointsWinner,
  validateResult,
  type ResultInput,
} from '@bilardogo/domain';
import { Button, cn, Input, Label, Notice, Segmented, Switch, toast } from '@bilardogo/ui';
import { AlertCircle, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { errorMessage, trpc } from '@/lib/trpc/client';
import { domainError, type Match } from './helpers';

const toInt = (s: string): number | null => {
  if (s.trim() === '') return null;
  const n = Number(s);
  return Number.isInteger(n) && n >= 0 ? n : NaN;
};
const firstName = (s: string | undefined) => (s ?? '').split(' ')[0] || 'Oyuncu';

/** Oyun türüne göre sonuç formu. Domain doğrulaması istemcide de çalışır, hatalar Türkçe gösterilir. */
export function ResultForm({ match, onDone }: { match: Match; onDone?: () => void }) {
  const utils = trpc.useUtils();
  const submit = trpc.matches.submitResult.useMutation({
    onSuccess: async () => {
      toast.success('Sonuç gönderildi', { description: 'Rakibin onayladığında istatistiklere işlenecek.' });
      await utils.matches.invalidate();
      onDone?.();
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  const p1 = match.players.find((p) => p.slot === 1)?.user;
  const p2 = match.players.find((p) => p.slot === 2)?.user;
  const names = { p1: firstName(p1?.displayName), p2: firstName(p2?.displayName) };

  return match.format.category === 'points' ? (
    <PointsForm match={match} names={names} pending={submit.isPending} onSubmit={(r) => submit.mutate({ matchId: match.id, result: r })} />
  ) : (
    <RaceForm match={match} names={names} pending={submit.isPending} onSubmit={(r) => submit.mutate({ matchId: match.id, result: r })} />
  );
}

type FormProps = {
  match: Match;
  names: { p1: string; p2: string };
  pending: boolean;
  onSubmit: (r: ResultInput) => void;
};

function PointsForm({ match, names, pending, onSubmit }: FormProps) {
  const format = match.format;
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [winner, setWinner] = useState<'p1' | 'p2' | 'draw' | null>(null);
  const [winnerTouched, setWinnerTouched] = useState(false);
  const [separate, setSeparate] = useState(false);
  const [inn, setInn] = useState('');
  const [inn1, setInn1] = useState('');
  const [inn2, setInn2] = useState('');
  const [h1, setH1] = useState('');
  const [h2, setH2] = useState('');
  const [u1, setU1] = useState(false);
  const [u2, setU2] = useState(false);
  const [tried, setTried] = useState(false);

  const n = { s1: toInt(s1), s2: toInt(s2), inn: toInt(inn), inn1: toInt(inn1), inn2: toInt(inn2), h1: toInt(h1), h2: toInt(h2) };
  // Sayılar değiştikçe kazananı öner (kullanıcı elle seçmediyse)
  const suggested = n.s1 != null && n.s2 != null && !Number.isNaN(n.s1) && !Number.isNaN(n.s2) ? suggestPointsWinner(format, n.s1, n.s2) : null;
  const effectiveWinner = winnerTouched ? winner : (suggested ?? winner);

  const { input, error } = useMemo(() => {
    const missing = (): string | null => {
      if (n.s1 == null || n.s2 == null) return 'İki oyuncunun sayısını gir.';
      if (Object.values(n).some((v) => Number.isNaN(v))) return 'Değerler 0 veya pozitif tam sayı olmalı.';
      if (!separate && n.inn == null) return 'Maçın isteka sayısını gir.';
      if (separate && (n.inn1 == null || n.inn2 == null)) return 'İki oyuncunun isteka sayısını gir.';
      if (!u1 && n.h1 == null) return `${names.p1} için en yüksek seriyi gir ya da “Hatırlamıyorum”u işaretle.`;
      if (!u2 && n.h2 == null) return `${names.p2} için en yüksek seriyi gir ya da “Hatırlamıyorum”u işaretle.`;
      if (!effectiveWinner) return 'Kazananı seç.';
      return null;
    };
    const m = missing();
    if (m) return { input: null, error: m };
    const r: ResultInput = {
      category: 'points',
      winner: effectiveWinner!,
      p1Score: n.s1!,
      p2Score: n.s2!,
      inningsMode: separate ? 'separate' : 'shared',
      innings: separate ? null : n.inn,
      p1Innings: separate ? n.inn1 : null,
      p2Innings: separate ? n.inn2 : null,
      p1HighRun: u1 ? null : n.h1,
      p2HighRun: u2 ? null : n.h2,
    };
    return { input: r, error: domainError(() => validateResult(match.gameType, format, r)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s1, s2, inn, inn1, inn2, h1, h2, u1, u2, separate, effectiveWinner, format, match.gameType]);

  const dirty = [s1, s2, inn, inn1, inn2, h1, h2].some((x) => x !== '') || tried;
  const i1 = separate ? n.inn1 : n.inn;
  const i2 = separate ? n.inn2 : n.inn;
  const avg = (s: number | null, i: number | null) => (s != null && i && !Number.isNaN(s) && !Number.isNaN(i) ? computeAverage(s, i) : null);
  const handicap = format.category === 'points' ? format.handicap : null;
  const target = format.category === 'points' ? format.targetPoints : 0;
  const limit = format.category === 'points' ? format.inningLimit : null;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (input && !error) onSubmit(input);
      }}
    >
      <div className="grid grid-cols-2 gap-2.5">
        {(['p1', 'p2'] as const).map((k) => {
          const isP1 = k === 'p1';
          const score = isP1 ? s1 : s2;
          const high = isP1 ? h1 : h2;
          const unknown = isP1 ? u1 : u2;
          return (
            <div key={k} className="space-y-3 rounded-2xl border border-border bg-surface-2 p-3">
              <div className="truncate text-center text-sm font-bold">{names[k]}</div>
              <NumField
                label="Sayı"
                value={score}
                onChange={isP1 ? setS1 : setS2}
                hint={handicap ? `+${isP1 ? handicap.p1 : handicap.p2} handikap` : `Hedef ${target}`}
                big
              />
              <div>
                <NumField label="En yüksek seri" value={unknown ? '' : high} onChange={isP1 ? setH1 : setH2} disabled={unknown} />
                <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-[11px] text-muted">
                  <input
                    type="checkbox"
                    checked={unknown}
                    onChange={(e) => {
                      (isP1 ? setU1 : setU2)(e.target.checked);
                      if (e.target.checked) (isP1 ? setH1 : setH2)('');
                    }}
                    className="h-3.5 w-3.5 accent-[var(--color-brand)]"
                  />
                  Hatırlamıyorum
                </label>
              </div>
              <div className="rounded-xl bg-bg/50 px-2 py-1.5 text-center">
                <div className="text-[10px] uppercase tracking-wide text-subtle">Ortalama</div>
                <div className="font-display text-lg font-bold tabular-nums text-brand">{formatAverage(avg(isP1 ? n.s1 : n.s2, isP1 ? i1 : i2))}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-border bg-surface-2 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold">İsteka</div>
            <div className="text-[11px] text-subtle">{limit ? `Sınır: ${limit} isteka` : 'İsteka sınırı yok'}</div>
          </div>
          <label className="flex items-center gap-2 text-xs text-muted">
            İstekalar farklı
            <Switch checked={separate} onCheckedChange={setSeparate} aria-label="İstekalar farklı" />
          </label>
        </div>
        <div className="mt-3">
          {separate ? (
            <div className="grid grid-cols-2 gap-2.5">
              <NumField label={`${names.p1} isteka`} value={inn1} onChange={setInn1} />
              <NumField label={`${names.p2} isteka`} value={inn2} onChange={setInn2} />
              <p className="col-span-2 text-[11px] text-subtle">İki oyuncunun isteka sayısı arasındaki fark en fazla 1 olabilir.</p>
            </div>
          ) : (
            <NumField label="Maçın isteka sayısı" value={inn} onChange={setInn} />
          )}
        </div>
      </div>

      <div>
        <Label>Kazanan</Label>
        <Segmented
          wrap
          value={effectiveWinner}
          onChange={(v) => {
            setWinner(v);
            setWinnerTouched(true);
          }}
          options={[
            { value: 'p1', label: names.p1 },
            { value: 'p2', label: names.p2 },
            { value: 'draw', label: 'Beraberlik' },
          ]}
        />
        {!winnerTouched && suggested ? <p className="mt-1 text-[11px] text-subtle">Sayılara göre otomatik seçildi.</p> : null}
      </div>

      <Errors show={dirty} error={error} />
      <Button type="submit" size="lg" block loading={pending} disabled={!!error && tried}>
        <Send className="h-4 w-4" /> Sonucu gönder
      </Button>
    </form>
  );
}

function RaceForm({ match, names, pending, onSubmit }: FormProps) {
  const format = match.format.category === 'points' ? null : match.format;
  const snooker = format?.category === 'frames';
  const unit = snooker ? 'frame' : 'rack';
  const Unit = snooker ? 'Frame' : 'Rack';
  const [target, setTarget] = useState(String(format?.target ?? ''));
  const [c1, setC1] = useState('');
  const [c2, setC2] = useState('');
  const [winner, setWinner] = useState<'p1' | 'p2' | null>(null);
  const [winnerTouched, setWinnerTouched] = useState(false);
  const [b1, setB1] = useState('');
  const [b2, setB2] = useState('');
  const [u1, setU1] = useState(false);
  const [u2, setU2] = useState(false);
  const [tried, setTried] = useState(false);

  const n = { t: toInt(target), c1: toInt(c1), c2: toInt(c2), b1: toInt(b1), b2: toInt(b2) };
  const suggested = n.c1 != null && n.c2 != null && !Number.isNaN(n.c1) && !Number.isNaN(n.c2) && n.c1 !== n.c2 ? (n.c1 > n.c2 ? 'p1' : 'p2') : null;
  const effectiveWinner = winnerTouched ? winner : (suggested ?? winner);

  const { input, error } = useMemo(() => {
    if (!format) return { input: null, error: 'Maç formatı hatalı.' };
    const missing = (): string | null => {
      if (!format.handicap && (n.t == null || Number.isNaN(n.t) || n.t < 1)) return `Kaç ${unit} kazanana oynandığını gir.`;
      if (n.c1 == null || n.c2 == null) return `İki oyuncunun kazandığı ${unit} sayısını gir.`;
      if (Object.values(n).some((v) => Number.isNaN(v))) return 'Değerler 0 veya pozitif tam sayı olmalı.';
      if (snooker && ((n.b1 ?? 0) > 155 || (n.b2 ?? 0) > 155)) return 'En yüksek break 155’ten büyük olamaz.';
      if (!effectiveWinner) return 'Kazananı seç.';
      return null;
    };
    const m = missing();
    if (m) return { input: null, error: m };
    const r: ResultInput = {
      category: format.category,
      winner: effectiveWinner!,
      target: format.handicap ? format.target : n.t!,
      p1Count: n.c1!,
      p2Count: n.c2!,
      ...(snooker ? { p1HighBreak: u1 ? null : n.b1, p2HighBreak: u2 ? null : n.b2 } : {}),
    };
    return { input: r, error: domainError(() => validateResult(match.gameType, format, r)) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, c1, c2, b1, b2, u1, u2, effectiveWinner, format, match.gameType]);

  if (!format) return <Notice tone="danger">Maç formatı hatalı.</Notice>;
  const dirty = [c1, c2, b1, b2].some((x) => x !== '') || tried;
  const targets = format.handicap
    ? { p1: raceTargetFor(format, 1), p2: raceTargetFor(format, 2) }
    : null;

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (input && !error) onSubmit(input);
      }}
    >
      {!format.handicap ? (
        <NumField label={`Kaç ${unit} kazanana oynandı`} value={target} onChange={setTarget} hint={`Maç ${format.target} ${unit} olarak ayarlanmıştı.`} />
      ) : (
        <Notice tone="info">
          Handikaplı maç: {names.p1} {targets!.p1} {unit}, {names.p2} {targets!.p2} {unit} alırsa kazanır.
        </Notice>
      )}
      <div className="grid grid-cols-2 gap-2.5">
        {(['p1', 'p2'] as const).map((k) => {
          const isP1 = k === 'p1';
          return (
            <div key={k} className="space-y-3 rounded-2xl border border-border bg-surface-2 p-3">
              <div className="truncate text-center text-sm font-bold">{names[k]}</div>
              <NumField label={`Kazandığı ${Unit}`} value={isP1 ? c1 : c2} onChange={isP1 ? setC1 : setC2} big />
              {snooker ? (
                <div>
                  <NumField
                    label="En yüksek break"
                    value={(isP1 ? u1 : u2) ? '' : isP1 ? b1 : b2}
                    onChange={isP1 ? setB1 : setB2}
                    disabled={isP1 ? u1 : u2}
                    hint="Opsiyonel"
                  />
                  <label className="mt-1.5 flex cursor-pointer items-center gap-1.5 text-[11px] text-muted">
                    <input
                      type="checkbox"
                      checked={isP1 ? u1 : u2}
                      onChange={(e) => {
                        (isP1 ? setU1 : setU2)(e.target.checked);
                        if (e.target.checked) (isP1 ? setB1 : setB2)('');
                      }}
                      className="h-3.5 w-3.5 accent-[var(--color-brand)]"
                    />
                    Hatırlamıyorum
                  </label>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      <div>
        <Label>Kazanan</Label>
        <Segmented
          value={effectiveWinner}
          onChange={(v) => {
            setWinner(v);
            setWinnerTouched(true);
          }}
          options={[
            { value: 'p1', label: names.p1 },
            { value: 'p2', label: names.p2 },
          ]}
        />
      </div>
      <Errors show={dirty} error={error} />
      <Button type="submit" size="lg" block loading={pending} disabled={!!error && tried}>
        <Send className="h-4 w-4" /> Sonucu gönder
      </Button>
    </form>
  );
}

function Errors({ show, error }: { show: boolean; error: string | null }) {
  if (!show || !error) return null;
  return (
    <Notice tone="danger" icon={<AlertCircle />}>
      {error}
    </Notice>
  );
}

function NumField({
  label,
  value,
  onChange,
  hint,
  disabled,
  big,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  disabled?: boolean;
  big?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold text-muted">{label}</span>
      <Input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        disabled={disabled}
        placeholder={disabled ? '—' : '0'}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, '').slice(0, 5))}
        className={cn('text-center tabular-nums', big ? 'h-14 font-display text-2xl font-bold' : 'h-10')}
      />
      {hint ? <span className="mt-1 block text-center text-[10px] text-subtle">{hint}</span> : null}
    </label>
  );
}
