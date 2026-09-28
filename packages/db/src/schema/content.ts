import { sql } from 'drizzle-orm';
import { boolean, date, index, integer, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, tstz, updatedAt } from './_helpers';
import { profiles, venues } from './core';
import { adPlacement, adScope, bulletinKind, bulletinStatus, mediaType, venuePostKind } from './enums';

export const bulletins = pgTable(
  'bulletins',
  {
    id: id(),
    kind: bulletinKind('kind').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull().default(''),
    mediaPath: text('media_path'),
    mediaType: mediaType('media_type'),
    videoUrl: text('video_url'),
    status: bulletinStatus('status').notNull().default('draft'),
    publishAt: tstz('publish_at'),
    publishedAt: tstz('published_at'),
    /** Boşsa Türkiye geneli */
    cityPlates: integer('city_plates').array().notNull().default(sql`'{}'::integer[]`),
    notify: boolean('notify').notNull().default(false),
    notifiedAt: tstz('notified_at'),
    createdBy: uuid('created_by').references(() => profiles.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('bulletins_status_idx').on(t.status, t.publishedAt)],
);

export const venuePosts = pgTable(
  'venue_posts',
  {
    id: id(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    kind: venuePostKind('kind').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    imagePath: text('image_path'),
    validFrom: tstz('valid_from'),
    validTo: tstz('valid_to'),
    createdBy: uuid('created_by').references(() => profiles.id),
    createdAt: createdAt(),
    deletedAt: tstz('deleted_at'),
  },
  (t) => [index('venue_posts_venue_idx').on(t.venueId, t.createdAt)],
);

export const ads = pgTable(
  'ads',
  {
    id: id(),
    brand: text('brand').notNull(),
    logoPath: text('logo_path'),
    product: text('product'),
    priceText: text('price_text'),
    body: text('body'),
    mediaPath: text('media_path'),
    mediaType: mediaType('media_type'),
    link: text('link'),
    contact: text('contact'),
    scope: adScope('scope').notNull(),
    cityPlates: integer('city_plates').array().notNull().default(sql`'{}'::integer[]`),
    placements: adPlacement('placements').array().notNull(),
    startsAt: tstz('starts_at').notNull(),
    endsAt: tstz('ends_at').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by').references(() => profiles.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('ads_window_idx').on(t.startsAt, t.endsAt)],
);

export const adStats = pgTable(
  'ad_stats',
  {
    adId: uuid('ad_id')
      .notNull()
      .references(() => ads.id, { onDelete: 'cascade' }),
    day: date('day').notNull(),
    impressions: integer('impressions').notNull().default(0),
    clicks: integer('clicks').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.adId, t.day] })],
);
