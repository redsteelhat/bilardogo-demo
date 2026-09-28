import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from './cn';

export const badgeVariants = cva('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap', {
  variants: {
    tone: {
      neutral: 'bg-surface-3 text-muted border border-border',
      brand: 'bg-brand-soft text-brand border border-brand/30',
      success: 'bg-success-soft text-success border border-success/30',
      warning: 'bg-warning-soft text-warning border border-warning/30',
      danger: 'bg-danger-soft text-danger border border-danger/30',
      info: 'bg-info-soft text-info border border-info/30',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export function Badge({ className, tone, dot, children, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span className={cn(badgeVariants({ tone }), className)} {...props}>
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}
