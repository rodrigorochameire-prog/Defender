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
import { users } from "./core";
import { comarcas } from "./comarcas";

// ==========================================
// PROFISSIONAIS (Defensores)
// ==========================================

export const profissionais = pgTable("profissionais", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "set null" }),
  nome: text("nome").notNull(),
  nomeCurto: varchar("nome_curto", { length: 50 }),
  email: text("email").unique(),
  grupo: varchar("grupo", { length: 30 }).notNull(),
  vara: varchar("vara", { length: 50 }),
  cor: varchar("cor", { length: 20 }).default("zinc"),
  ativo: boolean("ativo").default(true).notNull(),
  comarcaId: integer("comarca_id").references(() => comarcas.id).default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("profissionais_grupo_idx").on(table.grupo),
  index("profissionais_user_id_idx").on(table.userId),
  index("profissionais_ativo_idx").on(table.ativo),
  index("profissionais_comarca_id_idx").on(table.comarcaId),
]);

export type Profissional = typeof profissionais.$inferSelect;
export type InsertProfissional = typeof profissionais.$inferInsert;

// ==========================================
// ESCALA DE ATRIBUIÇÕES
// ==========================================

export const escalasAtribuicao = pgTable("escalas_atribuicao", {
  id: serial("id").primaryKey(),
  profissionalId: integer("profissional_id").references(() => profissionais.id, { onDelete: "cascade" }),
  atribuicao: varchar("atribuicao", { length: 30 }).notNull(),
  mes: integer("mes").notNull(),
  ano: integer("ano").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  comarcaId: integer("comarca_id").references(() => comarcas.id).default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("escalas_mes_ano_idx").on(table.mes, table.ano),
  index("escalas_profissional_idx").on(table.profissionalId),
  index("escalas_comarca_id_idx").on(table.comarcaId),
]);

export type EscalaAtribuicao = typeof escalasAtribuicao.$inferSelect;
export type InsertEscalaAtribuicao = typeof escalasAtribuicao.$inferInsert;

// ==========================================
// COMPARTILHAMENTOS
// ==========================================

export const compartilhamentos = pgTable("compartilhamentos", {
  id: serial("id").primaryKey(),
  entidadeTipo: varchar("entidade_tipo", { length: 30 }).notNull(),
  entidadeId: integer("entidade_id").notNull(),
  compartilhadoPorId: integer("compartilhado_por").references(() => profissionais.id, { onDelete: "cascade" }),
  compartilhadoComId: integer("compartilhado_com").references(() => profissionais.id, { onDelete: "cascade" }),
  motivo: text("motivo"),
  dataInicio: timestamp("data_inicio").defaultNow().notNull(),
  dataFim: timestamp("data_fim"),
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
// RELAÇÕES - Equipe
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
