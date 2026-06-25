import {
  pgTable,
  serial,
  integer,
  text,
  varchar,
  boolean,
  timestamp,
  date,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  atribuicaoEnum,
  stagingDecisaoEnum,
  ledgerDecisaoEnum,
} from "./enums";

// Efêmera: 1 linha por expediente raspado num job. Pode ser podada após confirm.
export const pjeImportStaging = pgTable("pje_import_staging", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(), // = claude_code_tasks.id
  atribuicao: atribuicaoEnum("atribuicao"),
  processoNumero: varchar("processo_numero", { length: 40 }),
  assistidoNome: text("assistido_nome"),
  ato: text("ato"),
  tipoDocumento: varchar("tipo_documento", { length: 80 }),
  dataExpedicao: timestamp("data_expedicao"),
  dataIntimacao: timestamp("data_intimacao"),
  prazo: date("prazo"),
  conteudo: text("conteudo"),
  pjeDocumentoId: varchar("pje_documento_id", { length: 30 }),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  decisao: stagingDecisaoEnum("decisao").notNull().default("nova"),
  matchedDemandaId: integer("matched_demanda_id"),
  matchedLedgerId: integer("matched_ledger_id"),
  selected: boolean("selected").notNull().default(false),
  revisao: jsonb("revisao").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("pje_import_staging_job_id_idx").on(table.jobId),
  index("pje_import_staging_content_hash_idx").on(table.contentHash),
]);

export type PjeImportStaging = typeof pjeImportStaging.$inferSelect;
export type InsertPjeImportStaging = typeof pjeImportStaging.$inferInsert;

// Permanente: memória de toda intimação já vista (importada/pulada/duplicada).
export const pjeIntimacoesLedger = pgTable("pje_intimacoes_ledger", {
  id: serial("id").primaryKey(),
  pjeDocumentoId: varchar("pje_documento_id", { length: 30 }),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  processoNumero: varchar("processo_numero", { length: 40 }),
  processoId: integer("processo_id"),
  atribuicao: atribuicaoEnum("atribuicao"),
  decisao: ledgerDecisaoEnum("decisao").notNull(),
  demandaId: integer("demanda_id"),
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  jobId: integer("job_id"),
}, (table) => [
  // Chave forte: pjeDocumentoId único quando presente.
  uniqueIndex("pje_ledger_documento_id_uidx")
    .on(table.pjeDocumentoId)
    .where(sql`pje_documento_id IS NOT NULL`),
  // Chave fallback: contentHash único quando NÃO há pjeDocumentoId.
  uniqueIndex("pje_ledger_content_hash_uidx")
    .on(table.contentHash)
    .where(sql`pje_documento_id IS NULL`),
  index("pje_ledger_processo_numero_idx").on(table.processoNumero),
]);

export type PjeIntimacoesLedger = typeof pjeIntimacoesLedger.$inferSelect;
export type InsertPjeIntimacoesLedger = typeof pjeIntimacoesLedger.$inferInsert;
