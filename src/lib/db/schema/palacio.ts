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
import { diagramaTipoEnum } from "./enums";
import { workspaces, users } from "./core";
import { casos, casePersonas, caseFacts, tesesDefensivas } from "./casos";
import { documentos } from "./documentos";
import { testemunhas } from "./agenda";

// ==========================================
// PALACIO DA MENTE - DIAGRAMAS DE INVESTIGACAO
// ==========================================

// Tabela principal de diagramas
export const palacioDiagramas = pgTable("palacio_diagramas", {
  id: serial("id").primaryKey(),

  // Vinculo com caso
  casoId: integer("caso_id").notNull().references(() => casos.id, { onDelete: "cascade" }),

  // Identificacao
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),

  // Tipo de diagrama
  tipo: diagramaTipoEnum("tipo").notNull().default("MAPA_MENTAL"),

  // Dados do Excalidraw (JSON completo)
  excalidrawData: jsonb("excalidraw_data").$type<{
    type: "excalidraw";
    version: number;
    source: string;
    elements: unknown[];
    appState: Record<string, unknown>;
    files: Record<string, unknown>;
  }>(),

  // Thumbnail para preview (opcional - base64 ou URL)
  thumbnail: text("thumbnail"),

  // Metadados do diagrama
  versao: integer("versao").default(1),
  ultimoExportado: timestamp("ultimo_exportado"),
  formatoExportacao: varchar("formato_exportacao", { length: 20 }), // 'obsidian' | 'standard' | 'animated'

  // Organizacao
  ordem: integer("ordem").default(0),
  tags: jsonb("tags").$type<string[]>(),

  // Status
  status: varchar("status", { length: 20 }).default("ativo"), // 'ativo' | 'arquivado' | 'rascunho'

  // Autoria
  criadoPorId: integer("criado_por_id").references(() => users.id),
  atualizadoPorId: integer("atualizado_por_id").references(() => users.id),

  // Workspace (multi-tenant)
  workspaceId: integer("workspace_id").references(() => workspaces.id),

  // Soft delete
  deletedAt: timestamp("deleted_at"),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("palacio_diagramas_caso_id_idx").on(table.casoId),
  index("palacio_diagramas_tipo_idx").on(table.tipo),
  index("palacio_diagramas_status_idx").on(table.status),
  index("palacio_diagramas_criado_por_idx").on(table.criadoPorId),
  index("palacio_diagramas_workspace_id_idx").on(table.workspaceId),
  index("palacio_diagramas_deleted_at_idx").on(table.deletedAt),
]);

export type PalacioDiagrama = typeof palacioDiagramas.$inferSelect;
export type InsertPalacioDiagrama = typeof palacioDiagramas.$inferInsert;

// Elementos do diagrama vinculados a entidades do caso
export const palacioElementos = pgTable("palacio_elementos", {
  id: serial("id").primaryKey(),

  // Vinculo com diagrama
  diagramaId: integer("diagrama_id").notNull().references(() => palacioDiagramas.id, { onDelete: "cascade" }),

  // ID do elemento no Excalidraw
  excalidrawElementId: text("excalidraw_element_id").notNull(),

  // Tipo de vinculo com entidades do caso
  tipoVinculo: varchar("tipo_vinculo", { length: 30 }), // 'persona' | 'fato' | 'prova' | 'tese' | 'documento' | 'testemunha'

  // IDs das entidades vinculadas (polimorfico)
  personaId: integer("persona_id").references(() => casePersonas.id, { onDelete: "set null" }),
  fatoId: integer("fato_id").references(() => caseFacts.id, { onDelete: "set null" }),
  documentoId: integer("documento_id").references(() => documentos.id, { onDelete: "set null" }),
  testemunhaId: integer("testemunha_id").references(() => testemunhas.id, { onDelete: "set null" }),
  teseId: integer("tese_id").references(() => tesesDefensivas.id, { onDelete: "set null" }),

  // Dados extras do elemento
  label: text("label"),
  notas: text("notas"),
  cor: varchar("cor", { length: 20 }),
  icone: varchar("icone", { length: 50 }),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("palacio_elementos_diagrama_id_idx").on(table.diagramaId),
  index("palacio_elementos_tipo_vinculo_idx").on(table.tipoVinculo),
  index("palacio_elementos_persona_id_idx").on(table.personaId),
  index("palacio_elementos_fato_id_idx").on(table.fatoId),
  index("palacio_elementos_documento_id_idx").on(table.documentoId),
]);

export type PalacioElemento = typeof palacioElementos.$inferSelect;
export type InsertPalacioElemento = typeof palacioElementos.$inferInsert;

// Conexoes entre elementos (para analise de relacionamentos)
export const palacioConexoes = pgTable("palacio_conexoes", {
  id: serial("id").primaryKey(),

  // Vinculo com diagrama
  diagramaId: integer("diagrama_id").notNull().references(() => palacioDiagramas.id, { onDelete: "cascade" }),

  // Elementos conectados
  elementoOrigemId: integer("elemento_origem_id").notNull().references(() => palacioElementos.id, { onDelete: "cascade" }),
  elementoDestinoId: integer("elemento_destino_id").notNull().references(() => palacioElementos.id, { onDelete: "cascade" }),

  // Tipo de conexao
  tipoConexao: varchar("tipo_conexao", { length: 30 }), // 'contradicao' | 'corrobora' | 'sequencia' | 'hierarquia' | 'associacao'

  // Metadados
  label: text("label"),
  forca: integer("forca"), // 0-100 - forca da conexao
  direcional: boolean("direcional").default(true),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("palacio_conexoes_diagrama_id_idx").on(table.diagramaId),
  index("palacio_conexoes_origem_idx").on(table.elementoOrigemId),
  index("palacio_conexoes_destino_idx").on(table.elementoDestinoId),
  index("palacio_conexoes_tipo_idx").on(table.tipoConexao),
]);

export type PalacioConexao = typeof palacioConexoes.$inferSelect;
export type InsertPalacioConexao = typeof palacioConexoes.$inferInsert;

// ==========================================
// RELACOES - Palacio da Mente
// ==========================================

export const palacioDiagramasRelations = relations(palacioDiagramas, ({ one, many }) => ({
  caso: one(casos, { fields: [palacioDiagramas.casoId], references: [casos.id] }),
  criadoPor: one(users, { fields: [palacioDiagramas.criadoPorId], references: [users.id] }),
  atualizadoPor: one(users, { fields: [palacioDiagramas.atualizadoPorId], references: [users.id] }),
  workspace: one(workspaces, { fields: [palacioDiagramas.workspaceId], references: [workspaces.id] }),
  elementos: many(palacioElementos),
  conexoes: many(palacioConexoes),
}));

export const palacioElementosRelations = relations(palacioElementos, ({ one, many }) => ({
  diagrama: one(palacioDiagramas, { fields: [palacioElementos.diagramaId], references: [palacioDiagramas.id] }),
  persona: one(casePersonas, { fields: [palacioElementos.personaId], references: [casePersonas.id] }),
  fato: one(caseFacts, { fields: [palacioElementos.fatoId], references: [caseFacts.id] }),
  documento: one(documentos, { fields: [palacioElementos.documentoId], references: [documentos.id] }),
  testemunha: one(testemunhas, { fields: [palacioElementos.testemunhaId], references: [testemunhas.id] }),
  tese: one(tesesDefensivas, { fields: [palacioElementos.teseId], references: [tesesDefensivas.id] }),
  conexoesOrigem: many(palacioConexoes),
}));

export const palacioConexoesRelations = relations(palacioConexoes, ({ one }) => ({
  diagrama: one(palacioDiagramas, { fields: [palacioConexoes.diagramaId], references: [palacioDiagramas.id] }),
  elementoOrigem: one(palacioElementos, { fields: [palacioConexoes.elementoOrigemId], references: [palacioElementos.id] }),
  elementoDestino: one(palacioElementos, { fields: [palacioConexoes.elementoDestinoId], references: [palacioElementos.id] }),
}));
