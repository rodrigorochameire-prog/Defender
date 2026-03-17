import { pgTable, serial, varchar, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { casos } from "./casos";
import { users } from "./core";

export const referencesBiblioteca = pgTable("referencias_biblioteca", {
  id: serial("id").primaryKey(),
  tipo: varchar("tipo", { length: 20 }).notNull(),
  referenciaId: varchar("referencia_id", { length: 100 }).notNull(),
  casoId: integer("caso_id").references(() => casos.id, { onDelete: "cascade" }).notNull(),
  observacao: text("observacao"),
  citacaoFormatada: text("citacao_formatada"),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("ref_bib_caso_idx").on(t.casoId),
  index("ref_bib_ref_idx").on(t.tipo, t.referenciaId),
]);

export const leisVersoes = pgTable("leis_versoes", {
  id: serial("id").primaryKey(),
  leiId: varchar("lei_id", { length: 50 }).notNull(),
  artigoId: varchar("artigo_id", { length: 100 }).notNull(),
  textoAnterior: text("texto_anterior"),
  textoNovo: text("texto_novo").notNull(),
  leisAlteradora: varchar("lei_alteradora", { length: 200 }),
  dataVigencia: varchar("data_vigencia", { length: 30 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("leis_versoes_lei_artigo_idx").on(t.leiId, t.artigoId),
  index("leis_versoes_lei_idx").on(t.leiId),
]);

export type ReferenciaBiblioteca = typeof referencesBiblioteca.$inferSelect;
export type InsertReferenciaBiblioteca = typeof referencesBiblioteca.$inferInsert;
export type LeiVersao = typeof leisVersoes.$inferSelect;
export type InsertLeiVersao = typeof leisVersoes.$inferInsert;
