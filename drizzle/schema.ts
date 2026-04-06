import { pgTable, index, foreignKey, serial, integer, text, jsonb, timestamp, pgPolicy, varchar, boolean, uniqueIndex, numeric, unique, date, uuid, real, vector, check, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const analysisType = pgEnum("analysis_type", ['EXTRACAO', 'ESTRATEGIA', 'PREPARACAO', 'ENRIQUECIMENTO'])
export const area = pgEnum("area", ['JURI', 'EXECUCAO_PENAL', 'VIOLENCIA_DOMESTICA', 'SUBSTITUICAO', 'CURADORIA', 'FAMILIA', 'CIVEL', 'FAZENDA_PUBLICA', 'CRIMINAL', 'INFANCIA_JUVENTUDE'])
export const areaDireito = pgEnum("area_direito", ['CRIMINAL', 'CIVEL', 'TRABALHISTA', 'EXECUCAO_PENAL', 'JURI'])
export const atribuicao = pgEnum("atribuicao", ['JURI_CAMACARI', 'VVD_CAMACARI', 'EXECUCAO_PENAL', 'SUBSTITUICAO', 'SUBSTITUICAO_CIVEL', 'GRUPO_JURI', 'CRIMINAL_CAMACARI', 'CRIMINAL_SIMOES_FILHO', 'CRIMINAL_LAURO_DE_FREITAS', 'CRIMINAL_CANDEIAS', 'CRIMINAL_ITAPARICA'])
export const canalEntradaVvd = pgEnum("canal_entrada_vvd", ['formulario_google', 'policia_civil', 'cram', 'dpe', 'juiz_oficio', 'outro'])
export const chatMessageType = pgEnum("chat_message_type", ['text', 'image', 'audio', 'video', 'document', 'sticker', 'location', 'contact', 'unknown'])
export const circunstanciaRadar = pgEnum("circunstancia_radar", ['flagrante', 'mandado', 'denuncia', 'operacao', 'investigacao', 'julgamento'])
export const diagramaTipo = pgEnum("diagrama_tipo", ['MAPA_MENTAL', 'TIMELINE', 'RELACIONAL', 'HIERARQUIA', 'MATRIX', 'FLUXOGRAMA', 'LIVRE'])
export const diligenciaStatus = pgEnum("diligencia_status", ['A_PESQUISAR', 'EM_ANDAMENTO', 'AGUARDANDO', 'LOCALIZADO', 'OBTIDO', 'INFRUTIFERO', 'ARQUIVADO'])
export const diligenciaTipo = pgEnum("diligencia_tipo", ['LOCALIZACAO_PESSOA', 'LOCALIZACAO_DOCUMENTO', 'REQUISICAO_DOCUMENTO', 'PESQUISA_OSINT', 'DILIGENCIA_CAMPO', 'INTIMACAO', 'OITIVA', 'PERICIA', 'EXAME', 'OUTRO'])
export const documentoJuriTipo = pgEnum("documento_juri_tipo", ['quesitos', 'sentenca', 'ata'])
export const extractionStatus = pgEnum("extraction_status", ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'SKIPPED'])
export const faseCaso = pgEnum("fase_caso", ['INQUERITO', 'INSTRUCAO', 'PLENARIO', 'RECURSO', 'EXECUCAO', 'ARQUIVADO'])
export const feedbackStatus = pgEnum("feedback_status", ['novo', 'visto', 'enviado_jira', 'descartado'])
export const feedbackTipo = pgEnum("feedback_tipo", ['bug', 'sugestao', 'duvida'])
export const modeloCategoria = pgEnum("modelo_categoria", ['PROVIDENCIA_ADMINISTRATIVA', 'PROVIDENCIA_FUNCIONAL', 'PROVIDENCIA_INSTITUCIONAL', 'PECA_PROCESSUAL', 'COMUNICACAO', 'OUTRO'])
export const nivelConfianca = pgEnum("nivel_confianca", ['BAIXA', 'MEDIA', 'ALTA'])
export const oficioAnaliseStatus = pgEnum("oficio_analise_status", ['pendente', 'processando', 'concluido', 'erro'])
export const papelProcesso = pgEnum("papel_processo", ['REU', 'CORREU', 'VITIMA', 'TESTEMUNHA', 'DENUNCIANTE', 'QUERELANTE', 'ASSISTENTE', 'REQUERIDO', 'EXECUTADO', 'REEDUCANDO'])
export const patternType = pgEnum("pattern_type", ['orgao', 'classe', 'parte', 'numero'])
export const prioridade = pgEnum("prioridade", ['BAIXA', 'NORMAL', 'ALTA', 'URGENTE', 'REU_PRESO'])
export const quesitosResultado = pgEnum("quesitos_resultado", ['sim', 'nao', 'prejudicado'])
export const radarEnrichmentStatus = pgEnum("radar_enrichment_status", ['pending', 'extracted', 'matched', 'analyzed', 'failed', 'duplicate'])
export const radarFonteConfiabilidade = pgEnum("radar_fonte_confiabilidade", ['local', 'regional', 'estadual'])
export const radarFonteTipo = pgEnum("radar_fonte_tipo", ['portal', 'instagram', 'twitter', 'facebook', 'rss'])
export const radarMatchStatus = pgEnum("radar_match_status", ['auto_confirmado', 'possivel', 'descartado', 'confirmado_manual'])
export const regimeInicial = pgEnum("regime_inicial", ['fechado', 'semiaberto', 'aberto'])
export const resultadoRecurso = pgEnum("resultado_recurso", ['provido', 'parcialmente_provido', 'improvido', 'nao_conhecido'])
export const simulacaoStatus = pgEnum("simulacao_status", ['RASCUNHO', 'PRONTO', 'APRESENTADO', 'ARQUIVADO'])
export const statusApelacao = pgEnum("status_apelacao", ['interposta', 'admitida', 'em_julgamento', 'julgada', 'transitada'])
export const statusAudiencia = pgEnum("status_audiencia", ['A_DESIGNAR', 'DESIGNADA', 'REALIZADA', 'AGUARDANDO_ATA', 'CONCLUIDA', 'ADIADA', 'CANCELADA'])
export const statusCaso = pgEnum("status_caso", ['ATIVO', 'SUSPENSO', 'ARQUIVADO'])
export const statusDemanda = pgEnum("status_demanda", ['2_ATENDER', '4_MONITORAR', '5_TRIAGEM', '7_PROTOCOLADO', '7_CIENCIA', '7_SEM_ATUACAO', 'URGENTE', 'CONCLUIDO', 'ARQUIVADO'])
export const statusMpu = pgEnum("status_mpu", ['ATIVA', 'EXPIRADA', 'REVOGADA', 'RENOVADA', 'MODULADA', 'AGUARDANDO_DECISAO'])
export const statusPrisional = pgEnum("status_prisional", ['SOLTO', 'CADEIA_PUBLICA', 'PENITENCIARIA', 'COP', 'HOSPITAL_CUSTODIA', 'DOMICILIAR', 'MONITORADO'])
export const statusProcesso = pgEnum("status_processo", ['FLAGRANTE', 'INQUERITO', 'INSTRUCAO', 'RECURSO', 'EXECUCAO', 'ARQUIVADO'])
export const statusTestemunha = pgEnum("status_testemunha", ['ARROLADA', 'INTIMADA', 'OUVIDA', 'DESISTIDA', 'NAO_LOCALIZADA', 'CARTA_PRECATORIA'])
export const syncOrigem = pgEnum("sync_origem", ['BANCO', 'PLANILHA', 'MOVE', 'CONFLITO_RESOLVIDO'])
export const tendenciaVoto = pgEnum("tendencia_voto", ['CONDENAR', 'ABSOLVER', 'INDECISO'])
export const tipoAnaliseIa = pgEnum("tipo_analise_ia", ['RESUMO_CASO', 'ANALISE_DENUNCIA', 'TESES_DEFENSIVAS', 'ANALISE_PROVAS', 'RISCO_CONDENACAO', 'JURISPRUDENCIA', 'ESTRATEGIA_JURI', 'PERFIL_JURADOS', 'COMPARACAO_CASOS', 'TIMELINE', 'PONTOS_FRACOS', 'QUESITACAO', 'MEMORIAL_DRAFT', 'OUTRO'])
export const tipoAudiencia = pgEnum("tipo_audiencia", ['INSTRUCAO', 'CUSTODIA', 'CONCILIACAO', 'JUSTIFICACAO', 'ADMONICAO', 'UNA', 'PLENARIO_JURI', 'CONTINUACAO', 'OUTRA'])
export const tipoCrimeRadar = pgEnum("tipo_crime_radar", ['homicidio', 'tentativa_homicidio', 'trafico', 'roubo', 'furto', 'violencia_domestica', 'sexual', 'lesao_corporal', 'porte_arma', 'estelionato', 'outros', 'feminicidio', 'execucao_penal'])
export const tipoDecisao = pgEnum("tipo_decisao", ['ACORDAO', 'DECISAO_MONOCRATICA', 'SUMULA', 'SUMULA_VINCULANTE', 'REPERCUSSAO_GERAL', 'RECURSO_REPETITIVO', 'INFORMATIVO', 'OUTRO'])
export const tipoIntimacao = pgEnum("tipo_intimacao", ['CIENCIA', 'PETICIONAR', 'AUDIENCIA', 'CUMPRIMENTO'])
export const tipoPecaProcessual = pgEnum("tipo_peca_processual", ['DENUNCIA', 'QUEIXA_CRIME', 'PRONUNCIA', 'IMPRONUNCIA', 'ABSOLVICAO_SUMARIA', 'SENTENCA', 'ACORDAO', 'LAUDO_PERICIAL', 'LAUDO_CADAVERICO', 'LAUDO_PSIQUIATRICO', 'LAUDO_TOXICOLOGICO', 'ATA_AUDIENCIA', 'ATA_INTERROGATORIO', 'ATA_PLENARIO', 'DEPOIMENTO', 'BOLETIM_OCORRENCIA', 'AUTO_PRISAO', 'MANDADO', 'DECISAO_INTERLOCUTORIA', 'QUESITOS', 'MEMORIAL', 'OUTRO'])
export const tipoPenalJuri = pgEnum("tipo_penal_juri", ['homicidio_simples', 'homicidio_qualificado', 'homicidio_privilegiado', 'homicidio_privilegiado_qualificado', 'homicidio_tentado', 'feminicidio'])
export const tipoRelatoVvd = pgEnum("tipo_relato_vvd", ['ameaca', 'lesao_corporal', 'descumprimento', 'psicologica', 'patrimonial', 'sexual', 'outro'])
export const tipoTestemunha = pgEnum("tipo_testemunha", ['DEFESA', 'ACUSACAO', 'COMUM', 'INFORMANTE', 'PERITO', 'VITIMA'])
export const tribunal = pgEnum("tribunal", ['STF', 'STJ', 'TJBA', 'TRF1', 'TRF3', 'OUTRO'])
export const unidade = pgEnum("unidade", ['CAMACARI', 'CANDEIAS', 'DIAS_DAVILA', 'SIMOES_FILHO', 'LAURO_DE_FREITAS', 'SALVADOR', 'ITAPARICA'])


export const claudeCodeTasks = pgTable("claude_code_tasks", {
	id: serial().primaryKey().notNull(),
	assistidoId: integer("assistido_id").notNull(),
	processoId: integer("processo_id"),
	casoId: integer("caso_id"),
	skill: text().notNull(),
	prompt: text().notNull(),
	instrucaoAdicional: text("instrucao_adicional"),
	status: text().default('pending').notNull(),
	etapa: text(),
	resultado: jsonb(),
	erro: text(),
	createdBy: integer("created_by").notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		assistidoIdIdx: index("claude_code_tasks_assistido_id_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")),
		casoIdIdx: index("claude_code_tasks_caso_id_idx").using("btree", table.casoId.asc().nullsLast().op("int4_ops")),
		statusIdx: index("claude_code_tasks_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
		claudeCodeTasksAssistidoIdAssistidosIdFk: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "claude_code_tasks_assistido_id_assistidos_id_fk"
		}),
		claudeCodeTasksCasoIdCasosIdFk: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "claude_code_tasks_caso_id_casos_id_fk"
		}),
		claudeCodeTasksCreatedByUsersIdFk: foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "claude_code_tasks_created_by_users_id_fk"
		}),
		claudeCodeTasksProcessoIdProcessosIdFk: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "claude_code_tasks_processo_id_processos_id_fk"
		}),
	}
});

export const distributionHistory = pgTable("distribution_history", {
	id: serial().primaryKey().notNull(),
	driveFileId: text("drive_file_id").notNull(),
	originalFilename: text("original_filename").notNull(),
	extractedNumeroProcesso: text("extracted_numero_processo"),
	extractedOrgaoJulgador: text("extracted_orgao_julgador"),
	extractedAssistidoNome: text("extracted_assistido_nome"),
	extractedClasseDemanda: text("extracted_classe_demanda"),
	atribuicaoIdentificada: atribuicao("atribuicao_identificada"),
	atribuicaoConfianca: integer("atribuicao_confianca"),
	assistidoId: integer("assistido_id"),
	processoId: integer("processo_id"),
	destinationFolderId: text("destination_folder_id"),
	status: varchar({ length: 20 }).default('pending').notNull(),
	errorMessage: text("error_message"),
	wasManuallyCorreted: boolean("was_manually_correted").default(false),
	correctedBy: integer("corrected_by"),
	workspaceId: integer("workspace_id"),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		assistidoIdIdx: index("distribution_history_assistido_id_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")),
		fileIdIdx: index("distribution_history_file_id_idx").using("btree", table.driveFileId.asc().nullsLast().op("text_ops")),
		processoIdIdx: index("distribution_history_processo_id_idx").using("btree", table.processoId.asc().nullsLast().op("int4_ops")),
		statusIdx: index("distribution_history_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
		workspaceIdIdx: index("distribution_history_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		distributionHistoryAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "distribution_history_assistido_id_fkey"
		}),
		distributionHistoryCorrectedByFkey: foreignKey({
			columns: [table.correctedBy],
			foreignColumns: [users.id],
			name: "distribution_history_corrected_by_fkey"
		}),
		distributionHistoryProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "distribution_history_processo_id_fkey"
		}),
		distributionHistoryWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "distribution_history_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const casos = pgTable("casos", {
	id: serial().primaryKey().notNull(),
	titulo: text().notNull(),
	codigo: varchar({ length: 50 }),
	atribuicao: atribuicao().default('SUBSTITUICAO').notNull(),
	workspaceId: integer("workspace_id"),
	teoriaFatos: text("teoria_fatos"),
	teoriaProvas: text("teoria_provas"),
	teoriaDireito: text("teoria_direito"),
	tags: text(),
	status: varchar({ length: 30 }).default('ativo'),
	fase: varchar({ length: 50 }),
	prioridade: prioridade().default('NORMAL'),
	defensorId: integer("defensor_id"),
	casoConexoId: integer("caso_conexo_id"),
	observacoes: text(),
	linkDrive: text("link_drive"),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	assistidoId: integer("assistido_id"),
	driveFolderId: text("drive_folder_id"),
	foco: text(),
	narrativaDenuncia: text("narrativa_denuncia"),
	analysisData: jsonb("analysis_data"),
	analysisStatus: varchar("analysis_status", { length: 20 }),
	analyzedAt: timestamp("analyzed_at", { mode: 'string' }),
	analysisVersion: integer("analysis_version").default(0),
}, (table) => {
	return {
		analysisStatusIdx: index("casos_analysis_status_idx").using("btree", table.analysisStatus.asc().nullsLast().op("text_ops")),
		assistidoIdIdx: index("casos_assistido_id_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")),
		casosAssistidoIdAssistidosIdFk: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "casos_assistido_id_assistidos_id_fk"
		}).onDelete("cascade"),
		casosWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "casos_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const userSettings = pgTable("user_settings", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	settings: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		userIdIdx: uniqueIndex("user_settings_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
		userSettingsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_settings_user_id_users_id_fk"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const processos = pgTable("processos", {
	id: serial().primaryKey().notNull(),
	assistidoId: integer("assistido_id").notNull(),
	atribuicao: atribuicao().default('SUBSTITUICAO').notNull(),
	workspaceId: integer("workspace_id"),
	numeroAutos: text("numero_autos").notNull(),
	numeroAntigo: text("numero_antigo"),
	comarca: varchar({ length: 100 }),
	vara: varchar({ length: 100 }),
	area: area().notNull(),
	classeProcessual: varchar("classe_processual", { length: 100 }),
	assunto: text(),
	valorCausa: integer("valor_causa"),
	parteContraria: text("parte_contraria"),
	advogadoContrario: text("advogado_contrario"),
	fase: varchar({ length: 50 }),
	situacao: varchar({ length: 50 }).default('ativo'),
	isJuri: boolean("is_juri").default(false),
	dataSessaoJuri: timestamp("data_sessao_juri", { withTimezone: true, mode: 'string' }),
	resultadoJuri: text("resultado_juri"),
	defensorId: integer("defensor_id"),
	observacoes: text(),
	linkDrive: text("link_drive"),
	driveFolderId: text("drive_folder_id"),
	casoId: integer("caso_id"),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	analysisStatus: varchar("analysis_status", { length: 20 }),
	analysisData: jsonb("analysis_data"),
	analyzedAt: timestamp("analyzed_at", { mode: 'string' }),
	analysisVersion: integer("analysis_version").default(0),
	comarcaId: integer("comarca_id").default(1).notNull(),
	localDoFatoEndereco: text("local_do_fato_endereco"),
	localDoFatoLat: numeric("local_do_fato_lat", { precision: 10, scale:  7 }),
	localDoFatoLng: numeric("local_do_fato_lng", { precision: 10, scale:  7 }),
	tipoProcesso: varchar("tipo_processo", { length: 30 }).default('AP'),
	isReferencia: boolean("is_referencia").default(false),
}, (table) => {
	return {
		idxProcessosAssistidoDeleted: index("idx_processos_assistido_deleted").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops"), table.deletedAt.asc().nullsLast().op("int4_ops")),
		analysisStatusIdx: index("processos_analysis_status_idx").using("btree", table.analysisStatus.asc().nullsLast().op("text_ops")),
		comarcaIdIdx: index("processos_comarca_id_idx").using("btree", table.comarcaId.asc().nullsLast().op("int4_ops")),
		localFatoGeoIdx: index("processos_local_fato_geo_idx").using("btree", table.localDoFatoLat.asc().nullsLast().op("numeric_ops"), table.localDoFatoLng.asc().nullsLast().op("numeric_ops")),
		processosAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "processos_assistido_id_fkey"
		}).onDelete("cascade"),
		processosCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "processos_caso_id_fkey"
		}),
		processosComarcaIdFkey: foreignKey({
			columns: [table.comarcaId],
			foreignColumns: [comarcas.id],
			name: "processos_comarca_id_fkey"
		}),
		processosWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "processos_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const workspaces = pgTable("workspaces", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const escalasAtribuicao = pgTable("escalas_atribuicao", {
	id: serial().primaryKey().notNull(),
	profissionalId: integer("profissional_id"),
	atribuicao: varchar({ length: 30 }).notNull(),
	mes: integer().notNull(),
	ano: integer().notNull(),
	ativo: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	comarcaId: integer("comarca_id").default(1).notNull(),
}, (table) => {
	return {
		escalasComarcaIdIdx: index("escalas_comarca_id_idx").using("btree", table.comarcaId.asc().nullsLast().op("int4_ops")),
		escalasMesAnoIdx: index("escalas_mes_ano_idx").using("btree", table.mes.asc().nullsLast().op("int4_ops"), table.ano.asc().nullsLast().op("int4_ops")),
		escalasProfissionalIdx: index("escalas_profissional_idx").using("btree", table.profissionalId.asc().nullsLast().op("int4_ops")),
		escalasAtribuicaoComarcaIdFkey: foreignKey({
			columns: [table.comarcaId],
			foreignColumns: [comarcas.id],
			name: "escalas_atribuicao_comarca_id_fkey"
		}),
		escalasAtribuicaoProfissionalIdFkey: foreignKey({
			columns: [table.profissionalId],
			foreignColumns: [profissionais.id],
			name: "escalas_atribuicao_profissional_id_fkey"
		}).onDelete("cascade"),
		escalasAtribuicaoProfAtribMesAnoKey: unique("escalas_atribuicao_prof_atrib_mes_ano_key").on(table.profissionalId, table.atribuicao, table.mes, table.ano),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const analysisJobs = pgTable("analysis_jobs", {
	id: serial().primaryKey().notNull(),
	processoId: integer("processo_id").notNull(),
	skill: varchar({ length: 50 }).notNull(),
	prompt: text().notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	error: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	startedAt: timestamp("started_at", { mode: 'string' }),
	completedAt: timestamp("completed_at", { mode: 'string' }),
}, (table) => {
	return {
		processoIdx: index("analysis_jobs_processo_idx").using("btree", table.processoId.asc().nullsLast().op("int4_ops")),
		statusIdx: index("analysis_jobs_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
		analysisJobsProcessoIdProcessosIdFk: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "analysis_jobs_processo_id_processos_id_fk"
		}),
	}
});

export const audiencias = pgTable("audiencias", {
	id: serial().primaryKey().notNull(),
	processoId: integer("processo_id"),
	workspaceId: integer("workspace_id"),
	casoId: integer("caso_id"),
	assistidoId: integer("assistido_id"),
	dataAudiencia: timestamp("data_audiencia", { withTimezone: true, mode: 'string' }).notNull(),
	tipo: varchar({ length: 50 }).notNull(),
	local: text(),
	titulo: text(),
	descricao: text(),
	sala: varchar({ length: 50 }),
	horario: varchar({ length: 10 }),
	defensorId: integer("defensor_id"),
	juiz: text(),
	promotor: text(),
	status: varchar({ length: 30 }).default('agendada'),
	resultado: text(),
	observacoes: text(),
	anotacoes: text(),
	anotacoesVersao: integer("anotacoes_versao").default(1),
	resumoDefesa: text("resumo_defesa"),
	googleCalendarEventId: text("google_calendar_event_id"),
	gerarPrazoApos: boolean("gerar_prazo_apos").default(false),
	prazoGeradoId: integer("prazo_gerado_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	responsavelId: integer("responsavel_id"),
	registroAudiencia: jsonb("registro_audiencia"),
}, (table) => {
	return {
		responsavelIdx: index("audiencias_responsavel_idx").using("btree", table.responsavelId.asc().nullsLast().op("int4_ops")),
		idxAudienciasDataStatus: index("idx_audiencias_data_status").using("btree", table.dataAudiencia.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
		audienciasAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "audiencias_assistido_id_fkey"
		}),
		audienciasCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "audiencias_caso_id_fkey"
		}),
		audienciasProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "audiencias_processo_id_fkey"
		}).onDelete("cascade"),
		audienciasResponsavelIdFkey: foreignKey({
			columns: [table.responsavelId],
			foreignColumns: [profissionais.id],
			name: "audiencias_responsavel_id_fkey"
		}).onDelete("set null"),
		audienciasWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "audiencias_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const delegacoesHistorico = pgTable("delegacoes_historico", {
	id: serial().primaryKey().notNull(),
	demandaId: integer("demanda_id"),
	delegadoDeId: integer("delegado_de_id").notNull(),
	delegadoParaId: integer("delegado_para_id").notNull(),
	dataDelegacao: timestamp("data_delegacao", { mode: 'string' }).defaultNow().notNull(),
	dataAceitacao: timestamp("data_aceitacao", { mode: 'string' }),
	dataConclusao: timestamp("data_conclusao", { mode: 'string' }),
	instrucoes: text(),
	observacoes: text(),
	prazoSugerido: date("prazo_sugerido"),
	status: varchar({ length: 25 }).default('pendente').notNull(),
	workspaceId: integer("workspace_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	tipo: varchar({ length: 30 }).default('delegacao_generica'),
	orientacoes: text(),
	assistidoId: integer("assistido_id"),
	processoId: integer("processo_id"),
	prioridade: varchar({ length: 10 }).default('NORMAL'),
}, (table) => {
	return {
		assistidoIdIdx: index("delegacoes_historico_assistido_id_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")),
		delegadoDeIdIdx: index("delegacoes_historico_delegado_de_id_idx").using("btree", table.delegadoDeId.asc().nullsLast().op("int4_ops")),
		delegadoParaIdIdx: index("delegacoes_historico_delegado_para_id_idx").using("btree", table.delegadoParaId.asc().nullsLast().op("int4_ops")),
		demandaIdIdx: index("delegacoes_historico_demanda_id_idx").using("btree", table.demandaId.asc().nullsLast().op("int4_ops")),
		processoIdIdx: index("delegacoes_historico_processo_id_idx").using("btree", table.processoId.asc().nullsLast().op("int4_ops")),
		statusIdx: index("delegacoes_historico_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
		tipoIdx: index("delegacoes_historico_tipo_idx").using("btree", table.tipo.asc().nullsLast().op("text_ops")),
		workspaceIdIdx: index("delegacoes_historico_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		delegacoesHistoricoAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "delegacoes_historico_assistido_id_fkey"
		}),
		delegacoesHistoricoDelegadoDeIdFkey: foreignKey({
			columns: [table.delegadoDeId],
			foreignColumns: [users.id],
			name: "delegacoes_historico_delegado_de_id_fkey"
		}),
		delegacoesHistoricoDelegadoParaIdFkey: foreignKey({
			columns: [table.delegadoParaId],
			foreignColumns: [users.id],
			name: "delegacoes_historico_delegado_para_id_fkey"
		}),
		delegacoesHistoricoDemandaIdFkey: foreignKey({
			columns: [table.demandaId],
			foreignColumns: [demandas.id],
			name: "delegacoes_historico_demanda_id_fkey"
		}).onDelete("cascade"),
		delegacoesHistoricoProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "delegacoes_historico_processo_id_fkey"
		}),
		delegacoesHistoricoWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "delegacoes_historico_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const movimentacoes = pgTable("movimentacoes", {
	id: serial().primaryKey().notNull(),
	processoId: integer("processo_id").notNull(),
	dataMovimentacao: timestamp("data_movimentacao", { withTimezone: true, mode: 'string' }).notNull(),
	descricao: text().notNull(),
	tipo: varchar({ length: 50 }),
	origem: varchar({ length: 20 }).default('manual'),
	createdById: integer("created_by_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		movimentacoesProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "movimentacoes_processo_id_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const sessions = pgTable("sessions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		idxSessionsExpiresAt: index("idx_sessions_expires_at").using("btree", table.expiresAt.asc().nullsLast().op("timestamptz_ops")),
		idxSessionsUserId: index("idx_sessions_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	}
});

export const anotacoes = pgTable("anotacoes", {
	id: serial().primaryKey().notNull(),
	processoId: integer("processo_id"),
	assistidoId: integer("assistido_id"),
	demandaId: integer("demanda_id"),
	casoId: integer("caso_id"),
	conteudo: text().notNull(),
	tipo: varchar({ length: 30 }).default('nota'),
	importante: boolean().default(false),
	createdById: integer("created_by_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	conteudoHash: varchar("conteudo_hash", { length: 16 }),
	metadata: jsonb(),
}, (table) => {
	return {
		dedupHashIdx: uniqueIndex("anotacoes_dedup_hash_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops"), table.conteudoHash.asc().nullsLast().op("int4_ops")).where(sql`(conteudo_hash IS NOT NULL)`),
		anotacoesAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "anotacoes_assistido_id_fkey"
		}).onDelete("cascade"),
		anotacoesCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "anotacoes_caso_id_fkey"
		}).onDelete("set null"),
		anotacoesDemandaIdFkey: foreignKey({
			columns: [table.demandaId],
			foreignColumns: [demandas.id],
			name: "anotacoes_demanda_id_fkey"
		}).onDelete("set null"),
		anotacoesProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "anotacoes_processo_id_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const conselhoJuri = pgTable("conselho_juri", {
	id: serial().primaryKey().notNull(),
	sessaoId: integer("sessao_id").notNull(),
	juradoId: integer("jurado_id").notNull(),
	posicao: integer(),
	voto: varchar({ length: 30 }),
	anotacoes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		conselhoJuriJuradoIdFkey: foreignKey({
			columns: [table.juradoId],
			foreignColumns: [jurados.id],
			name: "conselho_juri_jurado_id_fkey"
		}).onDelete("cascade"),
		conselhoJuriSessaoIdFkey: foreignKey({
			columns: [table.sessaoId],
			foreignColumns: [sessoesJuri.id],
			name: "conselho_juri_sessao_id_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const pecaTemplates = pgTable("peca_templates", {
	id: serial().primaryKey().notNull(),
	nome: varchar({ length: 200 }).notNull(),
	descricao: text(),
	tipoPeca: varchar("tipo_peca", { length: 100 }).notNull(),
	area: area(),
	conteudo: text(),
	fileUrl: text("file_url"),
	isPublic: boolean("is_public").default(false),
	createdById: integer("created_by_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const userInvitations = pgTable("user_invitations", {
	id: serial().primaryKey().notNull(),
	email: text().notNull(),
	nome: text().notNull(),
	token: varchar({ length: 64 }).notNull(),
	nucleo: varchar({ length: 30 }),
	funcao: varchar({ length: 30 }).default('defensor_titular'),
	oab: varchar({ length: 50 }),
	podeVerTodosAssistidos: boolean("pode_ver_todos_assistidos").default(true),
	podeVerTodosProcessos: boolean("pode_ver_todos_processos").default(true),
	mensagem: text(),
	invitedById: integer("invited_by_id"),
	status: varchar({ length: 20 }).default('pending').notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	acceptedAt: timestamp("accepted_at", { mode: 'string' }),
	acceptedUserId: integer("accepted_user_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	comarcaId: integer("comarca_id").default(1).notNull(),
}, (table) => {
	return {
		emailIdx: index("user_invitations_email_idx").using("btree", table.email.asc().nullsLast().op("text_ops")),
		statusIdx: index("user_invitations_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
		tokenIdx: index("user_invitations_token_idx").using("btree", table.token.asc().nullsLast().op("text_ops")),
		userInvitationsAcceptedUserIdUsersIdFk: foreignKey({
			columns: [table.acceptedUserId],
			foreignColumns: [users.id],
			name: "user_invitations_accepted_user_id_users_id_fk"
		}).onDelete("set null"),
		userInvitationsComarcaIdFkey: foreignKey({
			columns: [table.comarcaId],
			foreignColumns: [comarcas.id],
			name: "user_invitations_comarca_id_fkey"
		}),
		userInvitationsInvitedByIdUsersIdFk: foreignKey({
			columns: [table.invitedById],
			foreignColumns: [users.id],
			name: "user_invitations_invited_by_id_users_id_fk"
		}).onDelete("set null"),
		userInvitationsTokenUnique: unique("user_invitations_token_unique").on(table.token),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const demandas = pgTable("demandas", {
	id: serial().primaryKey().notNull(),
	processoId: integer("processo_id").notNull(),
	assistidoId: integer("assistido_id").notNull(),
	workspaceId: integer("workspace_id"),
	ato: text().notNull(),
	tipoAto: varchar("tipo_ato", { length: 50 }),
	prazo: date(),
	dataEntrada: date("data_entrada"),
	dataIntimacao: date("data_intimacao"),
	dataConclusao: timestamp("data_conclusao", { withTimezone: true, mode: 'string' }),
	status: statusDemanda().default('5_TRIAGEM'),
	prioridade: prioridade().default('NORMAL'),
	providencias: text(),
	defensorId: integer("defensor_id"),
	reuPreso: boolean("reu_preso").default(false),
	googleCalendarEventId: text("google_calendar_event_id"),
	casoId: integer("caso_id"),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	responsavelId: integer("responsavel_id"),
	criadoPorId: integer("criado_por_id"),
	delegadoParaId: integer("delegado_para_id"),
	dataDelegacao: timestamp("data_delegacao", { mode: 'string' }),
	motivoDelegacao: text("motivo_delegacao"),
	statusDelegacao: varchar("status_delegacao", { length: 20 }),
	prazoSugerido: date("prazo_sugerido"),
	substatus: varchar({ length: 50 }),
	tipoPrazoId: integer("tipo_prazo_id"),
	dataExpedicao: date("data_expedicao"),
	ordemManual: integer("ordem_manual"),
	enrichmentData: jsonb("enrichment_data"),
	importBatchId: text("import_batch_id"),
	ordemOriginal: integer("ordem_original"),
	syncedAt: timestamp("synced_at", { mode: 'string' }),
}, (table) => {
	return {
		criadoPorIdx: index("demandas_criado_por_idx").using("btree", table.criadoPorId.asc().nullsLast().op("int4_ops")),
		delegadoParaIdIdx: index("demandas_delegado_para_id_idx").using("btree", table.delegadoParaId.asc().nullsLast().op("int4_ops")),
		importBatchIdIdx: index("demandas_import_batch_id_idx").using("btree", table.importBatchId.asc().nullsLast().op("text_ops")),
		responsavelIdx: index("demandas_responsavel_idx").using("btree", table.responsavelId.asc().nullsLast().op("int4_ops")),
		idxDemandasDefensorStatusDeleted: index("idx_demandas_defensor_status_deleted").using("btree", table.defensorId.asc().nullsLast().op("int4_ops"), table.status.asc().nullsLast().op("timestamptz_ops"), table.deletedAt.asc().nullsLast().op("int4_ops")),
		idxDemandasProcessoDeleted: index("idx_demandas_processo_deleted").using("btree", table.processoId.asc().nullsLast().op("int4_ops"), table.deletedAt.asc().nullsLast().op("int4_ops")),
		demandasAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "demandas_assistido_id_fkey"
		}).onDelete("cascade"),
		demandasCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "demandas_caso_id_fkey"
		}),
		demandasCriadoPorIdFkey: foreignKey({
			columns: [table.criadoPorId],
			foreignColumns: [profissionais.id],
			name: "demandas_criado_por_id_fkey"
		}).onDelete("set null"),
		demandasDelegadoParaIdFkey: foreignKey({
			columns: [table.delegadoParaId],
			foreignColumns: [users.id],
			name: "demandas_delegado_para_id_fkey"
		}),
		demandasProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "demandas_processo_id_fkey"
		}).onDelete("cascade"),
		demandasResponsavelIdFkey: foreignKey({
			columns: [table.responsavelId],
			foreignColumns: [profissionais.id],
			name: "demandas_responsavel_id_fkey"
		}).onDelete("set null"),
		demandasTipoPrazoIdFkey: foreignKey({
			columns: [table.tipoPrazoId],
			foreignColumns: [tipoPrazos.id],
			name: "demandas_tipo_prazo_id_fkey"
		}),
		demandasWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "demandas_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const calculosPrazos = pgTable("calculos_prazos", {
	id: serial().primaryKey().notNull(),
	demandaId: integer("demanda_id"),
	tipoPrazoId: integer("tipo_prazo_id"),
	tipoPrazoCodigo: varchar("tipo_prazo_codigo", { length: 50 }),
	dataExpedicao: date("data_expedicao"),
	dataLeitura: date("data_leitura"),
	dataTermoInicial: date("data_termo_inicial"),
	dataTermoFinal: date("data_termo_final").notNull(),
	prazoBaseDias: integer("prazo_base_dias").notNull(),
	prazoComDobroDias: integer("prazo_com_dobro_dias").notNull(),
	diasUteisSuspensos: integer("dias_uteis_suspensos").default(0),
	areaDireito: varchar("area_direito", { length: 20 }),
	contadoEmDiasUteis: boolean("contado_em_dias_uteis").default(false),
	aplicouDobro: boolean("aplicou_dobro").default(true),
	tempoLeituraAplicado: integer("tempo_leitura_aplicado").default(10),
	observacoes: text(),
	calculoManual: boolean("calculo_manual").default(false),
	workspaceId: integer("workspace_id"),
	calculadoPorId: integer("calculado_por_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		dataTermoFinalIdx: index("calculos_prazos_data_termo_final_idx").using("btree", table.dataTermoFinal.asc().nullsLast().op("date_ops")),
		demandaIdIdx: index("calculos_prazos_demanda_id_idx").using("btree", table.demandaId.asc().nullsLast().op("int4_ops")),
		tipoPrazoIdIdx: index("calculos_prazos_tipo_prazo_id_idx").using("btree", table.tipoPrazoId.asc().nullsLast().op("int4_ops")),
		workspaceIdIdx: index("calculos_prazos_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		calculosPrazosCalculadoPorIdFkey: foreignKey({
			columns: [table.calculadoPorId],
			foreignColumns: [users.id],
			name: "calculos_prazos_calculado_por_id_fkey"
		}),
		calculosPrazosDemandaIdFkey: foreignKey({
			columns: [table.demandaId],
			foreignColumns: [demandas.id],
			name: "calculos_prazos_demanda_id_fkey"
		}).onDelete("cascade"),
		calculosPrazosTipoPrazoIdFkey: foreignKey({
			columns: [table.tipoPrazoId],
			foreignColumns: [tipoPrazos.id],
			name: "calculos_prazos_tipo_prazo_id_fkey"
		}),
		calculosPrazosWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "calculos_prazos_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const kvStore = pgTable("kv_store", {
	key: text().primaryKey().notNull(),
	value: jsonb().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		idxKvStoreKey: index("idx_kv_store_key").using("btree", table.key.asc().nullsLast().op("text_ops")),
		idxKvStoreKeyPrefix: index("idx_kv_store_key_prefix").using("btree", table.key.asc().nullsLast().op("text_pattern_ops")),
	}
});

export const kvStore1C8Abb82 = pgTable("kv_store_1c8abb82", {
	key: text().primaryKey().notNull(),
	value: jsonb().notNull(),
}, (table) => {
	return {
		keyIdx: index("kv_store_1c8abb82_key_idx").using("btree", table.key.asc().nullsLast().op("text_pattern_ops")),
		keyIdx1: index("kv_store_1c8abb82_key_idx1").using("btree", table.key.asc().nullsLast().op("text_pattern_ops")),
		keyIdx2: index("kv_store_1c8abb82_key_idx2").using("btree", table.key.asc().nullsLast().op("text_pattern_ops")),
		keyIdx3: index("kv_store_1c8abb82_key_idx3").using("btree", table.key.asc().nullsLast().op("text_pattern_ops")),
		keyIdx4: index("kv_store_1c8abb82_key_idx4").using("btree", table.key.asc().nullsLast().op("text_pattern_ops")),
		keyIdx5: index("kv_store_1c8abb82_key_idx5").using("btree", table.key.asc().nullsLast().op("text_pattern_ops")),
		keyIdx6: index("kv_store_1c8abb82_key_idx6").using("btree", table.key.asc().nullsLast().op("text_pattern_ops")),
		keyIdx7: index("kv_store_1c8abb82_key_idx7").using("btree", table.key.asc().nullsLast().op("text_pattern_ops")),
	}
});

export const afastamentos = pgTable("afastamentos", {
	id: serial().primaryKey().notNull(),
	defensorId: integer("defensor_id").notNull(),
	substitutoId: integer("substituto_id").notNull(),
	dataInicio: date("data_inicio").notNull(),
	dataFim: date("data_fim"),
	tipo: varchar({ length: 20 }).default('FERIAS').notNull(),
	motivo: text(),
	ativo: boolean().default(true).notNull(),
	acessoDemandas: boolean("acesso_demandas").default(true),
	acessoEquipe: boolean("acesso_equipe").default(false),
	workspaceId: integer("workspace_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		ativoIdx: index("afastamentos_ativo_idx").using("btree", table.ativo.asc().nullsLast().op("bool_ops")),
		dataInicioIdx: index("afastamentos_data_inicio_idx").using("btree", table.dataInicio.asc().nullsLast().op("date_ops")),
		defensorIdIdx: index("afastamentos_defensor_id_idx").using("btree", table.defensorId.asc().nullsLast().op("int4_ops")),
		substitutoIdIdx: index("afastamentos_substituto_id_idx").using("btree", table.substitutoId.asc().nullsLast().op("int4_ops")),
		workspaceIdIdx: index("afastamentos_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		afastamentosDefensorIdFkey: foreignKey({
			columns: [table.defensorId],
			foreignColumns: [users.id],
			name: "afastamentos_defensor_id_fkey"
		}),
		afastamentosSubstitutoIdFkey: foreignKey({
			columns: [table.substitutoId],
			foreignColumns: [users.id],
			name: "afastamentos_substituto_id_fkey"
		}),
		afastamentosWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "afastamentos_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const jurados = pgTable("jurados", {
	id: serial().primaryKey().notNull(),
	nome: text().notNull(),
	profissao: varchar({ length: 100 }),
	escolaridade: varchar({ length: 50 }),
	idade: integer(),
	bairro: varchar({ length: 100 }),
	genero: varchar({ length: 20 }),
	classeSocial: varchar("classe_social", { length: 30 }),
	perfilPsicologico: text("perfil_psicologico"),
	tendenciaVoto: integer("tendencia_voto"),
	status: varchar({ length: 30 }),
	sessaoJuriId: integer("sessao_juri_id"),
	totalSessoes: integer("total_sessoes").default(0),
	votosCondenacao: integer("votos_condenacao").default(0),
	votosAbsolvicao: integer("votos_absolvicao").default(0),
	votosDesclassificacao: integer("votos_desclassificacao").default(0),
	perfilTendencia: varchar("perfil_tendencia", { length: 30 }),
	observacoes: text(),
	historicoNotas: text("historico_notas"),
	ativo: boolean().default(true),
	createdById: integer("created_by_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	reuniaoPeriodica: varchar("reuniao_periodica", { length: 10 }),
	tipoJurado: varchar("tipo_jurado", { length: 20 }),
	empresa: varchar({ length: 150 }),
}, (table) => {
	return {
		reuniaoIdx: index("jurados_reuniao_idx").using("btree", table.reuniaoPeriodica.asc().nullsLast().op("text_ops")),
		tipoIdx: index("jurados_tipo_idx").using("btree", table.tipoJurado.asc().nullsLast().op("text_ops")),
		juradosSessaoJuriIdFkey: foreignKey({
			columns: [table.sessaoJuriId],
			foreignColumns: [sessoesJuri.id],
			name: "jurados_sessao_juri_id_fkey"
		}).onDelete("set null"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const usuarios = pgTable("usuarios", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	senhaHash: text("senha_hash").notNull(),
	nome: text().notNull(),
	cargo: text().default('Defensor'),
	isAdmin: boolean("is_admin").default(false),
	ativo: boolean().default(true),
	sessionId: uuid("session_id"),
	sessionExpira: timestamp("session_expira", { withTimezone: true, mode: 'string' }),
	ultimoAcesso: timestamp("ultimo_acesso", { withTimezone: true, mode: 'string' }),
	criadoEm: timestamp("criado_em", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		usuariosEmailKey: unique("usuarios_email_key").on(table.email),
	}
});

export const driveFiles = pgTable("drive_files", {
	id: serial().primaryKey().notNull(),
	driveFileId: varchar("drive_file_id", { length: 100 }).notNull(),
	driveFolderId: varchar("drive_folder_id", { length: 100 }).notNull(),
	name: varchar({ length: 500 }).notNull(),
	mimeType: varchar("mime_type", { length: 100 }),
	fileSize: integer("file_size"),
	description: text(),
	webViewLink: text("web_view_link"),
	webContentLink: text("web_content_link"),
	thumbnailLink: text("thumbnail_link"),
	iconLink: text("icon_link"),
	syncStatus: varchar("sync_status", { length: 20 }).default('synced'),
	lastModifiedTime: timestamp("last_modified_time", { withTimezone: true, mode: 'string' }),
	lastSyncAt: timestamp("last_sync_at", { withTimezone: true, mode: 'string' }),
	localChecksum: varchar("local_checksum", { length: 64 }),
	driveChecksum: varchar("drive_checksum", { length: 64 }),
	processoId: integer("processo_id"),
	assistidoId: integer("assistido_id"),
	documentoId: integer("documento_id"),
	localFileUrl: text("local_file_url"),
	localFileKey: text("local_file_key"),
	version: integer().default(1),
	isFolder: boolean("is_folder").default(false),
	parentFileId: integer("parent_file_id"),
	createdById: integer("created_by_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	enrichmentStatus: varchar("enrichment_status", { length: 20 }).default('pending'),
	enrichmentError: text("enrichment_error"),
	enrichedAt: timestamp("enriched_at", { mode: 'string' }),
	categoria: varchar({ length: 50 }),
	documentType: varchar("document_type", { length: 100 }),
	enrichmentData: jsonb("enrichment_data"),
}, (table) => {
	return {
		enrichedAtIdx: index("drive_files_enriched_at_idx").using("btree", table.enrichedAt.asc().nullsLast().op("timestamp_ops")),
		enrichmentStatusIdx: index("drive_files_enrichment_status_idx").using("btree", table.enrichmentStatus.asc().nullsLast().op("text_ops")),
		idxDriveFilesProcessoFolder: index("idx_drive_files_processo_folder").using("btree", table.processoId.asc().nullsLast().op("int4_ops"), table.isFolder.asc().nullsLast().op("int4_ops")),
		driveFilesAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "drive_files_assistido_id_fkey"
		}).onDelete("set null"),
		driveFilesDocumentoIdFkey: foreignKey({
			columns: [table.documentoId],
			foreignColumns: [documentos.id],
			name: "drive_files_documento_id_fkey"
		}).onDelete("set null"),
		driveFilesProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "drive_files_processo_id_fkey"
		}).onDelete("set null"),
		driveFilesDriveFileIdUnique: unique("drive_files_drive_file_id_unique").on(table.driveFileId),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const driveSyncFolders = pgTable("drive_sync_folders", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	driveFolderId: varchar("drive_folder_id", { length: 100 }).notNull(),
	driveFolderUrl: text("drive_folder_url"),
	description: text(),
	syncDirection: varchar("sync_direction", { length: 20 }).default('bidirectional'),
	isActive: boolean("is_active").default(true).notNull(),
	lastSyncAt: timestamp("last_sync_at", { withTimezone: true, mode: 'string' }),
	syncToken: text("sync_token"),
	createdById: integer("created_by_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		driveSyncFoldersDriveFolderIdKey: unique("drive_sync_folders_drive_folder_id_key").on(table.driveFolderId),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const driveFileContents = pgTable("drive_file_contents", {
	id: serial().primaryKey().notNull(),
	driveFileId: integer("drive_file_id").notNull(),
	extractionStatus: extractionStatus("extraction_status").default('PENDING').notNull(),
	contentMarkdown: text("content_markdown"),
	contentText: text("content_text"),
	extractedData: jsonb("extracted_data"),
	documentType: varchar("document_type", { length: 100 }),
	documentSubtype: varchar("document_subtype", { length: 100 }),
	extractedAt: timestamp("extracted_at", { mode: 'string' }),
	processingTimeMs: integer("processing_time_ms"),
	pageCount: integer("page_count"),
	tableCount: integer("table_count"),
	imageCount: integer("image_count"),
	wordCount: integer("word_count"),
	ocrApplied: boolean("ocr_applied").default(false),
	errorMessage: text("error_message"),
	errorStack: text("error_stack"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		documentTypeIdx: index("drive_file_contents_document_type_idx").using("btree", table.documentType.asc().nullsLast().op("text_ops")),
		driveFileIdIdx: uniqueIndex("drive_file_contents_drive_file_id_idx").using("btree", table.driveFileId.asc().nullsLast().op("int4_ops")),
		extractionStatusIdx: index("drive_file_contents_extraction_status_idx").using("btree", table.extractionStatus.asc().nullsLast().op("enum_ops")),
		driveFileContentsDriveFileIdFkey: foreignKey({
			columns: [table.driveFileId],
			foreignColumns: [driveFiles.id],
			name: "drive_file_contents_drive_file_id_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const activityLogs = pgTable("activity_logs", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	acao: varchar({ length: 20 }).notNull(),
	entidadeTipo: varchar("entidade_tipo", { length: 30 }).notNull(),
	entidadeId: integer("entidade_id"),
	descricao: text(),
	detalhes: jsonb(),
	ipAddress: varchar("ip_address", { length: 45 }),
	userAgent: text("user_agent"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		acaoIdx: index("activity_logs_acao_idx").using("btree", table.acao.asc().nullsLast().op("text_ops")),
		createdIdx: index("activity_logs_created_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
		entidadeIdx: index("activity_logs_entidade_idx").using("btree", table.entidadeTipo.asc().nullsLast().op("int4_ops"), table.entidadeId.asc().nullsLast().op("int4_ops")),
		userIdx: index("activity_logs_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
		activityLogsUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "activity_logs_user_id_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const assistidosProcessos = pgTable("assistidos_processos", {
	id: serial().primaryKey().notNull(),
	assistidoId: integer("assistido_id").notNull(),
	processoId: integer("processo_id").notNull(),
	papel: papelProcesso().default('REU').notNull(),
	isPrincipal: boolean("is_principal").default(true),
	observacoes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	ativo: boolean().default(true).notNull(),
}, (table) => {
	return {
		assistidoIdIdx: index("assistidos_processos_assistido_id_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")),
		papelIdx: index("assistidos_processos_papel_idx").using("btree", table.papel.asc().nullsLast().op("enum_ops")),
		processoIdIdx: index("assistidos_processos_processo_id_idx").using("btree", table.processoId.asc().nullsLast().op("int4_ops")),
		uniqueIdx: uniqueIndex("assistidos_processos_unique_idx").using("btree", table.assistidoId.asc().nullsLast().op("enum_ops"), table.processoId.asc().nullsLast().op("int4_ops"), table.papel.asc().nullsLast().op("int4_ops")),
		assistidosProcessosAssistidoIdAssistidosIdFk: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "assistidos_processos_assistido_id_assistidos_id_fk"
		}).onDelete("cascade"),
		assistidosProcessosProcessoIdProcessosIdFk: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "assistidos_processos_processo_id_processos_id_fk"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const bancoPecas = pgTable("banco_pecas", {
	id: serial().primaryKey().notNull(),
	titulo: text().notNull(),
	descricao: text(),
	conteudoTexto: text("conteudo_texto"),
	arquivoUrl: text("arquivo_url"),
	arquivoKey: text("arquivo_key"),
	tipoPeca: varchar("tipo_peca", { length: 100 }).notNull(),
	area: area(),
	tags: text(),
	sucesso: boolean(),
	resultadoDescricao: text("resultado_descricao"),
	processoReferencia: text("processo_referencia"),
	isPublic: boolean("is_public").default(true),
	createdById: integer("created_by_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const calculosPena = pgTable("calculos_pena", {
	id: serial().primaryKey().notNull(),
	processoId: integer("processo_id"),
	assistidoId: integer("assistido_id"),
	tipoCalculo: varchar("tipo_calculo", { length: 30 }).notNull(),
	penaTotal: integer("pena_total"),
	dataInicio: date("data_inicio"),
	regime: varchar({ length: 20 }),
	dataResultado: date("data_resultado"),
	observacoes: text(),
	parametros: text(),
	createdById: integer("created_by_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		calculosPenaAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "calculos_pena_assistido_id_fkey"
		}).onDelete("cascade"),
		calculosPenaProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "calculos_pena_processo_id_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const calendarEvents = pgTable("calendar_events", {
	id: serial().primaryKey().notNull(),
	title: varchar({ length: 200 }).notNull(),
	description: text(),
	eventDate: timestamp("event_date", { withTimezone: true, mode: 'string' }).notNull(),
	endDate: timestamp("end_date", { withTimezone: true, mode: 'string' }),
	eventType: varchar("event_type", { length: 100 }).notNull(),
	processoId: integer("processo_id"),
	assistidoId: integer("assistido_id"),
	demandaId: integer("demanda_id"),
	workspaceId: integer("workspace_id"),
	isAllDay: boolean("is_all_day").default(true).notNull(),
	color: varchar({ length: 20 }),
	location: varchar({ length: 200 }),
	notes: text(),
	reminderMinutes: integer("reminder_minutes"),
	priority: varchar({ length: 20 }).default('normal'),
	status: varchar({ length: 20 }).default('scheduled'),
	isRecurring: boolean("is_recurring").default(false),
	recurrenceType: varchar("recurrence_type", { length: 20 }),
	recurrenceInterval: integer("recurrence_interval").default(1),
	recurrenceEndDate: timestamp("recurrence_end_date", { withTimezone: true, mode: 'string' }),
	recurrenceCount: integer("recurrence_count"),
	recurrenceDays: varchar("recurrence_days", { length: 50 }),
	parentEventId: integer("parent_event_id"),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	createdById: integer("created_by_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		calendarEventsAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "calendar_events_assistido_id_fkey"
		}).onDelete("cascade"),
		calendarEventsDemandaIdFkey: foreignKey({
			columns: [table.demandaId],
			foreignColumns: [demandas.id],
			name: "calendar_events_demanda_id_fkey"
		}).onDelete("set null"),
		calendarEventsProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "calendar_events_processo_id_fkey"
		}).onDelete("cascade"),
		calendarEventsWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "calendar_events_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const caseFacts = pgTable("case_facts", {
	id: serial().primaryKey().notNull(),
	casoId: integer("caso_id").notNull(),
	titulo: text().notNull(),
	descricao: text(),
	tipo: varchar({ length: 30 }),
	tags: jsonb(),
	status: varchar({ length: 20 }).default('ativo'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	processoId: integer("processo_id"),
	assistidoId: integer("assistido_id"),
	dataFato: date("data_fato"),
	fonte: varchar({ length: 50 }),
	fonteId: integer("fonte_id"),
	severidade: varchar({ length: 10 }),
	confidence: real(),
}, (table) => {
	return {
		assistidoIdIdx: index("case_facts_assistido_id_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")),
		dataFatoIdx: index("case_facts_data_fato_idx").using("btree", table.dataFato.asc().nullsLast().op("date_ops")),
		processoIdIdx: index("case_facts_processo_id_idx").using("btree", table.processoId.asc().nullsLast().op("int4_ops")),
		caseFactsAssistidoIdAssistidosIdFk: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "case_facts_assistido_id_assistidos_id_fk"
		}).onDelete("set null"),
		caseFactsCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "case_facts_caso_id_fkey"
		}).onDelete("cascade"),
		caseFactsProcessoIdProcessosIdFk: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "case_facts_processo_id_processos_id_fk"
		}).onDelete("set null"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const casePersonas = pgTable("case_personas", {
	id: serial().primaryKey().notNull(),
	casoId: integer("caso_id").notNull(),
	assistidoId: integer("assistido_id"),
	juradoId: integer("jurado_id"),
	nome: text().notNull(),
	tipo: varchar({ length: 30 }).notNull(),
	status: varchar({ length: 30 }),
	perfil: jsonb(),
	contatos: jsonb(),
	observacoes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	processoId: integer("processo_id"),
	fonte: varchar({ length: 50 }),
	fonteId: integer("fonte_id"),
	confidence: real(),
}, (table) => {
	return {
		processoIdIdx: index("case_personas_processo_id_idx").using("btree", table.processoId.asc().nullsLast().op("int4_ops")),
		casePersonasAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "case_personas_assistido_id_fkey"
		}).onDelete("set null"),
		casePersonasCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "case_personas_caso_id_fkey"
		}).onDelete("cascade"),
		casePersonasJuradoIdFkey: foreignKey({
			columns: [table.juradoId],
			foreignColumns: [jurados.id],
			name: "case_personas_jurado_id_fkey"
		}).onDelete("set null"),
		casePersonasProcessoIdProcessosIdFk: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "case_personas_processo_id_processos_id_fk"
		}).onDelete("set null"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const analisesIa = pgTable("analises_ia", {
	id: serial().primaryKey().notNull(),
	processoId: integer("processo_id"),
	assistidoId: integer("assistido_id"),
	casoId: integer("caso_id"),
	pecaId: integer("peca_id"),
	tipoAnalise: tipoAnaliseIa("tipo_analise").notNull(),
	titulo: text().notNull(),
	promptUtilizado: text("prompt_utilizado"),
	conteudo: text().notNull(),
	dadosEstruturados: text("dados_estruturados"),
	scoreConfianca: integer("score_confianca"),
	modeloIa: varchar("modelo_ia", { length: 50 }).default('gemini-pro'),
	tokensUtilizados: integer("tokens_utilizados"),
	feedbackPositivo: boolean("feedback_positivo"),
	feedbackComentario: text("feedback_comentario"),
	isArquivado: boolean("is_arquivado").default(false),
	isFavorito: boolean("is_favorito").default(false),
	criadoPorId: integer("criado_por_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		analisesIaAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "analises_ia_assistido_id_fkey"
		}).onDelete("cascade"),
		analisesIaCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "analises_ia_caso_id_fkey"
		}).onDelete("cascade"),
		analisesIaPecaIdFkey: foreignKey({
			columns: [table.pecaId],
			foreignColumns: [pecasProcessuais.id],
			name: "analises_ia_peca_id_fkey"
		}).onDelete("set null"),
		analisesIaProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "analises_ia_processo_id_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const atendimentos = pgTable("atendimentos", {
	id: serial().primaryKey().notNull(),
	assistidoId: integer("assistido_id").notNull(),
	dataAtendimento: timestamp("data_atendimento", { withTimezone: true, mode: 'string' }).notNull(),
	tipo: varchar({ length: 30 }).notNull(),
	local: text(),
	assunto: text(),
	resumo: text(),
	acompanhantes: text(),
	status: varchar({ length: 20 }).default('agendado'),
	atendidoPorId: integer("atendido_por_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	processoId: integer("processo_id"),
	casoId: integer("caso_id"),
	workspaceId: integer("workspace_id"),
	duracao: integer(),
	audioUrl: text("audio_url"),
	audioDriveFileId: varchar("audio_drive_file_id", { length: 100 }),
	audioMimeType: varchar("audio_mime_type", { length: 50 }),
	audioFileSize: integer("audio_file_size"),
	transcricao: text(),
	transcricaoResumo: text("transcricao_resumo"),
	transcricaoStatus: varchar("transcricao_status", { length: 20 }).default('pending'),
	transcricaoIdioma: varchar("transcricao_idioma", { length: 10 }).default('pt-BR'),
	plaudRecordingId: varchar("plaud_recording_id", { length: 100 }),
	plaudDeviceId: varchar("plaud_device_id", { length: 100 }),
	transcricaoMetadados: jsonb("transcricao_metadados"),
	pontosChave: jsonb("pontos_chave"),
	enrichmentStatus: varchar("enrichment_status", { length: 20 }),
	enrichmentData: jsonb("enrichment_data"),
	enrichedAt: timestamp("enriched_at", { mode: 'string' }),
}, (table) => {
	return {
		casoIdIdx: index("atendimentos_caso_id_idx").using("btree", table.casoId.asc().nullsLast().op("int4_ops")),
		enrichmentStatusIdx: index("atendimentos_enrichment_status_idx").using("btree", table.enrichmentStatus.asc().nullsLast().op("text_ops")),
		plaudRecordingIdIdx: index("atendimentos_plaud_recording_id_idx").using("btree", table.plaudRecordingId.asc().nullsLast().op("text_ops")),
		processoIdIdx: index("atendimentos_processo_id_idx").using("btree", table.processoId.asc().nullsLast().op("int4_ops")),
		transcricaoStatusIdx: index("atendimentos_transcricao_status_idx").using("btree", table.transcricaoStatus.asc().nullsLast().op("text_ops")),
		workspaceIdIdx: index("atendimentos_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		atendimentosAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "atendimentos_assistido_id_fkey"
		}).onDelete("cascade"),
		atendimentosProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "atendimentos_processo_id_fkey"
		}).onDelete("set null"),
		atendimentosWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "atendimentos_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const crossAnalyses = pgTable("cross_analyses", {
	id: serial().primaryKey().notNull(),
	assistidoId: integer("assistido_id").notNull(),
	contradictionMatrix: jsonb("contradiction_matrix").default([]),
	teseConsolidada: jsonb("tese_consolidada").default({}),
	timelineFatos: jsonb("timeline_fatos").default([]),
	mapaAtores: jsonb("mapa_atores").default([]),
	providenciasAgregadas: jsonb("providencias_agregadas").default([]),
	sourceFileIds: jsonb("source_file_ids").default([]),
	analysisCount: integer("analysis_count").default(0).notNull(),
	modelVersion: varchar("model_version", { length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		assistidoIdx: index("cross_analyses_assistido_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")),
		crossAnalysesAssistidoIdAssistidosIdFk: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "cross_analyses_assistido_id_assistidos_id_fk"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const documentosJuri = pgTable("documentos_juri", {
	id: serial().primaryKey().notNull(),
	sessaoJuriId: integer("sessao_juri_id").notNull(),
	tipo: documentoJuriTipo().notNull(),
	fileName: text("file_name"),
	url: text().notNull(),
	dadosExtraidos: jsonb("dados_extraidos"),
	processadoEm: timestamp("processado_em", { mode: 'string' }),
	statusProcessamento: varchar("status_processamento", { length: 20 }).default('pendente'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		sessaoIdx: index("documentos_juri_sessao_idx").using("btree", table.sessaoJuriId.asc().nullsLast().op("int4_ops")),
		tipoIdx: index("documentos_juri_tipo_idx").using("btree", table.tipo.asc().nullsLast().op("enum_ops")),
		documentosJuriSessaoJuriIdSessoesJuriIdFk: foreignKey({
			columns: [table.sessaoJuriId],
			foreignColumns: [sessoesJuri.id],
			name: "documentos_juri_sessao_juri_id_sessoes_juri_id_fk"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const dosimetriaJuri = pgTable("dosimetria_juri", {
	id: serial().primaryKey().notNull(),
	sessaoJuriId: integer("sessao_juri_id").notNull(),
	penaBase: text("pena_base"),
	circunstanciasJudiciais: text("circunstancias_judiciais"),
	agravantes: text(),
	atenuantes: text(),
	causasAumento: text("causas_aumento"),
	causasDiminuicao: text("causas_diminuicao"),
	penaTotalMeses: integer("pena_total_meses"),
	regimeInicial: regimeInicial("regime_inicial"),
	detracaoInicio: date("detracao_inicio"),
	detracaoFim: date("detracao_fim"),
	detracaoDias: integer("detracao_dias"),
	dataFato: date("data_fato"),
	fracaoProgressao: varchar("fracao_progressao", { length: 10 }),
	incisoAplicado: varchar("inciso_aplicado", { length: 30 }),
	vedadoLivramento: boolean("vedado_livramento").default(false),
	resultouMorte: boolean("resultou_morte").default(false),
	reuReincidente: boolean("reu_reincidente").default(false),
	extraidoPorIa: boolean("extraido_por_ia").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		sessaoIdx: index("dosimetria_juri_sessao_idx").using("btree", table.sessaoJuriId.asc().nullsLast().op("int4_ops")),
		dosimetriaJuriSessaoJuriIdSessoesJuriIdFk: foreignKey({
			columns: [table.sessaoJuriId],
			foreignColumns: [sessoesJuri.id],
			name: "dosimetria_juri_sessao_juri_id_sessoes_juri_id_fk"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const speakerLabels = pgTable("speaker_labels", {
	id: serial().primaryKey().notNull(),
	assistidoId: integer("assistido_id").notNull(),
	fileId: integer("file_id"),
	speakerKey: varchar("speaker_key", { length: 50 }).notNull(),
	label: varchar({ length: 200 }).notNull(),
	role: varchar({ length: 50 }),
	confidence: real(),
	isManual: boolean("is_manual").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		assistidoIdx: index("speaker_labels_assistido_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")),
		fileIdx: index("speaker_labels_file_idx").using("btree", table.fileId.asc().nullsLast().op("int4_ops")),
		speakerLabelsAssistidoIdAssistidosIdFk: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "speaker_labels_assistido_id_assistidos_id_fk"
		}).onDelete("cascade"),
		speakerLabelsFileIdDriveFilesIdFk: foreignKey({
			columns: [table.fileId],
			foreignColumns: [driveFiles.id],
			name: "speaker_labels_file_id_drive_files_id_fk"
		}).onDelete("set null"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const sessoesJuri = pgTable("sessoes_juri", {
	id: serial().primaryKey().notNull(),
	processoId: integer("processo_id"),
	workspaceId: integer("workspace_id"),
	dataSessao: timestamp("data_sessao", { withTimezone: true, mode: 'string' }).notNull(),
	horario: varchar({ length: 10 }),
	sala: varchar({ length: 50 }),
	defensorId: integer("defensor_id"),
	defensorNome: text("defensor_nome"),
	assistidoNome: text("assistido_nome"),
	status: varchar({ length: 30 }).default('agendada'),
	resultado: text(),
	penaAplicada: text("pena_aplicada"),
	observacoes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	responsavelId: integer("responsavel_id"),
	registroCompleto: boolean("registro_completo").default(false),
	juizPresidente: text("juiz_presidente"),
	promotor: text(),
	duracaoMinutos: integer("duracao_minutos"),
	localFato: text("local_fato"),
	tipoPenal: tipoPenalJuri("tipo_penal"),
	tesePrincipal: text("tese_principal"),
	reuPrimario: boolean("reu_primario"),
	reuIdade: integer("reu_idade"),
	vitimaGenero: varchar("vitima_genero", { length: 20 }),
	vitimaIdade: integer("vitima_idade"),
	usouAlgemas: boolean("usou_algemas"),
	incidentesProcessuais: text("incidentes_processuais"),
	simulacaoResultado: jsonb("simulacao_resultado"),
}, (table) => {
	return {
		responsavelIdx: index("sessoes_juri_responsavel_idx").using("btree", table.responsavelId.asc().nullsLast().op("int4_ops")),
		sessoesJuriResponsavelIdFkey: foreignKey({
			columns: [table.responsavelId],
			foreignColumns: [profissionais.id],
			name: "sessoes_juri_responsavel_id_fkey"
		}).onDelete("set null"),
		sessoesJuriWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "sessoes_juri_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const convites = pgTable("convites", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	nome: text().notNull(),
	cargo: text().default('Defensor'),
	codigo: text().notNull(),
	usado: boolean().default(false),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	usedAt: timestamp("used_at", { withTimezone: true, mode: 'string' }),
}, (table) => {
	return {
		idxConvitesCodigo: index("idx_convites_codigo").using("btree", table.codigo.asc().nullsLast().op("text_ops")),
		idxConvitesEmail: index("idx_convites_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
		convitesCodigoKey: unique("convites_codigo_key").on(table.codigo),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const depoimentosAnalise = pgTable("depoimentos_analise", {
	id: serial().primaryKey().notNull(),
	casoId: integer("caso_id"),
	personaId: integer("persona_id"),
	testemunhaNome: text("testemunha_nome"),
	versaoDelegacia: text("versao_delegacia"),
	versaoJuizo: text("versao_juizo"),
	contradicoesIdentificadas: text("contradicoes_identificadas"),
	pontosFracos: text("pontos_fracos"),
	pontosFortes: text("pontos_fortes"),
	estrategiaInquiricao: text("estrategia_inquiricao"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		depoimentosAnaliseCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "depoimentos_analise_caso_id_fkey"
		}).onDelete("cascade"),
		depoimentosAnalisePersonaIdFkey: foreignKey({
			columns: [table.personaId],
			foreignColumns: [casePersonas.id],
			name: "depoimentos_analise_persona_id_fkey"
		}).onDelete("set null"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const audienciasHistorico = pgTable("audiencias_historico", {
	id: serial().primaryKey().notNull(),
	audienciaId: integer("audiencia_id").notNull(),
	versao: integer().notNull(),
	anotacoes: text().notNull(),
	editadoPorId: integer("editado_por_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		audienciasHistoricoAudienciaIdFkey: foreignKey({
			columns: [table.audienciaId],
			foreignColumns: [audiencias.id],
			name: "audiencias_historico_audiencia_id_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const calculosSeeu = pgTable("calculos_seeu", {
	id: serial().primaryKey().notNull(),
	processoId: integer("processo_id").notNull(),
	assistidoId: integer("assistido_id"),
	dataBase: date("data_base").notNull(),
	penaTotal: integer("pena_total").notNull(),
	regimeInicial: varchar("regime_inicial", { length: 20 }),
	fracaoProgressao: varchar("fracao_progressao", { length: 20 }),
	fracaoLivramento: varchar("fracao_livramento", { length: 20 }),
	dataProgressao: date("data_progressao"),
	dataLivramento: date("data_livramento"),
	dataTermino: date("data_termino"),
	dataSaida: date("data_saida"),
	diasRemidos: integer("dias_remidos").default(0),
	diasTrabalho: integer("dias_trabalho").default(0),
	diasEstudo: integer("dias_estudo").default(0),
	isHediondo: boolean("is_hediondo").default(false),
	isPrimario: boolean("is_primario").default(true),
	statusProgressao: varchar("status_progressao", { length: 30 }),
	statusLivramento: varchar("status_livramento", { length: 30 }),
	observacoes: text(),
	createdById: integer("created_by_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		calculosSeeuAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "calculos_seeu_assistido_id_fkey"
		}).onDelete("set null"),
		calculosSeeuProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "calculos_seeu_processo_id_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const casoTags = pgTable("caso_tags", {
	id: serial().primaryKey().notNull(),
	nome: varchar({ length: 100 }).notNull(),
	descricao: text(),
	cor: varchar({ length: 20 }).default('slate'),
	usoCount: integer("uso_count").default(0),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		casoTagsNomeKey: unique("caso_tags_nome_key").on(table.nome),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const casosConexos = pgTable("casos_conexos", {
	id: serial().primaryKey().notNull(),
	casoOrigemId: integer("caso_origem_id").notNull(),
	casoDestinoId: integer("caso_destino_id").notNull(),
	tipoConexao: varchar("tipo_conexao", { length: 50 }),
	descricao: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		casosConexosCasoDestinoIdFkey: foreignKey({
			columns: [table.casoDestinoId],
			foreignColumns: [casos.id],
			name: "casos_conexos_caso_destino_id_fkey"
		}).onDelete("cascade"),
		casosConexosCasoOrigemIdFkey: foreignKey({
			columns: [table.casoOrigemId],
			foreignColumns: [casos.id],
			name: "casos_conexos_caso_origem_id_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const compartilhamentos = pgTable("compartilhamentos", {
	id: serial().primaryKey().notNull(),
	entidadeTipo: varchar("entidade_tipo", { length: 30 }).notNull(),
	entidadeId: integer("entidade_id").notNull(),
	compartilhadoPor: integer("compartilhado_por"),
	compartilhadoCom: integer("compartilhado_com"),
	motivo: text(),
	dataInicio: timestamp("data_inicio", { withTimezone: true, mode: 'string' }).defaultNow(),
	dataFim: timestamp("data_fim", { withTimezone: true, mode: 'string' }),
	ativo: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		ativoIdx: index("compartilhamentos_ativo_idx").using("btree", table.ativo.asc().nullsLast().op("bool_ops")),
		comIdx: index("compartilhamentos_com_idx").using("btree", table.compartilhadoCom.asc().nullsLast().op("int4_ops")),
		entidadeIdx: index("compartilhamentos_entidade_idx").using("btree", table.entidadeTipo.asc().nullsLast().op("text_ops"), table.entidadeId.asc().nullsLast().op("text_ops")),
		porIdx: index("compartilhamentos_por_idx").using("btree", table.compartilhadoPor.asc().nullsLast().op("int4_ops")),
		compartilhamentosCompartilhadoComFkey: foreignKey({
			columns: [table.compartilhadoCom],
			foreignColumns: [profissionais.id],
			name: "compartilhamentos_compartilhado_com_fkey"
		}).onDelete("cascade"),
		compartilhamentosCompartilhadoPorFkey: foreignKey({
			columns: [table.compartilhadoPor],
			foreignColumns: [profissionais.id],
			name: "compartilhamentos_compartilhado_por_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const diligenciaTemplates = pgTable("diligencia_templates", {
	id: serial().primaryKey().notNull(),
	nome: varchar({ length: 200 }).notNull(),
	descricao: text(),
	tipo: diligenciaTipo().notNull(),
	aplicavelA: jsonb("aplicavel_a"),
	tituloTemplate: varchar("titulo_template", { length: 300 }).notNull(),
	descricaoTemplate: text("descricao_template"),
	checklistItens: jsonb("checklist_itens"),
	prioridadeSugerida: prioridade("prioridade_sugerida").default('NORMAL'),
	prazoSugeridoDias: integer("prazo_sugerido_dias"),
	ordem: integer().default(0),
	ativo: boolean().default(true),
	workspaceId: integer("workspace_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		ativoIdx: index("diligencia_templates_ativo_idx").using("btree", table.ativo.asc().nullsLast().op("bool_ops")),
		tipoIdx: index("diligencia_templates_tipo_idx").using("btree", table.tipo.asc().nullsLast().op("enum_ops")),
		workspaceIdIdx: index("diligencia_templates_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		diligenciaTemplatesWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "diligencia_templates_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const diligencias = pgTable("diligencias", {
	id: serial().primaryKey().notNull(),
	titulo: varchar({ length: 300 }).notNull(),
	descricao: text(),
	tipo: diligenciaTipo().default('OUTRO').notNull(),
	status: diligenciaStatus().default('A_PESQUISAR').notNull(),
	processoId: integer("processo_id"),
	assistidoId: integer("assistido_id"),
	casoId: integer("caso_id"),
	personaId: integer("persona_id"),
	nomePessoaAlvo: varchar("nome_pessoa_alvo", { length: 200 }),
	tipoRelacao: varchar("tipo_relacao", { length: 50 }),
	cpfAlvo: varchar("cpf_alvo", { length: 14 }),
	enderecoAlvo: text("endereco_alvo"),
	telefoneAlvo: varchar("telefone_alvo", { length: 20 }),
	resultado: text(),
	dataConclusao: timestamp("data_conclusao", { mode: 'string' }),
	prazoEstimado: timestamp("prazo_estimado", { mode: 'string' }),
	prioridade: prioridade().default('NORMAL'),
	linksOsint: jsonb("links_osint"),
	documentos: jsonb(),
	historico: jsonb(),
	tags: jsonb(),
	isSugestaoAutomatica: boolean("is_sugestao_automatica").default(false),
	sugestaoOrigem: varchar("sugestao_origem", { length: 100 }),
	workspaceId: integer("workspace_id"),
	defensorId: integer("defensor_id"),
	criadoPorId: integer("criado_por_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => {
	return {
		assistidoIdIdx: index("diligencias_assistido_id_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")),
		casoIdIdx: index("diligencias_caso_id_idx").using("btree", table.casoId.asc().nullsLast().op("int4_ops")),
		defensorIdIdx: index("diligencias_defensor_id_idx").using("btree", table.defensorId.asc().nullsLast().op("int4_ops")),
		deletedAtIdx: index("diligencias_deleted_at_idx").using("btree", table.deletedAt.asc().nullsLast().op("timestamp_ops")),
		prioridadeIdx: index("diligencias_prioridade_idx").using("btree", table.prioridade.asc().nullsLast().op("enum_ops")),
		processoIdIdx: index("diligencias_processo_id_idx").using("btree", table.processoId.asc().nullsLast().op("int4_ops")),
		statusIdx: index("diligencias_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
		tipoIdx: index("diligencias_tipo_idx").using("btree", table.tipo.asc().nullsLast().op("enum_ops")),
		workspaceIdIdx: index("diligencias_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		diligenciasAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "diligencias_assistido_id_fkey"
		}).onDelete("cascade"),
		diligenciasCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "diligencias_caso_id_fkey"
		}).onDelete("cascade"),
		diligenciasCriadoPorIdFkey: foreignKey({
			columns: [table.criadoPorId],
			foreignColumns: [users.id],
			name: "diligencias_criado_por_id_fkey"
		}),
		diligenciasDefensorIdFkey: foreignKey({
			columns: [table.defensorId],
			foreignColumns: [users.id],
			name: "diligencias_defensor_id_fkey"
		}),
		diligenciasPersonaIdFkey: foreignKey({
			columns: [table.personaId],
			foreignColumns: [casePersonas.id],
			name: "diligencias_persona_id_fkey"
		}).onDelete("set null"),
		diligenciasProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "diligencias_processo_id_fkey"
		}).onDelete("cascade"),
		diligenciasWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "diligencias_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const documentTemplates = pgTable("document_templates", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 200 }).notNull(),
	description: text(),
	driveFileId: varchar("drive_file_id", { length: 100 }).notNull(),
	driveFolderId: varchar("drive_folder_id", { length: 100 }),
	category: varchar({ length: 50 }).notNull(),
	placeholders: jsonb().default([]),
	isActive: boolean("is_active").default(true).notNull(),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		documentTemplatesCreatedByFkey: foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "document_templates_created_by_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const documentoModelos = pgTable("documento_modelos", {
	id: serial().primaryKey().notNull(),
	titulo: varchar({ length: 200 }).notNull(),
	descricao: text(),
	categoria: modeloCategoria().default('OUTRO').notNull(),
	conteudo: text().notNull(),
	tipoPeca: varchar("tipo_peca", { length: 100 }),
	area: area(),
	variaveis: jsonb(),
	formatacao: jsonb(),
	tags: jsonb(),
	isPublic: boolean("is_public").default(true),
	isAtivo: boolean("is_ativo").default(true),
	totalUsos: integer("total_usos").default(0),
	workspaceId: integer("workspace_id"),
	createdById: integer("created_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => {
	return {
		areaIdx: index("documento_modelos_area_idx").using("btree", table.area.asc().nullsLast().op("enum_ops")),
		categoriaIdx: index("documento_modelos_categoria_idx").using("btree", table.categoria.asc().nullsLast().op("enum_ops")),
		deletedAtIdx: index("documento_modelos_deleted_at_idx").using("btree", table.deletedAt.asc().nullsLast().op("timestamp_ops")),
		isAtivoIdx: index("documento_modelos_is_ativo_idx").using("btree", table.isAtivo.asc().nullsLast().op("bool_ops")),
		tipoPecaIdx: index("documento_modelos_tipo_peca_idx").using("btree", table.tipoPeca.asc().nullsLast().op("text_ops")),
		workspaceIdIdx: index("documento_modelos_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		documentoModelosCreatedByIdFkey: foreignKey({
			columns: [table.createdById],
			foreignColumns: [users.id],
			name: "documento_modelos_created_by_id_fkey"
		}),
		documentoModelosWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "documento_modelos_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const documentos = pgTable("documentos", {
	id: serial().primaryKey().notNull(),
	processoId: integer("processo_id"),
	assistidoId: integer("assistido_id"),
	demandaId: integer("demanda_id"),
	casoId: integer("caso_id"),
	workspaceId: integer("workspace_id"),
	titulo: text().notNull(),
	descricao: text(),
	categoria: varchar({ length: 50 }).notNull(),
	tipoPeca: varchar("tipo_peca", { length: 100 }),
	fileUrl: text("file_url").notNull(),
	fileKey: text("file_key"),
	fileName: varchar("file_name", { length: 255 }),
	mimeType: varchar("mime_type", { length: 100 }),
	fileSize: integer("file_size"),
	isTemplate: boolean("is_template").default(false),
	uploadedById: integer("uploaded_by_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	enrichmentStatus: varchar("enrichment_status", { length: 20 }),
	enrichmentData: jsonb("enrichment_data"),
	enrichedAt: timestamp("enriched_at", { mode: 'string' }),
	conteudoCompleto: text("conteudo_completo"),
}, (table) => {
	return {
		enrichmentStatusIdx: index("documentos_enrichment_status_idx").using("btree", table.enrichmentStatus.asc().nullsLast().op("text_ops")),
		documentosAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "documentos_assistido_id_fkey"
		}).onDelete("cascade"),
		documentosCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "documentos_caso_id_fkey"
		}).onDelete("set null"),
		documentosDemandaIdFkey: foreignKey({
			columns: [table.demandaId],
			foreignColumns: [demandas.id],
			name: "documentos_demanda_id_fkey"
		}).onDelete("set null"),
		documentosProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "documentos_processo_id_fkey"
		}).onDelete("cascade"),
		documentosWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "documentos_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const documentosGerados = pgTable("documentos_gerados", {
	id: serial().primaryKey().notNull(),
	modeloId: integer("modelo_id"),
	processoId: integer("processo_id"),
	assistidoId: integer("assistido_id"),
	demandaId: integer("demanda_id"),
	casoId: integer("caso_id"),
	titulo: varchar({ length: 300 }).notNull(),
	conteudoFinal: text("conteudo_final").notNull(),
	valoresVariaveis: jsonb("valores_variaveis"),
	geradoPorIa: boolean("gerado_por_ia").default(false),
	promptIa: text("prompt_ia"),
	googleDocId: text("google_doc_id"),
	googleDocUrl: text("google_doc_url"),
	driveFileId: text("drive_file_id"),
	workspaceId: integer("workspace_id"),
	createdById: integer("created_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	metadata: jsonb(),
}, (table) => {
	return {
		assistidoIdIdx: index("documentos_gerados_assistido_id_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")),
		casoIdIdx: index("documentos_gerados_caso_id_idx").using("btree", table.casoId.asc().nullsLast().op("int4_ops")),
		modeloIdIdx: index("documentos_gerados_modelo_id_idx").using("btree", table.modeloId.asc().nullsLast().op("int4_ops")),
		processoIdIdx: index("documentos_gerados_processo_id_idx").using("btree", table.processoId.asc().nullsLast().op("int4_ops")),
		workspaceIdIdx: index("documentos_gerados_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		documentosGeradosAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "documentos_gerados_assistido_id_fkey"
		}).onDelete("set null"),
		documentosGeradosCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "documentos_gerados_caso_id_fkey"
		}).onDelete("set null"),
		documentosGeradosCreatedByIdFkey: foreignKey({
			columns: [table.createdById],
			foreignColumns: [users.id],
			name: "documentos_gerados_created_by_id_fkey"
		}),
		documentosGeradosDemandaIdFkey: foreignKey({
			columns: [table.demandaId],
			foreignColumns: [demandas.id],
			name: "documentos_gerados_demanda_id_fkey"
		}).onDelete("set null"),
		documentosGeradosModeloIdFkey: foreignKey({
			columns: [table.modeloId],
			foreignColumns: [documentoModelos.id],
			name: "documentos_gerados_modelo_id_fkey"
		}).onDelete("set null"),
		documentosGeradosProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "documentos_gerados_processo_id_fkey"
		}).onDelete("set null"),
		documentosGeradosWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "documentos_gerados_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const driveDocumentSections = pgTable("drive_document_sections", {
	id: serial().primaryKey().notNull(),
	driveFileId: integer("drive_file_id").notNull(),
	tipo: varchar({ length: 50 }).notNull(),
	titulo: text().notNull(),
	paginaInicio: integer("pagina_inicio").notNull(),
	paginaFim: integer("pagina_fim").notNull(),
	resumo: text(),
	textoExtraido: text("texto_extraido"),
	confianca: integer().default(0),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	reviewStatus: varchar("review_status", { length: 20 }).default('pending').notNull(),
	fichaData: jsonb("ficha_data"),
}, (table) => {
	return {
		driveDocSectionsDriveFileIdIdx: index("drive_doc_sections_drive_file_id_idx").using("btree", table.driveFileId.asc().nullsLast().op("int4_ops")),
		driveDocSectionsPaginaInicioIdx: index("drive_doc_sections_pagina_inicio_idx").using("btree", table.paginaInicio.asc().nullsLast().op("int4_ops")),
		driveDocSectionsReviewStatusIdx: index("drive_doc_sections_review_status_idx").using("btree", table.reviewStatus.asc().nullsLast().op("text_ops")),
		driveDocSectionsTipoIdx: index("drive_doc_sections_tipo_idx").using("btree", table.tipo.asc().nullsLast().op("text_ops")),
		driveDocumentSectionsDriveFileIdDriveFilesIdFk: foreignKey({
			columns: [table.driveFileId],
			foreignColumns: [driveFiles.id],
			name: "drive_document_sections_drive_file_id_drive_files_id_fk"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const driveFileAnnotations = pgTable("drive_file_annotations", {
	id: serial().primaryKey().notNull(),
	driveFileId: integer("drive_file_id").notNull(),
	userId: integer("user_id").notNull(),
	tipo: varchar({ length: 20 }).notNull(),
	pagina: integer().notNull(),
	cor: varchar({ length: 20 }).default('yellow').notNull(),
	texto: text(),
	textoSelecionado: text("texto_selecionado"),
	posicao: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		idxAnnotationsFile: index("idx_annotations_file").using("btree", table.driveFileId.asc().nullsLast().op("int4_ops")),
		idxAnnotationsPage: index("idx_annotations_page").using("btree", table.driveFileId.asc().nullsLast().op("int4_ops"), table.pagina.asc().nullsLast().op("int4_ops")),
		driveFileAnnotationsDriveFileIdDriveFilesIdFk: foreignKey({
			columns: [table.driveFileId],
			foreignColumns: [driveFiles.id],
			name: "drive_file_annotations_drive_file_id_drive_files_id_fk"
		}).onDelete("cascade"),
		driveFileAnnotationsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "drive_file_annotations_user_id_users_id_fk"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const driveSyncLogs = pgTable("drive_sync_logs", {
	id: serial().primaryKey().notNull(),
	driveFileId: varchar("drive_file_id", { length: 100 }),
	action: varchar({ length: 50 }).notNull(),
	status: varchar({ length: 20 }).default('success'),
	details: text(),
	errorMessage: text("error_message"),
	userId: integer("user_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const driveWebhooks = pgTable("drive_webhooks", {
	id: serial().primaryKey().notNull(),
	channelId: varchar("channel_id", { length: 100 }).notNull(),
	resourceId: varchar("resource_id", { length: 100 }),
	folderId: varchar("folder_id", { length: 100 }).notNull(),
	expiration: timestamp({ withTimezone: true, mode: 'string' }),
	isActive: boolean("is_active").default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		driveWebhooksChannelIdKey: unique("drive_webhooks_channel_id_key").on(table.channelId),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const embeddings = pgTable("embeddings", {
	id: serial().primaryKey().notNull(),
	entityType: text("entity_type").notNull(),
	entityId: integer("entity_id").notNull(),
	assistidoId: integer("assistido_id"),
	processoId: integer("processo_id"),
	chunkIndex: integer("chunk_index").default(0),
	contentText: text("content_text").notNull(),
	embedding: vector({ dimensions: 768 }).notNull(),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		idxEmbeddingsAssistido: index("idx_embeddings_assistido").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")).where(sql`(assistido_id IS NOT NULL)`),
		idxEmbeddingsEntity: index("idx_embeddings_entity").using("btree", table.entityType.asc().nullsLast().op("int4_ops"), table.entityId.asc().nullsLast().op("int4_ops")),
		idxEmbeddingsHnsw: index("idx_embeddings_hnsw").using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops")).with({m: "16",ef_construction: "64"}),
		idxEmbeddingsProcesso: index("idx_embeddings_processo").using("btree", table.processoId.asc().nullsLast().op("int4_ops")).where(sql`(processo_id IS NOT NULL)`),
		embeddingsAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "embeddings_assistido_id_fkey"
		}).onDelete("set null"),
		embeddingsProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "embeddings_processo_id_fkey"
		}).onDelete("set null"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const extractionPatterns = pgTable("extraction_patterns", {
	id: serial().primaryKey().notNull(),
	patternType: patternType("pattern_type").notNull(),
	originalValue: text("original_value").notNull(),
	correctedValue: text("corrected_value"),
	correctAtribuicao: atribuicao("correct_atribuicao"),
	regexUsed: text("regex_used"),
	confidenceBefore: integer("confidence_before"),
	documentoExemplo: text("documento_exemplo"),
	timesUsed: integer("times_used").default(1).notNull(),
	workspaceId: integer("workspace_id"),
	createdBy: integer("created_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		originalValueIdx: index("extraction_patterns_original_value_idx").using("btree", table.originalValue.asc().nullsLast().op("text_ops")),
		typeIdx: index("extraction_patterns_type_idx").using("btree", table.patternType.asc().nullsLast().op("enum_ops")),
		uniqueIdx: uniqueIndex("extraction_patterns_unique_idx").using("btree", table.patternType.asc().nullsLast().op("text_ops"), table.originalValue.asc().nullsLast().op("enum_ops")),
		workspaceIdIdx: index("extraction_patterns_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		extractionPatternsCreatedByFkey: foreignKey({
			columns: [table.createdBy],
			foreignColumns: [users.id],
			name: "extraction_patterns_created_by_fkey"
		}),
		extractionPatternsWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "extraction_patterns_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const factEvidence = pgTable("fact_evidence", {
	id: serial().primaryKey().notNull(),
	factId: integer("fact_id").notNull(),
	documentoId: integer("documento_id"),
	sourceType: varchar("source_type", { length: 30 }),
	sourceId: text("source_id"),
	trecho: text(),
	contradicao: boolean().default(false),
	confianca: integer(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		factEvidenceDocumentoIdFkey: foreignKey({
			columns: [table.documentoId],
			foreignColumns: [documentos.id],
			name: "fact_evidence_documento_id_fkey"
		}).onDelete("set null"),
		factEvidenceFactIdFkey: foreignKey({
			columns: [table.factId],
			foreignColumns: [caseFacts.id],
			name: "fact_evidence_fact_id_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const feriadosForenses = pgTable("feriados_forenses", {
	id: serial().primaryKey().notNull(),
	data: date().notNull(),
	nome: varchar({ length: 150 }).notNull(),
	tipo: varchar({ length: 30 }).default('FERIADO').notNull(),
	abrangencia: varchar({ length: 30 }).default('NACIONAL'),
	estado: varchar({ length: 2 }),
	comarca: varchar({ length: 100 }),
	tribunal: varchar({ length: 20 }),
	suspendePrazo: boolean("suspende_prazo").default(true),
	apenasExpediente: boolean("apenas_expediente").default(false),
	dataFim: date("data_fim"),
	workspaceId: integer("workspace_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		abrangenciaIdx: index("feriados_forenses_abrangencia_idx").using("btree", table.abrangencia.asc().nullsLast().op("text_ops")),
		dataIdx: index("feriados_forenses_data_idx").using("btree", table.data.asc().nullsLast().op("date_ops")),
		estadoIdx: index("feriados_forenses_estado_idx").using("btree", table.estado.asc().nullsLast().op("text_ops")),
		tipoIdx: index("feriados_forenses_tipo_idx").using("btree", table.tipo.asc().nullsLast().op("text_ops")),
		tribunalIdx: index("feriados_forenses_tribunal_idx").using("btree", table.tribunal.asc().nullsLast().op("text_ops")),
		workspaceIdIdx: index("feriados_forenses_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		feriadosForensesWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "feriados_forenses_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const handoffConfig = pgTable("handoff_config", {
	id: serial().primaryKey().notNull(),
	comarca: text().notNull(),
	defensor2GrauInfo: text("defensor_2grau_info"),
	defensorEpInfo: text("defensor_ep_info"),
	nucleoEpEndereco: text("nucleo_ep_endereco"),
	nucleoEpTelefone: text("nucleo_ep_telefone"),
	nucleoEpHorario: text("nucleo_ep_horario"),
	mensagemPersonalizada: text("mensagem_personalizada"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		comarcaIdx: uniqueIndex("handoff_config_comarca_idx").using("btree", table.comarca.asc().nullsLast().op("text_ops")),
		handoffConfigComarcaKey: unique("handoff_config_comarca_key").on(table.comarca),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const juriScriptItems = pgTable("juri_script_items", {
	id: serial().primaryKey().notNull(),
	casoId: integer("caso_id").notNull(),
	sessaoJuriId: integer("sessao_juri_id"),
	personaId: integer("persona_id"),
	factId: integer("fact_id"),
	pergunta: text(),
	fase: varchar({ length: 40 }),
	ordem: integer(),
	notas: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		juriScriptItemsCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "juri_script_items_caso_id_fkey"
		}).onDelete("cascade"),
		juriScriptItemsFactIdFkey: foreignKey({
			columns: [table.factId],
			foreignColumns: [caseFacts.id],
			name: "juri_script_items_fact_id_fkey"
		}).onDelete("set null"),
		juriScriptItemsPersonaIdFkey: foreignKey({
			columns: [table.personaId],
			foreignColumns: [casePersonas.id],
			name: "juri_script_items_persona_id_fkey"
		}).onDelete("set null"),
		juriScriptItemsSessaoJuriIdFkey: foreignKey({
			columns: [table.sessaoJuriId],
			foreignColumns: [sessoesJuri.id],
			name: "juri_script_items_sessao_juri_id_fkey"
		}).onDelete("set null"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const medidasProtetivas = pgTable("medidas_protetivas", {
	id: serial().primaryKey().notNull(),
	processoId: integer("processo_id").notNull(),
	assistidoId: integer("assistido_id"),
	numeroMedida: varchar("numero_medida", { length: 50 }),
	tipoMedida: varchar("tipo_medida", { length: 100 }).notNull(),
	dataDecisao: date("data_decisao"),
	prazoDias: integer("prazo_dias"),
	dataVencimento: date("data_vencimento"),
	distanciaMetros: integer("distancia_metros"),
	nomeVitima: text("nome_vitima"),
	telefoneVitima: varchar("telefone_vitima", { length: 20 }),
	status: varchar({ length: 30 }).default('ativa'),
	observacoes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		medidasProtetivasAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "medidas_protetivas_assistido_id_fkey"
		}).onDelete("set null"),
		medidasProtetivasProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "medidas_protetivas_processo_id_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const muralNotas = pgTable("mural_notas", {
	id: serial().primaryKey().notNull(),
	autorId: integer("autor_id").notNull(),
	mensagem: text().notNull(),
	assistidoId: integer("assistido_id"),
	processoId: integer("processo_id"),
	fixado: boolean().default(false).notNull(),
	workspaceId: integer("workspace_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		autorIdIdx: index("mural_notas_autor_id_idx").using("btree", table.autorId.asc().nullsLast().op("int4_ops")),
		fixadoIdx: index("mural_notas_fixado_idx").using("btree", table.fixado.asc().nullsLast().op("bool_ops")),
		workspaceIdIdx: index("mural_notas_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		muralNotasAssistidoIdAssistidosIdFk: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "mural_notas_assistido_id_assistidos_id_fk"
		}),
		muralNotasAutorIdUsersIdFk: foreignKey({
			columns: [table.autorId],
			foreignColumns: [users.id],
			name: "mural_notas_autor_id_users_id_fk"
		}),
		muralNotasProcessoIdProcessosIdFk: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "mural_notas_processo_id_processos_id_fk"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const notifications = pgTable("notifications", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	processoId: integer("processo_id"),
	demandaId: integer("demanda_id"),
	type: varchar({ length: 100 }).notNull(),
	title: varchar({ length: 200 }).notNull(),
	message: text().notNull(),
	actionUrl: text("action_url"),
	isRead: boolean("is_read").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		notificationsDemandaIdFkey: foreignKey({
			columns: [table.demandaId],
			foreignColumns: [demandas.id],
			name: "notifications_demanda_id_fkey"
		}).onDelete("set null"),
		notificationsProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "notifications_processo_id_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const oficioAnalises = pgTable("oficio_analises", {
	id: serial().primaryKey().notNull(),
	driveFileId: text("drive_file_id").notNull(),
	driveFileName: text("drive_file_name").notNull(),
	driveFolderId: text("drive_folder_id"),
	tipoOficio: varchar("tipo_oficio", { length: 100 }),
	destinatarioTipo: varchar("destinatario_tipo", { length: 100 }),
	assunto: text(),
	estrutura: jsonb(),
	variaveisIdentificadas: jsonb("variaveis_identificadas"),
	qualidadeScore: integer("qualidade_score"),
	conteudoExtraido: text("conteudo_extraido"),
	modeloGeradoId: integer("modelo_gerado_id"),
	status: oficioAnaliseStatus().default('pendente').notNull(),
	erro: text(),
	workspaceId: integer("workspace_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		driveFileIdIdx: index("oficio_analises_drive_file_id_idx").using("btree", table.driveFileId.asc().nullsLast().op("text_ops")),
		statusIdx: index("oficio_analises_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
		tipoOficioIdx: index("oficio_analises_tipo_oficio_idx").using("btree", table.tipoOficio.asc().nullsLast().op("text_ops")),
		workspaceIdIdx: index("oficio_analises_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		oficioAnalisesModeloGeradoIdFkey: foreignKey({
			columns: [table.modeloGeradoId],
			foreignColumns: [documentoModelos.id],
			name: "oficio_analises_modelo_gerado_id_fkey"
		}).onDelete("set null"),
		oficioAnalisesWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "oficio_analises_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const pareceres = pgTable("pareceres", {
	id: serial().primaryKey().notNull(),
	solicitanteId: integer("solicitante_id").notNull(),
	respondedorId: integer("respondedor_id").notNull(),
	assistidoId: integer("assistido_id"),
	processoId: integer("processo_id"),
	pergunta: text().notNull(),
	resposta: text(),
	status: varchar({ length: 20 }).default('solicitado').notNull(),
	urgencia: varchar({ length: 20 }).default('normal').notNull(),
	dataSolicitacao: timestamp("data_solicitacao", { mode: 'string' }).defaultNow().notNull(),
	dataResposta: timestamp("data_resposta", { mode: 'string' }),
	workspaceId: integer("workspace_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		respondedorIdIdx: index("pareceres_respondedor_id_idx").using("btree", table.respondedorId.asc().nullsLast().op("int4_ops")),
		solicitanteIdIdx: index("pareceres_solicitante_id_idx").using("btree", table.solicitanteId.asc().nullsLast().op("int4_ops")),
		statusIdx: index("pareceres_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
		workspaceIdIdx: index("pareceres_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		pareceresAssistidoIdAssistidosIdFk: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "pareceres_assistido_id_assistidos_id_fk"
		}),
		pareceresProcessoIdProcessosIdFk: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "pareceres_processo_id_processos_id_fk"
		}),
		pareceresRespondedorIdUsersIdFk: foreignKey({
			columns: [table.respondedorId],
			foreignColumns: [users.id],
			name: "pareceres_respondedor_id_users_id_fk"
		}),
		pareceresSolicitanteIdUsersIdFk: foreignKey({
			columns: [table.solicitanteId],
			foreignColumns: [users.id],
			name: "pareceres_solicitante_id_users_id_fk"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const pecasProcessuais = pgTable("pecas_processuais", {
	id: serial().primaryKey().notNull(),
	processoId: integer("processo_id").notNull(),
	assistidoId: integer("assistido_id"),
	casoId: integer("caso_id"),
	titulo: text().notNull(),
	tipoPeca: tipoPecaProcessual("tipo_peca").notNull(),
	numeroPaginas: integer("numero_paginas"),
	dataDocumento: date("data_documento"),
	driveFileId: varchar("drive_file_id", { length: 100 }),
	arquivoUrl: text("arquivo_url"),
	arquivoKey: text("arquivo_key"),
	mimeType: varchar("mime_type", { length: 100 }),
	fileSize: integer("file_size"),
	conteudoTexto: text("conteudo_texto"),
	resumoIa: text("resumo_ia"),
	pontosCriticos: text("pontos_criticos"),
	metadados: text(),
	isDestaque: boolean("is_destaque").default(false),
	ordemExibicao: integer("ordem_exibicao").default(0),
	tags: text(),
	observacoes: text(),
	uploadedById: integer("uploaded_by_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		pecasProcessuaisAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "pecas_processuais_assistido_id_fkey"
		}).onDelete("set null"),
		pecasProcessuaisCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "pecas_processuais_caso_id_fkey"
		}).onDelete("set null"),
		pecasProcessuaisProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "pecas_processuais_processo_id_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const plaudConfig = pgTable("plaud_config", {
	id: serial().primaryKey().notNull(),
	workspaceId: integer("workspace_id"),
	apiKey: text("api_key"),
	apiSecret: text("api_secret"),
	webhookSecret: text("webhook_secret"),
	deviceId: varchar("device_id", { length: 100 }),
	deviceName: varchar("device_name", { length: 100 }),
	deviceModel: varchar("device_model", { length: 50 }),
	defaultLanguage: varchar("default_language", { length: 10 }).default('pt-BR'),
	autoTranscribe: boolean("auto_transcribe").default(true),
	autoSummarize: boolean("auto_summarize").default(true),
	autoUploadToDrive: boolean("auto_upload_to_drive").default(true),
	driveFolderId: varchar("drive_folder_id", { length: 100 }),
	isActive: boolean("is_active").default(false).notNull(),
	lastSyncAt: timestamp("last_sync_at", { mode: 'string' }),
	createdById: integer("created_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		deviceIdIdx: index("plaud_config_device_id_idx").using("btree", table.deviceId.asc().nullsLast().op("text_ops")),
		isActiveIdx: index("plaud_config_is_active_idx").using("btree", table.isActive.asc().nullsLast().op("bool_ops")),
		workspaceIdIdx: index("plaud_config_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		plaudConfigCreatedByIdFkey: foreignKey({
			columns: [table.createdById],
			foreignColumns: [users.id],
			name: "plaud_config_created_by_id_fkey"
		}),
		plaudConfigWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "plaud_config_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const plaudRecordings = pgTable("plaud_recordings", {
	id: serial().primaryKey().notNull(),
	configId: integer("config_id").notNull(),
	plaudRecordingId: varchar("plaud_recording_id", { length: 100 }).notNull(),
	plaudDeviceId: varchar("plaud_device_id", { length: 100 }),
	title: varchar({ length: 255 }),
	duration: integer(),
	recordedAt: timestamp("recorded_at", { mode: 'string' }),
	fileSize: integer("file_size"),
	status: varchar({ length: 20 }).default('received'),
	errorMessage: text("error_message"),
	transcription: text(),
	summary: text(),
	speakers: jsonb(),
	atendimentoId: integer("atendimento_id"),
	assistidoId: integer("assistido_id"),
	driveFileId: varchar("drive_file_id", { length: 100 }),
	driveFileUrl: text("drive_file_url"),
	rawPayload: jsonb("raw_payload"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	processoId: integer("processo_id"),
}, (table) => {
	return {
		assistidoIdIdx: index("plaud_recordings_assistido_id_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")),
		atendimentoIdIdx: index("plaud_recordings_atendimento_id_idx").using("btree", table.atendimentoId.asc().nullsLast().op("int4_ops")),
		configIdIdx: index("plaud_recordings_config_id_idx").using("btree", table.configId.asc().nullsLast().op("int4_ops")),
		plaudRecordingIdIdx: index("plaud_recordings_plaud_recording_id_idx").using("btree", table.plaudRecordingId.asc().nullsLast().op("text_ops")),
		recordedAtIdx: index("plaud_recordings_recorded_at_idx").using("btree", table.recordedAt.asc().nullsLast().op("timestamp_ops")),
		statusIdx: index("plaud_recordings_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
		plaudRecordingsAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "plaud_recordings_assistido_id_fkey"
		}).onDelete("set null"),
		plaudRecordingsAtendimentoIdFkey: foreignKey({
			columns: [table.atendimentoId],
			foreignColumns: [atendimentos.id],
			name: "plaud_recordings_atendimento_id_fkey"
		}).onDelete("set null"),
		plaudRecordingsConfigIdFkey: foreignKey({
			columns: [table.configId],
			foreignColumns: [plaudConfig.id],
			name: "plaud_recordings_config_id_fkey"
		}).onDelete("cascade"),
		plaudRecordingsProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "plaud_recordings_processo_id_fkey"
		}).onDelete("set null"),
		plaudRecordingsPlaudRecordingIdKey: unique("plaud_recordings_plaud_recording_id_key").on(table.plaudRecordingId),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const recursosJuri = pgTable("recursos_juri", {
	id: serial().primaryKey().notNull(),
	sessaoJuriId: integer("sessao_juri_id").notNull(),
	casoId: integer("caso_id"),
	processoId: integer("processo_id").notNull(),
	reuNome: text("reu_nome"),
	status: statusApelacao().default('interposta').notNull(),
	dataInterposicao: date("data_interposicao"),
	dataAdmissao: date("data_admissao"),
	dataJulgamento: date("data_julgamento"),
	turmaTjba: text("turma_tjba"),
	camaraTjba: text("camara_tjba"),
	relator: text(),
	resultadoApelacao: resultadoRecurso("resultado_apelacao"),
	houveResp: boolean("houve_resp").default(false),
	resultadoResp: resultadoRecurso("resultado_resp"),
	houveRe: boolean("houve_re").default(false),
	resultadoRe: resultadoRecurso("resultado_re"),
	observacoes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		processoIdx: index("recursos_juri_processo_idx").using("btree", table.processoId.asc().nullsLast().op("int4_ops")),
		sessaoIdx: index("recursos_juri_sessao_idx").using("btree", table.sessaoJuriId.asc().nullsLast().op("int4_ops")),
		statusIdx: index("recursos_juri_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
		recursosJuriCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "recursos_juri_caso_id_fkey"
		}).onDelete("set null"),
		recursosJuriProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "recursos_juri_processo_id_fkey"
		}).onDelete("cascade"),
		recursosJuriSessaoJuriIdFkey: foreignKey({
			columns: [table.sessaoJuriId],
			foreignColumns: [sessoesJuri.id],
			name: "recursos_juri_sessao_juri_id_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const roteiroPlenario = pgTable("roteiro_plenario", {
	id: serial().primaryKey().notNull(),
	casoId: integer("caso_id"),
	ordem: integer(),
	fase: varchar({ length: 40 }),
	conteudo: jsonb(),
	tempoEstimado: integer("tempo_estimado"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		roteiroPlenarioCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "roteiro_plenario_caso_id_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const tesesDefensivas = pgTable("teses_defensivas", {
	id: serial().primaryKey().notNull(),
	casoId: integer("caso_id"),
	titulo: text().notNull(),
	descricao: text(),
	tipo: varchar({ length: 30 }),
	probabilidadeAceitacao: integer("probabilidade_aceitacao"),
	argumentosChave: jsonb("argumentos_chave"),
	jurisprudenciaRelacionada: jsonb("jurisprudencia_relacionada"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		tesesDefensivasCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "teses_defensivas_caso_id_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const testemunhas = pgTable("testemunhas", {
	id: serial().primaryKey().notNull(),
	processoId: integer("processo_id").notNull(),
	casoId: integer("caso_id"),
	audienciaId: integer("audiencia_id"),
	nome: text().notNull(),
	tipo: tipoTestemunha().notNull(),
	status: statusTestemunha().default('ARROLADA'),
	telefone: varchar({ length: 20 }),
	endereco: text(),
	resumoDepoimento: text("resumo_depoimento"),
	pontosFavoraveis: text("pontos_favoraveis"),
	pontosDesfavoraveis: text("pontos_desfavoraveis"),
	perguntasSugeridas: text("perguntas_sugeridas"),
	ordemInquiricao: integer("ordem_inquiricao"),
	observacoes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		testemunhasAudienciaIdFkey: foreignKey({
			columns: [table.audienciaId],
			foreignColumns: [audiencias.id],
			name: "testemunhas_audiencia_id_fkey"
		}).onDelete("set null"),
		testemunhasCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "testemunhas_caso_id_fkey"
		}).onDelete("set null"),
		testemunhasProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "testemunhas_processo_id_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const tipoPrazos = pgTable("tipo_prazos", {
	id: serial().primaryKey().notNull(),
	codigo: varchar({ length: 50 }).notNull(),
	nome: varchar({ length: 150 }).notNull(),
	descricao: text(),
	prazoLegalDias: integer("prazo_legal_dias").notNull(),
	areaDireito: areaDireito("area_direito").default('CRIMINAL').notNull(),
	contarEmDiasUteis: boolean("contar_em_dias_uteis").default(false),
	aplicarDobroDefensoria: boolean("aplicar_dobro_defensoria").default(true),
	tempoLeituraDias: integer("tempo_leitura_dias").default(10),
	termoInicial: varchar("termo_inicial", { length: 50 }).default('INTIMACAO'),
	categoria: varchar({ length: 50 }),
	fase: varchar({ length: 50 }),
	isActive: boolean("is_active").default(true),
	workspaceId: integer("workspace_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		areaDireitoIdx: index("tipo_prazos_area_direito_idx").using("btree", table.areaDireito.asc().nullsLast().op("enum_ops")),
		categoriaIdx: index("tipo_prazos_categoria_idx").using("btree", table.categoria.asc().nullsLast().op("text_ops")),
		codigoIdx: index("tipo_prazos_codigo_idx").using("btree", table.codigo.asc().nullsLast().op("text_ops")),
		workspaceIdIdx: index("tipo_prazos_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		tipoPrazosWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "tipo_prazos_workspace_id_fkey"
		}),
		tipoPrazosCodigoKey: unique("tipo_prazos_codigo_key").on(table.codigo),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const whatsappConfig = pgTable("whatsapp_config", {
	id: serial().primaryKey().notNull(),
	adminId: integer("admin_id").notNull(),
	accessToken: text("access_token"),
	phoneNumberId: text("phone_number_id"),
	businessAccountId: text("business_account_id"),
	webhookVerifyToken: text("webhook_verify_token"),
	displayPhoneNumber: text("display_phone_number"),
	verifiedName: text("verified_name"),
	qualityRating: varchar("quality_rating", { length: 20 }),
	isActive: boolean("is_active").default(false).notNull(),
	lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true, mode: 'string' }),
	autoNotifyPrazo: boolean("auto_notify_prazo").default(false).notNull(),
	autoNotifyAudiencia: boolean("auto_notify_audiencia").default(false).notNull(),
	autoNotifyJuri: boolean("auto_notify_juri").default(false).notNull(),
	autoNotifyMovimentacao: boolean("auto_notify_movimentacao").default(false).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		whatsappConfigAdminIdKey: unique("whatsapp_config_admin_id_key").on(table.adminId),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const whatsappChatMessages = pgTable("whatsapp_chat_messages", {
	id: serial().primaryKey().notNull(),
	contactId: integer("contact_id").notNull(),
	waMessageId: varchar("wa_message_id", { length: 255 }),
	direction: varchar({ length: 10 }).notNull(),
	type: chatMessageType().default('text').notNull(),
	content: text(),
	mediaUrl: text("media_url"),
	mediaMimeType: varchar("media_mime_type", { length: 100 }),
	mediaFilename: varchar("media_filename", { length: 255 }),
	status: varchar({ length: 20 }).default('sent').notNull(),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	replyToId: varchar("reply_to_id", { length: 200 }),
	imported: boolean().default(false).notNull(),
	importedAt: timestamp("imported_at", { mode: 'string' }),
	isFavorite: boolean("is_favorite").default(false),
}, (table) => {
	return {
		contactCreatedIdx: index("whatsapp_chat_messages_contact_created_idx").using("btree", table.contactId.asc().nullsLast().op("int4_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")),
		contactIdIdx: index("whatsapp_chat_messages_contact_id_idx").using("btree", table.contactId.asc().nullsLast().op("int4_ops")),
		createdAtIdx: index("whatsapp_chat_messages_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
		directionIdx: index("whatsapp_chat_messages_direction_idx").using("btree", table.direction.asc().nullsLast().op("text_ops")),
		isFavoriteIdx: index("whatsapp_chat_messages_is_favorite_idx").using("btree", table.isFavorite.asc().nullsLast().op("bool_ops")).where(sql`(is_favorite = true)`),
		waMessageIdIdx: index("whatsapp_chat_messages_wa_message_id_idx").using("btree", table.waMessageId.asc().nullsLast().op("text_ops")),
		waMessageIdUnique: uniqueIndex("whatsapp_chat_messages_wa_message_id_unique").using("btree", table.waMessageId.asc().nullsLast().op("text_ops")),
		whatsappChatMessagesContactIdFkey: foreignKey({
			columns: [table.contactId],
			foreignColumns: [whatsappContacts.id],
			name: "whatsapp_chat_messages_contact_id_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const evolutionConfig = pgTable("evolution_config", {
	id: serial().primaryKey().notNull(),
	workspaceId: integer("workspace_id"),
	instanceName: varchar("instance_name", { length: 100 }).notNull(),
	apiUrl: text("api_url").notNull(),
	apiKey: text("api_key").notNull(),
	status: varchar({ length: 20 }).default('disconnected').notNull(),
	qrCode: text("qr_code"),
	phoneNumber: varchar("phone_number", { length: 20 }),
	webhookUrl: text("webhook_url"),
	webhookSecret: text("webhook_secret"),
	isActive: boolean("is_active").default(false).notNull(),
	autoReply: boolean("auto_reply").default(false).notNull(),
	autoReplyMessage: text("auto_reply_message"),
	lastSyncAt: timestamp("last_sync_at", { mode: 'string' }),
	createdById: integer("created_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	lastDisconnectReason: text("last_disconnect_reason"),
	lastSyncContactsCount: integer("last_sync_contacts_count").default(0),
}, (table) => {
	return {
		instanceNameIdx: index("evolution_config_instance_name_idx").using("btree", table.instanceName.asc().nullsLast().op("text_ops")),
		statusIdx: index("evolution_config_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
		workspaceIdIdx: index("evolution_config_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		evolutionConfigCreatedByIdFkey: foreignKey({
			columns: [table.createdById],
			foreignColumns: [users.id],
			name: "evolution_config_created_by_id_fkey"
		}),
		evolutionConfigWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "evolution_config_workspace_id_fkey"
		}),
		evolutionConfigInstanceNameKey: unique("evolution_config_instance_name_key").on(table.instanceName),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const profissionais = pgTable("profissionais", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id"),
	nome: text().notNull(),
	nomeCurto: varchar("nome_curto", { length: 50 }),
	email: text(),
	grupo: varchar({ length: 30 }).notNull(),
	vara: varchar({ length: 50 }),
	cor: varchar({ length: 20 }).default('zinc'),
	ativo: boolean().default(true),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	comarcaId: integer("comarca_id").default(1).notNull(),
}, (table) => {
	return {
		ativoIdx: index("profissionais_ativo_idx").using("btree", table.ativo.asc().nullsLast().op("bool_ops")),
		comarcaIdIdx: index("profissionais_comarca_id_idx").using("btree", table.comarcaId.asc().nullsLast().op("int4_ops")),
		grupoIdx: index("profissionais_grupo_idx").using("btree", table.grupo.asc().nullsLast().op("text_ops")),
		userIdIdx: index("profissionais_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
		profissionaisComarcaIdFkey: foreignKey({
			columns: [table.comarcaId],
			foreignColumns: [comarcas.id],
			name: "profissionais_comarca_id_fkey"
		}),
		profissionaisUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "profissionais_user_id_fkey"
		}).onDelete("set null"),
		profissionaisEmailKey: unique("profissionais_email_key").on(table.email),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const whatsappMessages = pgTable("whatsapp_messages", {
	id: serial().primaryKey().notNull(),
	configId: integer("config_id").notNull(),
	toPhone: text("to_phone").notNull(),
	toName: text("to_name"),
	assistidoId: integer("assistido_id"),
	messageType: varchar("message_type", { length: 50 }).notNull(),
	templateName: text("template_name"),
	content: text(),
	messageId: text("message_id"),
	status: varchar({ length: 20 }).default('pending').notNull(),
	errorMessage: text("error_message"),
	context: varchar({ length: 50 }),
	sentById: integer("sent_by_id"),
	sentAt: timestamp("sent_at", { withTimezone: true, mode: 'string' }),
	deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: 'string' }),
	readAt: timestamp("read_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		whatsappMessagesAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "whatsapp_messages_assistido_id_fkey"
		}).onDelete("set null"),
		whatsappMessagesConfigIdFkey: foreignKey({
			columns: [table.configId],
			foreignColumns: [whatsappConfig.id],
			name: "whatsapp_messages_config_id_fkey"
		}).onDelete("cascade"),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const partesVvd = pgTable("partes_vvd", {
	id: serial().primaryKey().notNull(),
	nome: text().notNull(),
	cpf: varchar({ length: 14 }),
	rg: varchar({ length: 20 }),
	dataNascimento: date("data_nascimento"),
	tipoParte: varchar("tipo_parte", { length: 20 }).notNull(),
	telefone: varchar({ length: 20 }),
	telefoneSecundario: varchar("telefone_secundario", { length: 20 }),
	email: varchar({ length: 100 }),
	endereco: text(),
	bairro: varchar({ length: 100 }),
	cidade: varchar({ length: 100 }),
	parentesco: varchar({ length: 50 }),
	observacoes: text(),
	assistidoId: integer("assistido_id"),
	sexo: varchar({ length: 10 }),
	workspaceId: integer("workspace_id"),
	defensorId: integer("defensor_id"),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		assistidoIdIdx: index("partes_vvd_assistido_id_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")),
		cpfIdx: index("partes_vvd_cpf_idx").using("btree", table.cpf.asc().nullsLast().op("text_ops")),
		deletedAtIdx: index("partes_vvd_deleted_at_idx").using("btree", table.deletedAt.asc().nullsLast().op("timestamp_ops")),
		nomeIdx: index("partes_vvd_nome_idx").using("btree", table.nome.asc().nullsLast().op("text_ops")),
		sexoIdx: index("partes_vvd_sexo_idx").using("btree", table.sexo.asc().nullsLast().op("text_ops")),
		tipoParteIdx: index("partes_vvd_tipo_parte_idx").using("btree", table.tipoParte.asc().nullsLast().op("text_ops")),
		workspaceIdIdx: index("partes_vvd_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		partesVvdAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "partes_vvd_assistido_id_fkey"
		}),
		partesVvdDefensorIdFkey: foreignKey({
			columns: [table.defensorId],
			foreignColumns: [users.id],
			name: "partes_vvd_defensor_id_fkey"
		}),
		partesVvdWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "partes_vvd_workspace_id_fkey"
		}),
		partesVvdService: pgPolicy("partes_vvd_service", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
	}
});

export const intimacoesVvd = pgTable("intimacoes_vvd", {
	id: serial().primaryKey().notNull(),
	processoVvdId: integer("processo_vvd_id").notNull(),
	tipoIntimacao: tipoIntimacao("tipo_intimacao").default('CIENCIA').notNull(),
	ato: text().notNull(),
	dataExpedicao: date("data_expedicao"),
	dataIntimacao: date("data_intimacao"),
	prazo: date(),
	prazoDias: integer("prazo_dias"),
	pjeDocumentoId: varchar("pje_documento_id", { length: 20 }),
	pjeTipoDocumento: varchar("pje_tipo_documento", { length: 50 }),
	status: varchar({ length: 30 }).default('pendente'),
	providencias: text(),
	demandaId: integer("demanda_id"),
	audienciaId: integer("audiencia_id"),
	defensorId: integer("defensor_id"),
	workspaceId: integer("workspace_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		audienciaIdIdx: index("intimacoes_vvd_audiencia_id_idx").using("btree", table.audienciaId.asc().nullsLast().op("int4_ops")),
		defensorIdIdx: index("intimacoes_vvd_defensor_id_idx").using("btree", table.defensorId.asc().nullsLast().op("int4_ops")),
		prazoIdx: index("intimacoes_vvd_prazo_idx").using("btree", table.prazo.asc().nullsLast().op("date_ops")),
		processoVvdIdIdx: index("intimacoes_vvd_processo_vvd_id_idx").using("btree", table.processoVvdId.asc().nullsLast().op("int4_ops")),
		statusIdx: index("intimacoes_vvd_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
		tipoIntimacaoIdx: index("intimacoes_vvd_tipo_intimacao_idx").using("btree", table.tipoIntimacao.asc().nullsLast().op("enum_ops")),
		workspaceIdIdx: index("intimacoes_vvd_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		intimacoesVvdAudienciaIdFkey: foreignKey({
			columns: [table.audienciaId],
			foreignColumns: [audiencias.id],
			name: "intimacoes_vvd_audiencia_id_fkey"
		}),
		intimacoesVvdDefensorIdFkey: foreignKey({
			columns: [table.defensorId],
			foreignColumns: [users.id],
			name: "intimacoes_vvd_defensor_id_fkey"
		}),
		intimacoesVvdDemandaIdFkey: foreignKey({
			columns: [table.demandaId],
			foreignColumns: [demandas.id],
			name: "intimacoes_vvd_demanda_id_fkey"
		}),
		intimacoesVvdProcessoVvdIdFkey: foreignKey({
			columns: [table.processoVvdId],
			foreignColumns: [processosVvd.id],
			name: "intimacoes_vvd_processo_vvd_id_fkey"
		}).onDelete("cascade"),
		intimacoesVvdWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "intimacoes_vvd_workspace_id_fkey"
		}),
		intimacoesVvdService: pgPolicy("intimacoes_vvd_service", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
	}
});

export const historicoMpu = pgTable("historico_mpu", {
	id: serial().primaryKey().notNull(),
	processoVvdId: integer("processo_vvd_id").notNull(),
	tipoEvento: varchar("tipo_evento", { length: 30 }).notNull(),
	dataEvento: date("data_evento").notNull(),
	descricao: text(),
	medidasVigentes: text("medidas_vigentes"),
	novaDataVencimento: date("nova_data_vencimento"),
	novaDistancia: integer("nova_distancia"),
	pjeDocumentoId: varchar("pje_documento_id", { length: 20 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		dataEventoIdx: index("historico_mpu_data_evento_idx").using("btree", table.dataEvento.asc().nullsLast().op("date_ops")),
		processoVvdIdIdx: index("historico_mpu_processo_vvd_id_idx").using("btree", table.processoVvdId.asc().nullsLast().op("int4_ops")),
		tipoEventoIdx: index("historico_mpu_tipo_evento_idx").using("btree", table.tipoEvento.asc().nullsLast().op("text_ops")),
		historicoMpuProcessoVvdIdFkey: foreignKey({
			columns: [table.processoVvdId],
			foreignColumns: [processosVvd.id],
			name: "historico_mpu_processo_vvd_id_fkey"
		}).onDelete("cascade"),
		historicoMpuService: pgPolicy("historico_mpu_service", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
	}
});

export const processosVvd = pgTable("processos_vvd", {
	id: serial().primaryKey().notNull(),
	requeridoId: integer("requerido_id").notNull(),
	requerenteId: integer("requerente_id"),
	numeroAutos: text("numero_autos").notNull(),
	tipoProcesso: varchar("tipo_processo", { length: 20 }).default('MPU').notNull(),
	comarca: varchar({ length: 100 }),
	vara: varchar({ length: 100 }).default('Vara de Violência Doméstica'),
	crime: varchar({ length: 200 }),
	assunto: text(),
	dataDistribuicao: date("data_distribuicao"),
	dataUltimaMovimentacao: date("data_ultima_movimentacao"),
	fase: varchar({ length: 50 }).default('tramitando'),
	situacao: varchar({ length: 50 }).default('ativo'),
	mpuAtiva: boolean("mpu_ativa").default(false),
	dataDecisaoMpu: date("data_decisao_mpu"),
	tiposMpu: text("tipos_mpu"),
	dataVencimentoMpu: date("data_vencimento_mpu"),
	distanciaMinima: integer("distancia_minima"),
	defensorId: integer("defensor_id"),
	observacoes: text(),
	pjeDocumentoId: varchar("pje_documento_id", { length: 20 }),
	pjeUltimaAtualizacao: timestamp("pje_ultima_atualizacao", { mode: 'string' }),
	workspaceId: integer("workspace_id"),
	processoId: integer("processo_id"),
	canalEntrada: canalEntradaVvd("canal_entrada"),
	tipoRelato: tipoRelatoVvd("tipo_relato"),
	temAcaoFamilia: boolean("tem_acao_familia").default(false),
	tipoAcaoFamilia: varchar("tipo_acao_familia", { length: 30 }),
	suspeitaMaFe: boolean("suspeita_ma_fe").default(false),
	dataFato: date("data_fato"),
	medidasDeferidas: jsonb("medidas_deferidas"),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	raioRestricaoMetros: integer("raio_restricao_metros"),
	agressorResidenciaEndereco: text("agressor_residencia_endereco"),
	agressorResidenciaLat: numeric("agressor_residencia_lat", { precision: 10, scale:  7 }),
	agressorResidenciaLng: numeric("agressor_residencia_lng", { precision: 10, scale:  7 }),
	agressorTrabalhoEndereco: text("agressor_trabalho_endereco"),
	agressorTrabalhoLat: numeric("agressor_trabalho_lat", { precision: 10, scale:  7 }),
	agressorTrabalhoLng: numeric("agressor_trabalho_lng", { precision: 10, scale:  7 }),
}, (table) => {
	return {
		agressorResidenciaGeoIdx: index("processos_vvd_agressor_residencia_geo_idx").using("btree", table.agressorResidenciaLat.asc().nullsLast().op("numeric_ops"), table.agressorResidenciaLng.asc().nullsLast().op("numeric_ops")),
		canalEntradaIdx: index("processos_vvd_canal_entrada_idx").using("btree", table.canalEntrada.asc().nullsLast().op("enum_ops")),
		dataFatoIdx: index("processos_vvd_data_fato_idx").using("btree", table.dataFato.asc().nullsLast().op("date_ops")),
		dataVencimentoMpuIdx: index("processos_vvd_data_vencimento_mpu_idx").using("btree", table.dataVencimentoMpu.asc().nullsLast().op("date_ops")),
		defensorIdIdx: index("processos_vvd_defensor_id_idx").using("btree", table.defensorId.asc().nullsLast().op("int4_ops")),
		deletedAtIdx: index("processos_vvd_deleted_at_idx").using("btree", table.deletedAt.asc().nullsLast().op("timestamp_ops")),
		mpuAtivaIdx: index("processos_vvd_mpu_ativa_idx").using("btree", table.mpuAtiva.asc().nullsLast().op("bool_ops")),
		numeroAutosIdx: index("processos_vvd_numero_autos_idx").using("btree", table.numeroAutos.asc().nullsLast().op("text_ops")),
		processoIdIdx: index("processos_vvd_processo_id_idx").using("btree", table.processoId.asc().nullsLast().op("int4_ops")),
		requerenteIdIdx: index("processos_vvd_requerente_id_idx").using("btree", table.requerenteId.asc().nullsLast().op("int4_ops")),
		requeridoIdIdx: index("processos_vvd_requerido_id_idx").using("btree", table.requeridoId.asc().nullsLast().op("int4_ops")),
		temAcaoFamiliaIdx: index("processos_vvd_tem_acao_familia_idx").using("btree", table.temAcaoFamilia.asc().nullsLast().op("bool_ops")),
		tipoRelatoIdx: index("processos_vvd_tipo_relato_idx").using("btree", table.tipoRelato.asc().nullsLast().op("enum_ops")),
		workspaceIdIdx: index("processos_vvd_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		processosVvdDefensorIdFkey: foreignKey({
			columns: [table.defensorId],
			foreignColumns: [users.id],
			name: "processos_vvd_defensor_id_fkey"
		}),
		processosVvdProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "processos_vvd_processo_id_fkey"
		}),
		processosVvdRequerenteIdFkey: foreignKey({
			columns: [table.requerenteId],
			foreignColumns: [partesVvd.id],
			name: "processos_vvd_requerente_id_fkey"
		}).onDelete("set null"),
		processosVvdRequeridoIdFkey: foreignKey({
			columns: [table.requeridoId],
			foreignColumns: [partesVvd.id],
			name: "processos_vvd_requerido_id_fkey"
		}).onDelete("cascade"),
		processosVvdWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "processos_vvd_workspace_id_fkey"
		}),
		processosVvdService: pgPolicy("processos_vvd_service", { as: "permissive", for: "all", to: ["public"], using: sql`true`, withCheck: sql`true`  }),
	}
});

export const googleTokens = pgTable("google_tokens", {
	id: serial().primaryKey().notNull(),
	email: text().notNull(),
	refreshToken: text("refresh_token").notNull(),
	accessToken: text("access_token"),
	expiresAt: timestamp("expires_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const radarFontes = pgTable("radar_fontes", {
	id: serial().primaryKey().notNull(),
	nome: varchar({ length: 100 }).notNull(),
	tipo: radarFonteTipo().default('portal').notNull(),
	url: text().notNull(),
	seletorTitulo: text("seletor_titulo"),
	seletorCorpo: text("seletor_corpo"),
	seletorData: text("seletor_data"),
	ativo: boolean().default(true).notNull(),
	ultimaColeta: timestamp("ultima_coleta", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	confiabilidade: radarFonteConfiabilidade().default('regional').notNull(),
}, (table) => {
	return {
		radarFontesAll: pgPolicy("radar_fontes_all", { as: "permissive", for: "all", to: ["authenticated"], using: sql`true` }),
		radarFontesRead: pgPolicy("radar_fontes_read", { as: "permissive", for: "select", to: ["authenticated"] }),
	}
});

export const radarMatches = pgTable("radar_matches", {
	id: serial().primaryKey().notNull(),
	noticiaId: integer("noticia_id").notNull(),
	assistidoId: integer("assistido_id"),
	processoId: integer("processo_id"),
	casoId: integer("caso_id"),
	nomeEncontrado: text("nome_encontrado").notNull(),
	scoreConfianca: integer("score_confianca").default(0).notNull(),
	status: radarMatchStatus().default('possivel').notNull(),
	dadosExtraidos: jsonb("dados_extraidos"),
	confirmedBy: integer("confirmed_by"),
	confirmedAt: timestamp("confirmed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	notes: text(),
}, (table) => {
	return {
		assistidoIdIdx: index("radar_matches_assistido_id_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")),
		casoIdIdx: index("radar_matches_caso_id_idx").using("btree", table.casoId.asc().nullsLast().op("int4_ops")),
		noticiaIdIdx: index("radar_matches_noticia_id_idx").using("btree", table.noticiaId.asc().nullsLast().op("int4_ops")),
		noticiaStatusIdx: index("radar_matches_noticia_status_idx").using("btree", table.noticiaId.asc().nullsLast().op("enum_ops"), table.status.asc().nullsLast().op("enum_ops")),
		processoIdIdx: index("radar_matches_processo_id_idx").using("btree", table.processoId.asc().nullsLast().op("int4_ops")),
		scoreIdx: index("radar_matches_score_idx").using("btree", table.scoreConfianca.asc().nullsLast().op("int4_ops")),
		statusIdx: index("radar_matches_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
		radarMatchesAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "radar_matches_assistido_id_fkey"
		}).onDelete("set null"),
		radarMatchesCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "radar_matches_caso_id_fkey"
		}).onDelete("set null"),
		radarMatchesConfirmedByFkey: foreignKey({
			columns: [table.confirmedBy],
			foreignColumns: [users.id],
			name: "radar_matches_confirmed_by_fkey"
		}).onDelete("set null"),
		radarMatchesNoticiaIdFkey: foreignKey({
			columns: [table.noticiaId],
			foreignColumns: [radarNoticias.id],
			name: "radar_matches_noticia_id_fkey"
		}).onDelete("cascade"),
		radarMatchesProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "radar_matches_processo_id_fkey"
		}).onDelete("set null"),
		radarMatchesInsert: pgPolicy("radar_matches_insert", { as: "permissive", for: "insert", to: ["authenticated"], withCheck: sql`true`  }),
		radarMatchesUpdate: pgPolicy("radar_matches_update", { as: "permissive", for: "update", to: ["authenticated"] }),
		radarMatchesRead: pgPolicy("radar_matches_read", { as: "permissive", for: "select", to: ["authenticated"] }),
	}
});

export const whatsappTemplates = pgTable("whatsapp_templates", {
	id: serial().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	title: varchar({ length: 200 }).notNull(),
	shortcut: varchar({ length: 50 }),
	category: varchar({ length: 50 }).default('geral').notNull(),
	content: text().notNull(),
	variables: text().array(),
	sortOrder: integer("sort_order").default(0).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdById: integer("created_by_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		categoryIdx: index("whatsapp_templates_category_idx").using("btree", table.category.asc().nullsLast().op("text_ops")),
		shortcutIdx: index("whatsapp_templates_shortcut_idx").using("btree", table.shortcut.asc().nullsLast().op("text_ops")),
		whatsappTemplatesCreatedByIdFkey: foreignKey({
			columns: [table.createdById],
			foreignColumns: [users.id],
			name: "whatsapp_templates_created_by_id_fkey"
		}).onDelete("set null"),
	}
});

export const legislacaoDestaques = pgTable("legislacao_destaques", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	leiId: varchar("lei_id", { length: 50 }).notNull(),
	artigoId: varchar("artigo_id", { length: 100 }).notNull(),
	tipo: varchar({ length: 20 }).notNull(),
	conteudo: text(),
	cor: varchar({ length: 20 }).default('yellow'),
	textoSelecionado: text("texto_selecionado"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		legDestUserArtigoIdx: index("leg_dest_user_artigo_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.artigoId.asc().nullsLast().op("int4_ops")),
		legDestUserIdx: index("leg_dest_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
		legDestUserLeiIdx: index("leg_dest_user_lei_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.leiId.asc().nullsLast().op("text_ops")),
		legislacaoDestaquesUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "legislacao_destaques_user_id_fkey"
		}),
	}
});

export const noticiasFontes = pgTable("noticias_fontes", {
	id: serial().primaryKey().notNull(),
	nome: varchar({ length: 100 }).notNull(),
	urlBase: varchar("url_base", { length: 500 }).notNull(),
	urlFeed: varchar("url_feed", { length: 500 }).notNull(),
	tipo: varchar({ length: 20 }).notNull(),
	seletorCss: text("seletor_css"),
	cor: varchar({ length: 20 }).default('#71717a'),
	ativo: boolean().default(true).notNull(),
	ultimoScrapeEm: timestamp("ultimo_scrape_em", { mode: 'string' }),
	ultimoErro: text("ultimo_erro"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const whatsappContacts = pgTable("whatsapp_contacts", {
	id: serial().primaryKey().notNull(),
	configId: integer("config_id").notNull(),
	phone: varchar({ length: 20 }).notNull(),
	name: text(),
	pushName: text("push_name"),
	profilePicUrl: text("profile_pic_url"),
	assistidoId: integer("assistido_id"),
	tags: text().array(),
	notes: text(),
	lastMessageAt: timestamp("last_message_at", { mode: 'string' }),
	unreadCount: integer("unread_count").default(0).notNull(),
	isArchived: boolean("is_archived").default(false).notNull(),
	isFavorite: boolean("is_favorite").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	lastMessageContent: text("last_message_content"),
	lastMessageDirection: varchar("last_message_direction", { length: 10 }),
	lastMessageType: varchar("last_message_type", { length: 20 }),
	contactRelation: varchar("contact_relation", { length: 20 }),
	contactRelationDetail: text("contact_relation_detail"),
	lastMessageStatus: varchar("last_message_status", { length: 20 }),
}, (table) => {
	return {
		assistidoIdIdx: index("whatsapp_contacts_assistido_id_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")),
		configIdIdx: index("whatsapp_contacts_config_id_idx").using("btree", table.configId.asc().nullsLast().op("int4_ops")),
		lastMessageAtIdx: index("whatsapp_contacts_last_message_at_idx").using("btree", table.lastMessageAt.asc().nullsLast().op("timestamp_ops")),
		phoneIdx: index("whatsapp_contacts_phone_idx").using("btree", table.phone.asc().nullsLast().op("text_ops")),
		whatsappContactsAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "whatsapp_contacts_assistido_id_fkey"
		}).onDelete("set null"),
		whatsappContactsConfigIdFkey: foreignKey({
			columns: [table.configId],
			foreignColumns: [evolutionConfig.id],
			name: "whatsapp_contacts_config_id_fkey"
		}).onDelete("cascade"),
		whatsappContactsConfigIdPhoneKey: unique("whatsapp_contacts_config_id_phone_key").on(table.configId, table.phone),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const noticiasTemas = pgTable("noticias_temas", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	nome: varchar({ length: 100 }).notNull(),
	keywords: jsonb().default([]),
	ativo: boolean().default(true).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		notTemasUserIdx: index("not_temas_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
		noticiasTemasUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "noticias_temas_user_id_fkey"
		}),
	}
});

export const noticiasFavoritos = pgTable("noticias_favoritos", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	noticiaId: integer("noticia_id").notNull(),
	nota: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		notFavUserIdx: index("not_fav_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
		noticiasFavoritosNoticiaIdFkey: foreignKey({
			columns: [table.noticiaId],
			foreignColumns: [noticiasJuridicas.id],
			name: "noticias_favoritos_noticia_id_fkey"
		}).onDelete("cascade"),
		noticiasFavoritosUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "noticias_favoritos_user_id_fkey"
		}).onDelete("cascade"),
		notFavUniqueIdx: unique("not_fav_unique_idx").on(table.userId, table.noticiaId),
	}
});

export const assistidos = pgTable("assistidos", {
	id: serial().primaryKey().notNull(),
	nome: text().notNull(),
	cpf: varchar({ length: 14 }),
	rg: varchar({ length: 20 }),
	nomeMae: text("nome_mae"),
	nomePai: text("nome_pai"),
	dataNascimento: date("data_nascimento"),
	naturalidade: varchar({ length: 100 }),
	nacionalidade: varchar({ length: 50 }).default('Brasileira'),
	workspaceId: integer("workspace_id"),
	statusPrisional: statusPrisional("status_prisional").default('SOLTO'),
	localPrisao: text("local_prisao"),
	unidadePrisional: text("unidade_prisional"),
	dataPrisao: date("data_prisao"),
	telefone: varchar({ length: 20 }),
	telefoneContato: varchar("telefone_contato", { length: 20 }),
	nomeContato: text("nome_contato"),
	parentescoContato: varchar("parentesco_contato", { length: 50 }),
	endereco: text(),
	photoUrl: text("photo_url"),
	observacoes: text(),
	defensorId: integer("defensor_id"),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	atribuicaoPrimaria: atribuicao("atribuicao_primaria").default('SUBSTITUICAO'),
	driveFolderId: text("drive_folder_id"),
	sigadId: varchar("sigad_id", { length: 20 }),
	sigadExportadoEm: timestamp("sigad_exportado_em", { mode: 'string' }),
	solarExportadoEm: timestamp("solar_exportado_em", { mode: 'string' }),
	analysisStatus: varchar("analysis_status", { length: 20 }),
	analysisData: jsonb("analysis_data"),
	analyzedAt: timestamp("analyzed_at", { mode: 'string' }),
	analysisVersion: integer("analysis_version").default(0),
	origemCadastro: varchar("origem_cadastro", { length: 20 }).default('manual'),
	duplicataSugerida: jsonb("duplicata_sugerida"),
	comarcaId: integer("comarca_id").default(1).notNull(),
	casoId: integer("caso_id"),
}, (table) => {
	return {
		analysisStatusIdx: index("assistidos_analysis_status_idx").using("btree", table.analysisStatus.asc().nullsLast().op("text_ops")),
		atribuicaoPrimariaIdx: index("assistidos_atribuicao_primaria_idx").using("btree", table.atribuicaoPrimaria.asc().nullsLast().op("enum_ops")),
		comarcaIdIdx: index("assistidos_comarca_id_idx").using("btree", table.comarcaId.asc().nullsLast().op("int4_ops")),
		cpfIdx: index("assistidos_cpf_idx").using("btree", table.cpf.asc().nullsLast().op("text_ops")),
		defensorIdIdx: index("assistidos_defensor_id_idx").using("btree", table.defensorId.asc().nullsLast().op("int4_ops")),
		deletedAtIdx: index("assistidos_deleted_at_idx").using("btree", table.deletedAt.asc().nullsLast().op("timestamptz_ops")),
		duplicataSugeridaIdx: index("assistidos_duplicata_sugerida_idx").using("btree", sql`(duplicata_sugerida IS NOT NULL)`).where(sql`(duplicata_sugerida IS NOT NULL)`),
		origemCadastroIdx: index("assistidos_origem_cadastro_idx").using("btree", table.origemCadastro.asc().nullsLast().op("text_ops")),
		statusPrisionalIdx: index("assistidos_status_prisional_idx").using("btree", table.statusPrisional.asc().nullsLast().op("enum_ops")),
		workspaceIdIdx: index("assistidos_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		idxAssistidosCpfNormalized: index("idx_assistidos_cpf_normalized").using("btree", sql`replace(replace(replace((cpf)::text`),
		idxAssistidosNomeMaeTrgm: index("idx_assistidos_nome_mae_trgm").using("gin", table.nomeMae.asc().nullsLast().op("gin_trgm_ops")),
		idxAssistidosNomeTrgm: index("idx_assistidos_nome_trgm").using("gin", table.nome.asc().nullsLast().op("gin_trgm_ops")),
		assistidosComarcaIdFkey: foreignKey({
			columns: [table.comarcaId],
			foreignColumns: [comarcas.id],
			name: "assistidos_comarca_id_fkey"
		}),
		assistidosWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "assistidos_workspace_id_fkey"
		}),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const noticiasPastas = pgTable("noticias_pastas", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	nome: varchar({ length: 100 }).notNull(),
	cor: varchar({ length: 20 }).default('#6366f1'),
	icone: varchar({ length: 50 }).default('Folder'),
	tipo: varchar({ length: 10 }).default('livre').notNull(),
	area: varchar({ length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		notPastaUserIdx: index("not_pasta_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
		noticiasPastasUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "noticias_pastas_user_id_fkey"
		}).onDelete("cascade"),
	}
});

export const leisVersoes = pgTable("leis_versoes", {
	id: serial().primaryKey().notNull(),
	leiId: varchar("lei_id", { length: 50 }).notNull(),
	artigoId: varchar("artigo_id", { length: 100 }).notNull(),
	textoAnterior: text("texto_anterior"),
	textoNovo: text("texto_novo").notNull(),
	leiAlteradora: varchar("lei_alteradora", { length: 200 }),
	dataVigencia: varchar("data_vigencia", { length: 30 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		leiArtigoIdx: index("leis_versoes_lei_artigo_idx").using("btree", table.leiId.asc().nullsLast().op("text_ops"), table.artigoId.asc().nullsLast().op("text_ops")),
		leiIdx: index("leis_versoes_lei_idx").using("btree", table.leiId.asc().nullsLast().op("text_ops")),
	}
});

export const referenciasBiblioteca = pgTable("referencias_biblioteca", {
	id: serial().primaryKey().notNull(),
	tipo: varchar({ length: 20 }).notNull(),
	referenciaId: varchar("referencia_id", { length: 100 }).notNull(),
	casoId: integer("caso_id"),
	observacao: text(),
	citacaoFormatada: text("citacao_formatada"),
	createdById: integer("created_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	processoId: integer("processo_id"),
}, (table) => {
	return {
		refBibCasoIdx: index("ref_bib_caso_idx").using("btree", table.casoId.asc().nullsLast().op("int4_ops")),
		refBibProcessoIdx: index("ref_bib_processo_idx").using("btree", table.processoId.asc().nullsLast().op("int4_ops")),
		refBibRefIdx: index("ref_bib_ref_idx").using("btree", table.tipo.asc().nullsLast().op("text_ops"), table.referenciaId.asc().nullsLast().op("text_ops")),
		referenciasBibliotecaCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "referencias_biblioteca_caso_id_fkey"
		}).onDelete("cascade"),
		referenciasBibliotecaCreatedByIdFkey: foreignKey({
			columns: [table.createdById],
			foreignColumns: [users.id],
			name: "referencias_biblioteca_created_by_id_fkey"
		}),
		referenciasBibliotecaProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "referencias_biblioteca_processo_id_fkey"
		}).onDelete("cascade"),
	}
});

export const noticiasProcessos = pgTable("noticias_processos", {
	id: serial().primaryKey().notNull(),
	noticiaId: integer("noticia_id").notNull(),
	processoId: integer("processo_id").notNull(),
	userId: integer("user_id").notNull(),
	observacao: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	autoVinculada: boolean("auto_vinculada").default(false).notNull(),
}, (table) => {
	return {
		notProcNoticiaIdx: index("not_proc_noticia_idx").using("btree", table.noticiaId.asc().nullsLast().op("int4_ops")),
		notProcProcessoIdx: index("not_proc_processo_idx").using("btree", table.processoId.asc().nullsLast().op("int4_ops")),
		noticiasProcessosNoticiaIdFkey: foreignKey({
			columns: [table.noticiaId],
			foreignColumns: [noticiasJuridicas.id],
			name: "noticias_processos_noticia_id_fkey"
		}).onDelete("cascade"),
		noticiasProcessosUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "noticias_processos_user_id_fkey"
		}).onDelete("cascade"),
		notProcUniqueIdx: unique("not_proc_unique_idx").on(table.noticiaId, table.processoId),
	}
});

export const noticiasPastaItens = pgTable("noticias_pasta_itens", {
	id: serial().primaryKey().notNull(),
	pastaId: integer("pasta_id").notNull(),
	noticiaId: integer("noticia_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		notPastaItemPastaIdx: index("not_pasta_item_pasta_idx").using("btree", table.pastaId.asc().nullsLast().op("int4_ops")),
		noticiasPastaItensNoticiaIdFkey: foreignKey({
			columns: [table.noticiaId],
			foreignColumns: [noticiasJuridicas.id],
			name: "noticias_pasta_itens_noticia_id_fkey"
		}).onDelete("cascade"),
		noticiasPastaItensPastaIdFkey: foreignKey({
			columns: [table.pastaId],
			foreignColumns: [noticiasPastas.id],
			name: "noticias_pasta_itens_pasta_id_fkey"
		}).onDelete("cascade"),
		noticiasPastaItensPastaIdNoticiaIdKey: unique("noticias_pasta_itens_pasta_id_noticia_id_key").on(table.pastaId, table.noticiaId),
	}
});

export const noticiasJuridicas = pgTable("noticias_juridicas", {
	id: serial().primaryKey().notNull(),
	titulo: text().notNull(),
	conteudo: text(),
	resumo: text(),
	fonte: varchar({ length: 50 }).notNull(),
	fonteId: integer("fonte_id"),
	urlOriginal: varchar("url_original", { length: 1000 }).notNull(),
	autor: varchar({ length: 200 }),
	imagemUrl: varchar("imagem_url", { length: 1000 }),
	categoria: varchar({ length: 30 }).notNull(),
	tags: jsonb().default([]),
	status: varchar({ length: 20 }).default('pendente').notNull(),
	aprovadoPor: integer("aprovado_por"),
	aprovadoEm: timestamp("aprovado_em", { mode: 'string' }),
	publicadoEm: timestamp("publicado_em", { mode: 'string' }),
	scrapeadoEm: timestamp("scrapeado_em", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	analiseIa: jsonb("analise_ia"),
	// TODO: failed to parse database type 'tsvector'
	searchVector: unknown("search_vector").generatedAlwaysAs(sql`to_tsvector('portuguese'::regconfig, ((COALESCE(titulo, ''::text) || ' '::text) || COALESCE(conteudo, ''::text)))`),
}, (table) => {
	return {
		notJurCategoriaIdx: index("not_jur_categoria_idx").using("btree", table.categoria.asc().nullsLast().op("text_ops")),
		notJurFonteIdx: index("not_jur_fonte_idx").using("btree", table.fonte.asc().nullsLast().op("text_ops")),
		notJurPublicadoIdx: index("not_jur_publicado_idx").using("btree", table.publicadoEm.asc().nullsLast().op("timestamp_ops")),
		notJurStatusIdx: index("not_jur_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
		notJurUrlIdx: index("not_jur_url_idx").using("btree", table.urlOriginal.asc().nullsLast().op("text_ops")),
		noticiasSearchIdx: index("noticias_search_idx").using("gin", table.searchVector.asc().nullsLast().op("tsvector_ops")),
		noticiasJuridicasAprovadoPorFkey: foreignKey({
			columns: [table.aprovadoPor],
			foreignColumns: [users.id],
			name: "noticias_juridicas_aprovado_por_fkey"
		}),
		noticiasJuridicasFonteIdFkey: foreignKey({
			columns: [table.fonteId],
			foreignColumns: [noticiasFontes.id],
			name: "noticias_juridicas_fonte_id_fkey"
		}),
		noticiasJuridicasUrlOriginalKey: unique("noticias_juridicas_url_original_key").on(table.urlOriginal),
	}
});

export const radarNoticias = pgTable("radar_noticias", {
	id: serial().primaryKey().notNull(),
	url: text().notNull(),
	fonte: varchar({ length: 100 }).notNull(),
	titulo: text().notNull(),
	corpo: text(),
	dataPublicacao: timestamp("data_publicacao", { withTimezone: true, mode: 'string' }),
	dataFato: timestamp("data_fato", { withTimezone: true, mode: 'string' }),
	imagemUrl: text("imagem_url"),
	tipoCrime: tipoCrimeRadar("tipo_crime"),
	bairro: text(),
	logradouro: text(),
	latitude: numeric({ precision: 10, scale:  7 }),
	longitude: numeric({ precision: 10, scale:  7 }),
	delegacia: text(),
	circunstancia: circunstanciaRadar(),
	artigosPenais: jsonb("artigos_penais"),
	armaMeio: text("arma_meio"),
	resumoIa: text("resumo_ia"),
	envolvidos: jsonb(),
	enrichmentStatus: radarEnrichmentStatus("enrichment_status").default('pending').notNull(),
	analysisSonnet: jsonb("analysis_sonnet"),
	rawHtml: text("raw_html"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	errorCount: integer("error_count").default(0).notNull(),
	lastError: text("last_error"),
	contentHash: text("content_hash"),
	relevanciaScore: integer("relevancia_score").default(0).notNull(),
	comarcaId: integer("comarca_id").default(1).notNull(),
	municipio: text().default('camacari').notNull(),
}, (table) => {
	return {
		idxRadarNoticiasContentHash: index("idx_radar_noticias_content_hash").using("btree", table.contentHash.asc().nullsLast().op("text_ops")).where(sql`(content_hash IS NOT NULL)`),
		idxRadarNoticiasRelevancia: index("idx_radar_noticias_relevancia").using("btree", table.relevanciaScore.asc().nullsLast().op("int4_ops")),
		bairroIdx: index("radar_noticias_bairro_idx").using("btree", table.bairro.asc().nullsLast().op("text_ops")),
		bairroTrgmIdx: index("radar_noticias_bairro_trgm_idx").using("gin", table.bairro.asc().nullsLast().op("gin_trgm_ops")),
		comarcaIdIdx: index("radar_noticias_comarca_id_idx").using("btree", table.comarcaId.asc().nullsLast().op("int4_ops")),
		createdAtIdx: index("radar_noticias_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamptz_ops")),
		dataFatoIdx: index("radar_noticias_data_fato_idx").using("btree", table.dataFato.asc().nullsLast().op("timestamptz_ops")),
		enrichmentStatusIdx: index("radar_noticias_enrichment_status_idx").using("btree", table.enrichmentStatus.asc().nullsLast().op("enum_ops")),
		envolvidosGinIdx: index("radar_noticias_envolvidos_gin_idx").using("gin", table.envolvidos.asc().nullsLast().op("jsonb_ops")),
		errorCountIdx: index("radar_noticias_error_count_idx").using("btree", table.errorCount.asc().nullsLast().op("int4_ops")).where(sql`(error_count > 0)`),
		fonteIdx: index("radar_noticias_fonte_idx").using("btree", table.fonte.asc().nullsLast().op("text_ops")),
		municipioIdx: index("radar_noticias_municipio_idx").using("btree", table.municipio.asc().nullsLast().op("text_ops")),
		municipioStatusIdx: index("radar_noticias_municipio_status_idx").using("btree", table.municipio.asc().nullsLast().op("timestamptz_ops"), table.enrichmentStatus.asc().nullsLast().op("enum_ops"), table.dataPublicacao.desc().nullsFirst().op("timestamptz_ops")),
		statusDatapubIdx: index("radar_noticias_status_datapub_idx").using("btree", table.enrichmentStatus.asc().nullsLast().op("enum_ops"), table.dataPublicacao.desc().nullsLast().op("timestamptz_ops")),
		statusRelevanciaDatapubIdx: index("radar_noticias_status_relevancia_datapub_idx").using("btree", table.enrichmentStatus.asc().nullsLast().op("timestamptz_ops"), table.relevanciaScore.desc().nullsFirst().op("enum_ops"), table.dataPublicacao.desc().nullsLast().op("enum_ops")),
		tipoCrimeIdx: index("radar_noticias_tipo_crime_idx").using("btree", table.tipoCrime.asc().nullsLast().op("enum_ops")),
		radarNoticiasComarcaIdFkey: foreignKey({
			columns: [table.comarcaId],
			foreignColumns: [comarcas.id],
			name: "radar_noticias_comarca_id_fkey"
		}),
		radarNoticiasUrlKey: unique("radar_noticias_url_key").on(table.url),
		radarNoticiasUpdate: pgPolicy("radar_noticias_update", { as: "permissive", for: "update", to: ["authenticated"], using: sql`true` }),
		radarNoticiasRead: pgPolicy("radar_noticias_read", { as: "permissive", for: "select", to: ["authenticated"] }),
		radarNoticiasInsert: pgPolicy("radar_noticias_insert", { as: "permissive", for: "insert", to: ["authenticated"] }),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"] }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const whatsappConnectionLog = pgTable("whatsapp_connection_log", {
	id: serial().primaryKey().notNull(),
	configId: integer("config_id"),
	event: text().notNull(),
	details: jsonb(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		idxWhatsappConnectionLogConfigDate: index("idx_whatsapp_connection_log_config_date").using("btree", table.configId.asc().nullsLast().op("int4_ops"), table.createdAt.desc().nullsFirst().op("int4_ops")),
		whatsappConnectionLogConfigIdFkey: foreignKey({
			columns: [table.configId],
			foreignColumns: [evolutionConfig.id],
			name: "whatsapp_connection_log_config_id_fkey"
		}).onDelete("cascade"),
	}
});

export const comarcas = pgTable("comarcas", {
	id: serial().primaryKey().notNull(),
	nome: varchar({ length: 100 }).notNull(),
	regional: varchar({ length: 50 }),
	regiaoMetro: varchar("regiao_metro", { length: 50 }),
	uf: varchar({ length: 2 }).default('BA').notNull(),
	ativo: boolean().default(true).notNull(),
	features: jsonb().default({"drive":false,"whatsapp":false,"enrichment":false,"calendar_sync":false}).notNull(),
	config: jsonb().default({}).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		ativoIdx: index("comarcas_ativo_idx").using("btree", table.ativo.asc().nullsLast().op("bool_ops")),
		regiaoMetroIdx: index("comarcas_regiao_metro_idx").using("btree", table.regiaoMetro.asc().nullsLast().op("text_ops")),
		comarcasNomeKey: unique("comarcas_nome_key").on(table.nome),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});

export const agentAnalyses = pgTable("agent_analyses", {
	id: serial().primaryKey().notNull(),
	entityType: varchar("entity_type", { length: 50 }).notNull(),
	entityId: integer("entity_id").notNull(),
	analysisType: analysisType("analysis_type").notNull(),
	atribuicao: atribuicao(),
	inputDocumentIds: jsonb("input_document_ids"),
	inputSummary: text("input_summary"),
	output: jsonb().notNull(),
	confidence: real(),
	completeness: real(),
	modelUsed: varchar("model_used", { length: 100 }),
	tokensInput: integer("tokens_input"),
	tokensOutput: integer("tokens_output"),
	processingTimeMs: integer("processing_time_ms"),
	requestedById: integer("requested_by_id"),
	isApproved: boolean("is_approved"),
	approvedAt: timestamp("approved_at", { mode: 'string' }),
	approvedById: integer("approved_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		analysisTypeIdx: index("agent_analyses_analysis_type_idx").using("btree", table.analysisType.asc().nullsLast().op("enum_ops")),
		atribuicaoIdx: index("agent_analyses_atribuicao_idx").using("btree", table.atribuicao.asc().nullsLast().op("enum_ops")),
		createdAtIdx: index("agent_analyses_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
		entityIdx: index("agent_analyses_entity_idx").using("btree", table.entityType.asc().nullsLast().op("text_ops"), table.entityId.asc().nullsLast().op("int4_ops")),
		isApprovedIdx: index("agent_analyses_is_approved_idx").using("btree", table.isApproved.asc().nullsLast().op("bool_ops")),
		agentAnalysesApprovedByIdFkey: foreignKey({
			columns: [table.approvedById],
			foreignColumns: [users.id],
			name: "agent_analyses_approved_by_id_fkey"
		}),
		agentAnalysesRequestedByIdFkey: foreignKey({
			columns: [table.requestedById],
			foreignColumns: [users.id],
			name: "agent_analyses_requested_by_id_fkey"
		}),
	}
});

export const defensorParceiros = pgTable("defensor_parceiros", {
	id: serial().primaryKey().notNull(),
	defensorId: integer("defensor_id").notNull(),
	parceiroId: integer("parceiro_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		defensorIdx: index("defensor_parceiros_defensor_idx").using("btree", table.defensorId.asc().nullsLast().op("int4_ops")),
		parceiroIdx: index("defensor_parceiros_parceiro_idx").using("btree", table.parceiroId.asc().nullsLast().op("int4_ops")),
		defensorParceirosDefensorIdFkey: foreignKey({
			columns: [table.defensorId],
			foreignColumns: [users.id],
			name: "defensor_parceiros_defensor_id_fkey"
		}).onDelete("cascade"),
		defensorParceirosParceiroIdFkey: foreignKey({
			columns: [table.parceiroId],
			foreignColumns: [users.id],
			name: "defensor_parceiros_parceiro_id_fkey"
		}).onDelete("cascade"),
		defensorParceirosUnique: unique("defensor_parceiros_unique").on(table.defensorId, table.parceiroId),
		defensorParceirosNoSelf: check("defensor_parceiros_no_self", sql`defensor_id <> parceiro_id`),
	}
});

export const quesitos = pgTable("quesitos", {
	id: serial().primaryKey().notNull(),
	casoId: integer("caso_id"),
	sessaoJuriId: integer("sessao_juri_id"),
	numero: integer().notNull(),
	texto: text().notNull(),
	tipo: varchar({ length: 30 }),
	origem: varchar({ length: 20 }),
	teseId: integer("tese_id"),
	argumentacaoSim: text("argumentacao_sim"),
	argumentacaoNao: text("argumentacao_nao"),
	dependeDe: integer("depende_de"),
	condicaoPai: varchar("condicao_pai", { length: 5 }),
	geradoPorIa: boolean("gerado_por_ia").default(false),
	resultado: quesitosResultado(),
	ordemVotacao: integer("ordem_votacao"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		casoIdIdx: index("quesitos_caso_id_idx").using("btree", table.casoId.asc().nullsLast().op("int4_ops")),
		sessaoJuriIdIdx: index("quesitos_sessao_juri_id_idx").using("btree", table.sessaoJuriId.asc().nullsLast().op("int4_ops")),
		quesitosCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "quesitos_caso_id_fkey"
		}).onDelete("cascade"),
		quesitosTeseIdFkey: foreignKey({
			columns: [table.teseId],
			foreignColumns: [tesesDefensivas.id],
			name: "quesitos_tese_id_fkey"
		}).onDelete("set null"),
	}
});

export const personagensJuri = pgTable("personagens_juri", {
	id: serial().primaryKey().notNull(),
	nome: text().notNull(),
	tipo: varchar({ length: 30 }).notNull(),
	vara: varchar({ length: 100 }),
	comarca: varchar({ length: 100 }),
	estiloAtuacao: text("estilo_atuacao"),
	pontosFortes: text("pontos_fortes"),
	pontosFracos: text("pontos_fracos"),
	tendenciasObservadas: text("tendencias_observadas"),
	estrategiasRecomendadas: text("estrategias_recomendadas"),
	historico: text(),
	totalSessoes: integer("total_sessoes").default(0),
	totalCondenacoes: integer("total_condenacoes").default(0),
	totalAbsolvicoes: integer("total_absolvicoes").default(0),
	totalDesclassificacoes: integer("total_desclassificacoes").default(0),
	tempoMedioSustentacao: integer("tempo_medio_sustentacao"),
	argumentosPreferidos: jsonb("argumentos_preferidos"),
	tesesVulneraveis: jsonb("teses_vulneraveis"),
	notasEstrategicas: text("notas_estrategicas"),
	ultimaSessaoData: timestamp("ultima_sessao_data", { mode: 'string' }),
	ativo: boolean().default(true),
	createdById: integer("created_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		comarcaIdx: index("personagens_juri_comarca_idx").using("btree", table.comarca.asc().nullsLast().op("text_ops")),
		nomeIdx: index("personagens_juri_nome_idx").using("btree", table.nome.asc().nullsLast().op("text_ops")),
		tipoIdx: index("personagens_juri_tipo_idx").using("btree", table.tipo.asc().nullsLast().op("text_ops")),
		personagensJuriCreatedByIdFkey: foreignKey({
			columns: [table.createdById],
			foreignColumns: [users.id],
			name: "personagens_juri_created_by_id_fkey"
		}),
	}
});

export const avaliacoesJuri = pgTable("avaliacoes_juri", {
	id: serial().primaryKey().notNull(),
	sessaoJuriId: integer("sessao_juri_id").notNull(),
	processoId: integer("processo_id"),
	observador: text().notNull(),
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
	status: varchar({ length: 30 }).default('em_andamento'),
	criadoPorId: integer("criado_por_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		sessaoIdIdx: index("avaliacoes_juri_sessao_id_idx").using("btree", table.sessaoJuriId.asc().nullsLast().op("int4_ops")),
		statusIdx: index("avaliacoes_juri_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
		avaliacoesJuriCriadoPorIdFkey: foreignKey({
			columns: [table.criadoPorId],
			foreignColumns: [users.id],
			name: "avaliacoes_juri_criado_por_id_fkey"
		}),
		avaliacoesJuriProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "avaliacoes_juri_processo_id_fkey"
		}).onDelete("set null"),
		avaliacoesJuriSessaoJuriIdFkey: foreignKey({
			columns: [table.sessaoJuriId],
			foreignColumns: [sessoesJuri.id],
			name: "avaliacoes_juri_sessao_juri_id_fkey"
		}).onDelete("cascade"),
	}
});

export const avaliacaoJurados = pgTable("avaliacao_jurados", {
	id: serial().primaryKey().notNull(),
	avaliacaoJuriId: integer("avaliacao_juri_id").notNull(),
	juradoId: integer("jurado_id"),
	posicao: integer().notNull(),
	nome: text(),
	profissao: varchar({ length: 100 }),
	idadeAproximada: integer("idade_aproximada"),
	sexo: varchar({ length: 20 }),
	aparenciaPrimeiraImpressao: text("aparencia_primeira_impressao"),
	linguagemCorporalInicial: text("linguagem_corporal_inicial"),
	tendenciaVoto: tendenciaVoto("tendencia_voto"),
	nivelConfianca: nivelConfianca("nivel_confianca"),
	justificativaTendencia: text("justificativa_tendencia"),
	anotacoesInterrogatorio: text("anotacoes_interrogatorio"),
	anotacoesMp: text("anotacoes_mp"),
	anotacoesDefesa: text("anotacoes_defesa"),
	anotacoesGerais: text("anotacoes_gerais"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		avaliacaoJuradosAvaliacaoJuriIdFkey: foreignKey({
			columns: [table.avaliacaoJuriId],
			foreignColumns: [avaliacoesJuri.id],
			name: "avaliacao_jurados_avaliacao_juri_id_fkey"
		}).onDelete("cascade"),
		avaliacaoJuradosJuradoIdFkey: foreignKey({
			columns: [table.juradoId],
			foreignColumns: [jurados.id],
			name: "avaliacao_jurados_jurado_id_fkey"
		}).onDelete("set null"),
	}
});

export const avaliacaoTestemunhasJuri = pgTable("avaliacao_testemunhas_juri", {
	id: serial().primaryKey().notNull(),
	avaliacaoJuriId: integer("avaliacao_juri_id").notNull(),
	testemunhaId: integer("testemunha_id"),
	ordem: integer(),
	nome: text().notNull(),
	resumoDepoimento: text("resumo_depoimento"),
	reacaoJurados: text("reacao_jurados"),
	expressoesFaciaisLinguagem: text("expressoes_faciais_linguagem"),
	credibilidade: integer(),
	observacoesComplementares: text("observacoes_complementares"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		avaliacaoTestemunhasJuriAvaliacaoJuriIdFkey: foreignKey({
			columns: [table.avaliacaoJuriId],
			foreignColumns: [avaliacoesJuri.id],
			name: "avaliacao_testemunhas_juri_avaliacao_juri_id_fkey"
		}).onDelete("cascade"),
		avaliacaoTestemunhasJuriTestemunhaIdFkey: foreignKey({
			columns: [table.testemunhaId],
			foreignColumns: [testemunhas.id],
			name: "avaliacao_testemunhas_juri_testemunha_id_fkey"
		}).onDelete("set null"),
	}
});

export const argumentosSustentacao = pgTable("argumentos_sustentacao", {
	id: serial().primaryKey().notNull(),
	avaliacaoJuriId: integer("avaliacao_juri_id").notNull(),
	tipo: varchar({ length: 20 }).notNull(),
	ordem: integer(),
	descricaoArgumento: text("descricao_argumento"),
	reacaoJurados: text("reacao_jurados"),
	nivelPersuasao: integer("nivel_persuasao"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		argumentosSustentacaoAvaliacaoJuriIdFkey: foreignKey({
			columns: [table.avaliacaoJuriId],
			foreignColumns: [avaliacoesJuri.id],
			name: "argumentos_sustentacao_avaliacao_juri_id_fkey"
		}).onDelete("cascade"),
	}
});

export const jurisprudenciaTemas = pgTable("jurisprudencia_temas", {
	id: serial().primaryKey().notNull(),
	nome: varchar({ length: 200 }).notNull(),
	descricao: text(),
	cor: varchar({ length: 20 }).default('#6366f1'),
	icone: varchar({ length: 50 }),
	parentId: integer("parent_id"),
	totalJulgados: integer("total_julgados").default(0),
	createdById: integer("created_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		nomeIdx: index("jurisprudencia_temas_nome_idx").using("btree", table.nome.asc().nullsLast().op("text_ops")),
		jurisprudenciaTemasCreatedByIdFkey: foreignKey({
			columns: [table.createdById],
			foreignColumns: [users.id],
			name: "jurisprudencia_temas_created_by_id_fkey"
		}),
	}
});

export const jurisprudenciaTeses = pgTable("jurisprudencia_teses", {
	id: serial().primaryKey().notNull(),
	temaId: integer("tema_id"),
	titulo: varchar({ length: 300 }).notNull(),
	descricao: text(),
	textoTese: text("texto_tese"),
	posicao: varchar({ length: 20 }).default('favoravel'),
	forca: varchar({ length: 20 }).default('medio'),
	tags: jsonb(),
	totalJulgados: integer("total_julgados").default(0),
	createdById: integer("created_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		jurisprudenciaTesesCreatedByIdFkey: foreignKey({
			columns: [table.createdById],
			foreignColumns: [users.id],
			name: "jurisprudencia_teses_created_by_id_fkey"
		}),
		jurisprudenciaTesesTemaIdFkey: foreignKey({
			columns: [table.temaId],
			foreignColumns: [jurisprudenciaTemas.id],
			name: "jurisprudencia_teses_tema_id_fkey"
		}).onDelete("cascade"),
	}
});

export const jurisprudenciaJulgados = pgTable("jurisprudencia_julgados", {
	id: serial().primaryKey().notNull(),
	tribunal: tribunal().notNull(),
	tipoDecisao: tipoDecisao("tipo_decisao").notNull(),
	numeroProcesso: varchar("numero_processo", { length: 100 }),
	numeroRecurso: varchar("numero_recurso", { length: 100 }),
	relator: varchar({ length: 200 }),
	orgaoJulgador: varchar("orgao_julgador", { length: 200 }),
	dataJulgamento: date("data_julgamento"),
	dataPublicacao: date("data_publicacao"),
	ementa: text(),
	ementaResumo: text("ementa_resumo"),
	decisao: text(),
	votacao: varchar({ length: 100 }),
	textoIntegral: text("texto_integral"),
	temaId: integer("tema_id"),
	teseId: integer("tese_id"),
	tags: jsonb(),
	palavrasChave: jsonb("palavras_chave"),
	driveFileId: varchar("drive_file_id", { length: 100 }),
	driveFileUrl: text("drive_file_url"),
	arquivoNome: varchar("arquivo_nome", { length: 255 }),
	arquivoTamanho: integer("arquivo_tamanho"),
	processadoPorIa: boolean("processado_por_ia").default(false),
	iaResumo: text("ia_resumo"),
	iaPontosChave: jsonb("ia_pontos_chave"),
	iaArgumentos: jsonb("ia_argumentos"),
	embedding: jsonb(),
	citacaoFormatada: text("citacao_formatada"),
	status: varchar({ length: 20 }).default('pendente'),
	isFavorito: boolean("is_favorito").default(false),
	fonte: varchar({ length: 100 }),
	observacoes: text(),
	createdById: integer("created_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		statusIdx: index("jurisprudencia_julgados_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
		tribunalIdx: index("jurisprudencia_julgados_tribunal_idx").using("btree", table.tribunal.asc().nullsLast().op("enum_ops")),
		jurisprudenciaJulgadosCreatedByIdFkey: foreignKey({
			columns: [table.createdById],
			foreignColumns: [users.id],
			name: "jurisprudencia_julgados_created_by_id_fkey"
		}),
		jurisprudenciaJulgadosTemaIdFkey: foreignKey({
			columns: [table.temaId],
			foreignColumns: [jurisprudenciaTemas.id],
			name: "jurisprudencia_julgados_tema_id_fkey"
		}).onDelete("set null"),
		jurisprudenciaJulgadosTeseIdFkey: foreignKey({
			columns: [table.teseId],
			foreignColumns: [jurisprudenciaTeses.id],
			name: "jurisprudencia_julgados_tese_id_fkey"
		}).onDelete("set null"),
	}
});

export const jurisprudenciaBuscas = pgTable("jurisprudencia_buscas", {
	id: serial().primaryKey().notNull(),
	query: text().notNull(),
	tipoQuery: varchar("tipo_query", { length: 20 }).default('pergunta'),
	resposta: text(),
	julgadosIds: jsonb("julgados_ids"),
	tempoResposta: integer("tempo_resposta"),
	totalResultados: integer("total_resultados"),
	feedback: varchar({ length: 20 }),
	userId: integer("user_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		jurisprudenciaBuscasUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "jurisprudencia_buscas_user_id_fkey"
		}),
	}
});

export const jurisprudenciaDriveFolders = pgTable("jurisprudencia_drive_folders", {
	id: serial().primaryKey().notNull(),
	folderId: varchar("folder_id", { length: 100 }).notNull(),
	folderName: varchar("folder_name", { length: 255 }),
	folderPath: text("folder_path"),
	tribunal: tribunal(),
	temaId: integer("tema_id"),
	isActive: boolean("is_active").default(true),
	lastSyncAt: timestamp("last_sync_at", { mode: 'string' }),
	totalArquivos: integer("total_arquivos").default(0),
	arquivosSincronizados: integer("arquivos_sincronizados").default(0),
	createdById: integer("created_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		jurisprudenciaDriveFoldersCreatedByIdFkey: foreignKey({
			columns: [table.createdById],
			foreignColumns: [users.id],
			name: "jurisprudencia_drive_folders_created_by_id_fkey"
		}),
		jurisprudenciaDriveFoldersTemaIdFkey: foreignKey({
			columns: [table.temaId],
			foreignColumns: [jurisprudenciaTemas.id],
			name: "jurisprudencia_drive_folders_tema_id_fkey"
		}).onDelete("set null"),
	}
});

export const feedbacks = pgTable("feedbacks", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	tipo: feedbackTipo().notNull(),
	mensagem: text().notNull(),
	pagina: text(),
	contexto: jsonb(),
	status: feedbackStatus().default('novo').notNull(),
	jiraTicketId: varchar("jira_ticket_id", { length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		createdAtIdx: index("feedbacks_created_at_idx").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
		statusIdx: index("feedbacks_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
		userIdIdx: index("feedbacks_user_id_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
		feedbacksUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "feedbacks_user_id_fkey"
		}),
	}
});

export const palacioDiagramas = pgTable("palacio_diagramas", {
	id: serial().primaryKey().notNull(),
	casoId: integer("caso_id").notNull(),
	titulo: text().notNull(),
	descricao: text(),
	tipo: diagramaTipo().default('MAPA_MENTAL').notNull(),
	excalidrawData: jsonb("excalidraw_data"),
	thumbnail: text(),
	versao: integer().default(1),
	ultimoExportado: timestamp("ultimo_exportado", { mode: 'string' }),
	formatoExportacao: varchar("formato_exportacao", { length: 20 }),
	ordem: integer().default(0),
	tags: jsonb(),
	status: varchar({ length: 20 }).default('ativo'),
	criadoPorId: integer("criado_por_id"),
	atualizadoPorId: integer("atualizado_por_id"),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		casoIdIdx: index("palacio_diagramas_caso_id_idx").using("btree", table.casoId.asc().nullsLast().op("int4_ops")),
		statusIdx: index("palacio_diagramas_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
		palacioDiagramasAtualizadoPorIdFkey: foreignKey({
			columns: [table.atualizadoPorId],
			foreignColumns: [users.id],
			name: "palacio_diagramas_atualizado_por_id_fkey"
		}),
		palacioDiagramasCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "palacio_diagramas_caso_id_fkey"
		}).onDelete("cascade"),
		palacioDiagramasCriadoPorIdFkey: foreignKey({
			columns: [table.criadoPorId],
			foreignColumns: [users.id],
			name: "palacio_diagramas_criado_por_id_fkey"
		}),
	}
});

export const simulacaoPersonagens = pgTable("simulacao_personagens", {
	id: serial().primaryKey().notNull(),
	simulacaoId: integer("simulacao_id").notNull(),
	nome: text().notNull(),
	papel: varchar({ length: 30 }),
	personaId: integer("persona_id"),
	avatarUrl: text("avatar_url"),
	avatarTipo: varchar("avatar_tipo", { length: 30 }),
	cor: varchar({ length: 20 }),
	altura: real().default(1.7),
	posicaoInicial: jsonb("posicao_inicial"),
	rotacaoInicial: jsonb("rotacao_inicial"),
	animacaoPadrao: varchar("animacao_padrao", { length: 50 }).default('idle'),
	ordem: integer().default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		simulacaoIdIdx: index("simulacao_personagens_simulacao_id_idx").using("btree", table.simulacaoId.asc().nullsLast().op("int4_ops")),
		simulacaoPersonagensPersonaIdFkey: foreignKey({
			columns: [table.personaId],
			foreignColumns: [casePersonas.id],
			name: "simulacao_personagens_persona_id_fkey"
		}).onDelete("set null"),
		simulacaoPersonagensSimulacaoIdFkey: foreignKey({
			columns: [table.simulacaoId],
			foreignColumns: [simulacoes3D.id],
			name: "simulacao_personagens_simulacao_id_fkey"
		}).onDelete("cascade"),
	}
});

export const palacioElementos = pgTable("palacio_elementos", {
	id: serial().primaryKey().notNull(),
	diagramaId: integer("diagrama_id").notNull(),
	excalidrawElementId: text("excalidraw_element_id").notNull(),
	tipoVinculo: varchar("tipo_vinculo", { length: 30 }),
	personaId: integer("persona_id"),
	fatoId: integer("fato_id"),
	documentoId: integer("documento_id"),
	testemunhaId: integer("testemunha_id"),
	teseId: integer("tese_id"),
	label: text(),
	notas: text(),
	cor: varchar({ length: 20 }),
	icone: varchar({ length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		diagramaIdIdx: index("palacio_elementos_diagrama_id_idx").using("btree", table.diagramaId.asc().nullsLast().op("int4_ops")),
		palacioElementosDiagramaIdFkey: foreignKey({
			columns: [table.diagramaId],
			foreignColumns: [palacioDiagramas.id],
			name: "palacio_elementos_diagrama_id_fkey"
		}).onDelete("cascade"),
		palacioElementosDocumentoIdFkey: foreignKey({
			columns: [table.documentoId],
			foreignColumns: [documentos.id],
			name: "palacio_elementos_documento_id_fkey"
		}).onDelete("set null"),
		palacioElementosFatoIdFkey: foreignKey({
			columns: [table.fatoId],
			foreignColumns: [caseFacts.id],
			name: "palacio_elementos_fato_id_fkey"
		}).onDelete("set null"),
		palacioElementosPersonaIdFkey: foreignKey({
			columns: [table.personaId],
			foreignColumns: [casePersonas.id],
			name: "palacio_elementos_persona_id_fkey"
		}).onDelete("set null"),
		palacioElementosTeseIdFkey: foreignKey({
			columns: [table.teseId],
			foreignColumns: [tesesDefensivas.id],
			name: "palacio_elementos_tese_id_fkey"
		}).onDelete("set null"),
		palacioElementosTestemunhaIdFkey: foreignKey({
			columns: [table.testemunhaId],
			foreignColumns: [testemunhas.id],
			name: "palacio_elementos_testemunha_id_fkey"
		}).onDelete("set null"),
	}
});

export const palacioConexoes = pgTable("palacio_conexoes", {
	id: serial().primaryKey().notNull(),
	diagramaId: integer("diagrama_id").notNull(),
	elementoOrigemId: integer("elemento_origem_id").notNull(),
	elementoDestinoId: integer("elemento_destino_id").notNull(),
	tipoConexao: varchar("tipo_conexao", { length: 30 }),
	label: text(),
	forca: integer(),
	direcional: boolean().default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		diagramaIdIdx: index("palacio_conexoes_diagrama_id_idx").using("btree", table.diagramaId.asc().nullsLast().op("int4_ops")),
		palacioConexoesDiagramaIdFkey: foreignKey({
			columns: [table.diagramaId],
			foreignColumns: [palacioDiagramas.id],
			name: "palacio_conexoes_diagrama_id_fkey"
		}).onDelete("cascade"),
		palacioConexoesElementoDestinoIdFkey: foreignKey({
			columns: [table.elementoDestinoId],
			foreignColumns: [palacioElementos.id],
			name: "palacio_conexoes_elemento_destino_id_fkey"
		}).onDelete("cascade"),
		palacioConexoesElementoOrigemIdFkey: foreignKey({
			columns: [table.elementoOrigemId],
			foreignColumns: [palacioElementos.id],
			name: "palacio_conexoes_elemento_origem_id_fkey"
		}).onDelete("cascade"),
	}
});

export const simulacoes3D = pgTable("simulacoes_3d", {
	id: serial().primaryKey().notNull(),
	casoId: integer("caso_id").notNull(),
	titulo: text().notNull(),
	descricao: text(),
	cenaData: jsonb("cena_data"),
	thumbnail: text(),
	status: simulacaoStatus().default('RASCUNHO'),
	configExport: jsonb("config_export"),
	criadoPorId: integer("criado_por_id"),
	atualizadoPorId: integer("atualizado_por_id"),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		casoIdIdx: index("simulacoes_3d_caso_id_idx").using("btree", table.casoId.asc().nullsLast().op("int4_ops")),
		statusIdx: index("simulacoes_3d_status_idx").using("btree", table.status.asc().nullsLast().op("enum_ops")),
		simulacoes3DAtualizadoPorIdFkey: foreignKey({
			columns: [table.atualizadoPorId],
			foreignColumns: [users.id],
			name: "simulacoes_3d_atualizado_por_id_fkey"
		}),
		simulacoes3DCasoIdFkey: foreignKey({
			columns: [table.casoId],
			foreignColumns: [casos.id],
			name: "simulacoes_3d_caso_id_fkey"
		}).onDelete("cascade"),
		simulacoes3DCriadoPorIdFkey: foreignKey({
			columns: [table.criadoPorId],
			foreignColumns: [users.id],
			name: "simulacoes_3d_criado_por_id_fkey"
		}),
	}
});

export const simulacaoObjetos = pgTable("simulacao_objetos", {
	id: serial().primaryKey().notNull(),
	simulacaoId: integer("simulacao_id").notNull(),
	nome: text().notNull(),
	tipo: varchar({ length: 30 }),
	modeloUrl: text("modelo_url"),
	modeloNome: varchar("modelo_nome", { length: 100 }),
	posicao: jsonb(),
	rotacao: jsonb(),
	escala: jsonb(),
	cor: varchar({ length: 20 }),
	visivel: boolean().default(true),
	destacado: boolean().default(false),
	descricao: text(),
	ordem: integer().default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		simulacaoIdIdx: index("simulacao_objetos_simulacao_id_idx").using("btree", table.simulacaoId.asc().nullsLast().op("int4_ops")),
		simulacaoObjetosSimulacaoIdFkey: foreignKey({
			columns: [table.simulacaoId],
			foreignColumns: [simulacoes3D.id],
			name: "simulacao_objetos_simulacao_id_fkey"
		}).onDelete("cascade"),
	}
});

export const simulacaoVersoes = pgTable("simulacao_versoes", {
	id: serial().primaryKey().notNull(),
	simulacaoId: integer("simulacao_id").notNull(),
	nome: text().notNull(),
	tipo: varchar({ length: 20 }).notNull(),
	cor: varchar({ length: 20 }),
	animacaoData: jsonb("animacao_data"),
	duracao: real(),
	narrativa: text(),
	cameraId: text("camera_id"),
	ordem: integer().default(0),
	ativa: boolean().default(true),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		simulacaoIdIdx: index("simulacao_versoes_simulacao_id_idx").using("btree", table.simulacaoId.asc().nullsLast().op("int4_ops")),
		simulacaoVersoesSimulacaoIdFkey: foreignKey({
			columns: [table.simulacaoId],
			foreignColumns: [simulacoes3D.id],
			name: "simulacao_versoes_simulacao_id_fkey"
		}).onDelete("cascade"),
	}
});

export const simulacaoKeyframes = pgTable("simulacao_keyframes", {
	id: serial().primaryKey().notNull(),
	versaoId: integer("versao_id").notNull(),
	personagemId: integer("personagem_id"),
	objetoId: integer("objeto_id"),
	cameraId: text("camera_id"),
	tempo: real().notNull(),
	frame: integer(),
	posicao: jsonb(),
	rotacao: jsonb(),
	escala: jsonb(),
	animacao: varchar({ length: 50 }),
	animacaoVelocidade: real("animacao_velocidade").default(1),
	opacidade: real().default(1),
	visivel: boolean().default(true),
	easing: varchar({ length: 30 }).default('linear'),
	label: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		versaoIdIdx: index("simulacao_keyframes_versao_id_idx").using("btree", table.versaoId.asc().nullsLast().op("int4_ops")),
		simulacaoKeyframesObjetoIdFkey: foreignKey({
			columns: [table.objetoId],
			foreignColumns: [simulacaoObjetos.id],
			name: "simulacao_keyframes_objeto_id_fkey"
		}).onDelete("cascade"),
		simulacaoKeyframesPersonagemIdFkey: foreignKey({
			columns: [table.personagemId],
			foreignColumns: [simulacaoPersonagens.id],
			name: "simulacao_keyframes_personagem_id_fkey"
		}).onDelete("cascade"),
		simulacaoKeyframesVersaoIdFkey: foreignKey({
			columns: [table.versaoId],
			foreignColumns: [simulacaoVersoes.id],
			name: "simulacao_keyframes_versao_id_fkey"
		}).onDelete("cascade"),
	}
});

export const simulacaoExportacoes = pgTable("simulacao_exportacoes", {
	id: serial().primaryKey().notNull(),
	versaoId: integer("versao_id").notNull(),
	videoUrl: text("video_url"),
	thumbnailUrl: text("thumbnail_url"),
	formato: varchar({ length: 10 }),
	resolucao: varchar({ length: 20 }),
	status: varchar({ length: 20 }).default('pendente'),
	progresso: integer().default(0),
	erro: text(),
	tamanhoBytes: integer("tamanho_bytes"),
	duracaoSegundos: real("duracao_segundos"),
	fps: integer(),
	renderEngine: varchar("render_engine", { length: 20 }),
	tempoRenderizacao: integer("tempo_renderizacao"),
	criadoPorId: integer("criado_por_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		versaoIdIdx: index("simulacao_exportacoes_versao_id_idx").using("btree", table.versaoId.asc().nullsLast().op("int4_ops")),
		simulacaoExportacoesCriadoPorIdFkey: foreignKey({
			columns: [table.criadoPorId],
			foreignColumns: [users.id],
			name: "simulacao_exportacoes_criado_por_id_fkey"
		}),
		simulacaoExportacoesVersaoIdFkey: foreignKey({
			columns: [table.versaoId],
			foreignColumns: [simulacaoVersoes.id],
			name: "simulacao_exportacoes_versao_id_fkey"
		}).onDelete("cascade"),
	}
});

export const simulacaoAssets = pgTable("simulacao_assets", {
	id: serial().primaryKey().notNull(),
	nome: text().notNull(),
	categoria: varchar({ length: 30 }).notNull(),
	subcategoria: varchar({ length: 50 }),
	arquivoUrl: text("arquivo_url").notNull(),
	thumbnailUrl: text("thumbnail_url"),
	formato: varchar({ length: 20 }),
	descricao: text(),
	tags: jsonb(),
	tamanhoBytes: integer("tamanho_bytes"),
	fonte: varchar({ length: 50 }),
	licenca: varchar({ length: 50 }),
	atribuicao: text(),
	configuracaoPadrao: jsonb("configuracao_padrao"),
	publico: boolean().default(false),
	criadoPorId: integer("criado_por_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		simulacaoAssetsCriadoPorIdFkey: foreignKey({
			columns: [table.criadoPorId],
			foreignColumns: [users.id],
			name: "simulacao_assets_criado_por_id_fkey"
		}),
	}
});

export const documentEmbeddings = pgTable("document_embeddings", {
	id: serial().primaryKey().notNull(),
	fileId: integer("file_id").notNull(),
	assistidoId: integer("assistido_id"),
	chunkIndex: integer("chunk_index").default(0).notNull(),
	chunkText: text("chunk_text").notNull(),
	metadata: jsonb().default({}),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		assistidoIdx: index("document_embeddings_assistido_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")),
		fileIdx: index("document_embeddings_file_idx").using("btree", table.fileId.asc().nullsLast().op("int4_ops")),
		documentEmbeddingsAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "document_embeddings_assistido_id_fkey"
		}).onDelete("cascade"),
		documentEmbeddingsFileIdFkey: foreignKey({
			columns: [table.fileId],
			foreignColumns: [driveFiles.id],
			name: "document_embeddings_file_id_fkey"
		}).onDelete("cascade"),
	}
});

export const whatsappMessageActions = pgTable("whatsapp_message_actions", {
	id: serial().primaryKey().notNull(),
	messageId: integer("message_id").notNull(),
	actionType: varchar("action_type", { length: 20 }).notNull(),
	targetType: varchar("target_type", { length: 20 }).notNull(),
	targetId: integer("target_id"),
	processoId: integer("processo_id"),
	observacao: text(),
	createdById: integer("created_by_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		messageIdx: index("whatsapp_message_actions_message_idx").using("btree", table.messageId.asc().nullsLast().op("int4_ops")),
		processoIdx: index("whatsapp_message_actions_processo_idx").using("btree", table.processoId.asc().nullsLast().op("int4_ops")).where(sql`(processo_id IS NOT NULL)`),
		whatsappMessageActionsCreatedByIdFkey: foreignKey({
			columns: [table.createdById],
			foreignColumns: [users.id],
			name: "whatsapp_message_actions_created_by_id_fkey"
		}),
		whatsappMessageActionsMessageIdFkey: foreignKey({
			columns: [table.messageId],
			foreignColumns: [whatsappChatMessages.id],
			name: "whatsapp_message_actions_message_id_fkey"
		}).onDelete("cascade"),
		whatsappMessageActionsProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "whatsapp_message_actions_processo_id_fkey"
		}).onDelete("set null"),
	}
});

export const analisesCowork = pgTable("analises_cowork", {
	id: serial().primaryKey().notNull(),
	assistidoId: integer("assistido_id").notNull(),
	processoId: integer("processo_id"),
	audienciaId: integer("audiencia_id"),
	tipo: varchar({ length: 50 }).notNull(),
	schemaVersion: varchar("schema_version", { length: 10 }).default('1.0').notNull(),
	resumoFato: text("resumo_fato"),
	teseDefesa: text("tese_defesa"),
	estrategiaAtual: text("estrategia_atual"),
	crimePrincipal: varchar("crime_principal", { length: 200 }),
	pontosCriticos: jsonb("pontos_criticos").default([]),
	payload: jsonb().notNull(),
	fonteArquivo: text("fonte_arquivo"),
	importadoEm: timestamp("importado_em", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		assistidoIdIdx: index("analises_cowork_assistido_id_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")),
		audienciaIdIdx: index("analises_cowork_audiencia_id_idx").using("btree", table.audienciaId.asc().nullsLast().op("int4_ops")),
		importadoEmIdx: index("analises_cowork_importado_em_idx").using("btree", table.importadoEm.asc().nullsLast().op("timestamp_ops")),
		processoIdIdx: index("analises_cowork_processo_id_idx").using("btree", table.processoId.asc().nullsLast().op("int4_ops")),
		tipoIdx: index("analises_cowork_tipo_idx").using("btree", table.tipo.asc().nullsLast().op("text_ops")),
		analisesCoworkAssistidoIdAssistidosIdFk: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "analises_cowork_assistido_id_assistidos_id_fk"
		}).onDelete("cascade"),
		analisesCoworkAudienciaIdAudienciasIdFk: foreignKey({
			columns: [table.audienciaId],
			foreignColumns: [audiencias.id],
			name: "analises_cowork_audiencia_id_audiencias_id_fk"
		}).onDelete("set null"),
		analisesCoworkProcessoIdProcessosIdFk: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "analises_cowork_processo_id_processos_id_fk"
		}).onDelete("set null"),
	}
});

export const syncLog = pgTable("sync_log", {
	id: serial().primaryKey().notNull(),
	demandaId: integer("demanda_id"),
	campo: varchar({ length: 50 }).notNull(),
	valorBanco: text("valor_banco"),
	valorPlanilha: text("valor_planilha"),
	origem: syncOrigem().notNull(),
	bancoUpdatedAt: timestamp("banco_updated_at", { mode: 'string' }),
	planilhaUpdatedAt: timestamp("planilha_updated_at", { mode: 'string' }),
	conflito: boolean().default(false),
	resolvidoEm: timestamp("resolvido_em", { mode: 'string' }),
	resolvidoPor: varchar("resolvido_por", { length: 100 }),
	resolvidoValor: text("resolvido_valor"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		syncLogDemandaIdDemandasIdFk: foreignKey({
			columns: [table.demandaId],
			foreignColumns: [demandas.id],
			name: "sync_log_demanda_id_demandas_id_fk"
		}).onDelete("cascade"),
	}
});

export const coworkTasks = pgTable("cowork_tasks", {
	id: serial().primaryKey().notNull(),
	assistidoId: integer("assistido_id").notNull(),
	processoId: integer("processo_id"),
	tipo: varchar({ length: 50 }).default('juri').notNull(),
	status: varchar({ length: 20 }).default('pending').notNull(),
	briefing: text(),
	resultadoJson: jsonb("resultado_json"),
	resultadoMd: text("resultado_md"),
	teseDefesa: text("tese_defesa"),
	error: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	startedAt: timestamp("started_at", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdBy: text("created_by"),
	funcionalidade: varchar({ length: 50 }).default('relatorio_juri'),
	skillsUsadas: text("skills_usadas").array().default([""]),
}, (table) => {
	return {
		createdAtIdx: index("cowork_tasks_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
		statusIdx: index("cowork_tasks_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
		coworkTasksAssistidoIdFkey: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "cowork_tasks_assistido_id_fkey"
		}),
		coworkTasksProcessoIdFkey: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "cowork_tasks_processo_id_fkey"
		}),
	}
});

export const chatHistory = pgTable("chat_history", {
	id: serial().primaryKey().notNull(),
	assistidoId: integer("assistido_id"),
	userId: integer("user_id"),
	role: varchar({ length: 20 }).notNull(),
	content: text().notNull(),
	skillId: varchar("skill_id", { length: 50 }),
	metadata: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => {
	return {
		chatHistoryAssistidoIdAssistidosIdFk: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "chat_history_assistido_id_assistidos_id_fk"
		}).onDelete("cascade"),
		chatHistoryUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "chat_history_user_id_users_id_fk"
		}),
	}
});

export const institutos = pgTable("institutos", {
	id: serial().primaryKey().notNull(),
	processoId: integer("processo_id").notNull(),
	assistidoId: integer("assistido_id").notNull(),
	tipo: varchar({ length: 30 }).notNull(),
	status: varchar({ length: 30 }).default('PROPOSTO').notNull(),
	condicoes: jsonb(),
	dataAcordo: date("data_acordo"),
	dataInicio: date("data_inicio"),
	dataFim: date("data_fim"),
	prazoMeses: integer("prazo_meses"),
	audienciaHomologacaoId: integer("audiencia_homologacao_id"),
	audienciaAdmonitoriaId: integer("audiencia_admonitoria_id"),
	valorPrestacao: numeric("valor_prestacao"),
	horasServico: integer("horas_servico"),
	observacoes: text(),
	defensorId: integer("defensor_id"),
	comarcaId: integer("comarca_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		assistidoIdx: index("institutos_assistido_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")),
		comarcaIdx: index("institutos_comarca_idx").using("btree", table.comarcaId.asc().nullsLast().op("int4_ops")),
		defensorIdx: index("institutos_defensor_idx").using("btree", table.defensorId.asc().nullsLast().op("int4_ops")),
		processoIdx: index("institutos_processo_idx").using("btree", table.processoId.asc().nullsLast().op("int4_ops")),
		statusIdx: index("institutos_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
		tipoIdx: index("institutos_tipo_idx").using("btree", table.tipo.asc().nullsLast().op("text_ops")),
		institutosAssistidoIdAssistidosIdFk: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "institutos_assistido_id_assistidos_id_fk"
		}).onDelete("cascade"),
		institutosComarcaIdComarcasIdFk: foreignKey({
			columns: [table.comarcaId],
			foreignColumns: [comarcas.id],
			name: "institutos_comarca_id_comarcas_id_fk"
		}),
		institutosDefensorIdUsersIdFk: foreignKey({
			columns: [table.defensorId],
			foreignColumns: [users.id],
			name: "institutos_defensor_id_users_id_fk"
		}),
		institutosProcessoIdProcessosIdFk: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "institutos_processo_id_processos_id_fk"
		}).onDelete("cascade"),
	}
});

export const delitos = pgTable("delitos", {
	id: serial().primaryKey().notNull(),
	processoId: integer("processo_id").notNull(),
	assistidoId: integer("assistido_id"),
	tipoDelito: varchar("tipo_delito", { length: 80 }).notNull(),
	artigoBase: varchar("artigo_base", { length: 50 }).notNull(),
	incisos: jsonb(),
	qualificadoras: jsonb(),
	causasAumento: jsonb("causas_aumento"),
	causasDiminuicao: jsonb("causas_diminuicao"),
	penaMinimaMeses: integer("pena_minima_meses"),
	penaMaximaMeses: integer("pena_maxima_meses"),
	penaAplicadaMeses: integer("pena_aplicada_meses"),
	regimeInicial: varchar("regime_inicial", { length: 20 }),
	cabeAnpp: boolean("cabe_anpp"),
	cabeSursis: boolean("cabe_sursis"),
	cabeTransacao: boolean("cabe_transacao"),
	cabeSubstituicao: boolean("cabe_substituicao"),
	dataSentenca: date("data_sentenca"),
	resultadoSentenca: varchar("resultado_sentenca", { length: 30 }),
	observacoes: text(),
	comarcaId: integer("comarca_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		assistidoIdx: index("delitos_assistido_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")),
		comarcaIdx: index("delitos_comarca_idx").using("btree", table.comarcaId.asc().nullsLast().op("int4_ops")),
		processoIdx: index("delitos_processo_idx").using("btree", table.processoId.asc().nullsLast().op("int4_ops")),
		tipoIdx: index("delitos_tipo_idx").using("btree", table.tipoDelito.asc().nullsLast().op("text_ops")),
		delitosAssistidoIdAssistidosIdFk: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "delitos_assistido_id_assistidos_id_fk"
		}).onDelete("cascade"),
		delitosComarcaIdComarcasIdFk: foreignKey({
			columns: [table.comarcaId],
			foreignColumns: [comarcas.id],
			name: "delitos_comarca_id_comarcas_id_fk"
		}),
		delitosProcessoIdProcessosIdFk: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "delitos_processo_id_processos_id_fk"
		}).onDelete("cascade"),
	}
});

export const factualFavoritos = pgTable("factual_favoritos", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	artigoId: integer("artigo_id").notNull(),
	nota: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		factualFavUniqueIdx: uniqueIndex("factual_fav_unique_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops"), table.artigoId.asc().nullsLast().op("int4_ops")),
		factualFavUserIdx: index("factual_fav_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
		factualFavoritosArtigoIdFkey: foreignKey({
			columns: [table.artigoId],
			foreignColumns: [factualArtigos.id],
			name: "factual_favoritos_artigo_id_fkey"
		}).onDelete("cascade"),
		factualFavoritosUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "factual_favoritos_user_id_fkey"
		}).onDelete("cascade"),
	}
});

export const factualEdicoes = pgTable("factual_edicoes", {
	id: serial().primaryKey().notNull(),
	titulo: varchar({ length: 200 }).default('Diário da Bahia').notNull(),
	subtitulo: varchar({ length: 300 }),
	dataEdicao: timestamp("data_edicao", { mode: 'string' }).notNull(),
	totalArtigos: integer("total_artigos").default(0).notNull(),
	secoes: jsonb().default([]),
	status: varchar({ length: 20 }).default('rascunho').notNull(),
	publicadoPor: integer("publicado_por"),
	publicadoEm: timestamp("publicado_em", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		dataIdx: index("factual_edicoes_data_idx").using("btree", table.dataEdicao.asc().nullsLast().op("timestamp_ops")),
		statusIdx: index("factual_edicoes_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
		factualEdicoesPublicadoPorFkey: foreignKey({
			columns: [table.publicadoPor],
			foreignColumns: [users.id],
			name: "factual_edicoes_publicado_por_fkey"
		}),
	}
});

export const factualArtigos = pgTable("factual_artigos", {
	id: serial().primaryKey().notNull(),
	edicaoId: integer("edicao_id").notNull(),
	secao: varchar({ length: 50 }).notNull(),
	titulo: text().notNull(),
	resumo: text(),
	conteudoOriginal: text("conteudo_original"),
	fonteNome: varchar("fonte_nome", { length: 100 }).notNull(),
	fonteUrl: text("fonte_url").notNull(),
	imagemUrl: text("imagem_url"),
	autor: varchar({ length: 200 }),
	dataPublicacao: timestamp("data_publicacao", { mode: 'string' }),
	ordem: integer().default(0).notNull(),
	destaque: boolean().default(false).notNull(),
	tags: jsonb().default([]),
	queryOrigem: text("query_origem"),
	contentHash: text("content_hash"),
	modeloSumarizacao: varchar("modelo_sumarizacao", { length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		contentHashIdx: index("factual_artigos_content_hash_idx").using("btree", table.contentHash.asc().nullsLast().op("text_ops")),
		edicaoIdx: index("factual_artigos_edicao_idx").using("btree", table.edicaoId.asc().nullsLast().op("int4_ops")),
		edicaoSecaoIdx: index("factual_artigos_edicao_secao_idx").using("btree", table.edicaoId.asc().nullsLast().op("text_ops"), table.secao.asc().nullsLast().op("text_ops"), table.ordem.asc().nullsLast().op("text_ops")),
		fonteUrlIdx: index("factual_artigos_fonte_url_idx").using("btree", table.fonteUrl.asc().nullsLast().op("text_ops")),
		secaoIdx: index("factual_artigos_secao_idx").using("btree", table.secao.asc().nullsLast().op("text_ops")),
		factualArtigosEdicaoIdFkey: foreignKey({
			columns: [table.edicaoId],
			foreignColumns: [factualEdicoes.id],
			name: "factual_artigos_edicao_id_fkey"
		}).onDelete("cascade"),
	}
});

export const factualSecoes = pgTable("factual_secoes", {
	id: serial().primaryKey().notNull(),
	nome: varchar({ length: 50 }).notNull(),
	contexto: text().notNull(),
	queries: jsonb().default([]),
	dateRestrict: varchar("date_restrict", { length: 10 }).default('d3').notNull(),
	maxArtigos: integer("max_artigos").default(5).notNull(),
	ordem: integer().default(0).notNull(),
	ativo: boolean().default(true).notNull(),
	jornal: varchar({ length: 20 }).default('factual').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
});

export const atosInfracionais = pgTable("atos_infracionais", {
	id: serial().primaryKey().notNull(),
	processoId: integer("processo_id").notNull(),
	assistidoId: integer("assistido_id"),
	atoEquiparado: varchar("ato_equiparado", { length: 80 }).notNull(),
	artigoEquiparado: varchar("artigo_equiparado", { length: 50 }).notNull(),
	qualificadoras: jsonb(),
	envolveuViolencia: boolean("envolveu_violencia").default(false),
	envolveuGraveAmeaca: boolean("envolveu_grave_ameaca").default(false),
	idadeNaData: integer("idade_na_data"),
	remissao: varchar({ length: 30 }),
	dataRemissao: date("data_remissao"),
	condicoesRemissao: jsonb("condicoes_remissao"),
	observacoes: text(),
	comarcaId: integer("comarca_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		assistidoIdx: index("atos_infracionais_assistido_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")),
		atoIdx: index("atos_infracionais_ato_idx").using("btree", table.atoEquiparado.asc().nullsLast().op("text_ops")),
		comarcaIdx: index("atos_infracionais_comarca_idx").using("btree", table.comarcaId.asc().nullsLast().op("int4_ops")),
		processoIdx: index("atos_infracionais_processo_idx").using("btree", table.processoId.asc().nullsLast().op("int4_ops")),
		atosInfracionaisAssistidoIdAssistidosIdFk: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "atos_infracionais_assistido_id_assistidos_id_fk"
		}).onDelete("cascade"),
		atosInfracionaisComarcaIdComarcasIdFk: foreignKey({
			columns: [table.comarcaId],
			foreignColumns: [comarcas.id],
			name: "atos_infracionais_comarca_id_comarcas_id_fk"
		}),
		atosInfracionaisProcessoIdProcessosIdFk: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "atos_infracionais_processo_id_processos_id_fk"
		}).onDelete("cascade"),
	}
});

export const medidasSocioeducativas = pgTable("medidas_socioeducativas", {
	id: serial().primaryKey().notNull(),
	processoId: integer("processo_id").notNull(),
	assistidoId: integer("assistido_id").notNull(),
	tipo: varchar({ length: 30 }).notNull(),
	status: varchar({ length: 30 }).default('APLICADA').notNull(),
	dataAplicacao: date("data_aplicacao"),
	dataInicio: date("data_inicio"),
	dataFim: date("data_fim"),
	prazoMeses: integer("prazo_meses"),
	prazoMaximoMeses: integer("prazo_maximo_meses"),
	dataProximaReavaliacao: date("data_proxima_reavaliacao"),
	unidadeExecucao: varchar("unidade_execucao", { length: 200 }),
	condicoes: jsonb(),
	horasServico: integer("horas_servico"),
	medidaAnteriorId: integer("medida_anterior_id"),
	motivoSubstituicao: text("motivo_substituicao"),
	observacoes: text(),
	defensorId: integer("defensor_id"),
	comarcaId: integer("comarca_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		medidasSocioAssistidoIdx: index("medidas_socio_assistido_idx").using("btree", table.assistidoId.asc().nullsLast().op("int4_ops")),
		medidasSocioComarcaIdx: index("medidas_socio_comarca_idx").using("btree", table.comarcaId.asc().nullsLast().op("int4_ops")),
		medidasSocioDefensorIdx: index("medidas_socio_defensor_idx").using("btree", table.defensorId.asc().nullsLast().op("int4_ops")),
		medidasSocioProcessoIdx: index("medidas_socio_processo_idx").using("btree", table.processoId.asc().nullsLast().op("int4_ops")),
		medidasSocioReavaliacaoIdx: index("medidas_socio_reavaliacao_idx").using("btree", table.dataProximaReavaliacao.asc().nullsLast().op("date_ops")),
		medidasSocioStatusIdx: index("medidas_socio_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
		medidasSocioTipoIdx: index("medidas_socio_tipo_idx").using("btree", table.tipo.asc().nullsLast().op("text_ops")),
		medidasSocioAssistidoIdAssistidosIdFk: foreignKey({
			columns: [table.assistidoId],
			foreignColumns: [assistidos.id],
			name: "medidas_socio_assistido_id_assistidos_id_fk"
		}).onDelete("cascade"),
		medidasSocioComarcaIdComarcasIdFk: foreignKey({
			columns: [table.comarcaId],
			foreignColumns: [comarcas.id],
			name: "medidas_socio_comarca_id_comarcas_id_fk"
		}),
		medidasSocioDefensorIdUsersIdFk: foreignKey({
			columns: [table.defensorId],
			foreignColumns: [users.id],
			name: "medidas_socio_defensor_id_users_id_fk"
		}),
		medidasSocioProcessoIdProcessosIdFk: foreignKey({
			columns: [table.processoId],
			foreignColumns: [processos.id],
			name: "medidas_socio_processo_id_processos_id_fk"
		}).onDelete("cascade"),
	}
});

export const payments = pgTable("payments", {
	id: serial().primaryKey().notNull(),
	subscriptionId: integer("subscription_id").notNull(),
	userId: integer("user_id").notNull(),
	valor: numeric().notNull(),
	status: varchar({ length: 20 }).default('pendente').notNull(),
	metodo: varchar({ length: 20 }).default('pix'),
	referenciaMes: varchar("referencia_mes", { length: 7 }),
	asaasPaymentId: varchar("asaas_payment_id", { length: 100 }),
	pixQrCode: text("pix_qr_code"),
	pixCopiaCola: text("pix_copia_cola"),
	dataPagamento: timestamp("data_pagamento", { mode: 'string' }),
	dataVencimento: date("data_vencimento"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	nota: text(),
}, (table) => {
	return {
		referenciaIdx: index("payments_referencia_idx").using("btree", table.referenciaMes.asc().nullsLast().op("text_ops")),
		statusIdx: index("payments_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
		subscriptionIdx: index("payments_subscription_idx").using("btree", table.subscriptionId.asc().nullsLast().op("int4_ops")),
		userIdx: index("payments_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
		paymentsSubscriptionIdFk: foreignKey({
			columns: [table.subscriptionId],
			foreignColumns: [subscriptions.id],
			name: "payments_subscription_id_fk"
		}).onDelete("cascade"),
		paymentsUserIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "payments_user_id_fk"
		}),
	}
});

export const subscriptions = pgTable("subscriptions", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	plano: varchar({ length: 20 }).default('essencial').notNull(),
	status: varchar({ length: 20 }).default('pendente').notNull(),
	valorBase: numeric("valor_base").notNull(),
	descontoPercentual: integer("desconto_percentual").default(0),
	valorFinal: numeric("valor_final").notNull(),
	dataInicio: date("data_inicio"),
	dataVencimento: date("data_vencimento"),
	dataUltimoPagamento: date("data_ultimo_pagamento"),
	asaasCustomerId: varchar("asaas_customer_id", { length: 100 }),
	asaasSubscriptionId: varchar("asaas_subscription_id", { length: 100 }),
	diasTolerancia: integer("dias_tolerancia").default(7),
	observacoes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		planoIdx: index("subscriptions_plano_idx").using("btree", table.plano.asc().nullsLast().op("text_ops")),
		statusIdx: index("subscriptions_status_idx").using("btree", table.status.asc().nullsLast().op("text_ops")),
		userIdx: index("subscriptions_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
		vencimentoIdx: index("subscriptions_vencimento_idx").using("btree", table.dataVencimento.asc().nullsLast().op("date_ops")),
		subscriptionsUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "subscriptions_user_id_users_id_fk"
		}).onDelete("cascade"),
		subscriptionsUserIdKey: unique("subscriptions_user_id_key").on(table.userId),
	}
});

export const userGoogleTokens = pgTable("user_google_tokens", {
	id: serial().primaryKey().notNull(),
	userId: integer("user_id").notNull(),
	email: text().notNull(),
	refreshToken: text("refresh_token").notNull(),
	accessToken: text("access_token"),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => {
	return {
		userIdx: index("user_google_tokens_user_idx").using("btree", table.userId.asc().nullsLast().op("int4_ops")),
		userGoogleTokensUserIdFkey: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_google_tokens_user_id_fkey"
		}).onDelete("cascade"),
		userGoogleTokensUserIdUsersIdFk: foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_google_tokens_user_id_users_id_fk"
		}).onDelete("cascade"),
		userGoogleTokensUserIdKey: unique("user_google_tokens_user_id_key").on(table.userId),
	}
});

export const users = pgTable("users", {
	id: serial().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	passwordHash: text("password_hash"),
	role: varchar({ length: 20 }).default('defensor').notNull(),
	phone: text(),
	oab: varchar({ length: 50 }),
	comarca: varchar({ length: 100 }),
	workspaceId: integer("workspace_id"),
	emailVerified: boolean("email_verified").default(false).notNull(),
	approvalStatus: varchar("approval_status", { length: 20 }).default('pending').notNull(),
	deletedAt: timestamp("deleted_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	supervisorId: integer("supervisor_id"),
	funcao: varchar({ length: 30 }),
	nucleo: varchar({ length: 30 }),
	isAdmin: boolean("is_admin").default(false),
	podeVerTodosAssistidos: boolean("pode_ver_todos_assistidos").default(true),
	podeVerTodosProcessos: boolean("pode_ver_todos_processos").default(true),
	comarcaId: integer("comarca_id").default(1).notNull(),
	defensoresVinculados: jsonb("defensores_vinculados"),
	areasPrincipais: jsonb("areas_principais"),
	mustChangePassword: boolean("must_change_password").default(false),
	inviteToken: varchar("invite_token", { length: 64 }),
	expiresAt: timestamp("expires_at", { mode: 'string' }),
	onboardingCompleted: boolean("onboarding_completed").default(false),
	googleLinked: boolean("google_linked").default(false),
	driveFolderId: varchar("drive_folder_id", { length: 100 }),
	sheetsSpreadsheetId: varchar("sheets_spreadsheet_id", { length: 100 }),
	sheetsSpreadsheetUrl: text("sheets_spreadsheet_url"),
	sheetsSyncEnabled: boolean("sheets_sync_enabled").default(false),
}, (table) => {
	return {
		approvalStatusIdx: index("users_approval_status_idx").using("btree", table.approvalStatus.asc().nullsLast().op("text_ops")),
		comarcaIdIdx: index("users_comarca_id_idx").using("btree", table.comarcaId.asc().nullsLast().op("int4_ops")),
		comarcaIdx: index("users_comarca_idx").using("btree", table.comarca.asc().nullsLast().op("text_ops")),
		deletedAtIdx: index("users_deleted_at_idx").using("btree", table.deletedAt.asc().nullsLast().op("timestamptz_ops")),
		roleIdx: index("users_role_idx").using("btree", table.role.asc().nullsLast().op("text_ops")),
		supervisorIdIdx: index("users_supervisor_id_idx").using("btree", table.supervisorId.asc().nullsLast().op("int4_ops")),
		workspaceIdIdx: index("users_workspace_id_idx").using("btree", table.workspaceId.asc().nullsLast().op("int4_ops")),
		usersComarcaIdFkey: foreignKey({
			columns: [table.comarcaId],
			foreignColumns: [comarcas.id],
			name: "users_comarca_id_fkey"
		}),
		usersSupervisorIdFkey: foreignKey({
			columns: [table.supervisorId],
			foreignColumns: [table.id],
			name: "users_supervisor_id_fkey"
		}),
		usersWorkspaceIdFkey: foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "users_workspace_id_fkey"
		}),
		usersEmailKey: unique("users_email_key").on(table.email),
		serviceRoleFullAccess: pgPolicy("service_role_full_access", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
		postgresFullAccess: pgPolicy("postgres_full_access", { as: "permissive", for: "all", to: ["postgres"] }),
	}
});
