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
import { tipoTestemunhaEnum, statusTestemunhaEnum } from "./enums";
import { users, processos, assistidos, demandas } from "./core";
import { casos, analisesCowork } from "./casos";

// ==========================================
// AUDIÊNCIAS
// ==========================================

export const audiencias = pgTable("audiencias", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  casoId: integer("caso_id"),
  assistidoId: integer("assistido_id"),
  dataAudiencia: timestamp("data_audiencia").notNull(),
  tipo: varchar("tipo", { length: 50 }).notNull(),
  local: text("local"),
  titulo: text("titulo"),
  descricao: text("descricao"),
  sala: varchar("sala", { length: 50 }),
  horario: varchar("horario", { length: 10 }),
  defensorId: integer("defensor_id").references(() => users.id),
  juiz: text("juiz"),
  promotor: text("promotor"),
  status: varchar("status", { length: 30 }).default("agendada"),
  resultado: text("resultado"),
  observacoes: text("observacoes"),
  anotacoes: text("anotacoes"),
  anotacoesVersao: integer("anotacoes_versao").default(1),
  registroAudiencia: jsonb("registro_audiencia"),
  anotacoesRapidas: jsonb("anotacoes_rapidas").$type<Array<{
    texto: string;
    timestamp: string;
    autorId: number;
  }>>().default([]),
  resumoDefesa: text("resumo_defesa"),
  googleCalendarEventId: text("google_calendar_event_id"),
  gerarPrazoApos: boolean("gerar_prazo_apos").default(false),
  prazoGeradoId: integer("prazo_gerado_id"),
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
]);

export type Audiencia = typeof audiencias.$inferSelect;
export type InsertAudiencia = typeof audiencias.$inferInsert;

// ==========================================
// HISTÓRICO DE ANOTAÇÕES DE AUDIÊNCIA
// ==========================================

export const audienciasHistorico = pgTable("audiencias_historico", {
  id: serial("id").primaryKey(),
  audienciaId: integer("audiencia_id").notNull().references(() => audiencias.id, { onDelete: "cascade" }),
  versao: integer("versao").notNull(),
  anotacoes: text("anotacoes").notNull(),
  editadoPorId: integer("editado_por_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("audiencias_hist_audiencia_idx").on(table.audienciaId),
  index("audiencias_hist_versao_idx").on(table.versao),
]);

export type AudienciaHistorico = typeof audienciasHistorico.$inferSelect;
export type InsertAudienciaHistorico = typeof audienciasHistorico.$inferInsert;

// ==========================================
// EVENTOS DO CALENDÁRIO
// ==========================================

export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  eventDate: timestamp("event_date").notNull(),
  endDate: timestamp("end_date"),
  eventType: varchar("event_type", { length: 100 }).notNull(),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "cascade" }),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "cascade" }),
  demandaId: integer("demanda_id").references(() => demandas.id, { onDelete: "set null" }),
  isAllDay: boolean("is_all_day").default(true).notNull(),
  color: varchar("color", { length: 20 }),
  location: varchar("location", { length: 200 }),
  notes: text("notes"),
  reminderMinutes: integer("reminder_minutes"),
  priority: varchar("priority", { length: 20 }).default("normal"),
  status: varchar("status", { length: 20 }).default("scheduled"),
  isRecurring: boolean("is_recurring").default(false),
  recurrenceType: varchar("recurrence_type", { length: 20 }),
  recurrenceInterval: integer("recurrence_interval").default(1),
  recurrenceEndDate: timestamp("recurrence_end_date"),
  recurrenceCount: integer("recurrence_count"),
  recurrenceDays: varchar("recurrence_days", { length: 50 }),
  parentEventId: integer("parent_event_id"),
  workspaceId: integer("workspace_id"),
  deletedAt: timestamp("deleted_at"),
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
// ATENDIMENTOS
// ==========================================

export const atendimentos = pgTable("atendimentos", {
  id: serial("id").primaryKey(),
  assistidoId: integer("assistido_id")
    .notNull()
    .references(() => assistidos.id, { onDelete: "cascade" }),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "set null" }),
  casoId: integer("caso_id"),
  dataAtendimento: timestamp("data_atendimento").notNull(),
  duracao: integer("duracao"),
  tipo: varchar("tipo", { length: 30 }).notNull(),
  local: text("local"),
  assunto: text("assunto"),
  resumo: text("resumo"),
  acompanhantes: text("acompanhantes"),
  status: varchar("status", { length: 20 }).default("agendado"),
  interlocutor: varchar("interlocutor", { length: 30 }).default("assistido"),
  audioUrl: text("audio_url"),
  audioDriveFileId: varchar("audio_drive_file_id", { length: 100 }),
  audioMimeType: varchar("audio_mime_type", { length: 50 }),
  audioFileSize: integer("audio_file_size"),
  transcricao: text("transcricao"),
  transcricaoResumo: text("transcricao_resumo"),
  transcricaoStatus: varchar("transcricao_status", { length: 20 }).default("pending"),
  transcricaoIdioma: varchar("transcricao_idioma", { length: 10 }).default("pt-BR"),
  plaudRecordingId: varchar("plaud_recording_id", { length: 100 }),
  plaudDeviceId: varchar("plaud_device_id", { length: 100 }),
  transcricaoMetadados: jsonb("transcricao_metadados").$type<{
    speakers?: { id: string; name?: string; segments?: number[] }[];
    wordTimestamps?: { word: string; start: number; end: number }[];
    confidence?: number;
    processingTime?: number;
  }>(),
  pontosChave: jsonb("pontos_chave").$type<{
    compromissos?: string[];
    informacoesRelevantes?: string[];
    duvidasPendentes?: string[];
    providenciasNecessarias?: string[];
  }>(),
  enrichmentStatus: varchar("enrichment_status", { length: 20 }),
  enrichmentData: jsonb("enrichment_data").$type<{
    key_points?: string[];
    facts?: { descricao: string; tipo: string; confidence: number }[];
    persons_mentioned?: { nome: string; papel: string }[];
    contradictions?: string[];
    suggested_actions?: string[];
    teses_possiveis?: string[];
    urgency_level?: string;
    confidence?: number;
  }>(),
  enrichedAt: timestamp("enriched_at"),
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
  index("atendimentos_enrichment_status_idx").on(table.enrichmentStatus),
  index("atendimentos_plaud_recording_id_idx").on(table.plaudRecordingId),
  index("atendimentos_transcricao_status_idx").on(table.transcricaoStatus),
]);

export type Atendimento = typeof atendimentos.$inferSelect;
export type InsertAtendimento = typeof atendimentos.$inferInsert;

// ==========================================
// TESTEMUNHAS E DEPOIMENTOS
// ==========================================

export const testemunhas = pgTable("testemunhas", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  casoId: integer("caso_id")
    .references(() => casos.id, { onDelete: "set null" }),
  audienciaId: integer("audiencia_id")
    .references(() => audiencias.id, { onDelete: "set null" }),
  nome: text("nome").notNull(),
  tipo: tipoTestemunhaEnum("tipo").notNull(),
  status: statusTestemunhaEnum("status").default("ARROLADA"),
  telefone: varchar("telefone", { length: 20 }),
  endereco: text("endereco"),
  resumoDepoimento: text("resumo_depoimento"),
  pontosFavoraveis: text("pontos_favoraveis"),
  pontosDesfavoraveis: text("pontos_desfavoraveis"),
  perguntasSugeridas: text("perguntas_sugeridas"),
  ordemInquiricao: integer("ordem_inquiricao"),
  observacoes: text("observacoes"),
  ouvidoEm: timestamp("ouvido_em"),
  redesignadoPara: date("redesignado_para"),
  sinteseJuizo: text("sintese_juizo"),
  audioDriveFileId: varchar("audio_drive_file_id", { length: 100 }),
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
// RELAÇÕES - Agenda
// ==========================================

export const audienciasRelations = relations(audiencias, ({ one, many }) => ({
  processo: one(processos, { fields: [audiencias.processoId], references: [processos.id] }),
  defensor: one(users, { fields: [audiencias.defensorId], references: [users.id] }),
  analisesCowork: many(analisesCowork),
}));

export const audienciasHistoricoRelations = relations(audienciasHistorico, ({ one }) => ({
  audiencia: one(audiencias, { fields: [audienciasHistorico.audienciaId], references: [audiencias.id] }),
  editadoPor: one(users, { fields: [audienciasHistorico.editadoPorId], references: [users.id] }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  processo: one(processos, { fields: [calendarEvents.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [calendarEvents.assistidoId], references: [assistidos.id] }),
  demanda: one(demandas, { fields: [calendarEvents.demandaId], references: [demandas.id] }),
  createdBy: one(users, { fields: [calendarEvents.createdById], references: [users.id] }),
}));

export const atendimentosRelations = relations(atendimentos, ({ one, many }) => ({
  assistido: one(assistidos, { fields: [atendimentos.assistidoId], references: [assistidos.id] }),
  processo: one(processos, { fields: [atendimentos.processoId], references: [processos.id] }),
  atendidoPor: one(users, { fields: [atendimentos.atendidoPorId], references: [users.id] }),
}));

export const testemunhasRelations = relations(testemunhas, ({ one }) => ({
  processo: one(processos, { fields: [testemunhas.processoId], references: [processos.id] }),
  caso: one(casos, { fields: [testemunhas.casoId], references: [casos.id] }),
  audiencia: one(audiencias, { fields: [testemunhas.audienciaId], references: [audiencias.id] }),
}));
