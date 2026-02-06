"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Calendar, Bell, FileText, LogOut, User,
  Settings, BarChart3, Scale, Gavel, Clock, AlertTriangle, Calculator,
  FolderOpen, Building2, Briefcase, Target, Shield, Lock, RefreshCw,
  Award, TrendingUp, ChevronDown, Zap, Brain, Mic, Heart, ClipboardCheck,
  Columns3, History, PieChart, Handshake, CalendarDays, Sparkles, MessageCircle,
  FileSearch, UserCheck, ChevronRight, Menu, X, ListTodo, Network, UsersRound,
  MoreHorizontal, Plus
} from "lucide-react";
import { usePermissions, type UserRole } from "@/hooks/use-permissions";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarInset,
  SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsPopover } from "@/components/notifications-popover";
import { ContextControl } from "@/components/layout/context-control";
import { CommandPalette } from "@/components/shared/command-palette";
import { EntitySheetProvider } from "@/contexts/entity-sheet-context";
import { SidebarLogo } from "@/components/shared/logo";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { StatusBar } from "@/components/layout/status-bar";
import { DailyProgress } from "@/components/layout/daily-progress";
import {
  useAssignment, UTILITIES_MENU,
  type MenuSection, type AssignmentMenuItem,
} from "@/contexts/assignment-context";
import { useProfissional } from "@/contexts/profissional-context";
import { useAtribuicaoFiltro } from "@/components/layout/context-control";
import { logoutAction } from "@/app/(dashboard)/actions";
import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminSidebarProps {
  children: ReactNode;
  userName: string;
  userEmail?: string;
}

// ==========================================
// MENU SIMPLIFICADO E HARMONIOSO
// ==========================================

// Menu principal - itens do dia a dia
const MAIN_NAV: AssignmentMenuItem[] = [
  { label: "Dashboard", path: "/admin", icon: "LayoutDashboard" },
  { label: "Demandas", path: "/admin/demandas", icon: "ListTodo" },
  { label: "Agenda", path: "/admin/agenda", icon: "Calendar" },
  { label: "Casos", path: "/admin/casos", icon: "Briefcase" },
];

// Menu secundário - dados e registros
const DATA_NAV: AssignmentMenuItem[] = [
  { label: "Assistidos", path: "/admin/assistidos", icon: "Users", requiredRoles: ["admin", "defensor", "servidor", "estagiario", "triagem"] },
  { label: "Processos", path: "/admin/processos", icon: "Scale" },
];

// Menu de recursos
const RESOURCES_NAV: AssignmentMenuItem[] = [
  { label: "Drive", path: "/admin/drive", icon: "FolderOpen" },
  { label: "Modelos", path: "/admin/modelos", icon: "FileText" },
  { label: "Investigação", path: "/admin/diligencias", icon: "FileSearch" },
  { label: "Lógica", path: "/admin/logica", icon: "Brain" },
];

// Menu de gestão (admin)
const ADMIN_NAV: AssignmentMenuItem[] = [
  { label: "Equipe", path: "/admin/equipe", icon: "UsersRound", requiredRoles: ["admin", "defensor", "servidor"] },
];

// Itens do menu "Mais" (utilidades)
const MORE_NAV: AssignmentMenuItem[] = [
  { label: "WhatsApp", path: "/admin/whatsapp", icon: "MessageCircle" },
  { label: "Integrações", path: "/admin/integracoes", icon: "Zap" },
  { label: "Relatórios", path: "/admin/relatorios", icon: "BarChart3", requiredRoles: ["admin", "defensor"] },
  { label: "Configurações", path: "/admin/settings", icon: "Settings", requiredRoles: ["admin", "defensor"] },
];

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Users, Calendar, Bell, FileText, User, MessageCircle,
  Settings, BarChart3, Scale, Gavel, Clock, AlertTriangle, Calculator,
  FolderOpen, Building2, Briefcase, Target, Shield, Lock, RefreshCw,
  Award, TrendingUp, Zap, Brain, Mic, Heart, ClipboardCheck, Columns3,
  History, PieChart, Handshake, CalendarDays, Sparkles, FileSearch, UserCheck,
  ChevronRight, ListTodo, Network, UsersRound, MoreHorizontal, Plus
};

const SIDEBAR_WIDTH_KEY = "admin-sidebar-width";
const DEFAULT_WIDTH = 240;

export function AdminSidebar({ children, userName, userEmail }: AdminSidebarProps) {
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (saved) setSidebarWidth(parseInt(saved, 10));
  }, []);

  const currentWidth = mounted ? sidebarWidth : DEFAULT_WIDTH;

  return (
    <SidebarProvider defaultOpen={true} style={{ "--sidebar-width": `${currentWidth}px` } as CSSProperties}>
      <EntitySheetProvider>
        <AdminSidebarContent setSidebarWidth={setSidebarWidth} userName={userName} userEmail={userEmail}>
          {children}
        </AdminSidebarContent>
      </EntitySheetProvider>
    </SidebarProvider>
  );
}

// ==========================================
// COMPONENTE DE ITEM DE MENU SIMPLIFICADO
// ==========================================

function NavItem({ item, isActive, isCollapsed, onNavigate, userRole, compact = false }: {
  item: AssignmentMenuItem;
  isActive: boolean;
  isCollapsed: boolean;
  onNavigate: () => void;
  userRole?: UserRole;
  compact?: boolean;
}) {
  const Icon = iconMap[item.icon] || Briefcase;

  if (item.requiredRoles && userRole && !item.requiredRoles.includes(userRole)) {
    return null;
  }

  if (isCollapsed) {
    return (
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={isActive}
          tooltip={item.label}
          className={cn(
            "h-9 w-9 p-0 mx-auto rounded-lg flex items-center justify-center transition-all duration-200",
            isActive
              ? "bg-emerald-500/20 text-emerald-400"
              : "text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300"
          )}
        >
          <Link href={item.path} prefetch={true} onClick={onNavigate}>
            <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.5 : 2} />
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        className={cn(
          "h-9 rounded-lg transition-all duration-200 group/item",
          compact ? "px-2" : "px-3",
          isActive
            ? "bg-emerald-500/15 text-emerald-400 font-medium"
            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
        )}
      >
        <Link href={item.path} prefetch={true} onClick={onNavigate}>
          <Icon className={cn(
            "h-[18px] w-[18px] mr-2.5 transition-colors flex-shrink-0",
            isActive ? "text-emerald-400" : "text-zinc-500 group-hover/item:text-zinc-400"
          )} strokeWidth={isActive ? 2.5 : 2} />
          <span className="text-[13px] truncate">{item.label}</span>
          {isActive && (
            <div className="ml-auto w-1 h-1 rounded-full bg-emerald-400" />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

// ==========================================
// DIVISOR SUTIL
// ==========================================

function NavDivider({ label, collapsed }: { label?: string; collapsed: boolean }) {
  if (collapsed) {
    return <div className="my-2 mx-2 h-px bg-zinc-800" />;
  }

  if (label) {
    return (
      <div className="flex items-center gap-2 px-3 pt-4 pb-1">
        <span className="text-[10px] font-medium text-zinc-600 uppercase tracking-wider">{label}</span>
        <div className="flex-1 h-px bg-zinc-800/50" />
      </div>
    );
  }

  return <div className="my-2 mx-3 h-px bg-zinc-800/50" />;
}

// ==========================================
// MENU "MAIS" EM POPOVER
// ==========================================

function MoreMenu({ items, pathname, onNavigate, userRole, isCollapsed }: {
  items: AssignmentMenuItem[];
  pathname: string;
  onNavigate: () => void;
  userRole?: UserRole;
  isCollapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const hasActiveItem = items.some(item => pathname.startsWith(item.path));

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "w-full h-9 rounded-lg transition-all duration-200 flex items-center",
            isCollapsed ? "justify-center px-0" : "px-3",
            hasActiveItem
              ? "bg-zinc-800 text-zinc-200"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/60"
          )}
        >
          <MoreHorizontal className="h-[18px] w-[18px]" />
          {!isCollapsed && <span className="text-[13px] ml-2.5">Mais</span>}
          {!isCollapsed && <ChevronRight className={cn("h-3.5 w-3.5 ml-auto transition-transform", open && "rotate-90")} />}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side={isCollapsed ? "right" : "bottom"}
        align="start"
        className="w-48 p-1 bg-zinc-900 border-zinc-800"
      >
        {items.map((item) => {
          if (item.requiredRoles && userRole && !item.requiredRoles.includes(userRole)) {
            return null;
          }
          const Icon = iconMap[item.icon] || Briefcase;
          const isActive = pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              href={item.path}
              onClick={() => { setOpen(false); onNavigate(); }}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-[13px] transition-colors",
                isActive
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

// ==========================================
// MÓDULOS ESPECÍFICOS (Júri, EP, VVD)
// ==========================================

function SpecialtyModules({ modules, pathname, isCollapsed, onNavigate, userRole }: {
  modules: MenuSection[];
  pathname: string;
  isCollapsed: boolean;
  onNavigate: () => void;
  userRole?: UserRole;
}) {
  if (modules.length === 0) return null;

  return (
    <>
      <NavDivider label="Especialidade" collapsed={isCollapsed} />
      <SidebarMenu className="space-y-0.5 px-2">
        {modules.flatMap(section => section.items).slice(0, 4).map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path);
          return (
            <NavItem
              key={item.path}
              item={item}
              isActive={isActive}
              isCollapsed={isCollapsed}
              onNavigate={onNavigate}
              userRole={userRole}
              compact
            />
          );
        })}
      </SidebarMenu>
    </>
  );
}

// ==========================================
// CONTEÚDO PRINCIPAL DA SIDEBAR
// ==========================================

function AdminSidebarContent({ children, setSidebarWidth, userName, userEmail }: {
  children: ReactNode;
  setSidebarWidth: (width: number) => void;
  userName: string;
  userEmail?: string;
}) {
  const pathname = usePathname();
  const { state, openMobile, setOpenMobile } = useSidebar();
  const { config, modules, isLoading } = useAssignment();
  const { isAllSelected } = useAtribuicaoFiltro();
  const { user: sessionUser } = usePermissions();
  const { profissionalLogado } = useProfissional();

  const canSeeSpecializedModules = sessionUser?.role === "admin" ||
    (sessionUser?.role === "defensor" && profissionalLogado?.grupo === "juri_ep_vvd");
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  const userRole = sessionUser?.role as UserRole | undefined;
  const isCollapsed = isMobile ? false : state === "collapsed";
  const showSpecificModules = !isAllSelected;

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleNavigate = () => {
    if (isMobile && openMobile) setOpenMobile(false);
  };

  async function handleLogout() {
    await logoutAction();
  }

  return (
    <>
      <Sidebar
        collapsible="icon"
        className={cn(
          "border-r border-zinc-800/50",
          "bg-[#18181b]",
          "z-40"
        )}
      >
        {/* Header */}
        <SidebarHeader className={cn(
          "h-14 border-b border-zinc-800/50 flex items-center",
          isCollapsed ? "justify-center px-2" : "px-3"
        )}>
          <SidebarLogo collapsed={isCollapsed} />
        </SidebarHeader>

        {/* Content */}
        <SidebarContent className="px-0 py-0">
          {/* Contexto (Defensor) */}
          <ContextControl collapsed={isCollapsed} />

          <div className="flex-1 overflow-y-auto py-2">
            {/* Navegação Principal */}
            <SidebarMenu className="space-y-0.5 px-2">
              {MAIN_NAV.map((item) => {
                const isActive = pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path));
                return (
                  <NavItem
                    key={item.path}
                    item={item}
                    isActive={isActive}
                    isCollapsed={isCollapsed}
                    onNavigate={handleNavigate}
                    userRole={userRole}
                  />
                );
              })}
            </SidebarMenu>

            {/* Dados */}
            <NavDivider collapsed={isCollapsed} />
            <SidebarMenu className="space-y-0.5 px-2">
              {DATA_NAV.map((item) => {
                const isActive = pathname.startsWith(item.path);
                return (
                  <NavItem
                    key={item.path}
                    item={item}
                    isActive={isActive}
                    isCollapsed={isCollapsed}
                    onNavigate={handleNavigate}
                    userRole={userRole}
                  />
                );
              })}
            </SidebarMenu>

            {/* Recursos */}
            <NavDivider collapsed={isCollapsed} />
            <SidebarMenu className="space-y-0.5 px-2">
              {RESOURCES_NAV.map((item) => {
                const isActive = pathname.startsWith(item.path);
                return (
                  <NavItem
                    key={item.path}
                    item={item}
                    isActive={isActive}
                    isCollapsed={isCollapsed}
                    onNavigate={handleNavigate}
                    userRole={userRole}
                  />
                );
              })}
            </SidebarMenu>

            {/* Módulos Específicos */}
            {mounted && !isLoading && modules.length > 0 && showSpecificModules && canSeeSpecializedModules && (
              <SpecialtyModules
                modules={modules}
                pathname={pathname}
                isCollapsed={isCollapsed}
                onNavigate={handleNavigate}
                userRole={userRole}
              />
            )}

            {/* Gestão */}
            <NavDivider collapsed={isCollapsed} />
            <SidebarMenu className="space-y-0.5 px-2">
              {ADMIN_NAV.map((item) => {
                const isActive = pathname.startsWith(item.path);
                return (
                  <NavItem
                    key={item.path}
                    item={item}
                    isActive={isActive}
                    isCollapsed={isCollapsed}
                    onNavigate={handleNavigate}
                    userRole={userRole}
                  />
                );
              })}

              {/* Menu Mais */}
              <MoreMenu
                items={MORE_NAV}
                pathname={pathname}
                onNavigate={handleNavigate}
                userRole={userRole}
                isCollapsed={isCollapsed}
              />
            </SidebarMenu>
          </div>
        </SidebarContent>

        {/* Footer */}
        <SidebarFooter className="border-t border-zinc-800/50 p-0">
          {/* Status Bar */}
          <StatusBar collapsed={isCollapsed} />

          {/* Usuário */}
          <div className="p-2">
            <div className={cn(
              "flex items-center gap-2.5 p-2 rounded-lg transition-all duration-200 group/user",
              "hover:bg-zinc-800/60"
            )}>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-zinc-700 text-zinc-300 text-xs font-medium">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {userName}
                  </p>
                  <button
                    onClick={handleLogout}
                    className="text-[11px] text-zinc-500 hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content */}
      <SidebarInset className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        {/* Header */}
        <header className={cn(
          "flex h-12 shrink-0 items-center",
          "sticky top-0 z-30",
          "bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg",
          "border-b border-zinc-200 dark:border-zinc-800"
        )}>
          {/* Esquerda: Toggle + Breadcrumbs */}
          <div className="flex items-center gap-2 px-3 flex-1 min-w-0">
            <SidebarTrigger className="h-8 w-8 rounded-md text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" />
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <Breadcrumbs />
          </div>

          {/* Direita: Progresso + Controles */}
          <div className="flex items-center gap-2 px-3">
            <DailyProgress />

            <div className="hidden md:block h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

            <div className="hidden lg:block text-[11px] text-zinc-500">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
            </div>

            <div className="hidden lg:block h-4 w-px bg-zinc-200 dark:bg-zinc-800" />

            <div className="flex items-center gap-0.5">
              <CommandPalette />
              <ThemeToggle />
              <NotificationsPopover />
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
