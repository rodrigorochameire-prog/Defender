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
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================================
// ENUMS JURÍDICOS
// ==========================================

// O Coração da Divisão - Atribuições/Workspaces
export const atribuicaoEnum = pgEnum("atribuicao", [
  "JURI_CAMACARI",      // Vara do Júri Camaçari (Processual + Plenário Local)
  "VVD_CAMACARI",       // Violência Doméstica
  "EXECUCAO_PENAL",     // Execução Penal
  "SUBSTITUICAO",       // Substituição Criminal
  "SUBSTITUICAO_CIVEL", // Substituição Não Penal (Cível, Família, etc.)
  "GRUPO_JURI",         // Grupo Especial de Atuação (Apenas Plenários pelo Estado)
]);

// Áreas de atuação da Defensoria (compatibilidade)
export const areaEnum = pgEnum("area", [
  "JURI",
  "EXECUCAO_PENAL",
  "VIOLENCIA_DOMESTICA",
  "SUBSTITUICAO",
  "CURADORIA",
  "FAMILIA",
  "CIVEL",
  "FAZENDA_PUBLICA",
]);

// Status prisional do assistido
export const statusPrisionalEnum = pgEnum("status_prisional", [
  "SOLTO",
  "CADEIA_PUBLICA",
  "PENITENCIARIA",
  "COP",
  "HOSPITAL_CUSTODIA",
  "DOMICILIAR",
  "MONITORADO",
]);

// Status das demandas/prazos
export const statusDemandaEnum = pgEnum("status_demanda", [
  "2_ATENDER",
  "4_MONITORAR",
  "5_FILA",
  "7_PROTOCOLADO",
  "7_CIENCIA",
  "7_SEM_ATUACAO",
  "URGENTE",
  "CONCLUIDO",
  "ARQUIVADO",
]);

// Prioridade
export const prioridadeEnum = pgEnum("prioridade", [
  "BAIXA",
  "NORMAL",
  "ALTA",
  "URGENTE",
  "REU_PRESO",
]);

// Unidade/Comarca de atuação
export const unidadeEnum = pgEnum("unidade", [
  "CAMACARI",
  "CANDEIAS",
  "DIAS_DAVILA",
  "SIMOES_FILHO",
  "LAURO_DE_FREITAS",
  "SALVADOR",
]);

// Status do processo
export const statusProcessoEnum = pgEnum("status_processo", [
  "FLAGRANTE",
  "INQUERITO",
  "INSTRUCAO",
  "RECURSO",
  "EXECUCAO",
  "ARQUIVADO",
]);

// ==========================================
// WORKSPACES (Universos de dados)
// ==========================================

export const workspaces = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("workspaces_name_idx").on(table.name),
  index("workspaces_active_idx").on(table.isActive),
]);

export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = typeof workspaces.$inferInsert;

// ==========================================
// USUÁRIOS (DEFENSORES)
// ==========================================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: varchar("role", { length: 20 }).default("defensor").notNull(), // 'admin' | 'defensor' | 'estagiario' | 'servidor' | 'triagem'
  phone: text("phone"),
  oab: varchar("oab", { length: 50 }), // Número da OAB
  comarca: varchar("comarca", { length: 100 }), // Comarca de atuação
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  emailVerified: boolean("email_verified").default(false).notNull(),
  approvalStatus: varchar("approval_status", { length: 20 }).default("pending").notNull(),
  
  // Sistema de Equipe
  supervisorId: integer("supervisor_id"), // FK para users.id (defensor supervisor de estagiário)
  funcao: varchar("funcao", { length: 30 }), // Função detalhada: 'defensor_titular', 'defensor_substituto', 'servidor_administrativo', 'estagiario_direito', 'triagem'
  
  // Arquitetura Multi-Defensor
  nucleo: varchar("nucleo", { length: 30 }), // 'ESPECIALIZADOS' | 'VARA_1' | 'VARA_2' - Núcleo de atuação
  isAdmin: boolean("is_admin").default(false), // Administrador geral da comarca
  podeVerTodosAssistidos: boolean("pode_ver_todos_assistidos").default(true), // Se pode ver assistidos de outros núcleos
  podeVerTodosProcessos: boolean("pode_ver_todos_processos").default(true), // Se pode ver processos de outros núcleos
  
  // Soft delete
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("users_role_idx").on(table.role),
  index("users_approval_status_idx").on(table.approvalStatus),
  index("users_deleted_at_idx").on(table.deletedAt),
  index("users_comarca_idx").on(table.comarca),
  index("users_workspace_id_idx").on(table.workspaceId),
  index("users_supervisor_id_idx").on(table.supervisorId),
  index("users_nucleo_idx").on(table.nucleo),
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
  
  // Workspace
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  
  // Status Prisional
  statusPrisional: statusPrisionalEnum("status_prisional").default("SOLTO"),
  localPrisao: text("local_prisao"),
  unidadePrisional: text("unidade_prisional"),
  dataPrisao: date("data_prisao"),
  
  // Contato
  telefone: varchar("telefone", { length: 20 }),
  telefoneContato: varchar("telefone_contato", { length: 20 }),
  nomeContato: text("nome_contato"),
  parentescoContato: varchar("parentesco_contato", { length: 50 }),
  endereco: text("endereco"),
  
  // Foto (para identificação)
  photoUrl: text("photo_url"),
  
  // Observações
  observacoes: text("observacoes"),
  
  // Defensor responsável
  defensorId: integer("defensor_id").references(() => users.id),
  
  // Caso (Case-Centric)
  casoId: integer("caso_id"),
  
  // Metadados
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("assistidos_nome_idx").on(table.nome),
  index("assistidos_cpf_idx").on(table.cpf),
  index("assistidos_status_prisional_idx").on(table.statusPrisional),
  index("assistidos_defensor_id_idx").on(table.defensorId),
  index("assistidos_deleted_at_idx").on(table.deletedAt),
  index("assistidos_caso_id_idx").on(table.casoId),
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
  
  // ATRIBUIÇÃO - O filtro mestre para workspaces
  atribuicao: atribuicaoEnum("atribuicao").notNull().default("SUBSTITUICAO"),
  
  // Workspace
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  
  // Identificação do Processo
  numeroAutos: text("numero_autos").notNull(),
  numeroAntigo: text("numero_antigo"), // Número antigo (se houver migração)
  
  // Localização
  comarca: varchar("comarca", { length: 100 }),
  vara: varchar("vara", { length: 100 }),
  area: areaEnum("area").notNull(),
  
  // Detalhes
  classeProcessual: varchar("classe_processual", { length: 100 }),
  assunto: text("assunto"),
  valorCausa: integer("valor_causa"), // em centavos
  
  // Partes
  parteContraria: text("parte_contraria"),
  advogadoContrario: text("advogado_contrario"),
  
  // Status
  fase: varchar("fase", { length: 50 }), // 'conhecimento' | 'recursal' | 'execucao' | 'arquivado'
  situacao: varchar("situacao", { length: 50 }).default("ativo"), // 'ativo' | 'suspenso' | 'arquivado' | 'baixado'
  
  // Júri (se for processo do Júri)
  isJuri: boolean("is_juri").default(false),
  dataSessaoJuri: timestamp("data_sessao_juri"),
  resultadoJuri: text("resultado_juri"),
  
  // Defensor responsável
  defensorId: integer("defensor_id").references(() => users.id),
  
  // Observações
  observacoes: text("observacoes"),
  
  // Integração Google Drive
  linkDrive: text("link_drive"), // Link para pasta no Google Drive
  driveFolderId: text("drive_folder_id"), // ID da pasta no Drive
  
  // Caso (Case-Centric)
  casoId: integer("caso_id"),
  
  // Metadados
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
  
  // Workspace
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  
  // Identificação da Demanda
  ato: text("ato").notNull(), // ex: "Resposta à Acusação", "Apelação", "Alegações Finais"
  tipoAto: varchar("tipo_ato", { length: 50 }), // 'manifestacao' | 'recurso' | 'peticao' | 'audiencia' | 'julgamento'
  
  // Datas
  prazo: date("prazo"), // Prazo fatal
  dataEntrada: date("data_entrada"), // Data que chegou para você
  dataIntimacao: date("data_intimacao"), // Data da intimação
  dataConclusao: timestamp("data_conclusao"), // Quando foi concluído
  
  // Status
  status: statusDemandaEnum("status").default("5_FILA"),
  prioridade: prioridadeEnum("prioridade").default("NORMAL"),
  
  // Providências
  providencias: text("providencias"), // O que precisa ser feito
  
  // Responsável
  defensorId: integer("defensor_id").references(() => users.id),
  
  // Sistema de Delegação
  delegadoParaId: integer("delegado_para_id").references(() => users.id), // Quem recebeu a delegação
  dataDelegacao: timestamp("data_delegacao"), // Quando foi delegado
  motivoDelegacao: text("motivo_delegacao"), // Instruções/motivo da delegação
  statusDelegacao: varchar("status_delegacao", { length: 20 }), // 'pendente' | 'aceita' | 'em_andamento' | 'concluida' | 'devolvida'
  prazoSugerido: date("prazo_sugerido"), // Prazo sugerido para a tarefa delegada
  
  // Flag de réu preso (prioridade automática)
  reuPreso: boolean("reu_preso").default(false),
  
  // Integração Google Calendar
  googleCalendarEventId: text("google_calendar_event_id"), // ID do evento no Google Calendar
  
  // Caso (Case-Centric)
  casoId: integer("caso_id"),
  
  // Metadados
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
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
    .notNull()
    .references(() => demandas.id, { onDelete: "cascade" }),
  
  // Quem delegou e para quem
  delegadoDeId: integer("delegado_de_id")
    .notNull()
    .references(() => users.id),
  delegadoParaId: integer("delegado_para_id")
    .notNull()
    .references(() => users.id),
  
  // Timestamps
  dataDelegacao: timestamp("data_delegacao").defaultNow().notNull(),
  dataAceitacao: timestamp("data_aceitacao"),
  dataConclusao: timestamp("data_conclusao"),
  
  // Detalhes
  instrucoes: text("instrucoes"), // Instruções do defensor
  observacoes: text("observacoes"), // Observações da execução
  prazoSugerido: date("prazo_sugerido"),
  
  // Status: 'pendente' | 'aceita' | 'em_andamento' | 'concluida' | 'devolvida' | 'cancelada'
  status: varchar("status", { length: 20 }).default("pendente").notNull(),
  
  // Workspace
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("delegacoes_historico_demanda_id_idx").on(table.demandaId),
  index("delegacoes_historico_delegado_de_id_idx").on(table.delegadoDeId),
  index("delegacoes_historico_delegado_para_id_idx").on(table.delegadoParaId),
  index("delegacoes_historico_status_idx").on(table.status),
  index("delegacoes_historico_workspace_id_idx").on(table.workspaceId),
]);

export type DelegacaoHistorico = typeof delegacoesHistorico.$inferSelect;
export type InsertDelegacaoHistorico = typeof delegacoesHistorico.$inferInsert;

// ==========================================
// AFASTAMENTOS (Cobertura entre Defensores)
// ==========================================

export const afastamentos = pgTable("afastamentos", {
  id: serial("id").primaryKey(),
  
  // Defensor afastado e substituto
  defensorId: integer("defensor_id")
    .notNull()
    .references(() => users.id),
  substitutoId: integer("substituto_id")
    .notNull()
    .references(() => users.id),
  
  // Período
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim"),
  
  // Tipo: 'FERIAS' | 'LICENCA' | 'CAPACITACAO' | 'OUTRO'
  tipo: varchar("tipo", { length: 20 }).default("FERIAS").notNull(),
  motivo: text("motivo"),
  
  // Status
  ativo: boolean("ativo").default(true).notNull(),
  
  // Permissões durante o afastamento
  acessoDemandas: boolean("acesso_demandas").default(true), // Substituto pode ver demandas
  acessoEquipe: boolean("acesso_equipe").default(false), // Substituto pode gerenciar equipe
  
  // Workspace
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("afastamentos_defensor_id_idx").on(table.defensorId),
  index("afastamentos_substituto_id_idx").on(table.substitutoId),
  index("afastamentos_ativo_idx").on(table.ativo),
  index("afastamentos_data_inicio_idx").on(table.dataInicio),
  index("afastamentos_workspace_id_idx").on(table.workspaceId),
]);

export type Afastamento = typeof afastamentos.$inferSelect;
export type InsertAfastamento = typeof afastamentos.$inferInsert;

// ==========================================
// SESSÕES DO JÚRI (Plenário)
// ==========================================

export const sessoesJuri = pgTable("sessoes_juri", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  
  // Workspace
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  
  // Detalhes da Sessão
  dataSessao: timestamp("data_sessao").notNull(),
  horario: varchar("horario", { length: 10 }),
  sala: varchar("sala", { length: 50 }),
  
  // Participantes
  defensorId: integer("defensor_id").references(() => users.id),
  defensorNome: text("defensor_nome"), // Cache para facilitar
  assistidoNome: text("assistido_nome"), // Cache do nome
  
  // Status
  status: varchar("status", { length: 30 }).default("agendada"), // 'agendada' | 'realizada' | 'adiada' | 'cancelada'
  
  // Resultado
  resultado: text("resultado"), // 'absolvicao' | 'condenacao' | 'desclassificacao' | 'nulidade' | 'redesignado'
  penaAplicada: text("pena_aplicada"),
  
  // Observações
  observacoes: text("observacoes"),
  
  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("sessoes_juri_processo_id_idx").on(table.processoId),
  index("sessoes_juri_data_sessao_idx").on(table.dataSessao),
  index("sessoes_juri_defensor_id_idx").on(table.defensorId),
  index("sessoes_juri_status_idx").on(table.status),
  index("sessoes_juri_workspace_id_idx").on(table.workspaceId),
]);

export type SessaoJuri = typeof sessoesJuri.$inferSelect;
export type InsertSessaoJuri = typeof sessoesJuri.$inferInsert;

// ==========================================
// AUDIÊNCIAS
// ==========================================

export const audiencias = pgTable("audiencias", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  
  // Workspace
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  
  // Case-Centric
  casoId: integer("caso_id"),
  assistidoId: integer("assistido_id"),
  
  // Detalhes
  dataAudiencia: timestamp("data_audiencia").notNull(),
  tipo: varchar("tipo", { length: 50 }).notNull(), // 'instrucao' | 'conciliacao' | 'justificacao' | 'custodia' | 'admonicao'
  local: text("local"),
  titulo: text("titulo"),
  descricao: text("descricao"),
  sala: varchar("sala", { length: 50 }),
  horario: varchar("horario", { length: 10 }),
  
  // Participantes
  defensorId: integer("defensor_id").references(() => users.id),
  juiz: text("juiz"),
  promotor: text("promotor"),
  
  // Status
  status: varchar("status", { length: 30 }).default("agendada"), // 'agendada' | 'realizada' | 'adiada' | 'cancelada'
  
  // Resultado
  resultado: text("resultado"),
  
  // Observações
  observacoes: text("observacoes"),
  
  // Anotações com versionamento
  anotacoes: text("anotacoes"),
  anotacoesVersao: integer("anotacoes_versao").default(1),
  
  // Resumo da defesa (puxado da Teoria do Caso)
  resumoDefesa: text("resumo_defesa"),
  
  // Integração Google Calendar
  googleCalendarEventId: text("google_calendar_event_id"),
  
  // Geração de tarefas pós-audiência
  gerarPrazoApos: boolean("gerar_prazo_apos").default(false),
  prazoGeradoId: integer("prazo_gerado_id"),
  
  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("audiencias_processo_id_idx").on(table.processoId),
  index("audiencias_data_idx").on(table.dataAudiencia),
  index("audiencias_defensor_id_idx").on(table.defensorId),
  index("audiencias_status_idx").on(table.status),
  index("audiencias_tipo_idx").on(table.tipo),
  index("audiencias_caso_id_idx").on(table.casoId),
  index("audiencias_assistido_id_idx").on(table.assistidoId),
  index("audiencias_google_event_idx").on(table.googleCalendarEventId),
  index("audiencias_workspace_id_idx").on(table.workspaceId),
]);

export type Audiencia = typeof audiencias.$inferSelect;
export type InsertAudiencia = typeof audiencias.$inferInsert;

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
  tipo: varchar("tipo", { length: 50 }), // 'despacho' | 'decisao' | 'sentenca' | 'peticao' | 'intimacao'
  
  // Origem
  origem: varchar("origem", { length: 20 }).default("manual"), // 'manual' | 'push_tj' | 'importacao'
  
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
// DOCUMENTOS (Peças e Anexos)
// ==========================================

export const documentos = pgTable("documentos", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "cascade" }),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "cascade" }),
  demandaId: integer("demanda_id").references(() => demandas.id, { onDelete: "set null" }),
  casoId: integer("caso_id").references(() => casos.id, { onDelete: "set null" }),
  
  // Workspace
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  
  // Detalhes do documento
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  categoria: varchar("categoria", { length: 50 }).notNull(), // 'peca' | 'procuracao' | 'documento_pessoal' | 'comprovante' | 'outro'
  tipoPeca: varchar("tipo_peca", { length: 100 }), // 'resposta_acusacao' | 'alegacoes_finais' | 'apelacao' | 'agravo' | etc
  
  // Arquivo
  fileUrl: text("file_url").notNull(),
  fileKey: text("file_key"),
  fileName: varchar("file_name", { length: 255 }),
  mimeType: varchar("mime_type", { length: 100 }),
  fileSize: integer("file_size"),
  
  // Template
  isTemplate: boolean("is_template").default(false), // Se é um modelo reutilizável
  
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
  index("documentos_workspace_id_idx").on(table.workspaceId),
]);

export type Documento = typeof documentos.$inferSelect;
export type InsertDocumento = typeof documentos.$inferInsert;

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
  tipo: varchar("tipo", { length: 30 }).default("nota"), // 'nota' | 'providencia' | 'lembrete' | 'atendimento'
  
  // Prioridade
  importante: boolean("importante").default(false),
  
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
]);

export type Anotacao = typeof anotacoes.$inferSelect;
export type InsertAnotacao = typeof anotacoes.$inferInsert;

// ==========================================
// EVENTOS DO CALENDÁRIO
// ==========================================

export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  eventDate: timestamp("event_date").notNull(),
  endDate: timestamp("end_date"),
  eventType: varchar("event_type", { length: 100 }).notNull(), // 'prazo', 'audiencia', 'juri', 'reuniao', 'atendimento'
  
  // Relacionamentos
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "cascade" }),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "cascade" }),
  demandaId: integer("demanda_id").references(() => demandas.id, { onDelete: "set null" }),
  
  // Workspace
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  
  isAllDay: boolean("is_all_day").default(true).notNull(),
  color: varchar("color", { length: 20 }),
  location: varchar("location", { length: 200 }),
  notes: text("notes"),
  
  // Lembrete
  reminderMinutes: integer("reminder_minutes"),
  priority: varchar("priority", { length: 20 }).default("normal"),
  status: varchar("status", { length: 20 }).default("scheduled"), // 'scheduled' | 'completed' | 'cancelled'
  
  // Recorrência
  isRecurring: boolean("is_recurring").default(false),
  recurrenceType: varchar("recurrence_type", { length: 20 }),
  recurrenceInterval: integer("recurrence_interval").default(1),
  recurrenceEndDate: timestamp("recurrence_end_date"),
  recurrenceCount: integer("recurrence_count"),
  recurrenceDays: varchar("recurrence_days", { length: 50 }),
  parentEventId: integer("parent_event_id"),
  
  // Soft delete
  deletedAt: timestamp("deleted_at"),
  
  // Metadados
  createdById: integer("created_by_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("calendar_events_event_date_idx").on(table.eventDate),
  index("calendar_events_processo_id_idx").on(table.processoId),
  index("calendar_events_assistido_id_idx").on(table.assistidoId),
  index("calendar_events_event_type_idx").on(table.eventType),
  index("calendar_events_status_idx").on(table.status),
  index("calendar_events_deleted_at_idx").on(table.deletedAt),
  index("calendar_events_date_range_idx").on(table.eventDate, table.endDate),
  index("calendar_events_workspace_id_idx").on(table.workspaceId),
]);

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;

// ==========================================
// NOTIFICAÇÕES
// ==========================================

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "cascade" }),
  demandaId: integer("demanda_id").references(() => demandas.id, { onDelete: "set null" }),
  
  type: varchar("type", { length: 100 }).notNull(), // 'info' | 'warning' | 'success' | 'error' | 'prazo'
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  actionUrl: text("action_url"),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("notifications_user_id_idx").on(table.userId),
  index("notifications_is_read_idx").on(table.isRead),
  index("notifications_user_unread_idx").on(table.userId, table.isRead),
]);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ==========================================
// CONFIGURAÇÕES WHATSAPP
// ==========================================

export const whatsappConfig = pgTable("whatsapp_config", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  
  // Credenciais
  accessToken: text("access_token"),
  phoneNumberId: text("phone_number_id"),
  businessAccountId: text("business_account_id"),
  webhookVerifyToken: text("webhook_verify_token"),
  
  // Informações
  displayPhoneNumber: text("display_phone_number"),
  verifiedName: text("verified_name"),
  qualityRating: varchar("quality_rating", { length: 20 }),
  
  // Status
  isActive: boolean("is_active").default(false).notNull(),
  lastVerifiedAt: timestamp("last_verified_at"),
  
  // Configurações
  autoNotifyPrazo: boolean("auto_notify_prazo").default(false).notNull(),
  autoNotifyAudiencia: boolean("auto_notify_audiencia").default(false).notNull(),
  autoNotifyJuri: boolean("auto_notify_juri").default(false).notNull(),
  autoNotifyMovimentacao: boolean("auto_notify_movimentacao").default(false).notNull(),
  
  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("whatsapp_config_admin_id_idx").on(table.adminId),
  index("whatsapp_config_is_active_idx").on(table.isActive),
]);

export type WhatsAppConfig = typeof whatsappConfig.$inferSelect;
export type InsertWhatsAppConfig = typeof whatsappConfig.$inferInsert;

// ==========================================
// MENSAGENS WHATSAPP
// ==========================================

export const whatsappMessages = pgTable("whatsapp_messages", {
  id: serial("id").primaryKey(),
  configId: integer("config_id")
    .notNull()
    .references(() => whatsappConfig.id, { onDelete: "cascade" }),
  
  // Destinatário
  toPhone: text("to_phone").notNull(),
  toName: text("to_name"),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "set null" }),
  
  // Mensagem
  messageType: varchar("message_type", { length: 50 }).notNull(),
  templateName: text("template_name"),
  content: text("content"),
  
  // Status
  messageId: text("message_id"),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  errorMessage: text("error_message"),
  
  // Contexto
  context: varchar("context", { length: 50 }), // 'prazo' | 'audiencia' | 'juri' | 'movimentacao' | 'manual'
  sentById: integer("sent_by_id").references(() => users.id, { onDelete: "set null" }),
  
  // Timestamps
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("whatsapp_messages_config_id_idx").on(table.configId),
  index("whatsapp_messages_assistido_id_idx").on(table.assistidoId),
  index("whatsapp_messages_status_idx").on(table.status),
  index("whatsapp_messages_context_idx").on(table.context),
  index("whatsapp_messages_created_at_idx").on(table.createdAt),
]);

export type WhatsAppMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsAppMessage = typeof whatsappMessages.$inferInsert;

// ==========================================
// TEMPLATES DE PEÇAS (Modelos)
// ==========================================

export const pecaTemplates = pgTable("peca_templates", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 200 }).notNull(),
  descricao: text("descricao"),
  tipoPeca: varchar("tipo_peca", { length: 100 }).notNull(), // 'resposta_acusacao' | 'alegacoes_finais' | 'relaxamento' | etc
  area: areaEnum("area"),
  
  // Conteúdo
  conteudo: text("conteudo"), // Conteúdo do template
  fileUrl: text("file_url"), // Ou link para arquivo
  
  // Visibilidade
  isPublic: boolean("is_public").default(false), // Se pode ser usado por todos
  
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
  titulo: text("titulo").notNull(), // ex: "Relaxamento - Excesso de Prazo"
  descricao: text("descricao"),
  
  // Conteúdo
  conteudoTexto: text("conteudo_texto"), // Texto completo para busca full-text
  arquivoUrl: text("arquivo_url"), // URL do arquivo no Supabase Storage ou Drive
  arquivoKey: text("arquivo_key"), // Key do arquivo no storage
  
  // Classificação
  tipoPeca: varchar("tipo_peca", { length: 100 }).notNull(), // 'resposta_acusacao' | 'alegacoes_finais' | 'relaxamento' | etc
  area: areaEnum("area"),
  tags: text("tags"), // JSON array de tags: ["tráfico", "nulidade", "busca domiciliar"]
  
  // Resultado
  sucesso: boolean("sucesso"), // Se a tese foi acolhida (para filtrar as melhores)
  resultadoDescricao: text("resultado_descricao"),
  
  // Referência
  processoReferencia: text("processo_referencia"), // Número do processo de referência
  
  // Visibilidade
  isPublic: boolean("is_public").default(true), // Se pode ser acessado por todos
  
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
// CALCULADORA DE PENA/PRESCRIÇÃO
// ==========================================

export const calculosPena = pgTable("calculos_pena", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "cascade" }),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "cascade" }),
  
  // Tipo de cálculo
  tipoCalculo: varchar("tipo_calculo", { length: 30 }).notNull(), // 'prescricao' | 'progressao' | 'livramento' | 'remicao'
  
  // Dados base
  penaTotal: integer("pena_total"), // em dias
  dataInicio: date("data_inicio"),
  regime: varchar("regime", { length: 20 }), // 'fechado' | 'semiaberto' | 'aberto'
  
  // Resultados
  dataResultado: date("data_resultado"),
  observacoes: text("observacoes"),
  
  // Parâmetros do cálculo
  parametros: text("parametros"), // JSON com os parâmetros usados
  
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
// MÓDULO VVD - MEDIDAS PROTETIVAS
// ==========================================

export const medidasProtetivas = pgTable("medidas_protetivas", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  assistidoId: integer("assistido_id")
    .references(() => assistidos.id, { onDelete: "set null" }),
  
  // Dados da Medida
  numeroMedida: varchar("numero_medida", { length: 50 }),
  tipoMedida: varchar("tipo_medida", { length: 100 }).notNull(), // 'afastamento_lar' | 'proibicao_contato' | 'proibicao_aproximacao' | etc
  dataDecisao: date("data_decisao"),
  prazoDias: integer("prazo_dias"), // Prazo em dias
  dataVencimento: date("data_vencimento"),
  
  // Distância mínima (se aplicável)
  distanciaMetros: integer("distancia_metros"),
  
  // Partes
  nomeVitima: text("nome_vitima"),
  telefoneVitima: varchar("telefone_vitima", { length: 20 }),
  
  // Status
  status: varchar("status", { length: 30 }).default("ativa"), // 'ativa' | 'expirada' | 'revogada' | 'renovada'
  
  // Observações
  observacoes: text("observacoes"),
  
  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("medidas_protetivas_processo_id_idx").on(table.processoId),
  index("medidas_protetivas_status_idx").on(table.status),
  index("medidas_protetivas_data_vencimento_idx").on(table.dataVencimento),
]);

export type MedidaProtetiva = typeof medidasProtetivas.$inferSelect;
export type InsertMedidaProtetiva = typeof medidasProtetivas.$inferInsert;

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
  dataBase: date("data_base").notNull(), // Data-base do cálculo
  penaTotal: integer("pena_total").notNull(), // Total em dias
  regimeInicial: varchar("regime_inicial", { length: 20 }), // 'fechado' | 'semiaberto' | 'aberto'
  
  // Frações de progressão
  fracaoProgressao: varchar("fracao_progressao", { length: 20 }), // '1/6' | '2/5' | '40%' | '50%' | '60%' | '70%'
  fracaoLivramento: varchar("fracao_livramento", { length: 20 }), // '1/3' | '1/2' | '2/3'
  
  // Datas calculadas
  dataProgressao: date("data_progressao"),
  dataLivramento: date("data_livramento"),
  dataTermino: date("data_termino"),
  dataSaida: date("data_saida"), // Saída temporária
  
  // Remição
  diasRemidos: integer("dias_remidos").default(0),
  diasTrabalho: integer("dias_trabalho").default(0),
  diasEstudo: integer("dias_estudo").default(0),
  
  // Crime hediondo
  isHediondo: boolean("is_hediondo").default(false),
  isPrimario: boolean("is_primario").default(true),
  
  // Status do benefício
  statusProgressao: varchar("status_progressao", { length: 30 }), // 'aguardando' | 'requerido' | 'deferido' | 'indeferido'
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
// JURADOS (Banco de Dados do Júri)
// ==========================================

export const jurados = pgTable("jurados", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  profissao: varchar("profissao", { length: 100 }),
  escolaridade: varchar("escolaridade", { length: 50 }),
  idade: integer("idade"),
  bairro: varchar("bairro", { length: 100 }),
  genero: varchar("genero", { length: 20 }),
  classeSocial: varchar("classe_social", { length: 30 }),
  perfilPsicologico: text("perfil_psicologico"),
  tendenciaVoto: integer("tendencia_voto"), // -10 (condenação) a +10 (absolvição)
  status: varchar("status", { length: 30 }), // 'aceito' | 'recusado_defesa' | 'recusado_mp' | 'sorteado'
  sessaoJuriId: integer("sessao_juri_id").references(() => sessoesJuri.id, { onDelete: "set null" }),
  
  // Estatísticas de votação
  totalSessoes: integer("total_sessoes").default(0),
  votosCondenacao: integer("votos_condenacao").default(0),
  votosAbsolvicao: integer("votos_absolvicao").default(0),
  votosDesclassificacao: integer("votos_desclassificacao").default(0),
  
  // Perfil comportamental
  perfilTendencia: varchar("perfil_tendencia", { length: 30 }), // 'condenatorio' | 'absolutorio' | 'neutro' | 'desconhecido'
  observacoes: text("observacoes"),
  
  // Histórico de anotações em JSON
  historicoNotas: text("historico_notas"), // JSON com observações por sessão
  
  // Status
  ativo: boolean("ativo").default(true),
  
  // Classificação da ata de sorteio
  reuniaoPeriodica: varchar("reuniao_periodica", { length: 10 }), // '1', '2', '3'
  tipoJurado: varchar("tipo_jurado", { length: 20 }), // 'titular' | 'suplente'
  empresa: varchar("empresa", { length: 150 }),
  
  // Metadados
  createdById: integer("created_by_id")
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("jurados_nome_idx").on(table.nome),
  index("jurados_perfil_idx").on(table.perfilTendencia),
  index("jurados_sessao_juri_id_idx").on(table.sessaoJuriId),
  index("jurados_tendencia_voto_idx").on(table.tendenciaVoto),
  index("jurados_status_idx").on(table.status),
  index("jurados_reuniao_idx").on(table.reuniaoPeriodica),
  index("jurados_tipo_idx").on(table.tipoJurado),
  index("jurados_ativo_idx").on(table.ativo),
]);

export type Jurado = typeof jurados.$inferSelect;
export type InsertJurado = typeof jurados.$inferInsert;

// ==========================================
// CONSELHO DO JÚRI (Composição por Sessão)
// ==========================================

export const conselhoJuri = pgTable("conselho_juri", {
  id: serial("id").primaryKey(),
  sessaoId: integer("sessao_id")
    .notNull()
    .references(() => sessoesJuri.id, { onDelete: "cascade" }),
  juradoId: integer("jurado_id")
    .notNull()
    .references(() => jurados.id, { onDelete: "cascade" }),
  
  // Posição no conselho (1-7)
  posicao: integer("posicao"),
  
  // Voto registrado após sessão
  voto: varchar("voto", { length: 30 }), // 'condenacao' | 'absolvicao' | 'desclassificacao' | null
  
  // Anotações durante a sessão
  anotacoes: text("anotacoes"),
  
  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("conselho_juri_sessao_idx").on(table.sessaoId),
  index("conselho_juri_jurado_idx").on(table.juradoId),
]);

export type ConselhoJuri = typeof conselhoJuri.$inferSelect;
export type InsertConselhoJuri = typeof conselhoJuri.$inferInsert;

// ==========================================
// ATENDIMENTOS
// ==========================================

export const atendimentos = pgTable("atendimentos", {
  id: serial("id").primaryKey(),
  assistidoId: integer("assistido_id")
    .notNull()
    .references(() => assistidos.id, { onDelete: "cascade" }),
  
  // Detalhes
  dataAtendimento: timestamp("data_atendimento").notNull(),
  tipo: varchar("tipo", { length: 30 }).notNull(), // 'presencial' | 'videoconferencia' | 'telefone' | 'visita_carcer'
  local: text("local"),
  
  // Resumo
  assunto: text("assunto"),
  resumo: text("resumo"),
  
  // Acompanhantes
  acompanhantes: text("acompanhantes"), // JSON com lista de acompanhantes
  
  // Status
  status: varchar("status", { length: 20 }).default("agendado"), // 'agendado' | 'realizado' | 'cancelado' | 'nao_compareceu'
  
  // Metadados
  atendidoPorId: integer("atendido_por_id")
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("atendimentos_assistido_id_idx").on(table.assistidoId),
  index("atendimentos_data_idx").on(table.dataAtendimento),
  index("atendimentos_tipo_idx").on(table.tipo),
  index("atendimentos_status_idx").on(table.status),
  index("atendimentos_atendido_por_idx").on(table.atendidoPorId),
]);

export type Atendimento = typeof atendimentos.$inferSelect;
export type InsertAtendimento = typeof atendimentos.$inferInsert;

// ==========================================
// CASOS (Entidade Mestre - Case-Centric)
// ==========================================

export const statusCasoEnum = pgEnum("status_caso", [
  "ATIVO",
  "SUSPENSO",
  "ARQUIVADO",
]);

export const faseCasoEnum = pgEnum("fase_caso", [
  "INQUERITO",
  "INSTRUCAO",
  "PLENARIO",
  "RECURSO",
  "EXECUCAO",
  "ARQUIVADO",
]);

export const tipoAudienciaEnum = pgEnum("tipo_audiencia", [
  "INSTRUCAO",
  "CUSTODIA",
  "CONCILIACAO",
  "JUSTIFICACAO",
  "ADMONICAO",
  "UNA",
  "PLENARIO_JURI",
  "CONTINUACAO",
  "OUTRA",
]);

export const statusAudienciaEnum = pgEnum("status_audiencia", [
  "A_DESIGNAR",
  "DESIGNADA",
  "REALIZADA",
  "AGUARDANDO_ATA",
  "CONCLUIDA",
  "ADIADA",
  "CANCELADA",
]);

export const casos = pgTable("casos", {
  id: serial("id").primaryKey(),
  
  // Identificação do Caso
  titulo: text("titulo").notNull(),              // ex: "Homicídio - Operação Reuso"
  codigo: varchar("codigo", { length: 50 }),     // Código interno opcional
  
  // Atribuição/Workspace
  atribuicao: atribuicaoEnum("atribuicao").notNull().default("SUBSTITUICAO"),
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  
  // Teoria do Caso (Tripé da Defesa)
  teoriaFatos: text("teoria_fatos"),             // Narrativa defensiva dos fatos
  teoriaProvas: text("teoria_provas"),           // Evidências que corroboram a tese
  teoriaDireito: text("teoria_direito"),         // Teses jurídicas e fundamentação
  
  // Tags para conexões inteligentes (JSON array)
  tags: text("tags"),                            // ex: ["NulidadeBusca", "LegitimaDefesa"]
  
  // Status
  status: varchar("status", { length: 30 }).default("ativo"), // 'ativo' | 'arquivado' | 'suspenso'
  fase: varchar("fase", { length: 50 }),         // 'inquerito' | 'instrucao' | 'plenario' | 'recurso' | 'execucao'
  
  // Prioridade
  prioridade: prioridadeEnum("prioridade").default("NORMAL"),
  
  // Defensor responsável
  defensorId: integer("defensor_id").references(() => users.id),
  
  // Caso conexo (self-referencing) - será configurado via SQL
  casoConexoId: integer("caso_conexo_id"),
  
  // Observações gerais
  observacoes: text("observacoes"),
  
  // Links externos
  linkDrive: text("link_drive"),                 // Pasta no Google Drive
  
  // Soft delete
  deletedAt: timestamp("deleted_at"),
  
  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("casos_titulo_idx").on(table.titulo),
  index("casos_atribuicao_idx").on(table.atribuicao),
  index("casos_status_idx").on(table.status),
  index("casos_defensor_id_idx").on(table.defensorId),
  index("casos_deleted_at_idx").on(table.deletedAt),
  index("casos_workspace_id_idx").on(table.workspaceId),
]);

export type Caso = typeof casos.$inferSelect;
export type InsertCaso = typeof casos.$inferInsert;

// ==========================================
// INTEGRAÇÃO: PERSONAS DO CASO
// ==========================================

export const casePersonas = pgTable("case_personas", {
  id: serial("id").primaryKey(),
  casoId: integer("caso_id").notNull().references(() => casos.id, { onDelete: "cascade" }),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "set null" }),
  juradoId: integer("jurado_id").references(() => jurados.id, { onDelete: "set null" }),
  nome: text("nome").notNull(),
  tipo: varchar("tipo", { length: 30 }).notNull(), // 'reu' | 'testemunha' | 'vitima' | 'perito' | 'jurado' | 'familiar'
  status: varchar("status", { length: 30 }), // 'pendente' | 'localizada' | 'intimada' | 'ouvida'
  perfil: jsonb("perfil").$type<Record<string, unknown>>(),
  contatos: jsonb("contatos").$type<Record<string, unknown>>(),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("case_personas_caso_id_idx").on(table.casoId),
  index("case_personas_tipo_idx").on(table.tipo),
  index("case_personas_status_idx").on(table.status),
  index("case_personas_assistido_id_idx").on(table.assistidoId),
  index("case_personas_jurado_id_idx").on(table.juradoId),
]);

export type CasePersona = typeof casePersonas.$inferSelect;
export type InsertCasePersona = typeof casePersonas.$inferInsert;

// ==========================================
// INTEGRAÇÃO: FATOS DO CASO
// ==========================================

export const caseFacts = pgTable("case_facts", {
  id: serial("id").primaryKey(),
  casoId: integer("caso_id").notNull().references(() => casos.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  tipo: varchar("tipo", { length: 30 }), // 'controverso' | 'incontroverso' | 'tese'
  tags: jsonb("tags").$type<string[]>(),
  status: varchar("status", { length: 20 }).default("ativo"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("case_facts_caso_id_idx").on(table.casoId),
  index("case_facts_tipo_idx").on(table.tipo),
  index("case_facts_status_idx").on(table.status),
]);

export type CaseFact = typeof caseFacts.$inferSelect;
export type InsertCaseFact = typeof caseFacts.$inferInsert;

// ==========================================
// INTEGRAÇÃO: EVIDÊNCIAS DOS FATOS
// ==========================================

export const factEvidence = pgTable("fact_evidence", {
  id: serial("id").primaryKey(),
  factId: integer("fact_id").notNull().references(() => caseFacts.id, { onDelete: "cascade" }),
  documentoId: integer("documento_id").references(() => documentos.id, { onDelete: "set null" }),
  sourceType: varchar("source_type", { length: 30 }), // 'documento' | 'depoimento' | 'video' | 'imagem'
  sourceId: text("source_id"),
  trecho: text("trecho"),
  contradicao: boolean("contradicao").default(false),
  confianca: integer("confianca"), // 0-100
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("fact_evidence_fact_id_idx").on(table.factId),
  index("fact_evidence_documento_id_idx").on(table.documentoId),
  index("fact_evidence_contradicao_idx").on(table.contradicao),
]);

export type FactEvidence = typeof factEvidence.$inferSelect;
export type InsertFactEvidence = typeof factEvidence.$inferInsert;

// ==========================================
// INTEGRAÇÃO: ROTEIRO DO JÚRI (BASEADO EM FATOS)
// ==========================================

export const juriScriptItems = pgTable("juri_script_items", {
  id: serial("id").primaryKey(),
  casoId: integer("caso_id").notNull().references(() => casos.id, { onDelete: "cascade" }),
  sessaoJuriId: integer("sessao_juri_id").references(() => sessoesJuri.id, { onDelete: "set null" }),
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
// JÚRI: TESES DEFENSIVAS (Estratégia)
// ==========================================

export const tesesDefensivas = pgTable("teses_defensivas", {
  id: serial("id").primaryKey(),
  casoId: integer("caso_id").references(() => casos.id, { onDelete: "cascade" }),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  tipo: varchar("tipo", { length: 30 }), // 'principal' | 'subsidiaria'
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
// JÚRI: ANÁLISE COMPARATIVA DE PROVAS
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
// JÚRI: ROTEIRO DE PLENÁRIO
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
// TAGS DE CASOS (Para sugestões inteligentes)
// ==========================================

export const casoTags = pgTable("caso_tags", {
  id: serial("id").primaryKey(),
  
  nome: varchar("nome", { length: 100 }).notNull().unique(),  // ex: 'NulidadeBusca', 'LegitimaDefesa'
  descricao: text("descricao"),
  cor: varchar("cor", { length: 20 }).default("slate"),       // Para UI
  
  // Contagem de uso (para ranking)
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
  
  tipoConexao: varchar("tipo_conexao", { length: 50 }),  // 'coautoria' | 'fato_conexo' | 'tese_similar' | 'mesmo_evento'
  descricao: text("descricao"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("casos_conexos_origem_idx").on(table.casoOrigemId),
  index("casos_conexos_destino_idx").on(table.casoDestinoId),
]);

export type CasoConexo = typeof casosConexos.$inferSelect;
export type InsertCasoConexo = typeof casosConexos.$inferInsert;

// ==========================================
// HISTÓRICO DE ANOTAÇÕES DE AUDIÊNCIA
// ==========================================

export const audienciasHistorico = pgTable("audiencias_historico", {
  id: serial("id").primaryKey(),
  audienciaId: integer("audiencia_id").notNull().references(() => audiencias.id, { onDelete: "cascade" }),
  
  // Versão
  versao: integer("versao").notNull(),
  anotacoes: text("anotacoes").notNull(),
  
  // Quem editou
  editadoPorId: integer("editado_por_id").references(() => users.id),
  
  // Quando
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("audiencias_hist_audiencia_idx").on(table.audienciaId),
  index("audiencias_hist_versao_idx").on(table.versao),
]);

export type AudienciaHistorico = typeof audienciasHistorico.$inferSelect;
export type InsertAudienciaHistorico = typeof audienciasHistorico.$inferInsert;

// ==========================================
// RELAÇÕES
// ==========================================

export const workspacesRelations = relations(workspaces, ({ many }) => ({
  users: many(users),
  assistidos: many(assistidos),
  processos: many(processos),
  demandas: many(demandas),
  sessoesJuri: many(sessoesJuri),
  audiencias: many(audiencias),
  documentos: many(documentos),
  calendarEvents: many(calendarEvents),
  casos: many(casos),
}));

export const usersRelations = relations(users, ({ many, one }) => ({
  workspace: one(workspaces, { fields: [users.workspaceId], references: [workspaces.id] }),
  assistidos: many(assistidos),
  processos: many(processos),
  demandas: many(demandas),
  sessoesJuri: many(sessoesJuri),
  audiencias: many(audiencias),
  notifications: many(notifications),
  atendimentos: many(atendimentos),
  casos: many(casos),
  // Sistema de Equipe
  supervisor: one(users, { fields: [users.supervisorId], references: [users.id], relationName: "supervisor" }),
  supervisionados: many(users, { relationName: "supervisor" }),
  delegacoesRecebidas: many(delegacoesHistorico, { relationName: "delegadoPara" }),
  delegacoesEnviadas: many(delegacoesHistorico, { relationName: "delegadoDe" }),
  // Afastamentos
  afastamentosComoDefensor: many(afastamentos, { relationName: "defensorAfastado" }),
  afastamentosComoSubstituto: many(afastamentos, { relationName: "defensorSubstituto" }),
}));

export const afastamentosRelations = relations(afastamentos, ({ one }) => ({
  defensor: one(users, { fields: [afastamentos.defensorId], references: [users.id], relationName: "defensorAfastado" }),
  substituto: one(users, { fields: [afastamentos.substitutoId], references: [users.id], relationName: "defensorSubstituto" }),
  workspace: one(workspaces, { fields: [afastamentos.workspaceId], references: [workspaces.id] }),
}));

export const assistidosRelations = relations(assistidos, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [assistidos.workspaceId], references: [workspaces.id] }),
  defensor: one(users, { fields: [assistidos.defensorId], references: [users.id] }),
  processos: many(processos),
  demandas: many(demandas),
  documentos: many(documentos),
  anotacoes: many(anotacoes),
  atendimentos: many(atendimentos),
  calendarEvents: many(calendarEvents),
  personas: many(casePersonas),
}));

export const processosRelations = relations(processos, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [processos.workspaceId], references: [workspaces.id] }),
  assistido: one(assistidos, { fields: [processos.assistidoId], references: [assistidos.id] }),
  defensor: one(users, { fields: [processos.defensorId], references: [users.id] }),
  demandas: many(demandas),
  sessoesJuri: many(sessoesJuri),
  audiencias: many(audiencias),
  movimentacoes: many(movimentacoes),
  documentos: many(documentos),
  anotacoes: many(anotacoes),
  calendarEvents: many(calendarEvents),
}));

export const demandasRelations = relations(demandas, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [demandas.workspaceId], references: [workspaces.id] }),
  processo: one(processos, { fields: [demandas.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [demandas.assistidoId], references: [assistidos.id] }),
  defensor: one(users, { fields: [demandas.defensorId], references: [users.id] }),
  delegadoPara: one(users, { fields: [demandas.delegadoParaId], references: [users.id], relationName: "demandasDelegadas" }),
  delegacoesHistorico: many(delegacoesHistorico),
  documentos: many(documentos),
  anotacoes: many(anotacoes),
  calendarEvents: many(calendarEvents),
}));

export const delegacoesHistoricoRelations = relations(delegacoesHistorico, ({ one }) => ({
  demanda: one(demandas, { fields: [delegacoesHistorico.demandaId], references: [demandas.id] }),
  delegadoDe: one(users, { fields: [delegacoesHistorico.delegadoDeId], references: [users.id], relationName: "delegadoDe" }),
  delegadoPara: one(users, { fields: [delegacoesHistorico.delegadoParaId], references: [users.id], relationName: "delegadoPara" }),
  workspace: one(workspaces, { fields: [delegacoesHistorico.workspaceId], references: [workspaces.id] }),
}));

export const sessoesJuriRelations = relations(sessoesJuri, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [sessoesJuri.workspaceId], references: [workspaces.id] }),
  processo: one(processos, { fields: [sessoesJuri.processoId], references: [processos.id] }),
  defensor: one(users, { fields: [sessoesJuri.defensorId], references: [users.id] }),
  jurados: many(jurados),
  conselho: many(conselhoJuri),
  scriptItems: many(juriScriptItems),
}));

export const audienciasRelations = relations(audiencias, ({ one }) => ({
  workspace: one(workspaces, { fields: [audiencias.workspaceId], references: [workspaces.id] }),
  processo: one(processos, { fields: [audiencias.processoId], references: [processos.id] }),
  defensor: one(users, { fields: [audiencias.defensorId], references: [users.id] }),
}));

export const movimentacoesRelations = relations(movimentacoes, ({ one }) => ({
  processo: one(processos, { fields: [movimentacoes.processoId], references: [processos.id] }),
  createdBy: one(users, { fields: [movimentacoes.createdById], references: [users.id] }),
}));

export const documentosRelations = relations(documentos, ({ one }) => ({
  workspace: one(workspaces, { fields: [documentos.workspaceId], references: [workspaces.id] }),
  processo: one(processos, { fields: [documentos.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [documentos.assistidoId], references: [assistidos.id] }),
  demanda: one(demandas, { fields: [documentos.demandaId], references: [demandas.id] }),
  caso: one(casos, { fields: [documentos.casoId], references: [casos.id] }),
  uploadedBy: one(users, { fields: [documentos.uploadedById], references: [users.id] }),
}));

export const anotacoesRelations = relations(anotacoes, ({ one }) => ({
  processo: one(processos, { fields: [anotacoes.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [anotacoes.assistidoId], references: [assistidos.id] }),
  demanda: one(demandas, { fields: [anotacoes.demandaId], references: [demandas.id] }),
  caso: one(casos, { fields: [anotacoes.casoId], references: [casos.id] }),
  createdBy: one(users, { fields: [anotacoes.createdById], references: [users.id] }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  workspace: one(workspaces, { fields: [calendarEvents.workspaceId], references: [workspaces.id] }),
  processo: one(processos, { fields: [calendarEvents.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [calendarEvents.assistidoId], references: [assistidos.id] }),
  demanda: one(demandas, { fields: [calendarEvents.demandaId], references: [demandas.id] }),
  createdBy: one(users, { fields: [calendarEvents.createdById], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, { fields: [notifications.userId], references: [users.id] }),
  processo: one(processos, { fields: [notifications.processoId], references: [processos.id] }),
  demanda: one(demandas, { fields: [notifications.demandaId], references: [demandas.id] }),
}));

export const whatsappConfigRelations = relations(whatsappConfig, ({ one, many }) => ({
  admin: one(users, { fields: [whatsappConfig.adminId], references: [users.id] }),
  messages: many(whatsappMessages),
}));

export const whatsappMessagesRelations = relations(whatsappMessages, ({ one }) => ({
  config: one(whatsappConfig, { fields: [whatsappMessages.configId], references: [whatsappConfig.id] }),
  assistido: one(assistidos, { fields: [whatsappMessages.assistidoId], references: [assistidos.id] }),
  sentBy: one(users, { fields: [whatsappMessages.sentById], references: [users.id] }),
}));

export const pecaTemplatesRelations = relations(pecaTemplates, ({ one }) => ({
  createdBy: one(users, { fields: [pecaTemplates.createdById], references: [users.id] }),
}));

export const calculosPenaRelations = relations(calculosPena, ({ one }) => ({
  processo: one(processos, { fields: [calculosPena.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [calculosPena.assistidoId], references: [assistidos.id] }),
  createdBy: one(users, { fields: [calculosPena.createdById], references: [users.id] }),
}));

export const atendimentosRelations = relations(atendimentos, ({ one }) => ({
  assistido: one(assistidos, { fields: [atendimentos.assistidoId], references: [assistidos.id] }),
  atendidoPor: one(users, { fields: [atendimentos.atendidoPorId], references: [users.id] }),
}));

export const bancoPecasRelations = relations(bancoPecas, ({ one }) => ({
  createdBy: one(users, { fields: [bancoPecas.createdById], references: [users.id] }),
}));

export const juradosRelations = relations(jurados, ({ one, many }) => ({
  createdBy: one(users, { fields: [jurados.createdById], references: [users.id] }),
  sessaoJuri: one(sessoesJuri, { fields: [jurados.sessaoJuriId], references: [sessoesJuri.id] }),
  conselhos: many(conselhoJuri),
  personas: many(casePersonas),
}));

export const conselhoJuriRelations = relations(conselhoJuri, ({ one }) => ({
  sessao: one(sessoesJuri, { fields: [conselhoJuri.sessaoId], references: [sessoesJuri.id] }),
  jurado: one(jurados, { fields: [conselhoJuri.juradoId], references: [jurados.id] }),
}));

// ==========================================
// RELAÇÕES: Case-Centric
// ==========================================

export const casosRelations = relations(casos, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [casos.workspaceId], references: [workspaces.id] }),
  defensor: one(users, { fields: [casos.defensorId], references: [users.id] }),
  casoConexo: one(casos, { fields: [casos.casoConexoId], references: [casos.id] }),
  assistidos: many(assistidos),
  processos: many(processos),
  demandas: many(demandas),
  audiencias: many(audiencias),
  documentos: many(documentos),
  anotacoes: many(anotacoes),
  personas: many(casePersonas),
  facts: many(caseFacts),
  scriptItems: many(juriScriptItems),
  tesesDefensivas: many(tesesDefensivas),
  depoimentosAnalise: many(depoimentosAnalise),
  roteiroPlenario: many(roteiroPlenario),
  conexoesOrigem: many(casosConexos),
}));

export const casosConexosRelations = relations(casosConexos, ({ one }) => ({
  casoOrigem: one(casos, { fields: [casosConexos.casoOrigemId], references: [casos.id] }),
  casoDestino: one(casos, { fields: [casosConexos.casoDestinoId], references: [casos.id] }),
}));

export const audienciasHistoricoRelations = relations(audienciasHistorico, ({ one }) => ({
  audiencia: one(audiencias, { fields: [audienciasHistorico.audienciaId], references: [audiencias.id] }),
  editadoPor: one(users, { fields: [audienciasHistorico.editadoPorId], references: [users.id] }),
}));

export const tesesDefensivasRelations = relations(tesesDefensivas, ({ one }) => ({
  caso: one(casos, { fields: [tesesDefensivas.casoId], references: [casos.id] }),
}));

export const casePersonasRelations = relations(casePersonas, ({ one, many }) => ({
  caso: one(casos, { fields: [casePersonas.casoId], references: [casos.id] }),
  assistido: one(assistidos, { fields: [casePersonas.assistidoId], references: [assistidos.id] }),
  jurado: one(jurados, { fields: [casePersonas.juradoId], references: [jurados.id] }),
  scriptItems: many(juriScriptItems),
}));

export const caseFactsRelations = relations(caseFacts, ({ one, many }) => ({
  caso: one(casos, { fields: [caseFacts.casoId], references: [casos.id] }),
  evidences: many(factEvidence),
  scriptItems: many(juriScriptItems),
}));

export const factEvidenceRelations = relations(factEvidence, ({ one }) => ({
  fact: one(caseFacts, { fields: [factEvidence.factId], references: [caseFacts.id] }),
  documento: one(documentos, { fields: [factEvidence.documentoId], references: [documentos.id] }),
}));

export const depoimentosAnaliseRelations = relations(depoimentosAnalise, ({ one }) => ({
  caso: one(casos, { fields: [depoimentosAnalise.casoId], references: [casos.id] }),
  persona: one(casePersonas, { fields: [depoimentosAnalise.personaId], references: [casePersonas.id] }),
}));

export const roteiroPlenarioRelations = relations(roteiroPlenario, ({ one }) => ({
  caso: one(casos, { fields: [roteiroPlenario.casoId], references: [casos.id] }),
}));

export const juriScriptItemsRelations = relations(juriScriptItems, ({ one }) => ({
  caso: one(casos, { fields: [juriScriptItems.casoId], references: [casos.id] }),
  sessaoJuri: one(sessoesJuri, { fields: [juriScriptItems.sessaoJuriId], references: [sessoesJuri.id] }),
  persona: one(casePersonas, { fields: [juriScriptItems.personaId], references: [casePersonas.id] }),
  fact: one(caseFacts, { fields: [juriScriptItems.factId], references: [caseFacts.id] }),
}));

// ==========================================
// SINCRONIZAÇÃO GOOGLE DRIVE
// ==========================================

// Enum para direção de sincronização
export const syncDirectionEnum = pgEnum("sync_direction", [
  "bidirectional",
  "drive_to_app",
  "app_to_drive",
]);

// Enum para status de sincronização
export const syncStatusEnum = pgEnum("sync_status", [
  "synced",
  "pending_upload",
  "pending_download",
  "conflict",
  "error",
]);

// Pastas configuradas para sincronização
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

// Arquivos sincronizados do Drive
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
]);

export type DriveFile = typeof driveFiles.$inferSelect;
export type InsertDriveFile = typeof driveFiles.$inferInsert;

// Logs de sincronização
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

// Webhooks do Drive
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

// Relações do Drive
export const driveSyncFoldersRelations = relations(driveSyncFolders, ({ one, many }) => ({
  createdBy: one(users, { fields: [driveSyncFolders.createdById], references: [users.id] }),
}));

export const driveFilesRelations = relations(driveFiles, ({ one, many }) => ({
  processo: one(processos, { fields: [driveFiles.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [driveFiles.assistidoId], references: [assistidos.id] }),
  documento: one(documentos, { fields: [driveFiles.documentoId], references: [documentos.id] }),
  createdBy: one(users, { fields: [driveFiles.createdById], references: [users.id] }),
  parent: one(driveFiles, { fields: [driveFiles.parentFileId], references: [driveFiles.id] }),
}));

export const driveSyncLogsRelations = relations(driveSyncLogs, ({ one }) => ({
  user: one(users, { fields: [driveSyncLogs.userId], references: [users.id] }),
}));

// ==========================================
// PEÇAS PROCESSUAIS ESTRUTURADAS
// (Denúncia, Pronúncia, Laudos, Atas, etc.)
// ==========================================

export const tipoPecaProcessualEnum = pgEnum("tipo_peca_processual", [
  "DENUNCIA",               // Denúncia do MP
  "QUEIXA_CRIME",          // Queixa-crime
  "PRONUNCIA",             // Decisão de pronúncia
  "IMPRONUNCIA",           // Decisão de impronúncia
  "ABSOLVICAO_SUMARIA",    // Absolvição sumária
  "SENTENCA",              // Sentença
  "ACORDAO",               // Acórdão
  "LAUDO_PERICIAL",        // Laudo pericial
  "LAUDO_CADAVERICO",      // Laudo cadavérico
  "LAUDO_PSIQUIATRICO",    // Laudo psiquiátrico
  "LAUDO_TOXICOLOGICO",    // Laudo toxicológico
  "ATA_AUDIENCIA",         // Ata de audiência
  "ATA_INTERROGATORIO",    // Ata de interrogatório
  "ATA_PLENARIO",          // Ata de plenário
  "DEPOIMENTO",            // Depoimento/Testemunho
  "BOLETIM_OCORRENCIA",    // B.O.
  "AUTO_PRISAO",           // Auto de prisão em flagrante
  "MANDADO",               // Mandado (busca, prisão, etc.)
  "DECISAO_INTERLOCUTORIA", // Decisão interlocutória
  "QUESITOS",              // Quesitos do júri
  "MEMORIAL",              // Memorial
  "OUTRO",                 // Outros documentos
]);

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
  
  // Conteúdo extraído (para busca e IA)
  conteudoTexto: text("conteudo_texto"),  // Texto extraído do PDF/documento
  resumoIA: text("resumo_ia"),             // Resumo gerado por IA
  pontosCriticos: text("pontos_criticos"), // JSON: pontos importantes identificados por IA
  
  // Metadados específicos por tipo de peça (JSON)
  metadados: text("metadados"), // JSON com dados específicos: autor da peça, juiz, promotor, etc.
  
  // Para peças importantes (aparece em destaque)
  isDestaque: boolean("is_destaque").default(false),
  
  // Ordem de exibição
  ordemExibicao: integer("ordem_exibicao").default(0),
  
  // Tags para filtro
  tags: text("tags"), // JSON array
  
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
// ANÁLISES DE IA (GEMINI)
// Armazena análises estratégicas geradas por IA
// ==========================================

export const tipoAnaliseIAEnum = pgEnum("tipo_analise_ia", [
  "RESUMO_CASO",           // Resumo geral do caso
  "ANALISE_DENUNCIA",      // Análise crítica da denúncia
  "TESES_DEFENSIVAS",      // Sugestões de teses defensivas
  "ANALISE_PROVAS",        // Análise das provas
  "RISCO_CONDENACAO",      // Score de risco
  "JURISPRUDENCIA",        // Jurisprudência relacionada
  "ESTRATEGIA_JURI",       // Estratégia para o júri
  "PERFIL_JURADOS",        // Análise do perfil de jurados
  "COMPARACAO_CASOS",      // Comparação com casos similares
  "TIMELINE",              // Linha do tempo dos fatos
  "PONTOS_FRACOS",         // Pontos fracos da acusação
  "QUESITACAO",            // Sugestão de quesitos
  "MEMORIAL_DRAFT",        // Rascunho de memorial
  "OUTRO",
]);

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
  conteudo: text("conteudo").notNull(),        // Resposta da IA
  
  // Dados estruturados extraídos
  dadosEstruturados: text("dados_estruturados"), // JSON com dados parseados
  
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
// TESTEMUNHAS E DEPOIMENTOS
// Gestão de testemunhas do caso
// ==========================================

export const tipoTestemunhaEnum = pgEnum("tipo_testemunha", [
  "DEFESA",
  "ACUSACAO",
  "COMUM",
  "INFORMANTE",
  "PERITO",
  "VITIMA",
]);

export const statusTestemunhaEnum = pgEnum("status_testemunha", [
  "ARROLADA",
  "INTIMADA",
  "OUVIDA",
  "DESISTIDA",
  "NAO_LOCALIZADA",
  "CARTA_PRECATORIA",
]);

export const testemunhas = pgTable("testemunhas", {
  id: serial("id").primaryKey(),
  
  // Relacionamentos
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  casoId: integer("caso_id")
    .references(() => casos.id, { onDelete: "set null" }),
  audienciaId: integer("audiencia_id")
    .references(() => audiencias.id, { onDelete: "set null" }),
  
  // Identificação
  nome: text("nome").notNull(),
  tipo: tipoTestemunhaEnum("tipo").notNull(),
  status: statusTestemunhaEnum("status").default("ARROLADA"),
  
  // Contato
  telefone: varchar("telefone", { length: 20 }),
  endereco: text("endereco"),
  
  // Depoimento
  resumoDepoimento: text("resumo_depoimento"),    // Resumo do que disse
  pontosFavoraveis: text("pontos_favoraveis"),    // JSON: pontos favoráveis à defesa
  pontosDesfavoraveis: text("pontos_desfavoraveis"), // JSON: pontos desfavoráveis
  
  // Perguntas estratégicas
  perguntasSugeridas: text("perguntas_sugeridas"), // JSON: sugestões de perguntas
  
  // Ordem de inquirição
  ordemInquiricao: integer("ordem_inquiricao"),
  
  // Observações
  observacoes: text("observacoes"),
  
  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("testemunhas_processo_id_idx").on(table.processoId),
  index("testemunhas_caso_id_idx").on(table.casoId),
  index("testemunhas_audiencia_id_idx").on(table.audienciaId),
  index("testemunhas_tipo_idx").on(table.tipo),
  index("testemunhas_status_idx").on(table.status),
]);

export type Testemunha = typeof testemunhas.$inferSelect;
export type InsertTestemunha = typeof testemunhas.$inferInsert;

// ==========================================
// RELAÇÕES DAS NOVAS TABELAS
// ==========================================

export const pecasProcessuaisRelations = relations(pecasProcessuais, ({ one }) => ({
  processo: one(processos, { fields: [pecasProcessuais.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [pecasProcessuais.assistidoId], references: [assistidos.id] }),
  caso: one(casos, { fields: [pecasProcessuais.casoId], references: [casos.id] }),
  uploadedBy: one(users, { fields: [pecasProcessuais.uploadedById], references: [users.id] }),
}));

export const analisesIARelations = relations(analisesIA, ({ one }) => ({
  processo: one(processos, { fields: [analisesIA.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [analisesIA.assistidoId], references: [assistidos.id] }),
  caso: one(casos, { fields: [analisesIA.casoId], references: [casos.id] }),
  peca: one(pecasProcessuais, { fields: [analisesIA.pecaId], references: [pecasProcessuais.id] }),
  criadoPor: one(users, { fields: [analisesIA.criadoPorId], references: [users.id] }),
}));

export const testemunhasRelations = relations(testemunhas, ({ one }) => ({
  processo: one(processos, { fields: [testemunhas.processoId], references: [processos.id] }),
  caso: one(casos, { fields: [testemunhas.casoId], references: [casos.id] }),
  audiencia: one(audiencias, { fields: [testemunhas.audienciaId], references: [audiencias.id] }),
}));

// ==========================================
// AVALIAÇÃO DO TRIBUNAL DO JÚRI
// Formulário de observação comportamental
// ==========================================

export const tendenciaVotoEnum = pgEnum("tendencia_voto", [
  "CONDENAR",
  "ABSOLVER",
  "INDECISO",
]);

export const nivelConfiancaEnum = pgEnum("nivel_confianca", [
  "BAIXA",
  "MEDIA",
  "ALTA",
]);

// Avaliação principal da sessão do júri
export const avaliacoesJuri = pgTable("avaliacoes_juri", {
  id: serial("id").primaryKey(),
  
  // Relacionamentos
  sessaoJuriId: integer("sessao_juri_id")
    .notNull()
    .references(() => sessoesJuri.id, { onDelete: "cascade" }),
  processoId: integer("processo_id")
    .references(() => processos.id, { onDelete: "set null" }),
  
  // Identificação
  observador: text("observador").notNull(),
  dataJulgamento: date("data_julgamento").notNull(),
  horarioInicio: varchar("horario_inicio", { length: 10 }),
  duracaoEstimada: varchar("duracao_estimada", { length: 50 }),
  
  // Contexto e Ambiente
  descricaoAmbiente: text("descricao_ambiente"),
  disposicaoFisica: text("disposicao_fisica"),
  climaEmocionalInicial: text("clima_emocional_inicial"),
  presencaPublicoMidia: text("presenca_publico_midia"),
  
  // Interrogatório do Réu
  interrogatorioReacaoGeral: text("interrogatorio_reacao_geral"),
  interrogatorioJuradosAcreditaram: text("interrogatorio_jurados_acreditaram"),
  interrogatorioJuradosCeticos: text("interrogatorio_jurados_ceticos"),
  interrogatorioMomentosImpacto: text("interrogatorio_momentos_impacto"),
  interrogatorioContradicoes: text("interrogatorio_contradicoes"),
  interrogatorioImpressaoCredibilidade: text("interrogatorio_impressao_credibilidade"),
  interrogatorioNivelCredibilidade: integer("interrogatorio_nivel_credibilidade"), // 1-10
  
  // Sustentação do MP
  mpEstrategiaGeral: text("mp_estrategia_geral"),
  mpImpactoGeral: integer("mp_impacto_geral"), // 1-10
  mpInclinacaoCondenar: text("mp_inclinacao_condenar"),
  
  // Sustentação da Defesa
  defesaEstrategiaGeral: text("defesa_estrategia_geral"),
  defesaImpactoGeral: integer("defesa_impacto_geral"), // 1-10
  defesaDuvidaRazoavel: text("defesa_duvida_razoavel"),
  
  // Réplica do MP
  replicaRefutacoes: text("replica_refutacoes"),
  replicaArgumentosNovos: text("replica_argumentos_novos"),
  replicaReacaoGeral: text("replica_reacao_geral"),
  replicaImpacto: integer("replica_impacto"), // 1-10
  replicaMudancaOpiniao: text("replica_mudanca_opiniao"),
  
  // Tréplica da Defesa
  treplicaRefutacoes: text("treplica_refutacoes"),
  treplicaApeloFinal: text("treplica_apelo_final"),
  treplicaReacaoGeral: text("treplica_reacao_geral"),
  treplicaMomentoImpactante: text("treplica_momento_impactante"),
  treplicaImpacto: integer("treplica_impacto"), // 1-10
  treplicaReconquistaIndecisos: text("treplica_reconquista_indecisos"),
  
  // Análise Final
  ladoMaisPersuasivo: text("lado_mais_persuasivo"),
  impactoAcusacao: integer("impacto_acusacao"), // 1-10
  impactoDefesa: integer("impacto_defesa"), // 1-10
  
  // Impressão Final
  impressaoFinalLeiga: text("impressao_final_leiga"),
  argumentoMaisImpactante: text("argumento_mais_impactante"),
  pontosNaoExplorados: text("pontos_nao_explorados"),
  
  // Observações Gerais
  climaGeralJulgamento: text("clima_geral_julgamento"),
  momentosVirada: text("momentos_virada"),
  surpresasJulgamento: text("surpresas_julgamento"),
  observacoesAdicionais: text("observacoes_adicionais"),
  
  // Status
  status: varchar("status", { length: 30 }).default("em_andamento"), // 'em_andamento' | 'concluida' | 'rascunho'
  
  // Metadados
  criadoPorId: integer("criado_por_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("avaliacoes_juri_sessao_id_idx").on(table.sessaoJuriId),
  index("avaliacoes_juri_processo_id_idx").on(table.processoId),
  index("avaliacoes_juri_status_idx").on(table.status),
  index("avaliacoes_juri_data_idx").on(table.dataJulgamento),
]);

export type AvaliacaoJuri = typeof avaliacoesJuri.$inferSelect;
export type InsertAvaliacaoJuri = typeof avaliacoesJuri.$inferInsert;

// Avaliação individual de cada jurado
export const avaliacaoJurados = pgTable("avaliacao_jurados", {
  id: serial("id").primaryKey(),
  
  // Relacionamentos
  avaliacaoJuriId: integer("avaliacao_juri_id")
    .notNull()
    .references(() => avaliacoesJuri.id, { onDelete: "cascade" }),
  juradoId: integer("jurado_id")
    .references(() => jurados.id, { onDelete: "set null" }),
  
  // Posição no conselho (1-7)
  posicao: integer("posicao").notNull(),
  
  // Identificação
  nome: text("nome"),
  profissao: varchar("profissao", { length: 100 }),
  idadeAproximada: integer("idade_aproximada"),
  sexo: varchar("sexo", { length: 20 }),
  
  // Observações iniciais
  aparenciaPrimeiraImpressao: text("aparencia_primeira_impressao"),
  linguagemCorporalInicial: text("linguagem_corporal_inicial"),
  
  // Previsão de voto
  tendenciaVoto: tendenciaVotoEnum("tendencia_voto"),
  nivelConfianca: nivelConfiancaEnum("nivel_confianca"),
  justificativaTendencia: text("justificativa_tendencia"),
  
  // Anotações durante o julgamento
  anotacoesInterrogatorio: text("anotacoes_interrogatorio"),
  anotacoesMp: text("anotacoes_mp"),
  anotacoesDefesa: text("anotacoes_defesa"),
  anotacoesGerais: text("anotacoes_gerais"),
  
  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("avaliacao_jurados_avaliacao_id_idx").on(table.avaliacaoJuriId),
  index("avaliacao_jurados_jurado_id_idx").on(table.juradoId),
  index("avaliacao_jurados_posicao_idx").on(table.posicao),
  index("avaliacao_jurados_tendencia_idx").on(table.tendenciaVoto),
]);

export type AvaliacaoJurado = typeof avaliacaoJurados.$inferSelect;
export type InsertAvaliacaoJurado = typeof avaliacaoJurados.$inferInsert;

// Avaliação das testemunhas durante o júri
export const avaliacaoTestemunhasJuri = pgTable("avaliacao_testemunhas_juri", {
  id: serial("id").primaryKey(),
  
  // Relacionamentos
  avaliacaoJuriId: integer("avaliacao_juri_id")
    .notNull()
    .references(() => avaliacoesJuri.id, { onDelete: "cascade" }),
  testemunhaId: integer("testemunha_id")
    .references(() => testemunhas.id, { onDelete: "set null" }),
  
  // Ordem de inquirição
  ordem: integer("ordem"),
  
  // Identificação
  nome: text("nome").notNull(),
  
  // Depoimento
  resumoDepoimento: text("resumo_depoimento"),
  reacaoJurados: text("reacao_jurados"),
  expressoesFaciaisLinguagem: text("expressoes_faciais_linguagem"),
  credibilidade: integer("credibilidade"), // 1-10
  observacoesComplementares: text("observacoes_complementares"),
  
  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("avaliacao_testemunhas_avaliacao_id_idx").on(table.avaliacaoJuriId),
  index("avaliacao_testemunhas_testemunha_id_idx").on(table.testemunhaId),
  index("avaliacao_testemunhas_ordem_idx").on(table.ordem),
]);

export type AvaliacaoTestemunhaJuri = typeof avaliacaoTestemunhasJuri.$inferSelect;
export type InsertAvaliacaoTestemunhaJuri = typeof avaliacaoTestemunhasJuri.$inferInsert;

// Argumentos do MP e Defesa durante a sustentação
export const argumentosSustentacao = pgTable("argumentos_sustentacao", {
  id: serial("id").primaryKey(),
  
  // Relacionamentos
  avaliacaoJuriId: integer("avaliacao_juri_id")
    .notNull()
    .references(() => avaliacoesJuri.id, { onDelete: "cascade" }),
  
  // Tipo
  tipo: varchar("tipo", { length: 20 }).notNull(), // 'mp' | 'defesa'
  ordem: integer("ordem"),
  
  // Conteúdo
  descricaoArgumento: text("descricao_argumento"),
  reacaoJurados: text("reacao_jurados"),
  nivelPersuasao: integer("nivel_persuasao"), // 1-10
  
  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("argumentos_sustentacao_avaliacao_id_idx").on(table.avaliacaoJuriId),
  index("argumentos_sustentacao_tipo_idx").on(table.tipo),
  index("argumentos_sustentacao_ordem_idx").on(table.ordem),
]);

export type ArgumentoSustentacao = typeof argumentosSustentacao.$inferSelect;
export type InsertArgumentoSustentacao = typeof argumentosSustentacao.$inferInsert;

// Personagens do Júri (Juiz, Promotor, etc.) - Histórico de aprendizado
export const personagensJuri = pgTable("personagens_juri", {
  id: serial("id").primaryKey(),
  
  // Identificação
  nome: text("nome").notNull(),
  tipo: varchar("tipo", { length: 30 }).notNull(), // 'juiz' | 'promotor' | 'defensor' | 'oficial'
  
  // Dados profissionais
  vara: varchar("vara", { length: 100 }),
  comarca: varchar("comarca", { length: 100 }),
  
  // Perfil observado
  estiloAtuacao: text("estilo_atuacao"),
  pontosFortes: text("pontos_fortes"),
  pontosFracos: text("pontos_fracos"),
  tendenciasObservadas: text("tendencias_observadas"),
  estrategiasRecomendadas: text("estrategias_recomendadas"),
  
  // Estatísticas (JSON com histórico)
  historico: text("historico"), // JSON com dados de sessões anteriores
  totalSessoes: integer("total_sessoes").default(0),
  
  // Status
  ativo: boolean("ativo").default(true),
  
  // Metadados
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("personagens_juri_nome_idx").on(table.nome),
  index("personagens_juri_tipo_idx").on(table.tipo),
  index("personagens_juri_comarca_idx").on(table.comarca),
  index("personagens_juri_ativo_idx").on(table.ativo),
]);

export type PersonagemJuri = typeof personagensJuri.$inferSelect;
export type InsertPersonagemJuri = typeof personagensJuri.$inferInsert;

// Relações das tabelas de avaliação
export const avaliacoesJuriRelations = relations(avaliacoesJuri, ({ one, many }) => ({
  sessaoJuri: one(sessoesJuri, { fields: [avaliacoesJuri.sessaoJuriId], references: [sessoesJuri.id] }),
  processo: one(processos, { fields: [avaliacoesJuri.processoId], references: [processos.id] }),
  criadoPor: one(users, { fields: [avaliacoesJuri.criadoPorId], references: [users.id] }),
  avaliacaoJurados: many(avaliacaoJurados),
  avaliacaoTestemunhas: many(avaliacaoTestemunhasJuri),
  argumentos: many(argumentosSustentacao),
}));

export const avaliacaoJuradosRelations = relations(avaliacaoJurados, ({ one }) => ({
  avaliacaoJuri: one(avaliacoesJuri, { fields: [avaliacaoJurados.avaliacaoJuriId], references: [avaliacoesJuri.id] }),
  jurado: one(jurados, { fields: [avaliacaoJurados.juradoId], references: [jurados.id] }),
}));

export const avaliacaoTestemunhasJuriRelations = relations(avaliacaoTestemunhasJuri, ({ one }) => ({
  avaliacaoJuri: one(avaliacoesJuri, { fields: [avaliacaoTestemunhasJuri.avaliacaoJuriId], references: [avaliacoesJuri.id] }),
  testemunha: one(testemunhas, { fields: [avaliacaoTestemunhasJuri.testemunhaId], references: [testemunhas.id] }),
}));

export const argumentosSustentacaoRelations = relations(argumentosSustentacao, ({ one }) => ({
  avaliacaoJuri: one(avaliacoesJuri, { fields: [argumentosSustentacao.avaliacaoJuriId], references: [avaliacoesJuri.id] }),
}));

export const personagensJuriRelations = relations(personagensJuri, ({ one }) => ({
  createdBy: one(users, { fields: [personagensJuri.createdById], references: [users.id] }),
}));

// ==========================================
// SISTEMA DE PROFISSIONAIS E VISIBILIDADE
// ==========================================

// Enum para grupo de trabalho
export const grupoTrabalhoEnum = pgEnum("grupo_trabalho", [
  "juri_ep_vvd",      // Rodrigo + Juliane
  "varas_criminais",  // Cristiane + Danilo
]);

// Enum para atribuição rotativa
export const atribuicaoRotativaEnum = pgEnum("atribuicao_rotativa", [
  "JURI_EP",  // Júri + Execução Penal
  "VVD",      // Violência Doméstica
]);

// Profissionais (Defensores)
export const profissionais = pgTable("profissionais", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  nome: text("nome").notNull(),
  nomeCurto: varchar("nome_curto", { length: 50 }), // "Dr. Rodrigo", "Dra. Juliane"
  email: text("email").unique(),
  grupo: varchar("grupo", { length: 30 }).notNull(), // 'juri_ep_vvd' | 'varas_criminais'
  vara: varchar("vara", { length: 50 }), // '1_vara_criminal' | '2_vara_criminal' | null
  cor: varchar("cor", { length: 20 }).default("zinc"),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("profissionais_grupo_idx").on(table.grupo),
  index("profissionais_user_id_idx").on(table.userId),
  index("profissionais_ativo_idx").on(table.ativo),
]);

export type Profissional = typeof profissionais.$inferSelect;
export type InsertProfissional = typeof profissionais.$inferInsert;

// Escala de Atribuições (Rodrigo/Juliane - rotação mensal)
export const escalasAtribuicao = pgTable("escalas_atribuicao", {
  id: serial("id").primaryKey(),
  profissionalId: integer("profissional_id").references(() => profissionais.id, { onDelete: "cascade" }),
  atribuicao: varchar("atribuicao", { length: 30 }).notNull(), // 'JURI_EP' | 'VVD'
  mes: integer("mes").notNull(), // 1-12
  ano: integer("ano").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("escalas_mes_ano_idx").on(table.mes, table.ano),
  index("escalas_profissional_idx").on(table.profissionalId),
]);

export type EscalaAtribuicao = typeof escalasAtribuicao.$inferSelect;
export type InsertEscalaAtribuicao = typeof escalasAtribuicao.$inferInsert;

// Compartilhamentos pontuais (principalmente para Cristiane/Danilo)
export const compartilhamentos = pgTable("compartilhamentos", {
  id: serial("id").primaryKey(),
  entidadeTipo: varchar("entidade_tipo", { length: 30 }).notNull(), // 'demanda' | 'audiencia' | 'processo' | 'caso'
  entidadeId: integer("entidade_id").notNull(),
  compartilhadoPorId: integer("compartilhado_por").references(() => profissionais.id, { onDelete: "cascade" }),
  compartilhadoComId: integer("compartilhado_com").references(() => profissionais.id, { onDelete: "cascade" }),
  motivo: text("motivo"),
  dataInicio: timestamp("data_inicio").defaultNow().notNull(),
  dataFim: timestamp("data_fim"), // null = permanente
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("compartilhamentos_entidade_idx").on(table.entidadeTipo, table.entidadeId),
  index("compartilhamentos_por_idx").on(table.compartilhadoPorId),
  index("compartilhamentos_com_idx").on(table.compartilhadoComId),
  index("compartilhamentos_ativo_idx").on(table.ativo),
]);

export type Compartilhamento = typeof compartilhamentos.$inferSelect;
export type InsertCompartilhamento = typeof compartilhamentos.$inferInsert;

// ==========================================
// RELAÇÕES: Sistema de Profissionais
// ==========================================

export const profissionaisRelations = relations(profissionais, ({ one, many }) => ({
  user: one(users, { fields: [profissionais.userId], references: [users.id] }),
  escalas: many(escalasAtribuicao),
  compartilhamentosCriados: many(compartilhamentos),
}));

export const escalasAtribuicaoRelations = relations(escalasAtribuicao, ({ one }) => ({
  profissional: one(profissionais, { fields: [escalasAtribuicao.profissionalId], references: [profissionais.id] }),
}));

export const compartilhamentosRelations = relations(compartilhamentos, ({ one }) => ({
  compartilhadoPor: one(profissionais, { fields: [compartilhamentos.compartilhadoPorId], references: [profissionais.id] }),
  compartilhadoCom: one(profissionais, { fields: [compartilhamentos.compartilhadoComId], references: [profissionais.id] }),
}));

// ==========================================
// LOGS DE ATIVIDADE (Auditoria)
// ==========================================

// Tipos de ação para logs
export const acaoLogEnum = pgEnum("acao_log", [
  "CREATE",       // Criação
  "UPDATE",       // Atualização
  "DELETE",       // Exclusão
  "VIEW",         // Visualização
  "COMPLETE",     // Conclusão de demanda
  "DELEGATE",     // Delegação
  "UPLOAD",       // Upload de arquivo
  "SYNC",         // Sincronização
]);

// Tipos de entidade
export const entidadeLogEnum = pgEnum("entidade_log", [
  "demanda",
  "assistido",
  "processo",
  "documento",
  "audiencia",
  "delegacao",
  "caso",
  "jurado",
]);

// Tabela de logs de atividade
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  acao: varchar("acao", { length: 20 }).notNull(), // CREATE, UPDATE, DELETE, etc.
  entidadeTipo: varchar("entidade_tipo", { length: 30 }).notNull(), // demanda, assistido, processo, etc.
  entidadeId: integer("entidade_id"),
  descricao: text("descricao"), // Descrição legível da ação
  detalhes: jsonb("detalhes"), // Metadados adicionais (nome do assistido, número do processo, etc.)
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

// Relações de logs
export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, { fields: [activityLogs.userId], references: [users.id] }),
}));
