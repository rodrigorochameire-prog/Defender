import {
  pgTable,
  pgEnum,
  serial,
  integer,
  varchar,
  text,
  date,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { processos, assistidos } from "./core";
import { regimeInicialEnum } from "./enums";

// ==========================================
// FASE IX — EXECUÇÃO PENAL (schema-núcleo)
// ==========================================
// Modela o título executivo, a cronologia executiva, os benefícios pleiteados e
// o catálogo de unidades prisionais. Alimenta os flags da Camada 3 (mapa-mestre
// Fase IX): prescrição executória iminente, risco de regressão por desatualização
// cadastral, saída temporária/livramento possíveis. A função pura de prescrição
// (src/lib/execucao/prescricao.ts) consome os campos de pena/datas via reader.

export const unidadeTipoEnum = pgEnum("unidade_prisional_tipo", [
  "presidio",
  "cadeia-publica",
  "colonia-agricola",
  "casa-albergado",
  "hospital-custodia",
  "penitenciaria",
  "outro",
]);

export const execucaoSituacaoEnum = pgEnum("execucao_situacao", [
  "preso",
  "domiciliar",
  "livramento-condicional",
  "monitoramento",
  "solto",
  "foragido",
]);

export const execucaoTituloTipoEnum = pgEnum("execucao_titulo_tipo", [
  "condenatoria",
  "condenatoria-c-substituicao",
  "condenatoria-c-suspensao",
]);

export const execucaoEventoTipoEnum = pgEnum("execucao_evento_tipo", [
  "progressao",
  "regressao",
  "reconversao",
  "remissao",
  "detracao",
  "unificacao",
  "saida-temporaria",
  "falta",
  "beneficio-negado",
  "outro",
]);

export const beneficioTipoEnum = pgEnum("execucao_beneficio_tipo", [
  "progressao",
  "livramento-condicional",
  "indulto",
  "comutacao",
  "saida-temporaria",
  "trabalho-externo",
  "remissao",
  "outro",
]);

export const beneficioDecisaoEnum = pgEnum("execucao_beneficio_decisao", [
  "pendente",
  "deferido",
  "indeferido",
]);

// ------------------------------------------
// Catálogo · Unidades prisionais
// ------------------------------------------
export const unidadesPrisionais = pgTable(
  "unidades_prisionais",
  {
    id: serial("id").primaryKey(),
    nome: varchar("nome", { length: 200 }).notNull(),
    tipo: unidadeTipoEnum("tipo"),
    regimeComportado: regimeInicialEnum("regime_comportado"),
    municipio: varchar("municipio", { length: 120 }),
    uf: varchar("uf", { length: 2 }),
    observacoes: text("observacoes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [index("unidades_prisionais_nome_idx").on(table.nome)],
);

// ------------------------------------------
// Título executivo + situação + contato
// ------------------------------------------
export const execucoesPenais = pgTable(
  "execucoes_penais",
  {
    id: serial("id").primaryKey(),
    processoId: integer("processo_id")
      .notNull()
      .references(() => processos.id, { onDelete: "cascade" }),
    assistidoId: integer("assistido_id").references(() => assistidos.id),
    numeroExecucao: varchar("numero_execucao", { length: 40 }),
    juizoExecucao: varchar("juizo_execucao", { length: 160 }),

    // Título
    sentencaData: date("sentenca_data"),
    transitoJulgadoData: date("transito_julgado_data"),
    tipoTitulo: execucaoTituloTipoEnum("tipo_titulo"),
    penaAnos: integer("pena_anos").default(0).notNull(),
    penaMeses: integer("pena_meses").default(0).notNull(),
    penaDias: integer("pena_dias").default(0).notNull(),
    regimeInicial: regimeInicialEnum("regime_inicial"),
    regimeAtual: regimeInicialEnum("regime_atual"),

    // Insumos da prescrição executória (art. 110/113/115 CP)
    reincidente: boolean("reincidente").default(false).notNull(),
    menor21NoFato: boolean("menor_21_no_fato").default(false).notNull(),
    maior70NaSentenca: boolean("maior_70_na_sentenca").default(false).notNull(),
    inicioCumprimento: date("inicio_cumprimento"),
    detracaoDias: integer("detracao_dias").default(0).notNull(),

    // Situação atual
    situacao: execucaoSituacaoEnum("situacao").default("preso").notNull(),
    unidadeAtualId: integer("unidade_atual_id").references(() => unidadesPrisionais.id),

    // Bloco contato/endereço (crítico — feed do flag de risco de regressão)
    enderecoLogradouro: varchar("endereco_logradouro", { length: 200 }),
    enderecoNumero: varchar("endereco_numero", { length: 20 }),
    enderecoBairro: varchar("endereco_bairro", { length: 120 }),
    enderecoCidade: varchar("endereco_cidade", { length: 120 }),
    enderecoUf: varchar("endereco_uf", { length: 2 }),
    enderecoCep: varchar("endereco_cep", { length: 9 }),
    telefone: varchar("telefone", { length: 20 }),
    dataUltimaConfirmacaoCadastral: date("data_ultima_confirmacao_cadastral"),

    observacoes: text("observacoes"),
    origem: varchar("origem", { length: 20 }).default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("execucoes_penais_processo_id_idx").on(table.processoId),
    index("execucoes_penais_assistido_id_idx").on(table.assistidoId),
    index("execucoes_penais_situacao_idx").on(table.situacao),
  ],
);

// ------------------------------------------
// Cronologia executiva (eventos)
// ------------------------------------------
export const execucaoEventos = pgTable(
  "execucao_eventos",
  {
    id: serial("id").primaryKey(),
    execucaoId: integer("execucao_id")
      .notNull()
      .references(() => execucoesPenais.id, { onDelete: "cascade" }),
    tipo: execucaoEventoTipoEnum("tipo").notNull(),
    data: date("data").notNull(),
    /** Dados específicos do evento (de/para regime, dias remidos, grau da falta, etc.). */
    dados: jsonb("dados").$type<{
      regimeDe?: string;
      regimePara?: string;
      dias?: number;
      modalidadeRemissao?: "trabalho" | "estudo" | "leitura";
      grauFalta?: "leve" | "media" | "grave";
      motivo?: string;
      processosUnificados?: number[];
    }>(),
    observacoes: text("observacoes"),
    fonte: varchar("fonte", { length: 30 }).default("manual"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("execucao_eventos_execucao_id_idx").on(table.execucaoId),
    index("execucao_eventos_tipo_idx").on(table.tipo),
  ],
);

// ------------------------------------------
// Benefícios pleiteados
// ------------------------------------------
export const execucaoBeneficios = pgTable(
  "execucao_beneficios",
  {
    id: serial("id").primaryKey(),
    execucaoId: integer("execucao_id")
      .notNull()
      .references(() => execucoesPenais.id, { onDelete: "cascade" }),
    tipo: beneficioTipoEnum("tipo").notNull(),
    dataPleito: date("data_pleito"),
    decisao: beneficioDecisaoEnum("decisao").default("pendente").notNull(),
    dataDecisao: date("data_decisao"),
    observacoes: text("observacoes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index("execucao_beneficios_execucao_id_idx").on(table.execucaoId),
    index("execucao_beneficios_decisao_idx").on(table.decisao),
  ],
);

// ------------------------------------------
// Tipos inferidos
// ------------------------------------------
export type UnidadePrisionalRow = typeof unidadesPrisionais.$inferSelect;
export type ExecucaoPenalRow = typeof execucoesPenais.$inferSelect;
export type InsertExecucaoPenal = typeof execucoesPenais.$inferInsert;
export type ExecucaoEventoRow = typeof execucaoEventos.$inferSelect;
export type ExecucaoBeneficioRow = typeof execucaoBeneficios.$inferSelect;

// ------------------------------------------
// Relations
// ------------------------------------------
export const execucoesPenaisRelations = relations(execucoesPenais, ({ one, many }) => ({
  processo: one(processos, {
    fields: [execucoesPenais.processoId],
    references: [processos.id],
  }),
  assistido: one(assistidos, {
    fields: [execucoesPenais.assistidoId],
    references: [assistidos.id],
  }),
  unidadeAtual: one(unidadesPrisionais, {
    fields: [execucoesPenais.unidadeAtualId],
    references: [unidadesPrisionais.id],
  }),
  eventos: many(execucaoEventos),
  beneficios: many(execucaoBeneficios),
}));

export const execucaoEventosRelations = relations(execucaoEventos, ({ one }) => ({
  execucao: one(execucoesPenais, {
    fields: [execucaoEventos.execucaoId],
    references: [execucoesPenais.id],
  }),
}));

export const execucaoBeneficiosRelations = relations(execucaoBeneficios, ({ one }) => ({
  execucao: one(execucoesPenais, {
    fields: [execucaoBeneficios.execucaoId],
    references: [execucoesPenais.id],
  }),
}));
