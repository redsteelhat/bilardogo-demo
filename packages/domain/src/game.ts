export const GAME_TYPES = ['three_cushion', 'carom', 'eight_ball', 'nine_ball', 'snooker'] as const;
export type GameType = (typeof GAME_TYPES)[number];

export type GameCategory = 'points' | 'racks' | 'frames';

export const GAME_LABELS: Record<GameType, string> = {
  three_cushion: '3 Bant',
  carom: 'Karambol',
  eight_ball: 'Amerikan (8 Top)',
  nine_ball: '9 Top',
  snooker: 'Snooker',
};

export const GAME_SHORT_LABELS: Record<GameType, string> = {
  three_cushion: '3 Bant',
  carom: 'Karambol',
  eight_ball: 'Amerikan',
  nine_ball: '9 Top',
  snooker: 'Snooker',
};

export function gameCategory(game: GameType): GameCategory {
  switch (game) {
    case 'three_cushion':
    case 'carom':
      return 'points';
    case 'eight_ball':
    case 'nine_ball':
      return 'racks';
    case 'snooker':
      return 'frames';
  }
}

/** 3 Bant ve Karambol'de ortalama (sayı ÷ isteka) tutulur. */
export function hasAverage(game: GameType): boolean {
  return gameCategory(game) === 'points';
}

export const UNIT_LABELS: Record<GameCategory, { unit: string; target: string }> = {
  points: { unit: 'Sayı', target: 'Hedef Sayı' },
  racks: { unit: 'Rack', target: 'Hedef Rack' },
  frames: { unit: 'Frame', target: 'Hedef Frame' },
};

export const LEVELS = ['beginner', 'intermediate', 'advanced', 'pro'] as const;
export type Level = (typeof LEVELS)[number];
export const LEVEL_LABELS: Record<Level, string> = {
  beginner: 'Başlangıç',
  intermediate: 'Orta',
  advanced: 'İleri',
  pro: 'Profesyonel',
};

export function isGameType(value: unknown): value is GameType {
  return typeof value === 'string' && (GAME_TYPES as readonly string[]).includes(value);
}
