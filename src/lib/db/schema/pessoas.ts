import {
  pgTable,
  serial,
  text,
  varchar,
  date,
  timestamp,
  integer,
  jsonb,
  numeric,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users, processos } from "./core";
import { testemunhas } from "./agenda";

// ==========================================
// PESSOAS (Fase I-A)
// ==========================================

export const pessoas = pgTable(
  "pessoas",
  {
    id: serial("id").primaryKey(),
    nome: text("nome").notNull(),
    nomeNormalizado: text("nome_normalizado").notNull(),
    nomesAlternativos: jsonb("nomes_alternativos").$type<string[]>().default(sql`'[]'::jsonb`),
    cpf: varchar("cpf", { length: 14 }).unique(),
    rg: text("rg"),
    dataNascimento: date("data_nascimento"),
    telefone: text("telefone"),
    endereco: text("endereco"),
    fotoDriveFileId: varchar("foto_drive_file_id", { length: 100 }),
    observacoes: text("observacoes"),
    categoriaPrimaria: varchar("categoria_primaria", { length: 30 }),
    fonteCriacao: varchar("fonte_criacao", { length: 40 }).notNull(),
    criadoPor: integer("criado_por").references(() => users.id),
    confidence: numeric("confidence", { precision: 3, scale: 2 }).default("1.0").notNull(),
    mergedInto: integer("merged_into"),
    mergeReason: text("merge_reason"),
    mergedAt: timestamp("merged_at"),
    mergedBy: integer("merged_by").references(() => users.id),
    workspaceId: integer("workspace_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    nomeNormIdx: index("pessoas_nome_norm_idx").on(t.nomeNormalizado),
    nomeTrgmIdx: index("pessoas_nome_trgm_idx").using("gin", sql`${t.nomeNormalizado} gin_trgm_ops`),
    mergedIdx: index("pessoas_merged_idx").on(t.mergedInto),
    categoriaIdx: index("pessoas_categoria_idx").on(t.categoriaPrimaria),
    workspaceIdx: index("pessoas_workspace_idx").on(t.workspaceId),
  }),
);

export const participacoesProcesso = pgTable(
  "participacoes_processo",
  {
    id: serial("id").primaryKey(),
    pessoaId: integer("pessoa_id")
      .notNull()
      .references(() => pessoas.id, { onDelete: "cascade" }),
    processoId: integer("processo_id")
      .notNull()
      .references(() => processos.id, { onDelete: "cascade" }),
    papel: varchar("papel", { length: 30 }).notNull(),
    lado: varchar("lado", { length: 20 }),
    subpapel: varchar("subpapel", { length: 40 }),
    testemunhaId: integer("testemunha_id").references(() => testemunhas.id),
    resumoNestaCausa: text("resumo_nesta_causa"),
    observacoesNestaCausa: text("observacoes_nesta_causa"),
    audioDriveFileId: varchar("audio_drive_file_id", { length: 100 }),
    dataPrimeiraAparicao: date("data_primeira_aparicao"),
    fonte: varchar("fonte", { length: 40 }).notNull(),
    confidence: numeric("confidence", { precision: 3, scale: 2 }).default("1.0").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    pessoaIdx: index("participacoes_pessoa_idx").on(t.pessoaId),
    processoIdx: index("participacoes_processo_idx").on(t.processoId),
    papelIdx: index("participacoes_papel_idx").on(t.papel),
    testemunhaIdx: index("participacoes_testemunha_idx").on(t.testemunhaId),
  }),
);

export const pessoasDistinctsConfirmed = pgTable(
  "pessoas_distincts_confirmed",
  {
    pessoaAId: integer("pessoa_a_id")
      .notNull()
      .references(() => pessoas.id, { onDelete: "cascade" }),
    pessoaBId: integer("pessoa_b_id")
      .notNull()
      .references(() => pessoas.id, { onDelete: "cascade" }),
    confirmadoPor: integer("confirmado_por").references(() => users.id),
    confirmadoEm: timestamp("confirmado_em").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.pessoaAId, t.pessoaBId] }),
  }),
);

export type Pessoa = typeof pessoas.$inferSelect;
export type NovaPessoa = typeof pessoas.$inferInsert;
export type ParticipacaoProcesso = typeof participacoesProcesso.$inferSelect;
export type NovaParticipacaoProcesso = typeof participacoesProcesso.$inferInsert;
