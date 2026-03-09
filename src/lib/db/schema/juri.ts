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
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import {
  tipoPenalJuriEnum,
  regimeInicialEnum,
  documentoJuriTipoEnum,
  statusApelacaoEnum,
  resultadoRecursoEnum,
  tendenciaVotoEnum,
  nivelConfiancaEnum,
} from "./enums";
import { users, processos } from "./core";
import { casos, casePersonas, caseFacts, juriScriptItems, tesesDefensivas, quesitos } from "./casos";
import { testemunhas } from "./agenda";

// ==========================================
// SESSÕES DO JÚRI (Plenário)
// ==========================================

export const sessoesJuri = pgTable("sessoes_juri", {
  id: serial("id").primaryKey(),
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  dataSessao: timestamp("data_sessao").notNull(),
  horario: varchar("horario", { length: 10 }),
  sala: varchar("sala", { length: 50 }),
  defensorId: integer("defensor_id").references(() => users.id),
  defensorNome: text("defensor_nome"),
  assistidoNome: text("assistido_nome"),
  status: varchar("status", { length: 30 }).default("agendada"),
  resultado: text("resultado"),
  penaAplicada: text("pena_aplicada"),
  observacoes: text("observacoes"),
  simulacaoResultado: jsonb("simulacao_resultado"),
  registroCompleto: boolean("registro_completo").default(false),
  juizPresidente: text("juiz_presidente"),
  promotor: text("promotor"),
  duracaoMinutos: integer("duracao_minutos"),
  localFato: text("local_fato"),
  tipoPenal: tipoPenalJuriEnum("tipo_penal"),
  tesePrincipal: text("tese_principal"),
  reuPrimario: boolean("reu_primario"),
  reuIdade: integer("reu_idade"),
  vitimaGenero: varchar("vitima_genero", { length: 20 }),
  vitimaIdade: integer("vitima_idade"),
  usouAlgemas: boolean("usou_algemas"),
  incidentesProcessuais: text("incidentes_processuais"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("sessoes_juri_processo_id_idx").on(table.processoId),
  index("sessoes_juri_data_sessao_idx").on(table.dataSessao),
  index("sessoes_juri_defensor_id_idx").on(table.defensorId),
  index("sessoes_juri_status_idx").on(table.status),
]);

export type SessaoJuri = typeof sessoesJuri.$inferSelect;
export type InsertSessaoJuri = typeof sessoesJuri.$inferInsert;

// ==========================================
// DOSIMETRIA DO JURI
// ==========================================

export const dosimetriaJuri = pgTable("dosimetria_juri", {
  id: serial("id").primaryKey(),
  sessaoJuriId: integer("sessao_juri_id")
    .notNull()
    .references(() => sessoesJuri.id, { onDelete: "cascade" }),
  penaBase: text("pena_base"),
  circunstanciasJudiciais: text("circunstancias_judiciais"),
  agravantes: text("agravantes"),
  atenuantes: text("atenuantes"),
  causasAumento: text("causas_aumento"),
  causasDiminuicao: text("causas_diminuicao"),
  penaTotalMeses: integer("pena_total_meses"),
  regimeInicial: regimeInicialEnum("regime_inicial"),
  detracaoInicio: date("detracao_inicio"),
  detracaoFim: date("detracao_fim"),
  detracaoDias: integer("detracao_dias"),
  dataFato: date("data_fato"),
  fracaoProgressao: varchar("fracao_progressao", { length: 10 }),
  incisoAplicado: varchar("inciso_aplicado", { length: 30 }),
  vedadoLivramento: boolean("vedado_livramento").default(false),
  resultouMorte: boolean("resultou_morte").default(false),
  reuReincidente: boolean("reu_reincidente").default(false),
  extraidoPorIA: boolean("extraido_por_ia").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("dosimetria_juri_sessao_idx").on(table.sessaoJuriId),
]);

export type DosimetriaJuri = typeof dosimetriaJuri.$inferSelect;
export type InsertDosimetriaJuri = typeof dosimetriaJuri.$inferInsert;

// ==========================================
// DOCUMENTOS DO JURI
// ==========================================

export const documentosJuri = pgTable("documentos_juri", {
  id: serial("id").primaryKey(),
  sessaoJuriId: integer("sessao_juri_id")
    .notNull()
    .references(() => sessoesJuri.id, { onDelete: "cascade" }),
  tipo: documentoJuriTipoEnum("tipo").notNull(),
  fileName: text("file_name"),
  url: text("url").notNull(),
  dadosExtraidos: jsonb("dados_extraidos"),
  processadoEm: timestamp("processado_em"),
  statusProcessamento: varchar("status_processamento", { length: 20 }).default("pendente"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("documentos_juri_sessao_idx").on(table.sessaoJuriId),
  index("documentos_juri_tipo_idx").on(table.tipo),
]);

export type DocumentoJuri = typeof documentosJuri.$inferSelect;
export type InsertDocumentoJuri = typeof documentosJuri.$inferInsert;

// ==========================================
// JURADOS
// ==========================================

export const jurados = pgTable("jurados", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  profissao: varchar("profissao", { length: 100 }),
  escolaridade: varchar("escolaridade", { length: 50 }),
  idade: integer("idade"),
  bairro: varchar("bairro", { length: 100 }),
  genero: varchar("genero", { length: 20 }),
  classeSocial: varchar("classe_social", { length: 30 }),
  perfilPsicologico: text("perfil_psicologico"),
  tendenciaVoto: integer("tendencia_voto"),
  status: varchar("status", { length: 30 }),
  sessaoJuriId: integer("sessao_juri_id").references(() => sessoesJuri.id, { onDelete: "set null" }),
  totalSessoes: integer("total_sessoes").default(0),
  votosCondenacao: integer("votos_condenacao").default(0),
  votosAbsolvicao: integer("votos_absolvicao").default(0),
  votosDesclassificacao: integer("votos_desclassificacao").default(0),
  perfilTendencia: varchar("perfil_tendencia", { length: 30 }),
  observacoes: text("observacoes"),
  historicoNotas: text("historico_notas"),
  ativo: boolean("ativo").default(true),
  reuniaoPeriodica: varchar("reuniao_periodica", { length: 10 }),
  tipoJurado: varchar("tipo_jurado", { length: 20 }),
  empresa: varchar("empresa", { length: 150 }),
  createdById: integer("created_by_id")
    .references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("jurados_nome_idx").on(table.nome),
  index("jurados_perfil_idx").on(table.perfilTendencia),
  index("jurados_sessao_juri_id_idx").on(table.sessaoJuriId),
  index("jurados_tendencia_voto_idx").on(table.tendenciaVoto),
  index("jurados_status_idx").on(table.status),
  index("jurados_reuniao_idx").on(table.reuniaoPeriodica),
  index("jurados_tipo_idx").on(table.tipoJurado),
  index("jurados_ativo_idx").on(table.ativo),
]);

export type Jurado = typeof jurados.$inferSelect;
export type InsertJurado = typeof jurados.$inferInsert;

// ==========================================
// CONSELHO DO JÚRI
// ==========================================

export const conselhoJuri = pgTable("conselho_juri", {
  id: serial("id").primaryKey(),
  sessaoId: integer("sessao_id")
    .notNull()
    .references(() => sessoesJuri.id, { onDelete: "cascade" }),
  juradoId: integer("jurado_id")
    .notNull()
    .references(() => jurados.id, { onDelete: "cascade" }),
  posicao: integer("posicao"),
  voto: varchar("voto", { length: 30 }),
  anotacoes: text("anotacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("conselho_juri_sessao_idx").on(table.sessaoId),
  index("conselho_juri_jurado_idx").on(table.juradoId),
]);

export type ConselhoJuri = typeof conselhoJuri.$inferSelect;
export type InsertConselhoJuri = typeof conselhoJuri.$inferInsert;

// ==========================================
// PERSONAGENS DO JÚRI (Juiz, Promotor, etc.)
// ==========================================

export const personagensJuri = pgTable("personagens_juri", {
  id: serial("id").primaryKey(),
  nome: text("nome").notNull(),
  tipo: varchar("tipo", { length: 30 }).notNull(),
  vara: varchar("vara", { length: 100 }),
  comarca: varchar("comarca", { length: 100 }),
  estiloAtuacao: text("estilo_atuacao"),
  pontosFortes: text("pontos_fortes"),
  pontosFracos: text("pontos_fracos"),
  tendenciasObservadas: text("tendencias_observadas"),
  estrategiasRecomendadas: text("estrategias_recomendadas"),
  historico: text("historico"),
  totalSessoes: integer("total_sessoes").default(0),
  totalCondenacoes: integer("total_condenacoes").default(0),
  totalAbsolvicoes: integer("total_absolvicoes").default(0),
  totalDesclassificacoes: integer("total_desclassificacoes").default(0),
  tempoMedioSustentacao: integer("tempo_medio_sustentacao"),
  argumentosPreferidos: jsonb("argumentos_preferidos").$type<string[]>(),
  tesesVulneraveis: jsonb("teses_vulneraveis").$type<string[]>(),
  notasEstrategicas: text("notas_estrategicas"),
  ultimaSessaoData: timestamp("ultima_sessao_data"),
  ativo: boolean("ativo").default(true),
  createdById: integer("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("personagens_juri_nome_idx").on(table.nome),
  index("personagens_juri_tipo_idx").on(table.tipo),
  index("personagens_juri_comarca_idx").on(table.comarca),
  index("personagens_juri_ativo_idx").on(table.ativo),
]);

export type PersonagemJuri = typeof personagensJuri.$inferSelect;
export type InsertPersonagemJuri = typeof personagensJuri.$inferInsert;

// ==========================================
// AVALIAÇÕES DO JÚRI
// ==========================================

export const avaliacoesJuri = pgTable("avaliacoes_juri", {
  id: serial("id").primaryKey(),
  sessaoJuriId: integer("sessao_juri_id")
    .notNull()
    .references(() => sessoesJuri.id, { onDelete: "cascade" }),
  processoId: integer("processo_id")
    .references(() => processos.id, { onDelete: "set null" }),
  observador: text("observador").notNull(),
  dataJulgamento: date("data_julgamento").notNull(),
  horarioInicio: varchar("horario_inicio", { length: 10 }),
  duracaoEstimada: varchar("duracao_estimada", { length: 50 }),
  descricaoAmbiente: text("descricao_ambiente"),
  disposicaoFisica: text("disposicao_fisica"),
  climaEmocionalInicial: text("clima_emocional_inicial"),
  presencaPublicoMidia: text("presenca_publico_midia"),
  interrogatorioReacaoGeral: text("interrogatorio_reacao_geral"),
  interrogatorioJuradosAcreditaram: text("interrogatorio_jurados_acreditaram"),
  interrogatorioJuradosCeticos: text("interrogatorio_jurados_ceticos"),
  interrogatorioMomentosImpacto: text("interrogatorio_momentos_impacto"),
  interrogatorioContradicoes: text("interrogatorio_contradicoes"),
  interrogatorioImpressaoCredibilidade: text("interrogatorio_impressao_credibilidade"),
  interrogatorioNivelCredibilidade: integer("interrogatorio_nivel_credibilidade"),
  mpEstrategiaGeral: text("mp_estrategia_geral"),
  mpImpactoGeral: integer("mp_impacto_geral"),
  mpInclinacaoCondenar: text("mp_inclinacao_condenar"),
  defesaEstrategiaGeral: text("defesa_estrategia_geral"),
  defesaImpactoGeral: integer("defesa_impacto_geral"),
  defesaDuvidaRazoavel: text("defesa_duvida_razoavel"),
  replicaRefutacoes: text("replica_refutacoes"),
  replicaArgumentosNovos: text("replica_argumentos_novos"),
  replicaReacaoGeral: text("replica_reacao_geral"),
  replicaImpacto: integer("replica_impacto"),
  replicaMudancaOpiniao: text("replica_mudanca_opiniao"),
  treplicaRefutacoes: text("treplica_refutacoes"),
  treplicaApeloFinal: text("treplica_apelo_final"),
  treplicaReacaoGeral: text("treplica_reacao_geral"),
  treplicaMomentoImpactante: text("treplica_momento_impactante"),
  treplicaImpacto: integer("treplica_impacto"),
  treplicaReconquistaIndecisos: text("treplica_reconquista_indecisos"),
  ladoMaisPersuasivo: text("lado_mais_persuasivo"),
  impactoAcusacao: integer("impacto_acusacao"),
  impactoDefesa: integer("impacto_defesa"),
  impressaoFinalLeiga: text("impressao_final_leiga"),
  argumentoMaisImpactante: text("argumento_mais_impactante"),
  pontosNaoExplorados: text("pontos_nao_explorados"),
  climaGeralJulgamento: text("clima_geral_julgamento"),
  momentosVirada: text("momentos_virada"),
  surpresasJulgamento: text("surpresas_julgamento"),
  observacoesAdicionais: text("observacoes_adicionais"),
  status: varchar("status", { length: 30 }).default("em_andamento"),
  criadoPorId: integer("criado_por_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("avaliacoes_juri_sessao_id_idx").on(table.sessaoJuriId),
  index("avaliacoes_juri_processo_id_idx").on(table.processoId),
  index("avaliacoes_juri_status_idx").on(table.status),
  index("avaliacoes_juri_data_idx").on(table.dataJulgamento),
]);

export type AvaliacaoJuri = typeof avaliacoesJuri.$inferSelect;
export type InsertAvaliacaoJuri = typeof avaliacoesJuri.$inferInsert;

// Avaliação individual de cada jurado
export const avaliacaoJurados = pgTable("avaliacao_jurados", {
  id: serial("id").primaryKey(),
  avaliacaoJuriId: integer("avaliacao_juri_id")
    .notNull()
    .references(() => avaliacoesJuri.id, { onDelete: "cascade" }),
  juradoId: integer("jurado_id")
    .references(() => jurados.id, { onDelete: "set null" }),
  posicao: integer("posicao").notNull(),
  nome: text("nome"),
  profissao: varchar("profissao", { length: 100 }),
  idadeAproximada: integer("idade_aproximada"),
  sexo: varchar("sexo", { length: 20 }),
  aparenciaPrimeiraImpressao: text("aparencia_primeira_impressao"),
  linguagemCorporalInicial: text("linguagem_corporal_inicial"),
  tendenciaVoto: tendenciaVotoEnum("tendencia_voto"),
  nivelConfianca: nivelConfiancaEnum("nivel_confianca"),
  justificativaTendencia: text("justificativa_tendencia"),
  anotacoesInterrogatorio: text("anotacoes_interrogatorio"),
  anotacoesMp: text("anotacoes_mp"),
  anotacoesDefesa: text("anotacoes_defesa"),
  anotacoesGerais: text("anotacoes_gerais"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("avaliacao_jurados_avaliacao_id_idx").on(table.avaliacaoJuriId),
  index("avaliacao_jurados_jurado_id_idx").on(table.juradoId),
  index("avaliacao_jurados_posicao_idx").on(table.posicao),
  index("avaliacao_jurados_tendencia_idx").on(table.tendenciaVoto),
]);

export type AvaliacaoJurado = typeof avaliacaoJurados.$inferSelect;
export type InsertAvaliacaoJurado = typeof avaliacaoJurados.$inferInsert;

// Avaliação das testemunhas durante o júri
export const avaliacaoTestemunhasJuri = pgTable("avaliacao_testemunhas_juri", {
  id: serial("id").primaryKey(),
  avaliacaoJuriId: integer("avaliacao_juri_id")
    .notNull()
    .references(() => avaliacoesJuri.id, { onDelete: "cascade" }),
  testemunhaId: integer("testemunha_id")
    .references(() => testemunhas.id, { onDelete: "set null" }),
  ordem: integer("ordem"),
  nome: text("nome").notNull(),
  resumoDepoimento: text("resumo_depoimento"),
  reacaoJurados: text("reacao_jurados"),
  expressoesFaciaisLinguagem: text("expressoes_faciais_linguagem"),
  credibilidade: integer("credibilidade"),
  observacoesComplementares: text("observacoes_complementares"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("avaliacao_testemunhas_avaliacao_id_idx").on(table.avaliacaoJuriId),
  index("avaliacao_testemunhas_testemunha_id_idx").on(table.testemunhaId),
  index("avaliacao_testemunhas_ordem_idx").on(table.ordem),
]);

export type AvaliacaoTestemunhaJuri = typeof avaliacaoTestemunhasJuri.$inferSelect;
export type InsertAvaliacaoTestemunhaJuri = typeof avaliacaoTestemunhasJuri.$inferInsert;

// Argumentos do MP e Defesa durante a sustentação
export const argumentosSustentacao = pgTable("argumentos_sustentacao", {
  id: serial("id").primaryKey(),
  avaliacaoJuriId: integer("avaliacao_juri_id")
    .notNull()
    .references(() => avaliacoesJuri.id, { onDelete: "cascade" }),
  tipo: varchar("tipo", { length: 20 }).notNull(),
  ordem: integer("ordem"),
  descricaoArgumento: text("descricao_argumento"),
  reacaoJurados: text("reacao_jurados"),
  nivelPersuasao: integer("nivel_persuasao"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("argumentos_sustentacao_avaliacao_id_idx").on(table.avaliacaoJuriId),
  index("argumentos_sustentacao_tipo_idx").on(table.tipo),
  index("argumentos_sustentacao_ordem_idx").on(table.ordem),
]);

export type ArgumentoSustentacao = typeof argumentosSustentacao.$inferSelect;
export type InsertArgumentoSustentacao = typeof argumentosSustentacao.$inferInsert;

// ==========================================
// RECURSOS JÚRI (APELAÇÕES PÓS-JULGAMENTO)
// ==========================================

export const recursosJuri = pgTable("recursos_juri", {
  id: serial("id").primaryKey(),
  sessaoJuriId: integer("sessao_juri_id")
    .notNull()
    .references(() => sessoesJuri.id, { onDelete: "cascade" }),
  casoId: integer("caso_id")
    .references(() => casos.id, { onDelete: "set null" }),
  processoId: integer("processo_id")
    .notNull()
    .references(() => processos.id, { onDelete: "cascade" }),
  reuNome: text("reu_nome"),
  status: statusApelacaoEnum("status").default("interposta").notNull(),
  dataInterposicao: date("data_interposicao"),
  dataAdmissao: date("data_admissao"),
  dataJulgamento: date("data_julgamento"),
  turmaTJBA: text("turma_tjba"),
  camaraTJBA: text("camara_tjba"),
  relator: text("relator"),
  resultadoApelacao: resultadoRecursoEnum("resultado_apelacao"),
  houveREsp: boolean("houve_resp").default(false),
  resultadoREsp: resultadoRecursoEnum("resultado_resp"),
  houveRE: boolean("houve_re").default(false),
  resultadoRE: resultadoRecursoEnum("resultado_re"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("recursos_juri_sessao_idx").on(table.sessaoJuriId),
  index("recursos_juri_processo_idx").on(table.processoId),
  index("recursos_juri_status_idx").on(table.status),
]);

export type RecursoJuri = typeof recursosJuri.$inferSelect;
export type InsertRecursoJuri = typeof recursosJuri.$inferInsert;

// ==========================================
// RELAÇÕES - Júri
// ==========================================

export const sessoesJuriRelations = relations(sessoesJuri, ({ one, many }) => ({
  processo: one(processos, { fields: [sessoesJuri.processoId], references: [processos.id] }),
  defensor: one(users, { fields: [sessoesJuri.defensorId], references: [users.id] }),
  jurados: many(jurados),
  conselho: many(conselhoJuri),
  scriptItems: many(juriScriptItems),
  dosimetria: many(dosimetriaJuri),
  documentos: many(documentosJuri),
}));

export const dosimetriaJuriRelations = relations(dosimetriaJuri, ({ one }) => ({
  sessao: one(sessoesJuri, { fields: [dosimetriaJuri.sessaoJuriId], references: [sessoesJuri.id] }),
}));

export const documentosJuriRelations = relations(documentosJuri, ({ one }) => ({
  sessao: one(sessoesJuri, { fields: [documentosJuri.sessaoJuriId], references: [sessoesJuri.id] }),
}));

export const juradosRelations = relations(jurados, ({ one, many }) => ({
  createdBy: one(users, { fields: [jurados.createdById], references: [users.id] }),
  sessaoJuri: one(sessoesJuri, { fields: [jurados.sessaoJuriId], references: [sessoesJuri.id] }),
  conselhos: many(conselhoJuri),
  personas: many(casePersonas),
}));

export const conselhoJuriRelations = relations(conselhoJuri, ({ one }) => ({
  sessao: one(sessoesJuri, { fields: [conselhoJuri.sessaoId], references: [sessoesJuri.id] }),
  jurado: one(jurados, { fields: [conselhoJuri.juradoId], references: [jurados.id] }),
}));

export const personagensJuriRelations = relations(personagensJuri, ({ one }) => ({
  createdBy: one(users, { fields: [personagensJuri.createdById], references: [users.id] }),
}));

export const avaliacoesJuriRelations = relations(avaliacoesJuri, ({ one, many }) => ({
  sessaoJuri: one(sessoesJuri, { fields: [avaliacoesJuri.sessaoJuriId], references: [sessoesJuri.id] }),
  processo: one(processos, { fields: [avaliacoesJuri.processoId], references: [processos.id] }),
  criadoPor: one(users, { fields: [avaliacoesJuri.criadoPorId], references: [users.id] }),
  avaliacaoJurados: many(avaliacaoJurados),
  avaliacaoTestemunhas: many(avaliacaoTestemunhasJuri),
  argumentos: many(argumentosSustentacao),
}));

export const avaliacaoJuradosRelations = relations(avaliacaoJurados, ({ one }) => ({
  avaliacaoJuri: one(avaliacoesJuri, { fields: [avaliacaoJurados.avaliacaoJuriId], references: [avaliacoesJuri.id] }),
  jurado: one(jurados, { fields: [avaliacaoJurados.juradoId], references: [jurados.id] }),
}));

export const avaliacaoTestemunhasJuriRelations = relations(avaliacaoTestemunhasJuri, ({ one }) => ({
  avaliacaoJuri: one(avaliacoesJuri, { fields: [avaliacaoTestemunhasJuri.avaliacaoJuriId], references: [avaliacoesJuri.id] }),
  testemunha: one(testemunhas, { fields: [avaliacaoTestemunhasJuri.testemunhaId], references: [testemunhas.id] }),
}));

export const argumentosSustentacaoRelations = relations(argumentosSustentacao, ({ one }) => ({
  avaliacaoJuri: one(avaliacoesJuri, { fields: [argumentosSustentacao.avaliacaoJuriId], references: [avaliacoesJuri.id] }),
}));

export const recursosJuriRelations = relations(recursosJuri, ({ one }) => ({
  sessaoJuri: one(sessoesJuri, { fields: [recursosJuri.sessaoJuriId], references: [sessoesJuri.id] }),
  caso: one(casos, { fields: [recursosJuri.casoId], references: [casos.id] }),
  processo: one(processos, { fields: [recursosJuri.processoId], references: [processos.id] }),
}));

export const quesitosRelations = relations(quesitos, ({ one }) => ({
  caso: one(casos, { fields: [quesitos.casoId], references: [casos.id] }),
  sessaoJuri: one(sessoesJuri, { fields: [quesitos.sessaoJuriId], references: [sessoesJuri.id] }),
  tese: one(tesesDefensivas, { fields: [quesitos.teseId], references: [tesesDefensivas.id] }),
}));
