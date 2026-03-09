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
import { tribunalEnum, tipoDecisaoEnum } from "./enums";
import { users } from "./core";

// ==========================================
// JURISPRUDENCIA - Banco de Julgados
// ==========================================

// Temas de jurisprudencia (categorizacao principal)
export const jurisprudenciaTemas = pgTable("jurisprudencia_temas", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 200 }).notNull(),
  descricao: text("descricao"),
  cor: varchar("cor", { length: 20 }).default("#6366f1"), // Cor para identificacao visual
  icone: varchar("icone", { length: 50 }), // Nome do icone Lucide

  // Hierarquia (tema pai para subtemas)
  parentId: integer("parent_id"),

  // Contadores
  totalJulgados: integer("total_julgados").default(0),

  // Workspace
  createdById: integer("created_by_id").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("jurisprudencia_temas_nome_idx").on(table.nome),
  index("jurisprudencia_temas_parent_id_idx").on(table.parentId),
]);

export type JurisprudenciaTema = typeof jurisprudenciaTemas.$inferSelect;
export type InsertJurisprudenciaTema = typeof jurisprudenciaTemas.$inferInsert;

// Teses juridicas (argumentos especificos dentro de um tema)
export const jurisprudenciaTeses = pgTable("jurisprudencia_teses", {
  id: serial("id").primaryKey(),
  temaId: integer("tema_id").references(() => jurisprudenciaTemas.id, { onDelete: "cascade" }),

  titulo: varchar("titulo", { length: 300 }).notNull(),
  descricao: text("descricao"),

  // Texto da tese (para copy/paste)
  textoTese: text("texto_tese"),

  // Favoravel ou desfavoravel a defesa
  posicao: varchar("posicao", { length: 20 }).default("favoravel"), // favoravel | desfavoravel | neutro

  // Forca da tese
  forca: varchar("forca", { length: 20 }).default("medio"), // forte | medio | fraco

  // Tags para busca
  tags: jsonb("tags").$type<string[]>(),

  // Contadores
  totalJulgados: integer("total_julgados").default(0),

  // Workspace
  createdById: integer("created_by_id").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("jurisprudencia_teses_tema_id_idx").on(table.temaId),
  index("jurisprudencia_teses_titulo_idx").on(table.titulo),
  index("jurisprudencia_teses_posicao_idx").on(table.posicao),
]);

export type JurisprudenciaTese = typeof jurisprudenciaTeses.$inferSelect;
export type InsertJurisprudenciaTese = typeof jurisprudenciaTeses.$inferInsert;

// Julgados (decisoes judiciais)
export const jurisprudenciaJulgados = pgTable("jurisprudencia_julgados", {
  id: serial("id").primaryKey(),

  // Identificacao
  tribunal: tribunalEnum("tribunal").notNull(),
  tipoDecisao: tipoDecisaoEnum("tipo_decisao").notNull(),
  numeroProcesso: varchar("numero_processo", { length: 100 }),
  numeroRecurso: varchar("numero_recurso", { length: 100 }),

  // Dados do julgamento
  relator: varchar("relator", { length: 200 }),
  orgaoJulgador: varchar("orgao_julgador", { length: 200 }), // Turma, Camara, Pleno, etc.
  dataJulgamento: date("data_julgamento"),
  dataPublicacao: date("data_publicacao"),

  // Conteudo
  ementa: text("ementa"),
  ementaResumo: text("ementa_resumo"), // Resumo gerado por IA
  decisao: text("decisao"),
  votacao: varchar("votacao", { length: 100 }), // "Unanimidade", "Maioria 3x2", etc.

  // Texto completo (extraido do PDF)
  textoIntegral: text("texto_integral"),

  // Categorizacao
  temaId: integer("tema_id").references(() => jurisprudenciaTemas.id, { onDelete: "set null" }),
  teseId: integer("tese_id").references(() => jurisprudenciaTeses.id, { onDelete: "set null" }),

  // Tags e palavras-chave
  tags: jsonb("tags").$type<string[]>(),
  palavrasChave: jsonb("palavras_chave").$type<string[]>(),

  // Arquivo original
  driveFileId: varchar("drive_file_id", { length: 100 }),
  driveFileUrl: text("drive_file_url"),
  arquivoNome: varchar("arquivo_nome", { length: 255 }),
  arquivoTamanho: integer("arquivo_tamanho"),

  // Processamento por IA
  processadoPorIA: boolean("processado_por_ia").default(false),
  iaResumo: text("ia_resumo"),
  iaPontosChave: jsonb("ia_pontos_chave").$type<string[]>(),
  iaArgumentos: jsonb("ia_argumentos").$type<{
    favoraveis: string[];
    desfavoraveis: string[];
  }>(),

  // Embedding para busca semantica (vetor de 768 dimensoes do Gemini)
  // Armazenado como JSON para compatibilidade
  embedding: jsonb("embedding").$type<number[]>(),

  // Citacao formatada (pronta para copiar)
  citacaoFormatada: text("citacao_formatada"),

  // Status
  status: varchar("status", { length: 20 }).default("pendente"), // pendente | processando | processado | erro

  // Favorito
  isFavorito: boolean("is_favorito").default(false),

  // Metadados
  fonte: varchar("fonte", { length: 100 }), // "Google Drive", "Upload Manual", "Importacao"
  observacoes: text("observacoes"),

  // Workspace e usuario
  createdById: integer("created_by_id").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("jurisprudencia_julgados_tribunal_idx").on(table.tribunal),
  index("jurisprudencia_julgados_tipo_decisao_idx").on(table.tipoDecisao),
  index("jurisprudencia_julgados_numero_processo_idx").on(table.numeroProcesso),
  index("jurisprudencia_julgados_data_julgamento_idx").on(table.dataJulgamento),
  index("jurisprudencia_julgados_tema_id_idx").on(table.temaId),
  index("jurisprudencia_julgados_tese_id_idx").on(table.teseId),
  index("jurisprudencia_julgados_status_idx").on(table.status),
  index("jurisprudencia_julgados_is_favorito_idx").on(table.isFavorito),
]);

export type JurisprudenciaJulgado = typeof jurisprudenciaJulgados.$inferSelect;
export type InsertJurisprudenciaJulgado = typeof jurisprudenciaJulgados.$inferInsert;

// Historico de buscas e perguntas a IA
export const jurisprudenciaBuscas = pgTable("jurisprudencia_buscas", {
  id: serial("id").primaryKey(),

  // Pergunta/busca do usuario
  query: text("query").notNull(),
  tipoQuery: varchar("tipo_query", { length: 20 }).default("pergunta"), // pergunta | busca | similar

  // Resposta da IA
  resposta: text("resposta"),

  // Julgados encontrados/citados
  julgadosIds: jsonb("julgados_ids").$type<number[]>(),

  // Metricas
  tempoResposta: integer("tempo_resposta"), // em ms
  totalResultados: integer("total_resultados"),

  // Feedback do usuario
  feedback: varchar("feedback", { length: 20 }), // util | parcial | inutil

  // Workspace e usuario
  userId: integer("user_id").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("jurisprudencia_buscas_user_id_idx").on(table.userId),
  index("jurisprudencia_buscas_created_at_idx").on(table.createdAt),
]);

export type JurisprudenciaBusca = typeof jurisprudenciaBuscas.$inferSelect;
export type InsertJurisprudenciaBusca = typeof jurisprudenciaBuscas.$inferInsert;

// Pasta de sincronizacao do Drive para jurisprudencia
export const jurisprudenciaDriveFolders = pgTable("jurisprudencia_drive_folders", {
  id: serial("id").primaryKey(),

  // Identificacao da pasta
  folderId: varchar("folder_id", { length: 100 }).notNull(),
  folderName: varchar("folder_name", { length: 255 }),
  folderPath: text("folder_path"),

  // Configuracao de sincronizacao
  tribunal: tribunalEnum("tribunal"), // Se a pasta e especifica de um tribunal
  temaId: integer("tema_id").references(() => jurisprudenciaTemas.id, { onDelete: "set null" }),

  // Status de sincronizacao
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  totalArquivos: integer("total_arquivos").default(0),
  arquivosSincronizados: integer("arquivos_sincronizados").default(0),

  // Workspace
  createdById: integer("created_by_id").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("jurisprudencia_drive_folders_folder_id_idx").on(table.folderId),
  index("jurisprudencia_drive_folders_tribunal_idx").on(table.tribunal),
]);

export type JurisprudenciaDriveFolder = typeof jurisprudenciaDriveFolders.$inferSelect;
export type InsertJurisprudenciaDriveFolder = typeof jurisprudenciaDriveFolders.$inferInsert;

// ==========================================
// RELACOES - Jurisprudencia
// ==========================================

export const jurisprudenciaTemasRelations = relations(jurisprudenciaTemas, ({ one, many }) => ({
  parent: one(jurisprudenciaTemas, {
    fields: [jurisprudenciaTemas.parentId],
    references: [jurisprudenciaTemas.id],
    relationName: "tema_parent"
  }),
  children: many(jurisprudenciaTemas, { relationName: "tema_parent" }),
  teses: many(jurisprudenciaTeses),
  julgados: many(jurisprudenciaJulgados),
  createdBy: one(users, { fields: [jurisprudenciaTemas.createdById], references: [users.id] }),
}));

export const jurisprudenciaTesesRelations = relations(jurisprudenciaTeses, ({ one, many }) => ({
  tema: one(jurisprudenciaTemas, { fields: [jurisprudenciaTeses.temaId], references: [jurisprudenciaTemas.id] }),
  julgados: many(jurisprudenciaJulgados),
  createdBy: one(users, { fields: [jurisprudenciaTeses.createdById], references: [users.id] }),
}));

export const jurisprudenciaJulgadosRelations = relations(jurisprudenciaJulgados, ({ one }) => ({
  tema: one(jurisprudenciaTemas, { fields: [jurisprudenciaJulgados.temaId], references: [jurisprudenciaTemas.id] }),
  tese: one(jurisprudenciaTeses, { fields: [jurisprudenciaJulgados.teseId], references: [jurisprudenciaTeses.id] }),
  createdBy: one(users, { fields: [jurisprudenciaJulgados.createdById], references: [users.id] }),
}));

export const jurisprudenciaBuscasRelations = relations(jurisprudenciaBuscas, ({ one }) => ({
  user: one(users, { fields: [jurisprudenciaBuscas.userId], references: [users.id] }),
}));

export const jurisprudenciaDriveFoldersRelations = relations(jurisprudenciaDriveFolders, ({ one }) => ({
  tema: one(jurisprudenciaTemas, { fields: [jurisprudenciaDriveFolders.temaId], references: [jurisprudenciaTemas.id] }),
  createdBy: one(users, { fields: [jurisprudenciaDriveFolders.createdById], references: [users.id] }),
}));
