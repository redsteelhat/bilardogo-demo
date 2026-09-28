import { APP_TIME_ZONE, CITIES } from '@bilardogo/domain';
import { formatDistanceToNowStrict } from 'date-fns';
import { tr } from 'date-fns/locale';

type D = Date | string | number | null | undefined;
const toDate = (d: D) => (d === null || d === undefined ? null : d instanceof Date ? d : new Date(d));

export function formatTime(d: D) {
  const x = toDate(d);
  return x ? new Intl.DateTimeFormat('tr-TR', { timeZone: APP_TIME_ZONE, hour: '2-digit', minute: '2-digit' }).format(x) : '';
}

export function formatDate(d: D, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }) {
  const x = toDate(d);
  return x ? new Intl.DateTimeFormat('tr-TR', { timeZone: APP_TIME_ZONE, ...opts }).format(x) : '';
}

export function formatDateTime(d: D) {
  const x = toDate(d);
  return x
    ? new Intl.DateTimeFormat('tr-TR', { timeZone: APP_TIME_ZONE, day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(x)
    : '';
}

/** "3 dk önce", "2 saat önce" */
export function timeAgo(d: D) {
  const x = toDate(d);
  if (!x) return '';
  if (Date.now() - x.getTime() < 45_000) return 'az önce';
  return `${formatDistanceToNowStrict(x, { locale: tr })} önce`;
}

/** "12 dk içinde" / "12 dk önce" */
export function relative(d: D) {
  const x = toDate(d);
  if (!x) return '';
  const future = x.getTime() > Date.now();
  const s = formatDistanceToNowStrict(x, { locale: tr });
  return future ? `${s} içinde` : `${s} önce`;
}

/** Dakikayı "1 sa 20 dk" biçimine çevirir. */
export function formatMinutes(min: number) {
  if (min < 60) return `${min} dk`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} sa ${m} dk` : `${h} sa`;
}

export function formatMoney(v: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(v);
}

export function cityName(plate: number | null | undefined) {
  return CITIES.find((c) => c.plate === plate)?.name ?? '';
}

/** Google Haritalar yol tarifi (API anahtarı gerekmez). */
export function directionsUrl(v: { lat: number | null; lng: number | null; address?: string | null; name?: string }) {
  if (v.lat != null && v.lng != null) return `https://www.google.com/maps/dir/?api=1&destination=${v.lat},${v.lng}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${v.name ?? ''} ${v.address ?? ''}`)}`;
}

export function mapEmbedUrl(v: { lat: number | null; lng: number | null; address?: string | null; name?: string }) {
  const q = v.lat != null && v.lng != null ? `${v.lat},${v.lng}` : encodeURIComponent(`${v.name ?? ''} ${v.address ?? ''}`);
  return `https://maps.google.com/maps?q=${q}&z=15&output=embed`;
}

/** datetime-local input değeri (İstanbul saatine göre) */
export function toLocalInputValue(d: Date) {
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
  return parts.replace(' ', 'T');
}

/** datetime-local değerini (İstanbul saati) ISO'ya çevirir. Türkiye yıl boyu UTC+3. */
export function fromLocalInputValue(v: string) {
  return new Date(`${v}:00+03:00`).toISOString();
}
