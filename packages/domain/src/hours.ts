import { z } from 'zod';

export const WEEKDAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export const WEEKDAY_LABELS: Record<Weekday, string> = {
  mon: 'Pazartesi',
  tue: 'Salı',
  wed: 'Çarşamba',
  thu: 'Perşembe',
  fri: 'Cuma',
  sat: 'Cumartesi',
  sun: 'Pazar',
};

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Saat SS:DD biçiminde olmalı');
export const dayHoursSchema = z.object({ open: hhmm, close: hhmm }).nullable(); // null = kapalı
export const openingHoursSchema = z.object({
  mon: dayHoursSchema,
  tue: dayHoursSchema,
  wed: dayHoursSchema,
  thu: dayHoursSchema,
  fri: dayHoursSchema,
  sat: dayHoursSchema,
  sun: dayHoursSchema,
});
export type OpeningHours = z.infer<typeof openingHoursSchema>;

export const DEFAULT_OPENING_HOURS: OpeningHours = {
  mon: { open: '12:00', close: '00:00' },
  tue: { open: '12:00', close: '00:00' },
  wed: { open: '12:00', close: '00:00' },
  thu: { open: '12:00', close: '00:00' },
  fri: { open: '12:00', close: '02:00' },
  sat: { open: '12:00', close: '02:00' },
  sun: { open: '12:00', close: '00:00' },
};

export const APP_TIME_ZONE = 'Europe/Istanbul';

function toMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/** Verilen anı salonun saat dilimindeki gün + dakikaya çevirir. */
export function localDayAndMinutes(date: Date, timeZone = APP_TIME_ZONE): { day: Weekday; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const wd = parts.find((p) => p.type === 'weekday')?.value.toLowerCase().slice(0, 3) as Weekday;
  const h = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return { day: wd, minutes: h * 60 + m };
}

/**
 * Salon şu an açık mı? Gece yarısını geçen saatler desteklenir (ör. 12:00–02:00):
 * bir önceki günün aralığı bugüne taşıyorsa da açık sayılır. open === close ise 24 saat açık.
 */
export function isOpenAt(hours: OpeningHours | null | undefined, date: Date, timeZone = APP_TIME_ZONE): boolean {
  if (!hours) return false;
  const { day, minutes } = localDayAndMinutes(date, timeZone);
  const idx = WEEKDAYS.indexOf(day);
  const today = hours[day];
  if (today) {
    const o = toMinutes(today.open);
    const c = toMinutes(today.close);
    if (o === c) return true;
    if (c > o ? minutes >= o && minutes < c : minutes >= o) return true;
  }
  const prevDay = WEEKDAYS[(idx + 6) % 7]!;
  const prev = hours[prevDay];
  if (prev) {
    const o = toMinutes(prev.open);
    const c = toMinutes(prev.close);
    if (c < o && minutes < c) return true;
  }
  return false;
}

export function todayHoursLabel(hours: OpeningHours | null | undefined, date = new Date()): string {
  if (!hours) return 'Saat bilgisi yok';
  const { day } = localDayAndMinutes(date);
  const h = hours[day];
  return h ? `${h.open} – ${h.close}` : 'Bugün kapalı';
}
