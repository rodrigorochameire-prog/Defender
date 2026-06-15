import {
  pgTable,
  serial,
  integer,
  varchar,
  jsonb,
  text,
  date,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { processos } from "./core";

// ==========================================
// MÓDULO CAUTELARES — medidas cautelares pessoais (CPP)
// ==========================================
// Prisão (preventiva/temporária/domiciliar) e medidas diversas da prisão
// (art. 319/320 CPP), parseadas de forma estruturada a partir das decisões.
// Diferente de medidas_mpu (subsistema VVD, chaveado por processo_vvd_id), esta
// tabela é GERAL e chaveia direto por processo_id — vale para qualquer processo
// criminal (júri, criminal comum, EP, VVD).

export const cautelaresDecisao = pgTable(
  "cautelares_decisao",
  {
    id: serial("id").primaryKey(),
    processoId: integer("processo_id")
      .notNull()
      .references(() => processos.id, { onDelete: "cascade" }),
    codigo: varchar("codigo", { length: 40 }).notNull(),
    especie: varchar("especie", { length: 10 }).notNull(), // "prisao" | "diversa"
    artigo: varchar("artigo", { length: 24 }),
    parametros: jsonb("parametros").$type<{
      periodicidade?: string;
      valorFianca?: string;
      horario?: string;
      distanciaMetros?: number;
      pessoas?: string[];
      lugares?: string[];
      /** Trilha de modulações: decisão posterior alterou a cautelar. */
      alteracoes?: Array<{
        em: string | null;
        descricao: string;
      }>;
    }>(),
    literal: text("literal"),
    dataDecisao: date("data_decisao"),
    status: varchar("status", { length: 20 }).default("ativa"),
    origem: varchar("origem", { length: 20 }).default("parser"), // parser | manual | claude
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("cautelares_decisao_processo_id_idx").on(table.processoId),
    index("cautelares_decisao_status_idx").on(table.status),
  ],
);

export type CautelarRow = typeof cautelaresDecisao.$inferSelect;
export type InsertCautelar = typeof cautelaresDecisao.$inferInsert;

export const cautelaresDecisaoRelations = relations(cautelaresDecisao, ({ one }) => ({
  processo: one(processos, {
    fields: [cautelaresDecisao.processoId],
    references: [processos.id],
  }),
}));
