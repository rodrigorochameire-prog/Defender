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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { chatMessageTypeEnum } from "./enums";
import { users, processos, assistidos, demandas } from "./core";

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

  type: varchar("type", { length: 100 }).notNull(),
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
  context: varchar("context", { length: 50 }),
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
// ==========================================

export const evolutionConfig = pgTable("evolution_config", {
  id: serial("id").primaryKey(),

  // Configuração da instância
  instanceName: varchar("instance_name", { length: 100 }).notNull().unique(),
  apiUrl: text("api_url").notNull(),
  apiKey: text("api_key").notNull(),

  // Status da conexão
  status: varchar("status", { length: 20 }).default("disconnected").notNull(),
  qrCode: text("qr_code"),
  phoneNumber: varchar("phone_number", { length: 20 }),

  // Webhook
  webhookUrl: text("webhook_url"),
  webhookSecret: text("webhook_secret"),

  // Configurações
  isActive: boolean("is_active").default(false).notNull(),
  autoReply: boolean("auto_reply").default(false).notNull(),
  autoReplyMessage: text("auto_reply_message"),

  // Metadados
  lastSyncAt: timestamp("last_sync_at"),
  lastDisconnectReason: text("last_disconnect_reason"),
  lastSyncContactsCount: integer("last_sync_contacts_count").default(0),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("evolution_config_instance_name_idx").on(table.instanceName),
  index("evolution_config_status_idx").on(table.status),
]);

export type EvolutionConfig = typeof evolutionConfig.$inferSelect;
export type InsertEvolutionConfig = typeof evolutionConfig.$inferInsert;

// ==========================================
// WHATSAPP CONNECTION LOG
// ==========================================

export const whatsappConnectionLog = pgTable("whatsapp_connection_log", {
  id: serial("id").primaryKey(),
  configId: integer("config_id").references(() => evolutionConfig.id, { onDelete: "cascade" }),
  event: text("event").notNull(),
  details: jsonb("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  index("idx_whatsapp_connection_log_config_date").on(table.configId, table.createdAt),
]);

// ==========================================
// WHATSAPP TEMPLATES
// ==========================================

export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: serial("id").primaryKey(),

  // Identificação
  name: varchar("name", { length: 100 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  shortcut: varchar("shortcut", { length: 50 }),
  category: varchar("category", { length: 50 }).default("geral").notNull(),

  // Conteúdo
  content: text("content").notNull(),
  variables: text("variables").array(),

  // Ordenação e status
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),

  // Metadados
  createdById: integer("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("whatsapp_templates_shortcut_idx").on(table.shortcut),
  index("whatsapp_templates_category_idx").on(table.category),
]);

export type WhatsAppTemplate = typeof whatsappTemplates.$inferSelect;
export type InsertWhatsAppTemplate = typeof whatsappTemplates.$inferInsert;

// ==========================================
// CONTATOS WHATSAPP CHAT
// ==========================================

export const whatsappContacts = pgTable("whatsapp_contacts", {
  id: serial("id").primaryKey(),
  configId: integer("config_id")
    .notNull()
    .references(() => evolutionConfig.id, { onDelete: "cascade" }),

  // Identificação
  phone: varchar("phone", { length: 20 }).notNull(),
  name: text("name"),
  pushName: text("push_name"),
  profilePicUrl: text("profile_pic_url"),

  // Vínculo com assistido
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "set null" }),

  // Identificação do interlocutor
  contactRelation: varchar("contact_relation", { length: 20 }),
  contactRelationDetail: text("contact_relation_detail"),

  // Organização
  tags: text("tags").array(),
  notes: text("notes"),

  // Status da conversa
  lastMessageAt: timestamp("last_message_at"),
  lastMessageContent: text("last_message_content"),
  lastMessageDirection: varchar("last_message_direction", { length: 10 }),
  lastMessageType: varchar("last_message_type", { length: 20 }),
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

// ==========================================
// MENSAGENS DO WHATSAPP CHAT
// ==========================================

export const whatsappChatMessages = pgTable("whatsapp_chat_messages", {
  id: serial("id").primaryKey(),
  contactId: integer("contact_id")
    .notNull()
    .references(() => whatsappContacts.id, { onDelete: "cascade" }),

  // Identificação da mensagem
  waMessageId: varchar("wa_message_id", { length: 255 }),

  // Direção e tipo
  direction: varchar("direction", { length: 10 }).notNull(),
  type: chatMessageTypeEnum("type").default("text").notNull(),

  // Conteúdo
  content: text("content"),
  mediaUrl: text("media_url"),
  mediaMimeType: varchar("media_mime_type", { length: 100 }),
  mediaFilename: varchar("media_filename", { length: 255 }),

  // Reply (quoted message)
  replyToId: varchar("reply_to_id", { length: 200 }),

  // Status
  status: varchar("status", { length: 20 }).default("sent").notNull(),

  // Metadados
  metadata: jsonb("metadata").default({}),

  // Import flag
  imported: boolean("imported").default(false).notNull(),
  importedAt: timestamp("imported_at"),

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
// ==========================================

export const plaudConfig = pgTable("plaud_config", {
  id: serial("id").primaryKey(),

  // Configuração da API
  apiKey: text("api_key"),
  apiSecret: text("api_secret"),
  webhookSecret: text("webhook_secret"),

  // Dispositivo vinculado
  deviceId: varchar("device_id", { length: 100 }),
  deviceName: varchar("device_name", { length: 100 }),
  deviceModel: varchar("device_model", { length: 50 }),

  // Configurações de transcrição
  defaultLanguage: varchar("default_language", { length: 10 }).default("pt-BR"),
  autoTranscribe: boolean("auto_transcribe").default(true),
  autoSummarize: boolean("auto_summarize").default(true),

  // Configurações de upload para Drive
  autoUploadToDrive: boolean("auto_upload_to_drive").default(true),
  driveFolderId: varchar("drive_folder_id", { length: 100 }),

  // Status
  isActive: boolean("is_active").default(false).notNull(),
  lastSyncAt: timestamp("last_sync_at"),

  // Metadados
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("plaud_config_device_id_idx").on(table.deviceId),
  index("plaud_config_is_active_idx").on(table.isActive),
]);

export type PlaudConfig = typeof plaudConfig.$inferSelect;
export type InsertPlaudConfig = typeof plaudConfig.$inferInsert;

// ==========================================
// PLAUD RECORDINGS
// ==========================================

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
  duration: integer("duration"),
  recordedAt: timestamp("recorded_at"),
  fileSize: integer("file_size"),

  // Status de processamento
  status: varchar("status", { length: 20 }).default("received"),
  errorMessage: text("error_message"),

  // Transcrição recebida
  transcription: text("transcription"),
  summary: text("summary"),
  speakers: jsonb("speakers").$type<{ id: string; name?: string; speakingTime?: number }[]>(),

  // Vinculação ao atendimento
  atendimentoId: integer("atendimento_id"), // plain integer to avoid circular dep with agenda.ts
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "set null" }),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "set null" }),

  // Arquivo no Drive
  driveFileId: varchar("drive_file_id", { length: 100 }),
  driveFileUrl: text("drive_file_url"),

  // Metadados
  rawPayload: jsonb("raw_payload"),
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
// RELAÇÕES - Comunicacao
// ==========================================

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

export const whatsappTemplatesRelations = relations(whatsappTemplates, ({ one }) => ({
  createdBy: one(users, { fields: [whatsappTemplates.createdById], references: [users.id] }),
}));

export const evolutionConfigRelations = relations(evolutionConfig, ({ one, many }) => ({
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

export const plaudConfigRelations = relations(plaudConfig, ({ one, many }) => ({
  createdBy: one(users, { fields: [plaudConfig.createdById], references: [users.id] }),
  recordings: many(plaudRecordings),
}));

export const plaudRecordingsRelations = relations(plaudRecordings, ({ one }) => ({
  config: one(plaudConfig, { fields: [plaudRecordings.configId], references: [plaudConfig.id] }),
  assistido: one(assistidos, { fields: [plaudRecordings.assistidoId], references: [assistidos.id] }),
}));
