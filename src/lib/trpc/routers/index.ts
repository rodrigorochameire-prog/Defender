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

// Routers compartilhados
import { calendarRouter } from "./calendar";
import { notificationsRouter } from "./notifications";
import { notificationTemplatesRouter } from "./notificationTemplates";
import { documentsRouter } from "./documents";
import { whatsappRouter } from "./whatsapp";
import { auditLogsRouter } from "./auditLogs";
import { delegacaoRouter } from "./delegacao";
import { activityLogsRouter } from "./activity-logs";


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
});

export type AppRouter = typeof appRouter;
