import {
  pgTable,
  serial,
  text,
  varchar,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./core";

// ==========================================
// LEGISLACAO - Destaques, Notas e Favoritos
// ==========================================

export const legislacaoDestaques = pgTable("legislacao_destaques", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  leiId: varchar("lei_id", { length: 50 }).notNull(),
  artigoId: varchar("artigo_id", { length: 100 }).notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // "highlight" | "note" | "favorite"
  conteudo: text("conteudo"), // note text (null for favorites/highlights)
  cor: varchar("cor", { length: 20 }).default("yellow"), // "yellow" | "green" | "blue" | "red"
  textoSelecionado: text("texto_selecionado"), // highlighted text snippet
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("leg_dest_user_idx").on(table.userId),
  index("leg_dest_user_artigo_idx").on(table.userId, table.artigoId),
  index("leg_dest_user_lei_idx").on(table.userId, table.leiId),
]);

export type LegislacaoDestaque = typeof legislacaoDestaques.$inferSelect;
export type InsertLegislacaoDestaque = typeof legislacaoDestaques.$inferInsert;
