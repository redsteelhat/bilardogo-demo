'use client';
import { ErrorState, Skeleton, Spinner } from '@bilardogo/ui';
import { errorMessage } from '@/lib/trpc/client';

export function PageLoading() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}

export function QueryError({ error, retry }: { error: unknown; retry?: () => void }) {
  return <ErrorState message={errorMessage(error)} onRetry={retry} />;
}
