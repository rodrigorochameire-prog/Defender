import {
  pgTable, serial, text, varchar, boolean, timestamp,
  integer, date, jsonb, numeric, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { processos, assistidos, users } from "./core";
import { comarcas } from "./comarcas";

export const institutos = pgTable("institutos", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "cascade" }).notNull(),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "cascade" }).notNull(),
  tipo: varchar("tipo", { length: 30 }).notNull(),
  status: varchar("status", { length: 30 }).notNull().default("PROPOSTO"),
  condicoes: jsonb("condicoes").$type<string[]>(),
  dataAcordo: date("data_acordo"),
  dataInicio: date("data_inicio"),
  dataFim: date("data_fim"),
  prazoMeses: integer("prazo_meses"),
  audienciaHomologacaoId: integer("audiencia_homologacao_id"),
  audienciaAdmonitoriaId: integer("audiencia_admonitoria_id"),
  valorPrestacao: numeric("valor_prestacao"),
  horasServico: integer("horas_servico"),
  observacoes: text("observacoes"),
  defensorId: integer("defensor_id").references(() => users.id),
  comarcaId: integer("comarca_id").references(() => comarcas.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("institutos_processo_idx").on(table.processoId),
  index("institutos_assistido_idx").on(table.assistidoId),
  index("institutos_defensor_idx").on(table.defensorId),
  index("institutos_status_idx").on(table.status),
  index("institutos_tipo_idx").on(table.tipo),
  index("institutos_comarca_idx").on(table.comarcaId),
]);

export const institutosRelations = relations(institutos, ({ one }) => ({
  processo: one(processos, { fields: [institutos.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [institutos.assistidoId], references: [assistidos.id] }),
  defensor: one(users, { fields: [institutos.defensorId], references: [users.id] }),
  comarca: one(comarcas, { fields: [institutos.comarcaId], references: [comarcas.id] }),
}));

export type Instituto = typeof institutos.$inferSelect;
export type InsertInstituto = typeof institutos.$inferInsert;
