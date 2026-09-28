'use client';
import { trpc } from './trpc/client';

/** Oturum özeti (profil, işletme üyelikleri, okunmamış bildirim, abonelik). Giriş yoksa null. */
export function useSession() {
  const q = trpc.me.session.useQuery(undefined, { staleTime: 30_000 });
  return { session: q.data ?? null, loading: q.isLoading, refetch: q.refetch };
}
