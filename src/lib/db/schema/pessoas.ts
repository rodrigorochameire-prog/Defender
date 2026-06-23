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
  boolean,
  primaryKey,
  index,
  uniqueIndex,
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
    // Avatar (rosto) capturado do PDF — data URL base64, exibido nos chips/cards.
    avatarDataUrl: text("avatar_data_url"),
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
    // Promoção automática: `origem` default 'manual' blinda toda linha existente;
    // `fonteRef` rastreia a extração de origem (idempotência + auditoria).
    origem: varchar("origem", { length: 20 }).notNull().default("manual"),
    fonteRef: varchar("fonte_ref", { length: 120 }),
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

// Recortes de imagem capturados do PDF dos autos, vinculados a uma pessoa +
// papel no processo (réu, suposta vítima, testemunha A/B…). Alimentam a
// galeria por pessoa (PessoaSheet → Mídias).
export const pessoaRecortes = pgTable(
  "pessoa_recortes",
  {
    id: serial("id").primaryKey(),
    // Vincula a uma pessoa OU diretamente ao assistido (réu) — um dos dois.
    pessoaId: integer("pessoa_id").references(() => pessoas.id, { onDelete: "cascade" }),
    assistidoId: integer("assistido_id"),
    processoId: integer("processo_id").references(() => processos.id, { onDelete: "set null" }),
    // id em drive_files do PDF de origem (sem FK p/ evitar import circular).
    driveFileId: integer("drive_file_id"),
    // rosto | assinatura | laudo | peticao | outro (rosto vira avatar).
    tipo: varchar("tipo", { length: 20 }).default("rosto"),
    papel: varchar("papel", { length: 30 }),
    rotulo: text("rotulo"),
    // data URL base64 do recorte (JPEG pequeno, <~133KB — capado na captura).
    imagem: text("imagem").notNull(),
    pagina: integer("pagina"),
    posicao: jsonb("posicao").$type<{ x: number; y: number; w: number; h: number }>(),
    criadoPor: integer("criado_por").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pessoaIdx: index("pessoa_recortes_pessoa_idx").on(t.pessoaId),
    processoIdx: index("pessoa_recortes_processo_idx").on(t.processoId),
  }),
);

// Relações familiares/contatos do assistido (réu) — aresta pessoa↔pessoa quando
// o familiar já está no grafo (`relacionadaPessoaId`), ou texto livre (`nomeLivre`)
// como fallback. Alimentada pelo backfill de `assistidos.nomeMae/nomePai/nomeContato`
// e por entradas manuais. `fonteRef` garante idempotência do backfill.
export const pessoaRelacoes = pgTable(
  "pessoa_relacoes",
  {
    id: serial("id").primaryKey(),
    // A pessoa âncora (o assistido/réu) cujos familiares estamos registrando.
    pessoaId: integer("pessoa_id")
      .notNull()
      .references(() => pessoas.id, { onDelete: "cascade" }),
    // O familiar, quando já existe como pessoa no grafo (nullable: fallback p/ texto).
    relacionadaPessoaId: integer("relacionada_pessoa_id").references(() => pessoas.id, {
      onDelete: "set null",
    }),
    // mae | pai | conjuge | filho | irmao | contato | outro
    grau: varchar("grau", { length: 40 }).notNull(),
    nomeLivre: text("nome_livre"),
    telefone: varchar("telefone", { length: 20 }),
    endereco: text("endereco"),
    // backfill-assistido | triagem | manual
    fonte: varchar("fonte", { length: 40 }).notNull(),
    fonteRef: varchar("fonte_ref", { length: 120 }),
    confirmado: boolean("confirmado").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    pessoaIdx: index("pessoa_relacoes_pessoa_idx").on(t.pessoaId),
    relacionadaIdx: index("pessoa_relacoes_relacionada_idx").on(t.relacionadaPessoaId),
    // Idempotência do backfill: evita duplicar a mesma relação textual.
    uniqueIdx: uniqueIndex("pessoa_relacoes_unique_idx").on(t.pessoaId, t.grau, t.nomeLivre),
  }),
);

export type Pessoa = typeof pessoas.$inferSelect;
export type NovaPessoa = typeof pessoas.$inferInsert;
export type ParticipacaoProcesso = typeof participacoesProcesso.$inferSelect;
export type NovaParticipacaoProcesso = typeof participacoesProcesso.$inferInsert;
export type PessoaRecorte = typeof pessoaRecortes.$inferSelect;
export type NovoPessoaRecorte = typeof pessoaRecortes.$inferInsert;
export type PessoaRelacao = typeof pessoaRelacoes.$inferSelect;
export type NovaPessoaRelacao = typeof pessoaRelacoes.$inferInsert;
