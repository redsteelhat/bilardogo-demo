'use client';
import { formatAverage, GAME_LABELS, GAME_SHORT_LABELS, GAME_TYPES, gameCategory, type GameType } from '@bilardogo/domain';
import { Card, CardBody, CardHeader, Segmented, StatTile } from '@bilardogo/ui';
import { BarChart3, Flame } from 'lucide-react';
import { useState } from 'react';
import { formatDate, formatMinutes } from '@/lib/format';
import type { Profile } from './types';

/** Bilardo devamlılığı + toplamlar. */
export function ProfileTotals({ profile }: { profile: Profile }) {
  const t = profile.stats.total;
  const c = profile.continuity;
  return (
    <div className="space-y-3">
      <Card>
        <div className="flex items-center gap-3 p-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
            <Flame className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-xs text-muted">Bilardo devamlılığı</div>
            <div className="font-display text-base font-semibold leading-tight">
              Son 30 günde {c.activeDaysLast30} gün
              {c.streakWeeks > 0 ? <span className="text-brand"> · {c.streakWeeks} hafta üst üste</span> : null}
            </div>
            <div className="text-[11px] text-subtle">
              {c.lastActiveDay ? `Son oynadığı gün: ${formatDate(c.lastActiveDay, { day: 'numeric', month: 'long' })}` : 'Henüz kayıtlı oyun günü yok'}
            </div>
          </div>
        </div>
        <ContinuityBar days={c.activeDaysLast30} />
      </Card>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatTile label="Toplam maç" value={t.matches} />
        <StatTile label="Kazanılan" value={<span className="text-success">{t.wins}</span>} hint={t.draws ? `${t.draws} berabere` : undefined} />
        <StatTile label="Galibiyet" value={`%${t.winRate}`} />
        <StatTile label="Masa süresi" value={<span className="text-base">{formatMinutes(t.tableMinutes)}</span>} />
      </div>
    </div>
  );
}

function ContinuityBar({ days }: { days: number }) {
  const pct = Math.min(100, Math.round((days / 30) * 100));
  return (
    <div className="px-4 pb-4">
      <div className="h-2 overflow-hidden rounded-full bg-surface-3">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** Oyun türüne göre istatistikler (sekmeli). */
export function ProfileGameStats({ profile }: { profile: Profile }) {
  const byGame = profile.stats.byGame;
  const initial =
    GAME_TYPES.find((g) => byGame[g].matches > 0) ?? profile.user.gameTypes[0] ?? ('three_cushion' as GameType);
  const [game, setGame] = useState<GameType>(initial);
  const s = byGame[game];
  const cat = gameCategory(game);
  const unit = cat === 'racks' ? 'rack' : 'frame';
  return (
    <Card>
      <CardHeader icon={<BarChart3 className="h-5 w-5" />} title="Oyun türüne göre" description={GAME_LABELS[game]} />
      <CardBody className="space-y-3">
        <Segmented
          size="sm"
          value={game}
          onChange={setGame}
          options={GAME_TYPES.map((g) => ({
            value: g,
            label: (
              <>
                {GAME_SHORT_LABELS[g]}
                {byGame[g].matches ? <span className="text-[10px] opacity-70">{byGame[g].matches}</span> : null}
              </>
            ),
          }))}
        />
        {s.matches === 0 ? (
          <p className="rounded-2xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted">
            {GAME_SHORT_LABELS[game]} türünde onaylanmış maç yok.
          </p>
        ) : cat === 'points' ? (
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Ortalamam" value={<span className="tabular-nums text-brand">{formatAverage(s.average)}</span>} />
            <StatTile label="En iyi maç ort." value={<span className="tabular-nums">{formatAverage(s.bestMatchAverage)}</span>} />
            <StatTile label="En yüksek seri" value={s.bestHighRun ?? '—'} />
            <StatTile label="Maç / Galibiyet" value={`${s.matches} / ${s.wins}`} hint={`%${s.winRate} galibiyet`} />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Kazanılan maç" value={<span className="text-success">{s.wins}</span>} hint={`${s.matches} maç · %${s.winRate}`} />
            <StatTile label="Kaybedilen maç" value={s.losses} />
            <StatTile label={`Kazanılan ${unit}`} value={s.won} />
            <StatTile label={`Kaybedilen ${unit}`} value={s.lost} />
            {cat === 'frames' ? <StatTile label="En yüksek break" value={s.bestHighRun ?? '—'} className="col-span-2" /> : null}
          </div>
        )}
        {s.matches ? (
          <p className="text-[11px] text-subtle">
            Masa süresi {formatMinutes(s.tableMinutes)}
            {s.lastPlayedAt ? ` · son maç ${formatDate(s.lastPlayedAt)}` : ''}
          </p>
        ) : null}
      </CardBody>
    </Card>
  );
}
