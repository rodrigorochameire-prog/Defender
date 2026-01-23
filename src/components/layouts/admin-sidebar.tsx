"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
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

// --- LOGO COMPONENT (INTELEX) ---
function IntelexLogo({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "px-2")}>
      <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-stone-900 text-white shadow-md">
        {/* O Ícone X Estilizado */}
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6L6 18" className="text-stone-400" />
          <path d="M6 6l12 12" className="text-emerald-400" />
        </svg>
      </div>
      {!collapsed && (
        <div className="flex flex-col text-left">
          <span className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100 leading-none">
            Intel<span className="text-emerald-700 font-serif font-black">ex</span>
          </span>
          <span className="text-[10px] font-medium text-stone-500 uppercase tracking-widest mt-0.5">
            Gabinete Digital
          </span>
        </div>
      )}
    </div>
  );
}

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
  const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);

  // Persistência de largura
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    if (saved) setSidebarWidth(parseInt(saved, 10));
  }, []);

  return (
    <SidebarProvider defaultOpen={true} style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}>
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
          isActive ? "bg-stone-100 text-stone-900 font-medium" : "text-stone-500 hover:text-stone-900 hover:bg-stone-50"
        )}
      >
        <Link href={item.path} prefetch={true} onClick={onNavigate}>
          <Icon className={cn("transition-all duration-200", isActive ? "h-4 w-4 text-emerald-700" : "h-4 w-4 text-stone-400 group-hover:text-stone-600")} strokeWidth={isActive ? 2.5 : 2} />
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
        <CollapsibleTrigger asChild>
          <button className="w-full flex items-center justify-between px-3 py-2 mb-1 rounded-lg transition-colors hover:bg-stone-50">
            <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest">{section.title}</span>
            <ChevronDown className={cn("h-3 w-3 transition-transform duration-200 text-stone-400", isOpen && "rotate-180")} />
          </button>
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
          <span className="text-xs font-semibold text-stone-400 uppercase tracking-widest">{section.title}</span>
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
  const { signOut } = useClerk();
  const { state, toggleSidebar, openMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { config, modules } = useAssignment();
  const isMobile = useIsMobile();

  const handleNavigate = () => { 
    if (isMobile && openMobile) setOpenMobile(false); 
  };
  
  async function handleLogout() { 
    await logoutAction(); 
    await signOut({ redirectUrl: "/" }); 
  }

  return (
    <>
      <Sidebar collapsible="icon" className="border-r border-stone-200 bg-white shadow-sm z-30">
        <SidebarHeader className="h-[64px] border-b border-stone-100 flex items-center justify-center bg-stone-50/50">
           <IntelexLogo collapsed={isCollapsed} />
        </SidebarHeader>

        <SidebarContent className="p-3 gap-6">
          {/* Seletor de Atribuição */}
          <div className={cn("transition-all duration-200", isCollapsed ? "opacity-0 h-0 overflow-hidden" : "opacity-100")}>
             <label className="text-[10px] font-bold text-stone-400 uppercase tracking-wider pl-2 mb-2 block">Atribuição</label>
             <AssignmentSwitcher collapsed={isCollapsed} />
          </div>

          {/* Menu Principal */}
          <SidebarMenu>
            {!isCollapsed && <div className="px-2 pb-2 text-xs font-semibold text-stone-400 uppercase tracking-widest">Navegação</div>}
            {CONTEXT_MENU_ITEMS.map((item) => (
              <MenuItem key={item.path} item={item} isActive={pathname === item.path} isCollapsed={isCollapsed} config={config} onNavigate={handleNavigate} />
            ))}
          </SidebarMenu>

          {/* Módulos Específicos */}
          <SidebarMenu>
             {!isCollapsed && <div className="px-2 pb-2 mt-4 text-xs font-semibold text-stone-400 uppercase tracking-widest">{config.shortName}</div>}
             {modules.map((section: MenuSection) => (
                <MenuSectionComponent key={section.id} section={section} pathname={pathname} isCollapsed={isCollapsed} config={config} onNavigate={handleNavigate} />
             ))}
          </SidebarMenu>

          {/* Utilidades */}
          <SidebarMenu>
            {!isCollapsed && <div className="px-2 pb-2 mt-4 text-xs font-semibold text-stone-400 uppercase tracking-widest">Utilidades</div>}
            {UTILITIES_MENU.map((section) => (
              <MenuSectionComponent key={section.id} section={section} pathname={pathname} isCollapsed={isCollapsed} config={config} onNavigate={handleNavigate} />
            ))}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="border-t border-stone-100 p-4 bg-stone-50/50">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-stone-200 bg-white">
              <AvatarFallback className="text-stone-700 font-bold text-xs">{getInitials(userName)}</AvatarFallback>
            </Avatar>
            {!isCollapsed && (
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-stone-800 truncate">{userName}</p>
                <button onClick={handleLogout} className="text-xs text-red-500 hover:underline flex items-center gap-1 mt-0.5">
                  <LogOut className="w-3 h-3" /> Sair
                </button>
              </div>
            )}
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="flex flex-col min-h-screen bg-stone-50/60 dark:bg-zinc-950">
        <header className="flex h-16 shrink-0 items-center gap-2 border-b bg-white/80 px-6 backdrop-blur-md z-20 sticky top-0">
          <SidebarTrigger className="-ml-2" />
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <CommandPalette />
            <ThemeToggle />
            <NotificationsPopover />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 md:p-8 max-w-[1600px] mx-auto w-full space-y-8">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
