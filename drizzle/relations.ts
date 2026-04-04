import { relations } from "drizzle-orm/relations";
import { assistidos, claudeCodeTasks, casos, users, processos, distributionHistory, workspaces, userSettings, comarcas, escalasAtribuicao, profissionais, analysisJobs, audiencias, delegacoesHistorico, demandas, movimentacoes, anotacoes, jurados, conselhoJuri, sessoesJuri, userInvitations, tipoPrazos, calculosPrazos, afastamentos, driveFiles, documentos, driveFileContents, activityLogs, assistidosProcessos, calculosPena, calendarEvents, caseFacts, casePersonas, analisesIa, pecasProcessuais, atendimentos, crossAnalyses, documentosJuri, dosimetriaJuri, speakerLabels, depoimentosAnalise, audienciasHistorico, calculosSeeu, casosConexos, compartilhamentos, diligenciaTemplates, diligencias, documentTemplates, documentoModelos, documentosGerados, driveDocumentSections, driveFileAnnotations, embeddings, extractionPatterns, factEvidence, feriadosForenses, juriScriptItems, medidasProtetivas, muralNotas, notifications, oficioAnalises, pareceres, plaudConfig, plaudRecordings, recursosJuri, roteiroPlenario, tesesDefensivas, testemunhas, whatsappContacts, whatsappChatMessages, evolutionConfig, whatsappMessages, whatsappConfig, partesVvd, intimacoesVvd, processosVvd, historicoMpu, radarMatches, radarNoticias, whatsappTemplates, legislacaoDestaques, noticiasTemas, noticiasJuridicas, noticiasFavoritos, noticiasPastas, referenciasBiblioteca, noticiasProcessos, noticiasPastaItens, noticiasFontes, whatsappConnectionLog, agentAnalyses, defensorParceiros, quesitos, personagensJuri, avaliacoesJuri, avaliacaoJurados, avaliacaoTestemunhasJuri, argumentosSustentacao, jurisprudenciaTemas, jurisprudenciaTeses, jurisprudenciaJulgados, jurisprudenciaBuscas, jurisprudenciaDriveFolders, feedbacks, palacioDiagramas, simulacaoPersonagens, simulacoes3D, palacioElementos, palacioConexoes, simulacaoObjetos, simulacaoVersoes, simulacaoKeyframes, simulacaoExportacoes, simulacaoAssets, documentEmbeddings, whatsappMessageActions, analisesCowork, syncLog, coworkTasks, chatHistory, institutos, delitos, factualArtigos, factualFavoritos, factualEdicoes, atosInfracionais, medidasSocioeducativas, subscriptions, payments, userGoogleTokens } from "./schema";

export const claudeCodeTasksRelations = relations(claudeCodeTasks, ({one}) => ({
	assistido: one(assistidos, {
		fields: [claudeCodeTasks.assistidoId],
		references: [assistidos.id]
	}),
	caso: one(casos, {
		fields: [claudeCodeTasks.casoId],
		references: [casos.id]
	}),
	user: one(users, {
		fields: [claudeCodeTasks.createdBy],
		references: [users.id]
	}),
	processo: one(processos, {
		fields: [claudeCodeTasks.processoId],
		references: [processos.id]
	}),
}));

export const assistidosRelations = relations(assistidos, ({one, many}) => ({
	claudeCodeTasks: many(claudeCodeTasks),
	distributionHistories: many(distributionHistory),
	casos: many(casos),
	processos: many(processos),
	audiencias: many(audiencias),
	delegacoesHistoricos: many(delegacoesHistorico),
	anotacoes: many(anotacoes),
	demandas: many(demandas),
	driveFiles: many(driveFiles),
	assistidosProcessos: many(assistidosProcessos),
	calculosPenas: many(calculosPena),
	calendarEvents: many(calendarEvents),
	caseFacts: many(caseFacts),
	casePersonas: many(casePersonas),
	analisesIas: many(analisesIa),
	atendimentos: many(atendimentos),
	crossAnalyses: many(crossAnalyses),
	speakerLabels: many(speakerLabels),
	calculosSeeus: many(calculosSeeu),
	diligencias: many(diligencias),
	documentos: many(documentos),
	documentosGerados: many(documentosGerados),
	embeddings: many(embeddings),
	medidasProtetivas: many(medidasProtetivas),
	muralNotas: many(muralNotas),
	pareceres: many(pareceres),
	pecasProcessuais: many(pecasProcessuais),
	plaudRecordings: many(plaudRecordings),
	whatsappMessages: many(whatsappMessages),
	partesVvds: many(partesVvd),
	radarMatches: many(radarMatches),
	whatsappContacts: many(whatsappContacts),
	comarca: one(comarcas, {
		fields: [assistidos.comarcaId],
		references: [comarcas.id]
	}),
	workspace: one(workspaces, {
		fields: [assistidos.workspaceId],
		references: [workspaces.id]
	}),
	documentEmbeddings: many(documentEmbeddings),
	analisesCoworks: many(analisesCowork),
	coworkTasks: many(coworkTasks),
	chatHistories: many(chatHistory),
	institutos: many(institutos),
	delitos: many(delitos),
	atosInfracionais: many(atosInfracionais),
	medidasSocioeducativas: many(medidasSocioeducativas),
}));

export const casosRelations = relations(casos, ({one, many}) => ({
	claudeCodeTasks: many(claudeCodeTasks),
	assistido: one(assistidos, {
		fields: [casos.assistidoId],
		references: [assistidos.id]
	}),
	workspace: one(workspaces, {
		fields: [casos.workspaceId],
		references: [workspaces.id]
	}),
	processos: many(processos),
	audiencias: many(audiencias),
	anotacoes: many(anotacoes),
	demandas: many(demandas),
	caseFacts: many(caseFacts),
	casePersonas: many(casePersonas),
	analisesIas: many(analisesIa),
	depoimentosAnalises: many(depoimentosAnalise),
	casosConexos_casoDestinoId: many(casosConexos, {
		relationName: "casosConexos_casoDestinoId_casos_id"
	}),
	casosConexos_casoOrigemId: many(casosConexos, {
		relationName: "casosConexos_casoOrigemId_casos_id"
	}),
	diligencias: many(diligencias),
	documentos: many(documentos),
	documentosGerados: many(documentosGerados),
	juriScriptItems: many(juriScriptItems),
	pecasProcessuais: many(pecasProcessuais),
	recursosJuris: many(recursosJuri),
	roteiroPlenarios: many(roteiroPlenario),
	tesesDefensivas: many(tesesDefensivas),
	testemunhas: many(testemunhas),
	radarMatches: many(radarMatches),
	referenciasBibliotecas: many(referenciasBiblioteca),
	quesitos: many(quesitos),
	palacioDiagramas: many(palacioDiagramas),
	simulacoes3DS: many(simulacoes3D),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	claudeCodeTasks: many(claudeCodeTasks),
	distributionHistories: many(distributionHistory),
	userSettings: many(userSettings),
	delegacoesHistoricos_delegadoDeId: many(delegacoesHistorico, {
		relationName: "delegacoesHistorico_delegadoDeId_users_id"
	}),
	delegacoesHistoricos_delegadoParaId: many(delegacoesHistorico, {
		relationName: "delegacoesHistorico_delegadoParaId_users_id"
	}),
	userInvitations_acceptedUserId: many(userInvitations, {
		relationName: "userInvitations_acceptedUserId_users_id"
	}),
	userInvitations_invitedById: many(userInvitations, {
		relationName: "userInvitations_invitedById_users_id"
	}),
	demandas: many(demandas),
	calculosPrazos: many(calculosPrazos),
	afastamentos_defensorId: many(afastamentos, {
		relationName: "afastamentos_defensorId_users_id"
	}),
	afastamentos_substitutoId: many(afastamentos, {
		relationName: "afastamentos_substitutoId_users_id"
	}),
	activityLogs: many(activityLogs),
	diligencias_criadoPorId: many(diligencias, {
		relationName: "diligencias_criadoPorId_users_id"
	}),
	diligencias_defensorId: many(diligencias, {
		relationName: "diligencias_defensorId_users_id"
	}),
	documentTemplates: many(documentTemplates),
	documentoModelos: many(documentoModelos),
	documentosGerados: many(documentosGerados),
	driveFileAnnotations: many(driveFileAnnotations),
	extractionPatterns: many(extractionPatterns),
	muralNotas: many(muralNotas),
	pareceres_respondedorId: many(pareceres, {
		relationName: "pareceres_respondedorId_users_id"
	}),
	pareceres_solicitanteId: many(pareceres, {
		relationName: "pareceres_solicitanteId_users_id"
	}),
	plaudConfigs: many(plaudConfig),
	evolutionConfigs: many(evolutionConfig),
	profissionais: many(profissionais),
	partesVvds: many(partesVvd),
	intimacoesVvds: many(intimacoesVvd),
	processosVvds: many(processosVvd),
	radarMatches: many(radarMatches),
	whatsappTemplates: many(whatsappTemplates),
	legislacaoDestaques: many(legislacaoDestaques),
	noticiasTemas: many(noticiasTemas),
	noticiasFavoritos: many(noticiasFavoritos),
	noticiasPastas: many(noticiasPastas),
	referenciasBibliotecas: many(referenciasBiblioteca),
	noticiasProcessos: many(noticiasProcessos),
	noticiasJuridicas: many(noticiasJuridicas),
	agentAnalyses_approvedById: many(agentAnalyses, {
		relationName: "agentAnalyses_approvedById_users_id"
	}),
	agentAnalyses_requestedById: many(agentAnalyses, {
		relationName: "agentAnalyses_requestedById_users_id"
	}),
	defensorParceiros_defensorId: many(defensorParceiros, {
		relationName: "defensorParceiros_defensorId_users_id"
	}),
	defensorParceiros_parceiroId: many(defensorParceiros, {
		relationName: "defensorParceiros_parceiroId_users_id"
	}),
	personagensJuris: many(personagensJuri),
	avaliacoesJuris: many(avaliacoesJuri),
	jurisprudenciaTemas: many(jurisprudenciaTemas),
	jurisprudenciaTeses: many(jurisprudenciaTeses),
	jurisprudenciaJulgados: many(jurisprudenciaJulgados),
	jurisprudenciaBuscas: many(jurisprudenciaBuscas),
	jurisprudenciaDriveFolders: many(jurisprudenciaDriveFolders),
	feedbacks: many(feedbacks),
	palacioDiagramas_atualizadoPorId: many(palacioDiagramas, {
		relationName: "palacioDiagramas_atualizadoPorId_users_id"
	}),
	palacioDiagramas_criadoPorId: many(palacioDiagramas, {
		relationName: "palacioDiagramas_criadoPorId_users_id"
	}),
	simulacoes3DS_atualizadoPorId: many(simulacoes3D, {
		relationName: "simulacoes3D_atualizadoPorId_users_id"
	}),
	simulacoes3DS_criadoPorId: many(simulacoes3D, {
		relationName: "simulacoes3D_criadoPorId_users_id"
	}),
	simulacaoExportacoes: many(simulacaoExportacoes),
	simulacaoAssets: many(simulacaoAssets),
	whatsappMessageActions: many(whatsappMessageActions),
	chatHistories: many(chatHistory),
	institutos: many(institutos),
	factualFavoritos: many(factualFavoritos),
	factualEdicoes: many(factualEdicoes),
	medidasSocioeducativas: many(medidasSocioeducativas),
	payments: many(payments),
	subscriptions: many(subscriptions),
	userGoogleTokens_userId: many(userGoogleTokens, {
		relationName: "userGoogleTokens_userId_users_id"
	}),
	userGoogleTokens_userId: many(userGoogleTokens, {
		relationName: "userGoogleTokens_userId_users_id"
	}),
	comarca: one(comarcas, {
		fields: [users.comarcaId],
		references: [comarcas.id]
	}),
	user: one(users, {
		fields: [users.supervisorId],
		references: [users.id],
		relationName: "users_supervisorId_users_id"
	}),
	users: many(users, {
		relationName: "users_supervisorId_users_id"
	}),
	workspace: one(workspaces, {
		fields: [users.workspaceId],
		references: [workspaces.id]
	}),
}));

export const processosRelations = relations(processos, ({one, many}) => ({
	claudeCodeTasks: many(claudeCodeTasks),
	distributionHistories: many(distributionHistory),
	assistido: one(assistidos, {
		fields: [processos.assistidoId],
		references: [assistidos.id]
	}),
	caso: one(casos, {
		fields: [processos.casoId],
		references: [casos.id]
	}),
	comarca: one(comarcas, {
		fields: [processos.comarcaId],
		references: [comarcas.id]
	}),
	workspace: one(workspaces, {
		fields: [processos.workspaceId],
		references: [workspaces.id]
	}),
	analysisJobs: many(analysisJobs),
	audiencias: many(audiencias),
	delegacoesHistoricos: many(delegacoesHistorico),
	movimentacoes: many(movimentacoes),
	anotacoes: many(anotacoes),
	demandas: many(demandas),
	driveFiles: many(driveFiles),
	assistidosProcessos: many(assistidosProcessos),
	calculosPenas: many(calculosPena),
	calendarEvents: many(calendarEvents),
	caseFacts: many(caseFacts),
	casePersonas: many(casePersonas),
	analisesIas: many(analisesIa),
	atendimentos: many(atendimentos),
	calculosSeeus: many(calculosSeeu),
	diligencias: many(diligencias),
	documentos: many(documentos),
	documentosGerados: many(documentosGerados),
	embeddings: many(embeddings),
	medidasProtetivas: many(medidasProtetivas),
	muralNotas: many(muralNotas),
	notifications: many(notifications),
	pareceres: many(pareceres),
	pecasProcessuais: many(pecasProcessuais),
	plaudRecordings: many(plaudRecordings),
	recursosJuris: many(recursosJuri),
	testemunhas: many(testemunhas),
	processosVvds: many(processosVvd),
	radarMatches: many(radarMatches),
	referenciasBibliotecas: many(referenciasBiblioteca),
	avaliacoesJuris: many(avaliacoesJuri),
	whatsappMessageActions: many(whatsappMessageActions),
	analisesCoworks: many(analisesCowork),
	coworkTasks: many(coworkTasks),
	institutos: many(institutos),
	delitos: many(delitos),
	atosInfracionais: many(atosInfracionais),
	medidasSocioeducativas: many(medidasSocioeducativas),
}));

export const distributionHistoryRelations = relations(distributionHistory, ({one}) => ({
	assistido: one(assistidos, {
		fields: [distributionHistory.assistidoId],
		references: [assistidos.id]
	}),
	user: one(users, {
		fields: [distributionHistory.correctedBy],
		references: [users.id]
	}),
	processo: one(processos, {
		fields: [distributionHistory.processoId],
		references: [processos.id]
	}),
	workspace: one(workspaces, {
		fields: [distributionHistory.workspaceId],
		references: [workspaces.id]
	}),
}));

export const workspacesRelations = relations(workspaces, ({many}) => ({
	distributionHistories: many(distributionHistory),
	casos: many(casos),
	processos: many(processos),
	audiencias: many(audiencias),
	delegacoesHistoricos: many(delegacoesHistorico),
	demandas: many(demandas),
	calculosPrazos: many(calculosPrazos),
	afastamentos: many(afastamentos),
	calendarEvents: many(calendarEvents),
	atendimentos: many(atendimentos),
	sessoesJuris: many(sessoesJuri),
	diligenciaTemplates: many(diligenciaTemplates),
	diligencias: many(diligencias),
	documentoModelos: many(documentoModelos),
	documentos: many(documentos),
	documentosGerados: many(documentosGerados),
	extractionPatterns: many(extractionPatterns),
	feriadosForenses: many(feriadosForenses),
	oficioAnalises: many(oficioAnalises),
	plaudConfigs: many(plaudConfig),
	tipoPrazos: many(tipoPrazos),
	evolutionConfigs: many(evolutionConfig),
	partesVvds: many(partesVvd),
	intimacoesVvds: many(intimacoesVvd),
	processosVvds: many(processosVvd),
	assistidos: many(assistidos),
	users: many(users),
}));

export const userSettingsRelations = relations(userSettings, ({one}) => ({
	user: one(users, {
		fields: [userSettings.userId],
		references: [users.id]
	}),
}));

export const comarcasRelations = relations(comarcas, ({many}) => ({
	processos: many(processos),
	escalasAtribuicaos: many(escalasAtribuicao),
	userInvitations: many(userInvitations),
	profissionais: many(profissionais),
	assistidos: many(assistidos),
	radarNoticias: many(radarNoticias),
	institutos: many(institutos),
	delitos: many(delitos),
	atosInfracionais: many(atosInfracionais),
	medidasSocioeducativas: many(medidasSocioeducativas),
	users: many(users),
}));

export const escalasAtribuicaoRelations = relations(escalasAtribuicao, ({one}) => ({
	comarca: one(comarcas, {
		fields: [escalasAtribuicao.comarcaId],
		references: [comarcas.id]
	}),
	profissionai: one(profissionais, {
		fields: [escalasAtribuicao.profissionalId],
		references: [profissionais.id]
	}),
}));

export const profissionaisRelations = relations(profissionais, ({one, many}) => ({
	escalasAtribuicaos: many(escalasAtribuicao),
	audiencias: many(audiencias),
	demandas_criadoPorId: many(demandas, {
		relationName: "demandas_criadoPorId_profissionais_id"
	}),
	demandas_responsavelId: many(demandas, {
		relationName: "demandas_responsavelId_profissionais_id"
	}),
	sessoesJuris: many(sessoesJuri),
	compartilhamentos_compartilhadoCom: many(compartilhamentos, {
		relationName: "compartilhamentos_compartilhadoCom_profissionais_id"
	}),
	compartilhamentos_compartilhadoPor: many(compartilhamentos, {
		relationName: "compartilhamentos_compartilhadoPor_profissionais_id"
	}),
	comarca: one(comarcas, {
		fields: [profissionais.comarcaId],
		references: [comarcas.id]
	}),
	user: one(users, {
		fields: [profissionais.userId],
		references: [users.id]
	}),
}));

export const analysisJobsRelations = relations(analysisJobs, ({one}) => ({
	processo: one(processos, {
		fields: [analysisJobs.processoId],
		references: [processos.id]
	}),
}));

export const audienciasRelations = relations(audiencias, ({one, many}) => ({
	assistido: one(assistidos, {
		fields: [audiencias.assistidoId],
		references: [assistidos.id]
	}),
	caso: one(casos, {
		fields: [audiencias.casoId],
		references: [casos.id]
	}),
	processo: one(processos, {
		fields: [audiencias.processoId],
		references: [processos.id]
	}),
	profissionai: one(profissionais, {
		fields: [audiencias.responsavelId],
		references: [profissionais.id]
	}),
	workspace: one(workspaces, {
		fields: [audiencias.workspaceId],
		references: [workspaces.id]
	}),
	audienciasHistoricos: many(audienciasHistorico),
	testemunhas: many(testemunhas),
	intimacoesVvds: many(intimacoesVvd),
	analisesCoworks: many(analisesCowork),
}));

export const delegacoesHistoricoRelations = relations(delegacoesHistorico, ({one}) => ({
	assistido: one(assistidos, {
		fields: [delegacoesHistorico.assistidoId],
		references: [assistidos.id]
	}),
	user_delegadoDeId: one(users, {
		fields: [delegacoesHistorico.delegadoDeId],
		references: [users.id],
		relationName: "delegacoesHistorico_delegadoDeId_users_id"
	}),
	user_delegadoParaId: one(users, {
		fields: [delegacoesHistorico.delegadoParaId],
		references: [users.id],
		relationName: "delegacoesHistorico_delegadoParaId_users_id"
	}),
	demanda: one(demandas, {
		fields: [delegacoesHistorico.demandaId],
		references: [demandas.id]
	}),
	processo: one(processos, {
		fields: [delegacoesHistorico.processoId],
		references: [processos.id]
	}),
	workspace: one(workspaces, {
		fields: [delegacoesHistorico.workspaceId],
		references: [workspaces.id]
	}),
}));

export const demandasRelations = relations(demandas, ({one, many}) => ({
	delegacoesHistoricos: many(delegacoesHistorico),
	anotacoes: many(anotacoes),
	assistido: one(assistidos, {
		fields: [demandas.assistidoId],
		references: [assistidos.id]
	}),
	caso: one(casos, {
		fields: [demandas.casoId],
		references: [casos.id]
	}),
	profissionai_criadoPorId: one(profissionais, {
		fields: [demandas.criadoPorId],
		references: [profissionais.id],
		relationName: "demandas_criadoPorId_profissionais_id"
	}),
	user: one(users, {
		fields: [demandas.delegadoParaId],
		references: [users.id]
	}),
	processo: one(processos, {
		fields: [demandas.processoId],
		references: [processos.id]
	}),
	profissionai_responsavelId: one(profissionais, {
		fields: [demandas.responsavelId],
		references: [profissionais.id],
		relationName: "demandas_responsavelId_profissionais_id"
	}),
	tipoPrazo: one(tipoPrazos, {
		fields: [demandas.tipoPrazoId],
		references: [tipoPrazos.id]
	}),
	workspace: one(workspaces, {
		fields: [demandas.workspaceId],
		references: [workspaces.id]
	}),
	calculosPrazos: many(calculosPrazos),
	calendarEvents: many(calendarEvents),
	documentos: many(documentos),
	documentosGerados: many(documentosGerados),
	notifications: many(notifications),
	intimacoesVvds: many(intimacoesVvd),
	syncLogs: many(syncLog),
}));

export const movimentacoesRelations = relations(movimentacoes, ({one}) => ({
	processo: one(processos, {
		fields: [movimentacoes.processoId],
		references: [processos.id]
	}),
}));

export const anotacoesRelations = relations(anotacoes, ({one}) => ({
	assistido: one(assistidos, {
		fields: [anotacoes.assistidoId],
		references: [assistidos.id]
	}),
	caso: one(casos, {
		fields: [anotacoes.casoId],
		references: [casos.id]
	}),
	demanda: one(demandas, {
		fields: [anotacoes.demandaId],
		references: [demandas.id]
	}),
	processo: one(processos, {
		fields: [anotacoes.processoId],
		references: [processos.id]
	}),
}));

export const conselhoJuriRelations = relations(conselhoJuri, ({one}) => ({
	jurado: one(jurados, {
		fields: [conselhoJuri.juradoId],
		references: [jurados.id]
	}),
	sessoesJuri: one(sessoesJuri, {
		fields: [conselhoJuri.sessaoId],
		references: [sessoesJuri.id]
	}),
}));

export const juradosRelations = relations(jurados, ({one, many}) => ({
	conselhoJuris: many(conselhoJuri),
	sessoesJuri: one(sessoesJuri, {
		fields: [jurados.sessaoJuriId],
		references: [sessoesJuri.id]
	}),
	casePersonas: many(casePersonas),
	avaliacaoJurados: many(avaliacaoJurados),
}));

export const sessoesJuriRelations = relations(sessoesJuri, ({one, many}) => ({
	conselhoJuris: many(conselhoJuri),
	jurados: many(jurados),
	documentosJuris: many(documentosJuri),
	dosimetriaJuris: many(dosimetriaJuri),
	profissionai: one(profissionais, {
		fields: [sessoesJuri.responsavelId],
		references: [profissionais.id]
	}),
	workspace: one(workspaces, {
		fields: [sessoesJuri.workspaceId],
		references: [workspaces.id]
	}),
	juriScriptItems: many(juriScriptItems),
	recursosJuris: many(recursosJuri),
	avaliacoesJuris: many(avaliacoesJuri),
}));

export const userInvitationsRelations = relations(userInvitations, ({one}) => ({
	user_acceptedUserId: one(users, {
		fields: [userInvitations.acceptedUserId],
		references: [users.id],
		relationName: "userInvitations_acceptedUserId_users_id"
	}),
	comarca: one(comarcas, {
		fields: [userInvitations.comarcaId],
		references: [comarcas.id]
	}),
	user_invitedById: one(users, {
		fields: [userInvitations.invitedById],
		references: [users.id],
		relationName: "userInvitations_invitedById_users_id"
	}),
}));

export const tipoPrazosRelations = relations(tipoPrazos, ({one, many}) => ({
	demandas: many(demandas),
	calculosPrazos: many(calculosPrazos),
	workspace: one(workspaces, {
		fields: [tipoPrazos.workspaceId],
		references: [workspaces.id]
	}),
}));

export const calculosPrazosRelations = relations(calculosPrazos, ({one}) => ({
	user: one(users, {
		fields: [calculosPrazos.calculadoPorId],
		references: [users.id]
	}),
	demanda: one(demandas, {
		fields: [calculosPrazos.demandaId],
		references: [demandas.id]
	}),
	tipoPrazo: one(tipoPrazos, {
		fields: [calculosPrazos.tipoPrazoId],
		references: [tipoPrazos.id]
	}),
	workspace: one(workspaces, {
		fields: [calculosPrazos.workspaceId],
		references: [workspaces.id]
	}),
}));

export const afastamentosRelations = relations(afastamentos, ({one}) => ({
	user_defensorId: one(users, {
		fields: [afastamentos.defensorId],
		references: [users.id],
		relationName: "afastamentos_defensorId_users_id"
	}),
	user_substitutoId: one(users, {
		fields: [afastamentos.substitutoId],
		references: [users.id],
		relationName: "afastamentos_substitutoId_users_id"
	}),
	workspace: one(workspaces, {
		fields: [afastamentos.workspaceId],
		references: [workspaces.id]
	}),
}));

export const driveFilesRelations = relations(driveFiles, ({one, many}) => ({
	assistido: one(assistidos, {
		fields: [driveFiles.assistidoId],
		references: [assistidos.id]
	}),
	documento: one(documentos, {
		fields: [driveFiles.documentoId],
		references: [documentos.id]
	}),
	processo: one(processos, {
		fields: [driveFiles.processoId],
		references: [processos.id]
	}),
	driveFileContents: many(driveFileContents),
	speakerLabels: many(speakerLabels),
	driveDocumentSections: many(driveDocumentSections),
	driveFileAnnotations: many(driveFileAnnotations),
	documentEmbeddings: many(documentEmbeddings),
}));

export const documentosRelations = relations(documentos, ({one, many}) => ({
	driveFiles: many(driveFiles),
	assistido: one(assistidos, {
		fields: [documentos.assistidoId],
		references: [assistidos.id]
	}),
	caso: one(casos, {
		fields: [documentos.casoId],
		references: [casos.id]
	}),
	demanda: one(demandas, {
		fields: [documentos.demandaId],
		references: [demandas.id]
	}),
	processo: one(processos, {
		fields: [documentos.processoId],
		references: [processos.id]
	}),
	workspace: one(workspaces, {
		fields: [documentos.workspaceId],
		references: [workspaces.id]
	}),
	factEvidences: many(factEvidence),
	palacioElementos: many(palacioElementos),
}));

export const driveFileContentsRelations = relations(driveFileContents, ({one}) => ({
	driveFile: one(driveFiles, {
		fields: [driveFileContents.driveFileId],
		references: [driveFiles.id]
	}),
}));

export const activityLogsRelations = relations(activityLogs, ({one}) => ({
	user: one(users, {
		fields: [activityLogs.userId],
		references: [users.id]
	}),
}));

export const assistidosProcessosRelations = relations(assistidosProcessos, ({one}) => ({
	assistido: one(assistidos, {
		fields: [assistidosProcessos.assistidoId],
		references: [assistidos.id]
	}),
	processo: one(processos, {
		fields: [assistidosProcessos.processoId],
		references: [processos.id]
	}),
}));

export const calculosPenaRelations = relations(calculosPena, ({one}) => ({
	assistido: one(assistidos, {
		fields: [calculosPena.assistidoId],
		references: [assistidos.id]
	}),
	processo: one(processos, {
		fields: [calculosPena.processoId],
		references: [processos.id]
	}),
}));

export const calendarEventsRelations = relations(calendarEvents, ({one}) => ({
	assistido: one(assistidos, {
		fields: [calendarEvents.assistidoId],
		references: [assistidos.id]
	}),
	demanda: one(demandas, {
		fields: [calendarEvents.demandaId],
		references: [demandas.id]
	}),
	processo: one(processos, {
		fields: [calendarEvents.processoId],
		references: [processos.id]
	}),
	workspace: one(workspaces, {
		fields: [calendarEvents.workspaceId],
		references: [workspaces.id]
	}),
}));

export const caseFactsRelations = relations(caseFacts, ({one, many}) => ({
	assistido: one(assistidos, {
		fields: [caseFacts.assistidoId],
		references: [assistidos.id]
	}),
	caso: one(casos, {
		fields: [caseFacts.casoId],
		references: [casos.id]
	}),
	processo: one(processos, {
		fields: [caseFacts.processoId],
		references: [processos.id]
	}),
	factEvidences: many(factEvidence),
	juriScriptItems: many(juriScriptItems),
	palacioElementos: many(palacioElementos),
}));

export const casePersonasRelations = relations(casePersonas, ({one, many}) => ({
	assistido: one(assistidos, {
		fields: [casePersonas.assistidoId],
		references: [assistidos.id]
	}),
	caso: one(casos, {
		fields: [casePersonas.casoId],
		references: [casos.id]
	}),
	jurado: one(jurados, {
		fields: [casePersonas.juradoId],
		references: [jurados.id]
	}),
	processo: one(processos, {
		fields: [casePersonas.processoId],
		references: [processos.id]
	}),
	depoimentosAnalises: many(depoimentosAnalise),
	diligencias: many(diligencias),
	juriScriptItems: many(juriScriptItems),
	simulacaoPersonagens: many(simulacaoPersonagens),
	palacioElementos: many(palacioElementos),
}));

export const analisesIaRelations = relations(analisesIa, ({one}) => ({
	assistido: one(assistidos, {
		fields: [analisesIa.assistidoId],
		references: [assistidos.id]
	}),
	caso: one(casos, {
		fields: [analisesIa.casoId],
		references: [casos.id]
	}),
	pecasProcessuai: one(pecasProcessuais, {
		fields: [analisesIa.pecaId],
		references: [pecasProcessuais.id]
	}),
	processo: one(processos, {
		fields: [analisesIa.processoId],
		references: [processos.id]
	}),
}));

export const pecasProcessuaisRelations = relations(pecasProcessuais, ({one, many}) => ({
	analisesIas: many(analisesIa),
	assistido: one(assistidos, {
		fields: [pecasProcessuais.assistidoId],
		references: [assistidos.id]
	}),
	caso: one(casos, {
		fields: [pecasProcessuais.casoId],
		references: [casos.id]
	}),
	processo: one(processos, {
		fields: [pecasProcessuais.processoId],
		references: [processos.id]
	}),
}));

export const atendimentosRelations = relations(atendimentos, ({one, many}) => ({
	assistido: one(assistidos, {
		fields: [atendimentos.assistidoId],
		references: [assistidos.id]
	}),
	processo: one(processos, {
		fields: [atendimentos.processoId],
		references: [processos.id]
	}),
	workspace: one(workspaces, {
		fields: [atendimentos.workspaceId],
		references: [workspaces.id]
	}),
	plaudRecordings: many(plaudRecordings),
}));

export const crossAnalysesRelations = relations(crossAnalyses, ({one}) => ({
	assistido: one(assistidos, {
		fields: [crossAnalyses.assistidoId],
		references: [assistidos.id]
	}),
}));

export const documentosJuriRelations = relations(documentosJuri, ({one}) => ({
	sessoesJuri: one(sessoesJuri, {
		fields: [documentosJuri.sessaoJuriId],
		references: [sessoesJuri.id]
	}),
}));

export const dosimetriaJuriRelations = relations(dosimetriaJuri, ({one}) => ({
	sessoesJuri: one(sessoesJuri, {
		fields: [dosimetriaJuri.sessaoJuriId],
		references: [sessoesJuri.id]
	}),
}));

export const speakerLabelsRelations = relations(speakerLabels, ({one}) => ({
	assistido: one(assistidos, {
		fields: [speakerLabels.assistidoId],
		references: [assistidos.id]
	}),
	driveFile: one(driveFiles, {
		fields: [speakerLabels.fileId],
		references: [driveFiles.id]
	}),
}));

export const depoimentosAnaliseRelations = relations(depoimentosAnalise, ({one}) => ({
	caso: one(casos, {
		fields: [depoimentosAnalise.casoId],
		references: [casos.id]
	}),
	casePersona: one(casePersonas, {
		fields: [depoimentosAnalise.personaId],
		references: [casePersonas.id]
	}),
}));

export const audienciasHistoricoRelations = relations(audienciasHistorico, ({one}) => ({
	audiencia: one(audiencias, {
		fields: [audienciasHistorico.audienciaId],
		references: [audiencias.id]
	}),
}));

export const calculosSeeuRelations = relations(calculosSeeu, ({one}) => ({
	assistido: one(assistidos, {
		fields: [calculosSeeu.assistidoId],
		references: [assistidos.id]
	}),
	processo: one(processos, {
		fields: [calculosSeeu.processoId],
		references: [processos.id]
	}),
}));

export const casosConexosRelations = relations(casosConexos, ({one}) => ({
	caso_casoDestinoId: one(casos, {
		fields: [casosConexos.casoDestinoId],
		references: [casos.id],
		relationName: "casosConexos_casoDestinoId_casos_id"
	}),
	caso_casoOrigemId: one(casos, {
		fields: [casosConexos.casoOrigemId],
		references: [casos.id],
		relationName: "casosConexos_casoOrigemId_casos_id"
	}),
}));

export const compartilhamentosRelations = relations(compartilhamentos, ({one}) => ({
	profissionai_compartilhadoCom: one(profissionais, {
		fields: [compartilhamentos.compartilhadoCom],
		references: [profissionais.id],
		relationName: "compartilhamentos_compartilhadoCom_profissionais_id"
	}),
	profissionai_compartilhadoPor: one(profissionais, {
		fields: [compartilhamentos.compartilhadoPor],
		references: [profissionais.id],
		relationName: "compartilhamentos_compartilhadoPor_profissionais_id"
	}),
}));

export const diligenciaTemplatesRelations = relations(diligenciaTemplates, ({one}) => ({
	workspace: one(workspaces, {
		fields: [diligenciaTemplates.workspaceId],
		references: [workspaces.id]
	}),
}));

export const diligenciasRelations = relations(diligencias, ({one}) => ({
	assistido: one(assistidos, {
		fields: [diligencias.assistidoId],
		references: [assistidos.id]
	}),
	caso: one(casos, {
		fields: [diligencias.casoId],
		references: [casos.id]
	}),
	user_criadoPorId: one(users, {
		fields: [diligencias.criadoPorId],
		references: [users.id],
		relationName: "diligencias_criadoPorId_users_id"
	}),
	user_defensorId: one(users, {
		fields: [diligencias.defensorId],
		references: [users.id],
		relationName: "diligencias_defensorId_users_id"
	}),
	casePersona: one(casePersonas, {
		fields: [diligencias.personaId],
		references: [casePersonas.id]
	}),
	processo: one(processos, {
		fields: [diligencias.processoId],
		references: [processos.id]
	}),
	workspace: one(workspaces, {
		fields: [diligencias.workspaceId],
		references: [workspaces.id]
	}),
}));

export const documentTemplatesRelations = relations(documentTemplates, ({one}) => ({
	user: one(users, {
		fields: [documentTemplates.createdBy],
		references: [users.id]
	}),
}));

export const documentoModelosRelations = relations(documentoModelos, ({one, many}) => ({
	user: one(users, {
		fields: [documentoModelos.createdById],
		references: [users.id]
	}),
	workspace: one(workspaces, {
		fields: [documentoModelos.workspaceId],
		references: [workspaces.id]
	}),
	documentosGerados: many(documentosGerados),
	oficioAnalises: many(oficioAnalises),
}));

export const documentosGeradosRelations = relations(documentosGerados, ({one}) => ({
	assistido: one(assistidos, {
		fields: [documentosGerados.assistidoId],
		references: [assistidos.id]
	}),
	caso: one(casos, {
		fields: [documentosGerados.casoId],
		references: [casos.id]
	}),
	user: one(users, {
		fields: [documentosGerados.createdById],
		references: [users.id]
	}),
	demanda: one(demandas, {
		fields: [documentosGerados.demandaId],
		references: [demandas.id]
	}),
	documentoModelo: one(documentoModelos, {
		fields: [documentosGerados.modeloId],
		references: [documentoModelos.id]
	}),
	processo: one(processos, {
		fields: [documentosGerados.processoId],
		references: [processos.id]
	}),
	workspace: one(workspaces, {
		fields: [documentosGerados.workspaceId],
		references: [workspaces.id]
	}),
}));

export const driveDocumentSectionsRelations = relations(driveDocumentSections, ({one}) => ({
	driveFile: one(driveFiles, {
		fields: [driveDocumentSections.driveFileId],
		references: [driveFiles.id]
	}),
}));

export const driveFileAnnotationsRelations = relations(driveFileAnnotations, ({one}) => ({
	driveFile: one(driveFiles, {
		fields: [driveFileAnnotations.driveFileId],
		references: [driveFiles.id]
	}),
	user: one(users, {
		fields: [driveFileAnnotations.userId],
		references: [users.id]
	}),
}));

export const embeddingsRelations = relations(embeddings, ({one}) => ({
	assistido: one(assistidos, {
		fields: [embeddings.assistidoId],
		references: [assistidos.id]
	}),
	processo: one(processos, {
		fields: [embeddings.processoId],
		references: [processos.id]
	}),
}));

export const extractionPatternsRelations = relations(extractionPatterns, ({one}) => ({
	user: one(users, {
		fields: [extractionPatterns.createdBy],
		references: [users.id]
	}),
	workspace: one(workspaces, {
		fields: [extractionPatterns.workspaceId],
		references: [workspaces.id]
	}),
}));

export const factEvidenceRelations = relations(factEvidence, ({one}) => ({
	documento: one(documentos, {
		fields: [factEvidence.documentoId],
		references: [documentos.id]
	}),
	caseFact: one(caseFacts, {
		fields: [factEvidence.factId],
		references: [caseFacts.id]
	}),
}));

export const feriadosForensesRelations = relations(feriadosForenses, ({one}) => ({
	workspace: one(workspaces, {
		fields: [feriadosForenses.workspaceId],
		references: [workspaces.id]
	}),
}));

export const juriScriptItemsRelations = relations(juriScriptItems, ({one}) => ({
	caso: one(casos, {
		fields: [juriScriptItems.casoId],
		references: [casos.id]
	}),
	caseFact: one(caseFacts, {
		fields: [juriScriptItems.factId],
		references: [caseFacts.id]
	}),
	casePersona: one(casePersonas, {
		fields: [juriScriptItems.personaId],
		references: [casePersonas.id]
	}),
	sessoesJuri: one(sessoesJuri, {
		fields: [juriScriptItems.sessaoJuriId],
		references: [sessoesJuri.id]
	}),
}));

export const medidasProtetivasRelations = relations(medidasProtetivas, ({one}) => ({
	assistido: one(assistidos, {
		fields: [medidasProtetivas.assistidoId],
		references: [assistidos.id]
	}),
	processo: one(processos, {
		fields: [medidasProtetivas.processoId],
		references: [processos.id]
	}),
}));

export const muralNotasRelations = relations(muralNotas, ({one}) => ({
	assistido: one(assistidos, {
		fields: [muralNotas.assistidoId],
		references: [assistidos.id]
	}),
	user: one(users, {
		fields: [muralNotas.autorId],
		references: [users.id]
	}),
	processo: one(processos, {
		fields: [muralNotas.processoId],
		references: [processos.id]
	}),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	demanda: one(demandas, {
		fields: [notifications.demandaId],
		references: [demandas.id]
	}),
	processo: one(processos, {
		fields: [notifications.processoId],
		references: [processos.id]
	}),
}));

export const oficioAnalisesRelations = relations(oficioAnalises, ({one}) => ({
	documentoModelo: one(documentoModelos, {
		fields: [oficioAnalises.modeloGeradoId],
		references: [documentoModelos.id]
	}),
	workspace: one(workspaces, {
		fields: [oficioAnalises.workspaceId],
		references: [workspaces.id]
	}),
}));

export const pareceresRelations = relations(pareceres, ({one}) => ({
	assistido: one(assistidos, {
		fields: [pareceres.assistidoId],
		references: [assistidos.id]
	}),
	processo: one(processos, {
		fields: [pareceres.processoId],
		references: [processos.id]
	}),
	user_respondedorId: one(users, {
		fields: [pareceres.respondedorId],
		references: [users.id],
		relationName: "pareceres_respondedorId_users_id"
	}),
	user_solicitanteId: one(users, {
		fields: [pareceres.solicitanteId],
		references: [users.id],
		relationName: "pareceres_solicitanteId_users_id"
	}),
}));

export const plaudConfigRelations = relations(plaudConfig, ({one, many}) => ({
	user: one(users, {
		fields: [plaudConfig.createdById],
		references: [users.id]
	}),
	workspace: one(workspaces, {
		fields: [plaudConfig.workspaceId],
		references: [workspaces.id]
	}),
	plaudRecordings: many(plaudRecordings),
}));

export const plaudRecordingsRelations = relations(plaudRecordings, ({one}) => ({
	assistido: one(assistidos, {
		fields: [plaudRecordings.assistidoId],
		references: [assistidos.id]
	}),
	atendimento: one(atendimentos, {
		fields: [plaudRecordings.atendimentoId],
		references: [atendimentos.id]
	}),
	plaudConfig: one(plaudConfig, {
		fields: [plaudRecordings.configId],
		references: [plaudConfig.id]
	}),
	processo: one(processos, {
		fields: [plaudRecordings.processoId],
		references: [processos.id]
	}),
}));

export const recursosJuriRelations = relations(recursosJuri, ({one}) => ({
	caso: one(casos, {
		fields: [recursosJuri.casoId],
		references: [casos.id]
	}),
	processo: one(processos, {
		fields: [recursosJuri.processoId],
		references: [processos.id]
	}),
	sessoesJuri: one(sessoesJuri, {
		fields: [recursosJuri.sessaoJuriId],
		references: [sessoesJuri.id]
	}),
}));

export const roteiroPlenarioRelations = relations(roteiroPlenario, ({one}) => ({
	caso: one(casos, {
		fields: [roteiroPlenario.casoId],
		references: [casos.id]
	}),
}));

export const tesesDefensivasRelations = relations(tesesDefensivas, ({one, many}) => ({
	caso: one(casos, {
		fields: [tesesDefensivas.casoId],
		references: [casos.id]
	}),
	quesitos: many(quesitos),
	palacioElementos: many(palacioElementos),
}));

export const testemunhasRelations = relations(testemunhas, ({one, many}) => ({
	audiencia: one(audiencias, {
		fields: [testemunhas.audienciaId],
		references: [audiencias.id]
	}),
	caso: one(casos, {
		fields: [testemunhas.casoId],
		references: [casos.id]
	}),
	processo: one(processos, {
		fields: [testemunhas.processoId],
		references: [processos.id]
	}),
	avaliacaoTestemunhasJuris: many(avaliacaoTestemunhasJuri),
	palacioElementos: many(palacioElementos),
}));

export const whatsappChatMessagesRelations = relations(whatsappChatMessages, ({one, many}) => ({
	whatsappContact: one(whatsappContacts, {
		fields: [whatsappChatMessages.contactId],
		references: [whatsappContacts.id]
	}),
	whatsappMessageActions: many(whatsappMessageActions),
}));

export const whatsappContactsRelations = relations(whatsappContacts, ({one, many}) => ({
	whatsappChatMessages: many(whatsappChatMessages),
	assistido: one(assistidos, {
		fields: [whatsappContacts.assistidoId],
		references: [assistidos.id]
	}),
	evolutionConfig: one(evolutionConfig, {
		fields: [whatsappContacts.configId],
		references: [evolutionConfig.id]
	}),
}));

export const evolutionConfigRelations = relations(evolutionConfig, ({one, many}) => ({
	user: one(users, {
		fields: [evolutionConfig.createdById],
		references: [users.id]
	}),
	workspace: one(workspaces, {
		fields: [evolutionConfig.workspaceId],
		references: [workspaces.id]
	}),
	whatsappContacts: many(whatsappContacts),
	whatsappConnectionLogs: many(whatsappConnectionLog),
}));

export const whatsappMessagesRelations = relations(whatsappMessages, ({one}) => ({
	assistido: one(assistidos, {
		fields: [whatsappMessages.assistidoId],
		references: [assistidos.id]
	}),
	whatsappConfig: one(whatsappConfig, {
		fields: [whatsappMessages.configId],
		references: [whatsappConfig.id]
	}),
}));

export const whatsappConfigRelations = relations(whatsappConfig, ({many}) => ({
	whatsappMessages: many(whatsappMessages),
}));

export const partesVvdRelations = relations(partesVvd, ({one, many}) => ({
	assistido: one(assistidos, {
		fields: [partesVvd.assistidoId],
		references: [assistidos.id]
	}),
	user: one(users, {
		fields: [partesVvd.defensorId],
		references: [users.id]
	}),
	workspace: one(workspaces, {
		fields: [partesVvd.workspaceId],
		references: [workspaces.id]
	}),
	processosVvds_requerenteId: many(processosVvd, {
		relationName: "processosVvd_requerenteId_partesVvd_id"
	}),
	processosVvds_requeridoId: many(processosVvd, {
		relationName: "processosVvd_requeridoId_partesVvd_id"
	}),
}));

export const intimacoesVvdRelations = relations(intimacoesVvd, ({one}) => ({
	audiencia: one(audiencias, {
		fields: [intimacoesVvd.audienciaId],
		references: [audiencias.id]
	}),
	user: one(users, {
		fields: [intimacoesVvd.defensorId],
		references: [users.id]
	}),
	demanda: one(demandas, {
		fields: [intimacoesVvd.demandaId],
		references: [demandas.id]
	}),
	processosVvd: one(processosVvd, {
		fields: [intimacoesVvd.processoVvdId],
		references: [processosVvd.id]
	}),
	workspace: one(workspaces, {
		fields: [intimacoesVvd.workspaceId],
		references: [workspaces.id]
	}),
}));

export const processosVvdRelations = relations(processosVvd, ({one, many}) => ({
	intimacoesVvds: many(intimacoesVvd),
	historicoMpus: many(historicoMpu),
	user: one(users, {
		fields: [processosVvd.defensorId],
		references: [users.id]
	}),
	processo: one(processos, {
		fields: [processosVvd.processoId],
		references: [processos.id]
	}),
	partesVvd_requerenteId: one(partesVvd, {
		fields: [processosVvd.requerenteId],
		references: [partesVvd.id],
		relationName: "processosVvd_requerenteId_partesVvd_id"
	}),
	partesVvd_requeridoId: one(partesVvd, {
		fields: [processosVvd.requeridoId],
		references: [partesVvd.id],
		relationName: "processosVvd_requeridoId_partesVvd_id"
	}),
	workspace: one(workspaces, {
		fields: [processosVvd.workspaceId],
		references: [workspaces.id]
	}),
}));

export const historicoMpuRelations = relations(historicoMpu, ({one}) => ({
	processosVvd: one(processosVvd, {
		fields: [historicoMpu.processoVvdId],
		references: [processosVvd.id]
	}),
}));

export const radarMatchesRelations = relations(radarMatches, ({one}) => ({
	assistido: one(assistidos, {
		fields: [radarMatches.assistidoId],
		references: [assistidos.id]
	}),
	caso: one(casos, {
		fields: [radarMatches.casoId],
		references: [casos.id]
	}),
	user: one(users, {
		fields: [radarMatches.confirmedBy],
		references: [users.id]
	}),
	radarNoticia: one(radarNoticias, {
		fields: [radarMatches.noticiaId],
		references: [radarNoticias.id]
	}),
	processo: one(processos, {
		fields: [radarMatches.processoId],
		references: [processos.id]
	}),
}));

export const radarNoticiasRelations = relations(radarNoticias, ({one, many}) => ({
	radarMatches: many(radarMatches),
	comarca: one(comarcas, {
		fields: [radarNoticias.comarcaId],
		references: [comarcas.id]
	}),
}));

export const whatsappTemplatesRelations = relations(whatsappTemplates, ({one}) => ({
	user: one(users, {
		fields: [whatsappTemplates.createdById],
		references: [users.id]
	}),
}));

export const legislacaoDestaquesRelations = relations(legislacaoDestaques, ({one}) => ({
	user: one(users, {
		fields: [legislacaoDestaques.userId],
		references: [users.id]
	}),
}));

export const noticiasTemasRelations = relations(noticiasTemas, ({one}) => ({
	user: one(users, {
		fields: [noticiasTemas.userId],
		references: [users.id]
	}),
}));

export const noticiasFavoritosRelations = relations(noticiasFavoritos, ({one}) => ({
	noticiasJuridica: one(noticiasJuridicas, {
		fields: [noticiasFavoritos.noticiaId],
		references: [noticiasJuridicas.id]
	}),
	user: one(users, {
		fields: [noticiasFavoritos.userId],
		references: [users.id]
	}),
}));

export const noticiasJuridicasRelations = relations(noticiasJuridicas, ({one, many}) => ({
	noticiasFavoritos: many(noticiasFavoritos),
	noticiasProcessos: many(noticiasProcessos),
	noticiasPastaItens: many(noticiasPastaItens),
	user: one(users, {
		fields: [noticiasJuridicas.aprovadoPor],
		references: [users.id]
	}),
	noticiasFonte: one(noticiasFontes, {
		fields: [noticiasJuridicas.fonteId],
		references: [noticiasFontes.id]
	}),
}));

export const noticiasPastasRelations = relations(noticiasPastas, ({one, many}) => ({
	user: one(users, {
		fields: [noticiasPastas.userId],
		references: [users.id]
	}),
	noticiasPastaItens: many(noticiasPastaItens),
}));

export const referenciasBibliotecaRelations = relations(referenciasBiblioteca, ({one}) => ({
	caso: one(casos, {
		fields: [referenciasBiblioteca.casoId],
		references: [casos.id]
	}),
	user: one(users, {
		fields: [referenciasBiblioteca.createdById],
		references: [users.id]
	}),
	processo: one(processos, {
		fields: [referenciasBiblioteca.processoId],
		references: [processos.id]
	}),
}));

export const noticiasProcessosRelations = relations(noticiasProcessos, ({one}) => ({
	noticiasJuridica: one(noticiasJuridicas, {
		fields: [noticiasProcessos.noticiaId],
		references: [noticiasJuridicas.id]
	}),
	user: one(users, {
		fields: [noticiasProcessos.userId],
		references: [users.id]
	}),
}));

export const noticiasPastaItensRelations = relations(noticiasPastaItens, ({one}) => ({
	noticiasJuridica: one(noticiasJuridicas, {
		fields: [noticiasPastaItens.noticiaId],
		references: [noticiasJuridicas.id]
	}),
	noticiasPasta: one(noticiasPastas, {
		fields: [noticiasPastaItens.pastaId],
		references: [noticiasPastas.id]
	}),
}));

export const noticiasFontesRelations = relations(noticiasFontes, ({many}) => ({
	noticiasJuridicas: many(noticiasJuridicas),
}));

export const whatsappConnectionLogRelations = relations(whatsappConnectionLog, ({one}) => ({
	evolutionConfig: one(evolutionConfig, {
		fields: [whatsappConnectionLog.configId],
		references: [evolutionConfig.id]
	}),
}));

export const agentAnalysesRelations = relations(agentAnalyses, ({one}) => ({
	user_approvedById: one(users, {
		fields: [agentAnalyses.approvedById],
		references: [users.id],
		relationName: "agentAnalyses_approvedById_users_id"
	}),
	user_requestedById: one(users, {
		fields: [agentAnalyses.requestedById],
		references: [users.id],
		relationName: "agentAnalyses_requestedById_users_id"
	}),
}));

export const defensorParceirosRelations = relations(defensorParceiros, ({one}) => ({
	user_defensorId: one(users, {
		fields: [defensorParceiros.defensorId],
		references: [users.id],
		relationName: "defensorParceiros_defensorId_users_id"
	}),
	user_parceiroId: one(users, {
		fields: [defensorParceiros.parceiroId],
		references: [users.id],
		relationName: "defensorParceiros_parceiroId_users_id"
	}),
}));

export const quesitosRelations = relations(quesitos, ({one}) => ({
	caso: one(casos, {
		fields: [quesitos.casoId],
		references: [casos.id]
	}),
	tesesDefensiva: one(tesesDefensivas, {
		fields: [quesitos.teseId],
		references: [tesesDefensivas.id]
	}),
}));

export const personagensJuriRelations = relations(personagensJuri, ({one}) => ({
	user: one(users, {
		fields: [personagensJuri.createdById],
		references: [users.id]
	}),
}));

export const avaliacoesJuriRelations = relations(avaliacoesJuri, ({one, many}) => ({
	user: one(users, {
		fields: [avaliacoesJuri.criadoPorId],
		references: [users.id]
	}),
	processo: one(processos, {
		fields: [avaliacoesJuri.processoId],
		references: [processos.id]
	}),
	sessoesJuri: one(sessoesJuri, {
		fields: [avaliacoesJuri.sessaoJuriId],
		references: [sessoesJuri.id]
	}),
	avaliacaoJurados: many(avaliacaoJurados),
	avaliacaoTestemunhasJuris: many(avaliacaoTestemunhasJuri),
	argumentosSustentacaos: many(argumentosSustentacao),
}));

export const avaliacaoJuradosRelations = relations(avaliacaoJurados, ({one}) => ({
	avaliacoesJuri: one(avaliacoesJuri, {
		fields: [avaliacaoJurados.avaliacaoJuriId],
		references: [avaliacoesJuri.id]
	}),
	jurado: one(jurados, {
		fields: [avaliacaoJurados.juradoId],
		references: [jurados.id]
	}),
}));

export const avaliacaoTestemunhasJuriRelations = relations(avaliacaoTestemunhasJuri, ({one}) => ({
	avaliacoesJuri: one(avaliacoesJuri, {
		fields: [avaliacaoTestemunhasJuri.avaliacaoJuriId],
		references: [avaliacoesJuri.id]
	}),
	testemunha: one(testemunhas, {
		fields: [avaliacaoTestemunhasJuri.testemunhaId],
		references: [testemunhas.id]
	}),
}));

export const argumentosSustentacaoRelations = relations(argumentosSustentacao, ({one}) => ({
	avaliacoesJuri: one(avaliacoesJuri, {
		fields: [argumentosSustentacao.avaliacaoJuriId],
		references: [avaliacoesJuri.id]
	}),
}));

export const jurisprudenciaTemasRelations = relations(jurisprudenciaTemas, ({one, many}) => ({
	user: one(users, {
		fields: [jurisprudenciaTemas.createdById],
		references: [users.id]
	}),
	jurisprudenciaTeses: many(jurisprudenciaTeses),
	jurisprudenciaJulgados: many(jurisprudenciaJulgados),
	jurisprudenciaDriveFolders: many(jurisprudenciaDriveFolders),
}));

export const jurisprudenciaTesesRelations = relations(jurisprudenciaTeses, ({one, many}) => ({
	user: one(users, {
		fields: [jurisprudenciaTeses.createdById],
		references: [users.id]
	}),
	jurisprudenciaTema: one(jurisprudenciaTemas, {
		fields: [jurisprudenciaTeses.temaId],
		references: [jurisprudenciaTemas.id]
	}),
	jurisprudenciaJulgados: many(jurisprudenciaJulgados),
}));

export const jurisprudenciaJulgadosRelations = relations(jurisprudenciaJulgados, ({one}) => ({
	user: one(users, {
		fields: [jurisprudenciaJulgados.createdById],
		references: [users.id]
	}),
	jurisprudenciaTema: one(jurisprudenciaTemas, {
		fields: [jurisprudenciaJulgados.temaId],
		references: [jurisprudenciaTemas.id]
	}),
	jurisprudenciaTese: one(jurisprudenciaTeses, {
		fields: [jurisprudenciaJulgados.teseId],
		references: [jurisprudenciaTeses.id]
	}),
}));

export const jurisprudenciaBuscasRelations = relations(jurisprudenciaBuscas, ({one}) => ({
	user: one(users, {
		fields: [jurisprudenciaBuscas.userId],
		references: [users.id]
	}),
}));

export const jurisprudenciaDriveFoldersRelations = relations(jurisprudenciaDriveFolders, ({one}) => ({
	user: one(users, {
		fields: [jurisprudenciaDriveFolders.createdById],
		references: [users.id]
	}),
	jurisprudenciaTema: one(jurisprudenciaTemas, {
		fields: [jurisprudenciaDriveFolders.temaId],
		references: [jurisprudenciaTemas.id]
	}),
}));

export const feedbacksRelations = relations(feedbacks, ({one}) => ({
	user: one(users, {
		fields: [feedbacks.userId],
		references: [users.id]
	}),
}));

export const palacioDiagramasRelations = relations(palacioDiagramas, ({one, many}) => ({
	user_atualizadoPorId: one(users, {
		fields: [palacioDiagramas.atualizadoPorId],
		references: [users.id],
		relationName: "palacioDiagramas_atualizadoPorId_users_id"
	}),
	caso: one(casos, {
		fields: [palacioDiagramas.casoId],
		references: [casos.id]
	}),
	user_criadoPorId: one(users, {
		fields: [palacioDiagramas.criadoPorId],
		references: [users.id],
		relationName: "palacioDiagramas_criadoPorId_users_id"
	}),
	palacioElementos: many(palacioElementos),
	palacioConexoes: many(palacioConexoes),
}));

export const simulacaoPersonagensRelations = relations(simulacaoPersonagens, ({one, many}) => ({
	casePersona: one(casePersonas, {
		fields: [simulacaoPersonagens.personaId],
		references: [casePersonas.id]
	}),
	simulacoes3D: one(simulacoes3D, {
		fields: [simulacaoPersonagens.simulacaoId],
		references: [simulacoes3D.id]
	}),
	simulacaoKeyframes: many(simulacaoKeyframes),
}));

export const simulacoes3DRelations = relations(simulacoes3D, ({one, many}) => ({
	simulacaoPersonagens: many(simulacaoPersonagens),
	user_atualizadoPorId: one(users, {
		fields: [simulacoes3D.atualizadoPorId],
		references: [users.id],
		relationName: "simulacoes3D_atualizadoPorId_users_id"
	}),
	caso: one(casos, {
		fields: [simulacoes3D.casoId],
		references: [casos.id]
	}),
	user_criadoPorId: one(users, {
		fields: [simulacoes3D.criadoPorId],
		references: [users.id],
		relationName: "simulacoes3D_criadoPorId_users_id"
	}),
	simulacaoObjetos: many(simulacaoObjetos),
	simulacaoVersoes: many(simulacaoVersoes),
}));

export const palacioElementosRelations = relations(palacioElementos, ({one, many}) => ({
	palacioDiagrama: one(palacioDiagramas, {
		fields: [palacioElementos.diagramaId],
		references: [palacioDiagramas.id]
	}),
	documento: one(documentos, {
		fields: [palacioElementos.documentoId],
		references: [documentos.id]
	}),
	caseFact: one(caseFacts, {
		fields: [palacioElementos.fatoId],
		references: [caseFacts.id]
	}),
	casePersona: one(casePersonas, {
		fields: [palacioElementos.personaId],
		references: [casePersonas.id]
	}),
	tesesDefensiva: one(tesesDefensivas, {
		fields: [palacioElementos.teseId],
		references: [tesesDefensivas.id]
	}),
	testemunha: one(testemunhas, {
		fields: [palacioElementos.testemunhaId],
		references: [testemunhas.id]
	}),
	palacioConexoes_elementoDestinoId: many(palacioConexoes, {
		relationName: "palacioConexoes_elementoDestinoId_palacioElementos_id"
	}),
	palacioConexoes_elementoOrigemId: many(palacioConexoes, {
		relationName: "palacioConexoes_elementoOrigemId_palacioElementos_id"
	}),
}));

export const palacioConexoesRelations = relations(palacioConexoes, ({one}) => ({
	palacioDiagrama: one(palacioDiagramas, {
		fields: [palacioConexoes.diagramaId],
		references: [palacioDiagramas.id]
	}),
	palacioElemento_elementoDestinoId: one(palacioElementos, {
		fields: [palacioConexoes.elementoDestinoId],
		references: [palacioElementos.id],
		relationName: "palacioConexoes_elementoDestinoId_palacioElementos_id"
	}),
	palacioElemento_elementoOrigemId: one(palacioElementos, {
		fields: [palacioConexoes.elementoOrigemId],
		references: [palacioElementos.id],
		relationName: "palacioConexoes_elementoOrigemId_palacioElementos_id"
	}),
}));

export const simulacaoObjetosRelations = relations(simulacaoObjetos, ({one, many}) => ({
	simulacoes3D: one(simulacoes3D, {
		fields: [simulacaoObjetos.simulacaoId],
		references: [simulacoes3D.id]
	}),
	simulacaoKeyframes: many(simulacaoKeyframes),
}));

export const simulacaoVersoesRelations = relations(simulacaoVersoes, ({one, many}) => ({
	simulacoes3D: one(simulacoes3D, {
		fields: [simulacaoVersoes.simulacaoId],
		references: [simulacoes3D.id]
	}),
	simulacaoKeyframes: many(simulacaoKeyframes),
	simulacaoExportacoes: many(simulacaoExportacoes),
}));

export const simulacaoKeyframesRelations = relations(simulacaoKeyframes, ({one}) => ({
	simulacaoObjeto: one(simulacaoObjetos, {
		fields: [simulacaoKeyframes.objetoId],
		references: [simulacaoObjetos.id]
	}),
	simulacaoPersonagen: one(simulacaoPersonagens, {
		fields: [simulacaoKeyframes.personagemId],
		references: [simulacaoPersonagens.id]
	}),
	simulacaoVersoe: one(simulacaoVersoes, {
		fields: [simulacaoKeyframes.versaoId],
		references: [simulacaoVersoes.id]
	}),
}));

export const simulacaoExportacoesRelations = relations(simulacaoExportacoes, ({one}) => ({
	user: one(users, {
		fields: [simulacaoExportacoes.criadoPorId],
		references: [users.id]
	}),
	simulacaoVersoe: one(simulacaoVersoes, {
		fields: [simulacaoExportacoes.versaoId],
		references: [simulacaoVersoes.id]
	}),
}));

export const simulacaoAssetsRelations = relations(simulacaoAssets, ({one}) => ({
	user: one(users, {
		fields: [simulacaoAssets.criadoPorId],
		references: [users.id]
	}),
}));

export const documentEmbeddingsRelations = relations(documentEmbeddings, ({one}) => ({
	assistido: one(assistidos, {
		fields: [documentEmbeddings.assistidoId],
		references: [assistidos.id]
	}),
	driveFile: one(driveFiles, {
		fields: [documentEmbeddings.fileId],
		references: [driveFiles.id]
	}),
}));

export const whatsappMessageActionsRelations = relations(whatsappMessageActions, ({one}) => ({
	user: one(users, {
		fields: [whatsappMessageActions.createdById],
		references: [users.id]
	}),
	whatsappChatMessage: one(whatsappChatMessages, {
		fields: [whatsappMessageActions.messageId],
		references: [whatsappChatMessages.id]
	}),
	processo: one(processos, {
		fields: [whatsappMessageActions.processoId],
		references: [processos.id]
	}),
}));

export const analisesCoworkRelations = relations(analisesCowork, ({one}) => ({
	assistido: one(assistidos, {
		fields: [analisesCowork.assistidoId],
		references: [assistidos.id]
	}),
	audiencia: one(audiencias, {
		fields: [analisesCowork.audienciaId],
		references: [audiencias.id]
	}),
	processo: one(processos, {
		fields: [analisesCowork.processoId],
		references: [processos.id]
	}),
}));

export const syncLogRelations = relations(syncLog, ({one}) => ({
	demanda: one(demandas, {
		fields: [syncLog.demandaId],
		references: [demandas.id]
	}),
}));

export const coworkTasksRelations = relations(coworkTasks, ({one}) => ({
	assistido: one(assistidos, {
		fields: [coworkTasks.assistidoId],
		references: [assistidos.id]
	}),
	processo: one(processos, {
		fields: [coworkTasks.processoId],
		references: [processos.id]
	}),
}));

export const chatHistoryRelations = relations(chatHistory, ({one}) => ({
	assistido: one(assistidos, {
		fields: [chatHistory.assistidoId],
		references: [assistidos.id]
	}),
	user: one(users, {
		fields: [chatHistory.userId],
		references: [users.id]
	}),
}));

export const institutosRelations = relations(institutos, ({one}) => ({
	assistido: one(assistidos, {
		fields: [institutos.assistidoId],
		references: [assistidos.id]
	}),
	comarca: one(comarcas, {
		fields: [institutos.comarcaId],
		references: [comarcas.id]
	}),
	user: one(users, {
		fields: [institutos.defensorId],
		references: [users.id]
	}),
	processo: one(processos, {
		fields: [institutos.processoId],
		references: [processos.id]
	}),
}));

export const delitosRelations = relations(delitos, ({one}) => ({
	assistido: one(assistidos, {
		fields: [delitos.assistidoId],
		references: [assistidos.id]
	}),
	comarca: one(comarcas, {
		fields: [delitos.comarcaId],
		references: [comarcas.id]
	}),
	processo: one(processos, {
		fields: [delitos.processoId],
		references: [processos.id]
	}),
}));

export const factualFavoritosRelations = relations(factualFavoritos, ({one}) => ({
	factualArtigo: one(factualArtigos, {
		fields: [factualFavoritos.artigoId],
		references: [factualArtigos.id]
	}),
	user: one(users, {
		fields: [factualFavoritos.userId],
		references: [users.id]
	}),
}));

export const factualArtigosRelations = relations(factualArtigos, ({one, many}) => ({
	factualFavoritos: many(factualFavoritos),
	factualEdicoe: one(factualEdicoes, {
		fields: [factualArtigos.edicaoId],
		references: [factualEdicoes.id]
	}),
}));

export const factualEdicoesRelations = relations(factualEdicoes, ({one, many}) => ({
	user: one(users, {
		fields: [factualEdicoes.publicadoPor],
		references: [users.id]
	}),
	factualArtigos: many(factualArtigos),
}));

export const atosInfracionaisRelations = relations(atosInfracionais, ({one}) => ({
	assistido: one(assistidos, {
		fields: [atosInfracionais.assistidoId],
		references: [assistidos.id]
	}),
	comarca: one(comarcas, {
		fields: [atosInfracionais.comarcaId],
		references: [comarcas.id]
	}),
	processo: one(processos, {
		fields: [atosInfracionais.processoId],
		references: [processos.id]
	}),
}));

export const medidasSocioeducativasRelations = relations(medidasSocioeducativas, ({one}) => ({
	assistido: one(assistidos, {
		fields: [medidasSocioeducativas.assistidoId],
		references: [assistidos.id]
	}),
	comarca: one(comarcas, {
		fields: [medidasSocioeducativas.comarcaId],
		references: [comarcas.id]
	}),
	user: one(users, {
		fields: [medidasSocioeducativas.defensorId],
		references: [users.id]
	}),
	processo: one(processos, {
		fields: [medidasSocioeducativas.processoId],
		references: [processos.id]
	}),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	subscription: one(subscriptions, {
		fields: [payments.subscriptionId],
		references: [subscriptions.id]
	}),
	user: one(users, {
		fields: [payments.userId],
		references: [users.id]
	}),
}));

export const subscriptionsRelations = relations(subscriptions, ({one, many}) => ({
	payments: many(payments),
	user: one(users, {
		fields: [subscriptions.userId],
		references: [users.id]
	}),
}));

export const userGoogleTokensRelations = relations(userGoogleTokens, ({one}) => ({
	user_userId: one(users, {
		fields: [userGoogleTokens.userId],
		references: [users.id],
		relationName: "userGoogleTokens_userId_users_id"
	}),
	user_userId: one(users, {
		fields: [userGoogleTokens.userId],
		references: [users.id],
		relationName: "userGoogleTokens_userId_users_id"
	}),
}));