import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  numeric,
  timestamp,
  date,
  jsonb,
  bigserial,
} from "drizzle-orm/pg-core";

// ==========================================
// LUGARES (Fase II-A)
// ==========================================

export const lugarTipoParticipacaoEnum = pgEnum("lugar_tipo_participacao", [
  "local-do-fato",
  "endereco-assistido",
  "residencia-agressor",
  "trabalho-agressor",
  "local-atendimento",
  "radar-noticia",
]);

export const lugares = pgTable("lugares", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  logradouro: text("logradouro"),
  numero: varchar("numero", { length: 30 }),
  complemento: varchar("complemento", { length: 120 }),
  bairro: varchar("bairro", { length: 120 }),
  cidade: varchar("cidade", { length: 120 }).default("Camaçari"),
  uf: varchar("uf", { length: 2 }).default("BA"),
  cep: varchar("cep", { length: 9 }),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  enderecoCompleto: text("endereco_completo"),
  enderecoNormalizado: text("endereco_normalizado").notNull(),
  observacoes: text("observacoes"),
  fonteCriacao: varchar("fonte_criacao", { length: 40 }),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).default("0.9"),
  mergedInto: integer("merged_into"),
  geocodedAt: timestamp("geocoded_at", { withTimezone: true }),
  geocodingSource: varchar("geocoding_source", { length: 30 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const participacoesLugar = pgTable("participacoes_lugar", {
  id: serial("id").primaryKey(),
  lugarId: integer("lugar_id").notNull(),
  processoId: integer("processo_id"),
  pessoaId: integer("pessoa_id"),
  tipo: lugarTipoParticipacaoEnum("tipo").notNull(),
  dataRelacionada: date("data_relacionada"),
  sourceTable: varchar("source_table", { length: 40 }),
  sourceId: integer("source_id"),
  fonte: varchar("fonte", { length: 30 }).notNull(),
  confidence: numeric("confidence", { precision: 3, scale: 2 }).default("0.9"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const lugaresDistinctsConfirmed = pgTable("lugares_distincts_confirmed", {
  id: serial("id").primaryKey(),
  lugarAId: integer("lugar_a_id").notNull(),
  lugarBId: integer("lugar_b_id").notNull(),
  confirmedBy: integer("confirmed_by"),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }).defaultNow(),
});

export const lugaresAccessLog = pgTable("lugares_access_log", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  lugarId: integer("lugar_id"),
  userId: integer("user_id"),
  action: varchar("action", { length: 40 }).notNull(),
  context: jsonb("context"),
  ts: timestamp("ts", { withTimezone: true }).defaultNow(),
});
