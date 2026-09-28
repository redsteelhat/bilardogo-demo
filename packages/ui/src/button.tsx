import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import * as React from 'react';
import { cn } from './cn';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 select-none active:scale-[0.98]',
  {
    variants: {
      variant: {
        primary: 'bg-brand text-brand-fg hover:bg-brand-hover active:bg-brand-active shadow-[var(--shadow-brand)]',
        secondary: 'bg-surface-2 text-fg border border-border hover:bg-surface-3',
        outline: 'border border-brand/60 text-brand hover:bg-brand-soft',
        soft: 'bg-brand-soft text-brand hover:bg-brand/20',
        ghost: 'text-muted hover:text-fg hover:bg-surface-2',
        danger: 'bg-danger-soft text-danger border border-danger/30 hover:bg-danger/20',
        success: 'bg-success-soft text-success border border-success/30 hover:bg-success/20',
      },
      size: {
        sm: 'h-8 rounded-lg px-3 text-xs',
        md: 'h-10 rounded-xl px-4 text-sm',
        lg: 'h-12 rounded-2xl px-5 text-base',
        icon: 'h-10 w-10 rounded-xl',
        'icon-sm': 'h-8 w-8 rounded-lg',
      },
      block: { true: 'w-full' },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { loading?: boolean };

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, block, loading, disabled, children, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size, block }), className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
