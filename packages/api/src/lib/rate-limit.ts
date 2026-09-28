import { rateLimits, sql, type DbOrTx } from '@bilardogo/db';
import { TRPCError } from '@trpc/server';

/**
 * Basit sabit pencereli hız sınırı. Sunucusuz ortamda bellek paylaşılmadığı için veritabanında tutulur.
 * @example await rateLimit(db, `match_request:${uid}`, 20, 3600)
 */
export async function rateLimit(db: DbOrTx, key: string, limit: number, windowSec: number): Promise<void> {
  const rows = await db
    .insert(rateLimits)
    .values({ key, windowStart: new Date(), count: 1 })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`case when ${rateLimits.windowStart} < now() - make_interval(secs => ${windowSec}) then 1 else ${rateLimits.count} + 1 end`,
        windowStart: sql`case when ${rateLimits.windowStart} < now() - make_interval(secs => ${windowSec}) then now() else ${rateLimits.windowStart} end`,
      },
    })
    .returning({ count: rateLimits.count });
  if ((rows[0]?.count ?? 0) > limit) {
    throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: 'Çok sık işlem yaptın. Biraz sonra tekrar dene.' });
  }
}
