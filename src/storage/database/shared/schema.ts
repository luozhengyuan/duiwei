import { pgTable, serial, timestamp, text, varchar, index, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: serial("id").primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    summary: text("summary").notNull(),
    content: text("content").notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("blog_posts_created_at_idx").on(table.created_at),
  ]
);

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    username: varchar("username", { length: 50 }).unique().notNull(),
    password: varchar("password", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("users_username_idx").on(table.username),
  ]
);

export const gameRecords = pgTable(
  "game_records",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id),
    scenario: varchar("scenario", { length: 100 }).notNull(),
    finalScore: integer("final_score").default(0).notNull(),
    result: varchar("result", { length: 20 }).default("in_progress"),
    playedAt: timestamp("played_at", { withTimezone: true }).defaultNow().notNull(),
  }
);
