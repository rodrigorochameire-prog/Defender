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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "./core";

// ==========================================
// NOTÍCIAS FACTUAIS — Diário da Bahia
// ==========================================

/**
 * Edições do jornal (uma por dia/execução do pipeline).
 * Cada edição contém N artigos agrupados por seção.
 */
export const factualEdicoes = pgTable("factual_edicoes", {
  id: serial("id").primaryKey(),
  titulo: varchar("titulo", { length: 200 }).notNull().default("Diário da Bahia"),
  subtitulo: varchar("subtitulo", { length: 300 }),
  dataEdicao: timestamp("data_edicao").notNull(),
  totalArtigos: integer("total_artigos").default(0).notNull(),
  secoes: jsonb("secoes").$type<string[]>().default([]),
  status: varchar("status", { length: 20 }).default("rascunho").notNull(), // rascunho | publicado | arquivado
  publicadoPor: integer("publicado_por").references(() => users.id),
  publicadoEm: timestamp("publicado_em"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("factual_edicoes_data_idx").on(table.dataEdicao),
  index("factual_edicoes_status_idx").on(table.status),
]);

/**
 * Artigos do jornal factual — cada um pertence a uma edição e seção.
 * Suporta Google CSE + IA summarization pipeline.
 */
export const factualArtigos = pgTable("factual_artigos", {
  id: serial("id").primaryKey(),
  edicaoId: integer("edicao_id")
    .references(() => factualEdicoes.id, { onDelete: "cascade" })
    .notNull(),
  secao: varchar("secao", { length: 50 }).notNull(), // DESTAQUES, CAMAÇARI, SALVADOR, BAHIA, BRASIL, MUNDO, TECNOLOGIA, ESPORTE
  titulo: text("titulo").notNull(),
  resumo: text("resumo"), // Gerado pela IA — 2-4 parágrafos
  conteudoOriginal: text("conteudo_original"), // Texto extraído da página
  fonteNome: varchar("fonte_nome", { length: 100 }).notNull(),
  fonteUrl: text("fonte_url").notNull(),
  imagemUrl: text("imagem_url"),
  autor: varchar("autor", { length: 200 }),
  dataPublicacao: timestamp("data_publicacao"),
  ordem: integer("ordem").default(0).notNull(), // Ordem dentro da seção
  destaque: boolean("destaque").default(false).notNull(), // Artigo em destaque (h2 maior)
  tags: jsonb("tags").$type<string[]>().default([]),
  // Metadados do pipeline
  queryOrigem: text("query_origem"), // Query CSE que encontrou
  contentHash: text("content_hash"), // Para deduplicação
  modeloSumarizacao: varchar("modelo_sumarizacao", { length: 50 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("factual_artigos_edicao_idx").on(table.edicaoId),
  index("factual_artigos_secao_idx").on(table.secao),
  index("factual_artigos_fonte_url_idx").on(table.fonteUrl),
  index("factual_artigos_content_hash_idx").on(table.contentHash),
  index("factual_artigos_edicao_secao_idx").on(table.edicaoId, table.secao, table.ordem),
]);

/**
 * Favoritos de notícias factuais por usuário.
 */
export const factualFavoritos = pgTable("factual_favoritos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .references(() => users.id, { onDelete: "cascade" })
    .notNull(),
  artigoId: integer("artigo_id")
    .references(() => factualArtigos.id, { onDelete: "cascade" })
    .notNull(),
  nota: text("nota"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("factual_fav_unique_idx").on(table.userId, table.artigoId),
  index("factual_fav_user_idx").on(table.userId),
]);

// ==========================================
// CONFIGURAÇÃO DAS SEÇÕES (Google CSE queries)
// ==========================================

/**
 * Seções configuráveis para o pipeline de coleta.
 * Cada seção tem queries para o Google CSE e contexto para sumarização.
 */
export const factualSecoes = pgTable("factual_secoes", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 50 }).notNull(), // DESTAQUES, CAMAÇARI, etc.
  contexto: text("contexto").notNull(), // Contexto para o LLM sumarizar
  queries: jsonb("queries").$type<string[]>().default([]),
  dateRestrict: varchar("date_restrict", { length: 10 }).default("d3").notNull(),
  maxArtigos: integer("max_artigos").default(5).notNull(),
  ordem: integer("ordem").default(0).notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  jornal: varchar("jornal", { length: 20 }).default("factual").notNull(), // factual | juridico | radar
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ==========================================
// RELATIONS
// ==========================================

export const factualEdicoesRelations = relations(factualEdicoes, ({ many }) => ({
  artigos: many(factualArtigos),
}));

export const factualArtigosRelations = relations(factualArtigos, ({ one, many }) => ({
  edicao: one(factualEdicoes, {
    fields: [factualArtigos.edicaoId],
    references: [factualEdicoes.id],
  }),
  favoritos: many(factualFavoritos),
}));

export const factualFavoritosRelations = relations(factualFavoritos, ({ one }) => ({
  artigo: one(factualArtigos, {
    fields: [factualFavoritos.artigoId],
    references: [factualArtigos.id],
  }),
  user: one(users, {
    fields: [factualFavoritos.userId],
    references: [users.id],
  }),
}));

// ==========================================
// TYPES
// ==========================================

export type FactualEdicao = typeof factualEdicoes.$inferSelect;
export type InsertFactualEdicao = typeof factualEdicoes.$inferInsert;
export type FactualArtigo = typeof factualArtigos.$inferSelect;
export type InsertFactualArtigo = typeof factualArtigos.$inferInsert;
export type FactualFavorito = typeof factualFavoritos.$inferSelect;
export type InsertFactualFavorito = typeof factualFavoritos.$inferInsert;
export type FactualSecao = typeof factualSecoes.$inferSelect;
export type InsertFactualSecao = typeof factualSecoes.$inferInsert;

// ==========================================
// SEÇÕES DEFAULT (para seed)
// ==========================================

export const FACTUAL_SECOES_DEFAULT = [
  {
    nome: "DESTAQUES",
    contexto: "Manchetes mais impactantes do dia na Bahia e no Brasil",
    queries: [
      "manchetes do dia Bahia Salvador",
      "notícias destaque Brasil hoje",
      "fato relevante Bahia hoje",
    ],
    dateRestrict: "d2",
    maxArtigos: 5,
    ordem: 0,
  },
  {
    nome: "CAMAÇARI",
    contexto: "Notícias da cidade de Camaçari, Bahia — política, economia, infraestrutura, eventos, sociedade",
    queries: [
      "Camaçari notícias hoje",
      "Camaçari Bahia acontecimentos",
      "prefeitura Camaçari",
      "polo industrial Camaçari",
    ],
    dateRestrict: "d3",
    maxArtigos: 5,
    ordem: 1,
  },
  {
    nome: "LAURO DE FREITAS",
    contexto: "Notícias de Lauro de Freitas, Bahia",
    queries: [
      "Lauro de Freitas notícias hoje",
      "Lauro de Freitas Bahia acontecimentos",
    ],
    dateRestrict: "d3",
    maxArtigos: 3,
    ordem: 2,
  },
  {
    nome: "SALVADOR",
    contexto: "Notícias de Salvador, capital da Bahia — política, economia, transporte, cultura, saúde",
    queries: [
      "Salvador Bahia notícias hoje",
      "Salvador capital Bahia acontecimentos",
      "prefeitura Salvador notícias",
    ],
    dateRestrict: "d2",
    maxArtigos: 5,
    ordem: 3,
  },
  {
    nome: "BAHIA",
    contexto: "Notícias do estado da Bahia — governo estadual, economia, infraestrutura, interior",
    queries: [
      "Bahia estado notícias hoje",
      "governo Bahia notícias",
      "interior Bahia acontecimentos",
    ],
    dateRestrict: "d2",
    maxArtigos: 5,
    ordem: 4,
  },
  {
    nome: "BRASIL",
    contexto: "Principais notícias nacionais — política, economia, sociedade, governo federal",
    queries: [
      "Brasil notícias hoje política",
      "economia brasileira notícias hoje",
      "governo federal notícias hoje",
    ],
    dateRestrict: "d2",
    maxArtigos: 5,
    ordem: 5,
  },
  {
    nome: "MUNDO",
    contexto: "Principais notícias internacionais",
    queries: [
      "notícias internacionais hoje",
      "mundo destaque notícias hoje",
    ],
    dateRestrict: "d2",
    maxArtigos: 3,
    ordem: 6,
  },
  {
    nome: "TECNOLOGIA",
    contexto: "Notícias de tecnologia, inovação, startups, inteligência artificial",
    queries: [
      "tecnologia notícias hoje Brasil",
      "inteligência artificial notícias",
    ],
    dateRestrict: "d3",
    maxArtigos: 3,
    ordem: 7,
  },
  {
    nome: "ESPORTE",
    contexto: "Esportes na Bahia e no Brasil — futebol (Bahia, Vitória), outros esportes",
    queries: [
      "esporte Bahia futebol hoje",
      "Bahia Vitória futebol resultado",
      "esporte Brasil destaque",
    ],
    dateRestrict: "d2",
    maxArtigos: 3,
    ordem: 8,
  },
] as const;
