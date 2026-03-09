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
import { atribuicaoEnum, prioridadeEnum, quesitosResultadoEnum } from "./enums";
import { users, processos, assistidos } from "./core";

// ==========================================
// CASOS (Entidade Mestre - Case-Centric)
// ==========================================

export const casos = pgTable("casos", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  codigo: varchar("codigo", { length: 50 }),
  atribuicao: atribuicaoEnum("atribuicao").notNull().default("SUBSTITUICAO"),
  teoriaFatos: text("teoria_fatos"),
  teoriaProvas: text("teoria_provas"),
  teoriaDireito: text("teoria_direito"),
  tags: text("tags"),
  status: varchar("status", { length: 30 }).default("ativo"),
  fase: varchar("fase", { length: 50 }),
  prioridade: prioridadeEnum("prioridade").default("NORMAL"),
  defensorId: integer("defensor_id").references(() => users.id),
  casoConexoId: integer("caso_conexo_id"),
  observacoes: text("observacoes"),
  linkDrive: text("link_drive"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("casos_titulo_idx").on(table.titulo),
  index("casos_atribuicao_idx").on(table.atribuicao),
  index("casos_status_idx").on(table.status),
  index("casos_defensor_id_idx").on(table.defensorId),
  index("casos_deleted_at_idx").on(table.deletedAt),
]);

export type Caso = typeof casos.$inferSelect;
export type InsertCaso = typeof casos.$inferInsert;

// ==========================================
// PERSONAS DO CASO
// ==========================================

export const casePersonas = pgTable("case_personas", {
  id: serial("id").primaryKey(),
  casoId: integer("caso_id").notNull().references(() => casos.id, { onDelete: "cascade" }),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "set null" }),
  juradoId: integer("jurado_id"),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "set null" }),
  nome: text("nome").notNull(),
  tipo: varchar("tipo", { length: 30 }).notNull(),
  status: varchar("status", { length: 30 }),
  perfil: jsonb("perfil").$type<Record<string, unknown>>(),
  contatos: jsonb("contatos").$type<Record<string, unknown>>(),
  observacoes: text("observacoes"),
  fonte: varchar("fonte", { length: 50 }),
  fonteId: integer("fonte_id"),
  confidence: real("confidence"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("case_personas_caso_id_idx").on(table.casoId),
  index("case_personas_tipo_idx").on(table.tipo),
  index("case_personas_status_idx").on(table.status),
  index("case_personas_assistido_id_idx").on(table.assistidoId),
  index("case_personas_jurado_id_idx").on(table.juradoId),
  index("case_personas_processo_id_idx").on(table.processoId),
]);

export type CasePersona = typeof casePersonas.$inferSelect;
export type InsertCasePersona = typeof casePersonas.$inferInsert;

// ==========================================
// FATOS DO CASO
// ==========================================

export const caseFacts = pgTable("case_facts", {
  id: serial("id").primaryKey(),
  casoId: integer("caso_id").notNull().references(() => casos.id, { onDelete: "cascade" }),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "set null" }),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "set null" }),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  tipo: varchar("tipo", { length: 30 }),
  tags: jsonb("tags").$type<string[]>(),
  status: varchar("status", { length: 20 }).default("ativo"),
  dataFato: date("data_fato"),
  fonte: varchar("fonte", { length: 50 }),
  fonteId: integer("fonte_id"),
  severidade: varchar("severidade", { length: 10 }),
  confidence: real("confidence"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("case_facts_caso_id_idx").on(table.casoId),
  index("case_facts_tipo_idx").on(table.tipo),
  index("case_facts_status_idx").on(table.status),
  index("case_facts_processo_id_idx").on(table.processoId),
  index("case_facts_assistido_id_idx").on(table.assistidoId),
  index("case_facts_data_fato_idx").on(table.dataFato),
]);

export type CaseFact = typeof caseFacts.$inferSelect;
export type InsertCaseFact = typeof caseFacts.$inferInsert;

// ==========================================
// EVIDÊNCIAS DOS FATOS
// ==========================================

// Forward reference: documentos is imported lazily via relations
export const factEvidence = pgTable("fact_evidence", {
  id: serial("id").primaryKey(),
  factId: integer("fact_id").notNull().references(() => caseFacts.id, { onDelete: "cascade" }),
  documentoId: integer("documento_id"),
  sourceType: varchar("source_type", { length: 30 }),
  sourceId: text("source_id"),
  trecho: text("trecho"),
  contradicao: boolean("contradicao").default(false),
  confianca: integer("confianca"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("fact_evidence_fact_id_idx").on(table.factId),
  index("fact_evidence_documento_id_idx").on(table.documentoId),
  index("fact_evidence_contradicao_idx").on(table.contradicao),
]);

export type FactEvidence = typeof factEvidence.$inferSelect;
export type InsertFactEvidence = typeof factEvidence.$inferInsert;

// ==========================================
// TESES DEFENSIVAS (Estratégia)
// ==========================================

export const tesesDefensivas = pgTable("teses_defensivas", {
  id: serial("id").primaryKey(),
  casoId: integer("caso_id").references(() => casos.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  tipo: varchar("tipo", { length: 30 }),
  probabilidadeAceitacao: integer("probabilidade_aceitacao"),
  argumentosChave: jsonb("argumentos_chave").$type<string[]>(),
  jurisprudenciaRelacionada: jsonb("jurisprudencia_relacionada").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("teses_defensivas_caso_id_idx").on(table.casoId),
  index("teses_defensivas_tipo_idx").on(table.tipo),
  index("teses_defensivas_probabilidade_idx").on(table.probabilidadeAceitacao),
]);

export type TeseDefensiva = typeof tesesDefensivas.$inferSelect;
export type InsertTeseDefensiva = typeof tesesDefensivas.$inferInsert;

// ==========================================
// ANÁLISE COMPARATIVA DE PROVAS
// ==========================================

export const depoimentosAnalise = pgTable("depoimentos_analise", {
  id: serial("id").primaryKey(),
  casoId: integer("caso_id").references(() => casos.id, { onDelete: "cascade" }),
  personaId: integer("persona_id").references(() => casePersonas.id, { onDelete: "set null" }),
  testemunhaNome: text("testemunha_nome"),
  versaoDelegacia: text("versao_delegacia"),
  versaoJuizo: text("versao_juizo"),
  contradicoesIdentificadas: text("contradicoes_identificadas"),
  pontosFracos: text("pontos_fracos"),
  pontosFortes: text("pontos_fortes"),
  estrategiaInquiricao: text("estrategia_inquiricao"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("depoimentos_analise_caso_id_idx").on(table.casoId),
  index("depoimentos_analise_persona_id_idx").on(table.personaId),
  index("depoimentos_analise_testemunha_idx").on(table.testemunhaNome),
]);

export type DepoimentoAnalise = typeof depoimentosAnalise.$inferSelect;
export type InsertDepoimentoAnalise = typeof depoimentosAnalise.$inferInsert;

// ==========================================
// ROTEIRO DE PLENÁRIO
// ==========================================

export const roteiroPlenario = pgTable("roteiro_plenario", {
  id: serial("id").primaryKey(),
  casoId: integer("caso_id").references(() => casos.id, { onDelete: "cascade" }),
  ordem: integer("ordem"),
  fase: varchar("fase", { length: 40 }),
  conteudo: jsonb("conteudo").$type<Record<string, unknown> | string[]>(),
  tempoEstimado: integer("tempo_estimado"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("roteiro_plenario_caso_id_idx").on(table.casoId),
  index("roteiro_plenario_fase_idx").on(table.fase),
  index("roteiro_plenario_ordem_idx").on(table.ordem),
]);

export type RoteiroPlenario = typeof roteiroPlenario.$inferSelect;
export type InsertRoteiroPlenario = typeof roteiroPlenario.$inferInsert;

// ==========================================
// TAGS DE CASOS
// ==========================================

export const casoTags = pgTable("caso_tags", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull().unique(),
  descricao: text("descricao"),
  cor: varchar("cor", { length: 20 }).default("slate"),
  usoCount: integer("uso_count").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("caso_tags_nome_idx").on(table.nome),
  index("caso_tags_uso_idx").on(table.usoCount),
]);

export type CasoTag = typeof casoTags.$inferSelect;
export type InsertCasoTag = typeof casoTags.$inferInsert;

// ==========================================
// CONEXÕES ENTRE CASOS
// ==========================================

export const casosConexos = pgTable("casos_conexos", {
  id: serial("id").primaryKey(),
  casoOrigemId: integer("caso_origem_id").notNull().references(() => casos.id, { onDelete: "cascade" }),
  casoDestinoId: integer("caso_destino_id").notNull().references(() => casos.id, { onDelete: "cascade" }),
  tipoConexao: varchar("tipo_conexao", { length: 50 }),
  descricao: text("descricao"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("casos_conexos_origem_idx").on(table.casoOrigemId),
  index("casos_conexos_destino_idx").on(table.casoDestinoId),
]);

export type CasoConexo = typeof casosConexos.$inferSelect;
export type InsertCasoConexo = typeof casosConexos.$inferInsert;

// ==========================================
// ROTEIRO DO JÚRI (BASEADO EM FATOS)
// ==========================================

export const juriScriptItems = pgTable("juri_script_items", {
  id: serial("id").primaryKey(),
  casoId: integer("caso_id").notNull().references(() => casos.id, { onDelete: "cascade" }),
  sessaoJuriId: integer("sessao_juri_id"),
  personaId: integer("persona_id").references(() => casePersonas.id, { onDelete: "set null" }),
  factId: integer("fact_id").references(() => caseFacts.id, { onDelete: "set null" }),
  pergunta: text("pergunta"),
  fase: varchar("fase", { length: 40 }),
  ordem: integer("ordem"),
  notas: text("notas"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("juri_script_items_caso_id_idx").on(table.casoId),
  index("juri_script_items_sessao_id_idx").on(table.sessaoJuriId),
  index("juri_script_items_persona_id_idx").on(table.personaId),
  index("juri_script_items_fact_id_idx").on(table.factId),
  index("juri_script_items_fase_idx").on(table.fase),
  index("juri_script_items_ordem_idx").on(table.ordem),
]);

export type JuriScriptItem = typeof juriScriptItems.$inferSelect;
export type InsertJuriScriptItem = typeof juriScriptItems.$inferInsert;

// ==========================================
// QUESITOS DO JÚRI (Preparação)
// ==========================================

export const quesitos = pgTable("quesitos", {
  id: serial("id").primaryKey(),
  casoId: integer("caso_id").references(() => casos.id, { onDelete: "cascade" }),
  sessaoJuriId: integer("sessao_juri_id"),
  numero: integer("numero").notNull(),
  texto: text("texto").notNull(),
  tipo: varchar("tipo", { length: 30 }),
  origem: varchar("origem", { length: 20 }),
  teseId: integer("tese_id").references(() => tesesDefensivas.id, { onDelete: "set null" }),
  argumentacaoSim: text("argumentacao_sim"),
  argumentacaoNao: text("argumentacao_nao"),
  dependeDe: integer("depende_de"),
  condicaoPai: varchar("condicao_pai", { length: 5 }),
  geradoPorIA: boolean("gerado_por_ia").default(false),
  resultado: quesitosResultadoEnum("resultado"),
  ordemVotacao: integer("ordem_votacao"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("quesitos_caso_id_idx").on(table.casoId),
  index("quesitos_sessao_juri_id_idx").on(table.sessaoJuriId),
  index("quesitos_tipo_idx").on(table.tipo),
  index("quesitos_numero_idx").on(table.numero),
]);

export type Quesito = typeof quesitos.$inferSelect;
export type InsertQuesito = typeof quesitos.$inferInsert;

// ==========================================
// CROSS-ANALYSIS
// ==========================================

export const crossAnalyses = pgTable("cross_analyses", {
  id: serial("id").primaryKey(),
  assistidoId: integer("assistido_id").notNull().references(() => assistidos.id, { onDelete: "cascade" }),
  contradictionMatrix: jsonb("contradiction_matrix").$type<{
    fato: string;
    depoimentos: Array<{
      sourceFileId: number;
      depoente: string;
      afirmacao: string;
      timestampRef?: string;
    }>;
    tipo: "contradicao" | "corroboracao" | "lacuna";
    analise: string;
  }[]>().default([]),
  teseConsolidada: jsonb("tese_consolidada").$type<{
    tesePrincipal: string;
    tesesSubsidiarias: string[];
    pontosFortes: Array<{
      ponto: string;
      fontes: number[];
      relevancia: "alta" | "media" | "baixa";
    }>;
    pontosFracos: Array<{
      ponto: string;
      fontes: number[];
      relevancia: "alta" | "media" | "baixa";
    }>;
  }>().default({}),
  timelineFatos: jsonb("timeline_fatos").$type<Array<{
    dataRef: string;
    fato: string;
    fontes: Array<{
      fileId: number;
      depoente: string;
      timestampRef?: string;
    }>;
    importancia: "alta" | "media" | "baixa";
  }>>().default([]),
  mapaAtores: jsonb("mapa_atores").$type<Array<{
    nome: string;
    papel: string;
    mencionadoPor: Array<{
      fileId: number;
      depoente: string;
      contexto: string;
    }>;
    relacoes: Array<{
      com: string;
      tipo: string;
    }>;
  }>>().default([]),
  providenciasAgregadas: jsonb("providencias_agregadas").$type<string[]>().default([]),
  sourceFileIds: jsonb("source_file_ids").$type<number[]>().default([]),
  analysisCount: integer("analysis_count").notNull().default(0),
  modelVersion: varchar("model_version", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("cross_analyses_assistido_idx").on(table.assistidoId),
]);

export type CrossAnalysis = typeof crossAnalyses.$inferSelect;
export type InsertCrossAnalysis = typeof crossAnalyses.$inferInsert;
