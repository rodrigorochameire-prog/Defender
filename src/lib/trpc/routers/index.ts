import { router } from "../init";
import { authRouter } from "./auth";
import { usersRouter } from "./users";
import { calendarRouter } from "./calendar";
import { notificationsRouter } from "./notifications";
import { documentsRouter } from "./documents";
import { whatsappRouter } from "./whatsapp";
import { assistidosRouter } from "./assistidos";
import { processosRouter } from "./processos";
import { demandasRouter } from "./demandas";
import { juriRouter } from "./juri";
import { driveRouter } from "./drive";
import { casosRouter } from "./casos";

export const appRouter = router({
  // Autenticação
  auth: authRouter,
  
  // Gestão de usuários
  users: usersRouter,
  
  // Casos (Entidade Mestre - Case-Centric)
  casos: casosRouter,
  
  // Assistidos (pessoas atendidas pela Defensoria)
  assistidos: assistidosRouter,
  
  // Processos judiciais
  processos: processosRouter,
  
  // Demandas e prazos
  demandas: demandasRouter,
  
  // Tribunal do Júri
  juri: juriRouter,
  
  // Calendário (audiências, prazos, eventos)
  calendar: calendarRouter,
  
  // Documentos e peças processuais
  documents: documentsRouter,
  
  // Notificações
  notifications: notificationsRouter,
  
  // Integração WhatsApp
  whatsapp: whatsappRouter,
  
  // Integração Google Drive
  drive: driveRouter,
});

export type AppRouter = typeof appRouter;
