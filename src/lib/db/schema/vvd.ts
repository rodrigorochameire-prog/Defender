import {
  pgTable,
  serial,
  text,
  varchar,
  boolean,
  timestamp,
  integer,
  date,
  index,
  jsonb,
  numeric,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { statusMPUEnum, tipoIntimacaoEnum, canalEntradaVVDEnum, tipoRelatoVVDEnum } from "./enums";
import { users, processos, assistidos, demandas } from "./core";
import { audiencias } from "./agenda";

// ==========================================
// MÓDULO VVD - MEDIDAS PROTETIVAS (LEGADO)
// ==========================================
// Tabela legada — NÃO usar em novas features.
// O novo modelo VVD usa partes_vvd + processos_vvd + intimacoes_vvd + historico_mpu.

export const medidasProtetivas = pgTable("medidas_protetivas", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  assistidoId: integer("assistido_id")
    .references(() => assistidos.id, { onDelete: "set null" }),

  // Dados da Medida
  numeroMedida: varchar("numero_medida", { length: 50 }),
  tipoMedida: varchar("tipo_medida", { length: 100 }).notNull(),
  dataDecisao: date("data_decisao"),
  prazoDias: integer("prazo_dias"),
  dataVencimento: date("data_vencimento"),

  // Distância mínima (se aplicável)
  distanciaMetros: integer("distancia_metros"),

  // Partes
  nomeVitima: text("nome_vitima"),
  telefoneVitima: varchar("telefone_vitima", { length: 20 }),

  // Status
  status: varchar("status", { length: 30 }).default("ativa"),

  // Observações
  observacoes: text("observacoes"),

  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("medidas_protetivas_processo_id_idx").on(table.processoId),
  index("medidas_protetivas_status_idx").on(table.status),
  index("medidas_protetivas_data_vencimento_idx").on(table.dataVencimento),
]);

export type MedidaProtetiva = typeof medidasProtetivas.$inferSelect;
export type InsertMedidaProtetiva = typeof medidasProtetivas.$inferInsert;

// ==========================================
// MÓDULO VVD - PARTES (Requeridos e Requerentes)
// ==========================================
// Requerido = contra quem a MPU é pedida (assistido da DPE)
// Requerente = quem pede a MPU (vítima/denunciante)

export const partesVVD = pgTable("partes_vvd", {
  id: serial("id").primaryKey(),

  // Identificação
  nome: text("nome").notNull(),
  cpf: varchar("cpf", { length: 14 }),
  rg: varchar("rg", { length: 20 }),
  dataNascimento: date("data_nascimento"),

  // Tipo da parte: 'requerido' (assistido DPE) | 'requerente' (quem pede a MPU)
  tipoParte: varchar("tipo_parte", { length: 20 }).notNull(),

  // Contato
  telefone: varchar("telefone", { length: 20 }),
  telefoneSecundario: varchar("telefone_secundario", { length: 20 }),
  email: varchar("email", { length: 100 }),
  endereco: text("endereco"),
  bairro: varchar("bairro", { length: 100 }),
  cidade: varchar("cidade", { length: 100 }),

  // Relacionamento (parentesco com a outra parte)
  parentesco: varchar("parentesco", { length: 50 }),

  // Observações
  observacoes: text("observacoes"),

  // === NOVOS CAMPOS - VVD Redesign ===

  // Link de promoção ao sistema geral (quando caso demanda atuação ativa)
  assistidoId: integer("assistido_id").references(() => assistidos.id),

  // Dados analíticos
  sexo: varchar("sexo", { length: 10 }), // M, F, outro

  // Responsável
  defensorId: integer("defensor_id").references(() => users.id),

  // Metadados
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("partes_vvd_nome_idx").on(table.nome),
  index("partes_vvd_cpf_idx").on(table.cpf),
  index("partes_vvd_tipo_parte_idx").on(table.tipoParte),
  index("partes_vvd_deleted_at_idx").on(table.deletedAt),
  index("partes_vvd_assistido_id_idx").on(table.assistidoId),
  index("partes_vvd_sexo_idx").on(table.sexo),
]);

export type ParteVVD = typeof partesVVD.$inferSelect;
export type InsertParteVVD = typeof partesVVD.$inferInsert;

// ==========================================
// MÓDULO VVD - PROCESSOS DE MPU
// ==========================================

export const processosVVD = pgTable("processos_vvd", {
  id: serial("id").primaryKey(),

  // Partes do processo (renomeados: autor→requerido, vitima→requerente)
  requeridoId: integer("requerido_id")
    .notNull()
    .references(() => partesVVD.id, { onDelete: "cascade" }),
  requerenteId: integer("requerente_id")
    .references(() => partesVVD.id, { onDelete: "set null" }),

  // Identificação do Processo
  numeroAutos: text("numero_autos").notNull(),
  tipoProcesso: varchar("tipo_processo", { length: 20 }).notNull().default("MPU"),

  // Localização
  comarca: varchar("comarca", { length: 100 }),
  vara: varchar("vara", { length: 100 }).default("Vara de Violência Doméstica"),

  // Crime/Assunto
  crime: varchar("crime", { length: 200 }),
  assunto: text("assunto"),

  // Datas importantes
  dataDistribuicao: date("data_distribuicao"),
  dataUltimaMovimentacao: date("data_ultima_movimentacao"),

  // Status
  fase: varchar("fase", { length: 50 }).default("tramitando"),
  situacao: varchar("situacao", { length: 50 }).default("ativo"),

  // Medida Protetiva vigente
  mpuAtiva: boolean("mpu_ativa").default(false),
  dataDecisaoMPU: date("data_decisao_mpu"),
  tiposMPU: text("tipos_mpu"), // Legado — manter para compatibilidade
  dataVencimentoMPU: date("data_vencimento_mpu"),
  distanciaMinima: integer("distancia_minima"),

  // Defensor responsável
  defensorId: integer("defensor_id").references(() => users.id),

  // Observações
  observacoes: text("observacoes"),

  // Integração PJe
  pjeDocumentoId: varchar("pje_documento_id", { length: 20 }),
  pjeUltimaAtualizacao: timestamp("pje_ultima_atualizacao"),


  // === NOVOS CAMPOS - VVD Redesign ===

  // Link de promoção ao sistema geral
  processoId: integer("processo_id").references(() => processos.id),

  // Dados analíticos - Canal e Relato
  canalEntrada: canalEntradaVVDEnum("canal_entrada"),
  tipoRelato: tipoRelatoVVDEnum("tipo_relato"),

  // Dados analíticos - Conexão com ação de família
  temAcaoFamilia: boolean("tem_acao_familia").default(false),
  tipoAcaoFamilia: varchar("tipo_acao_familia", { length: 30 }),
  suspeitaMaFe: boolean("suspeita_ma_fe").default(false),

  // Dados analíticos - Temporalidade
  dataFato: date("data_fato"),

  // Dados analíticos - Medidas deferidas (JSONB array de medidas específicas)
  medidasDeferidas: jsonb("medidas_deferidas").$type<string[]>(),

  // Geolocalização — restrição e endereços do agressor
  raioRestricaoMetros: integer("raio_restricao_metros"),
  agressorResidenciaEndereco: text("agressor_residencia_endereco"),
  agressorResidenciaLat: numeric("agressor_residencia_lat", { precision: 10, scale: 7 }),
  agressorResidenciaLng: numeric("agressor_residencia_lng", { precision: 10, scale: 7 }),
  agressorTrabalhoEndereco: text("agressor_trabalho_endereco"),
  agressorTrabalhoLat: numeric("agressor_trabalho_lat", { precision: 10, scale: 7 }),
  agressorTrabalhoLng: numeric("agressor_trabalho_lng", { precision: 10, scale: 7 }),

  // Metadados
  deletedAt: timestamp("deleted_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("processos_vvd_requerido_id_idx").on(table.requeridoId),
  index("processos_vvd_requerente_id_idx").on(table.requerenteId),
  index("processos_vvd_numero_autos_idx").on(table.numeroAutos),
  index("processos_vvd_mpu_ativa_idx").on(table.mpuAtiva),
  index("processos_vvd_data_vencimento_mpu_idx").on(table.dataVencimentoMPU),
  index("processos_vvd_defensor_id_idx").on(table.defensorId),
  index("processos_vvd_deleted_at_idx").on(table.deletedAt),
  index("processos_vvd_processo_id_idx").on(table.processoId),
  index("processos_vvd_canal_entrada_idx").on(table.canalEntrada),
  index("processos_vvd_tipo_relato_idx").on(table.tipoRelato),
  index("processos_vvd_tem_acao_familia_idx").on(table.temAcaoFamilia),
  index("processos_vvd_data_fato_idx").on(table.dataFato),
  index("processos_vvd_agressor_residencia_geo_idx").on(table.agressorResidenciaLat, table.agressorResidenciaLng),
]);

export type ProcessoVVD = typeof processosVVD.$inferSelect;
export type InsertProcessoVVD = typeof processosVVD.$inferInsert;

// ==========================================
// MÓDULO VVD - INTIMAÇÕES/DEMANDAS DE VVD
// ==========================================

export const intimacoesVVD = pgTable("intimacoes_vvd", {
  id: serial("id").primaryKey(),

  // Relacionamentos
  processoVVDId: integer("processo_vvd_id")
    .notNull()
    .references(() => processosVVD.id, { onDelete: "cascade" }),

  // Tipo de intimação
  tipoIntimacao: tipoIntimacaoEnum("tipo_intimacao").notNull().default("CIENCIA"),

  // Dados da intimação
  ato: text("ato").notNull(),
  dataExpedicao: date("data_expedicao"),
  dataIntimacao: date("data_intimacao"),
  prazo: date("prazo"),
  prazoDias: integer("prazo_dias"),

  // ID do documento no PJe
  pjeDocumentoId: varchar("pje_documento_id", { length: 20 }),
  pjeTipoDocumento: varchar("pje_tipo_documento", { length: 50 }),

  // Status
  status: varchar("status", { length: 30 }).default("pendente"),

  // Providências
  providencias: text("providencias"),

  // Se for tipo PETICIONAR, referência para a demanda normal
  demandaId: integer("demanda_id").references(() => demandas.id),

  // === NOVO CAMPO - VVD Redesign ===
  // Se for tipo AUDIENCIA, referência para o evento no calendário
  audienciaId: integer("audiencia_id").references(() => audiencias.id),

  // Responsável
  defensorId: integer("defensor_id").references(() => users.id),


  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("intimacoes_vvd_processo_vvd_id_idx").on(table.processoVVDId),
  index("intimacoes_vvd_tipo_intimacao_idx").on(table.tipoIntimacao),
  index("intimacoes_vvd_status_idx").on(table.status),
  index("intimacoes_vvd_prazo_idx").on(table.prazo),
  index("intimacoes_vvd_defensor_id_idx").on(table.defensorId),
  index("intimacoes_vvd_audiencia_id_idx").on(table.audienciaId),
]);

export type IntimacaoVVD = typeof intimacoesVVD.$inferSelect;
export type InsertIntimacaoVVD = typeof intimacoesVVD.$inferInsert;

// ==========================================
// MÓDULO VVD - HISTÓRICO DE MPU
// ==========================================

export const historicoMPU = pgTable("historico_mpu", {
  id: serial("id").primaryKey(),

  processoVVDId: integer("processo_vvd_id")
    .notNull()
    .references(() => processosVVD.id, { onDelete: "cascade" }),

  // Tipo de evento
  tipoEvento: varchar("tipo_evento", { length: 30 }).notNull(),

  // Detalhes
  dataEvento: date("data_evento").notNull(),
  descricao: text("descricao"),

  // Medidas vigentes após o evento
  medidasVigentes: text("medidas_vigentes"),
  novaDataVencimento: date("nova_data_vencimento"),
  novaDistancia: integer("nova_distancia"),

  // Documento relacionado
  pjeDocumentoId: varchar("pje_documento_id", { length: 20 }),

  // Metadados
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("historico_mpu_processo_vvd_id_idx").on(table.processoVVDId),
  index("historico_mpu_tipo_evento_idx").on(table.tipoEvento),
  index("historico_mpu_data_evento_idx").on(table.dataEvento),
]);

export type HistoricoMPU = typeof historicoMPU.$inferSelect;
export type InsertHistoricoMPU = typeof historicoMPU.$inferInsert;

// ==========================================
// RELAÇÕES - VVD
// ==========================================

export const partesVVDRelations = relations(partesVVD, ({ one }) => ({
  defensor: one(users, { fields: [partesVVD.defensorId], references: [users.id] }),
  assistido: one(assistidos, { fields: [partesVVD.assistidoId], references: [assistidos.id] }),
}));

export const processosVVDRelations = relations(processosVVD, ({ one, many }) => ({
  requerido: one(partesVVD, {
    fields: [processosVVD.requeridoId],
    references: [partesVVD.id],
    relationName: "processoRequerido",
  }),
  requerente: one(partesVVD, {
    fields: [processosVVD.requerenteId],
    references: [partesVVD.id],
    relationName: "processoRequerente",
  }),
  defensor: one(users, { fields: [processosVVD.defensorId], references: [users.id] }),
  processo: one(processos, { fields: [processosVVD.processoId], references: [processos.id] }),
  intimacoes: many(intimacoesVVD),
  historico: many(historicoMPU),
}));

export const intimacoesVVDRelations = relations(intimacoesVVD, ({ one }) => ({
  processoVVD: one(processosVVD, { fields: [intimacoesVVD.processoVVDId], references: [processosVVD.id] }),
  demanda: one(demandas, { fields: [intimacoesVVD.demandaId], references: [demandas.id] }),
  audiencia: one(audiencias, { fields: [intimacoesVVD.audienciaId], references: [audiencias.id] }),
  defensor: one(users, { fields: [intimacoesVVD.defensorId], references: [users.id] }),
}));

export const historicoMPURelations = relations(historicoMPU, ({ one }) => ({
  processoVVD: one(processosVVD, { fields: [historicoMPU.processoVVDId], references: [processosVVD.id] }),
}));
