import {
  pgTable, serial, integer, varchar, text, timestamp, date, primaryKey,
  index, check, pgEnum
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { demandas, users } from "./core";
import { registros as atendimentos } from "./agenda";

export const demandaEventoTipoEnum = pgEnum("demanda_evento_tipo", [
  "atendimento",
  "diligencia",
  "observacao",
]);

export const demandaEventos = pgTable("demanda_eventos", {
  id: serial("id").primaryKey(),
  demandaId: integer("demanda_id").notNull()
    .references(() => demandas.id, { onDelete: "cascade" }),
  tipo: demandaEventoTipoEnum("tipo").notNull(),
  subtipo: varchar("subtipo", { length: 30 }),
  status: varchar("status", { length: 20 }),
  resumo: varchar("resumo", { length: 140 }).notNull(),
  descricao: text("descricao"),
  prazo: date("prazo"),
  responsavelId: integer("responsavel_id").references(() => users.id),
  atendimentoId: integer("atendimento_id")
    .references(() => atendimentos.id, { onDelete: "set null" }),
  autorId: integer("autor_id").notNull().references(() => users.id),
  dataConclusao: timestamp("data_conclusao"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
}, (table) => [
  index("demanda_eventos_demanda_created_idx")
    .on(table.demandaId, table.createdAt.desc()),
  index("demanda_eventos_pendentes_idx")
    .on(table.demandaId, table.tipo, table.status),
  index("demanda_eventos_autor_idx").on(table.autorId, table.createdAt.desc()),
  index("demanda_eventos_prazo_idx").on(table.prazo),
  index("demanda_eventos_atendimento_idx").on(table.atendimentoId),
  index("demanda_eventos_deleted_idx").on(table.deletedAt),
  check(
    "demanda_eventos_diligencia_only",
    sql`${table.tipo} = 'diligencia' OR (${table.subtipo} IS NULL AND ${table.status} IS NULL AND ${table.prazo} IS NULL)`
  ),
  check(
    "demanda_eventos_atendimento_only",
    sql`${table.tipo} = 'atendimento' OR ${table.atendimentoId} IS NULL`
  ),
]);

export const atendimentoDemandas = pgTable("atendimento_demandas", {
  atendimentoId: integer("atendimento_id").notNull()
    .references(() => atendimentos.id, { onDelete: "cascade" }),
  demandaId: integer("demanda_id").notNull()
    .references(() => demandas.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.atendimentoId, table.demandaId] }),
  index("atendimento_demandas_demanda_idx").on(table.demandaId),
]);

export type DemandaEvento = typeof demandaEventos.$inferSelect;
export type InsertDemandaEvento = typeof demandaEventos.$inferInsert;
export type AtendimentoDemanda = typeof atendimentoDemandas.$inferSelect;
export type InsertAtendimentoDemanda = typeof atendimentoDemandas.$inferInsert;

export const DEMANDA_EVENTO_TIPOS = demandaEventoTipoEnum.enumValues;
export const DILIGENCIA_SUBTIPOS = ["peticao","contato_cartorio","contato_orgao","juntada","recurso","outro"] as const;
export const DILIGENCIA_STATUS = ["pendente","feita","cancelada"] as const;
