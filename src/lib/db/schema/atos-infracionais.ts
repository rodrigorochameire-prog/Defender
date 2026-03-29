import {
  pgTable, serial, text, varchar, boolean, timestamp,
  integer, date, jsonb, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { processos, assistidos } from "./core";
import { comarcas } from "./comarcas";

export const atosInfracionais = pgTable("atos_infracionais", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "cascade" }).notNull(),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "cascade" }),

  // Tipificação do ato infracional (equiparado a qual crime)
  atoEquiparado: varchar("ato_equiparado", { length: 80 }).notNull(),
    // "furto", "roubo", "tráfico", "lesão corporal", etc.
  artigoEquiparado: varchar("artigo_equiparado", { length: 50 }).notNull(),
    // "art. 155 CP", "art. 33 Lei 11.343", etc.
  qualificadoras: jsonb("qualificadoras").$type<string[]>(),

  // Gravidade (influencia na medida aplicável)
  envolveuViolencia: boolean("envolveu_violencia").default(false),
  envolveuGraveAmeaca: boolean("envolveu_grave_ameaca").default(false),

  // Dados do adolescente
  idadeNaData: integer("idade_na_data"), // idade no momento do ato

  // Remissão (art. 126-128 ECA)
  remissao: varchar("remissao", { length: 30 }),
    // null, "CONCEDIDA_MP", "CONCEDIDA_JUIZ", "NEGADA"
  dataRemissao: date("data_remissao"),
  condicoesRemissao: jsonb("condicoes_remissao").$type<string[]>(),

  observacoes: text("observacoes"),
  comarcaId: integer("comarca_id").references(() => comarcas.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("atos_infracionais_processo_idx").on(table.processoId),
  index("atos_infracionais_assistido_idx").on(table.assistidoId),
  index("atos_infracionais_ato_idx").on(table.atoEquiparado),
  index("atos_infracionais_comarca_idx").on(table.comarcaId),
]);

export const atosInfracionaisRelations = relations(atosInfracionais, ({ one }) => ({
  processo: one(processos, { fields: [atosInfracionais.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [atosInfracionais.assistidoId], references: [assistidos.id] }),
  comarca: one(comarcas, { fields: [atosInfracionais.comarcaId], references: [comarcas.id] }),
}));

export type AtoInfracional = typeof atosInfracionais.$inferSelect;
export type InsertAtoInfracional = typeof atosInfracionais.$inferInsert;
