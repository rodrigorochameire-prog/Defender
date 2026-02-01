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
  FileSearch, UserCheck, ChevronRight, Menu, X, ListTodo
} from "lucide-react";
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
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationsPopover } from "@/components/notifications-popover";
import { AssignmentSwitcher } from "@/components/layout/assignment-switcher";
import { ContextControl } from "@/components/layout/context-control";
import { CommandPalette } from "@/components/shared/command-palette";
import { EntitySheetProvider } from "@/contexts/entity-sheet-context";
import { SidebarLogo } from "@/components/shared/logo";
import { 
  useAssignment, CONTEXT_MENU_ITEMS, UTILITIES_MENU,
  type MenuSection, type AssignmentMenuItem,
} from "@/contexts/assignment-context";
import { logoutAction } from "@/app/(dashboard)/actions";
import { CSSProperties, ReactNode, useEffect, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminSidebarProps {
  children: ReactNode;
  userName: string;
  userEmail?: string;
}

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Users, Calendar, Bell, FileText, User, MessageCircle,
  Settings, BarChart3, Scale, Gavel, Clock, AlertTriangle, Calculator,
  FolderOpen, Building2, Briefcase, Target, Shield, Lock, RefreshCw,
  Award, TrendingUp, Zap, Brain, Mic, Heart, ClipboardCheck, Columns3,
  History, PieChart, Handshake, CalendarDays, Sparkles, FileSearch, UserCheck,
  ChevronRight, ListTodo
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

function MenuItem({ item, isActive, isCollapsed, onNavigate }: {
  item: AssignmentMenuItem;
  isActive: boolean;
  isCollapsed: boolean;
  onNavigate: () => void;
}) {
  const Icon = iconMap[item.icon] || Briefcase;
  
  // Design diferente para sidebar retraída vs expandida - TEMA ESCURO
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
              ? "bg-gradient-to-br from-white to-zinc-200 text-zinc-900 shadow-lg shadow-white/20" 
              : "text-zinc-500 hover:bg-zinc-700/50 hover:text-zinc-300"
          )}
        >
          <Link href={item.path} prefetch={true} onClick={onNavigate}>
            <Icon className={cn(
              "h-5 w-5 transition-all duration-300", 
              isActive ? "text-zinc-900" : "text-zinc-500"
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
          "h-11 transition-all duration-300 rounded-xl group/item relative overflow-hidden",
          isActive 
            ? "bg-gradient-to-r from-white via-zinc-100 to-zinc-200 text-zinc-900 shadow-lg shadow-white/20 font-semibold" 
            : "text-zinc-400 hover:text-white hover:bg-zinc-700/50"
        )}
      >
        <Link href={item.path} prefetch={true} onClick={onNavigate}>
          <div className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center mr-1 transition-all duration-300",
            isActive 
              ? "bg-zinc-900/10" 
              : "bg-zinc-700/50 group-hover/item:bg-zinc-600/50"
          )}>
            <Icon className={cn(
              "h-4 w-4 transition-all duration-300 flex-shrink-0", 
              isActive ? "text-zinc-900" : "text-zinc-500 group-hover/item:text-zinc-300"
            )} strokeWidth={isActive ? 2.5 : 2} />
          </div>
          <span className="text-[13px] font-medium truncate">{item.label}</span>
          {item.isPremium && (
            <Sparkles className="h-3 w-3 text-amber-400 ml-auto" />
          )}
          {isActive && !item.isPremium && (
            <div className="absolute right-3 w-2 h-2 rounded-full bg-zinc-900/50 shadow-sm" />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function MenuSectionComponent({ section, pathname, isCollapsed, onNavigate }: {
  section: MenuSection;
  pathname: string;
  isCollapsed: boolean;
  onNavigate: () => void;
}) {
  const [isOpen, setIsOpen] = useState(section.defaultOpen !== false);

  const hasActiveItem = section.items.some(
    (item) => pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path))
  );

  useEffect(() => {
    if (hasActiveItem && !isOpen) {
      setIsOpen(true);
    }
  }, [hasActiveItem, isOpen]);

  if (section.collapsible && !isCollapsed) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mb-1">
        <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 group">
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
            {section.title}
          </span>
          <ChevronDown className={cn(
            "h-3.5 w-3.5 transition-all duration-300 text-zinc-400 dark:text-zinc-600 group-hover:text-zinc-600 dark:group-hover:text-zinc-400", 
            isOpen && "rotate-180"
          )} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0.5 mt-1">
          {section.items.map((item) => {
            const isActive = pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path));
            return <MenuItem key={item.path} item={item} isActive={isActive} isCollapsed={isCollapsed} onNavigate={onNavigate} />;
          })}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div className="mb-1">
      {!isCollapsed && (
        <div className="px-3 py-2">
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-500 uppercase tracking-wider">
            {section.title}
          </span>
        </div>
      )}
      <div className="space-y-0.5">
        {section.items.map((item) => {
          const isActive = pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path));
          return <MenuItem key={item.path} item={item} isActive={isActive} isCollapsed={isCollapsed} onNavigate={onNavigate} />;
        })}
      </div>
    </div>
  );
}

function AdminSidebarContent({ children, setSidebarWidth, userName, userEmail }: {
  children: ReactNode;
  setSidebarWidth: (width: number) => void;
  userName: string;
  userEmail?: string;
}) {
  const pathname = usePathname();
  const { state, openMobile, setOpenMobile } = useSidebar();
  const { config, modules, isLoading } = useAssignment();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);
  
  // No mobile, a sidebar sempre mostra expandida quando aberta
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
          {/* Painel de Contexto - Acima de Tudo */}
          <ContextControl collapsed={isCollapsed} />
          
          <div className="px-3 pb-5 space-y-6">
            {/* Navegação Principal */}
          <div>
            <SidebarMenu className="space-y-1">
              {!isCollapsed && (
                <div className="px-1 pb-2 flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-zinc-800 flex items-center justify-center">
                    <LayoutDashboard className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Navegação
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-zinc-700/80 to-transparent" />
                </div>
              )}
              {CONTEXT_MENU_ITEMS.map((item) => (
                <MenuItem 
                  key={item.path} 
                  item={item} 
                  isActive={pathname === item.path} 
                  isCollapsed={isCollapsed} 
                  onNavigate={handleNavigate} 
                />
              ))}
            </SidebarMenu>
          </div>

          {/* Módulos Específicos */}
          {mounted && !isLoading && modules.length > 0 && (
            <div>
              <SidebarMenu className="space-y-1">
                {!isCollapsed && (
                  <div className="px-1 pb-2 flex items-center gap-2">
                    <div 
                      className="h-6 w-6 rounded-lg flex items-center justify-center bg-zinc-700/50"
                    >
                      <Target className="w-3.5 h-3.5 text-zinc-400" />
                    </div>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                      {config.shortName}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-zinc-700/80 to-transparent" />
                  </div>
                )}
                {modules.map((section: MenuSection) => (
                  <MenuSectionComponent 
                    key={section.id} 
                    section={section} 
                    pathname={pathname} 
                    isCollapsed={isCollapsed} 
                    onNavigate={handleNavigate} 
                  />
                ))}
              </SidebarMenu>
            </div>
          )}

          {/* Utilidades */}
          <div>
            <SidebarMenu className="space-y-1">
              {!isCollapsed && (
                <div className="px-1 pb-2 flex items-center gap-2">
                  <div className="h-6 w-6 rounded-lg bg-zinc-700/50 flex items-center justify-center">
                    <Settings className="w-3.5 h-3.5 text-zinc-400" />
                  </div>
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                    Utilidades
                  </span>
                  <div className="flex-1 h-px bg-gradient-to-r from-zinc-700/80 to-transparent" />
                </div>
              )}
              {UTILITIES_MENU.map((section) => (
                <MenuSectionComponent 
                  key={section.id} 
                  section={section} 
                  pathname={pathname} 
                  isCollapsed={isCollapsed} 
                  onNavigate={handleNavigate} 
                />
              ))}
            </SidebarMenu>
          </div>
          </div>
        </SidebarContent>

        {/* Footer Premium Escuro */}
        <SidebarFooter className={cn(
          "border-t border-zinc-700/30 p-3",
          "bg-gradient-to-t from-[#1a1a1e] via-[#1f1f23] to-transparent"
        )}>
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
        </SidebarFooter>
      </Sidebar>

      {/* Main Content */}
      <SidebarInset className="flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
        {/* Header - Premium unificado com título dinâmico */}
        <header className={cn(
          "relative overflow-hidden",
          "flex h-14 shrink-0 items-center",
          "sticky top-0 z-30"
        )}>
          {/* Fundo base */}
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-900/95 via-zinc-800/80 to-zinc-900/95 backdrop-blur-xl" />
          
          {/* Linha de brilho superior - toque emerald sutil */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
          
          {/* Borda inferior elegante */}
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-zinc-800 via-zinc-600/40 to-zinc-800" />
          
          {/* Conteúdo - Esquerda: Toggle + Título */}
          <div className="relative flex items-center gap-3 px-3 flex-1">
            <SidebarTrigger className="h-7 w-7 rounded-md text-zinc-500 hover:text-emerald-400 hover:bg-zinc-700/50 transition-all duration-300" />
            
            {/* Separador */}
            <div className="h-4 w-px bg-zinc-700/50" />
            
            {/* Título dinâmico baseado na rota */}
            <span className="text-sm font-semibold text-zinc-100">
              {pathname === "/admin" || pathname === "/admin/dashboard" ? "Dashboard" : 
               pathname.startsWith("/admin/demandas") ? "Demandas" :
               pathname.startsWith("/admin/assistidos") ? "Assistidos" :
               pathname.startsWith("/admin/juri") ? "Júri" :
               pathname.startsWith("/admin/casos") ? "Casos" :
               pathname.startsWith("/admin/agenda") ? "Agenda" :
               "Ombuds"}
            </span>
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
