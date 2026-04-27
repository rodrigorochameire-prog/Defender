import { pgTable, serial, integer, varchar, text, numeric, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { processos } from "./core";

export const delitosCatalogo = pgTable("delitos_catalogo", {
  id: serial("id").primaryKey(),
  codigoLei: varchar("codigo_lei", { length: 40 }),
  artigo: varchar("artigo", { length: 40 }),
  paragrafo: varchar("paragrafo", { length: 20 }),
  inciso: varchar("inciso", { length: 20 }),
  descricaoCurta: varchar("descricao_curta", { length: 120 }).notNull(),
  descricaoLonga: text("descricao_longa"),
  natureza: varchar("natureza", { length: 40 }),
  hediondo: boolean("hediondo").default(false),
  penaMinAnos: numeric("pena_min_anos", { precision: 4, scale: 1 }),
  penaMaxAnos: numeric("pena_max_anos", { precision: 4, scale: 1 }),
  areaSugerida: varchar("area_sugerida", { length: 40 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const tipificacoes = pgTable("tipificacoes", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").notNull().references(() => processos.id, { onDelete: "cascade" }),
  delitoId: integer("delito_id").notNull().references(() => delitosCatalogo.id),
  qualificadoras: jsonb("qualificadoras").default([]),
  majorantes: jsonb("majorantes").default([]),
  minorantes: jsonb("minorantes").default([]),
  modalidade: varchar("modalidade", { length: 20 }).default("consumada"),
  observacoes: text("observacoes"),
  fonte: varchar("fonte", { length: 30 }).notNull().default("manual"),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).default("0.9"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
