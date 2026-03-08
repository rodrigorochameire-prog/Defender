import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users, processos, assistidos } from "./core";

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
