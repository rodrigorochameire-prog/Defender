"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
// Clerk removido - usando autenticação customizada
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Calendar, Bell, FileText, LogOut, PanelLeft, User,
  Settings, BarChart3, Scale, Gavel, Clock, AlertTriangle, Calculator,
  FolderOpen, Building2, Briefcase, Target, Shield, Lock, RefreshCw,
  Award, TrendingUp, ChevronDown, Zap, Brain, Mic, Heart, ClipboardCheck,
  Columns3, History, PieChart, Handshake, CalendarDays, Sparkles, MessageCircle,
  FileSearch, UserCheck, ChevronRight
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu,
  SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarInset,
  SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ThemeToggle } from "@/components/theme-toggle";
import { FontSizeToggle } from "@/components/font-size-toggle";
import { NotificationsPopover } from "@/components/notifications-popover";
import { AssignmentSwitcher } from "@/components/layout/assignment-switcher";
import { CommandPalette } from "@/components/shared/command-palette";
import { EntitySheetProvider } from "@/contexts/entity-sheet-context";
import { SidebarLogo } from "@/components/shared/logo";
import { 
  useAssignment, CONTEXT_MENU_ITEMS, UTILITIES_MENU,
  type MenuSection, type AssignmentMenuItem,
} from "@/contexts/assignment-context";
import { logoutAction } from "@/app/(dashboard)/actions";
import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminSidebarProps {
  children: ReactNode;
  userName: string;
  userEmail?: string;
}

// Logo removida - agora usando componente SidebarLogo importado

// --- CONFIGURAÇÃO ---
const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, Users, Calendar, Bell, FileText, User, MessageCircle,
  Settings, BarChart3, Scale, Gavel, Clock, AlertTriangle, Calculator,
  FolderOpen, Building2, Briefcase, Target, Shield, Lock, RefreshCw,
  Award, TrendingUp, Zap, Brain, Mic, Heart, ClipboardCheck, Columns3,
  History, PieChart, Handshake, CalendarDays, Sparkles, FileSearch, UserCheck,
  ChevronRight
};

const SIDEBAR_WIDTH_KEY = "admin-sidebar-width";
const DEFAULT_WIDTH = 280;

// --- COMPONENTE PRINCIPAL ---
export function AdminSidebar({ children, userName, userEmail }: AdminSidebarProps) {
  // Inicializar com valor do localStorage apenas no cliente para evitar hydration mismatch
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
  const [mounted, setMounted] = useState(false);

  // Persistência de largura
  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (saved) setSidebarWidth(parseInt(saved, 10));
  }, []);

  // Previne hydration mismatch usando o valor padrão até montar no cliente
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

function MenuItem({ item, isActive, isCollapsed, config, onNavigate }: {
  item: AssignmentMenuItem;
  isActive: boolean;
  isCollapsed: boolean;
  config: any;
  onNavigate: () => void;
}) {
  const Icon = iconMap[item.icon] || Briefcase;
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={isActive}
        tooltip={item.label}
        className={cn(
          "h-9 transition-all duration-200 rounded-md group/item mb-0.5",
          isActive 
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium" 
            : "text-sidebar-foreground/70 hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50"
        )}
      >
        <Link href={item.path} prefetch={true} onClick={onNavigate}>
          <Icon className={cn(
            "transition-all duration-200", 
            isActive ? "h-4 w-4 text-primary" : "h-4 w-4 text-sidebar-foreground/50 group-hover:text-sidebar-accent-foreground"
          )} strokeWidth={isActive ? 2.5 : 2} />
          <span className="text-sm">{item.label}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

function MenuSectionComponent({ section, pathname, isCollapsed, config, onNavigate }: {
  section: MenuSection;
  pathname: string;
  isCollapsed: boolean;
  config: any;
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
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full flex items-center justify-between px-3 py-2 mb-1 rounded-lg transition-colors hover:bg-sidebar-accent/50">
          <span className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-widest">{section.title}</span>
          <ChevronDown className={cn("h-3 w-3 transition-transform duration-200 text-sidebar-foreground/50", isOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0.5">
          {section.items.map((item) => {
            const isActive = pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path));
            return <MenuItem key={item.path} item={item} isActive={isActive} isCollapsed={isCollapsed} config={config} onNavigate={onNavigate} />;
          })}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div>
      {!isCollapsed && (
        <div className="px-3 py-2 mb-1">
          <span className="text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-widest">{section.title}</span>
        </div>
      )}
      {section.items.map((item) => {
        const isActive = pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path));
        return <MenuItem key={item.path} item={item} isActive={isActive} isCollapsed={isCollapsed} config={config} onNavigate={onNavigate} />;
      })}
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
  // Logout via ação customizada
  const { state, toggleSidebar, openMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { config, modules, isLoading } = useAssignment();
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  // Previne hydration mismatch
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
      <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar shadow-sm z-30">
        <SidebarHeader className="h-[64px] border-b border-sidebar-border flex items-center justify-center">
          <SidebarLogo collapsed={isCollapsed} />
        </SidebarHeader>

        <SidebarContent className="p-3 gap-6">
          {/* Seletor de Atribuição */}
          <div className={cn("transition-all duration-200", isCollapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100")}>
             <label className="text-[10px] font-bold text-sidebar-foreground/70 uppercase tracking-wider pl-2 mb-2 block">Atribuição</label>
             <AssignmentSwitcher collapsed={isCollapsed} />
          </div>

          {/* Menu Principal */}
          <SidebarMenu>
            {!isCollapsed && <div className="px-2 pb-2 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-widest">Navegação</div>}
            {CONTEXT_MENU_ITEMS.map((item) => (
              <MenuItem key={item.path} item={item} isActive={pathname === item.path} isCollapsed={isCollapsed} config={config} onNavigate={handleNavigate} />
            ))}
          </SidebarMenu>

          {/* Módulos Específicos */}
          <SidebarMenu>
             {!isCollapsed && mounted && !isLoading && (
               <div className="px-2 pb-2 mt-4 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-widest">
                 {config.shortName}
               </div>
             )}
             {mounted && !isLoading && modules.map((section: MenuSection) => (
                <MenuSectionComponent key={section.id} section={section} pathname={pathname} isCollapsed={isCollapsed} config={config} onNavigate={handleNavigate} />
             ))}
          </SidebarMenu>

          {/* Utilidades */}
          <SidebarMenu>
            {!isCollapsed && <div className="px-2 pb-2 mt-4 text-xs font-semibold text-sidebar-foreground/70 uppercase tracking-widest">Utilidades</div>}
            {UTILITIES_MENU.map((section) => (
              <MenuSectionComponent key={section.id} section={section} pathname={pathname} isCollapsed={isCollapsed} config={config} onNavigate={handleNavigate} />
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="border-t border-sidebar-border p-4 bg-sidebar-accent/30">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-sidebar-border bg-background">
              <AvatarFallback className="text-foreground font-bold text-xs">{getInitials(userName)}</AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">{userName}</p>
                <button onClick={handleLogout} className="text-xs text-destructive hover:underline flex items-center gap-1 mt-0.5">
                  <LogOut className="w-3 h-3" /> Sair
                </button>
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col min-h-screen bg-background">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b border-border bg-card/80 px-6 backdrop-blur-md z-20 sticky top-0">
          <SidebarTrigger className="-ml-2" />
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <CommandPalette />
            <ThemeToggle />
            <NotificationsPopover />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
