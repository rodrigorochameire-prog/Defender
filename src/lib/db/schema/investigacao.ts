import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  index,
  uniqueIndex,
  jsonb,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { relations } from "drizzle-orm";
import { diligenciaStatusEnum, diligenciaTipoEnum, prioridadeEnum } from "./enums";
import { users, processos, assistidos, demandas } from "./core";
import { casos, casePersonas } from "./casos";

// ==========================================
// DILIGÊNCIAS INVESTIGATIVAS
// ==========================================

export const diligencias = pgTable("diligencias", {
  id: serial("id").primaryKey(),

  // Identificação
  titulo: varchar("titulo", { length: 300 }).notNull(),
  descricao: text("descricao"),

  // Tipo e Status
  tipo: diligenciaTipoEnum("tipo").notNull().default("OUTRO"),
  status: diligenciaStatusEnum("status").notNull().default("A_PESQUISAR"),

  // Vinculação
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "cascade" }),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "cascade" }),
  casoId: integer("caso_id").references(() => casos.id, { onDelete: "cascade" }),
  personaId: integer("persona_id").references(() => casePersonas.id, { onDelete: "set null" }),

  // Detalhes da pessoa/objeto alvo
  nomePessoaAlvo: varchar("nome_pessoa_alvo", { length: 200 }),
  tipoRelacao: varchar("tipo_relacao", { length: 50 }),
  cpfAlvo: varchar("cpf_alvo", { length: 14 }),
  enderecoAlvo: text("endereco_alvo"),
  telefoneAlvo: varchar("telefone_alvo", { length: 20 }),

  // Resultado e acompanhamento
  resultado: text("resultado"),
  dataConclusao: timestamp("data_conclusao"),
  prazoEstimado: timestamp("prazo_estimado"),
  prioridade: prioridadeEnum("prioridade").default("NORMAL"),

  // Links de pesquisa OSINT
  linksOsint: jsonb("links_osint").$type<{
    jusbrasil?: string;
    escavador?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
    outros?: string[];
  }>(),

  // Documentos anexados
  documentos: jsonb("documentos").$type<{
    nome: string;
    url: string;
    tipo: string;
    dataUpload: string;
  }[]>(),

  // Notas de acompanhamento
  historico: jsonb("historico").$type<{
    data: string;
    acao: string;
    descricao: string;
    userId?: number;
  }[]>(),

  // Tags
  tags: jsonb("tags").$type<string[]>(),

  // Sugestão automática
  isSugestaoAutomatica: boolean("is_sugestao_automatica").default(false),
  sugestaoOrigem: varchar("sugestao_origem", { length: 100 }),

  // Workspace e controle
  defensorId: integer("defensor_id").references(() => users.id),
  criadoPorId: integer("criado_por_id").references(() => users.id).notNull(),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("diligencias_processo_id_idx").on(table.processoId),
  index("diligencias_assistido_id_idx").on(table.assistidoId),
  index("diligencias_caso_id_idx").on(table.casoId),
  index("diligencias_status_idx").on(table.status),
  index("diligencias_tipo_idx").on(table.tipo),
  index("diligencias_defensor_id_idx").on(table.defensorId),
  index("diligencias_deleted_at_idx").on(table.deletedAt),
  index("diligencias_prioridade_idx").on(table.prioridade),
]);

export type Diligencia = typeof diligencias.$inferSelect;
export type InsertDiligencia = typeof diligencias.$inferInsert;

// ==========================================
// TEMPLATES DE DILIGÊNCIAS
// ==========================================

export const diligenciaTemplates = pgTable("diligencia_templates", {
  id: serial("id").primaryKey(),

  // Identificação
  nome: varchar("nome", { length: 200 }).notNull(),
  descricao: text("descricao"),

  // Tipo de diligência
  tipo: diligenciaTipoEnum("tipo").notNull(),

  // Quando sugerir
  aplicavelA: jsonb("aplicavel_a").$type<{
    areas?: string[];
    fases?: string[];
    tiposCrime?: string[];
    tags?: string[];
  }>(),

  // Template de conteúdo
  tituloTemplate: varchar("titulo_template", { length: 300 }).notNull(),
  descricaoTemplate: text("descricao_template"),
  checklistItens: jsonb("checklist_itens").$type<string[]>(),

  // Prioridade sugerida
  prioridadeSugerida: prioridadeEnum("prioridade_sugerida").default("NORMAL"),
  prazoSugeridoDias: integer("prazo_sugerido_dias"),

  // Ordem de exibição
  ordem: integer("ordem").default(0),
  ativo: boolean("ativo").default(true),

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("diligencia_templates_tipo_idx").on(table.tipo),
  index("diligencia_templates_ativo_idx").on(table.ativo),
]);

export type DiligenciaTemplate = typeof diligenciaTemplates.$inferSelect;
export type InsertDiligenciaTemplate = typeof diligenciaTemplates.$inferInsert;

// ==========================================
// ANOTAÇÕES (Log de Providências)
// ==========================================

export const anotacoes = pgTable("anotacoes", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "cascade" }),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "cascade" }),
  demandaId: integer("demanda_id").references(() => demandas.id, { onDelete: "set null" }),
  casoId: integer("caso_id").references(() => casos.id, { onDelete: "set null" }),

  // Conteúdo
  conteudo: text("conteudo").notNull(),
  tipo: varchar("tipo", { length: 30 }).default("nota"),

  // Prioridade
  importante: boolean("importante").default(false),

  // Deduplicação
  conteudoHash: varchar("conteudo_hash", { length: 16 }),

  // Sync Solar
  solarSyncedAt: timestamp("solar_synced_at"),
  solarFaseId: varchar("solar_fase_id", { length: 50 }),

  // Metadados
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("anotacoes_processo_id_idx").on(table.processoId),
  index("anotacoes_assistido_id_idx").on(table.assistidoId),
  index("anotacoes_demanda_id_idx").on(table.demandaId),
  index("anotacoes_caso_id_idx").on(table.casoId),
  index("anotacoes_tipo_idx").on(table.tipo),
  index("anotacoes_importante_idx").on(table.importante),
  uniqueIndex("anotacoes_dedup_hash_idx")
    .on(table.assistidoId, table.conteudoHash)
    .where(sql`conteudo_hash IS NOT NULL`),
]);

export type Anotacao = typeof anotacoes.$inferSelect;
export type InsertAnotacao = typeof anotacoes.$inferInsert;

// ==========================================
// MOVIMENTAÇÕES PROCESSUAIS
// ==========================================

export const movimentacoes = pgTable("movimentacoes", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),

  // Detalhes
  dataMovimentacao: timestamp("data_movimentacao").notNull(),
  descricao: text("descricao").notNull(),
  tipo: varchar("tipo", { length: 50 }),

  // Origem
  origem: varchar("origem", { length: 20 }).default("manual"),

  // Metadados
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("movimentacoes_processo_id_idx").on(table.processoId),
  index("movimentacoes_data_idx").on(table.dataMovimentacao),
  index("movimentacoes_tipo_idx").on(table.tipo),
]);

export type Movimentacao = typeof movimentacoes.$inferSelect;
export type InsertMovimentacao = typeof movimentacoes.$inferInsert;

// ==========================================
// RELAÇÕES - Investigacao
// ==========================================

export const diligenciasRelations = relations(diligencias, ({ one }) => ({
  processo: one(processos, { fields: [diligencias.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [diligencias.assistidoId], references: [assistidos.id] }),
  caso: one(casos, { fields: [diligencias.casoId], references: [casos.id] }),
  persona: one(casePersonas, { fields: [diligencias.personaId], references: [casePersonas.id] }),
  defensor: one(users, { fields: [diligencias.defensorId], references: [users.id] }),
  criadoPor: one(users, { fields: [diligencias.criadoPorId], references: [users.id] }),
}));

export const anotacoesRelations = relations(anotacoes, ({ one }) => ({
  processo: one(processos, { fields: [anotacoes.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [anotacoes.assistidoId], references: [assistidos.id] }),
  demanda: one(demandas, { fields: [anotacoes.demandaId], references: [demandas.id] }),
  caso: one(casos, { fields: [anotacoes.casoId], references: [casos.id] }),
  createdBy: one(users, { fields: [anotacoes.createdById], references: [users.id] }),
}));

export const movimentacoesRelations = relations(movimentacoes, ({ one }) => ({
  processo: one(processos, { fields: [movimentacoes.processoId], references: [processos.id] }),
  createdBy: one(users, { fields: [movimentacoes.createdById], references: [users.id] }),
}));
