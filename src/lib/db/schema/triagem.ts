import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users, demandas } from "./core";

export const atendimentosTriagem = pgTable("atendimentos_triagem", {
  id: serial("id").primaryKey(),
  tccRef: varchar("tcc_ref", { length: 20 }).notNull().unique(),
  area: varchar("area", { length: 20 }).notNull(),
  workspaceId: integer("workspace_id"),
  defensorAlvoId: integer("defensor_alvo_id").references(() => users.id),

  assistidoNome: text("assistido_nome").notNull(),
  assistidoTelefone: varchar("assistido_telefone", { length: 30 }),
  assistidoCpf: varchar("assistido_cpf", { length: 14 }),

  compareceu: varchar("compareceu", { length: 20 }).notNull().default("proprio"),
  familiarNome: text("familiar_nome"),
  familiarTelefone: varchar("familiar_telefone", { length: 30 }),
  familiarGrau: varchar("familiar_grau", { length: 30 }),

  processoCnj: varchar("processo_cnj", { length: 25 }),
  situacao: varchar("situacao", { length: 50 }),
  vara: varchar("vara", { length: 30 }),

  urgencia: boolean("urgencia").notNull().default(false),
  urgenciaMotivo: varchar("urgencia_motivo", { length: 50 }),

  documentoEntregue: varchar("documento_entregue", { length: 50 }).default("Nenhum"),
  demandaLivre: text("demanda_livre"),

  status: varchar("status", { length: 30 }).notNull().default("pendente_avaliacao"),
  promovidoParaDemandaId: integer("promovido_para_demanda_id").references(() => demandas.id),
  delegadoPara: varchar("delegado_para", { length: 30 }),
  motivoDevolucao: text("motivo_devolucao"),
  motivoOverride: text("motivo_override"),

  protocoloSolar: varchar("protocolo_solar", { length: 50 }),

  metadata: jsonb("metadata").$type<Record<string, unknown>>(),

  criadoPorAppsScript: varchar("criado_por_apps_script", { length: 100 }),
  abaPlanilha: varchar("aba_planilha", { length: 20 }),
  linhaPlanilha: integer("linha_planilha"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  decididoEm: timestamp("decidido_em"),
  decididoPorId: integer("decidido_por_id").references(() => users.id),
}, (table) => [
  index("triagem_status_idx").on(table.status),
  index("triagem_defensor_alvo_idx").on(table.defensorAlvoId),
  index("triagem_area_idx").on(table.area),
  index("triagem_urgencia_idx").on(table.urgencia),
  index("triagem_created_at_idx").on(table.createdAt),
  index("triagem_processo_cnj_idx").on(table.processoCnj),
  index("triagem_promovido_demanda_idx").on(table.promovidoParaDemandaId),
  index("triagem_workspace_id_idx").on(table.workspaceId),
]);

export type AtendimentoTriagem = typeof atendimentosTriagem.$inferSelect;
export type InsertAtendimentoTriagem = typeof atendimentosTriagem.$inferInsert;

export const atendimentosTriagemRelations = relations(atendimentosTriagem, ({ one }) => ({
  defensorAlvo: one(users, {
    fields: [atendimentosTriagem.defensorAlvoId],
    references: [users.id],
    relationName: "defensorAlvo",
  }),
  decididoPor: one(users, {
    fields: [atendimentosTriagem.decididoPorId],
    references: [users.id],
    relationName: "decididoPor",
  }),
  promovidoParaDemanda: one(demandas, {
    fields: [atendimentosTriagem.promovidoParaDemandaId],
    references: [demandas.id],
  }),
}));
