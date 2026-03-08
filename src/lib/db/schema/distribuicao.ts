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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { atribuicaoEnum, patternTypeEnum } from "./enums";
import { workspaces, users, processos, assistidos } from "./core";

// ==========================================
// SISTEMA DE DISTRIBUICAO AUTOMATICA
// ==========================================

// Tabela de padroes aprendidos para extracao de dados de PDFs
export const extractionPatterns = pgTable("extraction_patterns", {
  id: serial("id").primaryKey(),

  // Tipo de padrao
  patternType: patternTypeEnum("pattern_type").notNull(),

  // Valor original extraido (ex: "JUIZADO ESPECIAL CRIMINAL DE CAMACARI")
  originalValue: text("original_value").notNull(),

  // Correcao do usuario (se aplicavel)
  correctedValue: text("corrected_value"),

  // Atribuicao correta identificada
  correctAtribuicao: atribuicaoEnum("correct_atribuicao"),

  // Contexto adicional
  regexUsed: text("regex_used"),            // Regex que foi usado para extrair
  confidenceBefore: integer("confidence_before"), // Confianca antes da correcao (0-100)

  // Documento de exemplo
  documentoExemplo: text("documento_exemplo"), // ID do documento que originou o padrao

  // Quantas vezes este padrao foi aplicado
  timesUsed: integer("times_used").default(1).notNull(),

  // Workspace
  workspaceId: integer("workspace_id").references(() => workspaces.id),

  // Quem criou
  createdBy: integer("created_by").references(() => users.id),

  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("extraction_patterns_type_idx").on(table.patternType),
  index("extraction_patterns_original_value_idx").on(table.originalValue),
  index("extraction_patterns_workspace_id_idx").on(table.workspaceId),
  uniqueIndex("extraction_patterns_unique_idx").on(table.patternType, table.originalValue),
]);

export type ExtractionPattern = typeof extractionPatterns.$inferSelect;
export type InsertExtractionPattern = typeof extractionPatterns.$inferInsert;

// Historico de distribuicoes automaticas
export const distributionHistory = pgTable("distribution_history", {
  id: serial("id").primaryKey(),

  // Arquivo original
  driveFileId: text("drive_file_id").notNull(),        // ID do arquivo no Drive
  originalFilename: text("original_filename").notNull(), // Nome original do arquivo

  // Dados extraidos
  extractedNumeroProcesso: text("extracted_numero_processo"),
  extractedOrgaoJulgador: text("extracted_orgao_julgador"),
  extractedAssistidoNome: text("extracted_assistido_nome"),
  extractedClasseDemanda: text("extracted_classe_demanda"),

  // Atribuicao identificada
  atribuicaoIdentificada: atribuicaoEnum("atribuicao_identificada"),
  atribuicaoConfianca: integer("atribuicao_confianca"), // 0-100

  // Match realizado
  assistidoId: integer("assistido_id").references(() => assistidos.id),
  processoId: integer("processo_id").references(() => processos.id),

  // Pasta de destino
  destinationFolderId: text("destination_folder_id"),  // ID da pasta de destino

  // Status
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  // 'pending' | 'processing' | 'completed' | 'error' | 'manual_review'

  errorMessage: text("error_message"),

  // Correcoes manuais (se houve)
  wasManuallyCorreted: boolean("was_manually_correted").default(false),
  correctedBy: integer("corrected_by").references(() => users.id),

  // Workspace
  workspaceId: integer("workspace_id").references(() => workspaces.id),

  // Metadados
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("distribution_history_file_id_idx").on(table.driveFileId),
  index("distribution_history_assistido_id_idx").on(table.assistidoId),
  index("distribution_history_processo_id_idx").on(table.processoId),
  index("distribution_history_status_idx").on(table.status),
  index("distribution_history_workspace_id_idx").on(table.workspaceId),
]);

export type DistributionHistory = typeof distributionHistory.$inferSelect;
export type InsertDistributionHistory = typeof distributionHistory.$inferInsert;

// ==========================================
// RELACOES - Distribuicao
// ==========================================

export const extractionPatternsRelations = relations(extractionPatterns, ({ one }) => ({
  workspace: one(workspaces, { fields: [extractionPatterns.workspaceId], references: [workspaces.id] }),
  createdByUser: one(users, { fields: [extractionPatterns.createdBy], references: [users.id] }),
}));

export const distributionHistoryRelations = relations(distributionHistory, ({ one }) => ({
  assistido: one(assistidos, { fields: [distributionHistory.assistidoId], references: [assistidos.id] }),
  processo: one(processos, { fields: [distributionHistory.processoId], references: [processos.id] }),
  correctedByUser: one(users, { fields: [distributionHistory.correctedBy], references: [users.id] }),
  workspace: one(workspaces, { fields: [distributionHistory.workspaceId], references: [workspaces.id] }),
}));
