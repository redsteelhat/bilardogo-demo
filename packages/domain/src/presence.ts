import { DomainError } from './format';
import type { MatchStatus } from './match-state';

export const VENUE_STATUSES = ['at_venue', 'coming', 'offline'] as const;
export type VenueStatus = (typeof VENUE_STATUSES)[number];
export const PLAY_INTENTS = ['wants', 'not'] as const;
export type PlayIntent = (typeof PLAY_INTENTS)[number];

export const VENUE_STATUS_LABELS: Record<VenueStatus, string> = {
  at_venue: 'Salondayım',
  coming: 'Geleceğim',
  offline: 'Çevrimdışı',
};
export const PLAY_INTENT_LABELS: Record<PlayIntent, string> = {
  wants: 'Oynamak istiyorum',
  not: 'Oynamak istemiyorum',
};

/** Varsayılan süreler; admin ayarlarından (app_settings) değiştirilebilir. */
export const PRESENCE_DEFAULTS = {
  atVenueHours: 4,
  comingGraceHours: 1,
  maxComingAheadHours: 12,
} as const;

export type PresenceSettings = { atVenueHours: number; comingGraceHours: number; maxComingAheadHours: number };

export function computePresenceExpiry(
  status: VenueStatus,
  now: Date,
  eta: Date | null,
  settings: PresenceSettings = PRESENCE_DEFAULTS,
): Date | null {
  if (status === 'offline') return null;
  if (status === 'at_venue') return new Date(now.getTime() + settings.atVenueHours * 3600_000);
  if (!eta) throw new DomainError('ETA_REQUIRED', 'Geleceğin saati seçmelisin.');
  if (eta.getTime() < now.getTime() - 5 * 60_000) throw new DomainError('ETA_PAST', 'Geçmiş bir saat seçilemez.');
  if (eta.getTime() > now.getTime() + settings.maxComingAheadHours * 3600_000) {
    throw new DomainError('ETA_TOO_FAR', `En fazla ${settings.maxComingAheadHours} saat sonrası seçilebilir.`);
  }
  return new Date(eta.getTime() + settings.comingGraceHours * 3600_000);
}

/** Maç niyeti yalnız "Salondayım" iken seçilebilir. Salondan çıkınca sıfırlanır. */
export function normalizePlayIntent(status: VenueStatus, intent: PlayIntent | null): PlayIntent | null {
  if (status !== 'at_venue') return null;
  return intent ?? 'not';
}

export type DisplayMatchState = 'wants' | 'not' | 'will_play' | 'in_match' | null;
export const DISPLAY_MATCH_STATE_LABELS: Record<Exclude<DisplayMatchState, null>, string> = {
  wants: 'Oynamak istiyor',
  not: 'Oynamak istemiyor',
  will_play: 'Maç yapacak',
  in_match: 'Maçta',
};

/** "Maç yapacak" ve "Maçta" etiketleri kullanıcı tarafından seçilmez; aktif maçtan türetilir. */
export function deriveMatchState(intent: PlayIntent | null, activeMatch: MatchStatus | null): DisplayMatchState {
  if (activeMatch === 'in_progress') return 'in_match';
  if (activeMatch === 'accepted' || activeMatch === 'waiting_opponent') return 'will_play';
  return intent;
}
