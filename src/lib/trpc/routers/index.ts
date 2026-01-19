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
import { driveRouter } from "./drive";

// Routers compartilhados
import { calendarRouter } from "./calendar";
import { notificationsRouter } from "./notifications";
import { notificationTemplatesRouter } from "./notificationTemplates";
import { documentsRouter } from "./documents";
import { whatsappRouter } from "./whatsapp";
import { auditLogsRouter } from "./auditLogs";
import { dashboardRouter } from "./dashboard";

// Routers do TeteCare (pets) - mantidos para compatibilidade
import { petsRouter } from "./pets";
import { tutorsRouter } from "./tutors";
import { bookingsRouter } from "./bookings";
import { checkinRouter } from "./checkin";
import { behaviorRouter } from "./behavior";
import { trainingRouter } from "./training";
import { vaccinesRouter } from "./vaccines";
import { medicationsRouter } from "./medications";
import { preventivesRouter } from "./preventives";
import { foodRouter } from "./food";
import { wallRouter } from "./wall";
import { reportsRouter } from "./reports";
import { reviewsRouter } from "./reviews";
import { packagesRouter } from "./packages";
import { creditsRouter } from "./credits";
import { financesRouter } from "./finances";
import { statsRouter } from "./stats";
import { logsRouter } from "./logs";

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
  dashboard: dashboardRouter,
  
  // ==========================================
  // TETECARE - MÓDULOS DE PETS (COMPATIBILIDADE)
  // ==========================================
  pets: petsRouter,
  tutors: tutorsRouter,
  bookings: bookingsRouter,
  checkin: checkinRouter,
  behavior: behaviorRouter,
  training: trainingRouter,
  vaccines: vaccinesRouter,
  medications: medicationsRouter,
  preventives: preventivesRouter,
  food: foodRouter,
  wall: wallRouter,
  reports: reportsRouter,
  reviews: reviewsRouter,
  packages: packagesRouter,
  credits: creditsRouter,
  finances: financesRouter,
  stats: statsRouter,
  logs: logsRouter,
});

export type AppRouter = typeof appRouter;
