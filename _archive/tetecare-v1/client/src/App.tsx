import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayoutSkeleton from "./components/DashboardLayoutSkeleton";

// Eager load critical pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

// Lazy load all other pages
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const UserProfile = lazy(() => import("./pages/UserProfile"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));

// Admin Pages
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const AdminPets = lazy(() => import("./pages/AdminPets"));
const AdminTutors = lazy(() => import("./pages/AdminTutors"));
const TutorsByPet = lazy(() => import("./pages/TutorsByPet"));
const AdminVaccines = lazy(() => import("./pages/AdminVaccines"));
const AdminMedications = lazy(() => import("./pages/AdminMedications"));
const AdminLogs = lazy(() => import("./pages/AdminLogs"));
const AdminCalendar = lazy(() => import("./pages/AdminCalendar"));
const AdminOccupancyReport = lazy(() => import("./pages/AdminOccupancyReport"));
const AdminFinances = lazy(() => import("./pages/AdminFinances"));
const AdminCredits = lazy(() => import("./pages/AdminCredits"));
const AdminCreditPackages = lazy(() => import("./pages/AdminCreditPackages"));
const AdminFood = lazy(() => import("./pages/AdminFood"));
const AdminPlans = lazy(() => import("./pages/AdminPlans"));
const AdminUsers = lazy(() => import("./pages/AdminUsers"));
const AdminAuditLogs = lazy(() => import("./pages/AdminAuditLogs"));
const AdminCoManagement = lazy(() => import("./pages/AdminCoManagement"));
const AdminMedicationsAll = lazy(() => import("./pages/AdminMedicationsAll"));
const AdminVaccinesAll = lazy(() => import("./pages/AdminVaccinesAll"));
const AdminPreventivesAll = lazy(() => import("./pages/AdminPreventivesAll"));
const AdminPreventives = lazy(() => import("./pages/AdminPreventives"));
const AdminDocuments = lazy(() => import("./pages/AdminDocuments"));
const AdminMedicationsUnified = lazy(() => import("./pages/AdminMedicationsUnified"));
const AdminVaccinesUnified = lazy(() => import("./pages/AdminVaccinesUnified"));
const AdminPreventivesUnified = lazy(() => import("./pages/AdminPreventivesUnified"));
const AdminHealthNotifications = lazy(() => import("./pages/AdminHealthNotifications"));
const AdminHealthCalendar = lazy(() => import("./pages/AdminHealthCalendar"));
const AdminWhatsApp = lazy(() => import("./pages/AdminWhatsApp"));
const AdminPetDetail = lazy(() => import("./pages/AdminPetDetail"));
const AdminBehavior = lazy(() => import("./pages/AdminBehavior"));
const AdminPetApproval = lazy(() => import("./pages/AdminPetApproval"));
const AdminNotificationTemplates = lazy(() => import("./pages/AdminNotificationTemplates"));
const AdminTutorNotificationPreferences = lazy(() => import("./pages/AdminTutorNotificationPreferences"));
const AdminWall = lazy(() => import("./pages/AdminWall"));
const AdminChat = lazy(() => import("./pages/AdminChat"));
const AdminHealth = lazy(() => import("./pages/AdminHealth"));
const AdminCommunication = lazy(() => import("./pages/AdminCommunication"));
const AdminPackages = lazy(() => import("./pages/AdminPackages"));

// Tutor Pages
const TutorDashboard = lazy(() => import("./pages/TutorDashboard"));
const TutorPets = lazy(() => import("./pages/TutorPets"));
const TutorPetDetail = lazy(() => import("./pages/TutorPetDetail"));
const TutorAddLog = lazy(() => import("./pages/TutorAddLog"));
const TutorMedications = lazy(() => import("./pages/TutorMedications"));
const TutorVaccines = lazy(() => import("./pages/TutorVaccines"));
const TutorVaccinesOverview = lazy(() => import("./pages/TutorVaccinesOverview"));
const TutorMedicationsOverview = lazy(() => import("./pages/TutorMedicationsOverview"));
const TutorCredits = lazy(() => import("./pages/TutorCredits"));
const TutorFood = lazy(() => import("./pages/TutorFood"));
const TutorCalendar = lazy(() => import("./pages/TutorCalendar"));
const TutorNotifications = lazy(() => import("./pages/TutorNotifications"));
const TutorReports = lazy(() => import("./pages/TutorReports"));
const TutorDocuments = lazy(() => import("./pages/TutorDocuments"));
const TutorSubscriptions = lazy(() => import("./pages/TutorSubscriptions"));
const TutorPreventive = lazy(() => import("./pages/TutorPreventive"));
const TutorBehavior = lazy(() => import("./pages/TutorBehavior"));
const TutorAI = lazy(() => import("./pages/TutorAI"));
const TutorBooking = lazy(() => import("./pages/TutorBooking"));
const TutorAnalytics = lazy(() => import("./pages/TutorAnalytics"));
const TutorReviews = lazy(() => import("./pages/TutorReviews"));
const TutorNotificationSettings = lazy(() => import("./pages/TutorNotificationSettings"));
const TutorWall = lazy(() => import("./pages/TutorWall"));
const TutorChat = lazy(() => import("./pages/TutorChat"));
const AcceptInvite = lazy(() => import("./pages/AcceptInvite"));
const TutorCheckout = lazy(() => import("./pages/TutorCheckout"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));

function Router() {
  return (
    <Suspense fallback={<DashboardLayoutSkeleton />}>
      <Switch>
      {/* Home */}
      <Route path="/" component={Home} />
      
      {/* Auth Routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/profile" component={UserProfile} />

      {/* Admin Routes */}
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/pets" component={AdminPets} />
      <Route path="/admin/pets/:id" component={AdminPetDetail} />
      <Route path="/admin/health" component={AdminHealth} />
      <Route path="/admin/communication" component={AdminCommunication} />
      <Route path="/admin/packages" component={AdminPackages} />
      <Route path="/admin/tutors" component={AdminTutors} />
      <Route path="/admin/tutors-by-pet" component={TutorsByPet} />
      <Route path="/admin/vaccines" component={AdminVaccines} />
      <Route path="/admin/medications" component={AdminMedications} />
      <Route path="/admin/logs" component={AdminLogs} />
      <Route path="/admin/calendar" component={AdminCalendar} />
      <Route path="/admin/occupancy" component={AdminOccupancyReport} />
      <Route path="/admin/behavior" component={AdminBehavior} />
      <Route path="/admin/finances" component={AdminFinances} />
      <Route path="/admin/credits" component={AdminCredits} />
      <Route path="/admin/credit-packages" component={AdminCreditPackages} />
          <Route path="/admin/food" component={AdminFood} />
          <Route path="/admin/pet-approval" component={AdminPetApproval} />
      <Route path="/admin/plans" component={AdminPlans} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/audit-logs" component={AdminAuditLogs} />
      <Route path="/admin/comanagement" component={AdminCoManagement} />
      <Route path="/admin/medications-all" component={AdminMedicationsAll} />
      <Route path="/admin/vaccines-all" component={AdminVaccinesAll} />
      <Route path="/admin/preventives-all" component={AdminPreventivesAll} />
      <Route path="/admin/preventives" component={AdminPreventives} />
      <Route path="/admin/documents" component={AdminDocuments} />
      <Route path="/admin/medications-unified" component={AdminMedicationsUnified} />
      <Route path="/admin/vaccines-unified" component={AdminVaccinesUnified} />
      <Route path="/admin/preventives-unified" component={AdminPreventivesUnified} />
      <Route path="/admin/health-notifications" component={AdminHealthNotifications} />
      <Route path="/admin/health-calendar" component={AdminHealthCalendar} />
      <Route path="/admin/whatsapp" component={AdminWhatsApp} />
      <Route path="/admin/wall" component={AdminWall} />
      <Route path="/admin/chat" component={AdminChat} />
      <Route path="/admin/notification-templates" component={AdminNotificationTemplates} />
      <Route path="/admin/tutor-notification-preferences" component={AdminTutorNotificationPreferences} />
      <Route path="/accept-invite" component={AcceptInvite} />

      {/* Tutor Routes */}
      <Route path="/tutor/dashboard" component={TutorDashboard} />
      <Route path="/tutor/pets" component={TutorPets} />
      <Route path="/tutor/pets/:id" component={TutorPetDetail} />
      <Route path="/tutor/pets/:id/logs/new" component={TutorAddLog} />
      <Route path="/tutor/pets/:id/medications" component={TutorMedications} />
      <Route path="/tutor/pets/:id/vaccines" component={TutorVaccines} />
      <Route path="/tutor/vaccines" component={TutorVaccinesOverview} />
      <Route path="/tutor/medications" component={TutorMedicationsOverview} />
      <Route path="/tutor/credits" component={TutorCredits} />
      <Route path="/tutor/food" component={TutorFood} />
      <Route path="/tutor/calendar" component={TutorCalendar} />
      <Route path="/tutor/notifications" component={TutorNotifications} />
      <Route path="/tutor/reports" component={TutorReports} />
      <Route path="/tutor/documents" component={TutorDocuments} />
      <Route path="/tutor/subscriptions" component={TutorSubscriptions} />
      <Route path="/tutor/preventive" component={TutorPreventive} />
      <Route path="/tutor/behavior" component={TutorBehavior} />
      <Route path="/tutor/ai" component={TutorAI} />
      <Route path="/tutor/booking" component={TutorBooking} />
      <Route path="/tutor/analytics" component={TutorAnalytics} />
      <Route path="/tutor/reviews" component={TutorReviews} />
        <Route path="/tutor/reviews" component={TutorReviews} />
      <Route path="/tutor/wall" component={TutorWall} />
      <Route path="/tutor/chat" component={TutorChat} />
      <Route path="/tutor/notification-settings" component={TutorNotificationSettings} />
      <Route path="/payment-success" component={PaymentSuccess} />

      {/* 404 */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
