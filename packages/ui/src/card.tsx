import * as React from 'react';
import { cn } from './cn';

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-[var(--radius-card)] border border-border bg-surface', className)} {...props} />;
}

export function CardHeader({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start gap-3 p-4 pb-2', className)}>
      {icon ? (
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">{icon}</div>
      ) : null}
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-lg font-semibold leading-tight">{title}</h3>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 pt-2', className)} {...props} />;
}

/** Sağda ok bulunan dokunulabilir liste satırı (ör. "Maçlarım — Gelen teklifler: 2"). */
export function ListRow({
  icon,
  title,
  subtitle,
  right,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  icon?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className={cn('flex items-center gap-3 rounded-2xl border border-border bg-surface p-3.5', className)} {...props}>
      {icon ? (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand/30 bg-brand-soft text-brand">
          {icon}
        </div>
      ) : null}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{title}</div>
        {subtitle ? <div className="truncate text-xs text-muted">{subtitle}</div> : null}
      </div>
      {right}
    </div>
  );
}

export function StatTile({ label, value, hint, className }: { label: string; value: React.ReactNode; hint?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-border bg-surface-2 p-3', className)}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-subtle">{label}</div>
      <div className="mt-1 font-display text-xl font-semibold">{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-muted">{hint}</div> : null}
    </div>
  );
}
