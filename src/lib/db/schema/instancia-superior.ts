import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  jsonb,
  date,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { assistidos, processos } from "./core";
import { defensoresBa } from "./defensoria";

// ==========================================
// DESEMBARGADORES DO TJBA
// ==========================================

export const desembargadores = pgTable("desembargadores", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  camara: varchar("camara", { length: 50 }),       // "1ª Câmara Criminal", "2ª Câmara Criminal", "Seção Criminal"
  area: varchar("area", { length: 20 }),             // CRIMINAL ou CIVEL
  status: varchar("status", { length: 20 }).default("ATIVO"), // ATIVO, APOSENTADO, AFASTADO
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("desembargadores_camara_idx").on(table.camara),
  index("desembargadores_area_idx").on(table.area),
]);

export type Desembargador = typeof desembargadores.$inferSelect;
export type InsertDesembargador = typeof desembargadores.$inferInsert;

// ==========================================
// RECURSOS (Apelações, RESE, Agravos, HC, etc.)
// ==========================================

export type RecursoTipo =
  | "APELACAO"
  | "RESE"
  | "AGRAVO_EXECUCAO"
  | "AGRAVO_INSTRUMENTO"
  | "EMBARGOS_INFRINGENTES"
  | "EMBARGOS_DECLARACAO"
  | "HABEAS_CORPUS"
  | "REVISAO_CRIMINAL";

export type RecursoStatus =
  | "INTERPOSTO"
  | "DISTRIBUIDO"
  | "CONCLUSO"
  | "PAUTADO"
  | "JULGADO"
  | "TRANSITADO";

export type RecursoResultado =
  | "PENDENTE"
  | "PROVIDO"
  | "PARCIALMENTE_PROVIDO"
  | "NAO_PROVIDO"
  | "NAO_CONHECIDO"
  | "PREJUDICADO"
  | "CONCEDIDO"           // HC
  | "PARCIALMENTE_CONCEDIDO" // HC
  | "DENEGADO";           // HC

export const recursos = pgTable("recursos", {
  id: serial("id").primaryKey(),

  // Tipo e número
  tipo: varchar("tipo", { length: 30 }).notNull(),    // RecursoTipo
  numeroRecurso: varchar("numero_recurso", { length: 30 }), // Número no TJBA (pode ser diferente do 1º grau)

  // Vínculos
  processoOrigemId: integer("processo_origem_id").references(() => processos.id, { onDelete: "set null" }),
  assistidoId: integer("assistido_id").references(() => assistidos.id, { onDelete: "set null" }),

  // Defensores
  defensorOrigemId: integer("defensor_origem_id").references(() => defensoresBa.id, { onDelete: "set null" }),  // quem interpôs (1º grau)
  defensorDestinoId: integer("defensor_destino_id").references(() => defensoresBa.id, { onDelete: "set null" }), // quem atua no TJBA (2º grau)

  // Tribunal
  camara: varchar("camara", { length: 50 }),           // "1ª Câmara Criminal"
  relatorId: integer("relator_id").references(() => desembargadores.id, { onDelete: "set null" }),
  revisorId: integer("revisor_id").references(() => desembargadores.id, { onDelete: "set null" }),

  // Datas do ciclo de vida
  dataInterposicao: date("data_interposicao"),
  dataDistribuicao: date("data_distribuicao"),
  dataPauta: date("data_pauta"),                       // data agendada para julgamento
  dataJulgamento: date("data_julgamento"),
  dataTransito: date("data_transito"),

  // Status e resultado
  status: varchar("status", { length: 20 }).default("INTERPOSTO").notNull(), // RecursoStatus
  resultado: varchar("resultado", { length: 30 }).default("PENDENTE").notNull(), // RecursoResultado

  // Conteúdo
  tesesInvocadas: jsonb("teses_invocadas").$type<string[]>().default([]),
  tiposPenais: jsonb("tipos_penais").$type<string[]>().default([]),           // crimes envolvidos
  resumo: text("resumo"),                              // resumo do recurso/pedido
  observacoes: text("observacoes"),

  // Metadata
  criadoPorId: integer("criado_por_id").references(() => defensoresBa.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("recursos_tipo_idx").on(table.tipo),
  index("recursos_status_idx").on(table.status),
  index("recursos_resultado_idx").on(table.resultado),
  index("recursos_processo_origem_idx").on(table.processoOrigemId),
  index("recursos_assistido_idx").on(table.assistidoId),
  index("recursos_defensor_origem_idx").on(table.defensorOrigemId),
  index("recursos_defensor_destino_idx").on(table.defensorDestinoId),
  index("recursos_relator_idx").on(table.relatorId),
  index("recursos_camara_idx").on(table.camara),
  index("recursos_data_julgamento_idx").on(table.dataJulgamento),
]);

export type Recurso = typeof recursos.$inferSelect;
export type InsertRecurso = typeof recursos.$inferInsert;

// ==========================================
// ACÓRDÃOS (Decisões colegiadas do TJBA)
// ==========================================

export type VotoDesembargador = {
  desembargadorId: number;
  nome: string;
  voto: "ACOMPANHA_RELATOR" | "DIVERGENTE" | "IMPEDIDO" | "AUSENTE";
  observacao?: string;
};

export type AnaliseAcordao = {
  tesesAcolhidas: string[];
  tesesRejeitadas: string[];
  fundamentosChave: string[];
  precedentesCitados: string[];
  observacoesRelevantes: string[];
  impactoParaDefesa: string;        // resumo do que significa para o caso
  recomendacaoProxPasso: string;     // o que fazer a seguir
};

export const acordaos = pgTable("acordaos", {
  id: serial("id").primaryKey(),

  // Vínculo
  recursoId: integer("recurso_id").references(() => recursos.id, { onDelete: "cascade" }).notNull(),

  // Identificação
  numeroAcordao: varchar("numero_acordao", { length: 30 }),
  dataJulgamento: date("data_julgamento"),
  dataPublicacao: date("data_publicacao"),

  // Conteúdo
  ementa: text("ementa"),
  relator: text("relator"),                            // nome do relator (denormalizado para busca)
  resultado: varchar("resultado", { length: 30 }),     // provido, não provido, etc.
  votacao: varchar("votacao", { length: 50 }),          // "unanimidade", "maioria 2x1"

  // Votos detalhados
  votos: jsonb("votos").$type<VotoDesembargador[]>().default([]),

  // Arquivo
  driveFileId: integer("drive_file_id"),               // FK para arquivos no Drive (PDF do acórdão)

  // Análise IA
  analiseIa: jsonb("analise_ia").$type<AnaliseAcordao | null>().default(null),
  analiseStatus: varchar("analise_status", { length: 20 }).default("PENDENTE"), // PENDENTE, ANALISANDO, CONCLUIDO, ERRO

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("acordaos_recurso_idx").on(table.recursoId),
  index("acordaos_data_julgamento_idx").on(table.dataJulgamento),
  index("acordaos_resultado_idx").on(table.resultado),
  index("acordaos_relator_idx").on(table.relator),
  index("acordaos_analise_status_idx").on(table.analiseStatus),
]);

export type Acordao = typeof acordaos.$inferSelect;
export type InsertAcordao = typeof acordaos.$inferInsert;

// ==========================================
// RELAÇÕES
// ==========================================

export const desembargadoresRelations = relations(desembargadores, ({ many }) => ({
  recursosComoRelator: many(recursos, { relationName: "relator" }),
  recursosComoRevisor: many(recursos, { relationName: "revisor" }),
}));

export const recursosRelations = relations(recursos, ({ one, many }) => ({
  processoOrigem: one(processos, { fields: [recursos.processoOrigemId], references: [processos.id] }),
  assistido: one(assistidos, { fields: [recursos.assistidoId], references: [assistidos.id] }),
  defensorOrigem: one(defensoresBa, { fields: [recursos.defensorOrigemId], references: [defensoresBa.id], relationName: "origem" }),
  defensorDestino: one(defensoresBa, { fields: [recursos.defensorDestinoId], references: [defensoresBa.id], relationName: "destino" }),
  relator: one(desembargadores, { fields: [recursos.relatorId], references: [desembargadores.id], relationName: "relator" }),
  revisor: one(desembargadores, { fields: [recursos.revisorId], references: [desembargadores.id], relationName: "revisor" }),
  acordaos: many(acordaos),
}));

export const acordaosRelations = relations(acordaos, ({ one }) => ({
  recurso: one(recursos, { fields: [acordaos.recursoId], references: [recursos.id] }),
}));
