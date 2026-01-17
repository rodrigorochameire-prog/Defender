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
import { useAssignment } from "@/contexts/assignment-context";
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

// Menu secundário fixo (sempre visível)
const secondaryMenuItems = [
  { icon: "MessageCircle", label: "WhatsApp", path: "/admin/whatsapp" },
  { icon: "Bell", label: "Notificações", path: "/admin/notifications" },
  { icon: "Settings", label: "Configurações", path: "/admin/settings" },
];

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
  const menuItems = config.menuItems;

  const activeMenuItem = menuItems.find(
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
            "border-r-2 border-[hsl(158_25%_85%)] dark:border-[hsl(160_20%_18%)]",
            "bg-gradient-to-b from-[hsl(155_20%_97%)] via-[hsl(155_18%_96%)] to-[hsl(158_22%_94%)] dark:from-[hsl(160_18%_7%)] dark:via-[hsl(160_16%_6%)] dark:to-[hsl(158_20%_8%)]",
            "backdrop-blur-xl shadow-[2px_0_12px_-4px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_12px_-4px_rgba(0,0,0,0.3)]"
          )}
          disableTransition={isResizing}
        >
          {/* Header com Switcher de Atribuição */}
          <SidebarHeader className="border-b-2 border-[hsl(158_30%_88%)] dark:border-[hsl(160_18%_15%)] py-3 bg-gradient-to-r from-[hsl(158_35%_94%)] via-[hsl(155_28%_95%)] to-[hsl(158_25%_96%)] dark:from-[hsl(158_25%_10%)] dark:via-[hsl(160_20%_9%)] dark:to-[hsl(158_22%_8%)]">
            <AssignmentSwitcher collapsed={isCollapsed} />
          </SidebarHeader>

          <SidebarContent className="gap-0 px-3 py-4 overflow-y-auto flex-1">
            <SidebarMenu className={isCollapsed ? "gap-1" : "gap-1.5"}>
              {/* Toggle Button */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={toggleSidebar}
                  tooltip={isCollapsed ? "Expandir" : "Recolher"}
                  className={cn(
                    "h-11 rounded-xl transition-all duration-200",
                    "hover:bg-[hsl(158_30%_90%)] dark:hover:bg-[hsl(158_20%_14%)]",
                    "text-[hsl(160_15%_40%)] dark:text-[hsl(150_12%_60%)]",
                    "border border-transparent hover:border-[hsl(158_25%_85%)] dark:hover:border-[hsl(158_20%_20%)]"
                  )}
                >
                  <PanelLeft className="h-5 w-5" strokeWidth={1.8} />
                  <span className="text-[13px] font-semibold">
                    {isCollapsed ? "Expandir" : "Recolher"}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <div className="h-px bg-[hsl(155_15%_90%)] dark:bg-[hsl(160_12%_14%)] my-2 mx-2" />

              {/* Label da atribuição */}
              {!isCollapsed && (
                <div className="px-3 py-2 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[hsl(160_8%_50%)] dark:text-[hsl(150_6%_45%)]">
                    {config.shortName}
                  </span>
                </div>
              )}

              {/* Menu Principal Dinâmico */}
              {menuItems.map((item) => {
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
                        "h-11 transition-all duration-200 rounded-xl group relative",
                        isActive
                          ? "shadow-md ring-2"
                          : "hover:bg-[hsl(158_25%_93%)] dark:hover:bg-[hsl(160_18%_12%)] hover:shadow-sm"
                      )}
                      style={{
                        backgroundColor: isActive ? config.accentColorLight : undefined,
                        borderColor: isActive ? config.accentColor + "40" : undefined,
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
                            isActive ? "h-[22px] w-[22px]" : "h-5 w-5"
                          )}
                          style={{
                            color: isActive
                              ? config.accentColor
                              : "hsl(160, 12%, 42%)",
                          }}
                          strokeWidth={isActive ? 2.2 : 1.8}
                        />
                        <span
                          className={cn(
                            "text-[13px] transition-colors duration-200",
                            isActive
                              ? "font-bold text-foreground"
                              : "font-semibold text-[hsl(160_12%_35%)] dark:text-[hsl(150_10%_65%)]"
                          )}
                        >
                          {item.label}
                        </span>
                        {isActive && !isCollapsed && (
                          <div
                            className="ml-auto w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: config.accentColor }}
                          />
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              {/* Separador */}
              <div className="h-px bg-[hsl(155_15%_92%)] dark:bg-[hsl(160_12%_12%)] my-3 mx-2" />

              {/* Menu Secundário (fixo) */}
              {!isCollapsed && (
                <div className="px-3 py-2 mb-1">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-[hsl(160_8%_50%)] dark:text-[hsl(150_6%_45%)]">
                    Sistema
                  </span>
                </div>
              )}

              {secondaryMenuItems.map((item) => {
                const Icon = iconMap[item.icon] || Settings;
                const isActive = pathname.startsWith(item.path);

                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={item.label}
                      className={cn(
                        "h-10 transition-all duration-200 rounded-xl group",
                        isActive
                          ? "bg-[hsl(158_35%_92%)] dark:bg-[hsl(158_25%_12%)] shadow-sm"
                          : "hover:bg-[hsl(155_15%_95%)] dark:hover:bg-[hsl(160_12%_10%)]"
                      )}
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
                            "transition-colors duration-200 h-[18px] w-[18px]",
                            isActive
                              ? "text-[hsl(158_55%_38%)]"
                              : "text-[hsl(160_8%_45%)]"
                          )}
                          strokeWidth={1.5}
                        />
                        <span
                          className={cn(
                            "text-[13px] font-medium transition-colors duration-200",
                            isActive
                              ? "text-foreground"
                              : "text-[hsl(160_8%_40%)] dark:text-[hsl(150_6%_60%)]"
                          )}
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
          <SidebarFooter className="p-3 border-t-2 border-[hsl(158_30%_88%)] dark:border-[hsl(160_18%_15%)] bg-gradient-to-t from-[hsl(158_30%_94%)] via-[hsl(158_25%_95%)] to-transparent dark:from-[hsl(158_20%_9%)] dark:via-[hsl(158_18%_8%)] dark:to-transparent">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-[hsl(158_30%_91%)] dark:hover:bg-[hsl(158_20%_14%)] transition-all duration-200 w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(158_55%_42%)/0.5] group border border-transparent hover:border-[hsl(158_28%_85%)] dark:hover:border-[hsl(158_22%_20%)]">
                  <div className="relative">
                    <Avatar
                      className="h-11 w-11 border-2 shadow-md ring-2 ring-white/80 dark:ring-[hsl(158_20%_12%)]"
                      style={{ borderColor: config.accentColor + "50" }}
                    >
                      <AvatarFallback
                        className="text-xs font-semibold"
                        style={{
                          background: config.accentColorLight,
                          color: config.accentColor,
                        }}
                      >
                        {getInitials(userName)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
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
              "flex border-b h-14 items-center justify-between backdrop-blur-xl px-4 sticky top-0 z-40",
              config.borderColor
            )}
            style={{ background: config.accentColorLight }}
          >
            <div className="flex items-center gap-3">
              <SidebarTrigger className="h-9 w-9 rounded-xl bg-white/80 dark:bg-[hsl(160_12%_12%)] transition-colors" />
              <Link href="/admin" className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-sm"
                  style={{
                    background: `linear-gradient(145deg, ${config.accentColor}, ${config.accentColorDark})`,
                  }}
                >
                  <Scale className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-[13px] text-foreground">
                  {activeMenuItem?.label ?? config.shortName}
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-1">
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
              "flex border-b h-16 items-center justify-center backdrop-blur-xl px-6 sticky top-0 z-40 relative",
              config.borderColor
            )}
            style={{
              background: `linear-gradient(135deg, ${config.accentColorLight} 0%, hsl(155, 15%, 99%) 100%)`,
            }}
          >
            <Link
              href="/admin"
              className="flex items-center gap-3 hover:opacity-90 transition-opacity duration-200"
            >
              <div
                className="relative w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center shadow-lg ring-1"
                style={{
                  background: `linear-gradient(145deg, ${config.accentColor}, ${config.accentColorDark})`,
                }}
              >
                <Scale className="h-5 w-5 text-white" />
              </div>
              <div className="flex flex-col">
                <span
                  className="text-xl font-bold tracking-tight text-foreground"
                  style={{ fontFamily: '"Inter", system-ui, sans-serif' }}
                >
                  DefesaHub
                </span>
                <span
                  className="text-[10px] font-medium tracking-wide"
                  style={{ color: config.accentColor }}
                >
                  {config.shortName}
                </span>
              </div>
            </Link>
            <div className="flex items-center gap-1.5 absolute right-6">
              <NotificationsPopover />
              <FontSizeToggle />
              <ThemeToggle />
            </div>
          </div>
        )}

        <main
          className={cn(
            "flex-1 p-5 md:p-6 min-h-screen overflow-x-hidden max-w-full",
            "bg-gradient-to-br",
            config.bgGradient
          )}
        >
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
