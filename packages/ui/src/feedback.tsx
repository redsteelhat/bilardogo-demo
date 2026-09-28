import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { cn } from './cn';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-brand', className)} aria-label="Yükleniyor" />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-surface-2', className)} />;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-surface/50 px-6 py-10 text-center', className)}>
      {icon ? <div className="mb-3 text-subtle [&_svg]:h-9 [&_svg]:w-9">{icon}</div> : null}
      <div className="font-semibold">{title}</div>
      {description ? <p className="mt-1 max-w-xs text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
      <div className="font-semibold">Bir sorun oluştu</div>
      <p className="mt-0.5 opacity-90">{message ?? 'Lütfen tekrar deneyin.'}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="mt-2 text-xs font-semibold underline">
          Tekrar dene
        </button>
      ) : null}
    </div>
  );
}

/** Bilgi / uyarı kutusu (ör. "Ödeme kasada salona yapılır"). */
export function Notice({
  tone = 'info',
  title,
  children,
  icon,
  className,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success' | 'brand';
  title?: React.ReactNode;
  children?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  const tones = {
    info: 'border-info/30 bg-info-soft text-info',
    warning: 'border-warning/30 bg-warning-soft text-warning',
    danger: 'border-danger/30 bg-danger-soft text-danger',
    success: 'border-success/30 bg-success-soft text-success',
    brand: 'border-brand/30 bg-brand-soft text-brand',
  } as const;
  return (
    <div className={cn('flex gap-2.5 rounded-2xl border p-3 text-sm', tones[tone], className)}>
      {icon ? <div className="mt-0.5 shrink-0 [&_svg]:h-4 [&_svg]:w-4">{icon}</div> : null}
      <div className="min-w-0">
        {title ? <div className="font-semibold">{title}</div> : null}
        {children ? <div className="text-fg/80">{children}</div> : null}
      </div>
    </div>
  );
}

export function SectionTitle({ icon, children, count, action, className }: { icon?: React.ReactNode; children: React.ReactNode; count?: number; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mb-2.5 mt-6 flex items-center gap-2', className)}>
      {icon ? <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand [&_svg]:h-4 [&_svg]:w-4">{icon}</span> : null}
      <h2 className="font-display text-lg font-semibold">{children}</h2>
      {typeof count === 'number' ? (
        <span className="ml-auto flex h-6 min-w-6 items-center justify-center rounded-full bg-surface-3 px-2 text-xs font-bold text-muted">{count}</span>
      ) : null}
      {action ? <div className={typeof count === 'number' ? '' : 'ml-auto'}>{action}</div> : null}
    </div>
  );
}
