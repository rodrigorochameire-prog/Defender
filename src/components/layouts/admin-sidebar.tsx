"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Bell,
  FileText,
  LogOut,
  PanelLeft,
  User,
  MessageCircle,
  Settings,
  BarChart3,
  Scale,
  Gavel,
  FileSearch,
  Clock,
  AlertTriangle,
  Calculator,
  FolderOpen,
  UserCheck,
  Building2,
  Briefcase,
  Target,
  ChevronRight,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { FontSizeToggle } from "@/components/font-size-toggle";
import { NotificationsPopover } from "@/components/notifications-popover";
import { logoutAction } from "@/app/(dashboard)/actions";
import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminSidebarProps {
  children: ReactNode;
  userName: string;
  userEmail?: string;
}

const menuGroups = [
  {
    label: "Operacional",
    color: "primary", // Emerald - cor primária da marca
    items: [
      { icon: LayoutDashboard, label: "Dashboard", path: "/admin" },
      { icon: Users, label: "Assistidos", path: "/admin/assistidos" },
      { icon: Scale, label: "Processos", path: "/admin/processos" },
      { icon: Calendar, label: "Calendário", path: "/admin/calendar" },
    ],
  },
  {
    label: "Prazos e Demandas",
    color: "primary", // Emerald
    items: [
      { icon: Clock, label: "Demandas", path: "/admin/demandas" },
      { icon: AlertTriangle, label: "Prazos Urgentes", path: "/admin/prazos" },
      { icon: Target, label: "Kanban", path: "/admin/kanban" },
    ],
  },
  {
    label: "Audiências",
    color: "primary", // Emerald
    items: [
      { icon: Gavel, label: "Tribunal do Júri", path: "/admin/juri" },
      { icon: Briefcase, label: "Audiências", path: "/admin/audiencias" },
      { icon: UserCheck, label: "Atendimentos", path: "/admin/atendimentos" },
    ],
  },
  {
    label: "Documentos",
    color: "secondary", // Slate/Navy
    items: [
      { icon: FileText, label: "Peças e Docs", path: "/admin/documentos" },
      { icon: FolderOpen, label: "Templates", path: "/admin/templates" },
    ],
  },
  {
    label: "Ferramentas",
    color: "secondary", // Slate
    items: [
      { icon: Calculator, label: "Calculadoras", path: "/admin/calculadoras" },
      { icon: FileSearch, label: "Buscar Processos", path: "/admin/busca" },
    ],
  },
  {
    label: "Comunicação",
    color: "secondary", // Slate
    items: [
      { icon: MessageCircle, label: "WhatsApp", path: "/admin/whatsapp" },
      { icon: Bell, label: "Notificações", path: "/admin/notifications" },
    ],
  },
  {
    label: "Gestão",
    color: "secondary", // Slate
    items: [
      { icon: Building2, label: "Defensoria", path: "/admin/defensoria" },
      { icon: BarChart3, label: "Relatórios", path: "/admin/relatorios" },
      { icon: Settings, label: "Configurações", path: "/admin/settings" },
    ],
  },
];

// Sistema de cores DefesaHub Premium
// - Primary (Emerald): Elementos principais de navegação
// - Secondary (Slate): Elementos secundários
const colorClasses = {
  primary: {
    icon: "text-emerald-500 dark:text-emerald-400",
    iconActive: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50/40 dark:bg-emerald-950/20",
    bgHover: "hover:bg-emerald-50/60 dark:hover:bg-emerald-950/30",
    bgActive: "bg-emerald-100/60 dark:bg-emerald-950/40",
    border: "border-emerald-200/30 dark:border-emerald-800/20",
    glow: "",
  },
  secondary: {
    icon: "text-slate-500 dark:text-slate-400",
    iconActive: "text-slate-700 dark:text-slate-300",
    bg: "bg-slate-50/60 dark:bg-slate-800/40",
    bgHover: "hover:bg-slate-100/60 dark:hover:bg-slate-800/40",
    bgActive: "bg-slate-100/80 dark:bg-slate-800/50",
    border: "border-slate-200/50 dark:border-slate-700/30",
    glow: "",
  },
};

const SIDEBAR_WIDTH_KEY = "admin-sidebar-width";
const DEFAULT_WIDTH = 300;
const MIN_WIDTH = 260;
const MAX_WIDTH = 420;

export function AdminSidebar({ children, userName, userEmail }: AdminSidebarProps) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);

  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (saved) {
      setSidebarWidth(parseInt(saved, 10));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  return (
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <AdminSidebarContent
        setSidebarWidth={setSidebarWidth}
        userName={userName}
        userEmail={userEmail}
      >
        {children}
      </AdminSidebarContent>
    </SidebarProvider>
  );
}

function AdminSidebarContent({
  children,
  setSidebarWidth,
  userName,
  userEmail,
}: {
  children: ReactNode;
  setSidebarWidth: (width: number) => void;
  userName: string;
  userEmail?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useClerk();
  const { state, toggleSidebar, openMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  const activeMenuItem = menuGroups
    .flatMap((g) => g.items)
    .find(
      (item) =>
        pathname === item.path ||
        (item.path !== "/admin" && pathname.startsWith(item.path + "/"))
    );

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
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

  async function handleLogout() {
    await logoutAction();
    await signOut({ redirectUrl: "/" });
  }

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r border-border/40 bg-gradient-to-b from-card/95 via-card to-card/90 backdrop-blur-xl shadow-xl"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-14 justify-center border-b border-border/20">
            <div className="flex items-center gap-3 px-6 transition-all w-full">
              {!isCollapsed && (
                <div className="flex flex-col">
                  <span className="text-xs font-bold tracking-wider uppercase bg-gradient-to-r from-primary to-emerald-600 bg-clip-text text-transparent">
                    Administração
                  </span>
                </div>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0 px-3 py-2 overflow-y-auto flex-1">
            <SidebarMenu className={isCollapsed ? "gap-0.5" : "gap-2"}>
              {/* Toggle Button */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={toggleSidebar}
                  tooltip={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
                  className={`${isCollapsed ? "h-9" : "h-12"} hover:bg-primary/10 transition-all duration-300`}
                >
                  <PanelLeft className="h-6 w-6 text-[hsl(220_13%_45%)] group-hover:text-primary transition-colors duration-300" />
                  <span className="text-sm font-medium text-[hsl(220_11%_50%)] group-hover:text-foreground transition-colors duration-300">
                    {isCollapsed ? "Expandir" : "Recolher Menu"}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <div className="h-px bg-border/40 my-2" />

              {/* Menu Groups */}
              {menuGroups.map((group, groupIndex) => (
                <div key={group.label}>
                  {!isCollapsed && (
                    <div className="px-3 py-2 mt-4 mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-[hsl(220_11%_50%)]">
                        {group.label}
                      </span>
                    </div>
                  )}

                  {group.items.map((item) => {
                    const isActive =
                      pathname === item.path ||
                      (item.path !== "/admin" && pathname.startsWith(item.path + "/"));
                    const colors = colorClasses[group.color as keyof typeof colorClasses];

                    return (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive}
                          tooltip={item.label}
                          className={`${isCollapsed ? "h-9" : "h-12"} transition-all duration-300 ease rounded-[14px] group relative overflow-hidden ${
                            isActive
                              ? `${colors.bgActive} shadow-[0_2px_4px_0_rgba(0,0,0,0.06)] ring-1 ${colors.border}`
                              : `${colors.bgHover} hover:shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]`
                          }`}
                        >
                          <Link
                            href={item.path}
                            prefetch={true}
                            onClick={() => {
                              if (isMobile && openMobile) {
                                setOpenMobile(false);
                              }
                            }}
                          >
                            {/* Ícone com destaque quando ativo */}
                            <item.icon
                              className={`relative z-10 transition-all duration-300 ease ${
                                isActive
                                  ? `${colors.iconActive} h-[22px] w-[22px]`
                                  : `h-5 w-5 text-[hsl(220_13%_45%)] group-hover:text-[hsl(220_16%_38%)]`
                              }`}
                              strokeWidth={isActive ? 2.5 : 1.75}
                            />
                            {/* Texto com hierarquia melhorada */}
                            <span className={`relative z-10 text-sm transition-colors duration-300 ${
                              isActive 
                                ? "font-semibold text-foreground" 
                                : "font-medium text-[hsl(220_11%_50%)] group-hover:text-[hsl(220_16%_38%)]"
                            }`}>
                              {item.label}
                            </span>
                            {isActive && !isCollapsed && (
                              <div className={`ml-auto w-1.5 h-1.5 rounded-full ${colors.icon}`} />
                            )}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}

                  {groupIndex < menuGroups.length - 1 && (
                    <div
                      className={isCollapsed 
                        ? "h-[2px] mx-2 my-3 bg-border/50 rounded-full" 
                        : "h-px mx-3 my-3 bg-border/30"
                      }
                    />
                  )}
                </div>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3 border-t border-border/40 bg-gradient-to-t from-primary/5 to-transparent">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-[14px] px-3 py-3 hover:bg-gradient-to-r hover:from-primary/10 hover:to-primary/5 transition-all duration-300 ease w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 group shadow-[0_1px_2px_0_rgba(0,0,0,0.03)] hover:shadow-[0_2px_4px_0_rgba(0,0,0,0.06)] hover:translate-y-[-1px]">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10 blur-lg rounded-full" />
                    <Avatar className="h-11 w-11 border-2 border-primary/30 shadow-lg relative ring-2 ring-background">
                      <AvatarFallback className="text-sm font-bold bg-gradient-to-br from-primary/25 to-emerald-500/15 text-primary">
                        {getInitials(userName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate leading-none text-foreground">
                        {userName}
                      </p>
                      {userEmail && (
                        <p className="text-xs text-[hsl(220_11%_50%)] truncate mt-1.5 font-medium">
                          {userEmail}
                        </p>
                      )}
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 shadow-2xl border-border/40">
                <DropdownMenuItem
                  onClick={() => router.push("/admin/profile")}
                  className="cursor-pointer font-medium"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
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
          className={`absolute top-0 right-0 w-1.5 h-full cursor-col-resize hover:bg-gradient-to-b hover:from-primary/40 hover:via-emerald-400/30 hover:to-primary/40 transition-all duration-300 ${
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
              <Link href="/admin" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                <div className="w-9 h-9 rounded-xl overflow-hidden shadow-sm bg-primary flex items-center justify-center">
                  <Scale className="h-5 w-5 text-white" />
                </div>
                <span className="font-semibold text-sm">
                  {activeMenuItem?.label ?? "DefesaHub"}
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-1.5">
              <NotificationsPopover />
              <FontSizeToggle />
              <ThemeToggle />
            </div>
          </div>
        )}
        {!isMobile && (
          <div className="flex border-b border-border/30 h-[72px] items-center justify-center bg-card/95 backdrop-blur-xl px-6 sticky top-0 z-40 gap-4 shadow-[0_2px_8px_0_rgba(0,0,0,0.04)] relative">
            <Link
              href="/admin"
              className="flex items-center gap-3.5 hover:opacity-90 transition-all duration-300 cursor-pointer hover:scale-[1.02]"
            >
              <div className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-xl bg-gradient-to-br from-primary to-emerald-600 flex items-center justify-center ring-2 ring-primary/10">
                <Scale className="h-7 w-7 text-white" />
              </div>
              <div className="flex flex-col">
                <span
                  className="text-2xl font-bold tracking-tight text-foreground"
                  style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
                >
                  DefesaHub
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  Sistema de Gestão Jurídica
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-2 absolute right-6">
              <NotificationsPopover />
              <FontSizeToggle />
              <ThemeToggle />
            </div>
          </div>
        )}
        <main className="flex-1 p-6 md:p-8 min-h-screen overflow-x-hidden max-w-full">{children}</main>
      </SidebarInset>
    </>
  );
}
