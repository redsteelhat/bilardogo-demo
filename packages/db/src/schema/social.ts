import { sql } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, tstz, updatedAt } from './_helpers';
import { cities, profiles, venues } from './core';
import {
  conversationType,
  friendshipStatus,
  gameType,
  mediaType,
  notificationCategory,
  reportReason,
  reportStatus,
  reportTarget,
} from './enums';

export const friendships = pgTable(
  'friendships',
  {
    id: id(),
    requesterId: uuid('requester_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    addresseeId: uuid('addressee_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    status: friendshipStatus('status').notNull().default('pending'),
    respondedAt: tstz('responded_at'),
    createdAt: createdAt(),
  },
  (t) => [
    // (a,b) ve (b,a) aynı ilişki
    uniqueIndex('friendships_pair_key').on(
      sql`least(${t.requesterId}, ${t.addresseeId})`,
      sql`greatest(${t.requesterId}, ${t.addresseeId})`,
    ),
    index('friendships_addressee_idx').on(t.addresseeId, t.status),
  ],
);

export const blocks = pgTable(
  'blocks',
  {
    blockerId: uuid('blocker_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    blockedId: uuid('blocked_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] }), index('blocks_blocked_idx').on(t.blockedId)],
);

export const conversations = pgTable(
  'conversations',
  {
    id: id(),
    type: conversationType('type').notNull(),
    cityPlate: integer('city_plate').references(() => cities.plate),
    venueId: uuid('venue_id').references(() => venues.id, { onDelete: 'cascade' }),
    /** DM için sıralı "uuid:uuid" anahtarı */
    dmKey: text('dm_key').unique(),
    lastMessageAt: tstz('last_message_at'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('conversations_country_key').on(t.type).where(sql`${t.type} = 'country'`),
    uniqueIndex('conversations_city_key').on(t.cityPlate).where(sql`${t.type} = 'city'`),
    uniqueIndex('conversations_venue_key').on(t.venueId).where(sql`${t.type} = 'venue'`),
  ],
);

export const conversationMembers = pgTable(
  'conversation_members',
  {
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    lastReadAt: tstz('last_read_at'),
    muted: boolean('muted').notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.conversationId, t.userId] }), index('conversation_members_user_idx').on(t.userId)],
);

export const messages = pgTable(
  'messages',
  {
    id: id(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    senderId: uuid('sender_id')
      .notNull()
      .references(() => profiles.id),
    /** Çalışan salon adına yazdıysa */
    asVenueId: uuid('as_venue_id').references(() => venues.id, { onDelete: 'set null' }),
    body: text('body').notNull().default(''),
    mediaPath: text('media_path'),
    mediaType: mediaType('media_type'),
    replyToId: uuid('reply_to_id'),
    hiddenByModeration: boolean('hidden_by_moderation').notNull().default(false),
    createdAt: createdAt(),
    editedAt: tstz('edited_at'),
    deletedAt: tstz('deleted_at'),
  },
  (t) => [index('messages_conversation_idx').on(t.conversationId, t.createdAt)],
);

export const reports = pgTable(
  'reports',
  {
    id: id(),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    targetType: reportTarget('target_type').notNull(),
    targetId: uuid('target_id').notNull(),
    reason: reportReason('reason').notNull(),
    details: text('details'),
    /** Şikâyet anındaki içerik (mesaj metni vb.) — içerik silinse de moderasyon görebilsin */
    snapshot: jsonb('snapshot').$type<Record<string, unknown>>(),
    status: reportStatus('status').notNull().default('open'),
    handledBy: uuid('handled_by').references(() => profiles.id),
    handledAt: tstz('handled_at'),
    resolutionNote: text('resolution_note'),
    createdAt: createdAt(),
  },
  (t) => [
    index('reports_status_idx').on(t.status, t.createdAt),
    uniqueIndex('reports_once_key').on(t.reporterId, t.targetType, t.targetId).where(sql`${t.status} = 'open'`),
  ],
);

export const notificationTemplates = pgTable('notification_templates', {
  key: text('key').primaryKey(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  category: notificationCategory('category').notNull(),
  description: text('description'),
  isActive: boolean('is_active').notNull().default(true),
  updatedAt: updatedAt(),
  updatedBy: uuid('updated_by').references(() => profiles.id),
});

export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    templateKey: text('template_key').notNull(),
    category: notificationCategory('category').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    link: text('link'),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    readAt: tstz('read_at'),
    createdAt: createdAt(),
  },
  (t) => [
    index('notifications_user_idx').on(t.userId, t.createdAt),
    index('notifications_unread_idx').on(t.userId).where(sql`${t.readAt} is null`),
  ],
);

export const pushSubscriptions = pgTable(
  'push_subscriptions',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
    lastUsedAt: tstz('last_used_at'),
  },
  (t) => [index('push_subscriptions_user_idx').on(t.userId)],
);

export const notificationPrefs = pgTable('notification_prefs', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  pushEnabled: boolean('push_enabled').notNull().default(true),
  presence: boolean('presence').notNull().default(true),
  match: boolean('match').notNull().default(true),
  social: boolean('social').notNull().default(true),
  order: boolean('order').notNull().default(true),
  venue: boolean('venue').notNull().default(true),
  bulletin: boolean('bulletin').notNull().default(true),
  /** Takip ettiğim salonlardaki herkesin durum / maç hareketleri (kapalıysa yalnız arkadaşlar) */
  venueActivity: boolean('venue_activity').notNull().default(true),
  /** Boşsa tüm oyun türleri */
  gameTypes: gameType('game_types').array().notNull().default(sql`'{}'::game_type[]`),
  updatedAt: updatedAt(),
});
