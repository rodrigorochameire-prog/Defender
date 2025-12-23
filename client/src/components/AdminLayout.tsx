import { ReactNode } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Dog,
  Users,
  Calendar,
  Syringe,
  Pill,
  FileText,
  TrendingUp,
  LogOut,
  Menu,
  X,
  CreditCard,
  Heart,
  Briefcase,
  Package,
  GitMerge,
  Shield,
  ScrollText,
  UserCog,
  MessageSquare,
  Bell,
  User as UserIcon,
  Brain,
  UtensilsCrossed,
  MessageCircle,
  Wallet,
  Settings,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { NotificationsPanel } from "@/components/NotificationsPanel";

interface AdminLayoutProps {
  children: ReactNode;
}

const navigationSections = [
  {
    title: "Operacional",
    icon: Dog,
    items: [
      { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
      { name: "Pets", href: "/admin/pets", icon: Dog },
      { name: "Aprovações", href: "/admin/pet-approval", icon: CheckCircle2 },
      { name: "Calendário", href: "/admin/health-calendar", icon: Calendar },
    ],
  },
  {
    title: "Cuidados",
    icon: Heart,
    items: [
      { name: "Central de Saúde", href: "/admin/health", icon: Heart },
      { name: "Ração", href: "/admin/food", icon: UtensilsCrossed },
      { name: "Comportamento", href: "/admin/behavior", icon: Brain },
    ],
  },
  {
    title: "Comunicação",
    icon: MessageCircle,
    items: [
      { name: "Central de Comunicação", href: "/admin/communication", icon: MessageCircle },
    ],
  },
  {
    title: "Pacotes & Financeiro",
    icon: Wallet,
    items: [
      { name: "Central de Pacotes", href: "/admin/packages", icon: Wallet },
    ],
  },
  {
    title: "Gestão",
    icon: Settings,
    items: [
      { name: "Tutores", href: "/admin/tutors", icon: Users },
      { name: "Usuários", href: "/admin/users", icon: UserCog },
      { name: "Documentos", href: "/admin/documents", icon: FileText },
      { name: "Auditoria", href: "/admin/audit-logs", icon: ScrollText },
      { name: "Cogestão", href: "/admin/comanagement", icon: GitMerge },
    ],
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => {
      toast.success("Logout realizado com sucesso!");
      window.location.href = "/";
    },
  });

  const handleLogout = () => {
    logout.mutate();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen bg-card border-r transition-all duration-300 lg:translate-x-0 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${isCollapsed ? "w-20" : "w-64"}`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between p-6 border-b">
            {!isCollapsed ? (
              <>
                <div className="flex items-center gap-3">
                  <img
                    src="/tetecare-logo.png"
                    alt="Tetê Care Logo"
                    className="w-12 h-12 rounded-full object-cover border-2 border-primary"
                  />
                  <div>
                    <h1 className="font-bold text-lg">Tetê Care</h1>
                    <p className="text-xs text-muted-foreground">Admin</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </>
            ) : (
              <img
                src="/tetecare-logo.png"
                alt="Tetê Care Logo"
                className="w-12 h-12 rounded-full object-cover border-2 border-primary mx-auto"
              />
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
            {navigationSections.map((section) => (
              <div key={section.title}>
                {!isCollapsed && (
                  <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {section.title}
                  </h3>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = location === item.href || location.startsWith(item.href + "/");
                    return (
                      <button
                        key={item.name}
                        onClick={() => {
                          setLocation(item.href);
                          setIsSidebarOpen(false);
                        }}
                        title={isCollapsed ? item.name : undefined}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        } ${isCollapsed ? "justify-center" : ""}`}
                      >
                        <item.icon className="h-4 w-4" />
                        {!isCollapsed && item.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {/* Collapse button */}
          <div className="p-4 border-t hidden lg:block">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full justify-center"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </div>

          {/* User menu */}
          <div className="p-4 border-t">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className={`w-full h-auto py-3 ${isCollapsed ? "justify-center px-0" : "justify-start gap-3"}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-primary text-white">
                      {user?.name?.[0] || "A"}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium">{user?.name || "Admin"}</p>
                      <p className="text-xs text-muted-foreground">{user?.email}</p>
                    </div>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setLocation("/profile")}>
                  <UserIcon className="mr-2 h-4 w-4" />
                  Meu Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={`transition-all duration-300 ${isCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        {/* Mobile header */}
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b lg:hidden">
          <div className="flex items-center justify-between p-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <img
                src="/tetecare-logo.png"
                alt="Tetê Care"
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="font-bold">Tetê Care</span>
            </div>
            <NotificationsPanel />
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
