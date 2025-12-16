import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  Dog,
  FileText,
  Calendar,
  CreditCard,
  DollarSign,
  Syringe,
  Pill,
  Shield,
  Brain,
  UtensilsCrossed,
  CheckCircle,
  Bell,
  Users,
  MessageSquare,
  MessageCircle,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";

const menuGroups = [
  {
    label: "Gestão",
    color: "blue",
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
      { icon: Dog, label: "Pets", path: "/admin/pets" },
      { icon: Users, label: "Tutores por Pet", path: "/admin/tutors-by-pet" },
      { icon: CheckCircle, label: "Aprovações", path: "/admin/pet-approval" },
      { icon: Calendar, label: "Calendário Geral", path: "/admin/calendar" },
    ],
  },
  {
    label: "Opera\u00e7\u00e3o",
    color: "orange",
    items: [
      { icon: FileText, label: "Logs Di\u00e1rios", path: "/admin/logs" },
      { icon: Brain, label: "Comportamento", path: "/admin/behavior" },
      { icon: UtensilsCrossed, label: "Ra\u00e7\u00e3o", path: "/admin/food" },
      { icon: MessageSquare, label: "Mural", path: "/admin/wall" },
      { icon: MessageCircle, label: "Chat", path: "/admin/chat" },
    ],
  },
  {
    label: "Sa\u00fade",
    color: "red",
    items: [
      { icon: Syringe, label: "Vacinas", path: "/admin/vaccines" },
      { icon: Pill, label: "Medicamentos", path: "/admin/medications" },
      { icon: Shield, label: "Preventivos", path: "/admin/preventives" },
    ],
  },
  {
    label: "Financeiro",
    color: "green",
    items: [
      { icon: CreditCard, label: "Planos de Assinatura", path: "/admin/plans" },
      { icon: CreditCard, label: "Pacotes & Créditos", path: "/admin/credit-packages" },
      { icon: DollarSign, label: "Finanças", path: "/admin/finances" },
    ],
  },
  {
    label: "Notificações",
    color: "purple",
    items: [
      { icon: Bell, label: "Templates de Mensagens", path: "/admin/notification-templates" },
      { icon: Users, label: "Preferências por Tutor", path: "/admin/tutor-notification-preferences" },
    ],
  },
];

// Color mappings for groups
const colorClasses = {
  blue: {
    icon: "text-cyan-600",
    iconHover: "group-hover:text-cyan-600",
    iconActive: "text-cyan-600",
    bg: "bg-cyan-50",
    bgHover: "hover:bg-cyan-50",
    bgActive: "bg-cyan-100",
    border: "border-cyan-200",
  },
  orange: {
    icon: "text-orange-600",
    iconHover: "group-hover:text-orange-600",
    iconActive: "text-orange-600",
    bg: "bg-orange-50",
    bgHover: "hover:bg-orange-50",
    bgActive: "bg-orange-100",
    border: "border-orange-200",
  },
  red: {
    icon: "text-red-600",
    iconHover: "group-hover:text-red-600",
    iconActive: "text-red-600",
    bg: "bg-red-50",
    bgHover: "hover:bg-red-50",
    bgActive: "bg-red-100",
    border: "border-red-200",
  },
  green: {
    icon: "text-green-600",
    iconHover: "group-hover:text-green-600",
    iconActive: "text-green-600",
    bg: "bg-green-50",
    bgHover: "hover:bg-green-50",
    bgActive: "bg-green-100",
    border: "border-green-200",
  },
  purple: {
    icon: "text-purple-600",
    iconHover: "group-hover:text-purple-600",
    iconActive: "text-purple-600",
    bg: "bg-purple-50",
    bgHover: "hover:bg-purple-50",
    bgActive: "bg-purple-100",
    border: "border-purple-200",
  },
};

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 240;
const MAX_WIDTH = 400;

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-accent/5">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
              <img
                src="/tetecare-logo.png"
                alt="Tetê Care"
                className="w-24 h-24 rounded-2xl object-cover relative shadow-2xl"
              />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-center">
              Acesse para continuar
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              O acesso a este painel requer autenticação. Continue para fazer login.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Fazer Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar, setOpen } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuGroups.flatMap(g => g.items).find((item) => item.path === location);
  const isMobile = useIsMobile();

  // Sidebar expande apenas manualmente (sem hover automático)

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const sidebarLeft =
        sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div 
        className="relative" 
        ref={sidebarRef}
      >
        <Sidebar
          collapsible="icon"
          className="border-r border-border/40 bg-gradient-to-b from-card/95 via-card to-card/90 backdrop-blur-xl shadow-xl "
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-14 justify-center border-b border-border/20">
            <div className="flex items-center gap-3 px-6 transition-all w-full">
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                    Gestão
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="px-3 py-2 overflow-y-auto flex-1">
            <SidebarMenu className={isCollapsed ? "gap-0.5" : "gap-2"}>
              {/* Toggle Button */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={toggleSidebar}
                  tooltip={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
                  className={`${isCollapsed ? "h-9" : "h-12"} hover:bg-primary/10 transition-all duration-300`}
                >
                  <PanelLeft className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground">
                    {isCollapsed ? "Expandir Menu" : "Recolher Menu"}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              
              {/* Separator */}
              <div className="h-px bg-border/40 my-2" />
              
              {/* Menu Groups */}
              {menuGroups.map((group, groupIndex) => (
                <div key={group.label}>
                  {/* Group Label */}
                  {!isCollapsed && (
                    <div className="px-3 py-2 mt-4 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                        {group.label}
                      </span>
                    </div>
                  )}
                  
                  {/* Group Items */}
                  {group.items.map((item) => {
                    const isActive = location === item.path;
                    const colors = colorClasses[group.color as keyof typeof colorClasses];
                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          isActive={isActive}
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(item.path);
                            // Manter sidebar no estado atual (não expandir se estiver retraída)
                            if (isMobile && state === "expanded") {
                              setOpen(false);
                            }
                          }}
                          tooltip={item.label}
                          className={`${isCollapsed ? "h-9" : "h-12"} transition-all duration-300 font-medium rounded-xl group relative overflow-hidden ${
                            isActive
                              ? `${colors.bgActive} shadow-lg ring-2 ${colors.border}`
                              : `${colors.bgHover} text-muted-foreground hover:text-foreground hover:shadow-md`
                          }`}
                        >
                          {isActive && (
                            <div className={`absolute inset-0 ${colors.bg} opacity-50 animate-pulse`} />
                          )}
                          <item.icon
                            className={`h-6 w-6 relative z-10 transition-all duration-300 ${
                              isActive
                                ? `${colors.iconActive} drop-shadow-md`
                                : `${colors.iconHover} group-hover:scale-110`
                            }`}
                          />
                          <span className="relative z-10 font-semibold">{item.label}</span>
                          {isActive && !isCollapsed && (
                            <div className={`ml-auto w-2 h-2 rounded-full ${colors.iconActive} animate-pulse shadow-lg`} />
                          )}
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                  
                  {/* Group Separator */}
                  {groupIndex < menuGroups.length - 1 && (
                    <div className={`h-px bg-border/20 mx-3 ${isCollapsed ? "my-1" : "my-3"}`} />
                  )}
                </div>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-border/40 bg-gradient-to-t from-primary/5 to-transparent">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 transition-all duration-300 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 group shadow-sm hover:shadow-md">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 blur-lg rounded-full" />
                    <Avatar className="h-11 w-11 border-2 border-primary/30 shadow-lg relative ring-2 ring-background">
                      <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-primary/25 to-accent/15 text-primary">
                        {user?.name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate leading-none text-foreground">
                        {user?.name || "-"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-1.5 font-medium">
                        {user?.email || "-"}
                      </p>
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 shadow-2xl border-border/40">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive font-semibold"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-gradient-to-b hover:from-primary/40 hover:via-accent/30 hover:to-primary/40 transition-all duration-300 ${
            isCollapsed ? "hidden" : ""
          }`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="ml-0">
        {isMobile && (
          <div className="flex border-b border-border/40 h-16 items-center justify-between bg-background/95 backdrop-blur-xl px-4 sticky top-0 z-40 shadow-sm">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-10 w-10 rounded-xl bg-accent/50 hover:bg-primary/20 transition-colors" />
              <button 
                onClick={() => setLocation("/admin/dashboard")}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <img
                  src="/tetecare-logo.png"
                  alt="Tetê Care"
                  className="w-8 h-8 rounded-lg object-cover shadow-sm"
                />
                <span className="font-semibold text-sm">
                  {activeMenuItem?.label ?? "Menu"}
                </span>
              </button>
            </div>
            <div className="flex items-center gap-2">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </div>
        )}
        {!isMobile && (
          <div className="flex border-b border-border/40 h-16 items-center justify-center bg-background/95 backdrop-blur-xl px-6 sticky top-0 z-40 gap-3 shadow-sm relative">
            <button 
              onClick={() => setLocation("/admin/dashboard")}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 blur-xl rounded-full" />
                <img
                  src="/tetecare-logo.png"
                  alt="Tetê Care"
                  className="w-11 h-11 rounded-xl object-cover relative shadow-lg ring-2 ring-black/80 dark:ring-black/90"
                />
              </div>
              <span className="text-2xl font-semibold tracking-tight text-foreground" style={{ fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif' }}>
                Tetê Care
              </span>
            </button>
            <div className="flex items-center gap-3 absolute right-6">
              <NotificationBell />
              <ThemeToggle />
            </div>
          </div>
        )}
        <main className="flex-1 p-6 md:p-8">{children}</main>
      </SidebarInset>
    </>
  );
}
