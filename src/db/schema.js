import { relations, sql } from 'drizzle-orm';
import {
    bigint,
    check,
    index,
    integer,
    jsonb,
    pgEnum,
    pgTable,
    serial,
    text,
    timestamp,
    uniqueIndex,
    uuid,
    varchar,
} from 'drizzle-orm/pg-core';

// Define the 'demo_users' table
export const demoUsers = pgTable('demo_users', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Lifecycle of a match. Drives which matches the WebSocket layer streams.
export const matchStatus = pgEnum('match_status', ['scheduled', 'live', 'finished']);

export const matches = pgTable(
    'matches',
    {
        id: uuid('id').primaryKey().defaultRandom(),
        sport: varchar('sport', { length: 50 }).notNull(),
        homeTeam: varchar('home_team', { length: 120 }).notNull(),
        awayTeam: varchar('away_team', { length: 120 }).notNull(),
        status: matchStatus('status').notNull().default('scheduled'),
        startTime: timestamp('start_time', { withTimezone: true }).notNull(),
        endTime: timestamp('end_time', { withTimezone: true }),
        homeScore: integer('home_score').notNull().default(0),
        awayScore: integer('away_score').notNull().default(0),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        // Primary read path: "what is live right now" and "what starts next".
        index('matches_status_start_time_idx').on(table.status, table.startTime),
        index('matches_sport_start_time_idx').on(table.sport, table.startTime),
        check('matches_scores_non_negative', sql`${table.homeScore} >= 0 AND ${table.awayScore} >= 0`),
        check('matches_end_after_start', sql`${table.endTime} IS NULL OR ${table.endTime} >= ${table.startTime}`),
    ],
);

export const commentary = pgTable(
    'commentary',
    {
        // Append-only, high volume: identity beats UUIDv4 for index locality.
        id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
        matchId: uuid('match_id')
            .notNull()
            .references(() => matches.id, { onDelete: 'cascade' }),
        // Nullable: pre-match and post-match entries have no clock minute.
        minute: integer('minute'),
        // Authoritative ordering within a match; clients resume from the last sequence seen.
        sequence: integer('sequence').notNull(),
        period: varchar('period', { length: 20 }),
        eventType: varchar('event_type', { length: 40 }).notNull(),
        actor: varchar('actor', { length: 120 }),
        team: varchar('team', { length: 120 }),
        message: text('message').notNull(),
        metadata: jsonb('metadata'),
        tags: text('tags').array(),
        createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    },
    (table) => [
        // Makes ingestion idempotent and serves feed pagination in both directions.
        uniqueIndex('commentary_match_id_sequence_idx').on(table.matchId, table.sequence),
        index('commentary_match_id_created_at_idx').on(table.matchId, table.createdAt),
        index('commentary_tags_idx').using('gin', table.tags),
    ],
);

export const matchesRelations = relations(matches, ({ many }) => ({
    commentary: many(commentary),
}));

export const commentaryRelations = relations(commentary, ({ one }) => ({
    match: one(matches, {
        fields: [commentary.matchId],
        references: [matches.id],
    }),
}));