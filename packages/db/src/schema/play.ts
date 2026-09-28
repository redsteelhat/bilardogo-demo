import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  smallint,
  text,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { MatchFormat } from '@bilardogo/domain';
import { createdAt, id, tstz, updatedAt } from './_helpers';
import { profiles, venueTables, venues } from './core';
import { gameType, matchSource, matchStatus, playIntent, presenceStatus, resultStatus } from './enums';

export const presence = pgTable(
  'presence',
  {
    userId: uuid('user_id')
      .primaryKey()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    venueId: uuid('venue_id').references(() => venues.id, { onDelete: 'set null' }),
    status: presenceStatus('status').notNull().default('offline'),
    eta: tstz('eta'),
    playIntent: playIntent('play_intent'),
    expiresAt: tstz('expires_at'),
    updatedAt: updatedAt(),
  },
  (t) => [
    index('presence_venue_idx').on(t.venueId, t.status),
    index('presence_expires_idx').on(t.expiresAt).where(sql`${t.status} <> 'offline'`),
  ],
);

export const matches = pgTable(
  'matches',
  {
    id: id(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id),
    tableId: uuid('table_id').references(() => venueTables.id, { onDelete: 'set null' }),
    gameType: gameType('game_type').notNull(),
    status: matchStatus('status').notNull(),
    source: matchSource('source').notNull(),
    format: jsonb('format').$type<MatchFormat>().notNull(),
    scheduledAt: tstz('scheduled_at'),
    note: text('note'),
    statusReason: text('status_reason'),
    createdBy: uuid('created_by')
      .notNull()
      .references(() => profiles.id),
    acceptedAt: tstz('accepted_at'),
    startedAt: tstz('started_at'),
    endedAt: tstz('ended_at'),
    endedBy: uuid('ended_by').references(() => profiles.id),
    completedAt: tstz('completed_at'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    // Masada aynı anda yalnız 1 aktif maç
    uniqueIndex('matches_table_active_key')
      .on(t.tableId)
      .where(sql`${t.status} in ('waiting_opponent', 'in_progress')`),
    index('matches_venue_status_idx').on(t.venueId, t.status),
    index('matches_status_idx').on(t.status, t.updatedAt),
  ],
);

export const matchPlayers = pgTable(
  'match_players',
  {
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    slot: smallint('slot').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id),
    /** Trigger ile maç durumundan türetilir: accepted / waiting_opponent / in_progress */
    active: boolean('active').notNull().default(false),
    joinedAt: tstz('joined_at').notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.matchId, t.slot] }),
    uniqueIndex('match_players_match_user_key').on(t.matchId, t.userId),
    // Kullanıcı aynı anda yalnız 1 aktif maçta
    uniqueIndex('match_players_user_active_key').on(t.userId).where(sql`${t.active}`),
    index('match_players_user_idx').on(t.userId),
  ],
);

export const matchResults = pgTable(
  'match_results',
  {
    id: id(),
    matchId: uuid('match_id')
      .notNull()
      .references(() => matches.id, { onDelete: 'cascade' }),
    submittedBy: uuid('submitted_by')
      .notNull()
      .references(() => profiles.id),
    status: resultStatus('status').notNull().default('submitted'),
    winnerSlot: smallint('winner_slot'),
    p1Score: integer('p1_score').notNull(),
    p2Score: integer('p2_score').notNull(),
    p1Innings: integer('p1_innings'),
    p2Innings: integer('p2_innings'),
    p1HighRun: integer('p1_high_run'),
    p2HighRun: integer('p2_high_run'),
    target: integer('target'),
    reviewedBy: uuid('reviewed_by').references(() => profiles.id),
    reviewedAt: tstz('reviewed_at'),
    rejectReason: text('reject_reason'),
    createdAt: createdAt(),
  },
  (t) => [
    index('match_results_match_idx').on(t.matchId, t.createdAt),
    uniqueIndex('match_results_open_key').on(t.matchId).where(sql`${t.status} = 'submitted'`),
    uniqueIndex('match_results_confirmed_key').on(t.matchId).where(sql`${t.status} = 'confirmed'`),
  ],
);

export const playerStats = pgTable(
  'player_stats',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    gameType: gameType('game_type').notNull(),
    matches: integer('matches').notNull().default(0),
    wins: integer('wins').notNull().default(0),
    losses: integer('losses').notNull().default(0),
    draws: integer('draws').notNull().default(0),
    /** points: toplam sayı; racks/frames: kazanılan rack/frame */
    totalScore: integer('total_score').notNull().default(0),
    /** racks/frames: kaybedilen rack/frame */
    totalConceded: integer('total_conceded').notNull().default(0),
    totalInnings: integer('total_innings').notNull().default(0),
    /** points: en yüksek seri; snooker: en yüksek break */
    bestHighRun: integer('best_high_run'),
    bestMatchAverage: numeric('best_match_average', { precision: 8, scale: 3 }),
    tableMinutes: integer('table_minutes').notNull().default(0),
    lastPlayedAt: tstz('last_played_at'),
    updatedAt: updatedAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.gameType] })],
);

export const practiceSessions = pgTable(
  'practice_sessions',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    gameType: gameType('game_type').notNull(),
    score: integer('score').notNull(),
    innings: integer('innings').notNull(),
    highRun: integer('high_run'),
    playedOn: date('played_on').notNull(),
    note: text('note'),
    createdAt: createdAt(),
  },
  (t) => [index('practice_sessions_user_idx').on(t.userId, t.playedOn)],
);
