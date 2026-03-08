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
  real,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { extractionStatusEnum } from "./enums";
import { workspaces, users, processos, assistidos } from "./core";
import { documentos } from "./documentos";

// ==========================================
// SINCRONIZAÇÃO GOOGLE DRIVE - PASTAS
// ==========================================

export const driveSyncFolders = pgTable("drive_sync_folders", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  driveFolderId: varchar("drive_folder_id", { length: 100 }).notNull().unique(),
  driveFolderUrl: text("drive_folder_url"),
  description: text("description"),
  syncDirection: varchar("sync_direction", { length: 20 }).default("bidirectional"),
  isActive: boolean("is_active").default(true).notNull(),
  lastSyncAt: timestamp("last_sync_at"),
  syncToken: text("sync_token"),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("drive_sync_folders_drive_folder_id_idx").on(table.driveFolderId),
  index("drive_sync_folders_is_active_idx").on(table.isActive),
]);

export type DriveSyncFolder = typeof driveSyncFolders.$inferSelect;
export type InsertDriveSyncFolder = typeof driveSyncFolders.$inferInsert;

// ==========================================
// ARQUIVOS DO DRIVE
// ==========================================

export const driveFiles = pgTable("drive_files", {
  id: serial("id").primaryKey(),

  // Identificação Google Drive
  driveFileId: varchar("drive_file_id", { length: 100 }).notNull().unique(),
  driveFolderId: varchar("drive_folder_id", { length: 100 }).notNull(),

  // Metadados do arquivo
  name: varchar("name", { length: 500 }).notNull(),
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size"),
  description: text("description"),

  // Links
  webViewLink: text("web_view_link"),
  webContentLink: text("web_content_link"),
  thumbnailLink: text("thumbnail_link"),
  iconLink: text("icon_link"),

  // Status de sincronização
  syncStatus: varchar("sync_status", { length: 20 }).default("synced"),
  lastModifiedTime: timestamp("last_modified_time"),
  lastSyncAt: timestamp("last_sync_at"),
  localChecksum: varchar("local_checksum", { length: 64 }),
  driveChecksum: varchar("drive_checksum", { length: 64 }),

  // Relacionamentos (opcionais)
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "set null" }),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "set null" }),
  documentoId: integer("documento_id").references(() => documentos.id, { onDelete: "set null" }),

  // Cópia local
  localFileUrl: text("local_file_url"),
  localFileKey: text("local_file_key"),

  // Controle de versão
  version: integer("version").default(1),
  isFolder: boolean("is_folder").default(false),
  parentFileId: integer("parent_file_id"),

  // Enrichment Intelligence
  enrichmentStatus: varchar("enrichment_status", { length: 20 }).default("pending"),
  enrichmentError: text("enrichment_error"),
  enrichedAt: timestamp("enriched_at"),
  categoria: varchar("categoria", { length: 50 }),
  documentType: varchar("document_type", { length: 100 }),

  // Dados estruturados extraídos pelo enrichment
  enrichmentData: jsonb("enrichment_data").$type<{
    numero_processo?: string;
    pessoa_nome?: string;
    area?: string;
    sub_type?: string;
    extracted_sections?: { titulo: string; tipo: string; pagina: number }[];
    confidence?: number;
    transcript?: string;
    transcript_plain?: string;
    speakers?: unknown[];
    summary?: string | null;
    interlocutor?: string | null;
    tipo_gravacao?: string | null;
    plaud_recording_id?: number;
    atendimento_id?: number | null;
    analysis?: Record<string, unknown>;
  }>(),

  // Metadados
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("drive_files_drive_folder_id_idx").on(table.driveFolderId),
  index("drive_files_drive_file_id_idx").on(table.driveFileId),
  index("drive_files_processo_id_idx").on(table.processoId),
  index("drive_files_assistido_id_idx").on(table.assistidoId),
  index("drive_files_sync_status_idx").on(table.syncStatus),
  index("drive_files_is_folder_idx").on(table.isFolder),
  index("drive_files_parent_file_id_idx").on(table.parentFileId),
  index("drive_files_enrichment_status_idx").on(table.enrichmentStatus),
  index("drive_files_enriched_at_idx").on(table.enrichedAt),
]);

export type DriveFile = typeof driveFiles.$inferSelect;
export type InsertDriveFile = typeof driveFiles.$inferInsert;

// ==========================================
// LOGS DE SINCRONIZAÇÃO
// ==========================================

export const driveSyncLogs = pgTable("drive_sync_logs", {
  id: serial("id").primaryKey(),
  driveFileId: varchar("drive_file_id", { length: 100 }),
  action: varchar("action", { length: 50 }).notNull(),
  status: varchar("status", { length: 20 }).default("success"),
  details: text("details"),
  errorMessage: text("error_message"),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("drive_sync_logs_drive_file_id_idx").on(table.driveFileId),
  index("drive_sync_logs_created_at_idx").on(table.createdAt),
  index("drive_sync_logs_action_idx").on(table.action),
]);

export type DriveSyncLog = typeof driveSyncLogs.$inferSelect;
export type InsertDriveSyncLog = typeof driveSyncLogs.$inferInsert;

// ==========================================
// WEBHOOKS DO DRIVE
// ==========================================

export const driveWebhooks = pgTable("drive_webhooks", {
  id: serial("id").primaryKey(),
  channelId: varchar("channel_id", { length: 100 }).notNull().unique(),
  resourceId: varchar("resource_id", { length: 100 }),
  folderId: varchar("folder_id", { length: 100 }).notNull(),
  expiration: timestamp("expiration"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("drive_webhooks_channel_id_idx").on(table.channelId),
  index("drive_webhooks_folder_id_idx").on(table.folderId),
  index("drive_webhooks_is_active_idx").on(table.isActive),
]);

export type DriveWebhook = typeof driveWebhooks.$inferSelect;
export type InsertDriveWebhook = typeof driveWebhooks.$inferInsert;

// ==========================================
// SEÇÕES DE DOCUMENTOS PDF
// ==========================================

export const driveDocumentSections = pgTable("drive_document_sections", {
  id: serial("id").primaryKey(),
  driveFileId: integer("drive_file_id").notNull().references(() => driveFiles.id, { onDelete: "cascade" }),

  // Classificação da peça processual
  tipo: varchar("tipo", { length: 50 }).notNull(),
  titulo: text("titulo").notNull(),
  paginaInicio: integer("pagina_inicio").notNull(),
  paginaFim: integer("pagina_fim").notNull(),

  // Conteúdo extraído
  resumo: text("resumo"),
  textoExtraido: text("texto_extraido"),

  // Qualidade da classificação
  confianca: integer("confianca").default(0),

  // Status de revisão pelo defensor
  reviewStatus: varchar("review_status", { length: 20 }).default("pending").notNull(),

  // Ficha tipo-específica gerada pela IA
  fichaData: jsonb("ficha_data").$type<Record<string, unknown>>(),

  // Metadados estruturados
  metadata: jsonb("metadata").$type<{
    partesmencionadas?: string[];
    datasExtraidas?: string[];
    artigosLei?: string[];
    juiz?: string;
    promotor?: string;
  }>().default({}),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("drive_doc_sections_drive_file_id_idx").on(table.driveFileId),
  index("drive_doc_sections_tipo_idx").on(table.tipo),
  index("drive_doc_sections_pagina_inicio_idx").on(table.paginaInicio),
  index("drive_doc_sections_review_status_idx").on(table.reviewStatus),
]);

export type DriveDocumentSection = typeof driveDocumentSections.$inferSelect;
export type InsertDriveDocumentSection = typeof driveDocumentSections.$inferInsert;

// ==========================================
// ANOTAÇÕES EM PDF (HIGHLIGHTS E NOTAS)
// ==========================================

export const driveFileAnnotations = pgTable("drive_file_annotations", {
  id: serial("id").primaryKey(),
  driveFileId: integer("drive_file_id").notNull()
    .references(() => driveFiles.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Annotation type
  tipo: varchar("tipo", { length: 20 }).notNull(),
  pagina: integer("pagina").notNull(),

  // Colors
  cor: varchar("cor", { length: 20 }).default("yellow").notNull(),

  // Content
  texto: text("texto"),
  textoSelecionado: text("texto_selecionado"),

  // Position on page
  posicao: jsonb("posicao").$type<
    | { x: number; y: number; width: number; height: number }
    | { rects: Array<{ x: number; y: number; width: number; height: number }> }
  >(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("idx_annotations_file").on(table.driveFileId),
  index("idx_annotations_page").on(table.driveFileId, table.pagina),
]);

export type DriveFileAnnotation = typeof driveFileAnnotations.$inferSelect;
export type InsertDriveFileAnnotation = typeof driveFileAnnotations.$inferInsert;

// ==========================================
// CONTEÚDO EXTRAÍDO DE ARQUIVOS DO DRIVE
// ==========================================

export const driveFileContents = pgTable("drive_file_contents", {
  id: serial("id").primaryKey(),

  // Vinculação com arquivo do Drive
  driveFileId: integer("drive_file_id")
    .notNull()
    .references(() => driveFiles.id, { onDelete: "cascade" }),

  // Status da extração
  extractionStatus: extractionStatusEnum("extraction_status").default("PENDING").notNull(),

  // Conteúdo extraído
  contentMarkdown: text("content_markdown"),
  contentText: text("content_text"),

  // Dados estruturados extraídos
  extractedData: jsonb("extracted_data"),

  // Classificação do documento
  documentType: varchar("document_type", { length: 100 }),
  documentSubtype: varchar("document_subtype", { length: 100 }),

  // Metadados da extração
  extractedAt: timestamp("extracted_at"),
  processingTimeMs: integer("processing_time_ms"),
  pageCount: integer("page_count"),
  tableCount: integer("table_count"),
  imageCount: integer("image_count"),
  wordCount: integer("word_count"),

  // OCR
  ocrApplied: boolean("ocr_applied").default(false),

  // Erros
  errorMessage: text("error_message"),
  errorStack: text("error_stack"),

  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("drive_file_contents_drive_file_id_idx").on(table.driveFileId),
  index("drive_file_contents_extraction_status_idx").on(table.extractionStatus),
  index("drive_file_contents_document_type_idx").on(table.documentType),
]);

export type DriveFileContent = typeof driveFileContents.$inferSelect;
export type InsertDriveFileContent = typeof driveFileContents.$inferInsert;

// ==========================================
// SPEAKER LABELS — Diarização de Transcrições
// ==========================================

export const speakerLabels = pgTable("speaker_labels", {
  id: serial("id").primaryKey(),
  assistidoId: integer("assistido_id").notNull().references(() => assistidos.id, { onDelete: "cascade" }),
  fileId: integer("file_id").references(() => driveFiles.id, { onDelete: "set null" }),
  speakerKey: varchar("speaker_key", { length: 50 }).notNull(),
  label: varchar("label", { length: 200 }).notNull(),
  role: varchar("role", { length: 50 }),
  confidence: real("confidence"),
  isManual: boolean("is_manual").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("speaker_labels_assistido_idx").on(table.assistidoId),
  index("speaker_labels_file_idx").on(table.fileId),
]);

export type SpeakerLabel = typeof speakerLabels.$inferSelect;
export type InsertSpeakerLabel = typeof speakerLabels.$inferInsert;

// ==========================================
// DOCUMENT EMBEDDINGS (BUSCA SEMANTICA)
// ==========================================

export const documentEmbeddings = pgTable("document_embeddings", {
  id: serial("id").primaryKey(),
  fileId: integer("file_id").notNull().references(() => driveFiles.id, { onDelete: "cascade" }),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "cascade" }),
  chunkIndex: integer("chunk_index").notNull().default(0),
  chunkText: text("chunk_text").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("document_embeddings_file_idx").on(table.fileId),
  index("document_embeddings_assistido_idx").on(table.assistidoId),
]);

export type DocumentEmbedding = typeof documentEmbeddings.$inferSelect;
export type InsertDocumentEmbedding = typeof documentEmbeddings.$inferInsert;

// ==========================================
// RELAÇÕES - Drive
// ==========================================

export const driveSyncFoldersRelations = relations(driveSyncFolders, ({ one }) => ({
  createdBy: one(users, { fields: [driveSyncFolders.createdById], references: [users.id] }),
}));

export const driveFilesRelations = relations(driveFiles, ({ one, many }) => ({
  processo: one(processos, { fields: [driveFiles.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [driveFiles.assistidoId], references: [assistidos.id] }),
  documento: one(documentos, { fields: [driveFiles.documentoId], references: [documentos.id] }),
  createdBy: one(users, { fields: [driveFiles.createdById], references: [users.id] }),
  parent: one(driveFiles, { fields: [driveFiles.parentFileId], references: [driveFiles.id] }),
  sections: many(driveDocumentSections),
  annotations: many(driveFileAnnotations),
}));

export const driveDocumentSectionsRelations = relations(driveDocumentSections, ({ one }) => ({
  driveFile: one(driveFiles, { fields: [driveDocumentSections.driveFileId], references: [driveFiles.id] }),
}));

export const driveSyncLogsRelations = relations(driveSyncLogs, ({ one }) => ({
  user: one(users, { fields: [driveSyncLogs.userId], references: [users.id] }),
}));

export const driveFileAnnotationsRelations = relations(driveFileAnnotations, ({ one }) => ({
  driveFile: one(driveFiles, { fields: [driveFileAnnotations.driveFileId], references: [driveFiles.id] }),
  user: one(users, { fields: [driveFileAnnotations.userId], references: [users.id] }),
}));

export const driveFileContentsRelations = relations(driveFileContents, ({ one }) => ({
  driveFile: one(driveFiles, { fields: [driveFileContents.driveFileId], references: [driveFiles.id] }),
}));

export const speakerLabelsRelations = relations(speakerLabels, ({ one }) => ({
  assistido: one(assistidos, { fields: [speakerLabels.assistidoId], references: [assistidos.id] }),
  file: one(driveFiles, { fields: [speakerLabels.fileId], references: [driveFiles.id] }),
}));

export const documentEmbeddingsRelations = relations(documentEmbeddings, ({ one }) => ({
  driveFile: one(driveFiles, { fields: [documentEmbeddings.fileId], references: [driveFiles.id] }),
  assistido: one(assistidos, { fields: [documentEmbeddings.assistidoId], references: [assistidos.id] }),
}));
