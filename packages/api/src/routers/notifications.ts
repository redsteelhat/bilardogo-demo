import { and, count, desc, eq, inArray, isNull, lt, notifications } from '@bilardogo/db';
import { z } from 'zod';
import { authedProcedure, router } from '../trpc';

export const notificationsRouter = router({
  list: authedProcedure
    .input(z.object({ cursor: z.string().datetime({ offset: true }).optional(), limit: z.number().int().min(1).max(50).default(30) }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db
        .select()
        .from(notifications)
        .where(
          and(
            eq(notifications.userId, ctx.profile.id),
            input.cursor ? lt(notifications.createdAt, new Date(input.cursor)) : undefined,
          ),
        )
        .orderBy(desc(notifications.createdAt))
        .limit(input.limit + 1);
      return {
        items: rows.slice(0, input.limit),
        nextCursor: rows.length > input.limit ? rows[input.limit - 1]!.createdAt.toISOString() : null,
      };
    }),
  unreadCount: authedProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({ n: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, ctx.profile.id), isNull(notifications.readAt)));
    return { count: row?.n ?? 0 };
  }),
  markRead: authedProcedure.input(z.object({ ids: z.array(z.string().uuid()).min(1).max(100) })).mutation(async ({ ctx, input }) => {
    await ctx.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, ctx.profile.id), inArray(notifications.id, input.ids), isNull(notifications.readAt)));
    return { ok: true };
  }),
  markAllRead: authedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.userId, ctx.profile.id), isNull(notifications.readAt)));
    return { ok: true };
  }),
});
