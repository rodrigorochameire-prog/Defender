import {
  pgTable, serial, text, varchar, boolean, timestamp,
  integer, date, jsonb, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { processos, assistidos } from "./core";
import { comarcas } from "./comarcas";

export const delitos = pgTable("delitos", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "cascade" }).notNull(),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "cascade" }),
  tipoDelito: varchar("tipo_delito", { length: 80 }).notNull(),
  artigoBase: varchar("artigo_base", { length: 50 }).notNull(),
  incisos: jsonb("incisos").$type<string[]>(),
  qualificadoras: jsonb("qualificadoras").$type<string[]>(),
  causasAumento: jsonb("causas_aumento").$type<string[]>(),
  causasDiminuicao: jsonb("causas_diminuicao").$type<string[]>(),
  penaMinimaMeses: integer("pena_minima_meses"),
  penaMaximaMeses: integer("pena_maxima_meses"),
  penaAplicadaMeses: integer("pena_aplicada_meses"),
  regimeInicial: varchar("regime_inicial", { length: 20 }),
  cabeAnpp: boolean("cabe_anpp"),
  cabeSursis: boolean("cabe_sursis"),
  cabeTransacao: boolean("cabe_transacao"),
  cabeSubstituicao: boolean("cabe_substituicao"),
  dataSentenca: date("data_sentenca"),
  resultadoSentenca: varchar("resultado_sentenca", { length: 30 }),
  observacoes: text("observacoes"),
  comarcaId: integer("comarca_id").references(() => comarcas.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("delitos_processo_idx").on(table.processoId),
  index("delitos_assistido_idx").on(table.assistidoId),
  index("delitos_tipo_idx").on(table.tipoDelito),
  index("delitos_comarca_idx").on(table.comarcaId),
]);

export const delitosRelations = relations(delitos, ({ one }) => ({
  processo: one(processos, { fields: [delitos.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [delitos.assistidoId], references: [assistidos.id] }),
  comarca: one(comarcas, { fields: [delitos.comarcaId], references: [comarcas.id] }),
}));

export type Delito = typeof delitos.$inferSelect;
export type InsertDelito = typeof delitos.$inferInsert;
