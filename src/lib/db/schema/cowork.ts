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
import { users, processos, assistidos, demandas } from "./core";

// ==========================================
// COWORK - PARECERES (CONSULTAS RAPIDAS)
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
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("pareceres_solicitante_id_idx").on(table.solicitanteId),
  index("pareceres_respondedor_id_idx").on(table.respondedorId),
  index("pareceres_status_idx").on(table.status),
]);

export type Parecer = typeof pareceres.$inferSelect;
export type InsertParecer = typeof pareceres.$inferInsert;

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
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("mural_notas_autor_id_idx").on(table.autorId),
  index("mural_notas_fixado_idx").on(table.fixado),
]);

export type MuralNota = typeof muralNotas.$inferSelect;
export type InsertMuralNota = typeof muralNotas.$inferInsert;

// ==========================================
// COWORK - ENCAMINHAMENTOS (fase 1 — backend)
// ==========================================

export const encaminhamentos = pgTable("encaminhamentos", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),

  remetenteId: integer("remetente_id").notNull().references(() => users.id),

  tipo: varchar("tipo", { length: 20 }).notNull(),
  // 'transferir' | 'encaminhar' | 'acompanhar' | 'anotar' | 'parecer'

  titulo: varchar("titulo", { length: 200 }),
  mensagem: text("mensagem").notNull(),

  demandaId: integer("demanda_id").references(() => demandas.id),
  processoId: integer("processo_id").references(() => processos.id),
  assistidoId: integer("assistido_id").references(() => assistidos.id),

  status: varchar("status", { length: 20 }).notNull().default("pendente"),
  urgencia: varchar("urgencia", { length: 10 }).notNull().default("normal"),

  notificarOmbuds: boolean("notificar_ombuds").notNull().default(true),
  notificarWhatsapp: boolean("notificar_whatsapp").notNull().default(false),
  notificarEmail: boolean("notificar_email").notNull().default(false),

  concluidoEm: timestamp("concluido_em"),
  concluidoPorId: integer("concluido_por_id").references(() => users.id),
  motivoRecusa: text("motivo_recusa"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("enc_workspace_idx").on(table.workspaceId),
  index("enc_remetente_idx").on(table.remetenteId),
  index("enc_demanda_idx").on(table.demandaId),
  index("enc_status_idx").on(table.status),
  index("enc_created_idx").on(table.createdAt),
]);

export type Encaminhamento = typeof encaminhamentos.$inferSelect;
export type InsertEncaminhamento = typeof encaminhamentos.$inferInsert;

export const encaminhamentoDestinatarios = pgTable("encaminhamento_destinatarios", {
  id: serial("id").primaryKey(),
  encaminhamentoId: integer("encaminhamento_id").notNull()
    .references(() => encaminhamentos.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  estadoPessoal: varchar("estado_pessoal", { length: 20 }).notNull().default("pendente"),
  lidoEm: timestamp("lido_em"),
  cienteEm: timestamp("ciente_em"),
}, (table) => [
  uniqueIndex("enc_dest_unique").on(table.encaminhamentoId, table.userId),
  index("enc_dest_user_idx").on(table.userId),
]);

export type EncaminhamentoDestinatario = typeof encaminhamentoDestinatarios.$inferSelect;

export const encaminhamentoRespostas = pgTable("encaminhamento_respostas", {
  id: serial("id").primaryKey(),
  encaminhamentoId: integer("encaminhamento_id").notNull()
    .references(() => encaminhamentos.id, { onDelete: "cascade" }),
  autorId: integer("autor_id").notNull().references(() => users.id),
  mensagem: text("mensagem").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("enc_resp_enc_idx").on(table.encaminhamentoId),
]);

export type EncaminhamentoResposta = typeof encaminhamentoRespostas.$inferSelect;

export const encaminhamentoAnexos = pgTable("encaminhamento_anexos", {
  id: serial("id").primaryKey(),
  encaminhamentoId: integer("encaminhamento_id")
    .references(() => encaminhamentos.id, { onDelete: "cascade" }),
  respostaId: integer("resposta_id")
    .references(() => encaminhamentoRespostas.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 20 }).notNull(),
  driveFileId: varchar("drive_file_id", { length: 80 }),
  storageUrl: text("storage_url"),
  nome: varchar("nome", { length: 200 }),
  sizeBytes: integer("size_bytes"),
  duracaoSeg: integer("duracao_seg"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type EncaminhamentoAnexo = typeof encaminhamentoAnexos.$inferSelect;

export const demandasAcompanhantes = pgTable("demandas_acompanhantes", {
  id: serial("id").primaryKey(),
  demandaId: integer("demanda_id").notNull()
    .references(() => demandas.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id),
  origemEncaminhamentoId: integer("origem_encaminhamento_id")
    .references(() => encaminhamentos.id, { onDelete: "set null" }),
  notificarAlteracoes: boolean("notificar_alteracoes").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("dem_acomp_unique").on(table.demandaId, table.userId),
  index("dem_acomp_user_idx").on(table.userId),
]);

export type DemandaAcompanhante = typeof demandasAcompanhantes.$inferSelect;

// ==========================================
// RELACOES - Cowork
// ==========================================

export const pareceresRelations = relations(pareceres, ({ one }) => ({
  solicitante: one(users, { fields: [pareceres.solicitanteId], references: [users.id] }),
  respondedor: one(users, { fields: [pareceres.respondedorId], references: [users.id] }),
  assistido: one(assistidos, { fields: [pareceres.assistidoId], references: [assistidos.id] }),
  processo: one(processos, { fields: [pareceres.processoId], references: [processos.id] }),
}));

export const muralNotasRelations = relations(muralNotas, ({ one }) => ({
  autor: one(users, { fields: [muralNotas.autorId], references: [users.id] }),
  assistido: one(assistidos, { fields: [muralNotas.assistidoId], references: [assistidos.id] }),
  processo: one(processos, { fields: [muralNotas.processoId], references: [processos.id] }),
}));

export const encaminhamentosRelations = relations(encaminhamentos, ({ one, many }) => ({
  remetente: one(users, { fields: [encaminhamentos.remetenteId], references: [users.id] }),
  concluidoPor: one(users, { fields: [encaminhamentos.concluidoPorId], references: [users.id] }),
  demanda: one(demandas, { fields: [encaminhamentos.demandaId], references: [demandas.id] }),
  processo: one(processos, { fields: [encaminhamentos.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [encaminhamentos.assistidoId], references: [assistidos.id] }),
  destinatarios: many(encaminhamentoDestinatarios),
  respostas: many(encaminhamentoRespostas),
  anexos: many(encaminhamentoAnexos),
}));

export const encaminhamentoDestinatariosRelations = relations(encaminhamentoDestinatarios, ({ one }) => ({
  encaminhamento: one(encaminhamentos, {
    fields: [encaminhamentoDestinatarios.encaminhamentoId],
    references: [encaminhamentos.id],
  }),
  user: one(users, { fields: [encaminhamentoDestinatarios.userId], references: [users.id] }),
}));

export const encaminhamentoRespostasRelations = relations(encaminhamentoRespostas, ({ one, many }) => ({
  encaminhamento: one(encaminhamentos, {
    fields: [encaminhamentoRespostas.encaminhamentoId],
    references: [encaminhamentos.id],
  }),
  autor: one(users, { fields: [encaminhamentoRespostas.autorId], references: [users.id] }),
  anexos: many(encaminhamentoAnexos),
}));

export const demandasAcompanhantesRelations = relations(demandasAcompanhantes, ({ one }) => ({
  demanda: one(demandas, { fields: [demandasAcompanhantes.demandaId], references: [demandas.id] }),
  user: one(users, { fields: [demandasAcompanhantes.userId], references: [users.id] }),
  origemEncaminhamento: one(encaminhamentos, {
    fields: [demandasAcompanhantes.origemEncaminhamentoId],
    references: [encaminhamentos.id],
  }),
}));
