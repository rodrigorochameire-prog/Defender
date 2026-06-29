import { pgTable, serial, integer, text, varchar, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { atribuicaoEnum } from "./enums";

// Efêmera: 1 linha por audiência raspada num job da pauta. Pode ser podada após confirm.
export const pautaImportStaging = pgTable("pauta_import_staging", {
  id: serial("id").primaryKey(),
  jobId: integer("job_id").notNull(), // = claude_code_tasks.id
  atribuicao: atribuicaoEnum("atribuicao"),
  dataAudiencia: timestamp("data_audiencia"),
  processoNumero: varchar("processo_numero", { length: 40 }),
  orgaoJulgador: text("orgao_julgador"),
  partesRaw: text("partes_raw"),
  classeRaw: text("classe_raw"),
  tipoRaw: text("tipo_raw"),
  sala: varchar("sala", { length: 40 }),
  situacao: varchar("situacao", { length: 30 }),
  contentHash: varchar("content_hash", { length: 64 }).notNull(),
  selected: boolean("selected").notNull().default(true),
  revisao: jsonb("revisao").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("pauta_import_staging_job_id_idx").on(t.jobId),
  index("pauta_import_staging_content_hash_idx").on(t.contentHash),
]);

export type PautaImportStaging = typeof pautaImportStaging.$inferSelect;
export type InsertPautaImportStaging = typeof pautaImportStaging.$inferInsert;
