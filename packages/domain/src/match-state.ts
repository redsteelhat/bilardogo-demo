import { DomainError } from './format';

export const MATCH_STATUSES = [
  'requested', // İstek gönderildi
  'accepted', // Maç Yapacak
  'declined', // Reddedildi
  'cancelled', // İptal edildi
  'expired', // Süresi doldu (yanıtsız istek, gelmeyen planlı maç, katılınmayan masa oturumu)
  'waiting_opponent', // Önceden eşleşmemiş: masa oturumu açıldı, ikinci oyuncu bekleniyor
  'in_progress', // Maçta: masa dolu
  'awaiting_result', // Maç bitti, masa boşaldı; sonuç girilmedi
  'pending_confirmation', // Sonuç girildi, rakip onayı bekleniyor
  'completed', // Tamamlandı: istatistiğe işlendi
  'void', // Sonuçsuz kapandı
] as const;
export type MatchStatus = (typeof MATCH_STATUSES)[number];

/** Kullanıcıyı meşgul eden durumlar: kullanıcı aynı anda yalnız 1 aktif maçta olabilir. */
export const USER_ACTIVE_STATUSES = ['accepted', 'waiting_opponent', 'in_progress'] as const satisfies readonly MatchStatus[];
/** Masayı dolu gösteren durumlar: masada aynı anda yalnız 1 aktif maç olabilir. */
export const TABLE_LOCK_STATUSES = ['waiting_opponent', 'in_progress'] as const satisfies readonly MatchStatus[];
export const OPEN_RESULT_STATUSES = ['awaiting_result', 'pending_confirmation'] as const satisfies readonly MatchStatus[];
export const TERMINAL_STATUSES = ['declined', 'cancelled', 'expired', 'completed', 'void'] as const satisfies readonly MatchStatus[];

export type MatchAction =
  | 'accept'
  | 'decline'
  | 'cancel'
  | 'expire'
  | 'join' // ikinci oyuncu masa oturumuna katılır (waiting_opponent'ta kalır, onay beklenir)
  | 'start' // QR ile masaya bağlanma
  | 'finish'
  | 'submit_result'
  | 'confirm_result'
  | 'reject_result'
  | 'void';

export type MatchActor = 'challenger' | 'opponent' | 'player' | 'venue_staff' | 'system' | 'admin';

type Rule = { from: readonly MatchStatus[]; to: MatchStatus; actors: readonly MatchActor[] };

const RULES: Record<MatchAction, Rule> = {
  accept: { from: ['requested'], to: 'accepted', actors: ['opponent'] },
  decline: { from: ['requested'], to: 'declined', actors: ['opponent'] },
  cancel: { from: ['requested', 'accepted', 'waiting_opponent'], to: 'cancelled', actors: ['challenger', 'opponent', 'player', 'admin'] },
  expire: { from: ['requested', 'accepted', 'waiting_opponent'], to: 'expired', actors: ['system'] },
  join: { from: ['waiting_opponent'], to: 'waiting_opponent', actors: ['player'] },
  start: { from: ['accepted', 'waiting_opponent'], to: 'in_progress', actors: ['challenger', 'opponent', 'player'] },
  finish: { from: ['in_progress'], to: 'awaiting_result', actors: ['challenger', 'opponent', 'player', 'venue_staff', 'admin'] },
  submit_result: { from: ['awaiting_result'], to: 'pending_confirmation', actors: ['challenger', 'opponent', 'player'] },
  confirm_result: { from: ['pending_confirmation'], to: 'completed', actors: ['challenger', 'opponent', 'player', 'admin'] },
  reject_result: { from: ['pending_confirmation'], to: 'awaiting_result', actors: ['challenger', 'opponent', 'player'] },
  void: { from: ['awaiting_result', 'pending_confirmation'], to: 'void', actors: ['system', 'admin'] },
};

export function canTransition(from: MatchStatus, action: MatchAction, actor: MatchActor): boolean {
  const rule = RULES[action];
  if (!rule.from.includes(from)) return false;
  if (rule.actors.includes(actor)) return true;
  // challenger/opponent de birer "player"dır
  if ((actor === 'challenger' || actor === 'opponent') && rule.actors.includes('player')) return true;
  return false;
}

export function nextStatus(from: MatchStatus, action: MatchAction, actor: MatchActor): MatchStatus {
  if (!canTransition(from, action, actor)) {
    throw new DomainError('INVALID_TRANSITION', transitionError(from, action));
  }
  return RULES[action].to;
}

function transitionError(from: MatchStatus, action: MatchAction): string {
  const label = MATCH_STATUS_LABELS[from];
  switch (action) {
    case 'accept':
    case 'decline':
      return `Bu istek artık yanıtlanamaz (durum: ${label}).`;
    case 'start':
      return `Maç başlatılamaz (durum: ${label}).`;
    case 'finish':
      return `Maç bitirilemez (durum: ${label}).`;
    case 'submit_result':
      return `Sonuç girilemez (durum: ${label}).`;
    case 'confirm_result':
    case 'reject_result':
      return `Onay bekleyen bir sonuç yok (durum: ${label}).`;
    default:
      return `Bu işlem yapılamaz (durum: ${label}).`;
  }
}

export const MATCH_STATUS_LABELS: Record<MatchStatus, string> = {
  requested: 'İstek gönderildi',
  accepted: 'Maç Yapacak',
  declined: 'Reddedildi',
  cancelled: 'İptal edildi',
  expired: 'Süresi doldu',
  waiting_opponent: 'Rakip bekleniyor',
  in_progress: 'Maçta',
  awaiting_result: 'Sonuç bekleniyor',
  pending_confirmation: 'Onay bekliyor',
  completed: 'Tamamlandı',
  void: 'Sonuçsuz kapandı',
};

export function isUserActive(status: MatchStatus): boolean {
  return (USER_ACTIVE_STATUSES as readonly MatchStatus[]).includes(status);
}
export function locksTable(status: MatchStatus): boolean {
  return (TABLE_LOCK_STATUSES as readonly MatchStatus[]).includes(status);
}

/** Zaman aşımları (dakika). pg_cron aynı değerleri kullanır; değişirse migration da güncellenmeli. */
export const MATCH_TIMEOUTS = {
  /** Yanıtlanmayan "hemen" istek */
  requestMinutes: 12 * 60,
  /** Belirli saatli maç, saatinden bu kadar sonra hâlâ başlamamışsa düşer */
  scheduledGraceMinutes: 120,
  /** Kabul edilmiş ama başlamamış "hemen" maç */
  acceptedMinutes: 6 * 60,
  /** Masa oturumu açıldı, ikinci oyuncu katılmadı */
  walkInJoinMinutes: 5,
  /** Sonuç girilmedi / onaylanmadı */
  resultHours: 24,
} as const;
