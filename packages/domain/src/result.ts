import { z } from 'zod';
import { DomainError, raceTargetFor, type MatchFormat } from './format';
import { gameCategory, type GameType } from './game';

const count = z.number().int().min(0).max(10000);
/** null = "Hatırlamıyorum" (bilinmiyor). 0 ile karıştırılmaz. */
const optionalRun = z.number().int().min(0).max(10000).nullable();

export const pointsResultSchema = z.object({
  category: z.literal('points'),
  winner: z.enum(['p1', 'p2', 'draw']),
  p1Score: count,
  p2Score: count,
  inningsMode: z.enum(['shared', 'separate']),
  innings: z.number().int().min(1).max(1000).nullable(),
  p1Innings: z.number().int().min(1).max(1000).nullable(),
  p2Innings: z.number().int().min(1).max(1000).nullable(),
  p1HighRun: optionalRun,
  p2HighRun: optionalRun,
});

export const raceResultSchema = z.object({
  category: z.enum(['racks', 'frames']),
  winner: z.enum(['p1', 'p2']),
  /** Kaç rack/frame kazanana oynandığı (handikapsız maçlarda). */
  target: z.number().int().min(1).max(50),
  p1Count: count,
  p2Count: count,
  /** Yalnız snooker: en yüksek break; null = hatırlamıyorum. */
  p1HighBreak: z.number().int().min(0).max(155).nullable().optional(),
  p2HighBreak: z.number().int().min(0).max(155).nullable().optional(),
});

export const resultInputSchema = z.discriminatedUnion('category', [pointsResultSchema, raceResultSchema]);
export type PointsResultInput = z.infer<typeof pointsResultSchema>;
export type RaceResultInput = z.infer<typeof raceResultSchema>;
export type ResultInput = z.infer<typeof resultInputSchema>;

export type NormalizedResult = {
  winnerSlot: 1 | 2 | null; // null = beraberlik
  p1Score: number;
  p2Score: number;
  p1Innings: number | null;
  p2Innings: number | null;
  p1HighRun: number | null;
  p2HighRun: number | null;
  target: number | null;
};

function fail(message: string): never {
  throw new DomainError('INVALID_RESULT', message);
}

/**
 * Sonuç girişini oyun türü ve maç formatına göre doğrular, veritabanına yazılacak normalize edilmiş hale getirir.
 * Kurallar dokümandaki tablodan gelir (bkz. "Maç Sonuçları").
 */
export function validateResult(game: GameType, format: MatchFormat, input: ResultInput): NormalizedResult {
  const category = gameCategory(game);
  if (input.category !== category) fail('Sonuç formu oyun türüyle uyumlu değil.');

  if (input.category === 'points') {
    if (format.category !== 'points') fail('Maç formatı hatalı.');
    let p1Innings: number;
    let p2Innings: number;
    if (input.inningsMode === 'shared') {
      if (input.innings == null) fail('Maçın isteka sayısını girin.');
      p1Innings = input.innings;
      p2Innings = input.innings;
    } else {
      if (input.p1Innings == null || input.p2Innings == null) fail('İki oyuncunun isteka sayısını girin.');
      p1Innings = input.p1Innings;
      p2Innings = input.p2Innings;
      if (Math.abs(p1Innings - p2Innings) > 1) fail('İki oyuncunun isteka sayıları arasındaki fark en fazla 1 olabilir.');
    }
    if (format.inningLimit && Math.max(p1Innings, p2Innings) > format.inningLimit) {
      fail(`İsteka sayısı maçın isteka sınırını (${format.inningLimit}) aşamaz.`);
    }
    if (input.p1HighRun != null && input.p1HighRun > input.p1Score) fail('Oyuncu 1 en yüksek serisi sayısından büyük olamaz.');
    if (input.p2HighRun != null && input.p2HighRun > input.p2Score) fail('Oyuncu 2 en yüksek serisi sayısından büyük olamaz.');

    if (input.p1Score > format.targetPoints || input.p2Score > format.targetPoints) {
      fail(`Sayı, hedef sayıyı (${format.targetPoints}) aşamaz.`);
    }

    // Handikap, oyuncunun başlangıç sayısıdır; kazanan handikap dahil toplamlara göre belirlenir.
    const p1Total = input.p1Score + (format.handicap?.p1 ?? 0);
    const p2Total = input.p2Score + (format.handicap?.p2 ?? 0);
    const expected = p1Total === p2Total ? 'draw' : p1Total > p2Total ? 'p1' : 'p2';
    if (input.winner !== expected) {
      fail(
        expected === 'draw'
          ? format.handicap
            ? 'Handikap dahil sayılar eşit; sonuç beraberlik olmalı.'
            : 'Sayılar eşit; sonuç beraberlik olmalı.'
          : format.handicap
            ? 'Kazanan, handikap dahil sayısı yüksek olan oyuncu olmalı.'
            : 'Kazanan, sayısı yüksek olan oyuncu olmalı.',
      );
    }

    return {
      winnerSlot: input.winner === 'draw' ? null : input.winner === 'p1' ? 1 : 2,
      p1Score: input.p1Score,
      p2Score: input.p2Score,
      p1Innings,
      p2Innings,
      p1HighRun: input.p1HighRun,
      p2HighRun: input.p2HighRun,
      target: format.targetPoints,
    };
  }

  // racks / frames
  if (format.category === 'points') fail('Maç formatı hatalı.');
  const unit = input.category === 'racks' ? 'rack' : 'frame';
  const winnerSlot: 1 | 2 = input.winner === 'p1' ? 1 : 2;
  const loserSlot: 1 | 2 = winnerSlot === 1 ? 2 : 1;
  const effectiveFormat = format.handicap ? format : { ...format, target: input.target };
  const winnerTarget = raceTargetFor(effectiveFormat, winnerSlot);
  const loserTarget = raceTargetFor(effectiveFormat, loserSlot);
  const winnerCount = winnerSlot === 1 ? input.p1Count : input.p2Count;
  const loserCount = winnerSlot === 1 ? input.p2Count : input.p1Count;
  if (winnerCount !== winnerTarget) fail(`Kazananın ${unit} sayısı hedefe (${winnerTarget}) eşit olmalı.`);
  if (loserCount >= loserTarget) fail(`Rakibin ${unit} sayısı hedeften (${loserTarget}) düşük olmalı.`);

  const isSnooker = input.category === 'frames';
  return {
    winnerSlot,
    p1Score: input.p1Count,
    p2Score: input.p2Count,
    p1Innings: null,
    p2Innings: null,
    p1HighRun: isSnooker ? (input.p1HighBreak ?? null) : null,
    p2HighRun: isSnooker ? (input.p2HighBreak ?? null) : null,
    target: format.handicap ? null : input.target,
  };
}

/** Kazanan etiketini oyuncu adlarıyla üretir. */
export function describeResult(
  game: GameType,
  r: Pick<NormalizedResult, 'winnerSlot' | 'p1Score' | 'p2Score' | 'p1Innings' | 'p2Innings'>,
): string {
  const score = `${r.p1Score} - ${r.p2Score}`;
  if (gameCategory(game) === 'points' && r.p1Innings) {
    const inn = r.p1Innings === r.p2Innings ? `${r.p1Innings} isteka` : `${r.p1Innings}/${r.p2Innings} isteka`;
    return `${score} · ${inn}`;
  }
  return score;
}

/** UI'da kazananı otomatik önermek için: handikap dahil toplamlara göre. */
export function suggestPointsWinner(
  format: MatchFormat,
  p1Score: number,
  p2Score: number,
): 'p1' | 'p2' | 'draw' {
  const h = format.category === 'points' ? format.handicap : null;
  const a = p1Score + (h?.p1 ?? 0);
  const b = p2Score + (h?.p2 ?? 0);
  return a === b ? 'draw' : a > b ? 'p1' : 'p2';
}
