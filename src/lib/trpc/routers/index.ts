import { router } from "../init";

// Routers de autenticação e usuários
import { authRouter } from "./auth";
import { usersRouter } from "./users";
import { workspacesRouter } from "./workspaces";

// Routers do DefesaHub (jurídico)
import { casosRouter } from "./casos";
import { assistidosRouter } from "./assistidos";
import { processosRouter } from "./processos";
import { demandasRouter } from "./demandas";
import { juriRouter } from "./juri";
import { avaliacaoJuriRouter } from "./avaliacaoJuri";
import { audienciasRouter } from "./audiencias";
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


export const appRouter = router({
  // ==========================================
  // AUTENTICAÇÃO E USUÁRIOS
  // ==========================================
  auth: authRouter,
  users: usersRouter,
  workspaces: workspacesRouter,
  
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
  // INVESTIGAÇÃO - DILIGÊNCIAS
  // ==========================================
  diligencias: diligenciasRouter,

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
});

export type AppRouter = typeof appRouter;
