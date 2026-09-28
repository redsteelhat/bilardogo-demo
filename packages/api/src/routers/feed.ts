import {
  adStats,
  ads,
  and,
  arrayContainsSql,
  businesses,
  desc,
  eq,
  gt,
  isNull,
  lte,
  or,
  sql,
  venuePosts,
  venues,
  bulletins,
} from '../lib/feed-deps';
import { BULLETIN_KIND_LABELS, AD_PLACEMENTS } from '@bilardogo/domain';
import { z } from 'zod';
import { notFound } from '../lib/errors';
import { resolveMediaUrl } from '../lib/storage';
import { visibleVenueWhere } from '../lib/venue-queries';
import { publicProcedure, router } from '../trpc';

/** YouTube / Instagram vb. bağlantıdan gömülebilir URL üretir. */
export function embedUrl(url: string | null): string | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|shorts\/|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return null;
}

export const feedRouter = router({
  /**
   * Etkinlik alanı / Bülten: admin bültenleri (yalnız BilardoGo admini yayınlar), şehirdeki salonların duyuru ve
   * kampanyaları ve il bazlı reklamlar.
   */
  bulletin: publicProcedure
    .input(z.object({ cityPlate: z.number().int().min(1).max(81).nullable(), limit: z.number().int().min(1).max(50).default(30) }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const cityFilter = input.cityPlate
        ? or(sql`cardinality(${bulletins.cityPlates}) = 0`, arrayContainsSql(bulletins.cityPlates, input.cityPlate))
        : sql`cardinality(${bulletins.cityPlates}) = 0`;
      const news = await ctx.db
        .select()
        .from(bulletins)
        .where(and(eq(bulletins.status, 'published'), cityFilter))
        .orderBy(desc(bulletins.publishedAt))
        .limit(input.limit);
      const posts = input.cityPlate
        ? await ctx.db
            .select({ post: venuePosts, venue: { id: venues.id, name: venues.name, slug: venues.slug } })
            .from(venuePosts)
            .innerJoin(venues, eq(venues.id, venuePosts.venueId))
            .innerJoin(businesses, eq(businesses.id, venues.businessId))
            .where(
              and(
                visibleVenueWhere,
                eq(venues.cityPlate, input.cityPlate),
                isNull(venuePosts.deletedAt),
                or(isNull(venuePosts.validTo), gt(venuePosts.validTo, now)),
                or(isNull(venuePosts.validFrom), lte(venuePosts.validFrom, now)),
              ),
            )
            .orderBy(desc(venuePosts.createdAt))
            .limit(input.limit)
        : [];
      const adRows = await ctx.db
        .select()
        .from(ads)
        .where(
          and(
            eq(ads.isActive, true),
            lte(ads.startsAt, now),
            gt(ads.endsAt, now),
            sql`'bulletin' = any(${ads.placements})`,
            input.cityPlate
              ? or(eq(ads.scope, 'country'), arrayContainsSql(ads.cityPlates, input.cityPlate))
              : eq(ads.scope, 'country'),
          ),
        )
        .limit(5);
      const url = (p: string | null) => resolveMediaUrl(ctx.services.storage.publicUrl, p);
      return {
        bulletins: news.map((b) => ({
          id: b.id,
          kind: b.kind,
          kindLabel: BULLETIN_KIND_LABELS[b.kind],
          title: b.title,
          body: b.body,
          mediaUrl: url(b.mediaPath),
          mediaType: b.mediaType,
          videoUrl: b.videoUrl,
          embedUrl: embedUrl(b.videoUrl),
          publishedAt: b.publishedAt,
        })),
        venuePosts: posts.map(({ post, venue }) => ({
          id: post.id,
          kind: post.kind,
          title: post.title,
          body: post.body,
          imageUrl: url(post.imagePath),
          validFrom: post.validFrom,
          validTo: post.validTo,
          createdAt: post.createdAt,
          venue,
        })),
        ads: adRows.map((a) => ({
          id: a.id,
          brand: a.brand,
          logoUrl: url(a.logoPath),
          product: a.product,
          priceText: a.priceText,
          body: a.body,
          mediaUrl: url(a.mediaPath),
          mediaType: a.mediaType,
          link: a.link,
          contact: a.contact,
        })),
      };
    }),

  bulletinItem: publicProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const [b] = await ctx.db
      .select()
      .from(bulletins)
      .where(and(eq(bulletins.id, input.id), eq(bulletins.status, 'published')));
    if (!b) notFound('İçerik');
    return {
      ...b,
      kindLabel: BULLETIN_KIND_LABELS[b.kind],
      mediaUrl: resolveMediaUrl(ctx.services.storage.publicUrl, b.mediaPath),
      embedUrl: embedUrl(b.videoUrl),
    };
  }),

  /** Yerleşime göre aktif reklamlar (ana sayfa, salon sayfası). */
  ads: publicProcedure
    .input(z.object({ placement: z.enum(AD_PLACEMENTS), cityPlate: z.number().int().min(1).max(81).nullable() }))
    .query(async ({ ctx, input }) => {
      const now = new Date();
      const rows = await ctx.db
        .select()
        .from(ads)
        .where(
          and(
            eq(ads.isActive, true),
            lte(ads.startsAt, now),
            gt(ads.endsAt, now),
            sql`${input.placement}::ad_placement = any(${ads.placements})`,
            input.cityPlate
              ? or(eq(ads.scope, 'country'), arrayContainsSql(ads.cityPlates, input.cityPlate))
              : eq(ads.scope, 'country'),
          ),
        )
        .orderBy(sql`random()`)
        .limit(3);
      return rows.map((a) => ({
        id: a.id,
        brand: a.brand,
        logoUrl: resolveMediaUrl(ctx.services.storage.publicUrl, a.logoPath),
        product: a.product,
        priceText: a.priceText,
        body: a.body,
        mediaUrl: resolveMediaUrl(ctx.services.storage.publicUrl, a.mediaPath),
        mediaType: a.mediaType,
        link: a.link,
        contact: a.contact,
      }));
    }),

  /** Reklam gösterim / tıklama sayacı (günlük toplam). */
  adEvent: publicProcedure
    .input(z.object({ adId: z.string().uuid(), kind: z.enum(['impression', 'click']) }))
    .mutation(async ({ ctx, input }) => {
      const day = new Date().toISOString().slice(0, 10);
      await ctx.db
        .insert(adStats)
        .values({ adId: input.adId, day, impressions: input.kind === 'impression' ? 1 : 0, clicks: input.kind === 'click' ? 1 : 0 })
        .onConflictDoUpdate({
          target: [adStats.adId, adStats.day],
          set:
            input.kind === 'impression'
              ? { impressions: sql`${adStats.impressions} + 1` }
              : { clicks: sql`${adStats.clicks} + 1` },
        });
      return { ok: true };
    }),
});
