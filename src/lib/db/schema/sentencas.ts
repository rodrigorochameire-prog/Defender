import {
  pgTable, serial, text, varchar, integer, jsonb, date, timestamp, index, uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";
import { assistidos, processos, demandas } from "./core";
import { comarcas } from "./comarcas";
import { defensoresBa } from "./defensoria";

// ── MAGISTRADOS (1º grau, shared registry) ──
export const magistrados = pgTable("magistrados", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  nomeNormalizado: text("nome_normalizado").notNull(), // uppercase/sem acento — match key
  comarcaId: integer("comarca_id").references(() => comarcas.id),
  varasConhecidas: jsonb("varas_conhecidas").$type<string[]>().default([]),
  entrancia: varchar("entrancia", { length: 30 }),
  status: varchar("status", { length: 20 }).default("ATIVO").notNull(), // ATIVO/APOSENTADO/AFASTADO/NAO_CONFIRMADO
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  index("magistrados_nome_norm_comarca_idx").on(t.nomeNormalizado, t.comarcaId),
  index("magistrados_status_idx").on(t.status),
]);
export type Magistrado = typeof magistrados.$inferSelect;
export type InsertMagistrado = typeof magistrados.$inferInsert;

// ── ANÁLISE SENTENÇA (jsonb payload) ──
export type Pena = {
  privativa: { anos: number; meses: number; dias: number } | null;
  regimeInicial: "FECHADO" | "SEMIABERTO" | "ABERTO" | null;
  substituicaoPRD: { concedida: boolean; quais: string[] };
  sursis: boolean;
  diasMulta: number | null;
  valorMulta: string | null;
  detracaoConsiderada: boolean;
};
export type CircunstanciaJudicial = {
  circunstancia: string;
  valoracao: "FAVORAVEL" | "DESFAVORAVEL" | "NEUTRA";
  fundamento: string;
};
export type TipoDecisao =
  | "CONDENATORIA" | "ABSOLUTORIA" | "PARCIAL" | "ABSOLVICAO_SUMARIA"
  | "EXTINTIVA_PUNIBILIDADE" | "PRONUNCIA" | "IMPRONUNCIA" | "DESCLASSIFICACAO";

export type AnaliseSentenca = {
  tipoDecisao: TipoDecisao;
  resultado: string;
  dispositivoResumo: string;
  crimesImputados: { artigo: string; descricao: string }[];
  crimesCondenados: { artigo: string; descricao: string }[];
  crimesAbsolvidos: { artigo: string; descricao: string }[];
  pena: Pena | null;
  dosimetria: {
    penaBase: string | null;
    circunstanciasJudiciais: CircunstanciaJudicial[];
    atenuantes: string[];
    agravantes: string[];
    causasAumento: string[];
    causasDiminuicao: string[];
    penaDefinitiva: string | null;
  } | null;
  tesesDefensivas: { acolhidas: string[]; rejeitadas: string[] };
  provasValoradas: string[];
  fundamentosChave: string[];
  precedentesCitados: string[];
  juizProlator: string;
  dataSentenca: string | null;  // ISO date (YYYY-MM-DD) extraída da sentença, ou null — alimenta sentencas.dataSentenca + dedupe tipo_data
  recurso: { prazoRecursal: string | null; recursoCabivel: string | null; fundamentoRecurso: string | null };
  flagsAlerta: string[];
  impactoParaDefesa: string;
  recomendacaoProxPasso: string;
  confidence: "alta" | "media" | "baixa";
};

// ── SENTENÇAS (shared row, detail-scoped in queries) ──
export const sentencas = pgTable("sentencas", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id").references(() => processos.id, { onDelete: "set null" }),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "set null" }),
  demandaOrigemId: integer("demanda_origem_id").references(() => demandas.id, { onDelete: "set null" }),
  magistradoId: integer("magistrado_id").references(() => magistrados.id, { onDelete: "set null" }),
  comarcaId: integer("comarca_id").references(() => comarcas.id),
  vara: varchar("vara", { length: 120 }),
  numeroProcesso: varchar("numero_processo", { length: 30 }),
  pjeDocumentoId: varchar("pje_documento_id", { length: 30 }),
  sigiloso: integer("sigiloso").default(0).notNull(),
  tipoDecisao: varchar("tipo_decisao", { length: 30 }),
  dataSentenca: date("data_sentenca"),
  driveFileId: integer("drive_file_id"),
  analiseIa: jsonb("analise_ia").$type<AnaliseSentenca | null>().default(null),
  analiseStatus: varchar("analise_status", { length: 20 }).default("PENDENTE").notNull(),
  analyzedAt: timestamp("analyzed_at"),
  criadoPorId: integer("criado_por_id").references(() => defensoresBa.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("sentencas_processo_doc_unique").on(t.processoId, t.pjeDocumentoId)
    .where(sql`"pje_documento_id" IS NOT NULL`),
  index("sentencas_magistrado_idx").on(t.magistradoId),
  index("sentencas_comarca_idx").on(t.comarcaId),
  index("sentencas_tipo_decisao_idx").on(t.tipoDecisao),
  index("sentencas_demanda_origem_idx").on(t.demandaOrigemId),
  index("sentencas_analise_status_idx").on(t.analiseStatus),
]);
export type Sentenca = typeof sentencas.$inferSelect;
export type InsertSentenca = typeof sentencas.$inferInsert;

export const magistradosRelations = relations(magistrados, ({ many }) => ({
  sentencas: many(sentencas),
}));
export const sentencasRelations = relations(sentencas, ({ one }) => ({
  magistrado: one(magistrados, { fields: [sentencas.magistradoId], references: [magistrados.id] }),
  processo: one(processos, { fields: [sentencas.processoId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [sentencas.assistidoId], references: [assistidos.id] }),
}));
