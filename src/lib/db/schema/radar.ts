import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  index,
  uniqueIndex,
  jsonb,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  tipoCrimeRadarEnum,
  circunstanciaRadarEnum,
  radarMatchStatusEnum,
  radarEnrichmentStatusEnum,
  radarFonteTipoEnum,
} from "./enums";
import { users, assistidos, processos } from "./core";
import { casos } from "./casos";

// ==========================================
// RADAR CRIMINAL — NOTÍCIAS
// ==========================================

export const radarNoticias = pgTable("radar_noticias", {
  id: serial("id").primaryKey(),
  url: text("url").notNull().unique(),
  fonte: varchar("fonte", { length: 100 }).notNull(),
  titulo: text("titulo").notNull(),
  corpo: text("corpo"),
  dataPublicacao: timestamp("data_publicacao"),
  dataFato: timestamp("data_fato"),
  imagemUrl: text("imagem_url"),
  tipoCrime: tipoCrimeRadarEnum("tipo_crime"),
  bairro: text("bairro"),
  logradouro: text("logradouro"),
  latitude: numeric("latitude", { precision: 10, scale: 7 }),
  longitude: numeric("longitude", { precision: 10, scale: 7 }),
  delegacia: text("delegacia"),
  circunstancia: circunstanciaRadarEnum("circunstancia"),
  artigosPenais: jsonb("artigos_penais").$type<string[]>(),
  armaMeio: text("arma_meio"),
  resumoIA: text("resumo_ia"),
  envolvidos: jsonb("envolvidos").$type<{
    nome: string;
    papel: string;
    idade?: number;
    vulgo?: string;
  }[]>(),
  enrichmentStatus: radarEnrichmentStatusEnum("enrichment_status").default("pending").notNull(),
  analysisSonnet: jsonb("analysis_sonnet"),
  rawHtml: text("raw_html"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("radar_noticias_tipo_crime_idx").on(table.tipoCrime),
  index("radar_noticias_data_fato_idx").on(table.dataFato),
  index("radar_noticias_bairro_idx").on(table.bairro),
  index("radar_noticias_enrichment_status_idx").on(table.enrichmentStatus),
  index("radar_noticias_fonte_idx").on(table.fonte),
  index("radar_noticias_created_at_idx").on(table.createdAt),
]);

export type RadarNoticia = typeof radarNoticias.$inferSelect;
export type InsertRadarNoticia = typeof radarNoticias.$inferInsert;

// ==========================================
// RADAR CRIMINAL — MATCHES COM ASSISTIDOS
// ==========================================

export const radarMatches = pgTable("radar_matches", {
  id: serial("id").primaryKey(),
  noticiaId: integer("noticia_id")
    .notNull()
    .references(() => radarNoticias.id, { onDelete: "cascade" }),
  assistidoId: integer("assistido_id")
    .references(() => assistidos.id, { onDelete: "set null" }),
  processoId: integer("processo_id")
    .references(() => processos.id, { onDelete: "set null" }),
  casoId: integer("caso_id")
    .references(() => casos.id, { onDelete: "set null" }),
  nomeEncontrado: text("nome_encontrado").notNull(),
  scoreConfianca: integer("score_confianca").notNull().default(0),
  status: radarMatchStatusEnum("status").notNull().default("possivel"),
  dadosExtraidos: jsonb("dados_extraidos"),
  confirmedBy: integer("confirmed_by")
    .references(() => users.id, { onDelete: "set null" }),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("radar_matches_noticia_id_idx").on(table.noticiaId),
  index("radar_matches_assistido_id_idx").on(table.assistidoId),
  index("radar_matches_processo_id_idx").on(table.processoId),
  index("radar_matches_caso_id_idx").on(table.casoId),
  index("radar_matches_status_idx").on(table.status),
  index("radar_matches_score_idx").on(table.scoreConfianca),
]);

export type RadarMatch = typeof radarMatches.$inferSelect;
export type InsertRadarMatch = typeof radarMatches.$inferInsert;

// ==========================================
// RADAR CRIMINAL — FONTES DE COLETA
// ==========================================

export const radarFontes = pgTable("radar_fontes", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  tipo: radarFonteTipoEnum("tipo").notNull().default("portal"),
  url: text("url").notNull(),
  seletorTitulo: text("seletor_titulo"),
  seletorCorpo: text("seletor_corpo"),
  seletorData: text("seletor_data"),
  ativo: boolean("ativo").default(true).notNull(),
  ultimaColeta: timestamp("ultima_coleta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type RadarFonte = typeof radarFontes.$inferSelect;
export type InsertRadarFonte = typeof radarFontes.$inferInsert;

// ==========================================
// RELATIONS
// ==========================================

export const radarNoticiasRelations = relations(radarNoticias, ({ many }) => ({
  matches: many(radarMatches),
}));

export const radarMatchesRelations = relations(radarMatches, ({ one }) => ({
  noticia: one(radarNoticias, {
    fields: [radarMatches.noticiaId],
    references: [radarNoticias.id],
  }),
  assistido: one(assistidos, {
    fields: [radarMatches.assistidoId],
    references: [assistidos.id],
  }),
  processo: one(processos, {
    fields: [radarMatches.processoId],
    references: [processos.id],
  }),
  caso: one(casos, {
    fields: [radarMatches.casoId],
    references: [casos.id],
  }),
  confirmedByUser: one(users, {
    fields: [radarMatches.confirmedBy],
    references: [users.id],
  }),
}));
