import {
  pgTable, serial, text, varchar, timestamp, integer, boolean, index, jsonb, uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./core";

// ==========================================
// NOTICIAS JURIDICAS - Feed + Curadoria
// ==========================================

export const noticiasFontes = pgTable("noticias_fontes", {
  id: serial("id").primaryKey(),
  nome: varchar("nome", { length: 100 }).notNull(),
  urlBase: varchar("url_base", { length: 500 }).notNull(),
  urlFeed: varchar("url_feed", { length: 500 }).notNull(),
  tipo: varchar("tipo", { length: 20 }).notNull(), // "rss" | "html_scrape"
  seletorCss: text("seletor_css"),
  cor: varchar("cor", { length: 20 }).default("#71717a"),
  ativo: boolean("ativo").default(true).notNull(),
  ultimoScrapeEm: timestamp("ultimo_scrape_em"),
  ultimoErro: text("ultimo_erro"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const noticiasJuridicas = pgTable("noticias_juridicas", {
  id: serial("id").primaryKey(),
  titulo: text("titulo").notNull(),
  conteudo: text("conteudo"),
  resumo: text("resumo"),
  fonte: varchar("fonte", { length: 50 }).notNull(),
  fonteId: integer("fonte_id").references(() => noticiasFontes.id),
  urlOriginal: varchar("url_original", { length: 1000 }).notNull().unique(),
  autor: varchar("autor", { length: 200 }),
  imagemUrl: varchar("imagem_url", { length: 1000 }),
  categoria: varchar("categoria", { length: 30 }).notNull(),
  tags: jsonb("tags").$type<string[]>().default([]),
  status: varchar("status", { length: 20 }).default("pendente").notNull(),
  aprovadoPor: integer("aprovado_por").references(() => users.id),
  aprovadoEm: timestamp("aprovado_em"),
  publicadoEm: timestamp("publicado_em"),
  scrapeadoEm: timestamp("scrapeado_em").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  analiseIa: jsonb("analise_ia").$type<{
    resumoExecutivo: string;
    impactoPratico: string;
    ratioDecidendi?: string;
    casosAplicaveis: string[];
    processadoEm: string;
    modeloUsado: string;
  } | null>().default(null),
}, (table) => [
  index("not_jur_status_idx").on(table.status),
  index("not_jur_categoria_idx").on(table.categoria),
  index("not_jur_fonte_idx").on(table.fonte),
  index("not_jur_publicado_idx").on(table.publicadoEm),
  index("not_jur_url_idx").on(table.urlOriginal),
]);

export const noticiasTemas = pgTable("noticias_temas", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  nome: varchar("nome", { length: 100 }).notNull(),
  keywords: jsonb("keywords").$type<string[]>().default([]),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("not_temas_user_idx").on(table.userId),
]);

// ==========================================
// FAVORITOS - Notícias salvas pelo defensor
// ==========================================

export const noticiasFavoritos = pgTable("noticias_favoritos", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  noticiaId: integer("noticia_id").references(() => noticiasJuridicas.id, { onDelete: "cascade" }).notNull(),
  nota: text("nota"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("not_fav_unique_idx").on(table.userId, table.noticiaId),
  index("not_fav_user_idx").on(table.userId),
]);

// ==========================================
// VÍNCULOS - Notícias associadas a processos
// ==========================================

export const noticiasProcessos = pgTable("noticias_processos", {
  id: serial("id").primaryKey(),
  noticiaId: integer("noticia_id").references(() => noticiasJuridicas.id, { onDelete: "cascade" }).notNull(),
  processoId: integer("processo_id").notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  observacao: text("observacao"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("not_proc_unique_idx").on(table.noticiaId, table.processoId),
  index("not_proc_noticia_idx").on(table.noticiaId),
  index("not_proc_processo_idx").on(table.processoId),
]);

export type NoticiaFonte = typeof noticiasFontes.$inferSelect;
export type InsertNoticiaFonte = typeof noticiasFontes.$inferInsert;
export type NoticiaJuridica = typeof noticiasJuridicas.$inferSelect;
export type InsertNoticiaJuridica = typeof noticiasJuridicas.$inferInsert;
export type NoticiaTema = typeof noticiasTemas.$inferSelect;
export type InsertNoticiaTema = typeof noticiasTemas.$inferInsert;
export type NoticiaFavorito = typeof noticiasFavoritos.$inferSelect;
export type InsertNoticiaFavorito = typeof noticiasFavoritos.$inferInsert;
export type NoticiaProcesso = typeof noticiasProcessos.$inferSelect;
export type InsertNoticiaProcesso = typeof noticiasProcessos.$inferInsert;
