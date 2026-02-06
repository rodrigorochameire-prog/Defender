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
  MoreHorizontal
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
import {
  useAssignment,
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
  { label: "Delegações", path: "/admin/delegacoes", icon: "UserCheck", requiredRoles: ["admin", "defensor", "servidor", "estagiario"] },
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
  ChevronRight, ListTodo, Network, UsersRound, MoreHorizontal
};

const SIDEBAR_WIDTH_KEY = "admin-sidebar-width";
const DEFAULT_WIDTH = 260;

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
// COMPONENTE DE ITEM DE MENU - ESTILO PREMIUM
// ==========================================

function NavItem({ item, isActive, isCollapsed, onNavigate, userRole }: {
  item: AssignmentMenuItem;
  isActive: boolean;
  isCollapsed: boolean;
  onNavigate: () => void;
  userRole?: UserRole;
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
            "h-10 w-10 p-0 mx-auto transition-all duration-300 rounded-xl flex items-center justify-center",
            isActive
              ? "bg-white/95 text-zinc-900 shadow-lg shadow-white/10"
              : "text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
          )}
        >
          <Link href={item.path} prefetch={true} onClick={onNavigate}>
            <Icon className={cn(
              "h-5 w-5 transition-all duration-300",
              isActive ? "text-zinc-900" : "text-zinc-400"
            )} strokeWidth={isActive ? 2.5 : 2} />
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
        tooltip={item.label}
        className={cn(
          "h-10 transition-all duration-300 rounded-xl group/item relative overflow-hidden",
          isActive
            ? "bg-white/95 text-zinc-900 shadow-lg shadow-white/10 font-semibold"
            : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60"
        )}
      >
        <Link href={item.path} prefetch={true} onClick={onNavigate}>
          <div className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center mr-2 transition-all duration-300",
            isActive
              ? "bg-zinc-900/10"
              : "bg-zinc-700/50 group-hover/item:bg-zinc-600/60"
          )}>
            <Icon className={cn(
              "h-4 w-4 transition-all duration-300 flex-shrink-0",
              isActive ? "text-zinc-900" : "text-zinc-400 group-hover/item:text-zinc-200"
            )} strokeWidth={isActive ? 2.5 : 2} />
          </div>
          <span className="text-[13px] font-medium truncate">{item.label}</span>
          {item.isPremium && (
            <Sparkles className="h-3 w-3 text-amber-400 ml-auto" />
          )}
          {isActive && !item.isPremium && (
            <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-zinc-900/40" />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

// ==========================================
// DIVISOR SUTIL
// ==========================================

function NavDivider({ collapsed }: { collapsed: boolean }) {
  if (collapsed) {
    return <div className="my-3 mx-2 h-px bg-zinc-700/50" />;
  }

  return <div className="my-3 mx-3 h-px bg-gradient-to-r from-zinc-700/60 via-zinc-700/30 to-transparent" />;
}

// ==========================================
// MENU "MAIS" EM POPOVER - ESTILO PREMIUM
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

  if (isCollapsed) {
    return (
      <SidebarMenuItem>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "h-10 w-10 p-0 mx-auto transition-all duration-300 rounded-xl flex items-center justify-center",
                hasActiveItem
                  ? "bg-zinc-700/80 text-zinc-200"
                  : "text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
              )}
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="start"
            className="w-52 p-2 bg-[#1f1f23] border-zinc-700/50 shadow-xl shadow-black/30"
          >
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2 pb-2">
              Mais opções
            </p>
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
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-200",
                    isActive
                      ? "bg-white/95 text-zinc-900 font-medium"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </PopoverContent>
        </Popover>
      </SidebarMenuItem>
    );
  }

  return (
    <SidebarMenuItem>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            className={cn(
              "w-full h-10 transition-all duration-300 rounded-xl flex items-center px-3 group/item",
              hasActiveItem
                ? "bg-zinc-700/80 text-zinc-200"
                : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60"
            )}
          >
            <div className={cn(
              "h-7 w-7 rounded-lg flex items-center justify-center mr-2 transition-all duration-300",
              "bg-zinc-700/50 group-hover/item:bg-zinc-600/60"
            )}>
              <MoreHorizontal className="h-4 w-4" />
            </div>
            <span className="text-[13px] font-medium">Mais</span>
            <ChevronRight className={cn(
              "h-4 w-4 ml-auto transition-transform duration-200",
              open && "rotate-90"
            )} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          align="start"
          className="w-52 p-2 bg-[#1f1f23] border-zinc-700/50 shadow-xl shadow-black/30"
        >
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-2 pb-2">
            Mais opções
          </p>
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
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-200",
                  isActive
                    ? "bg-white/95 text-zinc-900 font-medium"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </PopoverContent>
      </Popover>
    </SidebarMenuItem>
  );
}

// ==========================================
// MÓDULOS ESPECÍFICOS (Júri, EP, VVD)
// ==========================================

function SpecialtyModules({ modules, pathname, isCollapsed, onNavigate, userRole, configName }: {
  modules: MenuSection[];
  pathname: string;
  isCollapsed: boolean;
  onNavigate: () => void;
  userRole?: UserRole;
  configName: string;
}) {
  if (modules.length === 0) return null;

  return (
    <>
      <NavDivider collapsed={isCollapsed} />
      {!isCollapsed && (
        <div className="px-4 pb-2 flex items-center gap-2">
          <Target className="h-3.5 w-3.5 text-zinc-500" />
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            {configName}
          </span>
        </div>
      )}
      <SidebarMenu className="space-y-0.5 px-3">
        {modules.flatMap(section => section.items).slice(0, 5).map((item) => {
          const isActive = pathname === item.path || pathname.startsWith(item.path);
          return (
            <NavItem
              key={item.path}
              item={item}
              isActive={isActive}
              isCollapsed={isCollapsed}
              onNavigate={onNavigate}
              userRole={userRole}
            />
          );
        })}
      </SidebarMenu>
    </>
  );
}

// ==========================================
// CONTEÚDO PRINCIPAL DA SIDEBAR - ESTILO PREMIUM
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
          "border-r border-zinc-700/30",
          "bg-gradient-to-b from-[#1f1f23] via-[#1a1a1e] to-[#1f1f23]",
          "shadow-2xl shadow-black/50",
          "z-40"
        )}
      >
        {/* Header Premium Escuro */}
        <SidebarHeader className={cn(
          "h-16 border-b border-zinc-700/30 flex items-center justify-center",
          "bg-gradient-to-br from-[#252529] via-[#1f1f23] to-[#252529]"
        )}>
          <SidebarLogo collapsed={isCollapsed} />
        </SidebarHeader>

        {/* Content com Scroll Suave */}
        <SidebarContent className="px-0 py-0 scrollbar-thin scrollbar-thumb-zinc-700/50 scrollbar-track-transparent">
          {/* Painel de Contexto - Seletor de Defensor */}
          <ContextControl collapsed={isCollapsed} />

          <div className="px-3 pb-5">
            {/* Navegação Principal */}
            <SidebarMenu className="space-y-0.5">
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
            <SidebarMenu className="space-y-0.5">
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
            <SidebarMenu className="space-y-0.5">
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
                configName={config.shortName}
              />
            )}

            {/* Gestão + Mais */}
            <NavDivider collapsed={isCollapsed} />
            <SidebarMenu className="space-y-0.5">
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

        {/* Footer Premium Escuro */}
        <SidebarFooter className={cn(
          "border-t border-zinc-700/30 p-0",
          "bg-gradient-to-t from-[#1a1a1e] via-[#1f1f23] to-transparent"
        )}>
          {/* Status Bar */}
          <StatusBar collapsed={isCollapsed} />

          {/* Card do usuário */}
          <div className="p-3">
            <div className={cn(
              "flex items-center gap-3 p-2.5 rounded-2xl transition-all duration-300 group/user",
              "bg-gradient-to-br from-[#2a2a2f] to-[#1f1f23]",
              "hover:from-[#323238] hover:to-[#252529]",
              "border border-zinc-600/40",
              "hover:border-emerald-600/40",
              "hover:shadow-lg hover:shadow-black/20"
            )}>
              <Avatar className={cn(
                "h-10 w-10 transition-all duration-300",
                "ring-2 ring-zinc-600/50 ring-offset-2 ring-offset-zinc-900",
                "group-hover/user:ring-emerald-500/40 group-hover/user:scale-105"
              )}>
                <AvatarFallback className="bg-gradient-to-br from-zinc-600 via-zinc-700 to-zinc-800 text-white font-bold text-xs shadow-inner">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-100 truncate tracking-tight">
                    {userName}
                  </p>
                  <button
                    onClick={handleLogout}
                    className={cn(
                      "text-[11px] flex items-center gap-1.5 mt-0.5 transition-all duration-200",
                      "text-zinc-500 hover:text-red-400",
                      "font-medium"
                    )}
                  >
                    <LogOut className="w-3 h-3" />
                    Sair da conta
                  </button>
                </div>
              )}
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content */}
      <SidebarInset className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        {/* Header - Premium unificado */}
        <header className={cn(
          "relative overflow-hidden",
          "flex h-14 shrink-0 items-center",
          "sticky top-0 z-30"
        )}>
          {/* Fundo base */}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/95 via-zinc-800/80 to-zinc-900/95 backdrop-blur-xl" />

          {/* Linha de brilho superior */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

          {/* Borda inferior elegante */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-zinc-800 via-zinc-600/40 to-zinc-800" />

          {/* Conteúdo - Esquerda: Toggle + Breadcrumbs */}
          <div className="relative flex items-center gap-3 px-3 flex-1 min-w-0">
            <SidebarTrigger className="h-7 w-7 rounded-md text-zinc-500 hover:text-emerald-400 hover:bg-zinc-700/50 transition-all duration-300 shrink-0" />

            {/* Separador */}
            <div className="h-4 w-px bg-zinc-700/50 shrink-0" />

            {/* Breadcrumbs navegáveis */}
            <Breadcrumbs />
          </div>

          {/* Conteúdo - Direita: Indicador + Data + Controles */}
          <div className="relative flex items-center gap-3 px-3">
            {/* Indicador ativo */}
            <div className="hidden md:flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
              <span className="text-[10px] text-zinc-500 font-medium">Online</span>
            </div>

            {/* Separador */}
            <div className="hidden md:block h-4 w-px bg-zinc-700/40" />

            {/* Data */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-zinc-400">
              <span className="capitalize">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}</span>
            </div>

            {/* Separador */}
            <div className="hidden lg:block h-4 w-px bg-zinc-700/40" />

            {/* Controles */}
            <div className="flex items-center gap-1">
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
