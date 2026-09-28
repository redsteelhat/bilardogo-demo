'use client';
import {
  defaultFormat,
  GAME_SHORT_LABELS,
  GAME_TYPES,
  UNIT_LABELS,
  type GameType,
  type MatchFormat,
} from '@bilardogo/domain';
import { cn, FormRow, Segmented, Stepper, Switch } from '@bilardogo/ui';

export type GameAndFormat = { gameType: GameType; format: MatchFormat };

export function initialGameAndFormat(game: GameType): GameAndFormat {
  return { gameType: game, format: defaultFormat(game) };
}

/**
 * Oyun türü + oyuna özel format + handikap düzenleyici (maç isteği ve masa oturumu).
 * Oyuncu 1 = "Ben" (isteği gönderen / masa oturumunu açan).
 */
export function FormatEditor({
  value,
  onChange,
  opponentName,
  allowedGames,
  hideGamePicker,
  className,
}: {
  value: GameAndFormat;
  onChange: (v: GameAndFormat) => void;
  opponentName?: string | null;
  /** Yalnız bu türler seçilebilir (masanın izin verdiği türler). */
  allowedGames?: readonly GameType[];
  hideGamePicker?: boolean;
  className?: string;
}) {
  const { gameType, format } = value;
  const setFormat = (f: MatchFormat) => onChange({ gameType, format: f });
  const opp = opponentName?.trim() || 'Rakip';

  return (
    <div className={cn('divide-y divide-border', className)}>
      {!hideGamePicker ? (
        <div className="pb-3">
          <div className="mb-2 text-sm text-muted">Bilardo Türü</div>
          <Segmented
            size="sm"
            wrap
            value={gameType}
            onChange={(g) => onChange({ gameType: g, format: defaultFormat(g) })}
            options={GAME_TYPES.map((g) => ({
              value: g,
              label: GAME_SHORT_LABELS[g],
              disabled: allowedGames ? !allowedGames.includes(g) : false,
            }))}
          />
        </div>
      ) : null}

      {format.category === 'points' ? (
        <>
          <FormRow label={UNIT_LABELS.points.target}>
            <Stepper
              aria-label="Hedef sayı"
              value={format.targetPoints}
              min={1}
              max={500}
              step={gameType === 'carom' ? 10 : 5}
              onChange={(v) => setFormat({ ...format, targetPoints: v })}
            />
          </FormRow>
          <FormRow label="İsteka Sayısı" hint={format.inningLimit === null ? 'Sınırsız' : undefined}>
            <div className="flex items-center gap-2">
              {format.inningLimit !== null ? (
                <Stepper
                  aria-label="İsteka sayısı"
                  value={format.inningLimit}
                  min={1}
                  max={500}
                  step={5}
                  onChange={(v) => setFormat({ ...format, inningLimit: v })}
                />
              ) : null}
              <label className="flex items-center gap-1.5 text-[11px] text-muted">
                <Switch
                  checked={format.inningLimit === null}
                  onCheckedChange={(c) => setFormat({ ...format, inningLimit: c ? null : 40 })}
                  aria-label="Sınırsız isteka"
                />
                Sınırsız
              </label>
            </div>
          </FormRow>
          <FormRow label="Handikap">
            <HandicapToggle
              on={!!format.handicap}
              onChange={(on) => setFormat({ ...format, handicap: on ? { p1: 0, p2: 5 } : null })}
            />
          </FormRow>
          {format.handicap ? (
            <>
              <FormRow label="Ben (Handikap)" hint="Başlangıç sayısı">
                <Stepper
                  aria-label="Benim handikapım"
                  value={format.handicap.p1}
                  min={0}
                  max={300}
                  onChange={(v) => setFormat({ ...format, handicap: { ...format.handicap!, p1: v } })}
                />
              </FormRow>
              <FormRow label={`${opp} (Handikap)`} hint="Başlangıç sayısı">
                <Stepper
                  aria-label="Rakibin handikapı"
                  value={format.handicap.p2}
                  min={0}
                  max={300}
                  onChange={(v) => setFormat({ ...format, handicap: { ...format.handicap!, p2: v } })}
                />
              </FormRow>
            </>
          ) : null}
        </>
      ) : (
        <RaceRows format={format} onChange={setFormat} opponentName={opp} />
      )}
    </div>
  );
}

function RaceRows({
  format,
  onChange,
  opponentName,
}: {
  format: Extract<MatchFormat, { category: 'racks' | 'frames' }>;
  onChange: (f: MatchFormat) => void;
  opponentName: string;
}) {
  const unit = format.category === 'racks' ? 'Rack' : 'Frame';
  return (
    <>
      {!format.handicap ? (
        <FormRow label={UNIT_LABELS[format.category].target} hint={`${format.target} ${unit.toLowerCase()} alan kazanır`}>
          <Stepper aria-label={`Hedef ${unit}`} value={format.target} min={1} max={50} onChange={(v) => onChange({ ...format, target: v })} />
        </FormRow>
      ) : (
        <>
          <FormRow label={`Benim ${unit}`} hint="Kazanmam için gereken">
            <Stepper
              aria-label={`Benim ${unit}`}
              value={format.handicap.p1Target}
              min={1}
              max={50}
              onChange={(v) => onChange({ ...format, handicap: { ...format.handicap!, p1Target: v } })}
            />
          </FormRow>
          <FormRow label={`${opponentName === 'Rakip' ? 'Rakibin' : opponentName} ${unit}`} hint="Rakibin kazanması için gereken">
            <Stepper
              aria-label={`Rakibin ${unit}`}
              value={format.handicap.p2Target}
              min={1}
              max={50}
              onChange={(v) => onChange({ ...format, handicap: { ...format.handicap!, p2Target: v } })}
            />
          </FormRow>
        </>
      )}
      <FormRow label="Handikap" hint={format.handicap ? 'Her oyuncunun kendi hedefi var' : undefined}>
        <HandicapToggle
          on={!!format.handicap}
          onChange={(on) =>
            onChange({
              ...format,
              handicap: on ? { p1Target: format.target, p2Target: Math.max(1, format.target - 1) } : null,
            })
          }
        />
      </FormRow>
    </>
  );
}

function HandicapToggle({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <Segmented
      size="sm"
      value={on ? 'yes' : 'no'}
      onChange={(v) => onChange(v === 'yes')}
      options={[
        { value: 'no', label: 'Yok' },
        { value: 'yes', label: 'Var' },
      ]}
    />
  );
}
