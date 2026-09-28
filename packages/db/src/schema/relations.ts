import { relations } from 'drizzle-orm';
import {
  businessDocuments,
  businessMembers,
  businesses,
  cities,
  profiles,
  venueFollows,
  venueImages,
  venueTables,
  venues,
} from './core';
import { matchPlayers, matchResults, matches, playerStats, presence, practiceSessions } from './play';
import { conversationMembers, conversations, messages, notifications } from './social';
import { venuePosts } from './content';
import {
  catalogProducts,
  orderItems,
  orderParticipants,
  orders,
  payments,
  plans,
  subscriptionEvents,
  subscriptions,
  venueProducts,
} from './commerce';

export const profilesRelations = relations(profiles, ({ one, many }) => ({
  city: one(cities, { fields: [profiles.cityPlate], references: [cities.plate] }),
  presence: one(presence, { fields: [profiles.id], references: [presence.userId] }),
  stats: many(playerStats),
  practice: many(practiceSessions),
  memberships: many(businessMembers),
}));

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  owner: one(profiles, { fields: [businesses.ownerId], references: [profiles.id] }),
  documents: many(businessDocuments),
  members: many(businessMembers),
  venues: many(venues),
  subscription: one(subscriptions, { fields: [businesses.id], references: [subscriptions.businessId] }),
}));

export const businessDocumentsRelations = relations(businessDocuments, ({ one }) => ({
  business: one(businesses, { fields: [businessDocuments.businessId], references: [businesses.id] }),
}));

export const businessMembersRelations = relations(businessMembers, ({ one }) => ({
  business: one(businesses, { fields: [businessMembers.businessId], references: [businesses.id] }),
  user: one(profiles, { fields: [businessMembers.userId], references: [profiles.id] }),
}));

export const venuesRelations = relations(venues, ({ one, many }) => ({
  business: one(businesses, { fields: [venues.businessId], references: [businesses.id] }),
  city: one(cities, { fields: [venues.cityPlate], references: [cities.plate] }),
  images: many(venueImages),
  tables: many(venueTables),
  follows: many(venueFollows),
  posts: many(venuePosts),
  products: many(venueProducts),
}));

export const venueImagesRelations = relations(venueImages, ({ one }) => ({
  venue: one(venues, { fields: [venueImages.venueId], references: [venues.id] }),
}));

export const venueTablesRelations = relations(venueTables, ({ one }) => ({
  venue: one(venues, { fields: [venueTables.venueId], references: [venues.id] }),
}));

export const venueFollowsRelations = relations(venueFollows, ({ one }) => ({
  venue: one(venues, { fields: [venueFollows.venueId], references: [venues.id] }),
  user: one(profiles, { fields: [venueFollows.userId], references: [profiles.id] }),
}));

export const presenceRelations = relations(presence, ({ one }) => ({
  user: one(profiles, { fields: [presence.userId], references: [profiles.id] }),
  venue: one(venues, { fields: [presence.venueId], references: [venues.id] }),
}));

export const matchesRelations = relations(matches, ({ one, many }) => ({
  venue: one(venues, { fields: [matches.venueId], references: [venues.id] }),
  table: one(venueTables, { fields: [matches.tableId], references: [venueTables.id] }),
  players: many(matchPlayers),
  results: many(matchResults),
}));

export const matchPlayersRelations = relations(matchPlayers, ({ one }) => ({
  match: one(matches, { fields: [matchPlayers.matchId], references: [matches.id] }),
  user: one(profiles, { fields: [matchPlayers.userId], references: [profiles.id] }),
}));

export const matchResultsRelations = relations(matchResults, ({ one }) => ({
  match: one(matches, { fields: [matchResults.matchId], references: [matches.id] }),
}));

export const playerStatsRelations = relations(playerStats, ({ one }) => ({
  user: one(profiles, { fields: [playerStats.userId], references: [profiles.id] }),
}));

export const practiceSessionsRelations = relations(practiceSessions, ({ one }) => ({
  user: one(profiles, { fields: [practiceSessions.userId], references: [profiles.id] }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  venue: one(venues, { fields: [conversations.venueId], references: [venues.id] }),
  city: one(cities, { fields: [conversations.cityPlate], references: [cities.plate] }),
  members: many(conversationMembers),
  messages: many(messages),
}));

export const conversationMembersRelations = relations(conversationMembers, ({ one }) => ({
  conversation: one(conversations, { fields: [conversationMembers.conversationId], references: [conversations.id] }),
  user: one(profiles, { fields: [conversationMembers.userId], references: [profiles.id] }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, { fields: [messages.conversationId], references: [conversations.id] }),
  sender: one(profiles, { fields: [messages.senderId], references: [profiles.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(profiles, { fields: [notifications.userId], references: [profiles.id] }),
}));

export const venuePostsRelations = relations(venuePosts, ({ one }) => ({
  venue: one(venues, { fields: [venuePosts.venueId], references: [venues.id] }),
}));

export const venueProductsRelations = relations(venueProducts, ({ one }) => ({
  venue: one(venues, { fields: [venueProducts.venueId], references: [venues.id] }),
  product: one(catalogProducts, { fields: [venueProducts.productId], references: [catalogProducts.id] }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  venue: one(venues, { fields: [orders.venueId], references: [venues.id] }),
  table: one(venueTables, { fields: [orders.tableId], references: [venueTables.id] }),
  participants: many(orderParticipants),
  items: many(orderItems),
}));

export const orderParticipantsRelations = relations(orderParticipants, ({ one }) => ({
  order: one(orders, { fields: [orderParticipants.orderId], references: [orders.id] }),
  user: one(profiles, { fields: [orderParticipants.userId], references: [profiles.id] }),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  user: one(profiles, { fields: [orderItems.userId], references: [profiles.id] }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  plan: one(plans, { fields: [subscriptions.planId], references: [plans.id] }),
  user: one(profiles, { fields: [subscriptions.userId], references: [profiles.id] }),
  business: one(businesses, { fields: [subscriptions.businessId], references: [businesses.id] }),
  payments: many(payments),
  events: many(subscriptionEvents),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  subscription: one(subscriptions, { fields: [payments.subscriptionId], references: [subscriptions.id] }),
}));

export const subscriptionEventsRelations = relations(subscriptionEvents, ({ one }) => ({
  subscription: one(subscriptions, { fields: [subscriptionEvents.subscriptionId], references: [subscriptions.id] }),
}));
