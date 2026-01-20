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
  Shield,
  Lock,
  RefreshCw,
  Award,
  TrendingUp,
  ChevronDown,
  Zap,
  Brain,
  Mic,
  Heart,
  ClipboardCheck,
  Columns3,
  History,
  PieChart,
  Handshake,
  CalendarDays,
  Sparkles,
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ThemeToggle } from "@/components/theme-toggle";
import { FontSizeToggle } from "@/components/font-size-toggle";
import { NotificationsPopover } from "@/components/notifications-popover";
import { AssignmentSwitcher } from "@/components/layout/assignment-switcher";
import { CommandPalette } from "@/components/shared/command-palette";
import { EntitySheetProvider } from "@/contexts/entity-sheet-context";
import { 
  useAssignment, 
  CONTEXT_MENU_ITEMS, 
  UTILITIES_MENU,
  type MenuSection,
  type AssignmentMenuItem,
} from "@/contexts/assignment-context";
import { logoutAction } from "@/app/(dashboard)/actions";
import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminSidebarProps {
  children: ReactNode;
  userName: string;
  userEmail?: string;
}

// Mapeamento de ícones
const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard,
  Users,
  Calendar,
  Bell,
  FileText,
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
  Shield,
  Lock,
  RefreshCw,
  Award,
  TrendingUp,
  Zap,
  Brain,
  Mic,
  Heart,
  ClipboardCheck,
  Columns3,
  History,
  PieChart,
  Handshake,
  CalendarDays,
  Sparkles,
};

const SIDEBAR_WIDTH_KEY = "admin-sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 240;
const MAX_WIDTH = 380;

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
      <EntitySheetProvider>
        <AdminSidebarContent
          setSidebarWidth={setSidebarWidth}
          userName={userName}
          userEmail={userEmail}
        >
          {children}
        </AdminSidebarContent>
      </EntitySheetProvider>
    </SidebarProvider>
  );
}

// ==========================================
// COMPONENTE DE ITEM DE MENU
// ==========================================

function MenuItem({
  item,
  isActive,
  isCollapsed,
  config,
  onNavigate,
}: {
  item: AssignmentMenuItem;
  isActive: boolean;
  isCollapsed: boolean;
  config: ReturnType<typeof useAssignment>["config"];
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
          "h-10 transition-all duration-200 rounded-lg group/item",
          isActive && "shadow-sm"
        )}
        style={{
          background: isActive ? config.sidebarActiveBg : undefined,
          boxShadow: isActive ? `0 0 0 1.5px ${config.sidebarActiveRing}` : undefined,
        }}
      >
        <Link href={item.path} prefetch={true} onClick={onNavigate}>
          <Icon
            className={cn(
              "transition-all duration-200 flex-shrink-0",
              isActive ? "h-[18px] w-[18px]" : "h-4 w-4"
            )}
            style={{
              color: isActive ? config.accentColor : config.sidebarTextMuted,
            }}
            strokeWidth={isActive ? 2 : 1.8}
          />
          <span
            className={cn(
              "text-[13px] transition-colors duration-200 flex-1",
              isActive ? "font-semibold text-foreground" : "font-medium"
            )}
            style={{
              color: isActive ? undefined : config.sidebarTextMuted,
            }}
          >
            {item.label}
          </span>
          {item.isPremium && !isCollapsed && (
            <Sparkles className="w-3 h-3 text-amber-500 opacity-0 group-hover/item:opacity-100 transition-opacity" />
          )}
          {isActive && !isCollapsed && (
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: config.accentColor }}
            />
          )}
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

// ==========================================
// COMPONENTE DE SEÇÃO DE MENU
// ==========================================

function MenuSectionComponent({
  section,
  pathname,
  isCollapsed,
  config,
  onNavigate,
}: {
  section: MenuSection;
  pathname: string;
  isCollapsed: boolean;
  config: ReturnType<typeof useAssignment>["config"];
  onNavigate: () => void;
}) {
  const [isOpen, setIsOpen] = useState(section.defaultOpen !== false);

  const hasActiveItem = section.items.some(
    (item) =>
      pathname === item.path ||
      (item.path !== "/admin" && pathname.startsWith(item.path))
  );

  // Auto-expand se tiver item ativo
  useEffect(() => {
    if (hasActiveItem && !isOpen) {
      setIsOpen(true);
    }
  }, [hasActiveItem, isOpen]);

  if (section.collapsible && !isCollapsed) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 mb-1 rounded-lg transition-colors",
              "hover:bg-black/5 dark:hover:bg-white/5"
            )}
          >
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.08em]"
              style={{ color: config.sidebarTextMuted }}
            >
              {section.title}
            </span>
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform duration-200",
                isOpen && "rotate-180"
              )}
              style={{ color: config.sidebarTextMuted }}
            />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0.5">
          {section.items.map((item) => {
            const isActive =
              pathname === item.path ||
              (item.path !== "/admin" && pathname.startsWith(item.path));
            return (
              <MenuItem
                key={item.path}
                item={item}
                isActive={isActive}
                isCollapsed={isCollapsed}
                config={config}
                onNavigate={onNavigate}
              />
            );
          })}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div>
      {!isCollapsed && (
        <div className="px-3 py-2 mb-1">
          <span
            className="text-[10px] font-bold uppercase tracking-[0.12em]"
            style={{ color: config.accentColor }}
          >
            {section.title}
          </span>
        </div>
      )}
      {section.items.map((item) => {
        const isActive =
          pathname === item.path ||
          (item.path !== "/admin" && pathname.startsWith(item.path));
        return (
          <MenuItem
            key={item.path}
            item={item}
            isActive={isActive}
            isCollapsed={isCollapsed}
            config={config}
            onNavigate={onNavigate}
          />
        );
      })}
    </div>
  );
}

// ==========================================
// SIDEBAR CONTENT
// ==========================================

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

  // Contexto de atribuição com módulos
  const { config, modules } = useAssignment();

  const handleNavigate = () => {
    if (isMobile && openMobile) {
      setOpenMobile(false);
    }
  };

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
          className={cn(
            "border-r backdrop-blur-xl shadow-[1px_0_8px_-2px_rgba(0,0,0,0.06)] dark:shadow-[1px_0_8px_-2px_rgba(0,0,0,0.25)]"
          )}
          style={{
            background: `var(--sidebar-bg, ${config.sidebarBg})`,
            borderColor: `var(--sidebar-border, ${config.sidebarBorder})`,
          }}
          disableTransition={isResizing}
        >
          {/* ==========================================
              BLOCO SUPERIOR: CONTEXTO (Switcher)
              Altura alinhada com header principal (60px)
              ========================================== */}
          <SidebarHeader
            className="border-b h-[60px] flex items-center px-3"
            style={{
              background: `var(--sidebar-header-bg, ${config.sidebarHeaderBg})`,
              borderColor: `var(--sidebar-divider, ${config.sidebarDivider})`,
            }}
          >
            <AssignmentSwitcher collapsed={isCollapsed} />
          </SidebarHeader>

          <SidebarContent className="gap-0 py-3 px-2 overflow-y-auto flex-1">
            <SidebarMenu className="gap-1">
              {/* Toggle Button */}
              <SidebarMenuItem className={isCollapsed ? "flex justify-center" : ""}>
                <SidebarMenuButton
                  onClick={toggleSidebar}
                  tooltip={isCollapsed ? "Expandir" : "Recolher"}
                  className="h-10 rounded-lg transition-all duration-200"
                  style={{
                    color: `var(--sidebar-text-muted, ${config.sidebarTextMuted})`,
                  }}
                >
                  <PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.8} />
                  <span className="text-[13px] font-medium">
                    {isCollapsed ? "Expandir" : "Recolher"}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* ==========================================
                  BLOCO CONTEXTO: Dashboard, Casos, Agenda
                  ========================================== */}
              {!isCollapsed && (
                <div className="px-3 py-2 mb-1 mt-2">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.12em] flex items-center gap-1.5"
                    style={{ color: config.sidebarTextMuted }}
                  >
                    <LayoutDashboard className="w-3 h-3" />
                    Central
                  </span>
                </div>
              )}

              {CONTEXT_MENU_ITEMS.map((item) => {
                const Icon = iconMap[item.icon] || LayoutDashboard;
                const isActive = pathname === item.path;

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "h-11 transition-all duration-200 rounded-lg",
                        isActive && "shadow-sm"
                      )}
                      style={{
                        background: isActive ? config.sidebarActiveBg : undefined,
                        boxShadow: isActive ? `0 0 0 1.5px ${config.sidebarActiveRing}` : undefined,
                      }}
                    >
                      <Link href={item.path} prefetch={true} onClick={handleNavigate}>
                        <Icon
                          className={cn(
                            "transition-all duration-200",
                            isActive ? "h-5 w-5" : "h-[18px] w-[18px]"
                          )}
                          style={{
                            color: isActive ? config.accentColor : config.sidebarTextMuted,
                          }}
                          strokeWidth={isActive ? 2 : 1.8}
                        />
                        <span
                          className={cn(
                            "text-[14px] transition-colors duration-200",
                            isActive ? "font-bold text-foreground" : "font-semibold"
                          )}
                          style={{
                            color: isActive ? undefined : config.sidebarTextMuted,
                          }}
                        >
                          {item.label}
                        </span>
                        {isActive && !isCollapsed && (
                          <div
                            className="ml-auto w-2 h-2 rounded-full"
                            style={{ backgroundColor: config.accentColor }}
                          />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Separador */}
              {!isCollapsed && (
                <div
                  className="h-[2px] my-3 mx-1 rounded-full"
                  style={{
                    background: `linear-gradient(to right, ${config.sidebarDivider}, transparent)`,
                  }}
                />
              )}
              {isCollapsed && <div className="h-2" />}

              {/* ==========================================
                  BLOCO CENTRAL: ATUAÇÃO (Módulos Específicos)
                  ========================================== */}
              {!isCollapsed && (
                <div className="px-3 py-2 mb-1">
                  <span
                    className="text-[10px] font-bold uppercase tracking-[0.12em] flex items-center gap-1.5"
                    style={{ color: config.accentColor }}
                  >
                    <span>{config.emoji}</span>
                    {config.shortName}
                  </span>
                </div>
              )}

              {/* Renderizar módulos específicos da especialidade */}
              {modules.map((section, idx) => (
                <div key={section.id}>
                  <MenuSectionComponent
                    section={section}
                    pathname={pathname}
                    isCollapsed={isCollapsed}
                    config={config}
                    onNavigate={handleNavigate}
                  />
                  {idx < modules.length - 1 && !isCollapsed && (
                    <div className="h-2" />
                  )}
                </div>
              ))}

              {/* Separador antes das Utilidades */}
              {!isCollapsed && (
                <div
                  className="h-[2px] my-3 mx-1 rounded-full"
                  style={{
                    background: `linear-gradient(to right, transparent, ${config.sidebarDivider}, transparent)`,
                  }}
                />
              )}
              {isCollapsed && <div className="h-2" />}

              {/* ==========================================
                  BLOCO INFERIOR: UTILIDADES
                  ========================================== */}
              {UTILITIES_MENU.map((section) => (
                <MenuSectionComponent
                  key={section.id}
                  section={section}
                  pathname={pathname}
                  isCollapsed={isCollapsed}
                  config={config}
                  onNavigate={handleNavigate}
                />
              ))}
            </SidebarMenu>
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter
            className={cn("border-t", isCollapsed ? "p-2" : "p-2.5")}
            style={{
              borderColor: config.sidebarDivider,
              background: `linear-gradient(to top, ${config.sidebarHover}, transparent)`,
            }}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg transition-all duration-200 w-full text-left focus:outline-none focus-visible:ring-2",
                    isCollapsed ? "justify-center p-1.5" : "px-2 py-2"
                  )}
                  style={{
                    ["--tw-ring-color" as string]: config.accentColor + "60",
                  }}
                >
                  <Avatar
                    className={cn(
                      "border shadow-sm transition-all",
                      isCollapsed ? "h-8 w-8" : "h-9 w-9"
                    )}
                    style={{ borderColor: config.accentColor + "40" }}
                  >
                    <AvatarFallback
                      className="text-[11px] font-semibold"
                      style={{
                        background: config.accentColorLight,
                        color: config.accentColor,
                      }}
                    >
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate text-[hsl(160_15%_20%)] dark:text-[hsl(150_10%_88%)]">
                        {userName}
                      </p>
                      {userEmail && (
                        <p className="text-[11px] text-[hsl(160_8%_50%)] dark:text-[hsl(150_6%_50%)] truncate mt-0.5">
                          {userEmail}
                        </p>
                      )}
                    </div>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 shadow-xl border-[hsl(155_15%_90%)] dark:border-[hsl(160_12%_18%)]"
              >
                <DropdownMenuItem asChild>
                  <Link href="/admin/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Meu Perfil
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/admin/settings" className="cursor-pointer">
                    <Settings className="mr-2 h-4 w-4" />
                    Configurações
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-red-600 dark:text-red-400 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize Handle */}
        {!isCollapsed && (
          <div
            className={cn(
              "absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-20 transition-colors",
              "hover:bg-[hsl(158,40%,70%)] dark:hover:bg-[hsl(158,30%,30%)]",
              isResizing && "bg-[hsl(158,50%,60%)] dark:bg-[hsl(158,40%,40%)]"
            )}
            onMouseDown={() => setIsResizing(true)}
          />
        )}
      </div>

      {/* Main Content */}
      <SidebarInset className="flex flex-col min-h-screen">
        {/* Header Desktop - Alinhado com a linha da sidebar */}
        <header
          className="hidden md:flex h-[60px] shrink-0 items-center border-b px-6 backdrop-blur-md"
          style={{
            background: config.sidebarHeaderBg,
            borderColor: config.sidebarBorder,
          }}
        >
          {/* Logo Centralizada - Maior e mais elegante */}
          <div className="flex items-center justify-center flex-1">
            <div className="flex items-center gap-3.5">
              {/* Logo Icon - Aumentado */}
              <div
                className="flex items-center justify-center w-11 h-11 rounded-xl shadow-lg"
                style={{
                  background: `linear-gradient(135deg, ${config.accentColor}, ${config.accentColorDark})`,
                }}
              >
                <Shield className="w-6 h-6 text-white" strokeWidth={2} />
              </div>

              <div className="text-left">
                <h1 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
                  DefesaHub
                </h1>
                <p
                  className="text-[11px] font-medium tracking-[0.08em] uppercase"
                  style={{ color: config.sidebarTextMuted }}
                >
                  {config.shortName}
                </p>
              </div>
            </div>
          </div>

          {/* Ações à direita */}
          <div className="flex items-center gap-2.5 absolute right-6">
            <CommandPalette />
            <FontSizeToggle />
            <ThemeToggle />
            <NotificationsPopover />
          </div>
        </header>

        {/* Header Mobile */}
        <header
          className="md:hidden flex h-14 shrink-0 items-center border-b px-4 gap-3"
          style={{
            background: config.sidebarHeaderBg,
            borderColor: config.sidebarBorder,
          }}
        >
          <SidebarTrigger className="h-8 w-8" />
          
          {/* Logo Centralizada Mobile */}
          <div className="flex items-center justify-center flex-1">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center w-8 h-8 rounded-lg shadow-sm"
                style={{
                  background: `linear-gradient(135deg, ${config.accentColor}, ${config.accentColorDark})`,
                }}
              >
                <Shield className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                DefesaHub
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationsPopover />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </SidebarInset>
    </>
  );
}
