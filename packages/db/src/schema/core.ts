import { sql } from 'drizzle-orm';
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { authUsers } from 'drizzle-orm/supabase';
import type { OpeningHours } from '@bilardogo/domain';
import { createdAt, id, tstz, updatedAt } from './_helpers';
import {
  accountStatus,
  businessStatus,
  consentKind,
  gameType,
  level,
  memberRole,
  userRole,
  venueState,
} from './enums';

export const cities = pgTable('cities', {
  plate: integer('plate').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
});

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id')
      .primaryKey()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    username: text('username'),
    fullName: text('full_name').notNull().default(''),
    avatarPath: text('avatar_path'),
    cityPlate: integer('city_plate').references(() => cities.plate),
    level: level('level').notNull().default('beginner'),
    gameTypes: gameType('game_types').array().notNull().default(sql`'{}'::game_type[]`),
    bio: text('bio'),
    role: userRole('role').notNull().default('user'),
    status: accountStatus('status').notNull().default('active'),
    statusReason: text('status_reason'),
    bannedUntil: tstz('banned_until'),
    onboardedAt: tstz('onboarded_at'),
    lastSeenAt: tstz('last_seen_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: tstz('deleted_at'),
  },
  (t) => [
    uniqueIndex('profiles_username_key').on(sql`lower(${t.username})`),
    index('profiles_city_idx').on(t.cityPlate),
  ],
);

export const legalDocuments = pgTable(
  'legal_documents',
  {
    id: id(),
    kind: consentKind('kind').notNull(),
    version: integer('version').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    isCurrent: boolean('is_current').notNull().default(false),
    publishedAt: tstz('published_at').notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('legal_documents_kind_version_key').on(t.kind, t.version),
    uniqueIndex('legal_documents_current_key').on(t.kind).where(sql`${t.isCurrent}`),
  ],
);

export const consents = pgTable(
  'consents',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    kind: consentKind('kind').notNull(),
    documentId: uuid('document_id').references(() => legalDocuments.id),
    granted: boolean('granted').notNull(),
    ip: text('ip'),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
  },
  (t) => [index('consents_user_idx').on(t.userId, t.kind)],
);

export const businesses = pgTable(
  'businesses',
  {
    id: id(),
    ownerId: uuid('owner_id')
      .notNull()
      .references(() => profiles.id),
    legalName: text('legal_name').notNull(),
    taxId: text('tax_id').notNull(),
    taxOffice: text('tax_office').notNull(),
    contactPhone: text('contact_phone').notNull(),
    status: businessStatus('status').notNull().default('pending'),
    reviewNote: text('review_note'),
    reviewedBy: uuid('reviewed_by').references(() => profiles.id),
    reviewedAt: tstz('reviewed_at'),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('businesses_owner_idx').on(t.ownerId), index('businesses_status_idx').on(t.status)],
);

export const businessDocuments = pgTable(
  'business_documents',
  {
    id: id(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull().default('other'),
    storagePath: text('storage_path').notNull(),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    uploadedBy: uuid('uploaded_by').references(() => profiles.id),
    createdAt: createdAt(),
  },
  (t) => [index('business_documents_business_idx').on(t.businessId)],
);

export const businessMembers = pgTable(
  'business_members',
  {
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    role: memberRole('role').notNull(),
    permissions: text('permissions').array().notNull().default(sql`'{}'::text[]`),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.businessId, t.userId] }), index('business_members_user_idx').on(t.userId)],
);

export const venues = pgTable(
  'venues',
  {
    id: id(),
    businessId: uuid('business_id')
      .notNull()
      .references(() => businesses.id, { onDelete: 'cascade' }),
    cityPlate: integer('city_plate')
      .notNull()
      .references(() => cities.plate),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    district: text('district'),
    address: text('address').notNull(),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    phone: text('phone'),
    description: text('description'),
    openingHours: jsonb('opening_hours').$type<OpeningHours>().notNull(),
    coverPath: text('cover_path'),
    state: venueState('state').notNull().default('active'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('venues_city_idx').on(t.cityPlate), index('venues_business_idx').on(t.businessId)],
);

export const venueImages = pgTable(
  'venue_images',
  {
    id: id(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    sort: integer('sort').notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index('venue_images_venue_idx').on(t.venueId, t.sort)],
);

export const venueTables = pgTable(
  'venue_tables',
  {
    id: id(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    number: integer('number').notNull(),
    label: text('label'),
    allowedGameTypes: gameType('allowed_game_types').array().notNull(),
    qrToken: text('qr_token').notNull().unique(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('venue_tables_venue_number_key').on(t.venueId, t.number)],
);

export const venueFollows = pgTable(
  'venue_follows',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.venueId] }), index('venue_follows_venue_idx').on(t.venueId)],
);

export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: updatedAt(),
  updatedBy: uuid('updated_by').references(() => profiles.id),
});

export const auditLog = pgTable(
  'audit_log',
  {
    id: id(),
    actorId: uuid('actor_id').references(() => profiles.id),
    action: text('action').notNull(),
    targetType: text('target_type'),
    targetId: text('target_id'),
    meta: jsonb('meta').$type<Record<string, unknown>>(),
    createdAt: createdAt(),
  },
  (t) => [index('audit_log_created_idx').on(t.createdAt), index('audit_log_target_idx').on(t.targetType, t.targetId)],
);

export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  windowStart: tstz('window_start').notNull(),
  count: integer('count').notNull().default(0),
});
