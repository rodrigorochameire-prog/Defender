import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { feedbackTipoEnum, feedbackStatusEnum } from "./enums";
import { users } from "./core";

export const feedbacks = pgTable("feedbacks", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id),
  tipo: feedbackTipoEnum("tipo").notNull(),
  mensagem: text("mensagem").notNull(),
  pagina: text("pagina"),
  contexto: jsonb("contexto").$type<{
    viewport?: string;
    userAgent?: string;
    consoleErrors?: string[];
  }>(),
  status: feedbackStatusEnum("status").notNull().default("novo"),
  jiraTicketId: varchar("jira_ticket_id", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("feedbacks_user_id_idx").on(table.userId),
  index("feedbacks_status_idx").on(table.status),
  index("feedbacks_created_at_idx").on(table.createdAt),
]);

export type Feedback = typeof feedbacks.$inferSelect;
export type InsertFeedback = typeof feedbacks.$inferInsert;
