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
import { AssignmentSwitcher } from "@/components/layout/assignment-switcher";
import { useAssignment, FIXED_MENU_ITEMS, SYSTEM_MENU_ITEMS } from "@/contexts/assignment-context";
import { logoutAction } from "@/app/(dashboard)/actions";
import { CSSProperties, ReactNode, useEffect, useRef, useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

interface AdminSidebarProps {
  children: ReactNode;
  userName: string;
  userEmail?: string;
}

// Mapeamento de ícones para o menu dinâmico
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

  // Contexto de atribuição
  const { config, currentAssignment } = useAssignment();

  // Menu dinâmico baseado na atribuição
  const workspaceMenuItems = config.menuItems;
  
  // Combina menus: Fixo (Dashboard) + Específico do Workspace + Sistema
  const allMenuItems = [...FIXED_MENU_ITEMS, ...workspaceMenuItems, ...SYSTEM_MENU_ITEMS];

  const activeMenuItem = allMenuItems.find(
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
          className={cn(
            "border-r-2 backdrop-blur-xl shadow-[2px_0_12px_-4px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_12px_-4px_rgba(0,0,0,0.3)]"
          )}
          style={{
            background: `var(--sidebar-bg, ${config.sidebarBg})`,
            borderColor: `var(--sidebar-border, ${config.sidebarBorder})`,
          }}
          disableTransition={isResizing}
        >
          {/* Header com Switcher de Atribuição */}
          <SidebarHeader 
            className="border-b-2 py-3"
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

              {/* ======= DASHBOARD (Painel Central - Fixo) ======= */}
              {FIXED_MENU_ITEMS.map((item) => {
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
                      <Link
                        href={item.path}
                        prefetch={true}
                        onClick={() => {
                          if (isMobile && openMobile) {
                            setOpenMobile(false);
                          }
                        }}
                      >
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

              {/* Separador após Dashboard */}
              {!isCollapsed && (
                <div 
                  className="h-[2px] my-3 mx-1 rounded-full"
                  style={{
                    background: `linear-gradient(to right, ${config.sidebarDivider}, transparent)`,
                  }}
                />
              )}
              {isCollapsed && <div className="h-2" />}

              {/* ======= MENU ESPECÍFICO DO WORKSPACE ======= */}
              {!isCollapsed && (
                <div className="px-3 py-2 mb-1">
                  <span 
                    className="text-[10px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: config.accentColor }}
                  >
                    {config.shortName}
                  </span>
                </div>
              )}

              {workspaceMenuItems.map((item) => {
                const Icon = iconMap[item.icon] || Briefcase;
                const isActive =
                  pathname === item.path ||
                  (item.path !== "/admin" && pathname.startsWith(item.path + "/"));

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "h-10 transition-all duration-200 rounded-lg",
                        isActive && "shadow-sm"
                      )}
                      style={{
                        background: isActive ? config.sidebarActiveBg : undefined,
                        boxShadow: isActive ? `0 0 0 1.5px ${config.sidebarActiveRing}` : undefined,
                      }}
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
                        <Icon
                          className={cn(
                            "transition-all duration-200",
                            isActive ? "h-[18px] w-[18px]" : "h-4 w-4"
                          )}
                          style={{
                            color: isActive ? config.accentColor : config.sidebarTextMuted,
                          }}
                          strokeWidth={isActive ? 2 : 1.8}
                        />
                        <span
                          className={cn(
                            "text-[13px] transition-colors duration-200",
                            isActive ? "font-semibold text-foreground" : "font-medium"
                          )}
                          style={{
                            color: isActive ? undefined : config.sidebarTextMuted,
                          }}
                        >
                          {item.label}
                        </span>
                        {isActive && !isCollapsed && (
                          <div
                            className="ml-auto w-1 h-1 rounded-full"
                            style={{ backgroundColor: config.accentColor }}
                          />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Separador antes do Sistema */}
              {!isCollapsed && (
                <div 
                  className="h-[2px] my-3 mx-1 rounded-full"
                  style={{
                    background: `linear-gradient(to right, transparent, ${config.sidebarDivider}, transparent)`,
                  }}
                />
              )}
              {isCollapsed && <div className="h-2" />}

              {/* ======= SISTEMA (WhatsApp, Notificações, Configurações) ======= */}
              {!isCollapsed && (
                <div className="px-3 py-2 mb-1">
                  <span 
                    className="text-[10px] font-bold uppercase tracking-[0.12em]"
                    style={{ color: config.sidebarTextMuted }}
                  >
                    Sistema
                  </span>
                </div>
              )}

              {SYSTEM_MENU_ITEMS.map((item) => {
                const Icon = iconMap[item.icon] || Settings;
                const isActive = pathname === item.path || pathname.startsWith(item.path + "/");

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "h-10 transition-all duration-200 rounded-lg",
                        isActive && "shadow-sm"
                      )}
                      style={{
                        background: isActive ? config.sidebarActiveBg : undefined,
                      }}
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
                            "text-[13px] transition-colors duration-200",
                            isActive ? "text-foreground font-semibold" : "font-medium"
                          )}
                          style={{
                            color: isActive ? undefined : config.sidebarTextMuted,
                          }}
                        >
                          {item.label}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          {/* Footer */}
          <SidebarFooter 
            className={cn("border-t-2", isCollapsed ? "p-2" : "p-3")}
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
                      className="text-[10px] font-semibold"
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
                <DropdownMenuItem
                  onClick={() => router.push("/admin/profile")}
                  className="cursor-pointer font-medium text-[13px]"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Meu Perfil</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive font-medium text-[13px]"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Resize Handle */}
        <div
          className={cn(
            "absolute top-0 right-0 w-1 h-full cursor-col-resize transition-colors duration-200",
            "hover:bg-[hsl(158_40%_75%)] dark:hover:bg-[hsl(158_30%_30%)]",
            isCollapsed && "hidden"
          )}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset className="ml-0">
        {/* Mobile Header */}
        {isMobile && (
          <div
            className={cn(
              "flex border-b h-16 items-center justify-between backdrop-blur-xl px-4 sticky top-0 z-40",
              config.borderColor
            )}
            style={{ background: config.accentColorLight }}
          >
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-10 w-10 rounded-xl bg-white/80 dark:bg-[hsl(160_12%_12%)] transition-colors" />
              <Link href="/admin" className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-xl overflow-hidden flex items-center justify-center shadow-md"
                  style={{
                    background: `linear-gradient(145deg, ${config.accentColor}, ${config.accentColorDark})`,
                  }}
                >
                  {/* Shield with Sword Icon */}
                  <svg viewBox="0 0 32 32" fill="none" className="w-5 h-5">
                    <g transform="translate(16, 15)">
                      <path d="M0 -8 L1.5 -6 L1 4 L0 5 L-1 4 L-1.5 -6 Z" fill="white" fillOpacity="0.95"/>
                      <rect x="-4" y="3" width="8" height="2" rx="0.5" fill="white" fillOpacity="0.9"/>
                      <rect x="-0.75" y="5" width="1.5" height="4" rx="0.5" fill="white" fillOpacity="0.85"/>
                      <circle cx="0" cy="10" r="1.2" fill="white" fillOpacity="0.85"/>
                    </g>
                  </svg>
                </div>
                <span className="font-semibold text-sm text-foreground">
                  {activeMenuItem?.label ?? config.shortName}
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

        {/* Desktop Header */}
        {!isMobile && (
          <div
            className={cn(
              "flex border-b h-20 items-center justify-center backdrop-blur-xl px-8 sticky top-0 z-40 relative",
              config.borderColor,
              "dark:border-b-[hsl(160,10%,18%)]"
            )}
            style={{
              background: `linear-gradient(135deg, ${config.accentColorLight} 0%, hsl(155, 15%, 99%) 100%)`,
            }}
          >
            <Link
              href="/admin"
              className="flex items-center gap-4 hover:opacity-90 transition-opacity duration-200"
            >
              <div
                className="relative w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center shadow-xl ring-2 ring-white/20"
                style={{
                  background: `linear-gradient(145deg, ${config.accentColor}, ${config.accentColorDark})`,
                }}
              >
                {/* Shield with Sword Icon */}
                <svg viewBox="0 0 32 32" fill="none" className="w-8 h-8">
                  <path d="M16 4L6 8.5v6.5c0 6.5 4.3 12.3 10 13.5 5.7-1.2 10-7 10-13.5V8.5L16 4z" fill="white" fillOpacity="0.15" />
                  <g transform="translate(16, 15)">
                    <path d="M0 -8 L1.5 -6 L1 4 L0 5 L-1 4 L-1.5 -6 Z" fill="white" fillOpacity="0.95"/>
                    <rect x="-4" y="3" width="8" height="2" rx="0.5" fill="white" fillOpacity="0.9"/>
                    <rect x="-0.75" y="5" width="1.5" height="4" rx="0.5" fill="white" fillOpacity="0.85"/>
                    <circle cx="0" cy="10" r="1.2" fill="white" fillOpacity="0.85"/>
                  </g>
                </svg>
              </div>
              <div className="flex flex-col">
                <span
                  className="text-2xl font-bold tracking-tight text-foreground"
                  style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
                >
                  DefesaHub
                </span>
                <span
                  className="text-xs font-semibold tracking-wide"
                  style={{ color: config.accentColor }}
                >
                  {config.shortName}
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-2 absolute right-8">
              <NotificationsPopover />
              <FontSizeToggle />
              <ThemeToggle />
            </div>
          </div>
        )}

        <main
          className={cn(
            "flex-1 p-4 md:p-6 lg:p-8 min-h-screen overflow-x-hidden",
            "bg-gradient-to-br",
            config.bgGradient
          )}
        >
          <div className="mx-auto max-w-[1600px] w-full">
            {children}
          </div>
        </main>
      </SidebarInset>
    </>
  );
}
