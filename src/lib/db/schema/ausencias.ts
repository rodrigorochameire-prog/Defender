import { pgTable, pgEnum, serial, integer, text, date, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./core";

export const ausenciaTipoEnum = pgEnum("ausencia_tipo", ["licenca", "outra_ausencia"]);
export const ausenciaSituacaoEnum = pgEnum("ausencia_situacao", [
  "solicitada", "deferida", "gozada", "indeferida", "cancelada",
]);

export const ausencias = pgTable("ausencias", {
  id: serial("id").primaryKey(),
  defensorId: integer("defensor_id").references(() => users.id).notNull(),
  tipo: ausenciaTipoEnum("tipo").notNull(),
  motivo: text("motivo"),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim").notNull(),
  situacao: ausenciaSituacaoEnum("situacao").default("solicitada").notNull(),
  interrompida: boolean("interrompida").default(false).notNull(),
  suspensa: boolean("suspensa").default(false).notNull(),
  numeroSolicitacao: text("numero_solicitacao"),
  nSiga: text("n_siga"),
  dataPublicacao: date("data_publicacao"),
  observacao: text("observacao"),
  situacaoSiga: text("situacao_siga"),
  sigaSyncedAt: timestamp("siga_synced_at"),
  vidaFuncionalEventoId: integer("vida_funcional_evento_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("ausencias_defensor_situacao_deleted_idx").on(table.defensorId, table.situacao, table.deletedAt),
  index("ausencias_defensor_tipo_data_idx").on(table.defensorId, table.tipo, table.dataInicio),
]);

export type Ausencia = typeof ausencias.$inferSelect;
export type InsertAusencia = typeof ausencias.$inferInsert;
