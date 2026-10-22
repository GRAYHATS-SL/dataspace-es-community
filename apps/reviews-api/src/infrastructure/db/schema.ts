import { sql } from 'drizzle-orm';
import { check, index, pgTable, smallint, text, timestamp, unique, uuid } from 'drizzle-orm/pg-core';

/** Drizzle schema of the `comments` table. */
export const comments = pgTable(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    offeringId: text('offering_id').notNull(),
    individualId: text('individual_id').notNull(),
    organizationId: text('organization_id').notNull(),
    rating: smallint('rating').notNull(),
    body: text('body'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique('comments_organization_id_offering_id_unique').on(table.organizationId, table.offeringId),
    index('idx_comments_offering_id').on(table.offeringId),
    check('rating_range', sql`${table.rating} BETWEEN 1 AND 5`),
    check('body_max_length', sql`char_length(${table.body}) <= 1000`),
  ],
);
