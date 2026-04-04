import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================================
// DEFENSORES DA BAHIA — Diretório Institucional
// Fonte: Organograma DPE-BA (Capital + Interior)
// ==========================================

export const defensoresBa = pgTable("defensores_ba", {
  id: serial("id").primaryKey(),

  // Dados pessoais
  nome: text("nome").notNull(),
  email: varchar("email", { length: 200 }),

  // Posição institucional
  unidade: varchar("unidade", { length: 100 }),          // "1º DP de Instância Superior"
  atribuicao: text("atribuicao"),                        // "1ª Câmara Criminal", "2ª Vara Criminal"

  // Classificação
  especialidade: varchar("especialidade", { length: 50 }).notNull(), // CRIMINAL, CIVEL, FAMILIA, JURI, etc.
  area: varchar("area", { length: 20 }).notNull(),                   // CRIMINAL ou CIVEL
  instancia: varchar("instancia", { length: 20 }).notNull(),         // PRIMEIRA ou SEGUNDA
  localizacao: varchar("localizacao", { length: 20 }).notNull(),     // CAPITAL ou INTERIOR

  // Comarca (para interior)
  comarca: varchar("comarca", { length: 100 }),

  // Status
  ativo: boolean("ativo").default(true).notNull(),

  // Metadata
  fonteOrganograma: varchar("fonte_organograma", { length: 50 }).default("DPE-BA-2026"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("defensores_ba_especialidade_idx").on(table.especialidade),
  index("defensores_ba_area_idx").on(table.area),
  index("defensores_ba_instancia_idx").on(table.instancia),
  index("defensores_ba_localizacao_idx").on(table.localizacao),
  index("defensores_ba_comarca_idx").on(table.comarca),
  uniqueIndex("defensores_ba_email_idx").on(table.email),
]);

export type DefensorBa = typeof defensoresBa.$inferSelect;
export type InsertDefensorBa = typeof defensoresBa.$inferInsert;

// ==========================================
// RELAÇÕES
// ==========================================

export const defensoresBaRelations = relations(defensoresBa, ({}) => ({
  // Futuras relações: vinculação com profissionais (quando defensor usar o OMBUDS)
}));
