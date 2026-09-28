import type { RouterOutputs } from '@bilardogo/api';
import { Avatar, cn } from '@bilardogo/ui';
import Link from 'next/link';

export type UserSummary = NonNullable<RouterOutputs['players']['search'][number]>;

/** Avatar + ad (+ @kullanıcıadı) — profil sayfasına bağlanır. */
export function UserChip({
  user,
  size = 'md',
  subtitle,
  status,
  link = true,
  className,
}: {
  user: UserSummary;
  size?: 'sm' | 'md' | 'lg';
  subtitle?: React.ReactNode;
  status?: 'at_venue' | 'coming' | 'offline' | 'in_match' | null;
  link?: boolean;
  className?: string;
}) {
  const inner = (
    <>
      <Avatar name={user.displayName} src={user.avatarUrl} size={size} status={status} />
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{user.displayName}</div>
        <div className="truncate text-xs text-muted">{subtitle ?? (user.username ? `@${user.username}` : '')}</div>
      </div>
    </>
  );
  if (!link || !user.username) return <div className={cn('flex min-w-0 items-center gap-2.5', className)}>{inner}</div>;
  return (
    <Link href={`/profil/${user.username}`} className={cn('flex min-w-0 items-center gap-2.5', className)}>
      {inner}
    </Link>
  );
}
