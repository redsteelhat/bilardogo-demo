import * as React from 'react';
import { cn } from './cn';

const PALETTE = ['#e0564b', '#3b82f6', '#10b981', '#a855f7', '#f59e0b', '#ec4899', '#14b8a6', '#6366f1'];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const chars = parts.length >= 2 ? [parts[0]![0], parts[parts.length - 1]![0]] : [parts[0]?.[0], parts[0]?.[1]];
  return chars.filter(Boolean).join('').toLocaleUpperCase('tr-TR') || '?';
}

function colorFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length]!;
}

const SIZES = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-14 w-14 text-lg', xl: 'h-24 w-24 text-3xl' } as const;

export function Avatar({
  name,
  src,
  size = 'md',
  status,
  className,
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof SIZES;
  status?: 'at_venue' | 'coming' | 'offline' | 'in_match' | null;
  className?: string;
}) {
  const [broken, setBroken] = React.useState(false);
  const statusColor =
    status === 'at_venue' ? 'bg-success' : status === 'coming' ? 'bg-warning' : status === 'in_match' ? 'bg-danger' : status === 'offline' ? 'bg-subtle' : null;
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {src && !broken ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name}
          onError={() => setBroken(true)}
          className={cn('rounded-full object-cover ring-2 ring-surface-3', SIZES[size])}
          referrerPolicy="no-referrer"
        />
      ) : (
        <span
          className={cn('flex items-center justify-center rounded-full font-bold text-white ring-2 ring-white/10', SIZES[size])}
          style={{ background: colorFor(name) }}
          aria-label={name}
        >
          {initials(name)}
        </span>
      )}
      {statusColor ? <span className={cn('absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-bg', statusColor)} /> : null}
    </span>
  );
}
