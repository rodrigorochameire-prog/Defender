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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { areaEnum, tipoPecaProcessualEnum, modeloCategoriaEnum, oficioAnaliseStatusEnum } from "./enums";
import { users, processos, assistidos, demandas } from "./core";
import { casos } from "./casos";

// ==========================================
// DOCUMENTOS (Peças e Anexos)
// ==========================================

export const documentos = pgTable("documentos", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "cascade" }),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "cascade" }),
  demandaId: integer("demanda_id").references(() => demandas.id, { onDelete: "set null" }),
  casoId: integer("caso_id").references(() => casos.id, { onDelete: "set null" }),

  // Workspace

  // Detalhes do documento
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  categoria: varchar("categoria", { length: 50 }).notNull(),
  tipoPeca: varchar("tipo_peca", { length: 100 }),

  // Arquivo
  fileUrl: text("file_url").notNull(),
  fileKey: text("file_key"),
  fileName: varchar("file_name", { length: 255 }),
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size"),

  // Template
  isTemplate: boolean("is_template").default(false),

  // Enrichment Engine
  enrichmentStatus: varchar("enrichment_status", { length: 20 }),
  enrichmentData: jsonb("enrichment_data").$type<{
    document_type?: string;
    sub_type?: string;
    area?: string;
    extracted_data?: Record<string, unknown>;
    confidence?: number;
    markdown_preview?: string;
  }>(),
  enrichedAt: timestamp("enriched_at"),

  // Full Docling markdown content
  conteudoCompleto: text("conteudo_completo"),

  // Metadados
  uploadedById: integer("uploaded_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("documentos_processo_id_idx").on(table.processoId),
  index("documentos_assistido_id_idx").on(table.assistidoId),
  index("documentos_demanda_id_idx").on(table.demandaId),
  index("documentos_caso_id_idx").on(table.casoId),
  index("documentos_categoria_idx").on(table.categoria),
  index("documentos_is_template_idx").on(table.isTemplate),
  index("documentos_enrichment_status_idx").on(table.enrichmentStatus),
]);

export type Documento = typeof documentos.$inferSelect;
export type InsertDocumento = typeof documentos.$inferInsert;

// ==========================================
// TEMPLATES DE PEÇAS (Modelos)
// ==========================================

export const pecaTemplates = pgTable("peca_templates", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 200 }).notNull(),
  descricao: text("descricao"),
  tipoPeca: varchar("tipo_peca", { length: 100 }).notNull(),
  area: areaEnum("area"),

  // Conteúdo
  conteudo: text("conteudo"),
  fileUrl: text("file_url"),

  // Visibilidade
  isPublic: boolean("is_public").default(false),

  // Metadados
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("peca_templates_tipo_peca_idx").on(table.tipoPeca),
  index("peca_templates_area_idx").on(table.area),
  index("peca_templates_is_public_idx").on(table.isPublic),
]);

export type PecaTemplate = typeof pecaTemplates.$inferSelect;
export type InsertPecaTemplate = typeof pecaTemplates.$inferInsert;

// ==========================================
// BANCO DE PEÇAS (Biblioteca Jurídica)
// ==========================================

export const bancoPecas = pgTable("banco_pecas", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),

  // Conteúdo
  conteudoTexto: text("conteudo_texto"),
  arquivoUrl: text("arquivo_url"),
  arquivoKey: text("arquivo_key"),

  // Classificação
  tipoPeca: varchar("tipo_peca", { length: 100 }).notNull(),
  area: areaEnum("area"),
  tags: text("tags"),

  // Resultado
  sucesso: boolean("sucesso"),
  resultadoDescricao: text("resultado_descricao"),

  // Referência
  processoReferencia: text("processo_referencia"),

  // Visibilidade
  isPublic: boolean("is_public").default(true),

  // Metadados
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("banco_pecas_tipo_peca_idx").on(table.tipoPeca),
  index("banco_pecas_area_idx").on(table.area),
  index("banco_pecas_sucesso_idx").on(table.sucesso),
  index("banco_pecas_is_public_idx").on(table.isPublic),
]);

export type BancoPeca = typeof bancoPecas.$inferSelect;
export type InsertBancoPeca = typeof bancoPecas.$inferInsert;

// ==========================================
// PEÇAS PROCESSUAIS ESTRUTURADAS
// ==========================================

export const pecasProcessuais = pgTable("pecas_processuais", {
  id: serial("id").primaryKey(),

  // Relacionamentos
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  assistidoId: integer("assistido_id")
    .references(() => assistidos.id, { onDelete: "set null" }),
  casoId: integer("caso_id")
    .references(() => casos.id, { onDelete: "set null" }),

  // Identificação
  titulo: text("titulo").notNull(),
  tipoPeca: tipoPecaProcessualEnum("tipo_peca").notNull(),
  numeroPaginas: integer("numero_paginas"),
  dataDocumento: date("data_documento"),

  // Arquivo
  driveFileId: varchar("drive_file_id", { length: 100 }),
  arquivoUrl: text("arquivo_url"),
  arquivoKey: text("arquivo_key"),
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size"),

  // Conteúdo extraído
  conteudoTexto: text("conteudo_texto"),
  resumoIA: text("resumo_ia"),
  pontosCriticos: text("pontos_criticos"),

  // Metadados específicos por tipo
  metadados: text("metadados"),

  // Para peças importantes
  isDestaque: boolean("is_destaque").default(false),

  // Ordem de exibição
  ordemExibicao: integer("ordem_exibicao").default(0),

  // Tags
  tags: text("tags"),

  // Observações
  observacoes: text("observacoes"),

  // Metadados
  uploadedById: integer("uploaded_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("pecas_processuais_processo_id_idx").on(table.processoId),
  index("pecas_processuais_assistido_id_idx").on(table.assistidoId),
  index("pecas_processuais_caso_id_idx").on(table.casoId),
  index("pecas_processuais_tipo_peca_idx").on(table.tipoPeca),
  index("pecas_processuais_is_destaque_idx").on(table.isDestaque),
  index("pecas_processuais_drive_file_id_idx").on(table.driveFileId),
]);

export type PecaProcessual = typeof pecasProcessuais.$inferSelect;
export type InsertPecaProcessual = typeof pecasProcessuais.$inferInsert;

// ==========================================
// TEMPLATES DE DOCUMENTOS
// ==========================================

export const documentTemplates = pgTable("document_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),

  // Google Drive file ID
  driveFileId: varchar("drive_file_id", { length: 100 }).notNull(),
  driveFolderId: varchar("drive_folder_id", { length: 100 }),

  // Category
  category: varchar("category", { length: 50 }).notNull(),

  // Placeholders
  placeholders: jsonb("placeholders").$type<string[]>().default([]),

  // Status
  isActive: boolean("is_active").default(true).notNull(),

  // Tracking
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type InsertDocumentTemplate = typeof documentTemplates.$inferInsert;

// ==========================================
// MODELOS DE DOCUMENTOS
// ==========================================

export const documentoModelos = pgTable("documento_modelos", {
  id: serial("id").primaryKey(),

  // Identificacao
  titulo: varchar("titulo", { length: 200 }).notNull(),
  descricao: text("descricao"),
  categoria: modeloCategoriaEnum("categoria").notNull().default("OUTRO"),

  // Conteudo do modelo
  conteudo: text("conteudo").notNull(),

  // Tipo de documento
  tipoPeca: varchar("tipo_peca", { length: 100 }),
  area: areaEnum("area"),

  // Variaveis disponiveis
  variaveis: jsonb("variaveis").$type<{
    nome: string;
    label: string;
    tipo: "texto" | "data" | "numero" | "selecao" | "auto";
    obrigatorio: boolean;
    valorPadrao?: string;
    opcoes?: string[];
    origem?: string;
  }[]>(),

  // Formatacao para exportacao
  formatacao: jsonb("formatacao").$type<{
    fonte?: string;
    tamanhoFonte?: number;
    margens?: { top: number; bottom: number; left: number; right: number };
    espacamento?: number;
    cabecalho?: string;
    rodape?: string;
  }>(),

  // Tags para busca
  tags: jsonb("tags").$type<string[]>(),

  // Visibilidade e controle
  isPublic: boolean("is_public").default(true),
  isAtivo: boolean("is_ativo").default(true),

  // Estatisticas de uso
  totalUsos: integer("total_usos").default(0),

  // Workspace e usuario
  createdById: integer("created_by_id").references(() => users.id),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("documento_modelos_categoria_idx").on(table.categoria),
  index("documento_modelos_tipo_peca_idx").on(table.tipoPeca),
  index("documento_modelos_area_idx").on(table.area),
  index("documento_modelos_is_ativo_idx").on(table.isAtivo),
  index("documento_modelos_deleted_at_idx").on(table.deletedAt),
]);

export type DocumentoModelo = typeof documentoModelos.$inferSelect;
export type InsertDocumentoModelo = typeof documentoModelos.$inferInsert;

// ==========================================
// DOCUMENTOS GERADOS
// ==========================================

export const documentosGerados = pgTable("documentos_gerados", {
  id: serial("id").primaryKey(),

  // Relacionamentos
  modeloId: integer("modelo_id").references(() => documentoModelos.id, { onDelete: "set null" }),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "set null" }),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "set null" }),
  demandaId: integer("demanda_id").references(() => demandas.id, { onDelete: "set null" }),
  casoId: integer("caso_id").references(() => casos.id, { onDelete: "set null" }),

  // Conteudo gerado
  titulo: varchar("titulo", { length: 300 }).notNull(),
  conteudoFinal: text("conteudo_final").notNull(),

  // Valores das variaveis usadas
  valoresVariaveis: jsonb("valores_variaveis").$type<Record<string, string>>(),

  // Se foi gerado/aprimorado por IA
  geradoPorIA: boolean("gerado_por_ia").default(false),
  promptIA: text("prompt_ia"),

  // Exportacao
  googleDocId: text("google_doc_id"),
  googleDocUrl: text("google_doc_url"),
  driveFileId: text("drive_file_id"),

  // Metadata estendido
  metadata: jsonb("metadata").$type<{
    tipoOficio?: string;
    destinatario?: string;
    urgencia?: "normal" | "urgente" | "urgentissimo";
    status?: "rascunho" | "revisao" | "enviado" | "arquivado";
    iaModelo?: string;
    iaRevisao?: {
      modelo: string;
      score: number;
      sugestoes: string[];
    };
    driveSourceId?: string;
    versao?: number;
    exportadoGoogleDocsEm?: string;
  }>(),

  // Workspace e usuario
  createdById: integer("created_by_id").references(() => users.id),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("documentos_gerados_modelo_id_idx").on(table.modeloId),
  index("documentos_gerados_processo_id_idx").on(table.processoId),
  index("documentos_gerados_assistido_id_idx").on(table.assistidoId),
  index("documentos_gerados_caso_id_idx").on(table.casoId),
]);

export type DocumentoGerado = typeof documentosGerados.$inferSelect;
export type InsertDocumentoGerado = typeof documentosGerados.$inferInsert;

// ==========================================
// OFÍCIO ANÁLISES
// ==========================================

export const oficioAnalises = pgTable("oficio_analises", {
  id: serial("id").primaryKey(),

  // Arquivo no Drive
  driveFileId: text("drive_file_id").notNull(),
  driveFileName: text("drive_file_name").notNull(),
  driveFolderId: text("drive_folder_id"),

  // Resultado da análise
  tipoOficio: varchar("tipo_oficio", { length: 100 }),
  destinatarioTipo: varchar("destinatario_tipo", { length: 100 }),
  assunto: text("assunto"),
  estrutura: jsonb("estrutura").$type<{
    saudacao?: string;
    corpo?: string;
    fechamento?: string;
    assinatura?: string;
  }>(),
  variaveisIdentificadas: jsonb("variaveis_identificadas").$type<string[]>(),
  qualidadeScore: integer("qualidade_score"),
  conteudoExtraido: text("conteudo_extraido"),

  // Controle
  modeloGeradoId: integer("modelo_gerado_id").references(() => documentoModelos.id, { onDelete: "set null" }),
  status: oficioAnaliseStatusEnum("status").default("pendente").notNull(),
  erro: text("erro"),

  // Workspace

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("oficio_analises_drive_file_id_idx").on(table.driveFileId),
  index("oficio_analises_tipo_oficio_idx").on(table.tipoOficio),
  index("oficio_analises_status_idx").on(table.status),
]);

export type OficioAnalise = typeof oficioAnalises.$inferSelect;
export type InsertOficioAnalise = typeof oficioAnalises.$inferInsert;

// ==========================================
// RELAÇÕES - Documentos
// ==========================================

export const documentosRelations = relations(documentos, ({ one }) => ({
  processo: one(processos, { fields: [documentos.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [documentos.assistidoId], references: [assistidos.id] }),
  demanda: one(demandas, { fields: [documentos.demandaId], references: [demandas.id] }),
  caso: one(casos, { fields: [documentos.casoId], references: [casos.id] }),
  uploadedBy: one(users, { fields: [documentos.uploadedById], references: [users.id] }),
}));

export const pecaTemplatesRelations = relations(pecaTemplates, ({ one }) => ({
  createdBy: one(users, { fields: [pecaTemplates.createdById], references: [users.id] }),
}));

export const bancoPecasRelations = relations(bancoPecas, ({ one }) => ({
  createdBy: one(users, { fields: [bancoPecas.createdById], references: [users.id] }),
}));

export const pecasProcessuaisRelations = relations(pecasProcessuais, ({ one }) => ({
  processo: one(processos, { fields: [pecasProcessuais.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [pecasProcessuais.assistidoId], references: [assistidos.id] }),
  caso: one(casos, { fields: [pecasProcessuais.casoId], references: [casos.id] }),
  uploadedBy: one(users, { fields: [pecasProcessuais.uploadedById], references: [users.id] }),
}));

export const documentoModelosRelations = relations(documentoModelos, ({ one, many }) => ({
  createdBy: one(users, { fields: [documentoModelos.createdById], references: [users.id] }),
  documentosGerados: many(documentosGerados),
}));

export const documentosGeradosRelations = relations(documentosGerados, ({ one }) => ({
  modelo: one(documentoModelos, { fields: [documentosGerados.modeloId], references: [documentoModelos.id] }),
  processo: one(processos, { fields: [documentosGerados.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [documentosGerados.assistidoId], references: [assistidos.id] }),
  demanda: one(demandas, { fields: [documentosGerados.demandaId], references: [demandas.id] }),
  caso: one(casos, { fields: [documentosGerados.casoId], references: [casos.id] }),
  createdBy: one(users, { fields: [documentosGerados.createdById], references: [users.id] }),
}));

export const oficioAnalisesRelations = relations(oficioAnalises, ({ one }) => ({
  modeloGerado: one(documentoModelos, { fields: [oficioAnalises.modeloGeradoId], references: [documentoModelos.id] }),
}));
