import { localDayAndMinutes, WEEKDAY_LABELS, WEEKDAYS, type OpeningHours } from '@bilardogo/domain';
import { cn } from '@bilardogo/ui';

/** Haftalık çalışma saatleri; bugün vurgulanır. */
export function HoursList({ hours }: { hours: OpeningHours }) {
  const today = localDayAndMinutes(new Date()).day;
  return (
    <ul className="divide-y divide-border text-sm">
      {WEEKDAYS.map((d) => {
        const h = hours[d];
        const isToday = d === today;
        return (
          <li key={d} className={cn('flex items-center justify-between py-2', isToday && 'font-semibold text-brand')}>
            <span>
              {WEEKDAY_LABELS[d]}
              {isToday ? <span className="ml-1.5 text-[11px] font-normal text-muted">(bugün)</span> : null}
            </span>
            <span className={cn('tabular-nums', !h && 'text-subtle')}>
              {!h ? 'Kapalı' : h.open === h.close ? '24 saat açık' : `${h.open} – ${h.close}`}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
