import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import UserProfile from "./pages/UserProfile";
import VerifyEmail from "./pages/VerifyEmail";

// Admin Pages
import AdminDashboard from "./pages/AdminDashboard";
import AdminPets from "./pages/AdminPets";
import AdminTutors from "./pages/AdminTutors";
import TutorsByPet from "./pages/TutorsByPet";
import AdminVaccines from "./pages/AdminVaccines";
import AdminMedications from "./pages/AdminMedications";
import AdminLogs from "./pages/AdminLogs";
import AdminCalendar from "./pages/AdminCalendar";
import AdminOccupancyReport from "./pages/AdminOccupancyReport";
import AdminFinances from "./pages/AdminFinances";
import AdminCredits from "./pages/AdminCredits";
import AdminCreditPackages from "./pages/AdminCreditPackages";
import AdminFood from "./pages/AdminFood";
import AdminPlans from "./pages/AdminPlans";
import AdminUsers from "./pages/AdminUsers";
import AdminAuditLogs from "./pages/AdminAuditLogs";
import AdminCoManagement from "./pages/AdminCoManagement";
import AdminMedicationsAll from "./pages/AdminMedicationsAll";
import AdminVaccinesAll from "./pages/AdminVaccinesAll";
import AdminPreventivesAll from "./pages/AdminPreventivesAll";
import AdminPreventives from "./pages/AdminPreventives";
import AdminDocuments from "./pages/AdminDocuments";
import AdminMedicationsUnified from "./pages/AdminMedicationsUnified";
import AdminVaccinesUnified from "./pages/AdminVaccinesUnified";
import AdminPreventivesUnified from "./pages/AdminPreventivesUnified";
import AdminHealthNotifications from "./pages/AdminHealthNotifications";
import AdminHealthCalendar from "./pages/AdminHealthCalendar";
import AdminWhatsApp from "./pages/AdminWhatsApp";
import AdminPetDetail from "./pages/AdminPetDetail";
import AdminBehavior from "./pages/AdminBehavior";
import AdminPetApproval from "./pages/AdminPetApproval";
import AdminNotificationTemplates from "./pages/AdminNotificationTemplates";
import AdminTutorNotificationPreferences from "./pages/AdminTutorNotificationPreferences";
import AdminWall from "./pages/AdminWall";
import AdminChat from "./pages/AdminChat";

// Tutor Pages
import TutorDashboard from "./pages/TutorDashboard";
import TutorPets from "./pages/TutorPets";
import TutorPetDetail from "./pages/TutorPetDetail";
import TutorAddLog from "./pages/TutorAddLog";
import TutorMedications from "./pages/TutorMedications";
import TutorVaccines from "./pages/TutorVaccines";
import TutorVaccinesOverview from "./pages/TutorVaccinesOverview";
import TutorMedicationsOverview from "./pages/TutorMedicationsOverview";
import TutorCredits from "./pages/TutorCredits";
import TutorFood from "./pages/TutorFood";
import TutorCalendar from "./pages/TutorCalendar";
import TutorNotifications from "./pages/TutorNotifications";
import TutorReports from "./pages/TutorReports";
import TutorDocuments from "./pages/TutorDocuments";
import TutorSubscriptions from "./pages/TutorSubscriptions";
import TutorPreventive from "./pages/TutorPreventive";
import TutorBehavior from "./pages/TutorBehavior";
import TutorAI from "./pages/TutorAI";
import TutorBooking from "./pages/TutorBooking";
import TutorAnalytics from "./pages/TutorAnalytics";
import TutorReviews from "./pages/TutorReviews";
import TutorNotificationSettings from "./pages/TutorNotificationSettings";
import TutorWall from "./pages/TutorWall";
import TutorChat from "./pages/TutorChat";
import AcceptInvite from "./pages/AcceptInvite";
import TutorCheckout from "./pages/TutorCheckout";
import PaymentSuccess from "./pages/PaymentSuccess";

function Router() {
  return (
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
