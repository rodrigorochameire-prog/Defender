import {
  pgTable, serial, text, varchar, boolean, timestamp,
  integer, date, jsonb, numeric, index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { processos, assistidos, users } from "./core";
import { comarcas } from "./comarcas";

export const medidasSocioeducativas = pgTable("medidas_socioeducativas", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "cascade" }).notNull(),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "cascade" }).notNull(),

  // Tipo da medida (art. 112 ECA)
  tipo: varchar("tipo", { length: 30 }).notNull(),
    // ADVERTENCIA, REPARACAO_DANO, PSC (prestação de serviços),
    // LIBERDADE_ASSISTIDA, SEMILIBERDADE, INTERNACAO, INTERNACAO_PROVISORIA

  // Status
  status: varchar("status", { length: 30 }).notNull().default("APLICADA"),
    // APLICADA, EM_CUMPRIMENTO, CUMPRIDA, DESCUMPRIDA,
    // SUBSTITUIDA, REVOGADA, EXTINTA, PROGRESSAO

  // Prazos
  dataAplicacao: date("data_aplicacao"),
  dataInicio: date("data_inicio"),
  dataFim: date("data_fim"),
  prazoMeses: integer("prazo_meses"),
  prazoMaximoMeses: integer("prazo_maximo_meses"), // internação: max 3 anos

  // Reavaliação (art. 121 §2º ECA — max 6 meses para internação)
  dataProximaReavaliacao: date("data_proxima_reavaliacao"),

  // Local (para internação/semiliberdade)
  unidadeExecucao: varchar("unidade_execucao", { length: 200 }),

  // Condições (para LA/PSC)
  condicoes: jsonb("condicoes").$type<string[]>(),
  horasServico: integer("horas_servico"), // PSC

  // Progressão/Regressão
  medidaAnteriorId: integer("medida_anterior_id"), // se substituiu outra medida
  motivoSubstituicao: text("motivo_substituicao"),

  observacoes: text("observacoes"),
  defensorId: integer("defensor_id").references(() => users.id),
  comarcaId: integer("comarca_id").references(() => comarcas.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("medidas_socio_processo_idx").on(table.processoId),
  index("medidas_socio_assistido_idx").on(table.assistidoId),
  index("medidas_socio_tipo_idx").on(table.tipo),
  index("medidas_socio_status_idx").on(table.status),
  index("medidas_socio_defensor_idx").on(table.defensorId),
  index("medidas_socio_comarca_idx").on(table.comarcaId),
  index("medidas_socio_reavaliacao_idx").on(table.dataProximaReavaliacao),
]);

export const medidasSocioeducativasRelations = relations(medidasSocioeducativas, ({ one }) => ({
  processo: one(processos, { fields: [medidasSocioeducativas.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [medidasSocioeducativas.assistidoId], references: [assistidos.id] }),
  defensor: one(users, { fields: [medidasSocioeducativas.defensorId], references: [users.id] }),
  comarca: one(comarcas, { fields: [medidasSocioeducativas.comarcaId], references: [comarcas.id] }),
}));

export type MedidaSocioeducativa = typeof medidasSocioeducativas.$inferSelect;
export type InsertMedidaSocioeducativa = typeof medidasSocioeducativas.$inferInsert;
