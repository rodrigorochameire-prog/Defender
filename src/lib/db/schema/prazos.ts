import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  date,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { areaDireitoEnum } from "./enums";
import { workspaces, users, demandas } from "./core";

// ==========================================
// SISTEMA DE PRAZOS - CALCULO AUTOMATICO
// ==========================================

// Tipos de ato/peca processual com prazos legais
export const tipoPrazos = pgTable("tipo_prazos", {
  id: serial("id").primaryKey(),

  // Identificacao
  codigo: varchar("codigo", { length: 50 }).notNull().unique(), // Ex: "CONTRARRAZOES_APELACAO"
  nome: varchar("nome", { length: 150 }).notNull(), // Ex: "Contrarrazoes de Apelacao"
  descricao: text("descricao"),

  // Prazo legal base (antes de dobrar para Defensoria)
  prazoLegalDias: integer("prazo_legal_dias").notNull(), // Ex: 8 para contrarrazoes

  // Configuracoes de contagem
  areaDireito: areaDireitoEnum("area_direito").notNull().default("CRIMINAL"),
  contarEmDiasUteis: boolean("contar_em_dias_uteis").default(false), // Criminal = false, Civel = true
  aplicarDobroDefensoria: boolean("aplicar_dobro_defensoria").default(true), // Art. 186 CPC / LC 80/94
  tempoLeituraDias: integer("tempo_leitura_dias").default(10), // Dias da expedicao ate abertura

  // Termo inicial
  termoInicial: varchar("termo_inicial", { length: 50 }).default("INTIMACAO"), // INTIMACAO | PUBLICACAO | AUDIENCIA | CIENCIA

  // Categorizacao
  categoria: varchar("categoria", { length: 50 }), // RECURSO | MANIFESTACAO | PETICAO | AUDIENCIA
  fase: varchar("fase", { length: 50 }), // INQUERITO | INSTRUCAO | RECURSO | EXECUCAO

  // Ativo/Inativo
  isActive: boolean("is_active").default(true),

  // Workspace (opcional - pode ser global)
  workspaceId: integer("workspace_id").references(() => workspaces.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("tipo_prazos_codigo_idx").on(table.codigo),
  index("tipo_prazos_area_direito_idx").on(table.areaDireito),
  index("tipo_prazos_categoria_idx").on(table.categoria),
  index("tipo_prazos_workspace_id_idx").on(table.workspaceId),
]);

export type TipoPrazo = typeof tipoPrazos.$inferSelect;
export type InsertTipoPrazo = typeof tipoPrazos.$inferInsert;

// Feriados forenses (suspensao de prazos)
export const feriadosForenses = pgTable("feriados_forenses", {
  id: serial("id").primaryKey(),

  // Data do feriado
  data: date("data").notNull(),

  // Identificacao
  nome: varchar("nome", { length: 150 }).notNull(), // Ex: "Natal", "Recesso Forense"
  tipo: varchar("tipo", { length: 30 }).notNull().default("FERIADO"), // FERIADO | PONTO_FACULTATIVO | RECESSO | SUSPENSAO

  // Abrangencia
  abrangencia: varchar("abrangencia", { length: 30 }).default("NACIONAL"), // NACIONAL | ESTADUAL | MUNICIPAL | TRIBUNAL
  estado: varchar("estado", { length: 2 }), // BA, SP, etc (se estadual)
  comarca: varchar("comarca", { length: 100 }), // Se municipal
  tribunal: varchar("tribunal", { length: 20 }), // STF, STJ, TJBA (se especifico)

  // Efeito no prazo
  suspendePrazo: boolean("suspende_prazo").default(true), // Se suspende contagem
  apenasExpediente: boolean("apenas_expediente").default(false), // So afeta expediente, nao prazo

  // Periodo (para recessos)
  dataFim: date("data_fim"), // Se for periodo (ex: recesso 20/12 a 06/01)

  // Workspace (opcional - pode ser global)
  workspaceId: integer("workspace_id").references(() => workspaces.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("feriados_forenses_data_idx").on(table.data),
  index("feriados_forenses_tipo_idx").on(table.tipo),
  index("feriados_forenses_abrangencia_idx").on(table.abrangencia),
  index("feriados_forenses_estado_idx").on(table.estado),
  index("feriados_forenses_tribunal_idx").on(table.tribunal),
  index("feriados_forenses_workspace_id_idx").on(table.workspaceId),
]);

export type FeriadoForense = typeof feriadosForenses.$inferSelect;
export type InsertFeriadoForense = typeof feriadosForenses.$inferInsert;

// Historico de calculos de prazo (auditoria)
export const calculosPrazos = pgTable("calculos_prazos", {
  id: serial("id").primaryKey(),

  // Vinculo com demanda
  demandaId: integer("demanda_id").references(() => demandas.id, { onDelete: "cascade" }),

  // Tipo de prazo utilizado
  tipoPrazoId: integer("tipo_prazo_id").references(() => tipoPrazos.id),
  tipoPrazoCodigo: varchar("tipo_prazo_codigo", { length: 50 }), // Snapshot do codigo

  // Datas do calculo
  dataExpedicao: date("data_expedicao"), // Data que intimacao foi expedida
  dataLeitura: date("data_leitura"), // Data da leitura/abertura (+10 dias ou manual)
  dataTermoInicial: date("data_termo_inicial"), // Data que prazo comeca a correr
  dataTermoFinal: date("data_termo_final").notNull(), // Prazo fatal calculado

  // Parametros do calculo
  prazoBaseDias: integer("prazo_base_dias").notNull(), // Prazo original
  prazoComDobroDias: integer("prazo_com_dobro_dias").notNull(), // Prazo dobrado
  diasUteisSuspensos: integer("dias_uteis_suspensos").default(0), // Feriados/recessos
  areaDireito: varchar("area_direito", { length: 20 }), // CRIMINAL | CIVEL
  contadoEmDiasUteis: boolean("contado_em_dias_uteis").default(false),
  aplicouDobro: boolean("aplicou_dobro").default(true),
  tempoLeituraAplicado: integer("tempo_leitura_aplicado").default(10),

  // Observacoes
  observacoes: text("observacoes"),
  calculoManual: boolean("calculo_manual").default(false), // Se foi ajustado manualmente

  // Workspace
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  calculadoPorId: integer("calculado_por_id").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("calculos_prazos_demanda_id_idx").on(table.demandaId),
  index("calculos_prazos_tipo_prazo_id_idx").on(table.tipoPrazoId),
  index("calculos_prazos_data_termo_final_idx").on(table.dataTermoFinal),
  index("calculos_prazos_workspace_id_idx").on(table.workspaceId),
]);

export type CalculoPrazo = typeof calculosPrazos.$inferSelect;
export type InsertCalculoPrazo = typeof calculosPrazos.$inferInsert;

// ==========================================
// RELACOES - Prazos
// ==========================================

export const tipoPrazosRelations = relations(tipoPrazos, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [tipoPrazos.workspaceId], references: [workspaces.id] }),
  calculos: many(calculosPrazos),
}));

export const feriadosForensesRelations = relations(feriadosForenses, ({ one }) => ({
  workspace: one(workspaces, { fields: [feriadosForenses.workspaceId], references: [workspaces.id] }),
}));

export const calculosPrazosRelations = relations(calculosPrazos, ({ one }) => ({
  demanda: one(demandas, { fields: [calculosPrazos.demandaId], references: [demandas.id] }),
  tipoPrazo: one(tipoPrazos, { fields: [calculosPrazos.tipoPrazoId], references: [tipoPrazos.id] }),
  workspace: one(workspaces, { fields: [calculosPrazos.workspaceId], references: [workspaces.id] }),
  calculadoPor: one(users, { fields: [calculosPrazos.calculadoPorId], references: [users.id] }),
}));
