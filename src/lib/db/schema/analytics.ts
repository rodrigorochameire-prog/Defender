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
  jsonb,
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { atribuicaoEnum, analysisTypeEnum, tipoAnaliseIAEnum } from "./enums";
import { users, processos, assistidos } from "./core";
import { casos } from "./casos";
import { pecasProcessuais } from "./documentos";

// ==========================================
// LOGS DE ATIVIDADE (Auditoria)
// ==========================================

export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  acao: varchar("acao", { length: 20 }).notNull(),
  entidadeTipo: varchar("entidade_tipo", { length: 30 }).notNull(),
  entidadeId: integer("entidade_id"),
  descricao: text("descricao"),
  detalhes: jsonb("detalhes"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("activity_logs_user_idx").on(table.userId),
  index("activity_logs_entidade_idx").on(table.entidadeTipo, table.entidadeId),
  index("activity_logs_acao_idx").on(table.acao),
  index("activity_logs_created_idx").on(table.createdAt),
]);

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;

// ==========================================
// ANÁLISES GERADAS POR AGENTES IA
// ==========================================

export const agentAnalyses = pgTable("agent_analyses", {
  id: serial("id").primaryKey(),

  // Entidade analisada
  entityType: varchar("entity_type", { length: 50 }).notNull(),
  entityId: integer("entity_id").notNull(),

  // Tipo de análise
  analysisType: analysisTypeEnum("analysis_type").notNull(),
  atribuicao: atribuicaoEnum("atribuicao"),

  // Documentos de entrada
  inputDocumentIds: jsonb("input_document_ids"),
  inputSummary: text("input_summary"),

  // Resultado estruturado
  output: jsonb("output").notNull(),

  // Métricas de qualidade
  confidence: real("confidence"),
  completeness: real("completeness"),

  // Metadados do modelo
  modelUsed: varchar("model_used", { length: 100 }),
  tokensInput: integer("tokens_input"),
  tokensOutput: integer("tokens_output"),
  processingTimeMs: integer("processing_time_ms"),

  // Quem solicitou
  requestedById: integer("requested_by_id").references(() => users.id),

  // Status
  isApproved: boolean("is_approved"),
  approvedAt: timestamp("approved_at"),
  approvedById: integer("approved_by_id").references(() => users.id),

  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("agent_analyses_entity_idx").on(table.entityType, table.entityId),
  index("agent_analyses_analysis_type_idx").on(table.analysisType),
  index("agent_analyses_atribuicao_idx").on(table.atribuicao),
  index("agent_analyses_created_at_idx").on(table.createdAt),
  index("agent_analyses_is_approved_idx").on(table.isApproved),
]);

export type AgentAnalysis = typeof agentAnalyses.$inferSelect;
export type InsertAgentAnalysis = typeof agentAnalyses.$inferInsert;

// ==========================================
// EMBEDDINGS (pgvector semantic search)
// ==========================================

export const embeddings = pgTable("embeddings", {
  id: serial("id").primaryKey(),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "set null" }),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "set null" }),
  chunkIndex: integer("chunk_index").default(0),
  contentText: text("content_text").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Embedding = typeof embeddings.$inferSelect;
export type InsertEmbedding = typeof embeddings.$inferInsert;

// ==========================================
// ANÁLISES DE IA (GEMINI)
// ==========================================

export const analisesIA = pgTable("analises_ia", {
  id: serial("id").primaryKey(),

  // Relacionamentos
  processoId: integer("processo_id")
    .references(() => processos.id, { onDelete: "cascade" }),
  assistidoId: integer("assistido_id")
    .references(() => assistidos.id, { onDelete: "cascade" }),
  casoId: integer("caso_id")
    .references(() => casos.id, { onDelete: "cascade" }),
  pecaId: integer("peca_id")
    .references(() => pecasProcessuais.id, { onDelete: "set null" }),

  // Tipo de análise
  tipoAnalise: tipoAnaliseIAEnum("tipo_analise").notNull(),
  titulo: text("titulo").notNull(),

  // Prompt e resposta
  promptUtilizado: text("prompt_utilizado"),
  conteudo: text("conteudo").notNull(),

  // Dados estruturados extraídos
  dadosEstruturados: text("dados_estruturados"),

  // Score de confiança (0-100)
  scoreConfianca: integer("score_confianca"),

  // Modelo utilizado
  modeloIA: varchar("modelo_ia", { length: 50 }).default("gemini-pro"),
  tokensUtilizados: integer("tokens_utilizados"),

  // Feedback do usuário
  feedbackPositivo: boolean("feedback_positivo"),
  feedbackComentario: text("feedback_comentario"),

  // Status
  isArquivado: boolean("is_arquivado").default(false),
  isFavorito: boolean("is_favorito").default(false),

  // Metadados
  criadoPorId: integer("criado_por_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("analises_ia_processo_id_idx").on(table.processoId),
  index("analises_ia_assistido_id_idx").on(table.assistidoId),
  index("analises_ia_caso_id_idx").on(table.casoId),
  index("analises_ia_peca_id_idx").on(table.pecaId),
  index("analises_ia_tipo_analise_idx").on(table.tipoAnalise),
  index("analises_ia_is_favorito_idx").on(table.isFavorito),
]);

export type AnaliseIA = typeof analisesIA.$inferSelect;
export type InsertAnaliseIA = typeof analisesIA.$inferInsert;

// ==========================================
// CALCULADORA DE PENA/PRESCRIÇÃO
// ==========================================

export const calculosPena = pgTable("calculos_pena", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "cascade" }),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "cascade" }),

  // Tipo de cálculo
  tipoCalculo: varchar("tipo_calculo", { length: 30 }).notNull(),

  // Dados base
  penaTotal: integer("pena_total"),
  dataInicio: date("data_inicio"),
  regime: varchar("regime", { length: 20 }),

  // Resultados
  dataResultado: date("data_resultado"),
  observacoes: text("observacoes"),

  // Parâmetros do cálculo
  parametros: text("parametros"),

  // Metadados
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("calculos_pena_processo_id_idx").on(table.processoId),
  index("calculos_pena_assistido_id_idx").on(table.assistidoId),
  index("calculos_pena_tipo_idx").on(table.tipoCalculo),
]);

export type CalculoPena = typeof calculosPena.$inferSelect;
export type InsertCalculoPena = typeof calculosPena.$inferInsert;

// ==========================================
// MÓDULO EP - CÁLCULO SEEU (BENEFÍCIOS)
// ==========================================

export const calculosSEEU = pgTable("calculos_seeu", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  assistidoId: integer("assistido_id")
    .references(() => assistidos.id, { onDelete: "set null" }),

  // Dados Base
  dataBase: date("data_base").notNull(),
  penaTotal: integer("pena_total").notNull(),
  regimeInicial: varchar("regime_inicial", { length: 20 }),

  // Frações de progressão
  fracaoProgressao: varchar("fracao_progressao", { length: 20 }),
  fracaoLivramento: varchar("fracao_livramento", { length: 20 }),

  // Datas calculadas
  dataProgressao: date("data_progressao"),
  dataLivramento: date("data_livramento"),
  dataTermino: date("data_termino"),
  dataSaida: date("data_saida"),

  // Remição
  diasRemidos: integer("dias_remidos").default(0),
  diasTrabalho: integer("dias_trabalho").default(0),
  diasEstudo: integer("dias_estudo").default(0),

  // Crime hediondo
  isHediondo: boolean("is_hediondo").default(false),
  isPrimario: boolean("is_primario").default(true),

  // Status do benefício
  statusProgressao: varchar("status_progressao", { length: 30 }),
  statusLivramento: varchar("status_livramento", { length: 30 }),

  // Observações
  observacoes: text("observacoes"),

  // Metadados
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("calculos_seeu_processo_id_idx").on(table.processoId),
  index("calculos_seeu_assistido_id_idx").on(table.assistidoId),
  index("calculos_seeu_data_progressao_idx").on(table.dataProgressao),
  index("calculos_seeu_data_livramento_idx").on(table.dataLivramento),
]);

export type CalculoSEEU = typeof calculosSEEU.$inferSelect;
export type InsertCalculoSEEU = typeof calculosSEEU.$inferInsert;

// ==========================================
// RELAÇÕES - Analytics
// ==========================================

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, { fields: [activityLogs.userId], references: [users.id] }),
}));

export const agentAnalysesRelations = relations(agentAnalyses, ({ one }) => ({
  requestedBy: one(users, { fields: [agentAnalyses.requestedById], references: [users.id] }),
  approvedBy: one(users, { fields: [agentAnalyses.approvedById], references: [users.id] }),
}));

export const analisesIARelations = relations(analisesIA, ({ one }) => ({
  processo: one(processos, { fields: [analisesIA.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [analisesIA.assistidoId], references: [assistidos.id] }),
  caso: one(casos, { fields: [analisesIA.casoId], references: [casos.id] }),
  peca: one(pecasProcessuais, { fields: [analisesIA.pecaId], references: [pecasProcessuais.id] }),
  criadoPor: one(users, { fields: [analisesIA.criadoPorId], references: [users.id] }),
}));

export const calculosPenaRelations = relations(calculosPena, ({ one }) => ({
  processo: one(processos, { fields: [calculosPena.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [calculosPena.assistidoId], references: [assistidos.id] }),
  createdBy: one(users, { fields: [calculosPena.createdById], references: [users.id] }),
}));
