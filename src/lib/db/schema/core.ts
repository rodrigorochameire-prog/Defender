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
  uniqueIndex,
  jsonb,
  numeric,
  unique,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import {
  atribuicaoEnum,
  statusPrisionalEnum,
  statusDemandaEnum,
  prioridadeEnum,
  areaEnum,
  papelProcessoEnum,
  syncOrigemEnum,
} from "./enums";
import { comarcas } from "./comarcas";

// ==========================================
// USUÁRIOS (DEFENSORES)
// ==========================================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: varchar("role", { length: 20 }).default("defensor").notNull(),
  phone: text("phone"),
  oab: varchar("oab", { length: 50 }),
  comarca: varchar("comarca", { length: 100 }),
  emailVerified: boolean("email_verified").default(false).notNull(),
  approvalStatus: varchar("approval_status", { length: 20 }).default("pending").notNull(),
  supervisorId: integer("supervisor_id"),
  comarcaId: integer("comarca_id").references(() => comarcas.id).default(1).notNull(), // default 1 = Camaçari (first seed row)
  funcao: varchar("funcao", { length: 30 }),
  nucleo: varchar("nucleo", { length: 30 }),
  isAdmin: boolean("is_admin").default(false),
  podeVerTodosAssistidos: boolean("pode_ver_todos_assistidos").default(true),
  podeVerTodosProcessos: boolean("pode_ver_todos_processos").default(true),
  defensoresVinculados: jsonb("defensores_vinculados").$type<number[]>(),
  areasPrincipais: jsonb("areas_principais").$type<string[]>(),
  mustChangePassword: boolean("must_change_password").default(false),
  inviteToken: varchar("invite_token", { length: 64 }),
  expiresAt: timestamp("expires_at"),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  googleLinked: boolean("google_linked").default(false),
  microsoftLinked: boolean("microsoft_linked").default(false),
  storageProvider: varchar("storage_provider", { length: 20 }).default("google"),
  onedriveRootFolderId: varchar("onedrive_root_folder_id", { length: 100 }),
  driveFolderId: varchar("drive_folder_id", { length: 100 }),
  sheetsSpreadsheetId: varchar("sheets_spreadsheet_id", { length: 100 }),
  sheetsSpreadsheetUrl: text("sheets_spreadsheet_url"),
  sheetsSyncEnabled: boolean("sheets_sync_enabled").default(false),
  workspaceId: integer("workspace_id"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("users_role_idx").on(table.role),
  index("users_approval_status_idx").on(table.approvalStatus),
  index("users_deleted_at_idx").on(table.deletedAt),
  index("users_comarca_idx").on(table.comarca),
  index("users_comarca_id_idx").on(table.comarcaId),
  index("users_supervisor_id_idx").on(table.supervisorId),
  index("users_nucleo_idx").on(table.nucleo),
  index("users_workspace_id_idx").on(table.workspaceId),
]);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ==========================================
// ASSISTIDOS (Centro da Aplicação)
// ==========================================

export const assistidos = pgTable("assistidos", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  cpf: varchar("cpf", { length: 14 }),
  rg: varchar("rg", { length: 20 }),
  nomeMae: text("nome_mae"),
  nomePai: text("nome_pai"),
  dataNascimento: date("data_nascimento"),
  naturalidade: varchar("naturalidade", { length: 100 }),
  nacionalidade: varchar("nacionalidade", { length: 50 }).default("Brasileira"),
  statusPrisional: statusPrisionalEnum("status_prisional").default("SOLTO"),
  localPrisao: text("local_prisao"),
  unidadePrisional: text("unidade_prisional"),
  dataPrisao: date("data_prisao"),
  telefone: varchar("telefone", { length: 20 }),
  telefoneContato: varchar("telefone_contato", { length: 20 }),
  nomeContato: text("nome_contato"),
  parentescoContato: varchar("parentesco_contato", { length: 50 }),
  endereco: text("endereco"),
  photoUrl: text("photo_url"),
  observacoes: text("observacoes"),
  defensorId: integer("defensor_id").references(() => users.id),
  atribuicaoPrimaria: atribuicaoEnum("atribuicao_primaria").default("SUBSTITUICAO"),
  driveFolderId: text("drive_folder_id"),
  sigadId: varchar("sigad_id", { length: 20 }),
  sigadExportadoEm: timestamp("sigad_exportado_em"),
  solarExportadoEm: timestamp("solar_exportado_em"),
  analysisStatus: varchar("analysis_status", { length: 20 }),
  analysisData: jsonb("analysis_data").$type<{
    resumo?: string;
    achadosChave?: string[];
    recomendacoes?: string[];
    inconsistencias?: string[];
    fonte?: string;
    kpis?: {
      totalPessoas: number;
      totalAcusacoes: number;
      totalDocumentosAnalisados: number;
      totalEventos: number;
      totalNulidades: number;
      totalRelacoes: number;
    };
    documentosProcessados?: number;
    documentosTotal?: number;
    ultimoDocumentoProcessado?: string;
    versaoModelo?: string;
  }>(),
  analyzedAt: timestamp("analyzed_at"),
  analysisVersion: integer("analysis_version").default(0),
  origemCadastro: varchar("origem_cadastro", { length: 20 }).default("manual"),
  duplicataSugerida: jsonb("duplicata_sugerida").$type<{
    assistidoId: number;
    nome: string;
    confidence: number;
  } | null>(),
  comarcaId: integer("comarca_id").references(() => comarcas.id).default(1).notNull(), // default 1 = Camaçari (first seed row)
  workspaceId: integer("workspace_id"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("assistidos_nome_idx").on(table.nome),
  index("assistidos_cpf_idx").on(table.cpf),
  index("assistidos_status_prisional_idx").on(table.statusPrisional),
  index("assistidos_defensor_id_idx").on(table.defensorId),
  index("assistidos_deleted_at_idx").on(table.deletedAt),
  index("assistidos_atribuicao_primaria_idx").on(table.atribuicaoPrimaria),
  index("assistidos_analysis_status_idx").on(table.analysisStatus),
  index("assistidos_comarca_id_idx").on(table.comarcaId),
  index("assistidos_workspace_id_idx").on(table.workspaceId),
]);

export type Assistido = typeof assistidos.$inferSelect;
export type InsertAssistido = typeof assistidos.$inferInsert;

// ==========================================
// PROCESSOS (Ligados ao Assistido)
// ==========================================

export const processos = pgTable("processos", {
  id: serial("id").primaryKey(),
  assistidoId: integer("assistido_id")
    .notNull()
    .references(() => assistidos.id, { onDelete: "cascade" }),
  atribuicao: atribuicaoEnum("atribuicao").notNull().default("SUBSTITUICAO"),
  numeroAutos: text("numero_autos").notNull(),
  numeroAntigo: text("numero_antigo"),
  comarca: varchar("comarca", { length: 100 }),
  comarcaId: integer("comarca_id").references(() => comarcas.id).default(1).notNull(), // default 1 = Camaçari (first seed row)
  vara: varchar("vara", { length: 100 }),
  area: areaEnum("area").notNull(),
  classeProcessual: varchar("classe_processual", { length: 100 }),
  assunto: text("assunto"),
  valorCausa: integer("valor_causa"),
  parteContraria: text("parte_contraria"),
  advogadoContrario: text("advogado_contrario"),
  fase: varchar("fase", { length: 50 }),
  situacao: varchar("situacao", { length: 50 }).default("ativo"),
  isJuri: boolean("is_juri").default(false),
  dataSessaoJuri: timestamp("data_sessao_juri"),
  resultadoJuri: text("resultado_juri"),
  defensorId: integer("defensor_id").references(() => users.id),
  observacoes: text("observacoes"),
  linkDrive: text("link_drive"),
  driveFolderId: text("drive_folder_id"),
  casoId: integer("caso_id"),
  tipoProcesso: varchar("tipo_processo", { length: 30 }).default("AP"),
  isReferencia: boolean("is_referencia").default(false),
  analysisStatus: varchar("analysis_status", { length: 20 }),
  analysisData: jsonb("analysis_data").$type<Record<string, any>>(),
  analyzedAt: timestamp("analyzed_at"),
  analysisVersion: integer("analysis_version").default(0),

  // Geolocalização do fato
  localDoFatoEndereco: text("local_do_fato_endereco"),
  localDoFatoLat: numeric("local_do_fato_lat", { precision: 10, scale: 7 }),
  localDoFatoLng: numeric("local_do_fato_lng", { precision: 10, scale: 7 }),

  workspaceId: integer("workspace_id"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("processos_assistido_id_idx").on(table.assistidoId),
  index("processos_numero_autos_idx").on(table.numeroAutos),
  index("processos_comarca_idx").on(table.comarca),
  index("processos_area_idx").on(table.area),
  index("processos_is_juri_idx").on(table.isJuri),
  index("processos_defensor_id_idx").on(table.defensorId),
  index("processos_situacao_idx").on(table.situacao),
  index("processos_deleted_at_idx").on(table.deletedAt),
  index("processos_caso_id_idx").on(table.casoId),
  index("processos_analysis_status_idx").on(table.analysisStatus),
  index("processos_comarca_id_idx").on(table.comarcaId),
  index("processos_local_fato_geo_idx").on(table.localDoFatoLat, table.localDoFatoLng),
  index("processos_workspace_id_idx").on(table.workspaceId),
]);

export type Processo = typeof processos.$inferSelect;
export type InsertProcesso = typeof processos.$inferInsert;

// ==========================================
// DEMANDAS/PRAZOS (Coração da Gestão)
// ==========================================

export const demandas = pgTable("demandas", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  assistidoId: integer("assistido_id")
    .notNull()
    .references(() => assistidos.id, { onDelete: "cascade" }),
  ato: text("ato").notNull(),
  tipoAto: varchar("tipo_ato", { length: 50 }),
  prazo: date("prazo"),
  dataEntrada: date("data_entrada"),
  dataIntimacao: date("data_intimacao"),
  dataExpedicao: date("data_expedicao"),
  dataConclusao: timestamp("data_conclusao"),
  tipoPrazoId: integer("tipo_prazo_id"),
  status: statusDemandaEnum("status").default("5_TRIAGEM"),
  substatus: varchar("substatus", { length: 50 }),
  prioridade: prioridadeEnum("prioridade").default("NORMAL"),
  providencias: text("providencias"),
  providenciaResumo: varchar("providencia_resumo", { length: 100 }),
  defensorId: integer("defensor_id").references(() => users.id),
  delegadoParaId: integer("delegado_para_id").references(() => users.id),
  dataDelegacao: timestamp("data_delegacao"),
  motivoDelegacao: text("motivo_delegacao"),
  statusDelegacao: varchar("status_delegacao", { length: 20 }),
  prazoSugerido: date("prazo_sugerido"),
  reuPreso: boolean("reu_preso").default(false),
  googleCalendarEventId: text("google_calendar_event_id"),
  casoId: integer("caso_id"),
  ordemManual: integer("ordem_manual"),
  importBatchId: text("import_batch_id"),
  ordemOriginal: integer("ordem_original"),
  enrichmentData: jsonb("enrichment_data").$type<{
    crime?: string;
    artigos?: string[];
    qualificadoras?: string[];
    fase_processual?: string;
    atribuicao_detectada?: string;
    reu_preso_detectado?: boolean;
    intimado?: string;
    correus?: string[];
    vitima?: string;
    urgencia?: string;
    confidence?: number;
    tipo_documento_pje?: string;
    tipo_processo?: string;
    id_documento_pje?: string;
    vara?: string;
  }>(),
  workspaceId: integer("workspace_id"),
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  syncedAt: timestamp("synced_at"),
}, (table) => [
  index("demandas_processo_id_idx").on(table.processoId),
  index("demandas_assistido_id_idx").on(table.assistidoId),
  index("demandas_prazo_idx").on(table.prazo),
  index("demandas_status_idx").on(table.status),
  index("demandas_prioridade_idx").on(table.prioridade),
  index("demandas_delegado_para_id_idx").on(table.delegadoParaId),
  index("demandas_defensor_id_idx").on(table.defensorId),
  index("demandas_reu_preso_idx").on(table.reuPreso),
  index("demandas_deleted_at_idx").on(table.deletedAt),
  index("demandas_caso_id_idx").on(table.casoId),
  index("demandas_import_batch_id_idx").on(table.importBatchId),
  index("demandas_workspace_id_idx").on(table.workspaceId),
]);

export type Demanda = typeof demandas.$inferSelect;
export type InsertDemanda = typeof demandas.$inferInsert;

// ==========================================
// HISTÓRICO DE DELEGAÇÕES
// ==========================================

export const delegacoesHistorico = pgTable("delegacoes_historico", {
  id: serial("id").primaryKey(),
  demandaId: integer("demanda_id")
    .references(() => demandas.id, { onDelete: "cascade" }),
  delegadoDeId: integer("delegado_de_id")
    .notNull()
    .references(() => users.id),
  delegadoParaId: integer("delegado_para_id")
    .notNull()
    .references(() => users.id),
  dataDelegacao: timestamp("data_delegacao").defaultNow().notNull(),
  dataAceitacao: timestamp("data_aceitacao"),
  dataConclusao: timestamp("data_conclusao"),
  tipo: varchar("tipo", { length: 30 }).default("delegacao_generica"),
  instrucoes: text("instrucoes"),
  orientacoes: text("orientacoes"),
  observacoes: text("observacoes"),
  prazoSugerido: date("prazo_sugerido"),
  status: varchar("status", { length: 25 }).default("pendente").notNull(),
  assistidoId: integer("assistido_id").references(() => assistidos.id),
  processoId: integer("processo_id").references(() => processos.id),
  prioridade: varchar("prioridade", { length: 10 }).default("NORMAL"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("delegacoes_historico_demanda_id_idx").on(table.demandaId),
  index("delegacoes_historico_delegado_de_id_idx").on(table.delegadoDeId),
  index("delegacoes_historico_delegado_para_id_idx").on(table.delegadoParaId),
  index("delegacoes_historico_status_idx").on(table.status),
  index("delegacoes_historico_tipo_idx").on(table.tipo),
  index("delegacoes_historico_assistido_id_idx").on(table.assistidoId),
  index("delegacoes_historico_processo_id_idx").on(table.processoId),
]);

export type DelegacaoHistorico = typeof delegacoesHistorico.$inferSelect;
export type InsertDelegacaoHistorico = typeof delegacoesHistorico.$inferInsert;

// ==========================================
// AFASTAMENTOS (Cobertura entre Defensores)
// ==========================================

export const afastamentos = pgTable("afastamentos", {
  id: serial("id").primaryKey(),
  defensorId: integer("defensor_id")
    .notNull()
    .references(() => users.id),
  substitutoId: integer("substituto_id")
    .notNull()
    .references(() => users.id),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim"),
  tipo: varchar("tipo", { length: 20 }).default("FERIAS").notNull(),
  motivo: text("motivo"),
  ativo: boolean("ativo").default(true).notNull(),
  acessoDemandas: boolean("acesso_demandas").default(true),
  acessoEquipe: boolean("acesso_equipe").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("afastamentos_defensor_id_idx").on(table.defensorId),
  index("afastamentos_substituto_id_idx").on(table.substitutoId),
  index("afastamentos_ativo_idx").on(table.ativo),
  index("afastamentos_data_inicio_idx").on(table.dataInicio),
]);

export type Afastamento = typeof afastamentos.$inferSelect;
export type InsertAfastamento = typeof afastamentos.$inferInsert;

// ==========================================
// VINCULAÇÃO ASSISTIDOS-PROCESSOS (MUITOS-PARA-MUITOS)
// ==========================================

export const assistidosProcessos = pgTable("assistidos_processos", {
  id: serial("id").primaryKey(),
  assistidoId: integer("assistido_id")
    .notNull()
    .references(() => assistidos.id, { onDelete: "cascade" }),
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  papel: papelProcessoEnum("papel").default("REU").notNull(),
  isPrincipal: boolean("is_principal").default(true),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("assistidos_processos_assistido_id_idx").on(table.assistidoId),
  index("assistidos_processos_processo_id_idx").on(table.processoId),
  index("assistidos_processos_papel_idx").on(table.papel),
  uniqueIndex("assistidos_processos_unique_idx").on(table.assistidoId, table.processoId, table.papel),
]);

export type AssistidoProcesso = typeof assistidosProcessos.$inferSelect;
export type InsertAssistidoProcesso = typeof assistidosProcessos.$inferInsert;

// ==========================================
// USER SETTINGS
// ==========================================

export const userSettings = pgTable("user_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  settings: jsonb("settings").default({}).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("user_settings_user_id_idx").on(table.userId),
]);

export type UserSettings = typeof userSettings.$inferSelect;
export type InsertUserSettings = typeof userSettings.$inferInsert;

// ==========================================
// USER INVITATIONS
// ==========================================

export const userInvitations = pgTable("user_invitations", {
  id: serial("id").primaryKey(),
  email: text("email").notNull(),
  nome: text("nome").notNull(),
  token: varchar("token", { length: 64 }).notNull().unique(),
  nucleo: varchar("nucleo", { length: 30 }),
  funcao: varchar("funcao", { length: 30 }).default("defensor_titular"),
  oab: varchar("oab", { length: 50 }),
  comarcaId: integer("comarca_id").references(() => comarcas.id).default(1).notNull(),
  podeVerTodosAssistidos: boolean("pode_ver_todos_assistidos").default(true),
  podeVerTodosProcessos: boolean("pode_ver_todos_processos").default(true),
  mensagem: text("mensagem"),
  invitedById: integer("invited_by_id").references(() => users.id, { onDelete: "set null" }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  acceptedUserId: integer("accepted_user_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("user_invitations_email_idx").on(table.email),
  index("user_invitations_token_idx").on(table.token),
  index("user_invitations_status_idx").on(table.status),
]);

export type UserInvitation = typeof userInvitations.$inferSelect;
export type InsertUserInvitation = typeof userInvitations.$inferInsert;

// ==========================================
// HANDOFF CONFIG (INFORMAÇÕES POR COMARCA)
// ==========================================

export const handoffConfig = pgTable("handoff_config", {
  id: serial("id").primaryKey(),
  comarca: text("comarca").notNull().unique(),
  defensor2grauInfo: text("defensor_2grau_info"),
  defensorEPInfo: text("defensor_ep_info"),
  nucleoEPEndereco: text("nucleo_ep_endereco"),
  nucleoEPTelefone: text("nucleo_ep_telefone"),
  nucleoEPHorario: text("nucleo_ep_horario"),
  mensagemPersonalizada: text("mensagem_personalizada"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("handoff_config_comarca_idx").on(table.comarca),
]);

// ==========================================
// DEFENSOR PARCEIROS
// ==========================================
export const defensorParceiros = pgTable("defensor_parceiros", {
  id: serial("id").primaryKey(),
  defensorId: integer("defensor_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  parceiroId: integer("parceiro_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("defensor_parceiros_defensor_idx").on(table.defensorId),
  index("defensor_parceiros_parceiro_idx").on(table.parceiroId),
  unique("defensor_parceiros_unique").on(table.defensorId, table.parceiroId),
]);
export type DefensorParceiro = typeof defensorParceiros.$inferSelect;
export type InsertDefensorParceiro = typeof defensorParceiros.$inferInsert;

// ==========================================
// SYNC LOG
// ==========================================

export const syncLog = pgTable("sync_log", {
  id: serial("id").primaryKey(),
  demandaId: integer("demanda_id").references(() => demandas.id, { onDelete: "cascade" }),
  campo: varchar("campo", { length: 50 }).notNull(),
  valorBanco: text("valor_banco"),
  valorPlanilha: text("valor_planilha"),
  origem: syncOrigemEnum("origem").notNull(),
  bancoUpdatedAt: timestamp("banco_updated_at"),
  planilhaUpdatedAt: timestamp("planilha_updated_at"),
  conflito: boolean("conflito").default(false),
  resolvidoEm: timestamp("resolvido_em"),
  resolvidoPor: varchar("resolvido_por", { length: 100 }),
  resolvidoValor: text("resolvido_valor"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type SyncLogEntry = typeof syncLog.$inferSelect;
export type InsertSyncLog = typeof syncLog.$inferInsert;

// ==========================================
// CHAT HISTORY (Skills)
// ==========================================

export const chatHistory = pgTable("chat_history", {
  id: serial("id").primaryKey(),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id),
  role: varchar("role", { length: 20 }).notNull(),
  content: text("content").notNull(),
  skillId: varchar("skill_id", { length: 50 }),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type ChatHistoryEntry = typeof chatHistory.$inferSelect;
export type InsertChatHistory = typeof chatHistory.$inferInsert;

// ==========================================
// ANALYSIS JOBS (Worker Queue)
// ==========================================

export const analysisJobs = pgTable("analysis_jobs", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").notNull().references(() => processos.id),
  skill: varchar("skill", { length: 50 }).notNull(),
  prompt: text("prompt").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  statusIdx: index("analysis_jobs_status_idx").on(table.status),
  processoIdx: index("analysis_jobs_processo_idx").on(table.processoId),
}));

export type AnalysisJob = typeof analysisJobs.$inferSelect;
export type InsertAnalysisJob = typeof analysisJobs.$inferInsert;

// ==========================================
// PJE DOWNLOAD JOBS (Scraping Worker Queue)
// ==========================================

export const pjeDownloadJobs = pgTable("pje_download_jobs", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").notNull().references(() => processos.id),
  numeroProcesso: text("numero_processo").notNull(),
  atribuicao: varchar("atribuicao", { length: 30 }).notNull(),
  assistidoId: integer("assistido_id").references(() => assistidos.id),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  pdfPath: text("pdf_path"),
  pdfBytes: integer("pdf_bytes"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }),
  completedAt: timestamp("completed_at", { withTimezone: true }),
}, (table) => ({
  statusIdx: index("pje_download_jobs_status_idx").on(table.status),
  processoIdx: index("pje_download_jobs_processo_idx").on(table.processoId),
}));

export type PjeDownloadJob = typeof pjeDownloadJobs.$inferSelect;
export type InsertPjeDownloadJob = typeof pjeDownloadJobs.$inferInsert;

// ==========================================
// SCAN INTIMAÇÕES JOBS (Worker Queue)
// ==========================================

export const scanIntimacoesJobs = pgTable("scan_intimacoes_jobs", {
  id: serial("id").primaryKey(),
  numeroProcesso: varchar("numero_processo", { length: 30 }).notNull(),
  assistidoNome: varchar("assistido_nome", { length: 200 }).notNull(),
  atribuicao: varchar("atribuicao", { length: 50 }).notNull(),
  idDocumento: varchar("id_documento", { length: 30 }),
  driveBasePath: text("drive_base_path"),
  status: varchar("status", { length: 20 }).notNull().default("pending"),
  atoSugerido: varchar("ato_sugerido", { length: 100 }),
  atoConfianca: varchar("ato_confianca", { length: 10 }),
  providencias: text("providencias"),
  audienciaData: varchar("audiencia_data", { length: 10 }),
  audienciaHora: varchar("audiencia_hora", { length: 5 }),
  audienciaTipo: varchar("audiencia_tipo", { length: 50 }),
  pdfPath: text("pdf_path"),
  conteudoResumo: text("conteudo_resumo"),
  error: text("error"),
  batchId: varchar("batch_id", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  statusIdx: index("scan_jobs_status_idx").on(table.status),
  batchIdx: index("scan_jobs_batch_idx").on(table.batchId),
}));

export type ScanIntimacoesJob = typeof scanIntimacoesJobs.$inferSelect;
export type InsertScanIntimacoesJob = typeof scanIntimacoesJobs.$inferInsert;
