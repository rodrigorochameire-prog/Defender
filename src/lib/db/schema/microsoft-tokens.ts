import {
  pgTable, serial, text, varchar, integer, timestamp, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./core";

export const userMicrosoftTokens = pgTable("user_microsoft_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull(),
  displayName: varchar("display_name", { length: 255 }),
  microsoftUserId: varchar("microsoft_user_id", { length: 100 }),
  refreshToken: text("refresh_token").notNull(),
  accessToken: text("access_token"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("user_microsoft_tokens_user_idx").on(table.userId),
]);

export const userMicrosoftTokensRelations = relations(userMicrosoftTokens, ({ one }) => ({
  user: one(users, { fields: [userMicrosoftTokens.userId], references: [users.id] }),
}));

export type UserMicrosoftToken = typeof userMicrosoftTokens.$inferSelect;
