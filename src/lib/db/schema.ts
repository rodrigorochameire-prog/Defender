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
  real,
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

  // Atribuição Primária (para organização no Drive e filtros)
  atribuicaoPrimaria: atribuicaoEnum("atribuicao_primaria").default("SUBSTITUICAO"),

  // Integração Google Drive - Pasta do Assistido
  driveFolderId: text("drive_folder_id"), // ID da pasta no Drive (Atribuição/NomeAssistido)

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
  index("assistidos_atribuicao_primaria_idx").on(table.atribuicaoPrimaria),
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
  dataExpedicao: date("data_expedicao"), // Data da expedição (para cálculo automático)
  dataConclusao: timestamp("data_conclusao"), // Quando foi concluído

  // Cálculo automático de prazo
  tipoPrazoId: integer("tipo_prazo_id"), // Tipo de prazo usado no cálculo
  
  // Status
  status: statusDemandaEnum("status").default("5_FILA"),
  substatus: varchar("substatus", { length: 50 }), // Status granular: elaborar, revisar, buscar, etc.
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

  // TODO: Adicionar via migration quando necessário
  // tipoIntimacao: varchar("tipo_intimacao", { length: 20 }).default("PETICIONAR"), // 'CIENCIA' | 'PETICIONAR' | 'AUDIENCIA' | 'CUMPRIMENTO'
  // processoVVDId: integer("processo_vvd_id"),

  // Integração Google Calendar
  googleCalendarEventId: text("google_calendar_event_id"), // ID do evento no Google Calendar
  
  // Caso (Case-Centric)
  casoId: integer("caso_id"),
  
  // Ordenação manual (drag-and-drop persist)
  ordemManual: integer("ordem_manual"),

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
  
  // Tipo de pedido: 'minuta' | 'atendimento' | 'diligencia' | 'analise' | 'outro' | 'delegacao_generica'
  tipo: varchar("tipo", { length: 30 }).default("delegacao_generica"),

  // Detalhes
  instrucoes: text("instrucoes"), // Instruções do defensor
  orientacoes: text("orientacoes"), // Orientações adicionais (referências, modelos, etc.)
  observacoes: text("observacoes"), // Observações da execução
  prazoSugerido: date("prazo_sugerido"),

  // Status: 'pendente' | 'aceita' | 'em_andamento' | 'aguardando_revisao' | 'revisado' | 'protocolado' | 'concluida' | 'devolvida' | 'cancelada'
  status: varchar("status", { length: 25 }).default("pendente").notNull(),

  // Contexto direto (para pedidos sem demanda associada)
  assistidoId: integer("assistido_id").references(() => assistidos.id),
  processoId: integer("processo_id").references(() => processos.id),

  // Prioridade
  prioridade: varchar("prioridade", { length: 10 }).default("NORMAL"),

  // Workspace
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("delegacoes_historico_demanda_id_idx").on(table.demandaId),
  index("delegacoes_historico_delegado_de_id_idx").on(table.delegadoDeId),
  index("delegacoes_historico_delegado_para_id_idx").on(table.delegadoParaId),
  index("delegacoes_historico_status_idx").on(table.status),
  index("delegacoes_historico_tipo_idx").on(table.tipo),
  index("delegacoes_historico_assistido_id_idx").on(table.assistidoId),
  index("delegacoes_historico_processo_id_idx").on(table.processoId),
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
// DILIGÊNCIAS INVESTIGATIVAS
// ==========================================

export const diligenciaStatusEnum = pgEnum("diligencia_status", [
  "A_PESQUISAR",      // Diligência pendente de pesquisa
  "EM_ANDAMENTO",     // Pesquisa em andamento
  "AGUARDANDO",       // Aguardando resposta/retorno
  "LOCALIZADO",       // Pessoa/documento localizado
  "OBTIDO",           // Documento/informação obtido
  "INFRUTIFERO",      // Diligência sem resultado
  "ARQUIVADO",        // Diligência arquivada
]);

export const diligenciaTipoEnum = pgEnum("diligencia_tipo", [
  "LOCALIZACAO_PESSOA",     // Localizar testemunha, réu, vítima
  "LOCALIZACAO_DOCUMENTO",  // Localizar documento específico
  "REQUISICAO_DOCUMENTO",   // Requisitar documento a órgão
  "PESQUISA_OSINT",         // Pesquisa em redes sociais, etc
  "DILIGENCIA_CAMPO",       // Visita in loco
  "INTIMACAO",              // Intimação de pessoa
  "OITIVA",                 // Agendamento de oitiva
  "PERICIA",                // Solicitação de perícia
  "EXAME",                  // Exame médico, toxicológico, etc
  "OUTRO",                  // Outras diligências
]);

export const diligencias = pgTable("diligencias", {
  id: serial("id").primaryKey(),

  // Identificação
  titulo: varchar("titulo", { length: 300 }).notNull(),
  descricao: text("descricao"),

  // Tipo e Status
  tipo: diligenciaTipoEnum("tipo").notNull().default("OUTRO"),
  status: diligenciaStatusEnum("status").notNull().default("A_PESQUISAR"),

  // Vinculação (pelo menos um deve estar preenchido)
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "cascade" }),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "cascade" }),
  casoId: integer("caso_id").references(() => casos.id, { onDelete: "cascade" }),
  personaId: integer("persona_id").references(() => casePersonas.id, { onDelete: "set null" }),

  // Detalhes da pessoa/objeto alvo
  nomePessoaAlvo: varchar("nome_pessoa_alvo", { length: 200 }),
  tipoRelacao: varchar("tipo_relacao", { length: 50 }), // testemunha, vitima, perito, informante
  cpfAlvo: varchar("cpf_alvo", { length: 14 }),
  enderecoAlvo: text("endereco_alvo"),
  telefoneAlvo: varchar("telefone_alvo", { length: 20 }),

  // Resultado e acompanhamento
  resultado: text("resultado"),
  dataConclusao: timestamp("data_conclusao"),
  prazoEstimado: timestamp("prazo_estimado"),
  prioridade: prioridadeEnum("prioridade").default("NORMAL"),

  // Links de pesquisa OSINT (armazenados como JSON)
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

  // Notas de acompanhamento (histórico)
  historico: jsonb("historico").$type<{
    data: string;
    acao: string;
    descricao: string;
    userId?: number;
  }[]>(),

  // Tags para categorização
  tags: jsonb("tags").$type<string[]>(),

  // Sugestão automática (flag)
  isSugestaoAutomatica: boolean("is_sugestao_automatica").default(false),
  sugestaoOrigem: varchar("sugestao_origem", { length: 100 }), // "padrao_caso", "similar", "manual"

  // Workspace e controle
  workspaceId: integer("workspace_id").references(() => workspaces.id),
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
  index("diligencias_workspace_id_idx").on(table.workspaceId),
  index("diligencias_defensor_id_idx").on(table.defensorId),
  index("diligencias_deleted_at_idx").on(table.deletedAt),
  index("diligencias_prioridade_idx").on(table.prioridade),
]);

export type Diligencia = typeof diligencias.$inferSelect;
export type InsertDiligencia = typeof diligencias.$inferInsert;

// ==========================================
// TEMPLATES DE DILIGÊNCIAS (para sugestões)
// ==========================================

export const diligenciaTemplates = pgTable("diligencia_templates", {
  id: serial("id").primaryKey(),

  // Identificação
  nome: varchar("nome", { length: 200 }).notNull(),
  descricao: text("descricao"),

  // Tipo de diligência
  tipo: diligenciaTipoEnum("tipo").notNull(),

  // Quando sugerir (condições)
  aplicavelA: jsonb("aplicavel_a").$type<{
    areas?: string[];        // JURI, EXECUCAO_PENAL, VVD
    fases?: string[];        // inquerito, instrucao, plenario
    tiposCrime?: string[];   // homicidio, roubo, trafico
    tags?: string[];         // tags de caso que ativam
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
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("diligencia_templates_tipo_idx").on(table.tipo),
  index("diligencia_templates_ativo_idx").on(table.ativo),
  index("diligencia_templates_workspace_id_idx").on(table.workspaceId),
]);

export type DiligenciaTemplate = typeof diligenciaTemplates.$inferSelect;
export type InsertDiligenciaTemplate = typeof diligenciaTemplates.$inferInsert;

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
// WHATSAPP CHAT - EVOLUTION API
// Chat bidirecional via Evolution API (open-source)
// ==========================================

// Configuração da instância Evolution API
export const evolutionConfig = pgTable("evolution_config", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").references(() => workspaces.id),

  // Configuração da instância
  instanceName: varchar("instance_name", { length: 100 }).notNull().unique(),
  apiUrl: text("api_url").notNull(), // URL do servidor Evolution API
  apiKey: text("api_key").notNull(), // Chave de autenticação

  // Status da conexão
  status: varchar("status", { length: 20 }).default("disconnected").notNull(), // connected, disconnected, qr_required
  qrCode: text("qr_code"), // QR Code em base64 quando necessário
  phoneNumber: varchar("phone_number", { length: 20 }), // Número conectado

  // Webhook
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret"),

  // Configurações
  isActive: boolean("is_active").default(false).notNull(),
  autoReply: boolean("auto_reply").default(false).notNull(),
  autoReplyMessage: text("auto_reply_message"),

  // Metadados
  lastSyncAt: timestamp("last_sync_at"),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("evolution_config_instance_name_idx").on(table.instanceName),
  index("evolution_config_workspace_id_idx").on(table.workspaceId),
  index("evolution_config_status_idx").on(table.status),
]);

export type EvolutionConfig = typeof evolutionConfig.$inferSelect;
export type InsertEvolutionConfig = typeof evolutionConfig.$inferInsert;

// Contatos do WhatsApp Chat
export const whatsappContacts = pgTable("whatsapp_contacts", {
  id: serial("id").primaryKey(),
  configId: integer("config_id")
    .notNull()
    .references(() => evolutionConfig.id, { onDelete: "cascade" }),

  // Identificação
  phone: varchar("phone", { length: 20 }).notNull(), // 5571999999999
  name: text("name"), // Nome definido pelo usuário
  pushName: text("push_name"), // Nome do perfil WhatsApp
  profilePicUrl: text("profile_pic_url"),

  // Vínculo com assistido (opcional)
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "set null" }),

  // Organização
  tags: text("tags").array(), // Tags para organização
  notes: text("notes"), // Anotações sobre o contato

  // Status da conversa
  lastMessageAt: timestamp("last_message_at"),
  unreadCount: integer("unread_count").default(0).notNull(),
  isArchived: boolean("is_archived").default(false).notNull(),
  isFavorite: boolean("is_favorite").default(false).notNull(),

  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("whatsapp_contacts_config_id_idx").on(table.configId),
  index("whatsapp_contacts_phone_idx").on(table.phone),
  index("whatsapp_contacts_assistido_id_idx").on(table.assistidoId),
  index("whatsapp_contacts_last_message_at_idx").on(table.lastMessageAt),
  uniqueIndex("whatsapp_contacts_config_phone_unique").on(table.configId, table.phone),
]);

export type WhatsAppContact = typeof whatsappContacts.$inferSelect;
export type InsertWhatsAppContact = typeof whatsappContacts.$inferInsert;

// Tipo de mensagem do chat
export const chatMessageTypeEnum = pgEnum("chat_message_type", [
  "text",
  "image",
  "audio",
  "video",
  "document",
  "sticker",
  "location",
  "contact",
  "unknown",
]);

// Mensagens do WhatsApp Chat
export const whatsappChatMessages = pgTable("whatsapp_chat_messages", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id")
    .notNull()
    .references(() => whatsappContacts.id, { onDelete: "cascade" }),

  // Identificação da mensagem
  waMessageId: varchar("wa_message_id", { length: 255 }), // ID da mensagem no WhatsApp

  // Direção e tipo
  direction: varchar("direction", { length: 10 }).notNull(), // inbound, outbound
  type: chatMessageTypeEnum("type").default("text").notNull(),

  // Conteúdo
  content: text("content"), // Texto ou descrição
  mediaUrl: text("media_url"), // URL do arquivo de mídia
  mediaMimeType: varchar("media_mime_type", { length: 100 }),
  mediaFilename: varchar("media_filename", { length: 255 }),

  // Status
  status: varchar("status", { length: 20 }).default("sent").notNull(), // sent, delivered, read, failed

  // Metadados
  metadata: jsonb("metadata").default({}), // Dados extras da mensagem

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("whatsapp_chat_messages_contact_id_idx").on(table.contactId),
  index("whatsapp_chat_messages_wa_message_id_idx").on(table.waMessageId),
  index("whatsapp_chat_messages_direction_idx").on(table.direction),
  index("whatsapp_chat_messages_created_at_idx").on(table.createdAt),
]);

export type WhatsAppChatMessage = typeof whatsappChatMessages.$inferSelect;
export type InsertWhatsAppChatMessage = typeof whatsappChatMessages.$inferInsert;

// ==========================================
// PLAUD CONFIGURATION
// Integração com dispositivos Plaud para gravação de atendimentos
// ==========================================

export const plaudConfig = pgTable("plaud_config", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").references(() => workspaces.id),

  // Configuração da API
  apiKey: text("api_key"),                    // API Key do Plaud Developer Platform
  apiSecret: text("api_secret"),              // API Secret
  webhookSecret: text("webhook_secret"),      // Secret para validar webhooks

  // Dispositivo vinculado
  deviceId: varchar("device_id", { length: 100 }), // ID do dispositivo Plaud
  deviceName: varchar("device_name", { length: 100 }),
  deviceModel: varchar("device_model", { length: 50 }), // 'note' | 'notepin'

  // Configurações de transcrição
  defaultLanguage: varchar("default_language", { length: 10 }).default("pt-BR"),
  autoTranscribe: boolean("auto_transcribe").default(true),
  autoSummarize: boolean("auto_summarize").default(true),

  // Configurações de upload para Drive
  autoUploadToDrive: boolean("auto_upload_to_drive").default(true),
  driveFolderId: varchar("drive_folder_id", { length: 100 }), // Pasta destino no Drive

  // Status
  isActive: boolean("is_active").default(false).notNull(),
  lastSyncAt: timestamp("last_sync_at"),

  // Metadados
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("plaud_config_workspace_id_idx").on(table.workspaceId),
  index("plaud_config_device_id_idx").on(table.deviceId),
  index("plaud_config_is_active_idx").on(table.isActive),
]);

export type PlaudConfig = typeof plaudConfig.$inferSelect;
export type InsertPlaudConfig = typeof plaudConfig.$inferInsert;

// Histórico de gravações do Plaud (para rastreamento)
export const plaudRecordings = pgTable("plaud_recordings", {
  id: serial("id").primaryKey(),
  configId: integer("config_id")
    .notNull()
    .references(() => plaudConfig.id, { onDelete: "cascade" }),

  // Identificação Plaud
  plaudRecordingId: varchar("plaud_recording_id", { length: 100 }).notNull().unique(),
  plaudDeviceId: varchar("plaud_device_id", { length: 100 }),

  // Metadados da gravação
  title: varchar("title", { length: 255 }),
  duration: integer("duration"),              // Duração em segundos
  recordedAt: timestamp("recorded_at"),
  fileSize: integer("file_size"),

  // Status de processamento
  status: varchar("status", { length: 20 }).default("received"), // received | transcribing | completed | failed
  errorMessage: text("error_message"),

  // Transcrição recebida
  transcription: text("transcription"),
  summary: text("summary"),
  speakers: jsonb("speakers").$type<{ id: string; name?: string; speakingTime?: number }[]>(),

  // Vinculação ao atendimento
  atendimentoId: integer("atendimento_id").references(() => atendimentos.id, { onDelete: "set null" }),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "set null" }),

  // Arquivo no Drive
  driveFileId: varchar("drive_file_id", { length: 100 }),
  driveFileUrl: text("drive_file_url"),

  // Metadados
  rawPayload: jsonb("raw_payload"),           // Payload completo recebido do webhook
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("plaud_recordings_config_id_idx").on(table.configId),
  index("plaud_recordings_plaud_recording_id_idx").on(table.plaudRecordingId),
  index("plaud_recordings_atendimento_id_idx").on(table.atendimentoId),
  index("plaud_recordings_assistido_id_idx").on(table.assistidoId),
  index("plaud_recordings_status_idx").on(table.status),
  index("plaud_recordings_recorded_at_idx").on(table.recordedAt),
]);

export type PlaudRecording = typeof plaudRecordings.$inferSelect;
export type InsertPlaudRecording = typeof plaudRecordings.$inferInsert;

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
// MÓDULO VVD - PARTES (Vítimas e Autores separados)
// ==========================================

// Status da MPU para controle
export const statusMPUEnum = pgEnum("status_mpu", [
  "ATIVA",
  "EXPIRADA",
  "REVOGADA",
  "RENOVADA",
  "MODULADA",
  "AGUARDANDO_DECISAO",
]);

// Tipo de intimação para demandas
export const tipoIntimacaoEnum = pgEnum("tipo_intimacao", [
  "CIENCIA",           // Mera ciência - vai direto para controle VVD
  "PETICIONAR",        // Precisa peticionar - fica na fila de demandas
  "AUDIENCIA",         // Intimação de audiência
  "CUMPRIMENTO",       // Cumprimento de decisão/sentença
]);

// Partes de processo VVD (separado dos assistidos criminais)
export const partesVVD = pgTable("partes_vvd", {
  id: serial("id").primaryKey(),

  // Identificação
  nome: text("nome").notNull(),
  cpf: varchar("cpf", { length: 14 }),
  rg: varchar("rg", { length: 20 }),
  dataNascimento: date("data_nascimento"),

  // Tipo da parte
  tipoParte: varchar("tipo_parte", { length: 20 }).notNull(), // 'autor' | 'vitima'

  // Contato
  telefone: varchar("telefone", { length: 20 }),
  telefoneSecundario: varchar("telefone_secundario", { length: 20 }),
  email: varchar("email", { length: 100 }),
  endereco: text("endereco"),
  bairro: varchar("bairro", { length: 100 }),
  cidade: varchar("cidade", { length: 100 }),

  // Relacionamento (parentesco com a outra parte)
  parentesco: varchar("parentesco", { length: 50 }), // ex-companheiro, pai, filho, etc.

  // Observações
  observacoes: text("observacoes"),

  // Workspace e responsável
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  defensorId: integer("defensor_id").references(() => users.id),

  // Metadados
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("partes_vvd_nome_idx").on(table.nome),
  index("partes_vvd_cpf_idx").on(table.cpf),
  index("partes_vvd_tipo_parte_idx").on(table.tipoParte),
  index("partes_vvd_workspace_id_idx").on(table.workspaceId),
  index("partes_vvd_deleted_at_idx").on(table.deletedAt),
]);

export type ParteVVD = typeof partesVVD.$inferSelect;
export type InsertParteVVD = typeof partesVVD.$inferInsert;

// ==========================================
// MÓDULO VVD - PROCESSOS DE MPU (separado dos processos criminais)
// ==========================================

export const processosVVD = pgTable("processos_vvd", {
  id: serial("id").primaryKey(),

  // Partes do processo
  autorId: integer("autor_id")
    .notNull()
    .references(() => partesVVD.id, { onDelete: "cascade" }),
  vitimaId: integer("vitima_id")
    .references(() => partesVVD.id, { onDelete: "set null" }),

  // Identificação do Processo
  numeroAutos: text("numero_autos").notNull(),
  tipoProcesso: varchar("tipo_processo", { length: 20 }).notNull().default("MPU"), // MPU, APOrd, APSum, etc.

  // Localização
  comarca: varchar("comarca", { length: 100 }),
  vara: varchar("vara", { length: 100 }).default("Vara de Violência Doméstica"),

  // Crime/Assunto
  crime: varchar("crime", { length: 200 }), // Ameaça, Maus Tratos, Lesão Corporal, etc.
  assunto: text("assunto"),

  // Datas importantes
  dataDistribuicao: date("data_distribuicao"),
  dataUltimaMovimentacao: date("data_ultima_movimentacao"),

  // Status
  fase: varchar("fase", { length: 50 }).default("tramitando"), // tramitando, arquivado, suspenso
  situacao: varchar("situacao", { length: 50 }).default("ativo"),

  // Medida Protetiva vigente
  mpuAtiva: boolean("mpu_ativa").default(false),
  dataDecisaoMPU: date("data_decisao_mpu"),
  tiposMPU: text("tipos_mpu"), // JSON com tipos: afastamento, proibição contato, etc.
  dataVencimentoMPU: date("data_vencimento_mpu"),
  distanciaMinima: integer("distancia_minima"), // em metros

  // Defensor responsável
  defensorId: integer("defensor_id").references(() => users.id),

  // Observações
  observacoes: text("observacoes"),

  // Integração PJe
  pjeDocumentoId: varchar("pje_documento_id", { length: 20 }), // ID do documento no PJe
  pjeUltimaAtualizacao: timestamp("pje_ultima_atualizacao"),

  // Workspace
  workspaceId: integer("workspace_id").references(() => workspaces.id),

  // Metadados
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("processos_vvd_autor_id_idx").on(table.autorId),
  index("processos_vvd_vitima_id_idx").on(table.vitimaId),
  index("processos_vvd_numero_autos_idx").on(table.numeroAutos),
  index("processos_vvd_mpu_ativa_idx").on(table.mpuAtiva),
  index("processos_vvd_data_vencimento_mpu_idx").on(table.dataVencimentoMPU),
  index("processos_vvd_defensor_id_idx").on(table.defensorId),
  index("processos_vvd_workspace_id_idx").on(table.workspaceId),
  index("processos_vvd_deleted_at_idx").on(table.deletedAt),
]);

export type ProcessoVVD = typeof processosVVD.$inferSelect;
export type InsertProcessoVVD = typeof processosVVD.$inferInsert;

// ==========================================
// MÓDULO VVD - INTIMAÇÕES/DEMANDAS DE VVD
// ==========================================

export const intimacoesVVD = pgTable("intimacoes_vvd", {
  id: serial("id").primaryKey(),

  // Relacionamentos
  processoVVDId: integer("processo_vvd_id")
    .notNull()
    .references(() => processosVVD.id, { onDelete: "cascade" }),

  // Tipo de intimação
  tipoIntimacao: tipoIntimacaoEnum("tipo_intimacao").notNull().default("CIENCIA"),

  // Dados da intimação
  ato: text("ato").notNull(), // Ciência, Modulação MPU, Revogação, etc.
  dataExpedicao: date("data_expedicao"),
  dataIntimacao: date("data_intimacao"),
  prazo: date("prazo"),
  prazoDias: integer("prazo_dias"),

  // ID do documento no PJe
  pjeDocumentoId: varchar("pje_documento_id", { length: 20 }),
  pjeTipoDocumento: varchar("pje_tipo_documento", { length: 50 }),

  // Status
  status: varchar("status", { length: 30 }).default("pendente"), // pendente, ciencia_dada, respondida, arquivada

  // Providências (o que precisa ser feito)
  providencias: text("providencias"),

  // Se for tipo PETICIONAR, referência para a demanda normal
  demandaId: integer("demanda_id").references(() => demandas.id),

  // Responsável
  defensorId: integer("defensor_id").references(() => users.id),

  // Workspace
  workspaceId: integer("workspace_id").references(() => workspaces.id),

  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("intimacoes_vvd_processo_vvd_id_idx").on(table.processoVVDId),
  index("intimacoes_vvd_tipo_intimacao_idx").on(table.tipoIntimacao),
  index("intimacoes_vvd_status_idx").on(table.status),
  index("intimacoes_vvd_prazo_idx").on(table.prazo),
  index("intimacoes_vvd_defensor_id_idx").on(table.defensorId),
  index("intimacoes_vvd_workspace_id_idx").on(table.workspaceId),
]);

export type IntimacaoVVD = typeof intimacoesVVD.$inferSelect;
export type InsertIntimacaoVVD = typeof intimacoesVVD.$inferInsert;

// ==========================================
// MÓDULO VVD - HISTÓRICO DE MPU
// ==========================================

export const historicoMPU = pgTable("historico_mpu", {
  id: serial("id").primaryKey(),

  processoVVDId: integer("processo_vvd_id")
    .notNull()
    .references(() => processosVVD.id, { onDelete: "cascade" }),

  // Tipo de evento
  tipoEvento: varchar("tipo_evento", { length: 30 }).notNull(), // 'deferimento', 'indeferimento', 'modulacao', 'revogacao', 'renovacao', 'descumprimento'

  // Detalhes
  dataEvento: date("data_evento").notNull(),
  descricao: text("descricao"),

  // Medidas vigentes após o evento
  medidasVigentes: text("medidas_vigentes"), // JSON com as medidas
  novaDataVencimento: date("nova_data_vencimento"),
  novaDistancia: integer("nova_distancia"),

  // Documento relacionado
  pjeDocumentoId: varchar("pje_documento_id", { length: 20 }),

  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("historico_mpu_processo_vvd_id_idx").on(table.processoVVDId),
  index("historico_mpu_tipo_evento_idx").on(table.tipoEvento),
  index("historico_mpu_data_evento_idx").on(table.dataEvento),
]);

export type HistoricoMPU = typeof historicoMPU.$inferSelect;
export type InsertHistoricoMPU = typeof historicoMPU.$inferInsert;

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

  // Relacionamentos opcionais
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "set null" }),
  casoId: integer("caso_id"),
  workspaceId: integer("workspace_id").references(() => workspaces.id),

  // Detalhes
  dataAtendimento: timestamp("data_atendimento").notNull(),
  duracao: integer("duracao"), // Duração em segundos
  tipo: varchar("tipo", { length: 30 }).notNull(), // 'presencial' | 'videoconferencia' | 'telefone' | 'visita_carcer'
  local: text("local"),

  // Resumo
  assunto: text("assunto"),
  resumo: text("resumo"),

  // Acompanhantes
  acompanhantes: text("acompanhantes"), // JSON com lista de acompanhantes

  // Status
  status: varchar("status", { length: 20 }).default("agendado"), // 'agendado' | 'realizado' | 'cancelado' | 'nao_compareceu'

  // ==========================================
  // GRAVAÇÃO E TRANSCRIÇÃO (Plaud Integration)
  // ==========================================

  // Áudio Original
  audioUrl: text("audio_url"),              // URL do arquivo de áudio no Drive
  audioDriveFileId: varchar("audio_drive_file_id", { length: 100 }), // ID do arquivo no Drive
  audioMimeType: varchar("audio_mime_type", { length: 50 }),
  audioFileSize: integer("audio_file_size"), // Tamanho em bytes

  // Transcrição
  transcricao: text("transcricao"),          // Texto completo da transcrição
  transcricaoResumo: text("transcricao_resumo"), // Resumo gerado por IA
  transcricaoStatus: varchar("transcricao_status", { length: 20 }).default("pending"), // pending | processing | completed | failed
  transcricaoIdioma: varchar("transcricao_idioma", { length: 10 }).default("pt-BR"),

  // Metadados da transcrição (Plaud)
  plaudRecordingId: varchar("plaud_recording_id", { length: 100 }), // ID da gravação no Plaud
  plaudDeviceId: varchar("plaud_device_id", { length: 100 }),       // ID do dispositivo Plaud
  transcricaoMetadados: jsonb("transcricao_metadados").$type<{
    speakers?: { id: string; name?: string; segments?: number[] }[];
    wordTimestamps?: { word: string; start: number; end: number }[];
    confidence?: number;
    processingTime?: number;
  }>(),

  // Pontos-chave extraídos por IA
  pontosChave: jsonb("pontos_chave").$type<{
    compromissos?: string[];    // Compromissos assumidos
    informacoesRelevantes?: string[]; // Informações importantes mencionadas
    duvidasPendentes?: string[]; // Dúvidas que ficaram pendentes
    providenciasNecessarias?: string[]; // Providências a tomar
  }>(),

  // ==========================================

  // Metadados
  atendidoPorId: integer("atendido_por_id")
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("atendimentos_assistido_id_idx").on(table.assistidoId),
  index("atendimentos_processo_id_idx").on(table.processoId),
  index("atendimentos_caso_id_idx").on(table.casoId),
  index("atendimentos_data_idx").on(table.dataAtendimento),
  index("atendimentos_tipo_idx").on(table.tipo),
  index("atendimentos_status_idx").on(table.status),
  index("atendimentos_atendido_por_idx").on(table.atendidoPorId),
  index("atendimentos_workspace_id_idx").on(table.workspaceId),
  index("atendimentos_plaud_recording_id_idx").on(table.plaudRecordingId),
  index("atendimentos_transcricao_status_idx").on(table.transcricaoStatus),
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
  assistido: one(assistidos, { fields: [delegacoesHistorico.assistidoId], references: [assistidos.id] }),
  processo: one(processos, { fields: [delegacoesHistorico.processoId], references: [processos.id] }),
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

// Evolution API Relations
export const evolutionConfigRelations = relations(evolutionConfig, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [evolutionConfig.workspaceId], references: [workspaces.id] }),
  createdBy: one(users, { fields: [evolutionConfig.createdById], references: [users.id] }),
  contacts: many(whatsappContacts),
}));

export const whatsappContactsRelations = relations(whatsappContacts, ({ one, many }) => ({
  config: one(evolutionConfig, { fields: [whatsappContacts.configId], references: [evolutionConfig.id] }),
  assistido: one(assistidos, { fields: [whatsappContacts.assistidoId], references: [assistidos.id] }),
  messages: many(whatsappChatMessages),
}));

export const whatsappChatMessagesRelations = relations(whatsappChatMessages, ({ one }) => ({
  contact: one(whatsappContacts, { fields: [whatsappChatMessages.contactId], references: [whatsappContacts.id] }),
}));

export const pecaTemplatesRelations = relations(pecaTemplates, ({ one }) => ({
  createdBy: one(users, { fields: [pecaTemplates.createdById], references: [users.id] }),
}));

export const calculosPenaRelations = relations(calculosPena, ({ one }) => ({
  processo: one(processos, { fields: [calculosPena.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [calculosPena.assistidoId], references: [assistidos.id] }),
  createdBy: one(users, { fields: [calculosPena.createdById], references: [users.id] }),
}));

export const atendimentosRelations = relations(atendimentos, ({ one, many }) => ({
  assistido: one(assistidos, { fields: [atendimentos.assistidoId], references: [assistidos.id] }),
  processo: one(processos, { fields: [atendimentos.processoId], references: [processos.id] }),
  workspace: one(workspaces, { fields: [atendimentos.workspaceId], references: [workspaces.id] }),
  atendidoPor: one(users, { fields: [atendimentos.atendidoPorId], references: [users.id] }),
  plaudRecordings: many(plaudRecordings),
}));

// Plaud Relations
export const plaudConfigRelations = relations(plaudConfig, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [plaudConfig.workspaceId], references: [workspaces.id] }),
  createdBy: one(users, { fields: [plaudConfig.createdById], references: [users.id] }),
  recordings: many(plaudRecordings),
}));

export const plaudRecordingsRelations = relations(plaudRecordings, ({ one }) => ({
  config: one(plaudConfig, { fields: [plaudRecordings.configId], references: [plaudConfig.id] }),
  atendimento: one(atendimentos, { fields: [plaudRecordings.atendimentoId], references: [atendimentos.id] }),
  assistido: one(assistidos, { fields: [plaudRecordings.assistidoId], references: [assistidos.id] }),
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
// VINCULAÇÃO ASSISTIDOS-PROCESSOS (MUITOS-PARA-MUITOS)
// ==========================================

// Papel do assistido no processo
export const papelProcessoEnum = pgEnum("papel_processo", [
  "REU",          // Réu principal
  "CORREU",       // Corréu
  "VITIMA",       // Vítima (casos de defesa da vítima)
  "TESTEMUNHA",   // Testemunha de defesa
  "DENUNCIANTE",  // Denunciante (ação penal privada)
  "QUERELANTE",   // Querelante
  "ASSISTENTE",   // Assistente de acusação
]);

// Status da extração de conteúdo
export const extractionStatusEnum = pgEnum("extraction_status", [
  "PENDING",      // Aguardando extração
  "PROCESSING",   // Em processamento
  "COMPLETED",    // Extração concluída
  "FAILED",       // Falha na extração
  "SKIPPED",      // Pulado (arquivo não suportado)
]);

// Tipo de análise do agente
export const analysisTypeEnum = pgEnum("analysis_type", [
  "EXTRACAO",     // Extração de dados estruturados
  "ESTRATEGIA",   // Análise estratégica completa
  "PREPARACAO",   // Preparação de audiência
  "ENRIQUECIMENTO", // Enriquecimento de dados
]);

// Tabela de vinculação muitos-para-muitos
export const assistidosProcessos = pgTable("assistidos_processos", {
  id: serial("id").primaryKey(),

  // FKs
  assistidoId: integer("assistido_id")
    .notNull()
    .references(() => assistidos.id, { onDelete: "cascade" }),
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),

  // Papel no processo
  papel: papelProcessoEnum("papel").default("REU").notNull(),
  isPrincipal: boolean("is_principal").default(true), // É o processo principal do assistido?

  // Observações
  observacoes: text("observacoes"),

  // Metadados
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
  contentMarkdown: text("content_markdown"),      // Markdown extraído pelo Docling
  contentText: text("content_text"),              // Texto puro (fallback)

  // Dados estruturados extraídos pelo agente
  extractedData: jsonb("extracted_data"),         // JSON com dados estruturados

  // Classificação do documento
  documentType: varchar("document_type", { length: 100 }), // Denúncia, Laudo, etc.
  documentSubtype: varchar("document_subtype", { length: 100 }), // Mais específico

  // Metadados da extração
  extractedAt: timestamp("extracted_at"),
  processingTimeMs: integer("processing_time_ms"),
  pageCount: integer("page_count"),
  tableCount: integer("table_count"),
  imageCount: integer("image_count"),
  wordCount: integer("word_count"),

  // Erros (se houver)
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
// ANÁLISES GERADAS POR AGENTES IA
// ==========================================

export const agentAnalyses = pgTable("agent_analyses", {
  id: serial("id").primaryKey(),

  // Entidade analisada
  entityType: varchar("entity_type", { length: 50 }).notNull(), // ASSISTIDO, PROCESSO, CASO, EVENTO
  entityId: integer("entity_id").notNull(),

  // Tipo de análise
  analysisType: analysisTypeEnum("analysis_type").notNull(),
  atribuicao: atribuicaoEnum("atribuicao"), // JURI, VVD, etc.

  // Documentos de entrada
  inputDocumentIds: jsonb("input_document_ids"),  // IDs dos driveFileContents usados
  inputSummary: text("input_summary"),            // Resumo do input

  // Resultado estruturado
  output: jsonb("output").notNull(),              // JSON com análise completa

  // Métricas de qualidade
  confidence: real("confidence"),                 // 0.0 a 1.0
  completeness: real("completeness"),             // Quantos campos preenchidos

  // Metadados do modelo
  modelUsed: varchar("model_used", { length: 100 }),
  tokensInput: integer("tokens_input"),
  tokensOutput: integer("tokens_output"),
  processingTimeMs: integer("processing_time_ms"),

  // Quem solicitou
  requestedById: integer("requested_by_id").references(() => users.id),

  // Status
  isApproved: boolean("is_approved"),            // Usuário aprovou as sugestões?
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

// Relações das novas tabelas
export const assistidosProcessosRelations = relations(assistidosProcessos, ({ one }) => ({
  assistido: one(assistidos, { fields: [assistidosProcessos.assistidoId], references: [assistidos.id] }),
  processo: one(processos, { fields: [assistidosProcessos.processoId], references: [processos.id] }),
}));

export const driveFileContentsRelations = relations(driveFileContents, ({ one }) => ({
  driveFile: one(driveFiles, { fields: [driveFileContents.driveFileId], references: [driveFiles.id] }),
}));

export const agentAnalysesRelations = relations(agentAnalyses, ({ one }) => ({
  requestedBy: one(users, { fields: [agentAnalyses.requestedById], references: [users.id] }),
  approvedBy: one(users, { fields: [agentAnalyses.approvedById], references: [users.id] }),
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

// ==========================================
// MODELOS DE DOCUMENTOS
// ==========================================

// Enum de categorias de modelos
export const modeloCategoriaEnum = pgEnum("modelo_categoria", [
  "PROVIDENCIA_ADMINISTRATIVA",  // Oficios internos, comunicacoes
  "PROVIDENCIA_FUNCIONAL",       // Atendimento de presos, requerimentos
  "PROVIDENCIA_INSTITUCIONAL",   // Documentos institucionais
  "PECA_PROCESSUAL",             // Peticoes, recursos
  "COMUNICACAO",                 // Emails, notificacoes
  "OUTRO",
]);

// Tabela de modelos de documentos
export const documentoModelos = pgTable("documento_modelos", {
  id: serial("id").primaryKey(),

  // Identificacao
  titulo: varchar("titulo", { length: 200 }).notNull(),
  descricao: text("descricao"),
  categoria: modeloCategoriaEnum("categoria").notNull().default("OUTRO"),

  // Conteudo do modelo (texto com {{VARIAVEIS}})
  conteudo: text("conteudo").notNull(),

  // Tipo de documento
  tipoPeca: varchar("tipo_peca", { length: 100 }), // oficio, email, requerimento, etc
  area: areaEnum("area"),

  // Variaveis disponiveis (JSON array)
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
  workspaceId: integer("workspace_id").references(() => workspaces.id),
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
  index("documento_modelos_workspace_id_idx").on(table.workspaceId),
  index("documento_modelos_deleted_at_idx").on(table.deletedAt),
]);

export type DocumentoModelo = typeof documentoModelos.$inferSelect;
export type InsertDocumentoModelo = typeof documentoModelos.$inferInsert;

// Tabela de documentos gerados
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

  // Workspace e usuario
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  createdById: integer("created_by_id").references(() => users.id),

  // Timestamps
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("documentos_gerados_modelo_id_idx").on(table.modeloId),
  index("documentos_gerados_processo_id_idx").on(table.processoId),
  index("documentos_gerados_assistido_id_idx").on(table.assistidoId),
  index("documentos_gerados_caso_id_idx").on(table.casoId),
  index("documentos_gerados_workspace_id_idx").on(table.workspaceId),
]);

export type DocumentoGerado = typeof documentosGerados.$inferSelect;
export type InsertDocumentoGerado = typeof documentosGerados.$inferInsert;

// Relacoes de modelos
export const documentoModelosRelations = relations(documentoModelos, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [documentoModelos.workspaceId], references: [workspaces.id] }),
  createdBy: one(users, { fields: [documentoModelos.createdById], references: [users.id] }),
  documentosGerados: many(documentosGerados),
}));

// Relacoes de documentos gerados
export const documentosGeradosRelations = relations(documentosGerados, ({ one }) => ({
  modelo: one(documentoModelos, { fields: [documentosGerados.modeloId], references: [documentoModelos.id] }),
  processo: one(processos, { fields: [documentosGerados.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [documentosGerados.assistidoId], references: [assistidos.id] }),
  demanda: one(demandas, { fields: [documentosGerados.demandaId], references: [demandas.id] }),
  caso: one(casos, { fields: [documentosGerados.casoId], references: [casos.id] }),
  workspace: one(workspaces, { fields: [documentosGerados.workspaceId], references: [workspaces.id] }),
  createdBy: one(users, { fields: [documentosGerados.createdById], references: [users.id] }),
}));

// ==========================================
// JURISPRUDÊNCIA - Banco de Julgados
// ==========================================

// Enum de tribunais
export const tribunalEnum = pgEnum("tribunal", [
  "STF",
  "STJ",
  "TJBA",
  "TRF1",
  "TRF3",
  "OUTRO",
]);

// Enum de tipo de decisão
export const tipoDecisaoEnum = pgEnum("tipo_decisao", [
  "ACORDAO",
  "DECISAO_MONOCRATICA",
  "SUMULA",
  "SUMULA_VINCULANTE",
  "REPERCUSSAO_GERAL",
  "RECURSO_REPETITIVO",
  "INFORMATIVO",
  "OUTRO",
]);

// Temas de jurisprudência (categorização principal)
export const jurisprudenciaTemas = pgTable("jurisprudencia_temas", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 200 }).notNull(),
  descricao: text("descricao"),
  cor: varchar("cor", { length: 20 }).default("#6366f1"), // Cor para identificação visual
  icone: varchar("icone", { length: 50 }), // Nome do ícone Lucide

  // Hierarquia (tema pai para subtemas)
  parentId: integer("parent_id"),

  // Contadores
  totalJulgados: integer("total_julgados").default(0),

  // Workspace
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  createdById: integer("created_by_id").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("jurisprudencia_temas_nome_idx").on(table.nome),
  index("jurisprudencia_temas_parent_id_idx").on(table.parentId),
  index("jurisprudencia_temas_workspace_id_idx").on(table.workspaceId),
]);

export type JurisprudenciaTema = typeof jurisprudenciaTemas.$inferSelect;
export type InsertJurisprudenciaTema = typeof jurisprudenciaTemas.$inferInsert;

// Teses jurídicas (argumentos específicos dentro de um tema)
export const jurisprudenciaTeses = pgTable("jurisprudencia_teses", {
  id: serial("id").primaryKey(),
  temaId: integer("tema_id").references(() => jurisprudenciaTemas.id, { onDelete: "cascade" }),

  titulo: varchar("titulo", { length: 300 }).notNull(),
  descricao: text("descricao"),

  // Texto da tese (para copy/paste)
  textoTese: text("texto_tese"),

  // Favorável ou desfavorável à defesa
  posicao: varchar("posicao", { length: 20 }).default("favoravel"), // favoravel | desfavoravel | neutro

  // Força da tese
  forca: varchar("forca", { length: 20 }).default("medio"), // forte | medio | fraco

  // Tags para busca
  tags: jsonb("tags").$type<string[]>(),

  // Contadores
  totalJulgados: integer("total_julgados").default(0),

  // Workspace
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  createdById: integer("created_by_id").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("jurisprudencia_teses_tema_id_idx").on(table.temaId),
  index("jurisprudencia_teses_titulo_idx").on(table.titulo),
  index("jurisprudencia_teses_posicao_idx").on(table.posicao),
  index("jurisprudencia_teses_workspace_id_idx").on(table.workspaceId),
]);

export type JurisprudenciaTese = typeof jurisprudenciaTeses.$inferSelect;
export type InsertJurisprudenciaTese = typeof jurisprudenciaTeses.$inferInsert;

// Julgados (decisões judiciais)
export const jurisprudenciaJulgados = pgTable("jurisprudencia_julgados", {
  id: serial("id").primaryKey(),

  // Identificação
  tribunal: tribunalEnum("tribunal").notNull(),
  tipoDecisao: tipoDecisaoEnum("tipo_decisao").notNull(),
  numeroProcesso: varchar("numero_processo", { length: 100 }),
  numeroRecurso: varchar("numero_recurso", { length: 100 }),

  // Dados do julgamento
  relator: varchar("relator", { length: 200 }),
  orgaoJulgador: varchar("orgao_julgador", { length: 200 }), // Turma, Câmara, Pleno, etc.
  dataJulgamento: date("data_julgamento"),
  dataPublicacao: date("data_publicacao"),

  // Conteúdo
  ementa: text("ementa"),
  ementaResumo: text("ementa_resumo"), // Resumo gerado por IA
  decisao: text("decisao"),
  votacao: varchar("votacao", { length: 100 }), // "Unanimidade", "Maioria 3x2", etc.

  // Texto completo (extraído do PDF)
  textoIntegral: text("texto_integral"),

  // Categorização
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

  // Embedding para busca semântica (vetor de 768 dimensões do Gemini)
  // Armazenado como JSON para compatibilidade
  embedding: jsonb("embedding").$type<number[]>(),

  // Citação formatada (pronta para copiar)
  citacaoFormatada: text("citacao_formatada"),

  // Status
  status: varchar("status", { length: 20 }).default("pendente"), // pendente | processando | processado | erro

  // Favorito
  isFavorito: boolean("is_favorito").default(false),

  // Metadados
  fonte: varchar("fonte", { length: 100 }), // "Google Drive", "Upload Manual", "Importação"
  observacoes: text("observacoes"),

  // Workspace e usuário
  workspaceId: integer("workspace_id").references(() => workspaces.id),
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
  index("jurisprudencia_julgados_workspace_id_idx").on(table.workspaceId),
]);

export type JurisprudenciaJulgado = typeof jurisprudenciaJulgados.$inferSelect;
export type InsertJurisprudenciaJulgado = typeof jurisprudenciaJulgados.$inferInsert;

// Histórico de buscas e perguntas à IA
export const jurisprudenciaBuscas = pgTable("jurisprudencia_buscas", {
  id: serial("id").primaryKey(),

  // Pergunta/busca do usuário
  query: text("query").notNull(),
  tipoQuery: varchar("tipo_query", { length: 20 }).default("pergunta"), // pergunta | busca | similar

  // Resposta da IA
  resposta: text("resposta"),

  // Julgados encontrados/citados
  julgadosIds: jsonb("julgados_ids").$type<number[]>(),

  // Métricas
  tempoResposta: integer("tempo_resposta"), // em ms
  totalResultados: integer("total_resultados"),

  // Feedback do usuário
  feedback: varchar("feedback", { length: 20 }), // util | parcial | inutil

  // Workspace e usuário
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  userId: integer("user_id").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("jurisprudencia_buscas_user_id_idx").on(table.userId),
  index("jurisprudencia_buscas_workspace_id_idx").on(table.workspaceId),
  index("jurisprudencia_buscas_created_at_idx").on(table.createdAt),
]);

export type JurisprudenciaBusca = typeof jurisprudenciaBuscas.$inferSelect;
export type InsertJurisprudenciaBusca = typeof jurisprudenciaBuscas.$inferInsert;

// Pasta de sincronização do Drive para jurisprudência
export const jurisprudenciaDriveFolders = pgTable("jurisprudencia_drive_folders", {
  id: serial("id").primaryKey(),

  // Identificação da pasta
  folderId: varchar("folder_id", { length: 100 }).notNull(),
  folderName: varchar("folder_name", { length: 255 }),
  folderPath: text("folder_path"),

  // Configuração de sincronização
  tribunal: tribunalEnum("tribunal"), // Se a pasta é específica de um tribunal
  temaId: integer("tema_id").references(() => jurisprudenciaTemas.id, { onDelete: "set null" }),

  // Status de sincronização
  isActive: boolean("is_active").default(true),
  lastSyncAt: timestamp("last_sync_at"),
  totalArquivos: integer("total_arquivos").default(0),
  arquivosSincronizados: integer("arquivos_sincronizados").default(0),

  // Workspace
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  createdById: integer("created_by_id").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("jurisprudencia_drive_folders_folder_id_idx").on(table.folderId),
  index("jurisprudencia_drive_folders_tribunal_idx").on(table.tribunal),
  index("jurisprudencia_drive_folders_workspace_id_idx").on(table.workspaceId),
]);

export type JurisprudenciaDriveFolder = typeof jurisprudenciaDriveFolders.$inferSelect;
export type InsertJurisprudenciaDriveFolder = typeof jurisprudenciaDriveFolders.$inferInsert;

// Relations
export const jurisprudenciaTemasRelations = relations(jurisprudenciaTemas, ({ one, many }) => ({
  parent: one(jurisprudenciaTemas, {
    fields: [jurisprudenciaTemas.parentId],
    references: [jurisprudenciaTemas.id],
    relationName: "tema_parent"
  }),
  children: many(jurisprudenciaTemas, { relationName: "tema_parent" }),
  teses: many(jurisprudenciaTeses),
  julgados: many(jurisprudenciaJulgados),
  workspace: one(workspaces, { fields: [jurisprudenciaTemas.workspaceId], references: [workspaces.id] }),
  createdBy: one(users, { fields: [jurisprudenciaTemas.createdById], references: [users.id] }),
}));

export const jurisprudenciaTesesRelations = relations(jurisprudenciaTeses, ({ one, many }) => ({
  tema: one(jurisprudenciaTemas, { fields: [jurisprudenciaTeses.temaId], references: [jurisprudenciaTemas.id] }),
  julgados: many(jurisprudenciaJulgados),
  workspace: one(workspaces, { fields: [jurisprudenciaTeses.workspaceId], references: [workspaces.id] }),
  createdBy: one(users, { fields: [jurisprudenciaTeses.createdById], references: [users.id] }),
}));

export const jurisprudenciaJulgadosRelations = relations(jurisprudenciaJulgados, ({ one }) => ({
  tema: one(jurisprudenciaTemas, { fields: [jurisprudenciaJulgados.temaId], references: [jurisprudenciaTemas.id] }),
  tese: one(jurisprudenciaTeses, { fields: [jurisprudenciaJulgados.teseId], references: [jurisprudenciaTeses.id] }),
  workspace: one(workspaces, { fields: [jurisprudenciaJulgados.workspaceId], references: [workspaces.id] }),
  createdBy: one(users, { fields: [jurisprudenciaJulgados.createdById], references: [users.id] }),
}));

export const jurisprudenciaBuscasRelations = relations(jurisprudenciaBuscas, ({ one }) => ({
  workspace: one(workspaces, { fields: [jurisprudenciaBuscas.workspaceId], references: [workspaces.id] }),
  user: one(users, { fields: [jurisprudenciaBuscas.userId], references: [users.id] }),
}));

export const jurisprudenciaDriveFoldersRelations = relations(jurisprudenciaDriveFolders, ({ one }) => ({
  tema: one(jurisprudenciaTemas, { fields: [jurisprudenciaDriveFolders.temaId], references: [jurisprudenciaTemas.id] }),
  workspace: one(workspaces, { fields: [jurisprudenciaDriveFolders.workspaceId], references: [workspaces.id] }),
  createdBy: one(users, { fields: [jurisprudenciaDriveFolders.createdById], references: [users.id] }),
}));

// ==========================================
// SISTEMA DE PRAZOS - CÁLCULO AUTOMÁTICO
// ==========================================

// Enum para área do direito (afeta contagem de prazos)
export const areaDireitoEnum = pgEnum("area_direito", [
  "CRIMINAL",        // Dias corridos
  "CIVEL",           // Dias úteis
  "TRABALHISTA",     // Dias úteis
  "EXECUCAO_PENAL",  // Dias corridos (natureza criminal)
  "JURI",            // Dias corridos (natureza criminal)
]);

// Tipos de ato/peça processual com prazos legais
export const tipoPrazos = pgTable("tipo_prazos", {
  id: serial("id").primaryKey(),

  // Identificação
  codigo: varchar("codigo", { length: 50 }).notNull().unique(), // Ex: "CONTRARRAZOES_APELACAO"
  nome: varchar("nome", { length: 150 }).notNull(), // Ex: "Contrarrazões de Apelação"
  descricao: text("descricao"),

  // Prazo legal base (antes de dobrar para Defensoria)
  prazoLegalDias: integer("prazo_legal_dias").notNull(), // Ex: 8 para contrarrazões

  // Configurações de contagem
  areaDireito: areaDireitoEnum("area_direito").notNull().default("CRIMINAL"),
  contarEmDiasUteis: boolean("contar_em_dias_uteis").default(false), // Criminal = false, Cível = true
  aplicarDobroDefensoria: boolean("aplicar_dobro_defensoria").default(true), // Art. 186 CPC / LC 80/94
  tempoLeituraDias: integer("tempo_leitura_dias").default(10), // Dias da expedição até abertura

  // Termo inicial
  termoInicial: varchar("termo_inicial", { length: 50 }).default("INTIMACAO"), // INTIMACAO | PUBLICACAO | AUDIENCIA | CIENCIA

  // Categorização
  categoria: varchar("categoria", { length: 50 }), // RECURSO | MANIFESTACAO | PETICAO | AUDIENCIA
  fase: varchar("fase", { length: 50 }), // INQUERITO | INSTRUCAO | RECURSO | EXECUCAO

  // Ativo/Inativo
  isActive: boolean("is_active").default(true),

  // Workspace (opcional - pode ser global)
  workspaceId: integer("workspace_id").references(() => workspaces.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("tipo_prazos_codigo_idx").on(table.codigo),
  index("tipo_prazos_area_direito_idx").on(table.areaDireito),
  index("tipo_prazos_categoria_idx").on(table.categoria),
  index("tipo_prazos_workspace_id_idx").on(table.workspaceId),
]);

export type TipoPrazo = typeof tipoPrazos.$inferSelect;
export type InsertTipoPrazo = typeof tipoPrazos.$inferInsert;

// Feriados forenses (suspensão de prazos)
export const feriadosForenses = pgTable("feriados_forenses", {
  id: serial("id").primaryKey(),

  // Data do feriado
  data: date("data").notNull(),

  // Identificação
  nome: varchar("nome", { length: 150 }).notNull(), // Ex: "Natal", "Recesso Forense"
  tipo: varchar("tipo", { length: 30 }).notNull().default("FERIADO"), // FERIADO | PONTO_FACULTATIVO | RECESSO | SUSPENSAO

  // Abrangência
  abrangencia: varchar("abrangencia", { length: 30 }).default("NACIONAL"), // NACIONAL | ESTADUAL | MUNICIPAL | TRIBUNAL
  estado: varchar("estado", { length: 2 }), // BA, SP, etc (se estadual)
  comarca: varchar("comarca", { length: 100 }), // Se municipal
  tribunal: varchar("tribunal", { length: 20 }), // STF, STJ, TJBA (se específico)

  // Efeito no prazo
  suspendePrazo: boolean("suspende_prazo").default(true), // Se suspende contagem
  apenasExpediente: boolean("apenas_expediente").default(false), // Só afeta expediente, não prazo

  // Período (para recessos)
  dataFim: date("data_fim"), // Se for período (ex: recesso 20/12 a 06/01)

  // Workspace (opcional - pode ser global)
  workspaceId: integer("workspace_id").references(() => workspaces.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("feriados_forenses_data_idx").on(table.data),
  index("feriados_forenses_tipo_idx").on(table.tipo),
  index("feriados_forenses_abrangencia_idx").on(table.abrangencia),
  index("feriados_forenses_estado_idx").on(table.estado),
  index("feriados_forenses_tribunal_idx").on(table.tribunal),
  index("feriados_forenses_workspace_id_idx").on(table.workspaceId),
]);

export type FeriadoForense = typeof feriadosForenses.$inferSelect;
export type InsertFeriadoForense = typeof feriadosForenses.$inferInsert;

// Histórico de cálculos de prazo (auditoria)
export const calculosPrazos = pgTable("calculos_prazos", {
  id: serial("id").primaryKey(),

  // Vínculo com demanda
  demandaId: integer("demanda_id").references(() => demandas.id, { onDelete: "cascade" }),

  // Tipo de prazo utilizado
  tipoPrazoId: integer("tipo_prazo_id").references(() => tipoPrazos.id),
  tipoPrazoCodigo: varchar("tipo_prazo_codigo", { length: 50 }), // Snapshot do código

  // Datas do cálculo
  dataExpedicao: date("data_expedicao"), // Data que intimação foi expedida
  dataLeitura: date("data_leitura"), // Data da leitura/abertura (+10 dias ou manual)
  dataTermoInicial: date("data_termo_inicial"), // Data que prazo começa a correr
  dataTermoFinal: date("data_termo_final").notNull(), // Prazo fatal calculado

  // Parâmetros do cálculo
  prazoBaseDias: integer("prazo_base_dias").notNull(), // Prazo original
  prazoComDobroDias: integer("prazo_com_dobro_dias").notNull(), // Prazo dobrado
  diasUteisSuspensos: integer("dias_uteis_suspensos").default(0), // Feriados/recessos
  areaDireito: varchar("area_direito", { length: 20 }), // CRIMINAL | CIVEL
  contadoEmDiasUteis: boolean("contado_em_dias_uteis").default(false),
  aplicouDobro: boolean("aplicou_dobro").default(true),
  tempoLeituraAplicado: integer("tempo_leitura_aplicado").default(10),

  // Observações
  observacoes: text("observacoes"),
  calculoManual: boolean("calculo_manual").default(false), // Se foi ajustado manualmente

  // Workspace
  workspaceId: integer("workspace_id").references(() => workspaces.id),
  calculadoPorId: integer("calculado_por_id").references(() => users.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("calculos_prazos_demanda_id_idx").on(table.demandaId),
  index("calculos_prazos_tipo_prazo_id_idx").on(table.tipoPrazoId),
  index("calculos_prazos_data_termo_final_idx").on(table.dataTermoFinal),
  index("calculos_prazos_workspace_id_idx").on(table.workspaceId),
]);

export type CalculoPrazo = typeof calculosPrazos.$inferSelect;
export type InsertCalculoPrazo = typeof calculosPrazos.$inferInsert;

// Relations para prazos
export const tipoPrazosRelations = relations(tipoPrazos, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [tipoPrazos.workspaceId], references: [workspaces.id] }),
  calculos: many(calculosPrazos),
}));

export const feriadosForensesRelations = relations(feriadosForenses, ({ one }) => ({
  workspace: one(workspaces, { fields: [feriadosForenses.workspaceId], references: [workspaces.id] }),
}));

export const calculosPrazosRelations = relations(calculosPrazos, ({ one }) => ({
  demanda: one(demandas, { fields: [calculosPrazos.demandaId], references: [demandas.id] }),
  tipoPrazo: one(tipoPrazos, { fields: [calculosPrazos.tipoPrazoId], references: [tipoPrazos.id] }),
  workspace: one(workspaces, { fields: [calculosPrazos.workspaceId], references: [workspaces.id] }),
  calculadoPor: one(users, { fields: [calculosPrazos.calculadoPorId], references: [users.id] }),
}));

// ==========================================
// PALÁCIO DA MENTE - DIAGRAMAS DE INVESTIGAÇÃO
// ==========================================

// Enum para tipos de diagrama do Palácio da Mente
export const diagramaTipoEnum = pgEnum("diagrama_tipo", [
  "MAPA_MENTAL",      // Mind map - brainstorming de ideias
  "TIMELINE",         // Linha do tempo - cronologia dos fatos
  "RELACIONAL",       // Relacionamentos entre pessoas/provas
  "HIERARQUIA",       // Árvore de argumentos/teses
  "MATRIX",           // Matriz de contradições/comparações
  "FLUXOGRAMA",       // Fluxo de eventos
  "LIVRE",            // Layout livre - rascunhos
]);

// Tabela principal de diagramas
export const palacioDiagramas = pgTable("palacio_diagramas", {
  id: serial("id").primaryKey(),

  // Vínculo com caso
  casoId: integer("caso_id").notNull().references(() => casos.id, { onDelete: "cascade" }),

  // Identificação
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

  // Organização
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

  // Vínculo com diagrama
  diagramaId: integer("diagrama_id").notNull().references(() => palacioDiagramas.id, { onDelete: "cascade" }),

  // ID do elemento no Excalidraw
  excalidrawElementId: text("excalidraw_element_id").notNull(),

  // Tipo de vínculo com entidades do caso
  tipoVinculo: varchar("tipo_vinculo", { length: 30 }), // 'persona' | 'fato' | 'prova' | 'tese' | 'documento' | 'testemunha'

  // IDs das entidades vinculadas (polimórfico)
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

// Conexões entre elementos (para análise de relacionamentos)
export const palacioConexoes = pgTable("palacio_conexoes", {
  id: serial("id").primaryKey(),

  // Vínculo com diagrama
  diagramaId: integer("diagrama_id").notNull().references(() => palacioDiagramas.id, { onDelete: "cascade" }),

  // Elementos conectados
  elementoOrigemId: integer("elemento_origem_id").notNull().references(() => palacioElementos.id, { onDelete: "cascade" }),
  elementoDestinoId: integer("elemento_destino_id").notNull().references(() => palacioElementos.id, { onDelete: "cascade" }),

  // Tipo de conexão
  tipoConexao: varchar("tipo_conexao", { length: 30 }), // 'contradicao' | 'corrobora' | 'sequencia' | 'hierarquia' | 'associacao'

  // Metadados
  label: text("label"),
  forca: integer("forca"), // 0-100 - força da conexão
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

// Relations para Palácio da Mente
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

// ==========================================
// SIMULADOR 3D - RECONSTITUIÇÃO FORENSE
// ==========================================

// Enum para status da simulação
export const simulacaoStatusEnum = pgEnum("simulacao_status", [
  "RASCUNHO",       // Em edição
  "PRONTO",         // Finalizado para apresentação
  "APRESENTADO",    // Já usado em plenário
  "ARQUIVADO",      // Não será mais utilizado
]);

// Tabela principal de simulações 3D
export const simulacoes3d = pgTable("simulacoes_3d", {
  id: serial("id").primaryKey(),

  // Vínculo com caso
  casoId: integer("caso_id").notNull().references(() => casos.id, { onDelete: "cascade" }),

  // Identificação
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),

  // Dados da cena (JSON estruturado)
  cenaData: jsonb("cena_data").$type<{
    cenario: {
      modeloUrl: string;
      nome: string;
      posicao: [number, number, number];
      rotacao: [number, number, number];
      escala: [number, number, number];
    };
    iluminacao: {
      ambiente: { cor: string; intensidade: number };
      direcional: { cor: string; intensidade: number; posicao: [number, number, number] };
      sombras: boolean;
    };
    cameras: Array<{
      id: string;
      nome: string;
      tipo: "perspective" | "orthographic";
      posicao: [number, number, number];
      alvo: [number, number, number];
      fov?: number;
    }>;
    configuracoes: {
      gridVisivel: boolean;
      eixosVisiveis: boolean;
      qualidade: "baixa" | "media" | "alta";
    };
  }>(),

  // Thumbnail preview (base64 ou URL)
  thumbnail: text("thumbnail"),

  // Status
  status: simulacaoStatusEnum("status").default("RASCUNHO"),

  // Configurações de exportação
  configExport: jsonb("config_export").$type<{
    resolucao: "720p" | "1080p" | "4k";
    fps: 24 | 30 | 60;
    formato: "mp4" | "webm";
    qualidade: "baixa" | "media" | "alta";
  }>(),

  // Metadados
  criadoPorId: integer("criado_por_id").references(() => users.id),
  atualizadoPorId: integer("atualizado_por_id").references(() => users.id),
  workspaceId: integer("workspace_id").references(() => workspaces.id),

  // Soft delete
  deletedAt: timestamp("deleted_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("simulacoes_3d_caso_id_idx").on(table.casoId),
  index("simulacoes_3d_status_idx").on(table.status),
  index("simulacoes_3d_criado_por_idx").on(table.criadoPorId),
  index("simulacoes_3d_workspace_id_idx").on(table.workspaceId),
  index("simulacoes_3d_deleted_at_idx").on(table.deletedAt),
]);

export type Simulacao3d = typeof simulacoes3d.$inferSelect;
export type InsertSimulacao3d = typeof simulacoes3d.$inferInsert;

// Personagens da simulação
export const simulacaoPersonagens = pgTable("simulacao_personagens", {
  id: serial("id").primaryKey(),
  simulacaoId: integer("simulacao_id").notNull().references(() => simulacoes3d.id, { onDelete: "cascade" }),

  // Identificação
  nome: text("nome").notNull(),
  papel: varchar("papel", { length: 30 }), // 'vitima' | 'reu' | 'testemunha' | 'agressor' | 'policial' | 'outro'

  // Vínculo com persona do caso (opcional)
  personaId: integer("persona_id").references(() => casePersonas.id, { onDelete: "set null" }),

  // Modelo 3D
  avatarUrl: text("avatar_url"), // Ready Player Me ou custom GLB
  avatarTipo: varchar("avatar_tipo", { length: 30 }), // 'ready_player_me' | 'mixamo' | 'custom' | 'basico'

  // Visual
  cor: varchar("cor", { length: 20 }), // Cor identificadora no diagrama
  altura: real("altura").default(1.7), // Altura em metros

  // Posição inicial
  posicaoInicial: jsonb("posicao_inicial").$type<[number, number, number]>(),
  rotacaoInicial: jsonb("rotacao_inicial").$type<[number, number, number]>(),

  // Animação padrão
  animacaoPadrao: varchar("animacao_padrao", { length: 50 }).default("idle"),

  // Ordem de exibição
  ordem: integer("ordem").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("simulacao_personagens_simulacao_id_idx").on(table.simulacaoId),
  index("simulacao_personagens_persona_id_idx").on(table.personaId),
  index("simulacao_personagens_papel_idx").on(table.papel),
]);

export type SimulacaoPersonagem = typeof simulacaoPersonagens.$inferSelect;
export type InsertSimulacaoPersonagem = typeof simulacaoPersonagens.$inferInsert;

// Objetos da cena
export const simulacaoObjetos = pgTable("simulacao_objetos", {
  id: serial("id").primaryKey(),
  simulacaoId: integer("simulacao_id").notNull().references(() => simulacoes3d.id, { onDelete: "cascade" }),

  nome: text("nome").notNull(),
  tipo: varchar("tipo", { length: 30 }), // 'arma' | 'movel' | 'veiculo' | 'evidencia' | 'marcador' | 'porta' | 'outro'

  // Modelo 3D
  modeloUrl: text("modelo_url"),
  modeloNome: varchar("modelo_nome", { length: 100 }),

  // Transformação
  posicao: jsonb("posicao").$type<[number, number, number]>(),
  rotacao: jsonb("rotacao").$type<[number, number, number]>(),
  escala: jsonb("escala").$type<[number, number, number]>(),

  // Visual
  cor: varchar("cor", { length: 20 }),
  visivel: boolean("visivel").default(true),
  destacado: boolean("destacado").default(false), // Para evidências importantes

  // Metadados
  descricao: text("descricao"),
  ordem: integer("ordem").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("simulacao_objetos_simulacao_id_idx").on(table.simulacaoId),
  index("simulacao_objetos_tipo_idx").on(table.tipo),
]);

export type SimulacaoObjeto = typeof simulacaoObjetos.$inferSelect;
export type InsertSimulacaoObjeto = typeof simulacaoObjetos.$inferInsert;

// Versões da simulação (acusação, defesa, alternativas)
export const simulacaoVersoes = pgTable("simulacao_versoes", {
  id: serial("id").primaryKey(),
  simulacaoId: integer("simulacao_id").notNull().references(() => simulacoes3d.id, { onDelete: "cascade" }),

  // Identificação
  nome: text("nome").notNull(), // "Versão da Acusação", "Versão da Defesa"
  tipo: varchar("tipo", { length: 20 }).notNull(), // 'acusacao' | 'defesa' | 'alternativa' | 'comparativa'
  cor: varchar("cor", { length: 20 }), // Cor para identificar na timeline

  // Dados da animação (Theatre.js state ou Remotion config)
  animacaoData: jsonb("animacao_data").$type<{
    theatreState?: Record<string, unknown>; // Estado do Theatre.js
    remotionConfig?: {
      fps: number;
      durationInFrames: number;
      width: number;
      height: number;
    };
  }>(),

  // Duração em segundos
  duracao: real("duracao"),

  // Narrativa textual (para legenda/narração)
  narrativa: text("narrativa"),

  // Câmera principal para esta versão
  cameraId: text("camera_id"),

  // Ordem de exibição
  ordem: integer("ordem").default(0),

  // Ativa/Inativa
  ativa: boolean("ativa").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("simulacao_versoes_simulacao_id_idx").on(table.simulacaoId),
  index("simulacao_versoes_tipo_idx").on(table.tipo),
]);

export type SimulacaoVersao = typeof simulacaoVersoes.$inferSelect;
export type InsertSimulacaoVersao = typeof simulacaoVersoes.$inferInsert;

// Keyframes de movimento
export const simulacaoKeyframes = pgTable("simulacao_keyframes", {
  id: serial("id").primaryKey(),
  versaoId: integer("versao_id").notNull().references(() => simulacaoVersoes.id, { onDelete: "cascade" }),

  // Referência ao elemento animado
  personagemId: integer("personagem_id").references(() => simulacaoPersonagens.id, { onDelete: "cascade" }),
  objetoId: integer("objeto_id").references(() => simulacaoObjetos.id, { onDelete: "cascade" }),
  cameraId: text("camera_id"), // ID da câmera se for keyframe de câmera

  // Tempo do keyframe (em segundos ou frames)
  tempo: real("tempo").notNull(),
  frame: integer("frame"), // Frame equivalente (fps * tempo)

  // Dados de transformação
  posicao: jsonb("posicao").$type<[number, number, number]>(),
  rotacao: jsonb("rotacao").$type<[number, number, number]>(),
  escala: jsonb("escala").$type<[number, number, number]>(),

  // Animação do personagem
  animacao: varchar("animacao", { length: 50 }), // 'idle' | 'walking' | 'running' | 'falling' | 'fighting'
  animacaoVelocidade: real("animacao_velocidade").default(1),

  // Propriedades visuais
  opacidade: real("opacidade").default(1),
  visivel: boolean("visivel").default(true),

  // Easing para transição
  easing: varchar("easing", { length: 30 }).default("linear"), // 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'spring'

  // Label/Nota para este momento
  label: text("label"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("simulacao_keyframes_versao_id_idx").on(table.versaoId),
  index("simulacao_keyframes_personagem_id_idx").on(table.personagemId),
  index("simulacao_keyframes_objeto_id_idx").on(table.objetoId),
  index("simulacao_keyframes_tempo_idx").on(table.tempo),
]);

export type SimulacaoKeyframe = typeof simulacaoKeyframes.$inferSelect;
export type InsertSimulacaoKeyframe = typeof simulacaoKeyframes.$inferInsert;

// Vídeos exportados
export const simulacaoExportacoes = pgTable("simulacao_exportacoes", {
  id: serial("id").primaryKey(),
  versaoId: integer("versao_id").notNull().references(() => simulacaoVersoes.id, { onDelete: "cascade" }),

  // Arquivo
  videoUrl: text("video_url"),
  thumbnailUrl: text("thumbnail_url"),
  formato: varchar("formato", { length: 10 }), // 'mp4' | 'webm' | 'gif'
  resolucao: varchar("resolucao", { length: 20 }), // '1920x1080' | '1280x720' | '3840x2160'

  // Status de processamento
  status: varchar("status", { length: 20 }).default("pendente"), // 'pendente' | 'processando' | 'pronto' | 'erro'
  progresso: integer("progresso").default(0), // 0-100
  erro: text("erro"),

  // Metadados do vídeo
  tamanhoBytes: integer("tamanho_bytes"),
  duracaoSegundos: real("duracao_segundos"),
  fps: integer("fps"),

  // Renderização
  renderEngine: varchar("render_engine", { length: 20 }), // 'remotion' | 'ffmpeg' | 'ccapture'
  tempoRenderizacao: integer("tempo_renderizacao"), // Em segundos

  // Metadados
  criadoPorId: integer("criado_por_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("simulacao_exportacoes_versao_id_idx").on(table.versaoId),
  index("simulacao_exportacoes_status_idx").on(table.status),
]);

export type SimulacaoExportacao = typeof simulacaoExportacoes.$inferSelect;
export type InsertSimulacaoExportacao = typeof simulacaoExportacoes.$inferInsert;

// Biblioteca de assets (cenários, objetos, animações)
export const simulacaoAssets = pgTable("simulacao_assets", {
  id: serial("id").primaryKey(),

  // Identificação
  nome: text("nome").notNull(),
  categoria: varchar("categoria", { length: 30 }).notNull(), // 'cenario' | 'personagem' | 'objeto' | 'animacao'
  subcategoria: varchar("subcategoria", { length: 50 }), // 'residencia' | 'externo' | 'comercial' | 'arma' | 'movel'

  // Arquivo
  arquivoUrl: text("arquivo_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  formato: varchar("formato", { length: 20 }), // 'glb' | 'gltf' | 'fbx' | 'json'

  // Metadados
  descricao: text("descricao"),
  tags: jsonb("tags").$type<string[]>(),
  tamanhoBytes: integer("tamanho_bytes"),

  // Fonte
  fonte: varchar("fonte", { length: 50 }), // 'sketchfab' | 'poly_haven' | 'mixamo' | 'custom' | 'ready_player_me'
  licenca: varchar("licenca", { length: 50 }), // 'CC0' | 'CC-BY' | 'proprietario'
  atribuicao: text("atribuicao"),

  // Configurações padrão
  configuracaoPadrao: jsonb("configuracao_padrao").$type<{
    escala?: [number, number, number];
    rotacao?: [number, number, number];
    posicaoOffset?: [number, number, number];
  }>(),

  // Disponibilidade
  publico: boolean("publico").default(false), // Disponível para todos os workspaces
  workspaceId: integer("workspace_id").references(() => workspaces.id),

  // Metadados
  criadoPorId: integer("criado_por_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("simulacao_assets_categoria_idx").on(table.categoria),
  index("simulacao_assets_subcategoria_idx").on(table.subcategoria),
  index("simulacao_assets_publico_idx").on(table.publico),
  index("simulacao_assets_workspace_id_idx").on(table.workspaceId),
]);

export type SimulacaoAsset = typeof simulacaoAssets.$inferSelect;
export type InsertSimulacaoAsset = typeof simulacaoAssets.$inferInsert;

// Relations para Simulador 3D
export const simulacoes3dRelations = relations(simulacoes3d, ({ one, many }) => ({
  caso: one(casos, { fields: [simulacoes3d.casoId], references: [casos.id] }),
  criadoPor: one(users, { fields: [simulacoes3d.criadoPorId], references: [users.id] }),
  atualizadoPor: one(users, { fields: [simulacoes3d.atualizadoPorId], references: [users.id] }),
  workspace: one(workspaces, { fields: [simulacoes3d.workspaceId], references: [workspaces.id] }),
  personagens: many(simulacaoPersonagens),
  objetos: many(simulacaoObjetos),
  versoes: many(simulacaoVersoes),
}));

export const simulacaoPersonagensRelations = relations(simulacaoPersonagens, ({ one, many }) => ({
  simulacao: one(simulacoes3d, { fields: [simulacaoPersonagens.simulacaoId], references: [simulacoes3d.id] }),
  persona: one(casePersonas, { fields: [simulacaoPersonagens.personaId], references: [casePersonas.id] }),
  keyframes: many(simulacaoKeyframes),
}));

export const simulacaoObjetosRelations = relations(simulacaoObjetos, ({ one, many }) => ({
  simulacao: one(simulacoes3d, { fields: [simulacaoObjetos.simulacaoId], references: [simulacoes3d.id] }),
  keyframes: many(simulacaoKeyframes),
}));

export const simulacaoVersoesRelations = relations(simulacaoVersoes, ({ one, many }) => ({
  simulacao: one(simulacoes3d, { fields: [simulacaoVersoes.simulacaoId], references: [simulacoes3d.id] }),
  keyframes: many(simulacaoKeyframes),
  exportacoes: many(simulacaoExportacoes),
}));

export const simulacaoKeyframesRelations = relations(simulacaoKeyframes, ({ one }) => ({
  versao: one(simulacaoVersoes, { fields: [simulacaoKeyframes.versaoId], references: [simulacaoVersoes.id] }),
  personagem: one(simulacaoPersonagens, { fields: [simulacaoKeyframes.personagemId], references: [simulacaoPersonagens.id] }),
  objeto: one(simulacaoObjetos, { fields: [simulacaoKeyframes.objetoId], references: [simulacaoObjetos.id] }),
}));

export const simulacaoExportacoesRelations = relations(simulacaoExportacoes, ({ one }) => ({
  versao: one(simulacaoVersoes, { fields: [simulacaoExportacoes.versaoId], references: [simulacaoVersoes.id] }),
  criadoPor: one(users, { fields: [simulacaoExportacoes.criadoPorId], references: [users.id] }),
}));

export const simulacaoAssetsRelations = relations(simulacaoAssets, ({ one }) => ({
  workspace: one(workspaces, { fields: [simulacaoAssets.workspaceId], references: [workspaces.id] }),
  criadoPor: one(users, { fields: [simulacaoAssets.criadoPorId], references: [users.id] }),
}));

// ==========================================
// SISTEMA DE DISTRIBUIÇÃO AUTOMÁTICA
// ==========================================

// Enum para tipos de padrão de extração
export const patternTypeEnum = pgEnum("pattern_type", [
  "orgao",      // Órgão julgador
  "classe",     // Classe da demanda
  "parte",      // Tipo de parte (REU, INVESTIGADO, etc.)
  "numero",     // Formato de número de processo
]);

// Tabela de padrões aprendidos para extração de dados de PDFs
export const extractionPatterns = pgTable("extraction_patterns", {
  id: serial("id").primaryKey(),

  // Tipo de padrão
  patternType: patternTypeEnum("pattern_type").notNull(),

  // Valor original extraído (ex: "JUIZADO ESPECIAL CRIMINAL DE CAMAÇARI")
  originalValue: text("original_value").notNull(),

  // Correção do usuário (se aplicável)
  correctedValue: text("corrected_value"),

  // Atribuição correta identificada
  correctAtribuicao: atribuicaoEnum("correct_atribuicao"),

  // Contexto adicional
  regexUsed: text("regex_used"),            // Regex que foi usado para extrair
  confidenceBefore: integer("confidence_before"), // Confiança antes da correção (0-100)

  // Documento de exemplo
  documentoExemplo: text("documento_exemplo"), // ID do documento que originou o padrão

  // Quantas vezes este padrão foi aplicado
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

// Histórico de distribuições automáticas
export const distributionHistory = pgTable("distribution_history", {
  id: serial("id").primaryKey(),

  // Arquivo original
  driveFileId: text("drive_file_id").notNull(),        // ID do arquivo no Drive
  originalFilename: text("original_filename").notNull(), // Nome original do arquivo

  // Dados extraídos
  extractedNumeroProcesso: text("extracted_numero_processo"),
  extractedOrgaoJulgador: text("extracted_orgao_julgador"),
  extractedAssistidoNome: text("extracted_assistido_nome"),
  extractedClasseDemanda: text("extracted_classe_demanda"),

  // Atribuição identificada
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

  // Correções manuais (se houve)
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

// Relations
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

// ==========================================
// COWORK - PARECERES (CONSULTAS RÁPIDAS)
// ==========================================

export const pareceres = pgTable("pareceres", {
  id: serial("id").primaryKey(),
  solicitanteId: integer("solicitante_id").notNull().references(() => users.id),
  respondedorId: integer("respondedor_id").notNull().references(() => users.id),
  assistidoId: integer("assistido_id").references(() => assistidos.id),
  processoId: integer("processo_id").references(() => processos.id),
  pergunta: text("pergunta").notNull(),
  resposta: text("resposta"),
  status: varchar("status", { length: 20 }).notNull().default("solicitado"), // 'solicitado' | 'respondido' | 'lido'
  urgencia: varchar("urgencia", { length: 20 }).notNull().default("normal"), // 'normal' | 'urgente'
  dataSolicitacao: timestamp("data_solicitacao").defaultNow().notNull(),
  dataResposta: timestamp("data_resposta"),
  workspaceId: integer("workspace_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("pareceres_solicitante_id_idx").on(table.solicitanteId),
  index("pareceres_respondedor_id_idx").on(table.respondedorId),
  index("pareceres_status_idx").on(table.status),
  index("pareceres_workspace_id_idx").on(table.workspaceId),
]);

export type Parecer = typeof pareceres.$inferSelect;
export type InsertParecer = typeof pareceres.$inferInsert;

export const pareceresRelations = relations(pareceres, ({ one }) => ({
  solicitante: one(users, { fields: [pareceres.solicitanteId], references: [users.id] }),
  respondedor: one(users, { fields: [pareceres.respondedorId], references: [users.id] }),
  assistido: one(assistidos, { fields: [pareceres.assistidoId], references: [assistidos.id] }),
  processo: one(processos, { fields: [pareceres.processoId], references: [processos.id] }),
}));

// ==========================================
// COWORK - MURAL DE EQUIPE (NOTAS)
// ==========================================

export const muralNotas = pgTable("mural_notas", {
  id: serial("id").primaryKey(),
  autorId: integer("autor_id").notNull().references(() => users.id),
  mensagem: text("mensagem").notNull(),
  assistidoId: integer("assistido_id").references(() => assistidos.id),
  processoId: integer("processo_id").references(() => processos.id),
  fixado: boolean("fixado").default(false).notNull(),
  workspaceId: integer("workspace_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("mural_notas_autor_id_idx").on(table.autorId),
  index("mural_notas_workspace_id_idx").on(table.workspaceId),
  index("mural_notas_fixado_idx").on(table.fixado),
]);

export type MuralNota = typeof muralNotas.$inferSelect;
export type InsertMuralNota = typeof muralNotas.$inferInsert;

export const muralNotasRelations = relations(muralNotas, ({ one }) => ({
  autor: one(users, { fields: [muralNotas.autorId], references: [users.id] }),
  assistido: one(assistidos, { fields: [muralNotas.assistidoId], references: [assistidos.id] }),
  processo: one(processos, { fields: [muralNotas.processoId], references: [processos.id] }),
}));
