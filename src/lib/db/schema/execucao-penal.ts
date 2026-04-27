import { pgTable, serial, integer, varchar, text, numeric, date, timestamp } from "drizzle-orm/pg-core";
import { processos } from "./core";
import { pessoas } from "./pessoas";

export const execucaoPenal = pgTable("execucao_penal", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").notNull().references(() => processos.id, { onDelete: "cascade" }),
  pessoaId: integer("pessoa_id").references(() => pessoas.id),
  dataInicioPena: date("data_inicio_pena"),
  dataTerminoPrevisto: date("data_termino_previsto"),
  dataProgressaoPrevista: date("data_progressao_prevista"),
  dataLivramentoPrevisto: date("data_livramento_previsto"),
  penaTotalDias: integer("pena_total_dias"),
  regimeAtual: varchar("regime_atual", { length: 20 }),
  unidadeAtual: varchar("unidade_atual", { length: 200 }),
  jaRemidoDias: integer("ja_remido_dias").default(0),
  jaCumpridoDias: integer("ja_cumprido_dias").default(0),
  observacoes: text("observacoes"),
  fonte: varchar("fonte", { length: 30 }).notNull().default("manual"),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).default("0.9"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const execucaoPenalEventos = pgTable("execucao_penal_eventos", {
  id: serial("id").primaryKey(),
  execucaoId: integer("execucao_id").notNull().references(() => execucaoPenal.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 40 }).notNull(),
  data: date("data").notNull(),
  detalhes: text("detalhes"),
  fonte: varchar("fonte", { length: 30 }).notNull().default("manual"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});
