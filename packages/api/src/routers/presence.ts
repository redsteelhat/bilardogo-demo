import { and, businesses, eq, presence, venues } from '@bilardogo/db';
import {
  APP_TIME_ZONE,
  computePresenceExpiry,
  normalizePlayIntent,
  PRESENCE_DEFAULTS,
  presenceSetSchema,
  type PresenceSettings,
} from '@bilardogo/domain';
import { z } from 'zod';
import { getSetting } from '../lib/entitlements';
import { badRequest, notFound } from '../lib/errors';
import { rateLimit } from '../lib/rate-limit';
import { notify, venueActivityAudience } from '../services/notify';
import { protectedProcedure, router } from '../trpc';

function formatTime(d: Date) {
  return new Intl.DateTimeFormat('tr-TR', { timeZone: APP_TIME_ZONE, hour: '2-digit', minute: '2-digit' }).format(d);
}

export const presenceRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db
      .select({ p: presence, venueName: venues.name, venueSlug: venues.slug })
      .from(presence)
      .leftJoin(venues, eq(venues.id, presence.venueId))
      .where(eq(presence.userId, ctx.profile.id));
    if (!row || row.p.status === 'offline' || !row.p.expiresAt || row.p.expiresAt < new Date()) {
      return { status: 'offline' as const, venueId: null, venueName: null, venueSlug: null, eta: null, playIntent: null, expiresAt: null };
    }
    return {
      status: row.p.status,
      venueId: row.p.venueId,
      venueName: row.venueName,
      venueSlug: row.venueSlug,
      eta: row.p.eta,
      playIntent: row.p.playIntent,
      expiresAt: row.p.expiresAt,
    };
  }),

  /**
   * Salon durumu (Salondayım / Geleceğim / Çevrimdışı) ve maç niyeti.
   * İkisi ayrı eksenlerdir; "Salondayım + Oynamak istiyorum" birlikte mümkündür. Süre sonunda otomatik kapanır.
   */
  set: protectedProcedure.input(presenceSetSchema).mutation(async ({ ctx, input }) => {
    await rateLimit(ctx.db, `presence:${ctx.profile.id}`, 60, 3600);
    const [venue] = await ctx.db
      .select({ id: venues.id, name: venues.name, slug: venues.slug, state: venues.state, bstatus: businesses.status })
      .from(venues)
      .innerJoin(businesses, eq(businesses.id, venues.businessId))
      .where(eq(venues.id, input.venueId));
    if (!venue || venue.state !== 'active' || venue.bstatus !== 'approved') notFound('Salon');

    const settings = await getSetting<PresenceSettings>(ctx.db, 'presence', PRESENCE_DEFAULTS);
    const now = new Date();
    const eta = input.eta ? new Date(input.eta) : null;
    const expiresAt = computePresenceExpiry(input.status, now, eta, settings);
    const playIntent = normalizePlayIntent(input.status, input.playIntent ?? null);
    if (input.status !== 'at_venue' && input.playIntent === 'wants') {
      badRequest('Maç isteği durumu yalnız salondayken seçilebilir.');
    }

    const [prev] = await ctx.db.select().from(presence).where(eq(presence.userId, ctx.profile.id));
    const values = {
      venueId: input.status === 'offline' ? null : input.venueId,
      status: input.status,
      eta: input.status === 'coming' ? eta : null,
      playIntent,
      expiresAt,
    };
    await ctx.db
      .insert(presence)
      .values({ userId: ctx.profile.id, ...values })
      .onConflictDoUpdate({ target: presence.userId, set: { ...values, updatedAt: now } });

    const prevActive = prev && prev.status !== 'offline' && prev.expiresAt && prev.expiresAt > now;
    const changedPlace = !prevActive || prev.venueId !== input.venueId || prev.status !== input.status;
    const etaChanged = input.status === 'coming' && prev?.eta?.getTime() !== eta?.getTime();
    if (changedPlace || etaChanged) {
      const name = ctx.profile.fullName || `@${ctx.profile.username}`;
      if (input.status === 'at_venue' || input.status === 'coming') {
        const audience = await venueActivityAudience(ctx.db, venue.id, [ctx.profile.id]);
        await notify(
          ctx,
          input.status === 'at_venue' ? 'venue_checkin' : 'venue_coming',
          audience,
          { kullanici: name, salon: venue.name, saat: eta ? formatTime(eta) : '' },
          { actorId: ctx.profile.id, link: `/salon/${venue.slug}/kimler-var` },
        );
      }
    }
    return { ok: true, expiresAt };
  }),

  /** Salondayım süresini uzatır. */
  extend: protectedProcedure.mutation(async ({ ctx }) => {
    const settings = await getSetting<PresenceSettings>(ctx.db, 'presence', PRESENCE_DEFAULTS);
    const [row] = await ctx.db.select().from(presence).where(eq(presence.userId, ctx.profile.id));
    if (!row || row.status !== 'at_venue' || !row.expiresAt || row.expiresAt < new Date()) {
      badRequest('Uzatılacak aktif bir "Salondayım" durumun yok.');
    }
    const expiresAt = new Date(Date.now() + settings.atVenueHours * 3600_000);
    await ctx.db.update(presence).set({ expiresAt, updatedAt: new Date() }).where(eq(presence.userId, ctx.profile.id));
    return { expiresAt };
  }),

  setIntent: protectedProcedure
    .input(z.object({ playIntent: z.enum(['wants', 'not']) }))
    .mutation(async ({ ctx, input }) => {
      const [row] = await ctx.db.select().from(presence).where(eq(presence.userId, ctx.profile.id));
      if (!row || row.status !== 'at_venue' || !row.expiresAt || row.expiresAt < new Date()) {
        badRequest('Maç isteği durumu yalnız salondayken seçilebilir.');
      }
      await ctx.db
        .update(presence)
        .set({ playIntent: input.playIntent, updatedAt: new Date() })
        .where(and(eq(presence.userId, ctx.profile.id)));
      return { ok: true };
    }),

  clear: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(presence)
      .set({ status: 'offline', venueId: null, eta: null, playIntent: null, expiresAt: null, updatedAt: new Date() })
      .where(eq(presence.userId, ctx.profile.id));
    return { ok: true };
  }),
});
