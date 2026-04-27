import { pgTable, serial, integer, varchar, text, numeric, timestamp, date } from "drizzle-orm/pg-core";
import { processos } from "./core";
import { pessoas } from "./pessoas";

export const objetosApreendidos = pgTable("objetos_apreendidos", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  tipo: varchar("tipo", { length: 60 }).notNull(),
  descricao: text("descricao").notNull(),
  marca: varchar("marca", { length: 80 }),
  modelo: varchar("modelo", { length: 80 }),
  numeroSerie: varchar("numero_serie", { length: 80 }),
  quantidade: numeric("quantidade", { precision: 10, scale: 2 }),
  unidade: varchar("unidade", { length: 20 }),
  observacoes: text("observacoes"),
  fonteCriacao: varchar("fonte_criacao", { length: 40 }),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).default("0.9"),
  mergedInto: integer("merged_into"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const participacoesObjeto = pgTable("participacoes_objeto", {
  id: serial("id").primaryKey(),
  objetoId: integer("objeto_id").notNull().references(() => objetosApreendidos.id),
  processoId: integer("processo_id").references(() => processos.id),
  pessoaId: integer("pessoa_id").references(() => pessoas.id),
  papel: varchar("papel", { length: 40 }),
  dataApreensao: date("data_apreensao"),
  localApreensao: varchar("local_apreensao", { length: 200 }),
  fonte: varchar("fonte", { length: 30 }).notNull().default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
