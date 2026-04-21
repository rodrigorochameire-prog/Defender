import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  numeric,
  date,
  timestamp,
} from "drizzle-orm/pg-core";
import { processos } from "./core";
import { pessoas } from "./pessoas";

// ==========================================
// CRONOLOGIA (Fase IV-A)
// ==========================================

export const marcoTipoEnum = pgEnum("marco_tipo", [
  "fato",
  "apf",
  "audiencia-custodia",
  "denuncia",
  "recebimento-denuncia",
  "resposta-acusacao",
  "aij-designada",
  "aij-realizada",
  "memoriais",
  "sentenca",
  "recurso-interposto",
  "acordao-recurso",
  "transito-julgado",
  "execucao-inicio",
  "outro",
]);

export const prisaoTipoEnum = pgEnum("prisao_tipo", [
  "flagrante",
  "temporaria",
  "preventiva",
  "decorrente-sentenca",
  "outro",
]);

export const prisaoSituacaoEnum = pgEnum("prisao_situacao", [
  "ativa",
  "relaxada",
  "revogada",
  "extinta",
  "cumprida",
  "convertida-em-preventiva",
]);

export const cautelarTipoEnum = pgEnum("cautelar_tipo", [
  "monitoramento-eletronico",
  "comparecimento-periodico",
  "recolhimento-noturno",
  "proibicao-contato",
  "proibicao-frequentar",
  "afastamento-lar",
  "fianca",
  "suspensao-porte-arma",
  "suspensao-habilitacao",
  "outro",
]);

export const cautelarStatusEnum = pgEnum("cautelar_status", [
  "ativa",
  "cumprida",
  "descumprida",
  "revogada",
  "extinta",
]);

export const marcosProcessuais = pgTable("marcos_processuais", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  tipo: marcoTipoEnum("tipo").notNull(),
  data: date("data").notNull(),
  documentoReferencia: text("documento_referencia"),
  observacoes: text("observacoes"),
  fonte: varchar("fonte", { length: 30 }).notNull(),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).default("0.9"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const prisoes = pgTable("prisoes", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  pessoaId: integer("pessoa_id").references(() => pessoas.id),
  tipo: prisaoTipoEnum("tipo").notNull(),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim"),
  motivo: text("motivo"),
  unidade: varchar("unidade", { length: 200 }),
  situacao: prisaoSituacaoEnum("situacao").notNull().default("ativa"),
  fonte: varchar("fonte", { length: 30 }).notNull(),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).default("0.9"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const cautelares = pgTable("cautelares", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  pessoaId: integer("pessoa_id").references(() => pessoas.id),
  tipo: cautelarTipoEnum("tipo").notNull(),
  dataInicio: date("data_inicio").notNull(),
  dataFim: date("data_fim"),
  detalhes: text("detalhes"),
  status: cautelarStatusEnum("status").notNull().default("ativa"),
  fonte: varchar("fonte", { length: 30 }).notNull(),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).default("0.9"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});
