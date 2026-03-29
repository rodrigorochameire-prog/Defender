import {
  pgTable, serial, text, integer, timestamp, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./core";

export const userGoogleTokens = pgTable("user_google_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  email: text("email").notNull(),
  refreshToken: text("refresh_token").notNull(),
  accessToken: text("access_token"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("user_google_tokens_user_idx").on(table.userId),
]);

export const userGoogleTokensRelations = relations(userGoogleTokens, ({ one }) => ({
  user: one(users, { fields: [userGoogleTokens.userId], references: [users.id] }),
}));

export type UserGoogleToken = typeof userGoogleTokens.$inferSelect;
