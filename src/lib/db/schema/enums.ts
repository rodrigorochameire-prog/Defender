import { pgEnum } from "drizzle-orm/pg-core";

// ==========================================
// ENUMS JURÍDICOS
// ==========================================

// O Coração da Divisão - Atribuições/Workspaces
export const atribuicaoEnum = pgEnum("atribuicao", [
  "JURI_CAMACARI",      // Vara do Júri Camaçari (Processual + Plenário Local)
  "VVD_CAMACARI",       // Violência Doméstica
  "EXECUCAO_PENAL",     // Execução Penal
  "SUBSTITUICAO",       // Substituição Criminal
  "SUBSTITUICAO_CIVEL", // Substituição Não Penal (Cível, Família, etc.)
  "GRUPO_JURI",         // Grupo Especial de Atuação (Apenas Plenários pelo Estado)
]);

// Áreas de atuação da Defensoria (compatibilidade)
export const areaEnum = pgEnum("area", [
  "JURI",
  "EXECUCAO_PENAL",
  "VIOLENCIA_DOMESTICA",
  "SUBSTITUICAO",
  "CURADORIA",
  "FAMILIA",
  "CIVEL",
  "FAZENDA_PUBLICA",
]);

// Status prisional do assistido
export const statusPrisionalEnum = pgEnum("status_prisional", [
  "SOLTO",
  "CADEIA_PUBLICA",
  "PENITENCIARIA",
  "COP",
  "HOSPITAL_CUSTODIA",
  "DOMICILIAR",
  "MONITORADO",
]);

// Status das demandas/prazos
export const statusDemandaEnum = pgEnum("status_demanda", [
  "2_ATENDER",
  "4_MONITORAR",
  "5_FILA",
  "7_PROTOCOLADO",
  "7_CIENCIA",
  "7_SEM_ATUACAO",
  "URGENTE",
  "CONCLUIDO",
  "ARQUIVADO",
]);

// Prioridade
export const prioridadeEnum = pgEnum("prioridade", [
  "BAIXA",
  "NORMAL",
  "ALTA",
  "URGENTE",
  "REU_PRESO",
]);

// Unidade/Comarca de atuação
export const unidadeEnum = pgEnum("unidade", [
  "CAMACARI",
  "CANDEIAS",
  "DIAS_DAVILA",
  "SIMOES_FILHO",
  "LAURO_DE_FREITAS",
  "SALVADOR",
]);

// Status do processo
export const statusProcessoEnum = pgEnum("status_processo", [
  "FLAGRANTE",
  "INQUERITO",
  "INSTRUCAO",
  "RECURSO",
  "EXECUCAO",
  "ARQUIVADO",
]);

// Tipo penal do juri
export const tipoPenalJuriEnum = pgEnum("tipo_penal_juri", [
  "homicidio_simples",
  "homicidio_qualificado",
  "homicidio_privilegiado",
  "homicidio_privilegiado_qualificado",
  "homicidio_tentado",
  "feminicidio",
]);

// Resultado do quesito
export const quesitosResultadoEnum = pgEnum("quesitos_resultado", [
  "sim",
  "nao",
  "prejudicado",
]);

// Regime inicial
export const regimeInicialEnum = pgEnum("regime_inicial", [
  "fechado",
  "semiaberto",
  "aberto",
]);

// Tipo de documento do juri
export const documentoJuriTipoEnum = pgEnum("documento_juri_tipo", [
  "quesitos",
  "sentenca",
  "ata",
]);

// Status da apelação (pós-júri)
export const statusApelacaoEnum = pgEnum("status_apelacao", [
  "interposta",
  "admitida",
  "em_julgamento",
  "julgada",
  "transitada",
]);

// Resultado da apelação/recurso
export const resultadoRecursoEnum = pgEnum("resultado_recurso", [
  "provido",
  "parcialmente_provido",
  "improvido",
  "nao_conhecido",
]);

// Status do caso
export const statusCasoEnum = pgEnum("status_caso", [
  "ATIVO",
  "SUSPENSO",
  "ARQUIVADO",
]);

// Fase do caso
export const faseCasoEnum = pgEnum("fase_caso", [
  "INQUERITO",
  "INSTRUCAO",
  "PLENARIO",
  "RECURSO",
  "EXECUCAO",
  "ARQUIVADO",
]);

// Tipo de audiência
export const tipoAudienciaEnum = pgEnum("tipo_audiencia", [
  "INSTRUCAO",
  "CUSTODIA",
  "CONCILIACAO",
  "JUSTIFICACAO",
  "ADMONICAO",
  "UNA",
  "PLENARIO_JURI",
  "CONTINUACAO",
  "OUTRA",
]);

// Status da audiência
export const statusAudienciaEnum = pgEnum("status_audiencia", [
  "A_DESIGNAR",
  "DESIGNADA",
  "REALIZADA",
  "AGUARDANDO_ATA",
  "CONCLUIDA",
  "ADIADA",
  "CANCELADA",
]);

// Diligências
export const diligenciaStatusEnum = pgEnum("diligencia_status", [
  "A_PESQUISAR",
  "EM_ANDAMENTO",
  "AGUARDANDO",
  "LOCALIZADO",
  "OBTIDO",
  "INFRUTIFERO",
  "ARQUIVADO",
]);

export const diligenciaTipoEnum = pgEnum("diligencia_tipo", [
  "LOCALIZACAO_PESSOA",
  "LOCALIZACAO_DOCUMENTO",
  "REQUISICAO_DOCUMENTO",
  "PESQUISA_OSINT",
  "DILIGENCIA_CAMPO",
  "INTIMACAO",
  "OITIVA",
  "PERICIA",
  "EXAME",
  "OUTRO",
]);

// VVD
export const statusMPUEnum = pgEnum("status_mpu", [
  "ATIVA",
  "EXPIRADA",
  "REVOGADA",
  "RENOVADA",
  "MODULADA",
  "AGUARDANDO_DECISAO",
]);

export const tipoIntimacaoEnum = pgEnum("tipo_intimacao", [
  "CIENCIA",
  "PETICIONAR",
  "AUDIENCIA",
  "CUMPRIMENTO",
]);

// VVD - Canal de Entrada
export const canalEntradaVVDEnum = pgEnum("canal_entrada_vvd", [
  "audiencia_custodia",
  "plantao",
  "vara_vvd",
  "delegacia",
  "espontanea",
  "outro",
]);

// VVD - Tipo de Relato
export const tipoRelatoVVDEnum = pgEnum("tipo_relato_vvd", [
  "versao_do_fato",
  "negativa_total",
  "negativa_parcial",
  "confissao",
  "sem_contato",
]);

// Comunicação
export const chatMessageTypeEnum = pgEnum("chat_message_type", [
  "text",
  "image",
  "audio",
  "video",
  "document",
  "sticker",
  "location",
  "contact",
  "unknown",
]);

// Drive
export const syncDirectionEnum = pgEnum("sync_direction", [
  "bidirectional",
  "drive_to_app",
  "app_to_drive",
]);

export const syncStatusEnum = pgEnum("sync_status", [
  "synced",
  "pending_upload",
  "pending_download",
  "conflict",
  "error",
]);

// Vinculação assistidos-processos
export const papelProcessoEnum = pgEnum("papel_processo", [
  "REU",
  "CORREU",
  "VITIMA",
  "TESTEMUNHA",
  "DENUNCIANTE",
  "QUERELANTE",
  "ASSISTENTE",
]);

export const extractionStatusEnum = pgEnum("extraction_status", [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
  "SKIPPED",
]);

export const analysisTypeEnum = pgEnum("analysis_type", [
  "EXTRACAO",
  "ESTRATEGIA",
  "PREPARACAO",
  "ENRIQUECIMENTO",
]);

// Peças processuais
export const tipoPecaProcessualEnum = pgEnum("tipo_peca_processual", [
  "DENUNCIA",
  "QUEIXA_CRIME",
  "PRONUNCIA",
  "IMPRONUNCIA",
  "ABSOLVICAO_SUMARIA",
  "SENTENCA",
  "ACORDAO",
  "LAUDO_PERICIAL",
  "LAUDO_CADAVERICO",
  "LAUDO_PSIQUIATRICO",
  "LAUDO_TOXICOLOGICO",
  "ATA_AUDIENCIA",
  "ATA_INTERROGATORIO",
  "ATA_PLENARIO",
  "DEPOIMENTO",
  "BOLETIM_OCORRENCIA",
  "AUTO_PRISAO",
  "MANDADO",
  "DECISAO_INTERLOCUTORIA",
  "QUESITOS",
  "MEMORIAL",
  "OUTRO",
]);

// Análises IA
export const tipoAnaliseIAEnum = pgEnum("tipo_analise_ia", [
  "RESUMO_CASO",
  "ANALISE_DENUNCIA",
  "TESES_DEFENSIVAS",
  "ANALISE_PROVAS",
  "RISCO_CONDENACAO",
  "JURISPRUDENCIA",
  "ESTRATEGIA_JURI",
  "PERFIL_JURADOS",
  "COMPARACAO_CASOS",
  "TIMELINE",
  "PONTOS_FRACOS",
  "QUESITACAO",
  "MEMORIAL_DRAFT",
  "OUTRO",
]);

// Testemunhas
export const tipoTestemunhaEnum = pgEnum("tipo_testemunha", [
  "DEFESA",
  "ACUSACAO",
  "COMUM",
  "INFORMANTE",
  "PERITO",
  "VITIMA",
]);

export const statusTestemunhaEnum = pgEnum("status_testemunha", [
  "ARROLADA",
  "INTIMADA",
  "OUVIDA",
  "DESISTIDA",
  "NAO_LOCALIZADA",
  "CARTA_PRECATORIA",
]);

// Avaliação Júri
export const tendenciaVotoEnum = pgEnum("tendencia_voto", [
  "CONDENAR",
  "ABSOLVER",
  "INDECISO",
]);

export const nivelConfiancaEnum = pgEnum("nivel_confianca", [
  "BAIXA",
  "MEDIA",
  "ALTA",
]);

// Equipe
export const grupoTrabalhoEnum = pgEnum("grupo_trabalho", [
  "juri_ep_vvd",
  "varas_criminais",
]);

export const atribuicaoRotativaEnum = pgEnum("atribuicao_rotativa", [
  "JURI_EP",
  "VVD",
]);

// Logs
export const acaoLogEnum = pgEnum("acao_log", [
  "CREATE",
  "UPDATE",
  "DELETE",
  "VIEW",
  "COMPLETE",
  "DELEGATE",
  "UPLOAD",
  "SYNC",
]);

export const entidadeLogEnum = pgEnum("entidade_log", [
  "demanda",
  "assistido",
  "processo",
  "documento",
  "audiencia",
  "delegacao",
  "caso",
  "jurado",
]);

// Modelos de documentos
export const modeloCategoriaEnum = pgEnum("modelo_categoria", [
  "PROVIDENCIA_ADMINISTRATIVA",
  "PROVIDENCIA_FUNCIONAL",
  "PROVIDENCIA_INSTITUCIONAL",
  "PECA_PROCESSUAL",
  "COMUNICACAO",
  "OUTRO",
]);

// Ofício análises
export const oficioAnaliseStatusEnum = pgEnum("oficio_analise_status", [
  "pendente",
  "processando",
  "concluido",
  "erro",
]);

// Jurisprudência
export const tribunalEnum = pgEnum("tribunal", [
  "STF",
  "STJ",
  "TJBA",
  "TRF1",
  "TRF3",
  "OUTRO",
]);

export const tipoDecisaoEnum = pgEnum("tipo_decisao", [
  "ACORDAO",
  "DECISAO_MONOCRATICA",
  "SUMULA",
  "SUMULA_VINCULANTE",
  "REPERCUSSAO_GERAL",
  "RECURSO_REPETITIVO",
  "INFORMATIVO",
  "OUTRO",
]);

// Prazos
export const areaDireitoEnum = pgEnum("area_direito", [
  "CRIMINAL",
  "CIVEL",
  "TRABALHISTA",
  "EXECUCAO_PENAL",
  "JURI",
]);

// Palácio da Mente
export const diagramaTipoEnum = pgEnum("diagrama_tipo", [
  "MAPA_MENTAL",
  "TIMELINE",
  "RELACIONAL",
  "HIERARQUIA",
  "MATRIX",
  "FLUXOGRAMA",
  "LIVRE",
]);

// Simulador 3D
export const simulacaoStatusEnum = pgEnum("simulacao_status", [
  "RASCUNHO",
  "PRONTO",
  "APRESENTADO",
  "ARQUIVADO",
]);

// Distribuição automática
export const patternTypeEnum = pgEnum("pattern_type", [
  "orgao",
  "classe",
  "parte",
  "numero",
]);

// Radar Criminal
export const tipoCrimeRadarEnum = pgEnum("tipo_crime_radar", [
  "homicidio",
  "tentativa_homicidio",
  "feminicidio",
  "trafico",
  "roubo",
  "furto",
  "violencia_domestica",
  "sexual",
  "lesao_corporal",
  "porte_arma",
  "estelionato",
  "execucao_penal",
  "outros",
]);

export const circunstanciaRadarEnum = pgEnum("circunstancia_radar", [
  "flagrante",
  "mandado",
  "denuncia",
  "operacao",
  "investigacao",
  "julgamento",
]);

export const radarMatchStatusEnum = pgEnum("radar_match_status", [
  "auto_confirmado",
  "possivel",
  "descartado",
  "confirmado_manual",
]);

export const radarEnrichmentStatusEnum = pgEnum("radar_enrichment_status", [
  "pending",
  "extracted",
  "matched",
  "analyzed",
  "failed",
  "duplicate",
]);

export const radarFonteTipoEnum = pgEnum("radar_fonte_tipo", [
  "portal",
  "rss",
  "instagram",
  "twitter",
  "facebook",
]);

export const radarFonteConfiabilidadeEnum = pgEnum("radar_fonte_confiabilidade", [
  "local",      // Portal exclusivamente de Camaçari
  "regional",   // Portal da RMS/Bahia com seção de Camaçari
  "estadual",   // Portal estadual/nacional com cobertura esporádica
]);
