"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Calendar, Bell, FileText, LogOut, User,
  Settings, BarChart3, Scale, Gavel, Clock, AlertTriangle, Calculator,
  FolderOpen, Building2, Briefcase, Target, Shield, Lock, RefreshCw,
  Award, TrendingUp, ChevronDown, Zap, Brain, Mic, Heart, ClipboardCheck, ClipboardList,
  Columns3, History, PieChart, Handshake, CalendarDays, Sparkles, MessageCircle,
  FileSearch, UserCheck, ChevronRight, Menu, X, ListTodo, Network, UsersRound,
  MoreHorizontal, Box, Puzzle, BookUser, Users2, Home, FolderInput, Sun,
  MessageSquare, FileCheck, ArrowLeftRight, Timer, Newspaper, Rss, Radio, Map, Activity,
  UserPlus
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
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsPopover } from "@/components/notifications-popover";
import { ContextControl } from "@/components/layout/context-control";
import { CommandPalette } from "@/components/shared/command-palette";
import { ChatPanel } from "@/components/shared/chat-panel";
import { chatPanelActions } from "@/hooks/use-chat-panel";
import { EntitySheetProvider } from "@/contexts/entity-sheet-context";
import { PlaudArrivalToast } from "@/components/atendimentos/plaud-arrival-toast";
import { RadarMatchesToast } from "@/components/radar/radar-matches-toast";
import { PrazoAlertToast } from "@/components/demandas/prazo-alert-toast";
import { SidebarLogo } from "@/components/shared/logo";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { StatusBar } from "@/components/layout/status-bar";
import { OfflineSyncProvider } from "@/components/layout/offline-sync-provider";
import { MobileBottomNav } from "@/components/shared/mobile-bottom-nav";
import { ConflictBadge } from "@/components/conflict-badge";
import { FloatingAgendaButton } from "@/components/shared/floating-agenda";
import { type AssignmentMenuItem } from "@/contexts/assignment-context";
import { useProfissional } from "@/contexts/profissional-context";
import { useTheme } from "@/contexts/theme-context";
import { logoutAction } from "@/app/(dashboard)/actions";
import { CSSProperties, ReactNode, useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc/client";
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
  { label: "Drive", path: "/admin/drive", icon: "FolderOpen" },
  { label: "WhatsApp", path: "/admin/whatsapp/chat", icon: "MessageCircle" },
];

// 2. Cadastros - Assistidos, Processos, Casos, Solar, Mapa (azul)
const CADASTROS_NAV: AssignmentMenuItem[] = [
  { label: "Assistidos", path: "/admin/assistidos", icon: "Users", requiredRoles: ["admin", "defensor", "servidor", "estagiario", "triagem"] },
  { label: "Processos", path: "/admin/processos", icon: "Scale" },
  { label: "Casos", path: "/admin/casos", icon: "Briefcase" },
  { label: "Solar", path: "/admin/intimacoes", icon: "Sun" },
  { label: "Mapa", path: "/admin/cadastro/mapa", icon: "Map" },
];

// 3. Documentos - Drive, Distribuição, Ofícios, Modelos, Jurisprudência, Legislação (laranja)
const DOCUMENTOS_NAV: AssignmentMenuItem[] = [
  { label: "Distribuição", path: "/admin/distribuicao", icon: "FolderInput" },
  { label: "Ofícios", path: "/admin/oficios", icon: "Mail" },
  { label: "Modelos", path: "/admin/modelos", icon: "FileText" },
  { label: "Jurisprudência", path: "/admin/jurisprudencia", icon: "Scale" },
  { label: "Legislação", path: "/admin/legislacao", icon: "Scale" },
];

// 4. Cowork - Delegações, Equipe, Mural, Agenda, Pareceres, Coberturas (roxo)
const COWORK_NAV: AssignmentMenuItem[] = [
  { label: "Delegações", path: "/admin/delegacoes", icon: "UserCheck", requiredRoles: ["admin", "defensor", "servidor", "estagiario"] },
  { label: "Equipe", path: "/admin/equipe", icon: "UsersRound", requiredRoles: ["admin", "defensor", "servidor"] },
  // --- divider after index 1 (rendered in CoworkMenu) ---
  { label: "Mural", path: "/admin/mural", icon: "MessageSquare" },
  { label: "Agenda Equipe", path: "/admin/agenda-equipe", icon: "CalendarDays" },
  { label: "Pareceres", path: "/admin/pareceres", icon: "FileCheck", requiredRoles: ["admin", "defensor", "servidor"] },
  { label: "Coberturas", path: "/admin/coberturas", icon: "ArrowLeftRight", requiredRoles: ["admin", "defensor"] },
];

// 5. News - Notícias jurídicas, monitoramento e informação institucional
const NEWS_NAV: AssignmentMenuItem[] = [
  { label: "Diário da Bahia", path: "/admin/noticias-factuais", icon: "Globe" },
  { label: "Notícias Jurídicas", path: "/admin/noticias", icon: "Newspaper" },
  { label: "Radar Criminal", path: "/admin/radar", icon: "Radio" },
  { label: "Institucional", path: "/admin/institucional", icon: "Building2" },
];

// 6. Ferramentas - Lógica, Calculadoras, Inteligência, Investigação (verde)
const TOOLS_NAV: AssignmentMenuItem[] = [
  { label: "Lógica", path: "/admin/logica", icon: "Brain" },
  { label: "Calculadoras", path: "/admin/calculadoras", icon: "Calculator" },
  { label: "Calc. Prazos", path: "/admin/calculadora-prazos", icon: "Clock" },
  { label: "Calc. Exec. Penal", path: "/admin/calculadoras?tipo=ep", icon: "Clock" },
  { label: "Inteligência", path: "/admin/inteligencia", icon: "Sparkles" },
  { label: "Investigação", path: "/admin/diligencias", icon: "FileSearch" },
  { label: "Palácio da Mente", path: "/admin/palacio-mente", icon: "Network" },
  { label: "Simulador 3D", path: "/admin/simulador-3d", icon: "Box" },
];

// 6. Módulos específicos por especialidade

// Tipo para agrupamento por seção/fase
type SidebarSection = {
  title?: string; // undefined = sem header (itens de topo)
  items: AssignmentMenuItem[];
};

// JÚRI — Organizado por fase do trabalho
const JURI_SECTIONS: SidebarSection[] = [
  {
    title: "Gestão",
    items: [
      { label: "Júri", path: "/admin/juri", icon: "Gavel", exactMatch: true },
    ],
  },
  {
    title: "Plenário",
    items: [
      { label: "Plenário Live", path: "/admin/juri/cockpit", icon: "Zap" },
    ],
  },
  {
    title: "Pós-Júri",
    items: [
      { label: "Cosmovisão", path: "/admin/juri/cosmovisao", icon: "PieChart" },
      { label: "Recursos", path: "/admin/juri/recursos", icon: "Scale" },
      { label: "Execução", path: "/admin/juri/execucao", icon: "Timer" },
    ],
  },
];
// Flat array derivado (para detecção de item ativo)
const JURI_MODULES = JURI_SECTIONS.flatMap(s => s.items);

const VVD_MODULES: AssignmentMenuItem[] = [
  { label: "Dashboard VVD", path: "/admin/vvd", icon: "LayoutDashboard" },
  { label: "Monitoramento MPU", path: "/admin/vvd/medidas", icon: "ShieldCheck" },
  { label: "Processos VVD", path: "/admin/vvd/processos", icon: "FileText" },
  { label: "Intimações", path: "/admin/vvd/intimacoes", icon: "Bell" },
  { label: "Partes", path: "/admin/vvd/partes", icon: "Users" },
];

const EP_MODULES: AssignmentMenuItem[] = [
  { label: "Execução Penal", path: "/admin/execucao-penal", icon: "Lock" },
];

// Wrappers de seção para VVD e EP (sem agrupamento por fase)
const VVD_SECTIONS: SidebarSection[] = [{ items: VVD_MODULES }];
const EP_SECTIONS: SidebarSection[] = [{ items: EP_MODULES }];

// Itens do menu "Mais" (utilidades)
const MORE_NAV: AssignmentMenuItem[] = [
  { label: "Integrações", path: "/admin/integracoes", icon: "Zap" },
  { label: "Relatórios", path: "/admin/relatorios", icon: "BarChart3", requiredRoles: ["admin", "defensor"] },
  { label: "Sincronização", path: "/admin/sync", icon: "RefreshCw" },
  { label: "Enrichment", path: "/admin/settings/enrichment", icon: "Brain", requiredRoles: ["admin"] },
  { label: "Observatory", path: "/admin/observatory", icon: "Activity", requiredRoles: ["admin"] },
  { label: "Convites", path: "/admin/defensoria/convites", icon: "UserPlus", requiredRoles: ["admin"] },
  { label: "Configurações", path: "/admin/settings", icon: "Settings", requiredRoles: ["admin", "defensor"] },
];

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Users, Calendar, Bell, FileText, User, MessageCircle,
  Settings, BarChart3, Scale, Gavel, Clock, AlertTriangle, Calculator,
  FolderOpen, Building2, Briefcase, Target, Shield, Lock, RefreshCw,
  Award, TrendingUp, Zap, Brain, Mic, Heart, ClipboardCheck, ClipboardList, Columns3,
  History, PieChart, Handshake, CalendarDays, Sparkles, FileSearch, UserCheck,
  ChevronRight, ListTodo, Network, UsersRound, MoreHorizontal, Box, Puzzle,
  BookUser, Users2, Home, FolderInput, Sun, MessageSquare, FileCheck,
  ArrowLeftRight, Timer, Newspaper, Rss, Radio, Map, Activity, UserPlus
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
    <SidebarProvider defaultOpen={false} style={{ "--sidebar-width": `${currentWidth}px` } as CSSProperties}>
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
            "h-10 w-10 p-0 mx-auto transition-all duration-200 rounded-xl flex items-center justify-center",
            isActive
              ? "bg-emerald-500/15 text-emerald-400"
              : "text-zinc-600 dark:text-zinc-400 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-zinc-900 dark:hover:text-zinc-200"
          )}
        >
          <Link href={item.path} prefetch={true} onClick={onNavigate}>
            <Icon className={cn(
              "h-5 w-5 transition-all duration-200",
              isActive ? "text-emerald-400" : "text-zinc-500 dark:text-zinc-400"
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
          "h-10 transition-all duration-250 ease-in-out rounded-xl group/item relative overflow-hidden",
          isActive
            ? "bg-emerald-500/15 text-emerald-400 font-semibold"
            : "text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:scale-[1.01]"
        )}
      >
        <Link href={item.path} prefetch={true} onClick={onNavigate}>
          <Icon className={cn(
            "h-[18px] w-[18px] mr-2.5 transition-all duration-200 flex-shrink-0",
            isActive ? "text-emerald-500" : "text-zinc-900 dark:text-zinc-400 group-hover/item:text-zinc-950 dark:group-hover/item:text-zinc-200"
          )} strokeWidth={isActive ? 2.5 : 1.8} />
          <span className="text-[13px] font-medium truncate">{item.label}</span>
          {item.isPremium && (
            <Sparkles className="h-3 w-3 text-emerald-400 ml-auto" />
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
    return <div className="my-3 mx-2 h-px bg-black/[0.06] dark:bg-white/[0.06]" />;
  }

  return <div className="my-3 mx-3 h-px bg-black/[0.06] dark:bg-white/[0.06]" />;
}

// ==========================================
// TOOLTIP WRAPPER PARA ÍCONES COLAPSADOS
// ==========================================

function CollapsedTooltip({ label, open: popoverOpen, children }: { label: string; open?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip open={popoverOpen ? false : undefined}>
      <TooltipTrigger asChild>
        <div className="flex items-center justify-center">
          {children}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

// ==========================================
// POPOVER MENU REUTILIZÁVEL - DESIGN PREMIUM
// ==========================================

// Cores temáticas por seção
const SECTION_THEMES = {
  principal: { accent: "emerald", headerColor: "text-emerald-400", iconColor: "text-emerald-400/70", activeBg: "bg-emerald-500/12", activeText: "text-emerald-400", activeBorder: "bg-emerald-400", hoverBg: "hover:bg-white/[0.06]" },
  cadastros: { accent: "blue", headerColor: "text-blue-400", iconColor: "text-blue-400/70", activeBg: "bg-blue-500/12", activeText: "text-blue-400", activeBorder: "bg-blue-400", hoverBg: "hover:bg-white/[0.06]" },
  documentos: { accent: "amber", headerColor: "text-amber-400", iconColor: "text-amber-400/70", activeBg: "bg-amber-500/12", activeText: "text-amber-400", activeBorder: "bg-amber-400", hoverBg: "hover:bg-white/[0.06]" },
  cowork: { accent: "purple", headerColor: "text-purple-400", iconColor: "text-purple-400/70", activeBg: "bg-purple-500/12", activeText: "text-purple-400", activeBorder: "bg-purple-400", hoverBg: "hover:bg-white/[0.06]" },
  news: { accent: "emerald", headerColor: "text-emerald-400", iconColor: "text-emerald-400/70", activeBg: "bg-emerald-500/12", activeText: "text-emerald-400", activeBorder: "bg-emerald-400", hoverBg: "hover:bg-white/[0.06]" },
  ferramentas: { accent: "teal", headerColor: "text-teal-400", iconColor: "text-teal-400/70", activeBg: "bg-teal-500/12", activeText: "text-teal-400", activeBorder: "bg-teal-400", hoverBg: "hover:bg-white/[0.06]" },
  mais: { accent: "zinc", headerColor: "text-zinc-300", iconColor: "text-zinc-400/70", activeBg: "bg-emerald-500/12", activeText: "text-emerald-400", activeBorder: "bg-emerald-400", hoverBg: "hover:bg-white/[0.06]" },
  especialidades: { accent: "emerald", headerColor: "text-emerald-400", iconColor: "text-emerald-400/70", activeBg: "bg-emerald-500/12", activeText: "text-emerald-400", activeBorder: "bg-emerald-400", hoverBg: "hover:bg-white/[0.06]" },
} as const;

type SectionThemeKey = keyof typeof SECTION_THEMES;

function SidebarPopoverMenu({
  items,
  pathname,
  onNavigate,
  userRole,
  label,
  icon: HeaderIcon,
  theme: themeKey = "principal",
  separatorAfter,
  extraHeader,
}: {
  items: AssignmentMenuItem[];
  pathname: string;
  onNavigate: () => void;
  userRole?: UserRole;
  label: string;
  icon: React.ElementType;
  theme?: SectionThemeKey;
  separatorAfter?: number[];
  extraHeader?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const theme = SECTION_THEMES[themeKey];
  const hasActiveItem = items.some(item =>
    item.exactMatch ? pathname === item.path : pathname.startsWith(item.path)
  );

  return (
    <SidebarMenuItem>
      <CollapsedTooltip label={label} open={open}>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              className={cn(
                "h-10 w-10 p-0 mx-auto transition-all duration-200 rounded-xl flex items-center justify-center",
                hasActiveItem
                  ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20"
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200"
              )}
            >
              <HeaderIcon className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="start"
            sideOffset={28}
            className="w-56 p-0 glass-dark shadow-2xl shadow-black/40 border-white/[0.08] rounded-xl overflow-hidden"
          >
            {/* Header com ícone + título */}
            <div className="flex items-center gap-2 px-3 pt-3 pb-2">
              <div className={cn("flex items-center justify-center h-6 w-6 rounded-lg bg-white/[0.06]", theme.iconColor)}>
                <HeaderIcon className="h-3.5 w-3.5" />
              </div>
              <span className={cn("text-[11px] font-semibold uppercase tracking-wider", theme.headerColor)}>
                {label}
              </span>
            </div>

            {extraHeader}

            {/* Separador sutil */}
            <div className="mx-3 h-px bg-white/[0.06] mb-1" />

            {/* Lista de itens */}
            <div className="p-1.5 space-y-0.5">
              {items.map((item, idx) => {
                if (item.requiredRoles && userRole && !item.requiredRoles.includes(userRole)) return null;
                const Icon = iconMap[item.icon] || Briefcase;
                const isActive = item.exactMatch ? pathname === item.path : pathname.startsWith(item.path);
                return (
                  <div key={item.path}>
                    <Link
                      href={item.path}
                      onClick={() => { setOpen(false); onNavigate(); }}
                      className={cn(
                        "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-[13px] transition-all duration-150 relative group/popitem",
                        isActive
                          ? cn(theme.activeBg, theme.activeText, "font-medium")
                          : cn("text-zinc-300 hover:text-white", theme.hoverBg)
                      )}
                    >
                      {/* Barra lateral ativa */}
                      {isActive && (
                        <div className={cn("absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full", theme.activeBorder)} />
                      )}
                      <Icon className={cn(
                        "h-4 w-4 flex-shrink-0 transition-colors duration-150",
                        isActive ? theme.activeText : "text-zinc-400 group-hover/popitem:text-zinc-200"
                      )} />
                      <span className="truncate">{item.label}</span>
                      {/* Badge sutil */}
                      {typeof item.badge === "number" && item.badge > 0 && (
                        <span className={cn(
                          "ml-auto inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-md text-[10px] font-semibold tabular-nums",
                          item.badge > 50
                            ? "bg-white/[0.08] text-zinc-300 ring-1 ring-white/[0.06]"
                            : "bg-white/[0.08] text-zinc-300 ring-1 ring-white/[0.06]"
                        )}>
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </Link>
                    {/* Separador opcional entre grupos */}
                    {separatorAfter?.includes(idx) && (
                      <div className="mx-2.5 my-1.5 h-px bg-white/[0.05]" />
                    )}
                  </div>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </CollapsedTooltip>
    </SidebarMenuItem>
  );
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
      <SidebarPopoverMenu
        items={items}
        pathname={pathname}
        onNavigate={onNavigate}
        userRole={userRole}
        label="Mais"
        icon={MoreHorizontal}
        theme="mais"
      />
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
                ? "bg-black/[0.05] dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-200"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
            )}
          >
            <div className="mr-2.5 transition-all duration-200">
              <MoreHorizontal className={cn(
                "h-[18px] w-[18px] transition-all duration-200",
                hasActiveItem ? "text-emerald-500" : "text-zinc-800 dark:text-zinc-400 group-hover/item:text-zinc-900 dark:group-hover/item:text-zinc-200"
              )} />
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
          className="w-52 p-2 glass-dark shadow-xl shadow-black/30"
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
                    ? "bg-emerald-500/15 text-emerald-400 font-medium"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
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
// ==========================================
// MENU "NEWS" COLAPSÁVEL - NOTÍCIAS + RADAR + INSTITUCIONAL
// ==========================================

function NewsMenu({ items, pathname, onNavigate, userRole, isCollapsed }: {
  items: AssignmentMenuItem[];
  pathname: string;
  onNavigate: () => void;
  userRole?: UserRole;
  isCollapsed: boolean;
}) {
  const [expanded, setExpanded] = useState(true); // inicia expandido — fluxo diário
  const hasActiveItem = items.some(item =>
    item.exactMatch ? pathname === item.path : pathname.startsWith(item.path)
  );

  useEffect(() => {
    if (hasActiveItem && !expanded) setExpanded(true);
  }, [hasActiveItem]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isCollapsed) {
    return (
      <SidebarPopoverMenu
        items={items}
        pathname={pathname}
        onNavigate={onNavigate}
        userRole={userRole}
        label="News"
        icon={Rss}
        theme="news"
      />
    );
  }

  return (
    <div className="space-y-0.5">
      <SidebarMenuItem>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "w-full h-10 transition-all duration-300 rounded-xl flex items-center px-3 group/item",
            hasActiveItem
              ? "bg-emerald-600/15 text-emerald-400"
              : "text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          )}
        >
          <div className="mr-2.5 transition-all duration-200">
            <Rss className={cn(
              "h-[18px] w-[18px] transition-all duration-200",
              hasActiveItem ? "text-emerald-500" : "text-zinc-900 dark:text-zinc-400 group-hover/item:text-zinc-950 dark:group-hover/item:text-zinc-200"
            )} />
          </div>
          <span className="text-[13px] font-medium">News</span>
          {hasActiveItem && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 ml-1.5" />}
          <ChevronDown className={cn(
            "h-4 w-4 ml-auto transition-transform duration-300",
            expanded && "rotate-180"
          )} />
        </button>
      </SidebarMenuItem>

      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        expanded ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="relative pl-4 space-y-0.5">
          <div className="absolute left-[22px] top-1 bottom-1 w-px bg-gradient-to-b from-emerald-500/20 via-black/[0.06] dark:via-white/[0.06] to-transparent" />
          {items.map((item) => {
            if (item.requiredRoles && userRole && !item.requiredRoles.includes(userRole)) return null;
            const Icon = iconMap[item.icon] || Briefcase;
            const isActive = item.exactMatch ? pathname === item.path : pathname.startsWith(item.path);
            return (
              <SidebarMenuItem key={item.path}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={cn(
                    "h-9 transition-all duration-300 rounded-lg group/subitem relative",
                    isActive
                      ? "bg-emerald-500/15 text-emerald-400 font-medium"
                      : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  )}
                >
                  <Link href={item.path} prefetch={true} onClick={onNavigate}>
                    <div className={cn(
                      "absolute left-[-12px] w-2 h-px transition-all duration-200",
                      isActive ? "bg-emerald-500/50" : "bg-black/[0.06] dark:bg-white/[0.06]"
                    )} />
                    <Icon className={cn(
                      "h-3.5 w-3.5 mr-2 transition-all duration-300",
                      isActive ? "text-emerald-400" : "text-zinc-400 dark:text-zinc-500 group-hover/subitem:text-zinc-600 dark:group-hover/subitem:text-zinc-300"
                    )} />
                    <span className="text-[12px] truncate">{item.label}</span>
                    {typeof item.badge === "number" && item.badge > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold bg-amber-500 text-white">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                    {item.path === "/admin/institucional" && (
                      <span className="ml-auto text-[9px] font-semibold text-zinc-400 dark:text-zinc-600 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded-full leading-none">
                        breve
                      </span>
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
      <SidebarPopoverMenu
        items={items}
        pathname={pathname}
        onNavigate={onNavigate}
        userRole={userRole}
        label="Ferramentas"
        icon={Puzzle}
        theme="ferramentas"
      />
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
              : "text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          )}
        >
          <div className={cn(
            "mr-2.5 transition-all duration-200"
          )}>
            <Puzzle className={cn(
              "h-[18px] w-[18px] transition-all duration-200",
              hasActiveItem ? "text-emerald-500" : "text-zinc-900 dark:text-zinc-400 group-hover/item:text-zinc-950 dark:group-hover/item:text-zinc-200"
            )} />
          </div>
          <span className="text-[13px] font-medium">Ferramentas</span>
          {hasActiveItem && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 ml-1.5" />}
          <ChevronDown className={cn(
            "h-4 w-4 ml-auto transition-transform duration-300",
            expanded && "rotate-180"
          )} />
        </button>
      </SidebarMenuItem>

      {/* Sub-itens com animação */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="relative pl-4 space-y-0.5">
          {/* Linha vertical conectora */}
          <div className="absolute left-[22px] top-1 bottom-1 w-px bg-gradient-to-b from-emerald-500/20 via-black/[0.06] dark:via-white/[0.06] to-transparent" />

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
                      : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  )}
                >
                  <Link href={item.path} prefetch={true} onClick={onNavigate}>
                    {/* Indicador de conexão */}
                    <div className={cn(
                      "absolute left-[-12px] w-2 h-px transition-all duration-200",
                      isActive ? "bg-emerald-500/50" : "bg-black/[0.06] dark:bg-white/[0.06]"
                    )} />
                    <Icon className={cn(
                      "h-3.5 w-3.5 mr-2 transition-all duration-300",
                      isActive ? "text-emerald-400" : "text-zinc-400 dark:text-zinc-500 group-hover/subitem:text-zinc-600 dark:group-hover/subitem:text-zinc-300"
                    )} />
                    <span className="text-[12px] truncate">{item.label}</span>
                    {typeof item.badge === "number" && item.badge > 0 && (
                      <span className="ml-auto inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-semibold bg-amber-500 text-white">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
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
      <SidebarPopoverMenu
        items={items}
        pathname={pathname}
        onNavigate={onNavigate}
        userRole={userRole}
        label="Principal"
        icon={Home}
        theme="principal"
      />
    );
  }

  return (
    <div className="space-y-0.5">
      {/* Botão principal - Principal */}
      <SidebarMenuItem>
        <button
          onClick={() => setExpanded(!expanded)}
          className={cn(
            "w-full h-10 transition-all duration-200 rounded-xl flex items-center px-3 group/item",
            hasActiveItem
              ? "bg-emerald-500/10 text-emerald-400"
              : "text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          )}
        >
          <div className={cn(
            "mr-2.5 transition-all duration-200"
          )}>
            <Home className={cn(
              "h-[18px] w-[18px] transition-all duration-200",
              hasActiveItem ? "text-emerald-500" : "text-zinc-900 dark:text-zinc-400 group-hover/item:text-zinc-950 dark:group-hover/item:text-zinc-200"
            )} />
          </div>
          <span className="text-[13px] font-medium">Principal</span>
          {hasActiveItem && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 ml-1.5" />}
          <ChevronDown className={cn(
            "h-4 w-4 ml-auto transition-transform duration-300",
            expanded && "rotate-180"
          )} />
        </button>
      </SidebarMenuItem>

      {/* Sub-itens com animação */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="relative pl-4 space-y-0.5">
          {/* Linha vertical conectora */}
          <div className="absolute left-[22px] top-1 bottom-1 w-px bg-black/[0.06] dark:bg-white/[0.06]" />

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
                    "h-9 transition-all duration-200 rounded-lg group/subitem relative",
                    isActive
                      ? "bg-emerald-500/15 text-emerald-400 font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  )}
                >
                  <Link href={item.path} prefetch={true} onClick={onNavigate}>
                    {/* Indicador de conexão */}
                    <div className={cn(
                      "absolute left-[-12px] w-2 h-px transition-all duration-200",
                      isActive ? "bg-emerald-500/50" : "bg-black/[0.06] dark:bg-white/[0.06]"
                    )} />
                    <Icon className={cn(
                      "h-3.5 w-3.5 mr-2 transition-all duration-200",
                      isActive ? "text-emerald-400" : "text-zinc-500 dark:text-zinc-400 group-hover/subitem:text-zinc-700 dark:group-hover/subitem:text-zinc-300"
                    )} />
                    <span className="text-[12px] truncate">{item.label}</span>
                    {typeof item.badge === "number" && item.badge > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-green-500 px-1 text-[10px] font-bold text-white">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
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
      <SidebarPopoverMenu
        items={items}
        pathname={pathname}
        onNavigate={onNavigate}
        userRole={userRole}
        label="Cadastros"
        icon={BookUser}
        theme="cadastros"
      />
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
              ? "bg-emerald-600/15 text-emerald-400"
              : "text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          )}
        >
          <div className={cn(
            "mr-2.5 transition-all duration-200"
          )}>
            <BookUser className={cn(
              "h-[18px] w-[18px] transition-all duration-200",
              hasActiveItem ? "text-emerald-500" : "text-zinc-900 dark:text-zinc-400 group-hover/item:text-zinc-950 dark:group-hover/item:text-zinc-200"
            )} />
          </div>
          <span className="text-[13px] font-medium">Cadastros</span>
          {hasActiveItem && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 ml-1.5" />}
          <ChevronDown className={cn(
            "h-4 w-4 ml-auto transition-transform duration-300",
            expanded && "rotate-180"
          )} />
        </button>
      </SidebarMenuItem>

      {/* Sub-itens com animação */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="relative pl-4 space-y-0.5">
          {/* Linha vertical conectora */}
          <div className="absolute left-[22px] top-1 bottom-1 w-px bg-gradient-to-b from-emerald-500/20 via-black/[0.06] dark:via-white/[0.06] to-transparent" />

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
                      : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  )}
                >
                  <Link href={item.path} prefetch={true} onClick={onNavigate}>
                    {/* Indicador de conexão */}
                    <div className={cn(
                      "absolute left-[-12px] w-2 h-px transition-all duration-200",
                      isActive ? "bg-emerald-500/50" : "bg-black/[0.06] dark:bg-white/[0.06]"
                    )} />
                    <Icon className={cn(
                      "h-3.5 w-3.5 mr-2 transition-all duration-300",
                      isActive ? "text-emerald-400" : "text-zinc-400 dark:text-zinc-500 group-hover/subitem:text-zinc-600 dark:group-hover/subitem:text-zinc-300"
                    )} />
                    <span className="text-[12px] truncate">{item.label}</span>
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
      <SidebarPopoverMenu
        items={items}
        pathname={pathname}
        onNavigate={onNavigate}
        userRole={userRole}
        label="Documentos"
        icon={FileText}
        theme="documentos"
      />
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
              ? "bg-emerald-600/15 text-emerald-400"
              : "text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          )}
        >
          <div className={cn(
            "mr-2.5 transition-all duration-200"
          )}>
            <FolderOpen className={cn(
              "h-[18px] w-[18px] transition-all duration-200",
              hasActiveItem ? "text-emerald-500" : "text-zinc-900 dark:text-zinc-400 group-hover/item:text-zinc-950 dark:group-hover/item:text-zinc-200"
            )} />
          </div>
          <span className="text-[13px] font-medium">Documentos</span>
          {hasActiveItem && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 ml-1.5" />}
          <ChevronDown className={cn(
            "h-4 w-4 ml-auto transition-transform duration-300",
            expanded && "rotate-180"
          )} />
        </button>
      </SidebarMenuItem>

      {/* Sub-itens com animação */}
      <div className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        expanded ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="relative pl-4 space-y-0.5">
          {/* Linha vertical conectora */}
          <div className="absolute left-[22px] top-1 bottom-1 w-px bg-gradient-to-b from-emerald-500/20 via-black/[0.06] dark:via-white/[0.06] to-transparent" />

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
                      : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                  )}
                >
                  <Link href={item.path} prefetch={true} onClick={onNavigate}>
                    {/* Indicador de conexão */}
                    <div className={cn(
                      "absolute left-[-12px] w-2 h-px transition-all duration-200",
                      isActive ? "bg-emerald-500/50" : "bg-black/[0.06] dark:bg-white/[0.06]"
                    )} />
                    <Icon className={cn(
                      "h-3.5 w-3.5 mr-2 transition-all duration-300",
                      isActive ? "text-emerald-400" : "text-zinc-400 dark:text-zinc-500 group-hover/subitem:text-zinc-600 dark:group-hover/subitem:text-zinc-300"
                    )} />
                    <span className="text-[12px] truncate">{item.label}</span>
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
      <SidebarPopoverMenu
        items={items}
        pathname={pathname}
        onNavigate={onNavigate}
        userRole={userRole}
        label="Cowork"
        icon={UsersRound}
        theme="cowork"
        separatorAfter={[1]}
      />
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
              ? "bg-emerald-600/15 text-emerald-400"
              : "text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          )}
        >
          <div className={cn(
            "mr-2.5 transition-all duration-200"
          )}>
            <Users2 className={cn(
              "h-[18px] w-[18px] transition-all duration-200",
              hasActiveItem ? "text-emerald-500" : "text-zinc-900 dark:text-zinc-400 group-hover/item:text-zinc-950 dark:group-hover/item:text-zinc-200"
            )} />
          </div>
          <span className="text-[13px] font-medium">Cowork</span>
          {hasActiveItem && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 ml-1.5" />}
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
          {/* Linha vertical conectora */}
          <div className="absolute left-[22px] top-1 bottom-1 w-px bg-gradient-to-b from-emerald-500/20 via-black/[0.06] dark:via-white/[0.06] to-transparent" />

          {items.map((item, idx) => {
            if (item.requiredRoles && userRole && !item.requiredRoles.includes(userRole)) {
              return null;
            }
            const Icon = iconMap[item.icon] || Briefcase;
            const isActive = pathname.startsWith(item.path);
            return (
              <div key={item.path}>
                {idx === 2 && (
                  <div className="my-1.5 ml-2 mr-1 h-px bg-gradient-to-r from-zinc-700/40 to-transparent" />
                )}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    className={cn(
                      "h-9 transition-all duration-300 rounded-lg group/subitem relative",
                      isActive
                        ? "bg-emerald-500/15 text-emerald-400 font-medium"
                        : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    )}
                  >
                    <Link href={item.path} prefetch={true} onClick={onNavigate}>
                      {/* Indicador de conexão */}
                      <div className={cn(
                        "absolute left-[-12px] w-2 h-px transition-all duration-200",
                        isActive ? "bg-emerald-500/50" : "bg-black/[0.06] dark:bg-white/[0.06]"
                      )} />
                      <Icon className={cn(
                        "h-3.5 w-3.5 mr-2 transition-all duration-300",
                        isActive ? "text-emerald-400" : "text-zinc-400 dark:text-zinc-500 group-hover/subitem:text-zinc-600 dark:group-hover/subitem:text-zinc-300"
                      )} />
                      <span className="text-[12px] truncate">{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </div>
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

function EspecialidadesMenu({ pathname, onNavigate, userRole, isCollapsed, availableEspecialidades }: {
  pathname: string;
  onNavigate: () => void;
  userRole?: UserRole;
  isCollapsed: boolean;
  availableEspecialidades?: string[];
}) {
  // Filter tabs based on available areas
  const visibleTabs = useMemo(() => {
    const allTabs: { id: Especialidade; label: string; icon: typeof Gavel; colors: typeof ESPECIALIDADE_COLORS.JURI }[] = [
      { id: "JURI", label: "Júri", icon: Gavel, colors: ESPECIALIDADE_COLORS.JURI },
      { id: "VVD", label: "VVD", icon: Shield, colors: ESPECIALIDADE_COLORS.VVD },
      { id: "EP", label: "EP", icon: Lock, colors: ESPECIALIDADE_COLORS.EP },
    ];
    if (!availableEspecialidades || availableEspecialidades.length === 0) return allTabs;
    return allTabs.filter(t => availableEspecialidades.includes(t.id));
  }, [availableEspecialidades]);

  const [expanded, setExpanded] = useState(false);
  const defaultEsp = visibleTabs.length > 0 ? visibleTabs[0].id : "JURI";
  const [especialidade, setEspecialidade] = useState<Especialidade>(defaultEsp);

  // Determinar seções baseado na especialidade selecionada
  const sections = especialidade === "JURI" ? JURI_SECTIONS
    : especialidade === "VVD" ? VVD_SECTIONS
    : EP_SECTIONS;

  const hasActiveItem = [...JURI_MODULES, ...VVD_MODULES, ...EP_MODULES].some(
    item => item.exactMatch ? pathname === item.path : pathname.startsWith(item.path)
  );

  // Auto-expandir se um item está ativo
  useEffect(() => {
    if (hasActiveItem && !expanded) {
      setExpanded(true);
    }
    // Detectar especialidade ativa baseado no path (only if that tab is visible)
    const visibleIds = visibleTabs.map(t => t.id);
    if (pathname.includes('/juri') && visibleIds.includes("JURI")) {
      setEspecialidade("JURI");
    } else if (pathname.includes('/vvd') && visibleIds.includes("VVD")) {
      setEspecialidade("VVD");
    } else if (pathname.includes('/execucao-penal') && visibleIds.includes("EP")) {
      setEspecialidade("EP");
    }
  }, [hasActiveItem, pathname, visibleTabs]);

  if (isCollapsed) {
    const flatItems = sections.flatMap(s => s.items);
    const especialidadeSelector = (
      <div className="flex items-center gap-1 px-3 pb-2">
        {visibleTabs.map((esp) => {
          const isSelected = especialidade === esp.id;
          return (
            <button
              key={esp.id}
              onClick={() => setEspecialidade(esp.id)}
              className={cn(
                "py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer",
                isSelected
                  ? `${esp.colors.bg} ${esp.colors.text} ring-1 ${esp.colors.ring} px-3`
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] px-2"
              )}
            >
              <esp.icon className={cn("h-3.5 w-3.5", isSelected && esp.colors.text)} />
              {isSelected && <span>{esp.label}</span>}
            </button>
          );
        })}
      </div>
    );

    return (
      <SidebarPopoverMenu
        items={flatItems}
        pathname={pathname}
        onNavigate={onNavigate}
        userRole={userRole}
        label="Especialidades"
        icon={Target}
        theme="especialidades"
        extraHeader={especialidadeSelector}
      />
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
              ? "bg-emerald-600/15 text-emerald-400"
              : "text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          )}
        >
          <div className={cn(
            "mr-2.5 transition-all duration-200"
          )}>
            <Target className={cn(
              "h-[18px] w-[18px] transition-all duration-200",
              hasActiveItem ? "text-emerald-500" : "text-zinc-900 dark:text-zinc-400 group-hover/item:text-zinc-950 dark:group-hover/item:text-zinc-200"
            )} />
          </div>
          <span className="text-xs font-medium">Especialidades</span>
          {hasActiveItem && (
            <span className={cn(
              "h-1.5 w-1.5 rounded-full shrink-0 ml-1.5 shadow-[0_0_4px]",
              especialidade === "JURI" ? "bg-emerald-400 shadow-emerald-400/50"
                : especialidade === "VVD" ? "bg-yellow-400 shadow-yellow-400/50"
                : "bg-blue-400 shadow-blue-400/50"
            )} />
          )}
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
            "absolute left-[22px] top-1 bottom-1 w-px bg-gradient-to-b via-zinc-300 dark:via-zinc-800 to-transparent",
            ESPECIALIDADE_COLORS[especialidade].line
          )} />

          {/* Seletor de especialidade — ícones compactos, label só no selecionado */}
          <div className="flex items-center gap-1 py-1.5 pr-2">
            {visibleTabs.map((esp) => {
              const isSelected = especialidade === esp.id;
              return (
                <button
                  key={esp.id}
                  onClick={() => setEspecialidade(esp.id)}
                  className={cn(
                    "py-1.5 rounded-lg text-[10px] font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer",
                    isSelected
                      ? `${esp.colors.bg} ${esp.colors.text} ring-1 ${esp.colors.ring} px-3`
                      : "text-zinc-500 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] px-2"
                  )}
                >
                  <esp.icon className={cn("h-3.5 w-3.5", isSelected && esp.colors.text)} />
                  {isSelected && <span>{esp.label}</span>}
                </button>
              );
            })}
          </div>

          {sections.map((section, sIdx) => (
            <div key={section.title || `section-${sIdx}`}>
              {section.title && (
                <div className="flex items-center gap-2 pr-2 pt-2.5 pb-0.5">
                  <div className="h-px flex-1 bg-zinc-200/60 dark:bg-zinc-700/30" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 select-none whitespace-nowrap">
                    {section.title}
                  </span>
                  <div className="h-px flex-1 bg-zinc-200/60 dark:bg-zinc-700/30" />
                </div>
              )}
              {section.items.map((item) => {
                if (item.requiredRoles && userRole && !item.requiredRoles.includes(userRole)) {
                  return null;
                }
                const Icon = iconMap[item.icon] || Briefcase;
                const isActive = item.exactMatch ? pathname === item.path : pathname.startsWith(item.path);
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
                          : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
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
                            : "bg-black/[0.06] dark:bg-white/[0.06]"
                        )} />
                        <Icon className={cn(
                          "h-3.5 w-3.5 mr-2 transition-all duration-300",
                          isActive ? activeColor.text : "text-zinc-400 dark:text-zinc-500 group-hover/subitem:text-zinc-600 dark:group-hover/subitem:text-zinc-300"
                        )} />
                        <span className="text-xs truncate">{item.label}</span>
                        {isActive && (
                          <div className={cn(
                            "absolute right-0.5 top-1/2 -translate-y-1/2 w-[3px] h-3.5 rounded-full transition-all duration-300",
                            especialidade === "JURI" ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.4)]"
                              : especialidade === "VVD" ? "bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.4)]"
                              : "bg-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.4)]"
                          )} />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </div>
          ))}
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
  const { state, open, setOpen, openMobile, setOpenMobile } = useSidebar();
  const { theme } = useTheme();
  const { user: sessionUser, hasArea } = usePermissions();
  const { profissionalLogado } = useProfissional();

  // Granular area-based visibility
  const canSeeJuri = hasArea("JURI");
  const canSeeEP = hasArea("EXECUCAO_PENAL");
  const canSeeVVD = hasArea("VIOLENCIA_DOMESTICA");
  const canSeeCriminal = hasArea("CRIMINAL");
  const canSeeInfancia = hasArea("INFANCIA_JUVENTUDE");
  const canSeeSpecializedModules = canSeeJuri || canSeeEP || canSeeVVD;

  // Build list of available especialidades for the menu
  const availableEspecialidades = useMemo(() => {
    const list: string[] = [];
    if (canSeeJuri) list.push("JURI");
    if (canSeeVVD) list.push("VVD");
    if (canSeeEP) list.push("EP");
    return list;
  }, [canSeeJuri, canSeeVVD, canSeeEP]);
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  const [prevWasDrive, setPrevWasDrive] = useState(false);

  const userRole = sessionUser?.role as UserRole | undefined;
  const isCollapsed = isMobile ? false : state === "collapsed";
  const isDrivePage = pathname.startsWith("/admin/drive");

  // Comarca features — condiciona itens de menu por comarca
  // Default true enquanto carrega para evitar flash (items desaparecem e reaparecem)
  const { data: minhaComarca, isLoading: comarcaLoading } = trpc.comarcas.getMinhaComarca.useQuery();
  const features = comarcaLoading ? { drive: true, whatsapp: true, enrichment: true, calendar_sync: true }
    : minhaComarca?.features ?? { drive: false, whatsapp: false, enrichment: false, calendar_sync: false };

  // WhatsApp unread badge
  const { data: whatsappConfigs } = trpc.whatsappChat.listConfigs.useQuery();
  const primaryConfigId = whatsappConfigs?.[0]?.id;
  const { data: whatsappStats } = trpc.whatsappChat.getStats.useQuery(
    { configId: primaryConfigId! },
    { enabled: !!primaryConfigId, refetchInterval: 30000 }
  );

  const mainNavWithBadge = useMemo(() => {
    return MAIN_NAV
      .filter(item => {
        if (item.path === "/admin/drive") return features.drive;
        if (item.path === "/admin/whatsapp/chat") return features.whatsapp;
        return true;
      })
      .map(item => {
        if (item.label === "WhatsApp" && whatsappStats?.unreadMessages) {
          return { ...item, badge: whatsappStats.unreadMessages };
        }
        return item;
      });
  }, [whatsappStats?.unreadMessages, features.drive, features.whatsapp]);

  // Radar Criminal pending matches badge
  const { data: radarPendentesData } = trpc.radar.matchesPendentesCount.useQuery(undefined, {
    refetchInterval: 60_000,
  });
  const matchesPendentes = radarPendentesData?.count ?? 0;

  // Criminal area check: user has any criminal-related area
  const canSeeCriminalTools = canSeeJuri || canSeeCriminal || canSeeVVD;

  const newsNavWithBadge = useMemo(() => {
    return NEWS_NAV
      .filter(item => {
        if (item.label === "Radar Criminal") return canSeeCriminalTools;
        return true;
      })
      .map(item => {
        if (item.label === "Radar Criminal" && matchesPendentes > 0) {
          return { ...item, badge: matchesPendentes };
        }
        return item;
      });
  }, [matchesPendentes, canSeeCriminalTools]);

  const toolsNavWithBadge = useMemo(() => {
    const criminalOnlyTools = ["Palácio da Mente", "Simulador 3D", "Investigação"];
    return TOOLS_NAV.filter(item => {
      if (criminalOnlyTools.includes(item.label)) return canSeeCriminalTools;
      return true;
    });
  }, [canSeeCriminalTools]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-collapse sidebar on Drive page (more room for Drive panel + content)
  useEffect(() => {
    if (isMobile) return;
    if (isDrivePage && open) {
      setPrevWasDrive(true);
      setOpen(false);
    } else if (!isDrivePage && prevWasDrive && !open) {
      setPrevWasDrive(false);
      setOpen(true);
    }
  }, [isDrivePage, isMobile]); // eslint-disable-line react-hooks/exhaustive-deps

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
        variant="floating"
        className={cn(
          "glass-sidebar",
          "md:z-40",
          "transition-all duration-300 ease-out",
          theme === "medium" && "dark"
        )}
      >
        {/* Header */}
        <SidebarHeader className="h-[60px] border-b border-black/[0.06] dark:border-white/[0.04] flex items-center justify-center px-3">
          <SidebarLogo collapsed={isCollapsed} />
        </SidebarHeader>

        {/* Content com Scroll Suave */}
        <SidebarContent className="px-0 py-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {/* Painel de Contexto - Seletor de Defensor */}
          <ContextControl collapsed={isCollapsed} />

          <div className="px-3 pb-5">
            {/* 1. Principal (Dashboard, Demandas, Agenda) - Colapsável com ícone Home */}
            <SidebarMenu className="space-y-0.5">
              <PrincipalMenu
                items={mainNavWithBadge}
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

            {/* 5. News - Notícias, Radar, Institucional */}
            <NavDivider collapsed={isCollapsed} />
            <SidebarMenu className="space-y-0.5">
              <NewsMenu
                items={newsNavWithBadge}
                pathname={pathname}
                onNavigate={handleNavigate}
                userRole={userRole}
                isCollapsed={isCollapsed}
              />
            </SidebarMenu>

            {/* 6. Ferramentas - Verde */}
            <NavDivider collapsed={isCollapsed} />
            <SidebarMenu className="space-y-0.5">
              <ToolsMenu
                items={toolsNavWithBadge}
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
                    availableEspecialidades={availableEspecialidades}
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

        {/* Footer Premium Glass */}
        <SidebarFooter className="border-t border-black/[0.06] dark:border-white/[0.06] p-0">
          {/* Status Bar */}
          <StatusBar collapsed={isCollapsed} />

          {/* Card do usuário */}
          <div className="p-3">
            <div className={cn(
              "flex items-center gap-3 p-2.5 rounded-2xl transition-all duration-200 group/user",
              "bg-white/40 dark:bg-white/[0.04]",
              "hover:bg-white/70 dark:hover:bg-white/[0.08]",
              "border border-black/[0.06] dark:border-white/[0.06]",
              "hover:border-emerald-200/30 dark:hover:border-emerald-500/10",
              "hover:shadow-sm hover:shadow-emerald-500/5"
            )}>
              <Avatar className={cn(
                "h-10 w-10 transition-all duration-200",
                "ring-2 ring-black/[0.08] dark:ring-white/[0.1] ring-offset-2 ring-offset-transparent",
                "group-hover/user:ring-emerald-500/30 group-hover/user:scale-105"
              )}>
                <AvatarFallback className="bg-gradient-to-br from-zinc-600 via-zinc-700 to-zinc-800 text-white font-bold text-sm shadow-inner">
                  {userName.replace(/^(Dr\.|Dra\.|Dr |Dra )/i, '').trim().charAt(0).toUpperCase() || userName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 truncate tracking-tight">
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
      <SidebarInset className={cn("flex flex-col min-h-screen", theme === "dark" ? "bg-zinc-950" : theme === "medium" ? "bg-zinc-50" : "bg-white")}>
        {/* Header - Light clean com accent emerald */}
        <header className={cn(
          "relative overflow-hidden",
          "flex h-14 shrink-0 items-center",
          "sticky top-0 z-30",
          "bg-white/75 dark:bg-zinc-900/80",
          "backdrop-blur-xl",
          "border-b border-zinc-200/70 dark:border-zinc-800"
        )}>
          {/* Accent emerald no topo */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-emerald-500" />

          {/* Conteúdo - Esquerda: Toggle + Breadcrumbs */}
          <div className="flex items-center gap-3 px-3 flex-1 min-w-0">
            <SidebarTrigger className="h-7 w-7 rounded-md text-zinc-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all duration-200 shrink-0" />

            {/* Separador */}
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-700 shrink-0" />

            {/* Breadcrumbs navegáveis */}
            <Breadcrumbs />

            {/* Slot para conteúdo injetado por páginas (ex: filtros G/R/J da Agenda) */}
            <div id="header-slot" className="flex items-center" />
          </div>

          {/* Conteúdo - Direita: Indicador + Data + Controles */}
          <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3">
            {/* Indicador ativo */}
            <div className="hidden md:flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
              <span className="text-[10px] text-zinc-500 dark:text-zinc-500 font-medium">Online</span>
            </div>

            {/* Separador */}
            <div className="hidden md:block h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

            {/* Data */}
            <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="capitalize">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'short' })}</span>
            </div>

            {/* Separador */}
            <div className="hidden lg:block h-4 w-px bg-zinc-200 dark:bg-zinc-700" />

            {/* Badge de conflitos de sync */}
            <ConflictBadge />

            {/* Controles */}
            <div className="flex items-center gap-1">
              <CommandPalette />
              <ThemeToggle />
              <NotificationsPopover />
              <button
                onClick={() => chatPanelActions.toggle()}
                title="Assistente OMBUDS"
                className="inline-flex items-center justify-center h-9 w-9 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Main */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-16 md:pb-0">
          {children}
        </main>

        {/* Mobile bottom navigation */}
        <MobileBottomNav />

        {/* Floating agenda quick-access button */}
        <FloatingAgendaButton />
      </SidebarInset>

      {/* Notificação real-time de gravações Plaud pendentes */}
      <PlaudArrivalToast />
      {/* Toast de novos matches do Radar Criminal */}
      <RadarMatchesToast />
      {/* Alertas proativos de prazos se aproximando */}
      <PrazoAlertToast />
      {/* Background offline sync (IndexedDB hydration + incremental) */}
      <OfflineSyncProvider />
      {/* Chat lateral panel — Skills Engine */}
      <ChatPanel />
    </>
  );
}
