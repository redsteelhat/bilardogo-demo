'use client';
import { cn } from '@bilardogo/ui';
import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

/** Alt sayfa başlığı: geri butonu, ortada başlık (+ alt başlık), sağda eylemler. */
export function PageHeader({
  title,
  subtitle,
  back = true,
  backHref,
  actions,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  back?: boolean;
  backHref?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  const router = useRouter();
  return (
    <header className={cn('sticky top-0 z-30 border-b border-border bg-bg/90 pt-safe backdrop-blur-lg', className)}>
      <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-3">
        {back ? (
          <button
            type="button"
            onClick={() => (backHref ? router.push(backHref) : window.history.length > 1 ? router.back() : router.push('/'))}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-fg"
            aria-label="Geri"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <span className="w-9" />
        )}
        <div className="min-w-0 flex-1 text-center">
          <h1 className="truncate font-display text-lg font-semibold leading-tight">{title}</h1>
          {subtitle ? <p className="truncate text-xs text-muted">{subtitle}</p> : null}
        </div>
        <div className="flex min-w-9 items-center justify-end gap-1">{actions}</div>
      </div>
    </header>
  );
}

/** Sayfa içeriği kapsayıcısı (alt menü için boşluk bırakır). */
export function PageBody({ className, children }: { className?: string; children: React.ReactNode }) {
  return <main className={cn('mx-auto w-full max-w-2xl px-4 pb-32 pt-4', className)}>{children}</main>;
}
