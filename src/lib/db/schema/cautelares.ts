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

// ==========================================
// STACK DEDICADA — PRISÃO PREVENTIVA (art. 312/313 CPP)
// ==========================================
// Camada rica do decreto de preventiva: requisitos do art. 312 com a
// fundamentação fática NAS PALAVRAS DO JUIZ (verbatim), pressupostos,
// histórico de local de custódia, saúde/segurança, visitas e excesso de prazo.
// O TEMPO de prisão e a situação vêm da timeline da cronologia (não duplicar).

export type RequisitoPreventiva = {
  // garantia da ordem pública | garantia da ordem econômica |
  // conveniência da instrução criminal | assegurar a aplicação da lei penal
  tipo: "ordem_publica" | "ordem_economica" | "instrucao_criminal" | "aplicacao_lei_penal";
  presente: boolean;
  /** Fundamentação fática transcrita das palavras do juiz. */
  fundamentacao: string | null;
  idFl?: string | null;
};

export const prisaoPreventiva = pgTable(
  "prisao_preventiva",
  {
    id: serial("id").primaryKey(),
    processoId: integer("processo_id")
      .notNull()
      .references(() => processos.id, { onDelete: "cascade" }),
    cautelarId: integer("cautelar_id").references(() => cautelaresDecisao.id, {
      onDelete: "set null",
    }),
    orgaoDecisor: varchar("orgao_decisor", { length: 160 }),
    dataDecreto: date("data_decreto"),
    /** Requisitos do art. 312 (quais foram invocados + fundamentação verbatim). */
    requisitos: jsonb("requisitos").$type<RequisitoPreventiva[]>(),
    /** Pressupostos do art. 312 caput (fumus comissi delicti). */
    pressupostos: jsonb("pressupostos").$type<{
      materialidade?: string | null;
      indiciosAutoria?: string | null;
    }>(),
    contemporaneidade: text("contemporaneidade"),
    localCustodia: varchar("local_custodia", { length: 200 }),
    historicoCustodia: jsonb("historico_custodia").$type<
      Array<{ local: string; de: string | null; ate: string | null; motivo?: string | null }>
    >(),
    saude: jsonb("saude").$type<
      Array<{ data: string | null; descricao: string; gravidade?: string | null }>
    >(),
    seguranca: jsonb("seguranca").$type<Array<{ data: string | null; descricao: string }>>(),
    visitas: jsonb("visitas").$type<{
      social?: string | null;
      intima?: string | null;
      observacao?: string | null;
    }>(),
    /** Análise de demora injustificada / excesso de prazo (do dossiê). */
    excessoPrazo: jsonb("excesso_prazo").$type<{
      ha_excesso?: boolean;
      fase?: string | null;
      dias?: number | null;
      nota?: string | null;
    }>(),
    situacao: varchar("situacao", { length: 20 }).default("preso"), // preso | domiciliar | solto
    dataSoltura: date("data_soltura"),
    status: varchar("status", { length: 20 }).default("ativa"), // ativa | revogada | substituida
    origem: varchar("origem", { length: 20 }).default("parser"), // parser | manual | claude
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    index("prisao_preventiva_processo_id_idx").on(table.processoId),
    index("prisao_preventiva_status_idx").on(table.status),
  ],
);

export type PrisaoPreventivaRow = typeof prisaoPreventiva.$inferSelect;
export type InsertPrisaoPreventiva = typeof prisaoPreventiva.$inferInsert;

export const prisaoPreventivaRelations = relations(prisaoPreventiva, ({ one }) => ({
  processo: one(processos, {
    fields: [prisaoPreventiva.processoId],
    references: [processos.id],
  }),
}));
