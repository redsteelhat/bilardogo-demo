import { z } from 'zod';
import { gameCategory, type GameType } from './game';

/**
 * Maç formatı oyun türüne göre değişir.
 * - points (3 Bant, Karambol): hedef sayı + isteka sınırı; handikap = oyuncuya eklenen başlangıç sayısı.
 * - racks (Amerikan, 9 Top): hedef rack; handikap = her oyuncunun kendi hedef rack'i (race).
 * - frames (Snooker): hedef frame; handikap = her oyuncunun kendi hedef frame'i.
 */
export const pointsFormatSchema = z.object({
  category: z.literal('points'),
  targetPoints: z.number().int().min(1).max(500),
  inningLimit: z.number().int().min(1).max(500).nullable(),
  handicap: z
    .object({ p1: z.number().int().min(0).max(300), p2: z.number().int().min(0).max(300) })
    .nullable(),
});

export const raceFormatSchema = z.object({
  category: z.enum(['racks', 'frames']),
  target: z.number().int().min(1).max(50),
  handicap: z
    .object({ p1Target: z.number().int().min(1).max(50), p2Target: z.number().int().min(1).max(50) })
    .nullable(),
});

export const matchFormatSchema = z.discriminatedUnion('category', [pointsFormatSchema, raceFormatSchema]);
export type PointsFormat = z.infer<typeof pointsFormatSchema>;
export type RaceFormat = z.infer<typeof raceFormatSchema>;
export type MatchFormat = z.infer<typeof matchFormatSchema>;

export function defaultFormat(game: GameType): MatchFormat {
  const category = gameCategory(game);
  if (category === 'points') {
    return game === 'three_cushion'
      ? { category, targetPoints: 30, inningLimit: 40, handicap: null }
      : { category, targetPoints: 100, inningLimit: 40, handicap: null };
  }
  if (category === 'racks') return { category, target: game === 'nine_ball' ? 7 : 8, handicap: null };
  return { category, target: 5, handicap: null };
}

/** Formatın oyun türüyle uyumlu olduğunu doğrular. */
export function assertFormatMatchesGame(game: GameType, format: MatchFormat): void {
  if (format.category !== gameCategory(game)) {
    throw new DomainError('FORMAT_MISMATCH', 'Maç formatı seçilen oyun türüyle uyumlu değil.');
  }
}

/** Oyuncu slotu için geçerli yarış hedefi (rack/frame). */
export function raceTargetFor(format: RaceFormat, slot: 1 | 2): number {
  if (format.handicap) return slot === 1 ? format.handicap.p1Target : format.handicap.p2Target;
  return format.target;
}

export function describeFormat(format: MatchFormat): string {
  if (format.category === 'points') {
    const parts = [`${format.targetPoints} sayı`];
    if (format.inningLimit) parts.push(`${format.inningLimit} isteka`);
    if (format.handicap) parts.push(`handikap ${format.handicap.p1}/${format.handicap.p2}`);
    return parts.join(' · ');
  }
  const unit = format.category === 'racks' ? 'rack' : 'frame';
  if (format.handicap) return `${format.handicap.p1Target}-${format.handicap.p2Target} ${unit} (handikaplı)`;
  return `${format.target} ${unit}`;
}

export class DomainError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
