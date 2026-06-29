import { pgTable, pgEnum, serial, integer, text, boolean, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./core";

export const sigaImportDecisaoEnum = pgEnum("siga_import_decisao", ["nova", "ja_importada", "atualizada"]);

export const sigaImportStaging = pgTable("siga_import_staging", {
  id: serial("id").primaryKey(),
  defensorId: integer("defensor_id").references(() => users.id).notNull(),
  sessionId: text("session_id").notNull(),
  tipo: text("tipo").notNull(), // licenca | outra_ausencia | ferias | afastamento
  nSiga: text("n_siga"),
  numeroSolicitacao: text("numero_solicitacao"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  decisao: sigaImportDecisaoEnum("decisao").default("nova").notNull(),
  matchedAusenciaId: integer("matched_ausencia_id"),
  importavel: boolean("importavel").default(false).notNull(),
  selected: boolean("selected").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (t) => [
  index("siga_import_staging_defensor_session_idx").on(t.defensorId, t.sessionId),
  index("siga_import_staging_defensor_nsiga_idx").on(t.defensorId, t.nSiga),
]);

export type SigaImportStaging = typeof sigaImportStaging.$inferSelect;
export type InsertSigaImportStaging = typeof sigaImportStaging.$inferInsert;
