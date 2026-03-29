import { router } from "../init";

// Routers de autenticação e usuários
import { authRouter } from "./auth";
import { usersRouter } from "./users";
// Routers do DefesaHub (jurídico)
import { casosRouter } from "./casos";
import { assistidosRouter } from "./assistidos";
import { processosRouter } from "./processos";
import { demandasRouter } from "./demandas";
import { juriRouter } from "./juri";
import { avaliacaoJuriRouter } from "./avaliacaoJuri";
import { audienciasRouter } from "./audiencias";
import { eventosRouter } from "./eventos";
import { driveRouter } from "./drive";
import { profissionaisRouter } from "./profissionais";
import { diligenciasRouter } from "./diligencias";
import { atendimentosRouter } from "./atendimentos";

// Routers compartilhados
import { calendarRouter } from "./calendar";
import { notificationsRouter } from "./notifications";
import { notificationTemplatesRouter } from "./notificationTemplates";
import { documentsRouter } from "./documents";
import { whatsappRouter } from "./whatsapp";
import { whatsappChatRouter } from "./whatsapp-chat";
import { auditLogsRouter } from "./auditLogs";
import { delegacaoRouter } from "./delegacao";
import { activityLogsRouter } from "./activity-logs";
import { juradosRouter } from "./jurados";
import { modelosRouter } from "./modelos";
import { jurisprudenciaRouter } from "./jurisprudencia";
import { prazosRouter } from "./prazos";
import { vvdRouter } from "./vvd";
import { palacioRouter } from "./palacio";
import { simuladorRouter } from "./simulador";
import { distribuicaoRouter } from "./distribuicao";
import { smartExtractRouter } from "./smart-extract";
import { briefingRouter } from "./briefing";
import { coberturaRouter } from "./cobertura";
import { coberturasRouter } from "./coberturas";
import { acompanhamentoRouter } from "./acompanhamento";
import { parecerRouter } from "./parecer";
import { pareceresRouter } from "./pareceres";
import { muralRouter } from "./mural";
import { enrichmentRouter } from "./enrichment";
import { solarRouter } from "./solar";
import { searchRouter } from "./search";
import { intelligenceRouter } from "./intelligence";
import { documentSectionsRouter } from "./document-sections";
import { annotationsRouter } from "./annotations";
import { settingsRouter } from "./settings";
import { tesesRouter } from "./teses";
import { oficiosRouter } from "./oficios";
import { templatesRouter } from "./templates";
import { preparacaoRouter } from "./preparacao";
import { offlineRouter } from "./offline";
import { speakerLabelsRouter } from "./speakerLabels";
import { juriAnalyticsRouter } from "./juriAnalytics";
import { posJuriRouter } from "./posJuri";
import { radarRouter } from "./radar";
import { legislacaoRouter } from "./legislacao";
import { noticiasRouter } from "./noticias";
import { bibliotecaRouter } from "./biblioteca";
import { comarcasRouter } from "./comarcas";
import { observatoryRouter } from "./observatory";
import { syncRouter } from "./sync";
import { skillsRouter } from "./skills";
import { institutosRouter } from "./institutos";
import { delitosRouter } from "./delitos";
import { factualRouter } from "./factual";
import { atosInfracionaisRouter } from "./atos-infracionais";
import { medidasSocioeducativasRouter } from "./medidas-socioeducativas";
import { subscriptionsRouter } from "./subscriptions";


export const appRouter = router({
  // ==========================================
  // AUTENTICAÇÃO E USUÁRIOS
  // ==========================================
  auth: authRouter,
  users: usersRouter,
  // ==========================================
  // DEFESAHUB - MÓDULOS JURÍDICOS
  // ==========================================
  casos: casosRouter,
  assistidos: assistidosRouter,
  processos: processosRouter,
  demandas: demandasRouter,
  juri: juriRouter,
  avaliacaoJuri: avaliacaoJuriRouter,
  audiencias: audienciasRouter,
  eventos: eventosRouter, // Alias para audiências (usado por daily-progress, status-bar)
  drive: driveRouter,
  profissionais: profissionaisRouter,
  diligencias: diligenciasRouter,
  
  // ==========================================
  // COMPARTILHADOS
  // ==========================================
  calendar: calendarRouter,
  notifications: notificationsRouter,
  notificationTemplates: notificationTemplatesRouter,
  documents: documentsRouter,
  whatsapp: whatsappRouter,
  auditLogs: auditLogsRouter,
  
  // ==========================================
  // SISTEMA DE EQUIPE
  // ==========================================
  delegacao: delegacaoRouter,
  activityLogs: activityLogsRouter,
  
  // ==========================================
  // JÚRI - CORPO DE JURADOS
  // ==========================================
  jurados: juradosRouter,

  // ==========================================
  // MODELOS DE DOCUMENTOS
  // ==========================================
  modelos: modelosRouter,

  // ==========================================
  // WHATSAPP CHAT (EVOLUTION API)
  // ==========================================
  whatsappChat: whatsappChatRouter,

  // ==========================================
  // ATENDIMENTOS (PLAUD INTEGRATION)
  // ==========================================
  atendimentos: atendimentosRouter,

  // ==========================================
  // JURISPRUDÊNCIA - BANCO DE JULGADOS
  // ==========================================
  jurisprudencia: jurisprudenciaRouter,

  // ==========================================
  // PRAZOS - CÁLCULO AUTOMÁTICO
  // ==========================================
  prazos: prazosRouter,

  // ==========================================
  // VVD - VIOLÊNCIA DOMÉSTICA / MPU
  // ==========================================
  vvd: vvdRouter,

  // ==========================================
  // PALÁCIO DA MENTE - DIAGRAMAS DE INVESTIGAÇÃO
  // ==========================================
  palacio: palacioRouter,

  // ==========================================
  // SIMULADOR 3D - RECONSTITUIÇÃO FORENSE
  // ==========================================
  simulador: simuladorRouter,

  // ==========================================
  // DISTRIBUIÇÃO AUTOMÁTICA DE DOCUMENTOS
  // ==========================================
  distribuicao: distribuicaoRouter,

  // ==========================================
  // EXTRAÇÃO INTELIGENTE DE DOCUMENTOS (IA)
  // ==========================================
  smartExtract: smartExtractRouter,

  // ==========================================
  // BRIEFING DE AUDIÊNCIAS (IA)
  // ==========================================
  briefing: briefingRouter,

  // ==========================================
  // COWORK - COBERTURA (AFASTAMENTOS)
  // ==========================================
  cobertura: coberturaRouter,
  coberturas: coberturasRouter,

  // ==========================================
  // COWORK - ACOMPANHAMENTO (SEGUIR ENTIDADES)
  // ==========================================
  acompanhamento: acompanhamentoRouter,

  // ==========================================
  // COWORK - PARECER (CONSULTAS RÁPIDAS)
  // ==========================================
  parecer: parecerRouter,

  // ==========================================
  // COWORK - PARECERES (RECEBIDOS/ENVIADOS)
  // ==========================================
  pareceres: pareceresRouter,

  // ==========================================
  // COWORK - MURAL DE EQUIPE (NOTAS)
  // ==========================================
  mural: muralRouter,

  // ==========================================
  // ENRICHMENT ENGINE (SISTEMA NERVOSO DEFENSIVO)
  // ==========================================
  enrichment: enrichmentRouter,

  // ==========================================
  // SOLAR (INTEGRAÇÃO DPEBA - PROCESSOS)
  // ==========================================
  solar: solarRouter,

  // ==========================================
  // PESQUISA SEMÂNTICA (PGVECTOR)
  // ==========================================
  search: searchRouter,

  // ==========================================
  // INTELIGÊNCIA — SISTEMA NERVOSO DEFENSIVO
  // ==========================================
  intelligence: intelligenceRouter,

  // ==========================================
  // SEÇÕES DE DOCUMENTOS PDF (ENRICHMENT PIPELINE)
  // ==========================================
  documentSections: documentSectionsRouter,

  // ==========================================
  // ANOTAÇÕES EM PDF (HIGHLIGHTS E NOTAS)
  // ==========================================
  annotations: annotationsRouter,

  // ==========================================
  // CONFIGURAÇÕES DO USUÁRIO
  // ==========================================
  settings: settingsRouter,

  // ==========================================
  // TESES DEFENSIVAS (ESTRATÉGIA)
  // ==========================================
  teses: tesesRouter,

  // ==========================================
  // OFÍCIOS (GERAÇÃO + IA + ANÁLISE DRIVE)
  // ==========================================
  oficios: oficiosRouter,

  // ==========================================
  // TEMPLATES DE DOCUMENTOS (GOOGLE DRIVE)
  // ==========================================
  templates: templatesRouter,

  // ==========================================
  // PREPARAÇÃO PRÉ-JÚRI (CHECKLIST, DOSSIE, WAR ROOM, QUESITOS, SIMULAÇÃO)
  // ==========================================
  preparacao: preparacaoRouter,

  // ==========================================
  // OFFLINE SYNC (PWA / INDEXEDDB)
  // ==========================================
  offline: offlineRouter,

  // ==========================================
  // SPEAKER LABELS (DIARIZAÇÃO DE TRANSCRIÇÕES)
  // ==========================================
  speakerLabels: speakerLabelsRouter,

  // ==========================================
  // ANALYTICS DO JÚRI (COSMOVISÃO)
  // ==========================================
  juriAnalytics: juriAnalyticsRouter,

  // ==========================================
  // PÓS-JÚRI (RECURSOS + EXECUÇÃO)
  // ==========================================
  posJuri: posJuriRouter,

  // ==========================================
  // RADAR CRIMINAL (INTELIGÊNCIA CRIMINAL)
  // ==========================================
  radar: radarRouter,

  // ==========================================
  // LEGISLACAO - CONSULTA DE LEIS
  // ==========================================
  legislacao: legislacaoRouter,

  // ==========================================
  // NOTICIAS JURIDICAS - FEED + CURADORIA
  // ==========================================
  noticias: noticiasRouter,

  // ==========================================
  // BIBLIOTECA JURIDICA - TESES, ARTIGOS, LEIS
  // ==========================================
  biblioteca: bibliotecaRouter,

  // ==========================================
  // COMARCAS - CONFIGURAÇÃO E FEATURES POR COMARCA
  // ==========================================
  comarcas: comarcasRouter,

  // ==========================================
  // OBSERVATORY - PAINEL ADMINISTRATIVO
  // ==========================================
  observatory: observatoryRouter,

  // ==========================================
  // SYNC - GERENCIAMENTO DE CONFLITOS
  // ==========================================
  sync: syncRouter,

  // ==========================================
  // SKILLS ENGINE - CHAT HISTORY + AUTOCOMPLETE
  // ==========================================
  skills: skillsRouter,

  // ==========================================
  // INSTITUTOS PROCESSUAIS (ANPP, SURSIS, TRANSAÇÃO, COMPOSIÇÃO)
  // ==========================================
  institutos: institutosRouter,

  // ==========================================
  // DELITOS (TIPIFICAÇÃO + BENEFÍCIOS AUTOMÁTICOS)
  // ==========================================
  delitos: delitosRouter,

  // ==========================================
  // NOTÍCIAS FACTUAIS — DIÁRIO DA BAHIA
  // ==========================================
  factual: factualRouter,

  // ==========================================
  // INFÂNCIA E JUVENTUDE (ECA)
  // ==========================================
  atosInfracionais: atosInfracionaisRouter,
  medidasSocioeducativas: medidasSocioeducativasRouter,

  // ==========================================
  // ASSINATURAS E PAGAMENTOS
  // ==========================================
  subscriptions: subscriptionsRouter,
});

export type AppRouter = typeof appRouter;
