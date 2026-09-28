import { sql } from 'drizzle-orm';
import { boolean, index, integer, numeric, pgTable, primaryKey, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { createdAt, id, tstz, updatedAt } from './_helpers';
import { businesses, profiles, venueTables, venues } from './core';
import { matches } from './play';
import {
  orderItemStatus,
  orderKind,
  orderStatus,
  paymentStatus,
  productCategory,
  subscriptionStatus,
  subscriptionSubject,
} from './enums';

export const catalogProducts = pgTable('catalog_products', {
  id: id(),
  name: text('name').notNull(),
  category: productCategory('category').notNull(),
  imagePath: text('image_path'),
  isActive: boolean('is_active').notNull().default(true),
  sort: integer('sort').notNull().default(0),
  createdAt: createdAt(),
});

export const venueProducts = pgTable(
  'venue_products',
  {
    id: id(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    productId: uuid('product_id')
      .notNull()
      .references(() => catalogProducts.id),
    price: numeric('price', { precision: 10, scale: 2 }).notNull(),
    isAvailable: boolean('is_available').notNull().default(true),
    /** null = stok takibi yok */
    stock: integer('stock'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('venue_products_key').on(t.venueId, t.productId)],
);

export const orders = pgTable(
  'orders',
  {
    id: id(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id),
    kind: orderKind('kind').notNull(),
    matchId: uuid('match_id').references(() => matches.id, { onDelete: 'set null' }),
    tableId: uuid('table_id').references(() => venueTables.id, { onDelete: 'set null' }),
    joinCode: text('join_code').notNull(),
    locationText: text('location_text'),
    note: text('note'),
    status: orderStatus('status').notNull().default('open'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id),
    closedBy: uuid('closed_by').references(() => profiles.id),
    closedAt: tstz('closed_at'),
    total: numeric('total', { precision: 10, scale: 2 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('orders_open_code_key').on(t.joinCode).where(sql`${t.status} = 'open'`),
    uniqueIndex('orders_open_match_key').on(t.matchId).where(sql`${t.status} = 'open' and ${t.matchId} is not null`),
    index('orders_venue_status_idx').on(t.venueId, t.status, t.createdAt),
  ],
);

export const orderParticipants = pgTable(
  'order_participants',
  {
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id),
    isSpectator: boolean('is_spectator').notNull().default(false),
    joinedAt: tstz('joined_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.orderId, t.userId] }), index('order_participants_user_idx').on(t.userId)],
);

export const orderItems = pgTable(
  'order_items',
  {
    id: id(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id),
    venueProductId: uuid('venue_product_id').references(() => venueProducts.id, { onDelete: 'set null' }),
    productName: text('product_name').notNull(),
    unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
    qty: integer('qty').notNull(),
    note: text('note'),
    status: orderItemStatus('status').notNull().default('pending'),
    handledBy: uuid('handled_by').references(() => profiles.id),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('order_items_order_idx').on(t.orderId), index('order_items_status_idx').on(t.status)],
);

export const plans = pgTable('plans', {
  id: id(),
  audience: subscriptionSubject('audience').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  currency: text('currency').notNull().default('TRY'),
  intervalMonths: integer('interval_months').notNull().default(1),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: createdAt(),
});

export const subscriptions = pgTable(
  'subscriptions',
  {
    id: id(),
    subjectType: subscriptionSubject('subject_type').notNull(),
    userId: uuid('user_id').references(() => profiles.id, { onDelete: 'cascade' }),
    businessId: uuid('business_id').references(() => businesses.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id').references(() => plans.id),
    status: subscriptionStatus('status').notNull(),
    trialStartedAt: tstz('trial_started_at'),
    trialEndsAt: tstz('trial_ends_at'),
    currentPeriodStart: tstz('current_period_start'),
    currentPeriodEnd: tstz('current_period_end'),
    canceledAt: tstz('canceled_at'),
    provider: text('provider').notNull().default('manual'),
    providerRef: text('provider_ref'),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('subscriptions_user_key').on(t.userId).where(sql`${t.userId} is not null`),
    uniqueIndex('subscriptions_business_key').on(t.businessId).where(sql`${t.businessId} is not null`),
    index('subscriptions_status_idx').on(t.status),
  ],
);

export const subscriptionEvents = pgTable(
  'subscription_events',
  {
    id: id(),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    event: text('event').notNull(),
    fromStatus: subscriptionStatus('from_status'),
    toStatus: subscriptionStatus('to_status'),
    periodEnd: tstz('period_end'),
    actorId: uuid('actor_id').references(() => profiles.id),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [index('subscription_events_sub_idx').on(t.subscriptionId, t.createdAt)],
);

export const payments = pgTable(
  'payments',
  {
    id: id(),
    subscriptionId: uuid('subscription_id')
      .notNull()
      .references(() => subscriptions.id, { onDelete: 'cascade' }),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    currency: text('currency').notNull().default('TRY'),
    status: paymentStatus('status').notNull().default('paid'),
    method: text('method').notNull().default('manual'),
    paidAt: tstz('paid_at').notNull(),
    periodStart: tstz('period_start'),
    periodEnd: tstz('period_end'),
    reference: text('reference'),
    note: text('note'),
    recordedBy: uuid('recorded_by').references(() => profiles.id),
    createdAt: createdAt(),
  },
  (t) => [index('payments_subscription_idx').on(t.subscriptionId, t.paidAt)],
);
