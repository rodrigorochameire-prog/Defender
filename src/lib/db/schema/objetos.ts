import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  date,
  numeric,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { processos, assistidos } from "./core";

// ==========================================
// FASE V — OBJETOS APREENDIDOS (entidade cruzável)
// ==========================================
// Armas, drogas, veículos, celulares, dinheiro, bens — como entidades que
// participam N:N de processos. Permite cruzar ("mesmo objeto em 2+ casos") e
// flags de prova (arma não periciada, droga sem laudo).

export const objetoTipoEnum = pgEnum("objeto_tipo", [
  "arma-fogo",
  "arma-branca",
  "droga",
  "veiculo",
  "celular",
  "dinheiro",
  "joia",
  "documento",
  "outro-bem",
]);

export const objetoPapelEnum = pgEnum("objeto_papel", [
  "apreendido",
  "utilizado",
  "produto-do-crime",
]);

export const objetoDestinoEnum = pgEnum("objeto_destino", [
  "pendente",
  "devolvido",
  "periciado",
  "incinerado",
  "em-custodia",
]);

export const objetos = pgTable(
  "objetos",
  {
    id: serial("id").primaryKey(),
    tipo: objetoTipoEnum("tipo").notNull(),
    subtipo: varchar("subtipo", { length: 60 }),
    // Identificadores (chaves de cruzamento entre casos)
    numeroSerie: varchar("numero_serie", { length: 80 }),
    placa: varchar("placa", { length: 12 }),
    modelo: varchar("modelo", { length: 80 }),
    marca: varchar("marca", { length: 80 }),
    ano: integer("ano"),
    // Específicos de arma / droga
    calibre: varchar("calibre", { length: 30 }),
    tipoDroga: varchar("tipo_droga", { length: 60 }),
    quantidade: numeric("quantidade", { precision: 12, scale: 3 }),
    unidade: varchar("unidade", { length: 20 }),
    valorEstimado: numeric("valor_estimado", { precision: 14, scale: 2 }),
    descricaoLivre: text("descricao_livre"),
    fotosDriveIds: jsonb("fotos_drive_ids").$type<string[]>(),
    fonteCriacao: varchar("fonte_criacao", { length: 40 }).notNull().default("manual"),
    confidence: numeric("confidence", { precision: 3, scale: 2 }).default("1.0"),
    workspaceId: integer("workspace_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("objetos_tipo_idx").on(t.tipo),
    index("objetos_numero_serie_idx").on(t.numeroSerie),
    index("objetos_placa_idx").on(t.placa),
    index("objetos_workspace_idx").on(t.workspaceId),
  ],
);

export const participacoesObjeto = pgTable(
  "participacoes_objeto",
  {
    id: serial("id").primaryKey(),
    objetoId: integer("objeto_id")
      .notNull()
      .references(() => objetos.id, { onDelete: "cascade" }),
    processoId: integer("processo_id")
      .notNull()
      .references(() => processos.id, { onDelete: "cascade" }),
    pessoaId: integer("pessoa_id").references(() => assistidos.id, { onDelete: "set null" }),
    papel: objetoPapelEnum("papel").notNull().default("apreendido"),
    destino: objetoDestinoEnum("destino").default("pendente"),
    dataApreensao: date("data_apreensao"),
    localApreensao: varchar("local_apreensao", { length: 200 }),
    observacoes: text("observacoes"),
    fonte: varchar("fonte", { length: 30 }).notNull().default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("participacoes_objeto_objeto_idx").on(t.objetoId),
    index("participacoes_objeto_processo_idx").on(t.processoId),
  ],
);

export type ObjetoRow = typeof objetos.$inferSelect;
export type InsertObjeto = typeof objetos.$inferInsert;
export type ParticipacaoObjetoRow = typeof participacoesObjeto.$inferSelect;

export const objetosRelations = relations(objetos, ({ many }) => ({
  participacoes: many(participacoesObjeto),
}));

export const participacoesObjetoRelations = relations(participacoesObjeto, ({ one }) => ({
  objeto: one(objetos, { fields: [participacoesObjeto.objetoId], references: [objetos.id] }),
  processo: one(processos, { fields: [participacoesObjeto.processoId], references: [processos.id] }),
}));
