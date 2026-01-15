import { router } from "../init";
import { authRouter } from "./auth";
import { petsRouter } from "./pets";
import { usersRouter } from "./users";
import { calendarRouter } from "./calendar";
import { statsRouter } from "./stats";
import { bookingsRouter } from "./bookings";
import { notificationsRouter } from "./notifications";
import { creditsRouter } from "./credits";
import { vaccinesRouter } from "./vaccines";
import { medicationsRouter } from "./medications";
import { logsRouter } from "./logs";
import { dashboardRouter } from "./dashboard";
import { checkinRouter } from "./checkin";
import { tutorsRouter } from "./tutors";
import { financesRouter } from "./finances";
import { documentsRouter } from "./documents";
import { behaviorRouter } from "./behavior";
import { preventivesRouter } from "./preventives";
import { wallRouter } from "./wall";
import { reportsRouter } from "./reports";
import { foodRouter } from "./food";
import { auditLogsRouter } from "./auditLogs";
import { packagesRouter } from "./packages";
import { reviewsRouter } from "./reviews";
import { notificationTemplatesRouter } from "./notificationTemplates";
import { trainingRouter } from "./training";
import { whatsappRouter } from "./whatsapp";
import { analyticsRouter } from "./analytics";
import { petManagementRouter } from "./petManagement";
import { businessRulesRouter } from "./businessRules";
import { aiRouter } from "./ai";

export const appRouter = router({
  // Autenticação
  auth: authRouter,
  
  // Gestão de usuários e tutores
  users: usersRouter,
  tutors: tutorsRouter,
  
  // Gestão de pets
  pets: petsRouter,
  checkin: checkinRouter,
  
  // Saúde
  vaccines: vaccinesRouter,
  medications: medicationsRouter,
  preventives: preventivesRouter,
  behavior: behaviorRouter,
  training: trainingRouter,
  
  // Alimentação
  food: foodRouter,
  
  // Logs e relatórios
  logs: logsRouter,
  reports: reportsRouter,
  auditLogs: auditLogsRouter,
  
  // Calendário e reservas
  calendar: calendarRouter,
  bookings: bookingsRouter,
  
  // Financeiro
  credits: creditsRouter,
  finances: financesRouter,
  packages: packagesRouter,
  
  // Documentos
  documents: documentsRouter,
  
  // Comunicação
  notifications: notificationsRouter,
  notificationTemplates: notificationTemplatesRouter,
  wall: wallRouter,
  reviews: reviewsRouter,
  whatsapp: whatsappRouter,
  
  // Dashboard e estatísticas
  dashboard: dashboardRouter,
  stats: statsRouter,
  analytics: analyticsRouter,
  
  // Gestão Avançada de Pets
  petManagement: petManagementRouter,
  
  // Motor de Regras de Negócio
  businessRules: businessRulesRouter,
  
  // Inteligência Artificial
  ai: aiRouter,
});

export type AppRouter = typeof appRouter;
