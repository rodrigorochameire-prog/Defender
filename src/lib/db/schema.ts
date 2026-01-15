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
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ==========================================
// ENUMS JURÍDICOS
// ==========================================

// Áreas de atuação da Defensoria
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

// ==========================================
// USUÁRIOS (DEFENSORES)
// ==========================================

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: varchar("role", { length: 20 }).default("defensor").notNull(), // 'admin' | 'defensor' | 'estagiario' | 'servidor'
  phone: text("phone"),
  oab: varchar("oab", { length: 50 }), // Número da OAB
  comarca: varchar("comarca", { length: 100 }), // Comarca de atuação
  emailVerified: boolean("email_verified").default(false).notNull(),
  approvalStatus: varchar("approval_status", { length: 20 }).default("pending").notNull(),
  // Soft delete
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("users_role_idx").on(table.role),
  index("users_approval_status_idx").on(table.approvalStatus),
  index("users_deleted_at_idx").on(table.deletedAt),
  index("users_comarca_idx").on(table.comarca),
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
  
  // Flag de réu preso (prioridade automática)
  reuPreso: boolean("reu_preso").default(false),
  
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
  index("demandas_defensor_id_idx").on(table.defensorId),
  index("demandas_reu_preso_idx").on(table.reuPreso),
  index("demandas_deleted_at_idx").on(table.deletedAt),
]);

export type Demanda = typeof demandas.$inferSelect;
export type InsertDemanda = typeof demandas.$inferInsert;

// ==========================================
// SESSÕES DO JÚRI (Plenário)
// ==========================================

export const sessoesJuri = pgTable("sessoes_juri", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  
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
  
  // Detalhes
  dataAudiencia: timestamp("data_audiencia").notNull(),
  tipo: varchar("tipo", { length: 50 }).notNull(), // 'instrucao' | 'conciliacao' | 'justificacao' | 'custodia' | 'admonicao'
  local: text("local"),
  
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
  
  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("audiencias_processo_id_idx").on(table.processoId),
  index("audiencias_data_idx").on(table.dataAudiencia),
  index("audiencias_defensor_id_idx").on(table.defensorId),
  index("audiencias_status_idx").on(table.status),
  index("audiencias_tipo_idx").on(table.tipo),
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
  index("documentos_categoria_idx").on(table.categoria),
  index("documentos_is_template_idx").on(table.isTemplate),
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
// RELAÇÕES
// ==========================================

export const usersRelations = relations(users, ({ many }) => ({
  assistidos: many(assistidos),
  processos: many(processos),
  demandas: many(demandas),
  sessoesJuri: many(sessoesJuri),
  audiencias: many(audiencias),
  notifications: many(notifications),
  atendimentos: many(atendimentos),
}));

export const assistidosRelations = relations(assistidos, ({ one, many }) => ({
  defensor: one(users, { fields: [assistidos.defensorId], references: [users.id] }),
  processos: many(processos),
  demandas: many(demandas),
  documentos: many(documentos),
  anotacoes: many(anotacoes),
  atendimentos: many(atendimentos),
  calendarEvents: many(calendarEvents),
}));

export const processosRelations = relations(processos, ({ one, many }) => ({
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
  processo: one(processos, { fields: [demandas.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [demandas.assistidoId], references: [assistidos.id] }),
  defensor: one(users, { fields: [demandas.defensorId], references: [users.id] }),
  documentos: many(documentos),
  anotacoes: many(anotacoes),
  calendarEvents: many(calendarEvents),
}));

export const sessoesJuriRelations = relations(sessoesJuri, ({ one }) => ({
  processo: one(processos, { fields: [sessoesJuri.processoId], references: [processos.id] }),
  defensor: one(users, { fields: [sessoesJuri.defensorId], references: [users.id] }),
}));

export const audienciasRelations = relations(audiencias, ({ one }) => ({
  processo: one(processos, { fields: [audiencias.processoId], references: [processos.id] }),
  defensor: one(users, { fields: [audiencias.defensorId], references: [users.id] }),
}));

export const movimentacoesRelations = relations(movimentacoes, ({ one }) => ({
  processo: one(processos, { fields: [movimentacoes.processoId], references: [processos.id] }),
  createdBy: one(users, { fields: [movimentacoes.createdById], references: [users.id] }),
}));

export const documentosRelations = relations(documentos, ({ one }) => ({
  processo: one(processos, { fields: [documentos.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [documentos.assistidoId], references: [assistidos.id] }),
  demanda: one(demandas, { fields: [documentos.demandaId], references: [demandas.id] }),
  uploadedBy: one(users, { fields: [documentos.uploadedById], references: [users.id] }),
}));

export const anotacoesRelations = relations(anotacoes, ({ one }) => ({
  processo: one(processos, { fields: [anotacoes.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [anotacoes.assistidoId], references: [assistidos.id] }),
  demanda: one(demandas, { fields: [anotacoes.demandaId], references: [demandas.id] }),
  createdBy: one(users, { fields: [anotacoes.createdById], references: [users.id] }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
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
