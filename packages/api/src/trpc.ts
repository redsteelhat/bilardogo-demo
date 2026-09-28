import { eq, profiles } from '@bilardogo/db';
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import type { Context } from './context';
import { getEntitlement, isEnforced } from './lib/entitlements';
import { toTRPCError } from './lib/errors';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    const zodError = error.cause instanceof ZodError ? error.cause.flatten() : null;
    return {
      ...shape,
      message:
        zodError && error.code === 'BAD_REQUEST'
          ? (Object.values(zodError.fieldErrors).flat()[0] ?? zodError.formErrors[0] ?? 'Geçersiz giriş')
          : shape.message,
      data: { ...shape.data, zodError, stack: undefined },
    };
  },
});

export const router = t.router;
export const mergeRouters = t.mergeRouters;
export const createCallerFactory = t.createCallerFactory;

/** DomainError ve veritabanı kısıt hatalarını anlaşılır mesajlara çevirir. */
const errorMapper = t.middleware(async ({ next }) => {
  const res = await next();
  if (!res.ok) {
    const mapped = toTRPCError(res.error.cause ?? res.error);
    if (mapped && mapped !== res.error) throw mapped;
  }
  return res;
});

export const publicProcedure = t.procedure.use(errorMapper);

export type Profile = typeof profiles.$inferSelect;

const withProfile = t.middleware(async ({ ctx, next }) => {
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Giriş yapmalısın.' });
  const [profile] = await ctx.db.select().from(profiles).where(eq(profiles.id, ctx.user.id));
  if (!profile || profile.deletedAt) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Hesap bulunamadı.' });
  if (profile.status === 'banned' && (!profile.bannedUntil || profile.bannedUntil > new Date())) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Hesabın kısıtlandı${profile.statusReason ? `: ${profile.statusReason}` : '.'}`,
    });
  }
  if (profile.status === 'passive') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Hesabın pasif durumda. Destek ekibiyle iletişime geç.' });
  }
  return next({ ctx: { ...ctx, user: ctx.user, profile } });
});

/** Giriş yapmış (profil tamamlanmamış olabilir) kullanıcı. */
export const authedProcedure = publicProcedure.use(withProfile);

/** Profilini tamamlamış (kullanıcı adı, şehir, sözleşmeler) kullanıcı. */
export const protectedProcedure = authedProcedure.use(async ({ ctx, next }) => {
  if (!ctx.profile.onboardedAt || !ctx.profile.username) {
    throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'Önce profilini tamamla.' });
  }
  return next({ ctx: { ...ctx, profile: { ...ctx.profile, username: ctx.profile.username } } });
});

/**
 * Abonelik hakkı backend'de doğrulanır (ekrandaki butondan bağımsız).
 * Admin "subscriptions_enforced" ayarını açana kadar yalnız kaydedilir, engellemez.
 */
export const entitledProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (await isEnforced(ctx.db)) {
    const ent = await getEntitlement(ctx.db, { userId: ctx.profile.id });
    if (!ent.active) {
      throw new TRPCError({
        code: 'PAYMENT_REQUIRED' as TRPCError['code'],
        message: 'Deneme süren sona erdi. Devam etmek için aboneliğini yenile.',
      });
    }
  }
  return next();
});

export const adminProcedure = authedProcedure.use(async ({ ctx, next }) => {
  if (ctx.profile.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Yalnız BilardoGo admini.' });
  return next();
});
