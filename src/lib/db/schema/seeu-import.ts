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

// Efêmera: 1 linha por expediente raspado da Mesa do Defensor num job SEEU.
// Superconjunto de pje_import_staging (mesmas colunas + seq + tab) para reusar
// os helpers de serviço (stagingRowToImportRow, enrichStagingWithLiveDedup).
export const seeuImportStaging = pgTable("seeu_import_staging", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(), // = claude_code_tasks.id
  atribuicao: atribuicaoEnum("atribuicao"), // EXECUCAO_PENAL na Fase 1
  tab: text("tab"), // manifestacao | ciencia | razoes (aba de origem)
  seq: integer("seq"), // Seq do SEEU (parte da chave forte com processoNumero)
  processoNumero: varchar("processo_numero", { length: 40 }),
  assistidoNome: text("assistido_nome"),
  ato: text("ato"),
  tipoDocumento: varchar("tipo_documento", { length: 80 }),
  dataExpedicao: timestamp("data_expedicao"),
  dataIntimacao: timestamp("data_intimacao"),
  prazo: date("prazo"),
  conteudo: text("conteudo"),
  // Sempre NULL no SEEU (não há pjeDocumentoId); mantido p/ compat estrutural.
  pjeDocumentoId: varchar("pje_documento_id", { length: 30 }),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  decisao: stagingDecisaoEnum("decisao").notNull().default("nova"),
  matchedDemandaId: integer("matched_demanda_id"),
  matchedLedgerId: integer("matched_ledger_id"),
  selected: boolean("selected").notNull().default(false),
  revisao: jsonb("revisao").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("seeu_import_staging_job_id_idx").on(table.jobId),
  index("seeu_import_staging_content_hash_idx").on(table.contentHash),
  index("seeu_import_staging_proc_seq_idx").on(table.processoNumero, table.seq),
]);

export type SeeuImportStaging = typeof seeuImportStaging.$inferSelect;
export type InsertSeeuImportStaging = typeof seeuImportStaging.$inferInsert;

// Permanente: memória de toda intimação SEEU já vista. Chave forte = processo+seq.
export const seeuLedger = pgTable("seeu_ledger", {
  id: serial("id").primaryKey(),
  processoNumero: varchar("processo_numero", { length: 40 }),
  seq: integer("seq"),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  atribuicao: atribuicaoEnum("atribuicao"),
  ato: text("ato"),
  decisao: ledgerDecisaoEnum("decisao").notNull(),
  demandaId: integer("demanda_id"),
  firstSeenAt: timestamp("first_seen_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  jobId: integer("job_id"),
}, (table) => [
  // Chave forte: (processoNumero, seq) único quando seq presente.
  uniqueIndex("seeu_ledger_proc_seq_uidx")
    .on(table.processoNumero, table.seq)
    .where(sql`seq IS NOT NULL`),
  // Fallback: contentHash único quando NÃO há seq.
  uniqueIndex("seeu_ledger_content_hash_uidx")
    .on(table.contentHash)
    .where(sql`seq IS NULL`),
  index("seeu_ledger_processo_numero_idx").on(table.processoNumero),
]);

export type SeeuLedger = typeof seeuLedger.$inferSelect;
export type InsertSeeuLedger = typeof seeuLedger.$inferInsert;
