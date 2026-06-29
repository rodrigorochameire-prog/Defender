import { pgTable, pgEnum, serial, integer, text, date, boolean, bigint, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./core";

export const feriasStatusEnum = pgEnum("ferias_status", [
  "programada", "homologada", "em_fruicao", "concluida", "cancelada",
]);

export const feriasPeriodos = pgTable("ferias_periodos", {
  id: serial("id").primaryKey(),
  defensorId: integer("defensor_id").references(() => users.id).notNull(),
  aquisitivoInicio: date("aquisitivo_inicio").notNull(),
  aquisitivoFim: date("aquisitivo_fim").notNull(),
  diasDireito: integer("dias_direito").default(30).notNull(),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => [
  index("ferias_periodos_defensor_deleted_idx").on(t.defensorId, t.deletedAt),
]);

export const feriasParcelas = pgTable("ferias_parcelas", {
  id: serial("id").primaryKey(),
  periodoId: integer("periodo_id").references(() => feriasPeriodos.id).notNull(),
  defensorId: integer("defensor_id").references(() => users.id).notNull(),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim").notNull(),
  status: feriasStatusEnum("status").default("programada").notNull(),
  substitutoId: integer("substituto_id").references(() => users.id),
  afastamentoId: integer("afastamento_id"),
  vidaFuncionalEventoId: integer("vida_funcional_evento_id"),
  seiProtocolo: text("sei_protocolo"),
  observacoes: text("observacoes"),
  numeroSolicitacao: text("numero_solicitacao"),
  nSiga: text("n_siga"),
  provimento: text("provimento"),
  dataPublicacao: date("data_publicacao"),
  conversaoPecunia: boolean("conversao_pecunia").default(false).notNull(),
  valorAbonoCents: bigint("valor_abono_cents", { mode: "number" }),
  suspensa: boolean("suspensa").default(false).notNull(),
  situacaoSiga: text("situacao_siga"),
  sigaSyncedAt: timestamp("siga_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (t) => [
  index("ferias_parcelas_periodo_idx").on(t.periodoId),
  index("ferias_parcelas_defensor_status_deleted_idx").on(t.defensorId, t.status, t.deletedAt),
]);

export type FeriasPeriodo = typeof feriasPeriodos.$inferSelect;
export type FeriasParcela = typeof feriasParcelas.$inferSelect;
export type InsertFeriasPeriodo = typeof feriasPeriodos.$inferInsert;
export type InsertFeriasParcela = typeof feriasParcelas.$inferInsert;
