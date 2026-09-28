import { and, cities, count, eq, legalDocuments, venues, businesses } from '@bilardogo/db';
import { consentKinds, PRESENCE_DEFAULTS } from '@bilardogo/domain';
import { z } from 'zod';
import { getSetting } from '../lib/entitlements';
import { notFound } from '../lib/errors';
import { publicProcedure, router } from '../trpc';

export const metaRouter = router({
  /** İller ve her ildeki aktif salon sayısı (şehir seçici için). */
  cities: publicProcedure.query(async ({ ctx }) => {
    const counts = await ctx.db
      .select({ plate: venues.cityPlate, n: count() })
      .from(venues)
      .innerJoin(businesses, eq(businesses.id, venues.businessId))
      .where(and(eq(venues.state, 'active'), eq(businesses.status, 'approved'), eq(businesses.isActive, true)))
      .groupBy(venues.cityPlate);
    const map = new Map(counts.map((c) => [c.plate, c.n]));
    const rows = await ctx.db.select().from(cities).orderBy(cities.plate);
    return rows.map((c) => ({ ...c, venueCount: map.get(c.plate) ?? 0 }));
  }),

  legal: publicProcedure.input(z.object({ kind: z.enum(consentKinds) })).query(async ({ ctx, input }) => {
    const [doc] = await ctx.db
      .select()
      .from(legalDocuments)
      .where(and(eq(legalDocuments.kind, input.kind), eq(legalDocuments.isCurrent, true)));
    if (!doc) notFound('Metin');
    return doc;
  }),

  settings: publicProcedure.query(async ({ ctx }) => {
    const [presence, support, trialDays] = await Promise.all([
      getSetting(ctx.db, 'presence', PRESENCE_DEFAULTS),
      getSetting<{ email: string | null; whatsapp: string | null }>(ctx.db, 'support', { email: null, whatsapp: null }),
      getSetting<number>(ctx.db, 'trial_days', 30),
    ]);
    return { presence, support, trialDays };
  }),
});
