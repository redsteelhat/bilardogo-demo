import type { Database } from '@bilardogo/db';
import type { Services } from './services/types';

export type AuthUser = { id: string; email: string | null };

export type CreateContextOptions = {
  db: Database;
  services: Services;
  /** Supabase oturumundan doğrulanmış kullanıcı (JWT sunucuda doğrulanır). */
  getUser: () => Promise<AuthUser | null>;
  ip?: string | null;
  userAgent?: string | null;
};

export async function createContext(opts: CreateContextOptions) {
  const user = await opts.getUser();
  return {
    db: opts.db,
    services: opts.services,
    user,
    ip: opts.ip ?? null,
    userAgent: opts.userAgent ?? null,
  };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
