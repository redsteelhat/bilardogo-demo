import type { RouterOutputs } from '@bilardogo/api';
import { DomainError } from '@bilardogo/domain';
import { formatDateTime } from '@/lib/format';

export type Match = RouterOutputs['matches']['get'];
export type MatchUser = Match['players'][number]['user'];

/** Maçtaki oyuncular: slot 1 / slot 2, ben ve rakibim. */
export function sides(m: Pick<Match, 'players' | 'mySlot'>) {
  const p1 = m.players.find((p) => p.slot === 1)?.user ?? null;
  const p2 = m.players.find((p) => p.slot === 2)?.user ?? null;
  const me = m.mySlot ? (m.mySlot === 1 ? p1 : p2) : null;
  const opponent = m.mySlot ? (m.mySlot === 1 ? p2 : p1) : null;
  return { p1, p2, me, opponent };
}

export function whenLabel(m: Pick<Match, 'scheduledAt' | 'startedAt' | 'createdAt' | 'status' | 'completedAt'>) {
  if (m.status === 'completed' && m.completedAt) return formatDateTime(m.completedAt);
  if (m.startedAt) return `${formatDateTime(m.startedAt)} başladı`;
  if (m.scheduledAt) return formatDateTime(m.scheduledAt);
  if (m.status === 'requested' || m.status === 'accepted') return 'Hemen';
  return formatDateTime(m.createdAt);
}

/** Domain doğrulamasını çalıştırır; hata varsa Türkçe mesajı döndürür. */
export function domainError(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (e) {
    if (e instanceof DomainError) return e.message;
    if (e instanceof Error) return e.message;
    return 'Geçersiz değer.';
  }
}

/** "12:34" biçiminde geçen süre (saat varsa "1:02:03"). */
export function elapsed(from: Date | string, now: number) {
  const s = Math.max(0, Math.floor((now - new Date(from).getTime()) / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(sec).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

// Türkçe saat ekleri: "23:15’te", "23:30’a". Okunuştaki son sözcüğe göre belirlenir.
const LOC: Record<number, string> = { 0: 'da', 1: 'de', 2: 'de', 3: 'te', 4: 'te', 5: 'te', 6: 'da', 7: 'de', 8: 'de', 9: 'da' };
const LOC_TENS: Record<number, string> = { 0: 'da', 1: 'da', 2: 'de', 3: 'da', 4: 'ta', 5: 'de' };
const DAT: Record<number, string> = { 0: 'a', 1: 'e', 2: 'ye', 3: 'e', 4: 'e', 5: 'e', 6: 'ya', 7: 'ye', 8: 'e', 9: 'a' };
const DAT_TENS: Record<number, string> = { 0: 'a', 1: 'a', 2: 'ye', 3: 'a', 4: 'a', 5: 'ye' };

/** "HH:MM" + bulunma ('loc': -de/-da/-te/-ta) ya da yönelme ('dat': -e/-a/-ye/-ya) eki. */
export function timeWithSuffix(hhmm: string, kind: 'loc' | 'dat') {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  const n = m === 0 ? h : m;
  const [ones, tens] = kind === 'loc' ? [LOC, LOC_TENS] : [DAT, DAT_TENS];
  const suffix = n % 10 !== 0 ? ones[n % 10] : n === 0 ? ones[0] : tens[Math.floor(n / 10)];
  return `${hhmm}’${suffix}`;
}
