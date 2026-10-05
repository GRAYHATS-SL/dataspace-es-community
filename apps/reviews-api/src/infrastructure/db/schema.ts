import { sql } from 'drizzle-orm';
import { check, index, pgTable, smallint, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Drizzle schema of the `comments` table — used for typing and to generate the
 * initial migration with `drizzle-kit generate`. Constraints: `CHECK` on the `rating`
 * range and on the maximum `body` length.
 */
export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    offeringId: text('offering_id').notNull(),
    rating: smallint('rating').notNull(),
    body: text('body'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    // Here you define your own columns.
  },
  (table) => [
    index('idx_comments_offering_id').on(table.offeringId),
    check('rating_range', sql`${table.rating} BETWEEN 1 AND 5`),
    check('body_max_length', sql`char_length(${table.body}) <= 1000`),
    // Here you define your own constraints (e.g. UNIQUE rules).
  ],
);
