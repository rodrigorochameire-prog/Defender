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
import { driveRouter } from "./drive";

// Routers compartilhados
import { calendarRouter } from "./calendar";
import { notificationsRouter } from "./notifications";
import { notificationTemplatesRouter } from "./notificationTemplates";
import { documentsRouter } from "./documents";
import { whatsappRouter } from "./whatsapp";
import { auditLogsRouter } from "./auditLogs";


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
  drive: driveRouter,
  
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
});

export type AppRouter = typeof appRouter;
