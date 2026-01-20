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
import { driveRouter } from "./drive";

// Routers compartilhados
import { calendarRouter } from "./calendar";
import { notificationsRouter } from "./notifications";
import { notificationTemplatesRouter } from "./notificationTemplates";
import { documentsRouter } from "./documents";
import { whatsappRouter } from "./whatsapp";
import { auditLogsRouter } from "./auditLogs";

// Routers do TeteCare (gestão de pets)
import { petsRouter } from "./pets";
import { creditsRouter } from "./credits";
import { vaccinesRouter } from "./vaccines";
import { medicationsRouter } from "./medications";
import { preventivesRouter } from "./preventives";
import { analyticsRouter } from "./analytics";
import { trainingRouter } from "./training";
import { logsRouter } from "./logs";
import { wallRouter } from "./wall";
import { bookingsRouter } from "./bookings";
import { foodRouter } from "./food";
import { reportsRouter } from "./reports";
import { dashboardRouter } from "./dashboard";
import { checkinRouter } from "./checkin";
import { aiRouter } from "./ai";
import { alertsRouter } from "./alerts";
import { behaviorRouter } from "./behavior";
import { financesRouter } from "./finances";
import { packagesRouter } from "./packages";
import { tutorsRouter } from "./tutors";
import { reviewsRouter } from "./reviews";


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
  // TETECARE - GESTÃO DE PETS
  // ==========================================
  pets: petsRouter,
  credits: creditsRouter,
  vaccines: vaccinesRouter,
  medications: medicationsRouter,
  preventives: preventivesRouter,
  analytics: analyticsRouter,
  training: trainingRouter,
  logs: logsRouter,
  wall: wallRouter,
  bookings: bookingsRouter,
  food: foodRouter,
  reports: reportsRouter,
  dashboard: dashboardRouter,
  checkin: checkinRouter,
  ai: aiRouter,
  alerts: alertsRouter,
  behavior: behaviorRouter,
  finances: financesRouter,
  packages: packagesRouter,
  tutors: tutorsRouter,
  reviews: reviewsRouter,
});

export type AppRouter = typeof appRouter;
