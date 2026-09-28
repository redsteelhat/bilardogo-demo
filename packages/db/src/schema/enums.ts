import { pgEnum } from 'drizzle-orm/pg-core';
import {
  AD_PLACEMENTS,
  BULLETIN_KINDS,
  BULLETIN_STATUSES,
  GAME_TYPES,
  LEVELS,
  MATCH_STATUSES,
  ORDER_KINDS,
  PLAY_INTENTS,
  REPORT_REASONS,
  REPORT_TARGETS,
  VENUE_POST_KINDS,
  VENUE_STATUSES,
  consentKinds,
} from '@bilardogo/domain';

export const gameType = pgEnum('game_type', GAME_TYPES);
export const level = pgEnum('player_level', LEVELS);
export const userRole = pgEnum('user_role', ['user', 'admin']);
export const accountStatus = pgEnum('account_status', ['active', 'passive', 'banned']);
export const businessStatus = pgEnum('business_status', ['pending', 'needs_docs', 'approved', 'rejected']);
export const memberRole = pgEnum('member_role', ['owner', 'staff']);
export const venueState = pgEnum('venue_state', ['active', 'passive']);
export const presenceStatus = pgEnum('presence_status', VENUE_STATUSES);
export const playIntent = pgEnum('play_intent', PLAY_INTENTS);
export const matchStatus = pgEnum('match_status', MATCH_STATUSES);
export const matchSource = pgEnum('match_source', ['request', 'walk_in']);
export const resultStatus = pgEnum('result_status', ['submitted', 'confirmed', 'rejected', 'withdrawn', 'voided']);
export const friendshipStatus = pgEnum('friendship_status', ['pending', 'accepted']);
export const conversationType = pgEnum('conversation_type', ['country', 'city', 'venue', 'dm']);
export const mediaType = pgEnum('media_type', ['image', 'video']);
export const reportTarget = pgEnum('report_target', REPORT_TARGETS);
export const reportReason = pgEnum('report_reason', REPORT_REASONS);
export const reportStatus = pgEnum('report_status', ['open', 'actioned', 'dismissed']);
export const orderKind = pgEnum('order_kind', ORDER_KINDS);
export const orderStatus = pgEnum('order_status', ['open', 'closed', 'cancelled']);
export const orderItemStatus = pgEnum('order_item_status', ['pending', 'preparing', 'delivered', 'cancelled']);
export const bulletinKind = pgEnum('bulletin_kind', BULLETIN_KINDS);
export const bulletinStatus = pgEnum('bulletin_status', BULLETIN_STATUSES);
export const venuePostKind = pgEnum('venue_post_kind', VENUE_POST_KINDS);
export const adScope = pgEnum('ad_scope', ['country', 'city']);
export const adPlacement = pgEnum('ad_placement', AD_PLACEMENTS);
export const subscriptionSubject = pgEnum('subscription_subject', ['user', 'business']);
export const subscriptionStatus = pgEnum('subscription_status', ['trialing', 'active', 'past_due', 'canceled', 'expired']);
export const paymentStatus = pgEnum('payment_status', ['paid', 'refunded', 'failed']);
export const consentKind = pgEnum('consent_kind', consentKinds);
export const notificationCategory = pgEnum('notification_category', [
  'presence',
  'match',
  'social',
  'order',
  'venue',
  'bulletin',
  'account',
]);
export const productCategory = pgEnum('product_category', ['hot_drink', 'cold_drink', 'food', 'snack', 'other']);
