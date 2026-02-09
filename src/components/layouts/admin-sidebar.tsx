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
  MoreHorizontal, Box, Puzzle, BookUser, Users2, Home, FolderInput
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
import { type AssignmentMenuItem } from "@/contexts/assignment-context";
import { useProfissional } from "@/contexts/profissional-context";
import { logoutAction } from "@/app/(dashboard)/actions";
import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminSidebarProps {
  children: ReactNode;
  userName: string;
  userEmail?: string;
}

// ==========================================
// MENU REORGANIZADO - NOVA ESTRUTURA
// ==========================================

// 1. Menu principal - itens do dia a dia (sem Delegações)
const MAIN_NAV: AssignmentMenuItem[] = [
  { label: "Dashboard", path: "/admin", icon: "LayoutDashboard" },
  { label: "Demandas", path: "/admin/demandas", icon: "ListTodo" },
  { label: "Agenda", path: "/admin/agenda", icon: "Calendar" },
];

// 2. Cadastros - Assistidos, Processos, Casos (azul)
const CADASTROS_NAV: AssignmentMenuItem[] = [
  { label: "Assistidos", path: "/admin/assistidos", icon: "Users", requiredRoles: ["admin", "defensor", "servidor", "estagiario", "triagem"] },
  { label: "Processos", path: "/admin/processos", icon: "Scale" },
  { label: "Casos", path: "/admin/casos", icon: "Briefcase" },
];

// 3. Documentos - Drive, Modelos, Jurisprudência, Distribuição (laranja)
const DOCUMENTOS_NAV: AssignmentMenuItem[] = [
  { label: "Distribuição", path: "/admin/distribuicao", icon: "FolderInput" },
  { label: "Drive", path: "/admin/drive", icon: "FolderOpen" },
  { label: "Modelos", path: "/admin/modelos", icon: "FileText" },
  { label: "Jurisprudência", path: "/admin/jurisprudencia", icon: "Scale" },
];

// 4. Cowork - Delegações, Equipe (roxo)
const COWORK_NAV: AssignmentMenuItem[] = [
  { label: "Delegações", path: "/admin/delegacoes", icon: "UserCheck", requiredRoles: ["admin", "defensor", "servidor", "estagiario"] },
  { label: "Equipe", path: "/admin/equipe", icon: "UsersRound", requiredRoles: ["admin", "defensor", "servidor"] },
];

// 5. Ferramentas - Lógica, Calculadoras, Calc. Prazos, Inteligência, Investigação (verde)
const TOOLS_NAV: AssignmentMenuItem[] = [
  { label: "Lógica", path: "/admin/logica", icon: "Brain" },
  { label: "Calculadoras", path: "/admin/calculadoras", icon: "Calculator" },
  { label: "Calc. Prazos", path: "/admin/calculadora-prazos", icon: "Clock" },
  { label: "Inteligência", path: "/admin/inteligencia", icon: "Sparkles" },
  { label: "Investigação", path: "/admin/diligencias", icon: "FileSearch" },
];

// 6. Módulos específicos por especialidade
const JURI_MODULES: AssignmentMenuItem[] = [
  { label: "Sessões do Júri", path: "/admin/juri", icon: "Gavel" },
  { label: "Plenário Live", path: "/admin/juri/cockpit", icon: "Zap" },
  { label: "Banco de Jurados", path: "/admin/juri/jurados", icon: "Users" },
  { label: "Palácio da Mente", path: "/admin/palacio-mente", icon: "Network" },
  { label: "Simulador 3D", path: "/admin/simulador-3d", icon: "Box" },
];

const VVD_MODULES: AssignmentMenuItem[] = [
  { label: "Audiências VVD", path: "/admin/vvd", icon: "Shield" },
  { label: "Medidas Protetivas", path: "/admin/vvd/medidas", icon: "Shield" },
];

const EP_MODULES: AssignmentMenuItem[] = [
  { label: "Execução Penal", path: "/admin/execucao-penal", icon: "Lock" },
  { label: "Calc. Execução Penal", path: "/admin/calculadoras?tipo=ep", icon: "Calculator" },
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
  ChevronRight, ListTodo, Network, UsersRound, MoreHorizontal, Box, Puzzle,
  BookUser, Users2, Home, FolderInput
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
// MENU "FERRAMENTAS" COLAPSÁVEL - ESTILO PREMIUM
// ==========================================

function ToolsMenu({ items, pathname, onNavigate, userRole, isCollapsed }: {
  items: AssignmentMenuItem[];
  pathname: string;
  onNavigate: () => void;
  userRole?: UserRole;
  isCollapsed: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasActiveItem = items.some(item => pathname.startsWith(item.path));

  // Auto-expandir se um item está ativo
  useEffect(() => {
    if (hasActiveItem && !expanded) {
      setExpanded(true);
    }
  }, [hasActiveItem]);

  if (isCollapsed) {
    return (
      <SidebarMenuItem>
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "h-10 w-10 p-0 mx-auto transition-all duration-300 rounded-xl flex items-center justify-center",
                hasActiveItem
                  ? "bg-emerald-600/20 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
              )}
            >
              <Puzzle className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="start"
            className="w-56 p-2 bg-[#1f1f23] border-zinc-700/50 shadow-xl shadow-black/30"
          >
            <p className="text-[10px] font-bold text-emerald-500/80 uppercase tracking-wider px-2 pb-2 flex items-center gap-1.5">
              <Puzzle className="h-3 w-3" />
              Ferramentas
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
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-200",
                    isActive
                      ? "bg-emerald-500/20 text-emerald-400 font-medium"
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
    <div className="space-y-0.5">
      {/* Botão principal - Ferramentas */}
      <SidebarMenuItem>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "w-full h-10 transition-all duration-300 rounded-xl flex items-center px-3 group/item",
            hasActiveItem
              ? "bg-emerald-600/15 text-emerald-400"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60"
          )}
        >
          <div className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center mr-2 transition-all duration-300",
            hasActiveItem
              ? "bg-emerald-500/20"
              : "bg-zinc-700/50 group-hover/item:bg-zinc-600/60"
          )}>
            <Puzzle className={cn(
              "h-4 w-4 transition-all duration-300",
              hasActiveItem ? "text-emerald-400" : "text-zinc-400 group-hover/item:text-zinc-200"
            )} />
          </div>
          <span className="text-[13px] font-medium">Ferramentas</span>
          <ChevronDown className={cn(
            "h-4 w-4 ml-auto transition-transform duration-300",
            expanded && "rotate-180"
          )} />
        </button>
      </SidebarMenuItem>

      {/* Sub-itens com animação */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="relative pl-4 space-y-0.5">
          {/* Linha vertical conectora */}
          <div className="absolute left-[22px] top-1 bottom-1 w-px bg-gradient-to-b from-emerald-500/30 via-zinc-700/40 to-transparent" />

          {items.map((item) => {
            if (item.requiredRoles && userRole && !item.requiredRoles.includes(userRole)) {
              return null;
            }
            const Icon = iconMap[item.icon] || Briefcase;
            const isActive = pathname.startsWith(item.path);
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={cn(
                    "h-9 transition-all duration-300 rounded-lg group/subitem relative",
                    isActive
                      ? "bg-emerald-500/15 text-emerald-400 font-medium"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/40"
                  )}
                >
                  <Link href={item.path} prefetch={true} onClick={onNavigate}>
                    {/* Indicador de conexão */}
                    <div className={cn(
                      "absolute left-[-12px] w-2 h-px transition-all duration-200",
                      isActive ? "bg-emerald-500/50" : "bg-zinc-700/50"
                    )} />
                    <Icon className={cn(
                      "h-3.5 w-3.5 mr-2 transition-all duration-300",
                      isActive ? "text-emerald-400" : "text-zinc-500 group-hover/subitem:text-zinc-300"
                    )} />
                    <span className="text-[12px] truncate">{item.label}</span>
                    {isActive && (
                      <div className="absolute right-2 w-1 h-1 rounded-full bg-emerald-400" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MENU "PRINCIPAL" COLAPSÁVEL - NEUTRO (INICIA EXPANDIDO)
// ==========================================

function PrincipalMenu({ items, pathname, onNavigate, userRole, isCollapsed }: {
  items: AssignmentMenuItem[];
  pathname: string;
  onNavigate: () => void;
  userRole?: UserRole;
  isCollapsed: boolean;
}) {
  // Inicia EXPANDIDO (diferente dos outros menus)
  const [expanded, setExpanded] = useState(true);
  const hasActiveItem = items.some(item =>
    pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path))
  );

  // Auto-expandir se um item está ativo
  useEffect(() => {
    if (hasActiveItem && !expanded) {
      setExpanded(true);
    }
  }, [hasActiveItem]);

  if (isCollapsed) {
    return (
      <SidebarMenuItem>
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "h-10 w-10 p-0 mx-auto transition-all duration-300 rounded-xl flex items-center justify-center",
                hasActiveItem
                  ? "bg-white/95 text-zinc-900 shadow-lg shadow-white/10"
                  : "text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
              )}
            >
              <Home className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="start"
            className="w-56 p-2 bg-[#1f1f23] border-zinc-700/50 shadow-xl shadow-black/30"
          >
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider px-2 pb-2 flex items-center gap-1.5">
              <Home className="h-3 w-3" />
              Principal
            </p>
            {items.map((item) => {
              if (item.requiredRoles && userRole && !item.requiredRoles.includes(userRole)) {
                return null;
              }
              const Icon = iconMap[item.icon] || Briefcase;
              const isActive = pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={onNavigate}
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
    <div className="space-y-0.5">
      {/* Botão principal - Principal */}
      <SidebarMenuItem>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "w-full h-10 transition-all duration-300 rounded-xl flex items-center px-3 group/item",
            hasActiveItem
              ? "bg-zinc-700/60 text-zinc-100"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60"
          )}
        >
          <div className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center mr-2 transition-all duration-300",
            hasActiveItem
              ? "bg-white/20"
              : "bg-zinc-700/50 group-hover/item:bg-zinc-600/60"
          )}>
            <Home className={cn(
              "h-4 w-4 transition-all duration-300",
              hasActiveItem ? "text-zinc-100" : "text-zinc-400 group-hover/item:text-zinc-200"
            )} />
          </div>
          <span className="text-[13px] font-medium">Principal</span>
          <ChevronDown className={cn(
            "h-4 w-4 ml-auto transition-transform duration-300",
            expanded && "rotate-180"
          )} />
        </button>
      </SidebarMenuItem>

      {/* Sub-itens com animação */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="relative pl-4 space-y-0.5">
          {/* Linha vertical conectora */}
          <div className="absolute left-[22px] top-1 bottom-1 w-px bg-gradient-to-b from-zinc-500/30 via-zinc-700/40 to-transparent" />

          {items.map((item) => {
            if (item.requiredRoles && userRole && !item.requiredRoles.includes(userRole)) {
              return null;
            }
            const Icon = iconMap[item.icon] || Briefcase;
            const isActive = pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path));
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={cn(
                    "h-9 transition-all duration-300 rounded-lg group/subitem relative",
                    isActive
                      ? "bg-white/95 text-zinc-900 font-semibold shadow-lg shadow-white/10"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/40"
                  )}
                >
                  <Link href={item.path} prefetch={true} onClick={onNavigate}>
                    {/* Indicador de conexão */}
                    <div className={cn(
                      "absolute left-[-12px] w-2 h-px transition-all duration-200",
                      isActive ? "bg-white/50" : "bg-zinc-700/50"
                    )} />
                    <Icon className={cn(
                      "h-3.5 w-3.5 mr-2 transition-all duration-300",
                      isActive ? "text-zinc-900" : "text-zinc-500 group-hover/subitem:text-zinc-300"
                    )} />
                    <span className="text-[12px] truncate">{item.label}</span>
                    {isActive && (
                      <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-zinc-900/40" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MENU "CADASTROS" COLAPSÁVEL - AZUL
// ==========================================

function CadastrosMenu({ items, pathname, onNavigate, userRole, isCollapsed }: {
  items: AssignmentMenuItem[];
  pathname: string;
  onNavigate: () => void;
  userRole?: UserRole;
  isCollapsed: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasActiveItem = items.some(item => pathname.startsWith(item.path));

  // Auto-expandir se um item está ativo
  useEffect(() => {
    if (hasActiveItem && !expanded) {
      setExpanded(true);
    }
  }, [hasActiveItem]);

  if (isCollapsed) {
    return (
      <SidebarMenuItem>
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "h-10 w-10 p-0 mx-auto transition-all duration-300 rounded-xl flex items-center justify-center",
                hasActiveItem
                  ? "bg-blue-600/20 text-blue-400 ring-1 ring-blue-500/30"
                  : "text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
              )}
            >
              <BookUser className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="start"
            className="w-56 p-2 bg-[#1f1f23] border-zinc-700/50 shadow-xl shadow-black/30"
          >
            <p className="text-[10px] font-bold text-blue-500/80 uppercase tracking-wider px-2 pb-2 flex items-center gap-1.5">
              <BookUser className="h-3 w-3" />
              Cadastros
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
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-200",
                    isActive
                      ? "bg-blue-500/20 text-blue-400 font-medium"
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
    <div className="space-y-0.5">
      {/* Botão principal - Cadastros */}
      <SidebarMenuItem>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "w-full h-10 transition-all duration-300 rounded-xl flex items-center px-3 group/item",
            hasActiveItem
              ? "bg-blue-600/15 text-blue-400"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60"
          )}
        >
          <div className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center mr-2 transition-all duration-300",
            hasActiveItem
              ? "bg-blue-500/20"
              : "bg-zinc-700/50 group-hover/item:bg-zinc-600/60"
          )}>
            <BookUser className={cn(
              "h-4 w-4 transition-all duration-300",
              hasActiveItem ? "text-blue-400" : "text-zinc-400 group-hover/item:text-zinc-200"
            )} />
          </div>
          <span className="text-[13px] font-medium">Cadastros</span>
          <ChevronDown className={cn(
            "h-4 w-4 ml-auto transition-transform duration-300",
            expanded && "rotate-180"
          )} />
        </button>
      </SidebarMenuItem>

      {/* Sub-itens com animação */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="relative pl-4 space-y-0.5">
          {/* Linha vertical conectora */}
          <div className="absolute left-[22px] top-1 bottom-1 w-px bg-gradient-to-b from-blue-500/30 via-zinc-700/40 to-transparent" />

          {items.map((item) => {
            if (item.requiredRoles && userRole && !item.requiredRoles.includes(userRole)) {
              return null;
            }
            const Icon = iconMap[item.icon] || Briefcase;
            const isActive = pathname.startsWith(item.path);
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={cn(
                    "h-9 transition-all duration-300 rounded-lg group/subitem relative",
                    isActive
                      ? "bg-blue-500/15 text-blue-400 font-medium"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/40"
                  )}
                >
                  <Link href={item.path} prefetch={true} onClick={onNavigate}>
                    {/* Indicador de conexão */}
                    <div className={cn(
                      "absolute left-[-12px] w-2 h-px transition-all duration-200",
                      isActive ? "bg-blue-500/50" : "bg-zinc-700/50"
                    )} />
                    <Icon className={cn(
                      "h-3.5 w-3.5 mr-2 transition-all duration-300",
                      isActive ? "text-blue-400" : "text-zinc-500 group-hover/subitem:text-zinc-300"
                    )} />
                    <span className="text-[12px] truncate">{item.label}</span>
                    {isActive && (
                      <div className="absolute right-2 w-1 h-1 rounded-full bg-blue-400" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MENU "DOCUMENTOS" COLAPSÁVEL - LARANJA
// ==========================================

function DocumentosMenu({ items, pathname, onNavigate, userRole, isCollapsed }: {
  items: AssignmentMenuItem[];
  pathname: string;
  onNavigate: () => void;
  userRole?: UserRole;
  isCollapsed: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasActiveItem = items.some(item => pathname.startsWith(item.path));

  // Auto-expandir se um item está ativo
  useEffect(() => {
    if (hasActiveItem && !expanded) {
      setExpanded(true);
    }
  }, [hasActiveItem]);

  if (isCollapsed) {
    return (
      <SidebarMenuItem>
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "h-10 w-10 p-0 mx-auto transition-all duration-300 rounded-xl flex items-center justify-center",
                hasActiveItem
                  ? "bg-orange-600/20 text-orange-400 ring-1 ring-orange-500/30"
                  : "text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
              )}
            >
              <FolderOpen className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="start"
            className="w-56 p-2 bg-[#1f1f23] border-zinc-700/50 shadow-xl shadow-black/30"
          >
            <p className="text-[10px] font-bold text-orange-500/80 uppercase tracking-wider px-2 pb-2 flex items-center gap-1.5">
              <FolderOpen className="h-3 w-3" />
              Documentos
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
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-200",
                    isActive
                      ? "bg-orange-500/20 text-orange-400 font-medium"
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
    <div className="space-y-0.5">
      {/* Botão principal - Documentos */}
      <SidebarMenuItem>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "w-full h-10 transition-all duration-300 rounded-xl flex items-center px-3 group/item",
            hasActiveItem
              ? "bg-orange-600/15 text-orange-400"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60"
          )}
        >
          <div className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center mr-2 transition-all duration-300",
            hasActiveItem
              ? "bg-orange-500/20"
              : "bg-zinc-700/50 group-hover/item:bg-zinc-600/60"
          )}>
            <FolderOpen className={cn(
              "h-4 w-4 transition-all duration-300",
              hasActiveItem ? "text-orange-400" : "text-zinc-400 group-hover/item:text-zinc-200"
            )} />
          </div>
          <span className="text-[13px] font-medium">Documentos</span>
          <ChevronDown className={cn(
            "h-4 w-4 ml-auto transition-transform duration-300",
            expanded && "rotate-180"
          )} />
        </button>
      </SidebarMenuItem>

      {/* Sub-itens com animação */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="relative pl-4 space-y-0.5">
          {/* Linha vertical conectora */}
          <div className="absolute left-[22px] top-1 bottom-1 w-px bg-gradient-to-b from-orange-500/30 via-zinc-700/40 to-transparent" />

          {items.map((item) => {
            if (item.requiredRoles && userRole && !item.requiredRoles.includes(userRole)) {
              return null;
            }
            const Icon = iconMap[item.icon] || Briefcase;
            const isActive = pathname.startsWith(item.path);
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={cn(
                    "h-9 transition-all duration-300 rounded-lg group/subitem relative",
                    isActive
                      ? "bg-orange-500/15 text-orange-400 font-medium"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/40"
                  )}
                >
                  <Link href={item.path} prefetch={true} onClick={onNavigate}>
                    {/* Indicador de conexão */}
                    <div className={cn(
                      "absolute left-[-12px] w-2 h-px transition-all duration-200",
                      isActive ? "bg-orange-500/50" : "bg-zinc-700/50"
                    )} />
                    <Icon className={cn(
                      "h-3.5 w-3.5 mr-2 transition-all duration-300",
                      isActive ? "text-orange-400" : "text-zinc-500 group-hover/subitem:text-zinc-300"
                    )} />
                    <span className="text-[12px] truncate">{item.label}</span>
                    {isActive && (
                      <div className="absolute right-2 w-1 h-1 rounded-full bg-orange-400" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MENU "COWORK" COLAPSÁVEL - ROXO
// ==========================================

function CoworkMenu({ items, pathname, onNavigate, userRole, isCollapsed }: {
  items: AssignmentMenuItem[];
  pathname: string;
  onNavigate: () => void;
  userRole?: UserRole;
  isCollapsed: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasActiveItem = items.some(item => pathname.startsWith(item.path));

  // Auto-expandir se um item está ativo
  useEffect(() => {
    if (hasActiveItem && !expanded) {
      setExpanded(true);
    }
  }, [hasActiveItem]);

  if (isCollapsed) {
    return (
      <SidebarMenuItem>
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "h-10 w-10 p-0 mx-auto transition-all duration-300 rounded-xl flex items-center justify-center",
                hasActiveItem
                  ? "bg-purple-600/20 text-purple-400 ring-1 ring-purple-500/30"
                  : "text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
              )}
            >
              <Users2 className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="start"
            className="w-56 p-2 bg-[#1f1f23] border-zinc-700/50 shadow-xl shadow-black/30"
          >
            <p className="text-[10px] font-bold text-purple-500/80 uppercase tracking-wider px-2 pb-2 flex items-center gap-1.5">
              <Users2 className="h-3 w-3" />
              Cowork
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
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-200",
                    isActive
                      ? "bg-purple-500/20 text-purple-400 font-medium"
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
    <div className="space-y-0.5">
      {/* Botão principal - Cowork */}
      <SidebarMenuItem>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "w-full h-10 transition-all duration-300 rounded-xl flex items-center px-3 group/item",
            hasActiveItem
              ? "bg-purple-600/15 text-purple-400"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60"
          )}
        >
          <div className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center mr-2 transition-all duration-300",
            hasActiveItem
              ? "bg-purple-500/20"
              : "bg-zinc-700/50 group-hover/item:bg-zinc-600/60"
          )}>
            <Users2 className={cn(
              "h-4 w-4 transition-all duration-300",
              hasActiveItem ? "text-purple-400" : "text-zinc-400 group-hover/item:text-zinc-200"
            )} />
          </div>
          <span className="text-[13px] font-medium">Cowork</span>
          <ChevronDown className={cn(
            "h-4 w-4 ml-auto transition-transform duration-300",
            expanded && "rotate-180"
          )} />
        </button>
      </SidebarMenuItem>

      {/* Sub-itens com animação */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        expanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="relative pl-4 space-y-0.5">
          {/* Linha vertical conectora */}
          <div className="absolute left-[22px] top-1 bottom-1 w-px bg-gradient-to-b from-purple-500/30 via-zinc-700/40 to-transparent" />

          {items.map((item) => {
            if (item.requiredRoles && userRole && !item.requiredRoles.includes(userRole)) {
              return null;
            }
            const Icon = iconMap[item.icon] || Briefcase;
            const isActive = pathname.startsWith(item.path);
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={cn(
                    "h-9 transition-all duration-300 rounded-lg group/subitem relative",
                    isActive
                      ? "bg-purple-500/15 text-purple-400 font-medium"
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/40"
                  )}
                >
                  <Link href={item.path} prefetch={true} onClick={onNavigate}>
                    {/* Indicador de conexão */}
                    <div className={cn(
                      "absolute left-[-12px] w-2 h-px transition-all duration-200",
                      isActive ? "bg-purple-500/50" : "bg-zinc-700/50"
                    )} />
                    <Icon className={cn(
                      "h-3.5 w-3.5 mr-2 transition-all duration-300",
                      isActive ? "text-purple-400" : "text-zinc-500 group-hover/subitem:text-zinc-300"
                    )} />
                    <span className="text-[12px] truncate">{item.label}</span>
                    {isActive && (
                      <div className="absolute right-2 w-1 h-1 rounded-full bg-purple-400" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MENU "ESPECIALIDADES" COLAPSÁVEL - CORES POR TIPO
// ==========================================

type Especialidade = "JURI" | "VVD" | "EP";

// Cores distintas por especialidade
const ESPECIALIDADE_COLORS = {
  JURI: {
    bg: "bg-emerald-500/20",
    text: "text-emerald-400",
    ring: "ring-emerald-500/30",
    bgHover: "hover:bg-emerald-700/30",
    line: "from-emerald-500/30"
  },
  VVD: {
    bg: "bg-yellow-500/20",
    text: "text-yellow-400",
    ring: "ring-yellow-500/30",
    bgHover: "hover:bg-yellow-700/30",
    line: "from-yellow-500/30"
  },
  EP: {
    bg: "bg-blue-500/20",
    text: "text-blue-400",
    ring: "ring-blue-500/30",
    bgHover: "hover:bg-blue-700/30",
    line: "from-blue-500/30"
  }
};

function EspecialidadesMenu({ pathname, onNavigate, userRole, isCollapsed }: {
  pathname: string;
  onNavigate: () => void;
  userRole?: UserRole;
  isCollapsed: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [especialidade, setEspecialidade] = useState<Especialidade>("JURI");

  // Determinar módulos baseado na especialidade selecionada
  const modules = especialidade === "JURI" ? JURI_MODULES
    : especialidade === "VVD" ? VVD_MODULES
    : EP_MODULES;

  const hasActiveItem = [...JURI_MODULES, ...VVD_MODULES, ...EP_MODULES].some(
    item => pathname.startsWith(item.path)
  );

  // Auto-expandir se um item está ativo
  useEffect(() => {
    if (hasActiveItem && !expanded) {
      setExpanded(true);
    }
    // Detectar especialidade ativa baseado no path
    if (pathname.includes('/juri') || pathname.includes('/palacio-mente') || pathname.includes('/simulador-3d')) {
      setEspecialidade("JURI");
    } else if (pathname.includes('/vvd')) {
      setEspecialidade("VVD");
    } else if (pathname.includes('/execucao-penal') || pathname.includes('tipo=ep')) {
      setEspecialidade("EP");
    }
  }, [hasActiveItem, pathname]);

  if (isCollapsed) {
    return (
      <SidebarMenuItem>
        <Popover>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "h-10 w-10 p-0 mx-auto transition-all duration-300 rounded-xl flex items-center justify-center",
                hasActiveItem
                  ? "bg-amber-600/20 text-amber-400 ring-1 ring-amber-500/30"
                  : "text-zinc-400 hover:bg-zinc-700/60 hover:text-zinc-200"
              )}
            >
              <Target className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="start"
            className="w-64 p-2 bg-[#1f1f23] border-zinc-700/50 shadow-xl shadow-black/30"
          >
            <p className="text-[10px] font-bold text-amber-500/80 uppercase tracking-wider px-2 pb-2 flex items-center gap-1.5">
              <Target className="h-3 w-3" />
              Especialidades
            </p>

            {/* Seletor de especialidade com cores distintas */}
            <div className="flex gap-1 px-2 pb-2 mb-2 border-b border-zinc-700/50">
              {[
                { id: "JURI" as Especialidade, label: "Júri", icon: Gavel, colors: ESPECIALIDADE_COLORS.JURI },
                { id: "VVD" as Especialidade, label: "VVD", icon: Shield, colors: ESPECIALIDADE_COLORS.VVD },
                { id: "EP" as Especialidade, label: "EP", icon: Lock, colors: ESPECIALIDADE_COLORS.EP },
              ].map((esp) => (
                <button
                  key={esp.id}
                  onClick={() => setEspecialidade(esp.id)}
                  className={cn(
                    "flex-1 py-1.5 px-2 rounded-lg text-[10px] font-semibold transition-all duration-200 flex items-center justify-center gap-1",
                    especialidade === esp.id
                      ? `${esp.colors.bg} ${esp.colors.text} ring-1 ${esp.colors.ring}`
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50"
                  )}
                >
                  <esp.icon className={cn("h-3 w-3", especialidade === esp.id && esp.colors.text)} />
                  {esp.label}
                </button>
              ))}
            </div>

            {modules.map((item) => {
              if (item.requiredRoles && userRole && !item.requiredRoles.includes(userRole)) {
                return null;
              }
              const Icon = iconMap[item.icon] || Briefcase;
              const isActive = pathname.startsWith(item.path);
              return (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-200",
                    isActive
                      ? "bg-amber-500/20 text-amber-400 font-medium"
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
    <div className="space-y-0.5">
      {/* Botão principal - Especialidades */}
      <SidebarMenuItem>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "w-full h-10 transition-all duration-300 rounded-xl flex items-center px-3 group/item",
            hasActiveItem
              ? "bg-amber-600/15 text-amber-400"
              : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60"
          )}
        >
          <div className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center mr-2 transition-all duration-300",
            hasActiveItem
              ? "bg-amber-500/20"
              : "bg-zinc-700/50 group-hover/item:bg-zinc-600/60"
          )}>
            <Target className={cn(
              "h-4 w-4 transition-all duration-300",
              hasActiveItem ? "text-amber-400" : "text-zinc-400 group-hover/item:text-zinc-200"
            )} />
          </div>
          <span className="text-[13px] font-medium">Especialidades</span>
          <ChevronDown className={cn(
            "h-4 w-4 ml-auto transition-transform duration-300",
            expanded && "rotate-180"
          )} />
        </button>
      </SidebarMenuItem>

      {/* Sub-itens com animação */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        expanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="relative pl-4 space-y-0.5">
          {/* Linha vertical conectora - cor dinâmica */}
          <div className={cn(
            "absolute left-[22px] top-1 bottom-1 w-px bg-gradient-to-b via-zinc-700/40 to-transparent",
            ESPECIALIDADE_COLORS[especialidade].line
          )} />

          {/* Seletor de especialidade inline com cores distintas */}
          <div className="flex gap-1 py-1.5 pr-2">
            {[
              { id: "JURI" as Especialidade, label: "Júri", icon: Gavel, colors: ESPECIALIDADE_COLORS.JURI },
              { id: "VVD" as Especialidade, label: "VVD", icon: Shield, colors: ESPECIALIDADE_COLORS.VVD },
              { id: "EP" as Especialidade, label: "EP", icon: Lock, colors: ESPECIALIDADE_COLORS.EP },
            ].map((esp) => (
              <button
                key={esp.id}
                onClick={() => setEspecialidade(esp.id)}
                className={cn(
                  "flex-1 py-1.5 px-2 rounded-lg text-[10px] font-semibold transition-all duration-200 flex items-center justify-center gap-1",
                  especialidade === esp.id
                    ? `${esp.colors.bg} ${esp.colors.text} ring-1 ${esp.colors.ring}`
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700/50"
                )}
              >
                <esp.icon className={cn("h-3 w-3", especialidade === esp.id && esp.colors.text)} />
                {esp.label}
              </button>
            ))}
          </div>

          {modules.map((item) => {
            if (item.requiredRoles && userRole && !item.requiredRoles.includes(userRole)) {
              return null;
            }
            const Icon = iconMap[item.icon] || Briefcase;
            const isActive = pathname.startsWith(item.path);
            const activeColor = ESPECIALIDADE_COLORS[especialidade];
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={cn(
                    "h-9 transition-all duration-300 rounded-lg group/subitem relative",
                    isActive
                      ? `${activeColor.bg} ${activeColor.text} font-medium`
                      : "text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/40"
                  )}
                >
                  <Link href={item.path} prefetch={true} onClick={onNavigate}>
                    {/* Indicador de conexão */}
                    <div className={cn(
                      "absolute left-[-12px] w-2 h-px transition-all duration-200",
                      isActive
                        ? especialidade === "JURI" ? "bg-emerald-500/50"
                          : especialidade === "VVD" ? "bg-yellow-500/50"
                          : "bg-blue-500/50"
                        : "bg-zinc-700/50"
                    )} />
                    <Icon className={cn(
                      "h-3.5 w-3.5 mr-2 transition-all duration-300",
                      isActive ? activeColor.text : "text-zinc-500 group-hover/subitem:text-zinc-300"
                    )} />
                    <span className="text-[12px] truncate">{item.label}</span>
                    {isActive && (
                      <div className={cn(
                        "absolute right-2 w-1 h-1 rounded-full",
                        especialidade === "JURI" ? "bg-emerald-400"
                          : especialidade === "VVD" ? "bg-yellow-400"
                          : "bg-blue-400"
                      )} />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </div>
      </div>
    </div>
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
  const { user: sessionUser } = usePermissions();
  const { profissionalLogado } = useProfissional();

  const canSeeSpecializedModules = sessionUser?.role === "admin" ||
    (sessionUser?.role === "defensor" && profissionalLogado?.grupo === "juri_ep_vvd");
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  const userRole = sessionUser?.role as UserRole | undefined;
  const isCollapsed = isMobile ? false : state === "collapsed";

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
            {/* 1. Principal (Dashboard, Demandas, Agenda) - Colapsável com ícone Home */}
            <SidebarMenu className="space-y-0.5">
              <PrincipalMenu
                items={MAIN_NAV}
                pathname={pathname}
                onNavigate={handleNavigate}
                userRole={userRole}
                isCollapsed={isCollapsed}
              />
            </SidebarMenu>

            {/* 2. Cadastros (Assistidos, Processos, Casos) - Azul */}
            <NavDivider collapsed={isCollapsed} />
            <SidebarMenu className="space-y-0.5">
              <CadastrosMenu
                items={CADASTROS_NAV}
                pathname={pathname}
                onNavigate={handleNavigate}
                userRole={userRole}
                isCollapsed={isCollapsed}
              />
            </SidebarMenu>

            {/* 3. Documentos (Drive, Modelos, Jurisprudência) - Laranja */}
            <NavDivider collapsed={isCollapsed} />
            <SidebarMenu className="space-y-0.5">
              <DocumentosMenu
                items={DOCUMENTOS_NAV}
                pathname={pathname}
                onNavigate={handleNavigate}
                userRole={userRole}
                isCollapsed={isCollapsed}
              />
            </SidebarMenu>

            {/* 4. Cowork (Delegações, Equipe) - Roxo */}
            <NavDivider collapsed={isCollapsed} />
            <SidebarMenu className="space-y-0.5">
              <CoworkMenu
                items={COWORK_NAV}
                pathname={pathname}
                onNavigate={handleNavigate}
                userRole={userRole}
                isCollapsed={isCollapsed}
              />
            </SidebarMenu>

            {/* 5. Ferramentas - Verde */}
            <NavDivider collapsed={isCollapsed} />
            <SidebarMenu className="space-y-0.5">
              <ToolsMenu
                items={TOOLS_NAV}
                pathname={pathname}
                onNavigate={handleNavigate}
                userRole={userRole}
                isCollapsed={isCollapsed}
              />
            </SidebarMenu>

            {/* 6. Especialidades (Júri/VVD/EP) - Amber */}
            {canSeeSpecializedModules && (
              <>
                <NavDivider collapsed={isCollapsed} />
                <SidebarMenu className="space-y-0.5">
                  <EspecialidadesMenu
                    pathname={pathname}
                    onNavigate={handleNavigate}
                    userRole={userRole}
                    isCollapsed={isCollapsed}
                  />
                </SidebarMenu>
              </>
            )}

            {/* 7. Mais */}
            <NavDivider collapsed={isCollapsed} />
            <SidebarMenu className="space-y-0.5">
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
